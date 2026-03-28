from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


class DayOfWeekEnum(str, Enum):
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"
    saturday = "saturday"
    sunday = "sunday"


class MeetingStatusEnum(str, Enum):
    scheduled = "scheduled"
    cancelled = "cancelled"
    completed = "completed"
    rescheduled = "rescheduled"


# ─── User Schemas ───────────────────────────────────────────────────────────

class UserBase(BaseModel):
    name: str
    email: str
    username: str
    timezone: str = "UTC"
    welcome_message: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    welcome_message: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Event Type Schemas ──────────────────────────────────────────────────────

class EventTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    duration_minutes: int = Field(..., ge=5, le=480)
    color: str = "#0069ff"
    location: Optional[str] = None
    buffer_before_minutes: int = 0
    buffer_after_minutes: int = 0
    max_bookings_per_day: Optional[int] = None
    custom_questions: Optional[List[Dict[str, Any]]] = None


class EventTypeCreate(EventTypeBase):
    pass


class EventTypeUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=5, le=480)
    color: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
    buffer_before_minutes: Optional[int] = None
    buffer_after_minutes: Optional[int] = None
    max_bookings_per_day: Optional[int] = None
    custom_questions: Optional[List[Dict[str, Any]]] = None


class EventTypeResponse(EventTypeBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Availability Schemas ────────────────────────────────────────────────────

class WeeklySlotBase(BaseModel):
    day_of_week: DayOfWeekEnum
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    is_available: bool = True


class WeeklySlotCreate(WeeklySlotBase):
    pass


class WeeklySlotResponse(WeeklySlotBase):
    id: int
    schedule_id: int

    class Config:
        from_attributes = True


class DateOverrideBase(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    is_unavailable: bool = False
    slots: Optional[List[Dict[str, str]]] = None


class DateOverrideCreate(DateOverrideBase):
    pass


class DateOverrideResponse(DateOverrideBase):
    id: int
    schedule_id: int

    class Config:
        from_attributes = True


class AvailabilityScheduleBase(BaseModel):
    name: str = "Working Hours"
    timezone: str = "UTC"
    is_default: bool = False


class AvailabilityScheduleCreate(AvailabilityScheduleBase):
    weekly_slots: List[WeeklySlotCreate] = []


class AvailabilityScheduleUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    is_default: Optional[bool] = None
    weekly_slots: Optional[List[WeeklySlotCreate]] = None


class AvailabilityScheduleResponse(AvailabilityScheduleBase):
    id: int
    user_id: int
    weekly_slots: List[WeeklySlotResponse] = []
    date_overrides: List[DateOverrideResponse] = []

    class Config:
        from_attributes = True


# ─── Booking / Meeting Schemas ───────────────────────────────────────────────

class BookingCreate(BaseModel):
    invitee_name: str = Field(..., min_length=1, max_length=255)
    invitee_email: str
    invitee_notes: Optional[str] = None
    start_time: datetime
    timezone: str = "UTC"
    custom_answers: Optional[Dict[str, Any]] = None


class BookingResponse(BaseModel):
    id: int
    booking_token: str
    invitee_name: str
    invitee_email: str
    invitee_notes: Optional[str]
    start_time: datetime
    end_time: datetime
    timezone: str
    status: MeetingStatusEnum
    location: Optional[str]
    event_type: EventTypeResponse
    host: UserResponse
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingResponse(BaseModel):
    id: int
    booking_token: str
    invitee_name: str
    invitee_email: str
    invitee_notes: Optional[str]
    start_time: datetime
    end_time: datetime
    timezone: str
    status: MeetingStatusEnum
    cancel_reason: Optional[str]
    location: Optional[str]
    event_type: EventTypeResponse
    host: UserResponse
    rescheduled_from_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class MeetingCancel(BaseModel):
    cancel_reason: Optional[str] = None


class MeetingReschedule(BaseModel):
    new_start_time: datetime
    timezone: str = "UTC"


class AvailableSlotsRequest(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    timezone: str = "UTC"


class AvailableSlotResponse(BaseModel):
    start_time: str  # ISO datetime string
    end_time: str
    is_available: bool = True
