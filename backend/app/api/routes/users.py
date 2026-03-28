from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User
from app.schemas.schemas import UserResponse, UserUpdate
from app.core.config import settings

router = APIRouter()


def get_default_user(db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == settings.DEFAULT_USER_ID).first()
    if not user:
        raise HTTPException(status_code=404, detail="Default user not found")
    return user


@router.get("/me", response_model=UserResponse)
def get_current_user(user: User = Depends(get_default_user)):
    """Get the default logged-in user."""
    return user


@router.patch("/me", response_model=UserResponse)
def update_current_user(
    updates: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_default_user),
):
    for field, value in updates.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{username}", response_model=UserResponse)
def get_user_by_username(username: str, db: Session = Depends(get_db)):
    """Public profile lookup by username."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
