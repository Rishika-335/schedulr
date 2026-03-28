from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.models import (
    User, EventType, AvailabilitySchedule, WeeklyAvailabilitySlot,
    Meeting, MeetingStatus, DayOfWeek
)
from datetime import datetime, timedelta, timezone
import secrets
import logging

logger = logging.getLogger(__name__)


def seed_database():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            logger.info("Database already seeded, skipping.")
            return

        logger.info("Seeding database with sample data...")

        # ── Default User ──────────────────────────────────────────────────
        user = User(
            name="Alex Johnson",
            email="alex@schedulr.app",
            username="alex",
            timezone="America/New_York",
            welcome_message="Welcome! I'm looking forward to connecting with you. Please book a time that works best for you.",
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
        )
        db.add(user)
        db.flush()

        # ── Event Types ───────────────────────────────────────────────────
        event_types_data = [
            {
                "name": "Quick Chat",
                "slug": "quick-chat",
                "description": "A 15-minute introductory call to discuss your needs and how I can help.",
                "duration_minutes": 15,
                "color": "#0069ff",
                "location": "Google Meet",
                "buffer_before_minutes": 0,
                "buffer_after_minutes": 5,
            },
            {
                "name": "30 Min Meeting",
                "slug": "30-min-meeting",
                "description": "A focused 30-minute meeting to dive deeper into your project or questions.",
                "duration_minutes": 30,
                "color": "#00a2ff",
                "location": "Zoom",
                "buffer_before_minutes": 5,
                "buffer_after_minutes": 5,
            },
            {
                "name": "1 Hour Workshop",
                "slug": "1-hour-workshop",
                "description": "An in-depth 60-minute session for detailed discussions, planning, or workshops.",
                "duration_minutes": 60,
                "color": "#7c3aed",
                "location": "Zoom",
                "buffer_before_minutes": 10,
                "buffer_after_minutes": 10,
                "custom_questions": [
                    {"id": "goal", "label": "What is your main goal for this session?", "type": "text", "required": True},
                    {"id": "prep", "label": "Is there anything you'd like me to prepare in advance?", "type": "textarea", "required": False},
                ],
            },
            {
                "name": "Coffee Chat",
                "slug": "coffee-chat",
                "description": "A relaxed 20-minute casual conversation. Grab a coffee and let's chat!",
                "duration_minutes": 20,
                "color": "#f59e0b",
                "location": "Phone Call",
                "buffer_before_minutes": 0,
                "buffer_after_minutes": 0,
            },
        ]

        created_event_types = []
        for et_data in event_types_data:
            et = EventType(user_id=user.id, **et_data)
            db.add(et)
            created_event_types.append(et)
        db.flush()

        # ── Availability Schedule ─────────────────────────────────────────
        schedule = AvailabilitySchedule(
            user_id=user.id,
            name="Working Hours",
            timezone="America/New_York",
            is_default=True,
        )
        db.add(schedule)
        db.flush()

        # Mon–Fri 9am–5pm, Sat 10am–2pm
        availability_data = [
            (DayOfWeek.MONDAY, "09:00", "17:00", True),
            (DayOfWeek.TUESDAY, "09:00", "17:00", True),
            (DayOfWeek.WEDNESDAY, "09:00", "17:00", True),
            (DayOfWeek.THURSDAY, "09:00", "17:00", True),
            (DayOfWeek.FRIDAY, "09:00", "17:00", True),
            (DayOfWeek.SATURDAY, "10:00", "14:00", True),
            (DayOfWeek.SUNDAY, "09:00", "17:00", False),
        ]

        for day, start, end, avail in availability_data:
            slot = WeeklyAvailabilitySlot(
                schedule_id=schedule.id,
                day_of_week=day,
                start_time=start,
                end_time=end,
                is_available=avail,
            )
            db.add(slot)

        # ── Sample Meetings ───────────────────────────────────────────────
        now = datetime.now(timezone.utc)

        meetings_data = [
            # Upcoming meetings
            {
                "event_type": created_event_types[0],  # Quick Chat
                "invitee_name": "Sarah Chen",
                "invitee_email": "sarah.chen@example.com",
                "invitee_notes": "Looking to discuss a potential collaboration.",
                "start_delta": timedelta(days=1, hours=2),
                "status": MeetingStatus.SCHEDULED,
            },
            {
                "event_type": created_event_types[1],  # 30 Min Meeting
                "invitee_name": "Marcus Thompson",
                "invitee_email": "marcus.t@example.com",
                "invitee_notes": "Want to go over the project proposal.",
                "start_delta": timedelta(days=2, hours=4),
                "status": MeetingStatus.SCHEDULED,
            },
            {
                "event_type": created_event_types[2],  # 1 Hour Workshop
                "invitee_name": "Priya Patel",
                "invitee_email": "priya.p@example.com",
                "invitee_notes": None,
                "start_delta": timedelta(days=3, hours=1),
                "status": MeetingStatus.SCHEDULED,
            },
            {
                "event_type": created_event_types[3],  # Coffee Chat
                "invitee_name": "Jordan Lee",
                "invitee_email": "jordan.lee@example.com",
                "invitee_notes": "Just want to catch up and brainstorm ideas.",
                "start_delta": timedelta(days=5, hours=3),
                "status": MeetingStatus.SCHEDULED,
            },
            # Past meetings
            {
                "event_type": created_event_types[1],
                "invitee_name": "Emma Wilson",
                "invitee_email": "emma.w@example.com",
                "invitee_notes": "Great meeting, looking forward to the follow-up.",
                "start_delta": timedelta(days=-3, hours=-2),
                "status": MeetingStatus.COMPLETED,
            },
            {
                "event_type": created_event_types[0],
                "invitee_name": "David Kim",
                "invitee_email": "david.kim@example.com",
                "invitee_notes": None,
                "start_delta": timedelta(days=-7, hours=-1),
                "status": MeetingStatus.COMPLETED,
            },
            {
                "event_type": created_event_types[2],
                "invitee_name": "Sofia Rodriguez",
                "invitee_email": "sofia.r@example.com",
                "invitee_notes": None,
                "start_delta": timedelta(days=-10, hours=-3),
                "status": MeetingStatus.CANCELLED,
            },
        ]

        for m_data in meetings_data:
            et = m_data["event_type"]
            start = now + m_data["start_delta"]
            # Round to nearest 30 min
            start = start.replace(minute=30 if start.minute >= 30 else 0, second=0, microsecond=0)
            end = start + timedelta(minutes=et.duration_minutes)

            meeting = Meeting(
                host_id=user.id,
                event_type_id=et.id,
                invitee_name=m_data["invitee_name"],
                invitee_email=m_data["invitee_email"],
                invitee_notes=m_data["invitee_notes"],
                start_time=start,
                end_time=end,
                timezone="America/New_York",
                status=m_data["status"],
                location=et.location,
                booking_token=secrets.token_urlsafe(32),
            )
            db.add(meeting)

        db.commit()
        logger.info("✅ Database seeded successfully!")

    except Exception as e:
        logger.error(f"❌ Seeding failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()
