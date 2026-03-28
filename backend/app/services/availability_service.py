from datetime import datetime, timedelta, date, timezone
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.models import (
    AvailabilitySchedule, WeeklyAvailabilitySlot, 
    Meeting, MeetingStatus, EventType, DayOfWeek
)
import pytz
import logging

logger = logging.getLogger(__name__)

DAY_MAP = {
    0: DayOfWeek.MONDAY,
    1: DayOfWeek.TUESDAY,
    2: DayOfWeek.WEDNESDAY,
    3: DayOfWeek.THURSDAY,
    4: DayOfWeek.FRIDAY,
    5: DayOfWeek.SATURDAY,
    6: DayOfWeek.SUNDAY,
}


def get_available_slots(
    db: Session,
    user_id: int,
    event_type: EventType,
    target_date: str,  # "YYYY-MM-DD"
    requester_tz: str = "UTC",
) -> List[dict]:
    """
    Calculate available time slots for a given date and event type.
    Accounts for: weekly availability, existing bookings, buffer times, date overrides.
    """
    # Get default schedule
    schedule = (
        db.query(AvailabilitySchedule)
        .filter(
            AvailabilitySchedule.user_id == user_id,
            AvailabilitySchedule.is_default == True,
        )
        .first()
    )

    if not schedule:
        return []

    # Parse the target date in host's timezone
    host_tz = pytz.timezone(schedule.timezone)
    try:
        req_tz = pytz.timezone(requester_tz)
    except Exception:
        req_tz = pytz.utc

    target_dt = datetime.strptime(target_date, "%Y-%m-%d").date()
    day_of_week = DAY_MAP[target_dt.weekday()]

    # Check date overrides first
    override = next(
        (o for o in schedule.date_overrides if o.date == target_date), None
    )
    if override and override.is_unavailable:
        return []

    # Get weekly slot for this day
    weekly_slot = next(
        (s for s in schedule.weekly_slots if s.day_of_week == day_of_week and s.is_available),
        None,
    )

    if not weekly_slot and not override:
        return []  # Day not available

    # Determine time range
    if override and override.slots:
        time_ranges = [(s["start"], s["end"]) for s in override.slots]
    elif weekly_slot:
        time_ranges = [(weekly_slot.start_time, weekly_slot.end_time)]
    else:
        return []

    # Generate candidate slots
    slot_duration = timedelta(minutes=event_type.duration_minutes)
    buffer_before = timedelta(minutes=event_type.buffer_before_minutes)
    buffer_after = timedelta(minutes=event_type.buffer_after_minutes)
    step = timedelta(minutes=max(15, min(event_type.duration_minutes, 30)))

    # Get existing meetings that day
    day_start = host_tz.localize(datetime.combine(target_dt, datetime.min.time()))
    day_end = host_tz.localize(datetime.combine(target_dt, datetime.max.time()))

    existing_meetings = (
        db.query(Meeting)
        .filter(
            Meeting.host_id == user_id,
            Meeting.start_time >= day_start.astimezone(pytz.utc),
            Meeting.start_time <= day_end.astimezone(pytz.utc),
            Meeting.status.in_([MeetingStatus.SCHEDULED, MeetingStatus.RESCHEDULED]),
        )
        .all()
    )

    # Build booked intervals (with buffers)
    booked_intervals: List[Tuple[datetime, datetime]] = []
    for m in existing_meetings:
        booked_start = m.start_time.astimezone(host_tz) - buffer_before
        booked_end = m.end_time.astimezone(host_tz) + buffer_after
        booked_intervals.append((booked_start, booked_end))

    # Generate all slots
    available_slots = []
    now_utc = datetime.now(timezone.utc)

    for start_str, end_str in time_ranges:
        range_start = host_tz.localize(
            datetime.combine(target_dt, datetime.strptime(start_str, "%H:%M").time())
        )
        range_end = host_tz.localize(
            datetime.combine(target_dt, datetime.strptime(end_str, "%H:%M").time())
        )

        current = range_start
        while current + slot_duration <= range_end:
            slot_start = current
            slot_end = current + slot_duration
            effective_start = slot_start - buffer_before
            effective_end = slot_end + buffer_after

            # Skip past slots
            if slot_start.astimezone(pytz.utc) <= now_utc:
                current += step
                continue

            # Check for conflicts
            is_free = True
            for b_start, b_end in booked_intervals:
                if effective_start < b_end and effective_end > b_start:
                    is_free = False
                    break

            if is_free:
                # Return times in requester's timezone
                slot_start_req = slot_start.astimezone(req_tz)
                slot_end_req = slot_end.astimezone(req_tz)
                available_slots.append({
                    "start_time": slot_start_req.isoformat(),
                    "end_time": slot_end_req.isoformat(),
                    "is_available": True,
                })

            current += step

    return available_slots


def get_available_months(db: Session, user_id: int) -> List[str]:
    """Return which days in the next 60 days have any availability."""
    schedule = (
        db.query(AvailabilitySchedule)
        .filter(AvailabilitySchedule.user_id == user_id, AvailabilitySchedule.is_default == True)
        .first()
    )
    if not schedule:
        return []

    available_days = {s.day_of_week for s in schedule.weekly_slots if s.is_available}
    today = date.today()
    result = []

    for i in range(60):
        d = today + timedelta(days=i)
        day_enum = DAY_MAP[d.weekday()]
        if day_enum in available_days:
            result.append(d.isoformat())

    return result
