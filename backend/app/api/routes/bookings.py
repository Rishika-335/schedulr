from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import (
    User, EventType, Meeting, MeetingStatus, AvailabilitySchedule
)
from app.schemas.schemas import BookingCreate, BookingResponse, MeetingReschedule
from app.services.availability_service import get_available_slots
from app.services import email_service
from datetime import datetime, timedelta, timezone
import secrets
import pytz

router = APIRouter()


def _check_slot_available(db: Session, user_id: int, event_type: EventType, start_time: datetime) -> bool:
    buffer_before = timedelta(minutes=event_type.buffer_before_minutes)
    buffer_after = timedelta(minutes=event_type.buffer_after_minutes)
    end_time = start_time + timedelta(minutes=event_type.duration_minutes)

    effective_start = start_time - buffer_before
    effective_end = end_time + buffer_after

    conflict = (
        db.query(Meeting)
        .join(EventType)
        .filter(
            Meeting.host_id == user_id,
            Meeting.status.in_([MeetingStatus.SCHEDULED, MeetingStatus.RESCHEDULED]),
        )
        .all()
    )

    for m in conflict:
        m_buffer_before = timedelta(minutes=m.event_type.buffer_before_minutes)
        m_buffer_after = timedelta(minutes=m.event_type.buffer_after_minutes)
        # Make both timezone-aware
        m_start = m.start_time if m.start_time.tzinfo else m.start_time.replace(tzinfo=timezone.utc)
        m_end = m.end_time if m.end_time.tzinfo else m.end_time.replace(tzinfo=timezone.utc)
        m_effective_start = m_start - m_buffer_before
        m_effective_end = m_end + m_buffer_after

        if effective_start < m_effective_end and effective_end > m_effective_start:
            return False
    return True


@router.post("/{username}/{slug}", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    username: str,
    slug: str,
    data: BookingCreate,
    db: Session = Depends(get_db),
):
    """Public endpoint to book a time slot."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    event_type = db.query(EventType).filter(
        EventType.user_id == user.id,
        EventType.slug == slug,
        EventType.is_active == True,
    ).first()
    if not event_type:
        raise HTTPException(status_code=404, detail="Event type not found")

    # Ensure start_time is timezone-aware UTC
    start_time = data.start_time
    if start_time.tzinfo is None:
        start_time = pytz.utc.localize(start_time)
    else:
        start_time = start_time.astimezone(pytz.utc)

    # Must be in the future
    if start_time <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot book a time in the past")

    # Check availability
    if not _check_slot_available(db, user.id, event_type, start_time):
        raise HTTPException(
            status_code=409,
            detail="This time slot is no longer available. Please choose another time.",
        )

    end_time = start_time + timedelta(minutes=event_type.duration_minutes)

    meeting = Meeting(
        host_id=user.id,
        event_type_id=event_type.id,
        invitee_name=data.invitee_name,
        invitee_email=data.invitee_email,
        invitee_notes=data.invitee_notes,
        start_time=start_time,
        end_time=end_time,
        timezone=data.timezone,
        status=MeetingStatus.SCHEDULED,
        location=event_type.location,
        booking_token=secrets.token_urlsafe(32),
        custom_answers=data.custom_answers,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # Send emails (non-blocking — fails silently)
    try:
        email_service.send_booking_confirmation_to_invitee(meeting, event_type, user)
        email_service.send_booking_notification_to_host(meeting, event_type, user)
    except Exception:
        pass

    return meeting


@router.get("/confirmation/{booking_token}", response_model=BookingResponse)
def get_booking_confirmation(booking_token: str, db: Session = Depends(get_db)):
    """Retrieve booking details by token (for confirmation page)."""
    meeting = db.query(Meeting).filter(Meeting.booking_token == booking_token).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Booking not found")
    return meeting


@router.post("/cancel/{booking_token}")
def cancel_booking_by_token(
    booking_token: str,
    cancel_reason: str = None,
    db: Session = Depends(get_db),
):
    """Public cancellation via token link."""
    meeting = db.query(Meeting).filter(Meeting.booking_token == booking_token).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Booking not found")

    if meeting.status not in [MeetingStatus.SCHEDULED, MeetingStatus.RESCHEDULED]:
        raise HTTPException(status_code=400, detail="Meeting cannot be cancelled")

    meeting.status = MeetingStatus.CANCELLED
    meeting.cancel_reason = cancel_reason
    db.commit()
    db.refresh(meeting)

    try:
        email_service.send_cancellation_email(meeting, meeting.event_type, meeting.host)
    except Exception:
        pass

    return {"message": "Meeting cancelled successfully"}


@router.post("/reschedule/{booking_token}", response_model=BookingResponse)
def reschedule_booking(
    booking_token: str,
    data: MeetingReschedule,
    db: Session = Depends(get_db),
):
    """Reschedule an existing booking to a new time."""
    old_meeting = db.query(Meeting).filter(Meeting.booking_token == booking_token).first()
    if not old_meeting:
        raise HTTPException(status_code=404, detail="Booking not found")

    if old_meeting.status not in [MeetingStatus.SCHEDULED, MeetingStatus.RESCHEDULED]:
        raise HTTPException(status_code=400, detail="Meeting cannot be rescheduled")

    event_type = old_meeting.event_type
    user = old_meeting.host

    new_start = data.new_start_time
    if new_start.tzinfo is None:
        new_start = pytz.utc.localize(new_start)
    else:
        new_start = new_start.astimezone(pytz.utc)

    if new_start <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot reschedule to a past time")

    if not _check_slot_available(db, user.id, event_type, new_start):
        raise HTTPException(status_code=409, detail="New time slot is not available")

    # Cancel old meeting
    old_meeting.status = MeetingStatus.RESCHEDULED

    # Create new meeting
    new_end = new_start + timedelta(minutes=event_type.duration_minutes)
    new_meeting = Meeting(
        host_id=user.id,
        event_type_id=event_type.id,
        invitee_name=old_meeting.invitee_name,
        invitee_email=old_meeting.invitee_email,
        invitee_notes=old_meeting.invitee_notes,
        start_time=new_start,
        end_time=new_end,
        timezone=data.timezone,
        status=MeetingStatus.SCHEDULED,
        location=event_type.location,
        booking_token=secrets.token_urlsafe(32),
        rescheduled_from_id=old_meeting.id,
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)

    try:
        email_service.send_reschedule_email(old_meeting, new_meeting, event_type, user)
    except Exception:
        pass

    return new_meeting
