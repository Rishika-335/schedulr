from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.db.database import get_db
from app.models.models import Meeting, MeetingStatus, User
from app.schemas.schemas import MeetingResponse, MeetingCancel
from app.services import email_service
from app.core.config import settings

router = APIRouter()


def get_default_user(db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == settings.DEFAULT_USER_ID).first()
    if not user:
        raise HTTPException(status_code=404, detail="Default user not found")
    return user


@router.get("/", response_model=List[MeetingResponse])
def list_meetings(
    status: Optional[str] = Query(None, description="Filter by status: scheduled, cancelled, completed, rescheduled"),
    period: Optional[str] = Query(None, description="upcoming | past | all"),
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    """List all meetings for the dashboard."""
    query = db.query(Meeting).filter(Meeting.host_id == user.id)

    now = datetime.now(timezone.utc)

    if period == "upcoming":
        query = query.filter(
            Meeting.start_time >= now,
            Meeting.status == MeetingStatus.SCHEDULED,
        )
    elif period == "past":
        query = query.filter(
            Meeting.start_time < now,
        )

    if status:
        try:
            status_enum = MeetingStatus(status)
            query = query.filter(Meeting.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    meetings = query.order_by(Meeting.start_time.desc()).all()
    return meetings


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.host_id == user.id
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/{meeting_id}/cancel", response_model=MeetingResponse)
def cancel_meeting(
    meeting_id: int,
    data: MeetingCancel,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    """Admin: cancel a meeting from the dashboard."""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id, Meeting.host_id == user.id
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status not in [MeetingStatus.SCHEDULED, MeetingStatus.RESCHEDULED]:
        raise HTTPException(status_code=400, detail="Meeting is already cancelled or completed")

    meeting.status = MeetingStatus.CANCELLED
    meeting.cancel_reason = data.cancel_reason
    db.commit()
    db.refresh(meeting)

    try:
        email_service.send_cancellation_email(
            meeting, meeting.event_type, meeting.host, cancelled_by="host"
        )
    except Exception:
        pass

    return meeting


@router.get("/stats/summary")
def get_meeting_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    """Dashboard stats summary."""
    now = datetime.now(timezone.utc)

    total = db.query(Meeting).filter(Meeting.host_id == user.id).count()
    upcoming = db.query(Meeting).filter(
        Meeting.host_id == user.id,
        Meeting.start_time >= now,
        Meeting.status == MeetingStatus.SCHEDULED,
    ).count()
    completed = db.query(Meeting).filter(
        Meeting.host_id == user.id,
        Meeting.status == MeetingStatus.COMPLETED,
    ).count()
    cancelled = db.query(Meeting).filter(
        Meeting.host_id == user.id,
        Meeting.status == MeetingStatus.CANCELLED,
    ).count()

    return {
        "total": total,
        "upcoming": upcoming,
        "completed": completed,
        "cancelled": cancelled,
    }
