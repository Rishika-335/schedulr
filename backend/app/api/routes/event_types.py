from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import EventType, User
from app.schemas.schemas import EventTypeCreate, EventTypeUpdate, EventTypeResponse
from app.core.config import settings

router = APIRouter()


def get_default_user(db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == settings.DEFAULT_USER_ID).first()
    if not user:
        raise HTTPException(status_code=404, detail="Default user not found")
    return user


@router.get("/", response_model=List[EventTypeResponse])
def list_event_types(
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    """List all event types for the current user."""
    return (
        db.query(EventType)
        .filter(EventType.user_id == user.id)
        .order_by(EventType.created_at)
        .all()
    )


@router.get("/public/{username}", response_model=List[EventTypeResponse])
def list_public_event_types(username: str, db: Session = Depends(get_db)):
    """List active event types for a public booking page."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return (
        db.query(EventType)
        .filter(EventType.user_id == user.id, EventType.is_active == True)
        .order_by(EventType.duration_minutes)
        .all()
    )


@router.post("/", response_model=EventTypeResponse, status_code=status.HTTP_201_CREATED)
def create_event_type(
    data: EventTypeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    # Check slug uniqueness for this user
    existing = (
        db.query(EventType)
        .filter(EventType.user_id == user.id, EventType.slug == data.slug)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists. Please choose a different URL slug.")

    event_type = EventType(user_id=user.id, **data.model_dump())
    db.add(event_type)
    db.commit()
    db.refresh(event_type)
    return event_type


@router.get("/{event_type_id}", response_model=EventTypeResponse)
def get_event_type(
    event_type_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    et = db.query(EventType).filter(
        EventType.id == event_type_id, EventType.user_id == user.id
    ).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    return et


@router.get("/by-slug/{username}/{slug}", response_model=EventTypeResponse)
def get_event_type_by_slug(username: str, slug: str, db: Session = Depends(get_db)):
    """Public lookup by username + slug."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    et = db.query(EventType).filter(
        EventType.user_id == user.id,
        EventType.slug == slug,
        EventType.is_active == True,
    ).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    return et


@router.patch("/{event_type_id}", response_model=EventTypeResponse)
def update_event_type(
    event_type_id: int,
    updates: EventTypeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    et = db.query(EventType).filter(
        EventType.id == event_type_id, EventType.user_id == user.id
    ).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")

    update_data = updates.model_dump(exclude_none=True)

    # Check slug uniqueness if changing
    if "slug" in update_data and update_data["slug"] != et.slug:
        existing = db.query(EventType).filter(
            EventType.user_id == user.id,
            EventType.slug == update_data["slug"],
            EventType.id != event_type_id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already exists.")

    for field, value in update_data.items():
        setattr(et, field, value)

    db.commit()
    db.refresh(et)
    return et


@router.delete("/{event_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_type(
    event_type_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    et = db.query(EventType).filter(
        EventType.id == event_type_id, EventType.user_id == user.id
    ).first()
    if not et:
        raise HTTPException(status_code=404, detail="Event type not found")
    db.delete(et)
    db.commit()
