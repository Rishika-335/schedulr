from fastapi import Header, HTTPException, status, Depends
from app.core.config import settings


async def verify_api_key(x_api_key: str = Header(None)):
    """Protect admin routes with a simple API key."""
    if not settings.API_KEY:
        return  # If no API key configured, skip check
    if x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key. Include X-API-Key header."
        )