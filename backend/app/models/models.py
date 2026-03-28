from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, 
    ForeignKey, Enum, JSON, Time
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    RESCHEDULED = "rescheduled"


class DayOfWeek(str, enum.Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class User(Base):
    """Default admin user — no auth required, one user assumed."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    timezone = Column(String(100), default="UTC", nullable=False)
    welcome_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    event_types = relationship("EventType", back_populates="user", cascade="all, delete-orphan")
    availability_schedules = relationship("AvailabilitySchedule", back_populates="user", cascade="all, delete-orphan")
    meetings_as_host = relationship("Meeting", back_populates="host", cascade="all, delete-orphan")


class EventType(Base):
    """Represents a bookable meeting type (e.g., '30 Min Call')."""
    __tablename__ = "event_types"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False)  # e.g., 15, 30, 60
    color = Column(String(7), default="#0069ff")  # hex color
    location = Column(String(500), nullable=True)  # "Zoom", "Google Meet", etc.
    is_active = Column(Boolean, default=True, nullable=False)
    buffer_before_minutes = Column(Integer, default=0)  # bonus: buffer time
    buffer_after_minutes = Column(Integer, default=0)
    max_bookings_per_day = Column(Integer, nullable=True)  # optional cap
    custom_questions = Column(JSON, nullable=True)  # bonus: custom invitee questions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="event_types")
    meetings = relationship("Meeting", back_populates="event_type", cascade="all, delete-orphan")

    # Unique slug per user
    __table_args__ = (
        {"mysql_charset": "utf8mb4"},
    )


class AvailabilitySchedule(Base):
    """Named availability schedule (e.g., 'Working Hours', 'Weekends')."""
    __tablename__ = "availability_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), default="Working Hours", nullable=False)
    timezone = Column(String(100), default="UTC", nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="availability_schedules")
    weekly_slots = relationship("WeeklyAvailabilitySlot", back_populates="schedule", cascade="all, delete-orphan")
    date_overrides = relationship("DateOverride", back_populates="schedule", cascade="all, delete-orphan")


class WeeklyAvailabilitySlot(Base):
    """Recurring weekly availability (e.g., Mon 9am-5pm)."""
    __tablename__ = "weekly_availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("availability_schedules.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Enum(DayOfWeek), nullable=False)
    start_time = Column(String(5), nullable=False)  # "HH:MM" format
    end_time = Column(String(5), nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)

    # Relationships
    schedule = relationship("AvailabilitySchedule", back_populates="weekly_slots")


class DateOverride(Base):
    """Override availability for a specific date (bonus feature)."""
    __tablename__ = "date_overrides"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("availability_schedules.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False)  # "YYYY-MM-DD"
    is_unavailable = Column(Boolean, default=False)  # True = block entire day
    slots = Column(JSON, nullable=True)  # [{"start": "10:00", "end": "12:00"}, ...]

    # Relationships
    schedule = relationship("AvailabilitySchedule", back_populates="date_overrides")


class Meeting(Base):
    """A confirmed booking between host and invitee."""
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_type_id = Column(Integer, ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False)

    # Invitee details
    invitee_name = Column(String(255), nullable=False)
    invitee_email = Column(String(255), nullable=False, index=True)
    invitee_notes = Column(Text, nullable=True)
    custom_answers = Column(JSON, nullable=True)

    # Timing
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    timezone = Column(String(100), default="UTC")

    # Status
    status = Column(Enum(MeetingStatus), default=MeetingStatus.SCHEDULED, nullable=False)
    cancel_reason = Column(Text, nullable=True)

    # Rescheduling (bonus)
    rescheduled_from_id = Column(Integer, ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True)

    # Unique booking token for confirmation / cancellation links
    booking_token = Column(String(64), unique=True, index=True, nullable=False)

    # Location
    location = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    host = relationship("User", back_populates="meetings_as_host")
    event_type = relationship("EventType", back_populates="meetings")
    rescheduled_from = relationship("Meeting", remote_side=[id], foreign_keys=[rescheduled_from_id])
