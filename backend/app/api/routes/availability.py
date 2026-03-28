from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import (
    AvailabilitySchedule, WeeklyAvailabilitySlot, DateOverride, User, EventType
)
from app.schemas.schemas import (
    AvailabilityScheduleCreate, AvailabilityScheduleUpdate,
    AvailabilityScheduleResponse, DateOverrideCreate, DateOverrideResponse,
    AvailableSlotResponse,
)
from app.services.availability_service import get_available_slots, get_available_months
from app.core.config import settings

router = APIRouter()


def get_default_user(db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == settings.DEFAULT_USER_ID).first()
    if not user:
        raise HTTPException(status_code=404, detail="Default user not found")
    return user


@router.get("/schedules", response_model=List[AvailabilityScheduleResponse])
def list_schedules(
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    return (
        db.query(AvailabilitySchedule)
        .filter(AvailabilitySchedule.user_id == user.id)
        .all()
    )


@router.get("/schedules/{schedule_id}", response_model=AvailabilityScheduleResponse)
def get_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    schedule = db.query(AvailabilitySchedule).filter(
        AvailabilitySchedule.id == schedule_id,
        AvailabilitySchedule.user_id == user.id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.post("/schedules", response_model=AvailabilityScheduleResponse, status_code=201)
def create_schedule(
    data: AvailabilityScheduleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    if data.is_default:
        # Unset previous default
        db.query(AvailabilitySchedule).filter(
            AvailabilitySchedule.user_id == user.id
        ).update({"is_default": False})

    schedule = AvailabilitySchedule(
        user_id=user.id,
        name=data.name,
        timezone=data.timezone,
        is_default=data.is_default,
    )
    db.add(schedule)
    db.flush()

    for slot_data in data.weekly_slots:
        slot = WeeklyAvailabilitySlot(schedule_id=schedule.id, **slot_data.model_dump())
        db.add(slot)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.patch("/schedules/{schedule_id}", response_model=AvailabilityScheduleResponse)
def update_schedule(
    schedule_id: int,
    updates: AvailabilityScheduleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    schedule = db.query(AvailabilitySchedule).filter(
        AvailabilitySchedule.id == schedule_id,
        AvailabilitySchedule.user_id == user.id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = updates.model_dump(exclude_none=True)

    if "weekly_slots" in update_data:
        # Replace all weekly slots
        db.query(WeeklyAvailabilitySlot).filter(
            WeeklyAvailabilitySlot.schedule_id == schedule_id
        ).delete()
        for slot_data in updates.weekly_slots:
            slot = WeeklyAvailabilitySlot(schedule_id=schedule_id, **slot_data.model_dump())
            db.add(slot)
        del update_data["weekly_slots"]

    for field, value in update_data.items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/schedules/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    schedule = db.query(AvailabilitySchedule).filter(
        AvailabilitySchedule.id == schedule_id,
        AvailabilitySchedule.user_id == user.id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()


# ── Date Overrides ────────────────────────────────────────────────────────────

@router.post("/schedules/{schedule_id}/overrides", response_model=DateOverrideResponse, status_code=201)
def add_date_override(
    schedule_id: int,
    data: DateOverrideCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    schedule = db.query(AvailabilitySchedule).filter(
        AvailabilitySchedule.id == schedule_id,
        AvailabilitySchedule.user_id == user.id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Remove existing override for this date
    db.query(DateOverride).filter(
        DateOverride.schedule_id == schedule_id,
        DateOverride.date == data.date,
    ).delete()

    override = DateOverride(schedule_id=schedule_id, **data.model_dump())
    db.add(override)
    db.commit()
    db.refresh(override)
    return override


# ── Available Slots (Public) ─────────────────────────────────────────────────

@router.get("/slots/{username}/{slug}")
def get_slots(
    username: str,
    slug: str,
    date: str,
    timezone: str = "UTC",
    db: Session = Depends(get_db),
):
    """Public endpoint: get available time slots for a date."""
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

    slots = get_available_slots(db, user.id, event_type, date, timezone)
    return {"date": date, "slots": slots, "timezone": timezone}


@router.get("/available-days/{username}")
def get_available_days(username: str, db: Session = Depends(get_db)):
    """Return list of available dates in the next 60 days."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    days = get_available_months(db, user.id)
    return {"available_days": days}
