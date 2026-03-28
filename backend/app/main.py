from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.database import engine, Base
from app.api.routes import event_types, availability, bookings, meetings, users
from app.core.config import settings
from app.db.seed import seed_database
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Schedulr API...")
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Schedulr API",
    description="Calendly-clone scheduling platform API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(event_types.router, prefix="/api/v1/event-types", tags=["event-types"])
app.include_router(availability.router, prefix="/api/v1/availability", tags=["availability"])
app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["bookings"])
app.include_router(meetings.router, prefix="/api/v1/meetings", tags=["meetings"])


@app.get("/")
def root():
    return {"message": "Schedulr API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}


from fastapi import Depends
from app.core.security import verify_api_key

# Protected admin routes
app.include_router(event_types.router, prefix="/api/v1/event-types", tags=["event-types"], dependencies=[Depends(verify_api_key)])
app.include_router(availability.router, prefix="/api/v1/availability", tags=["availability"], dependencies=[Depends(verify_api_key)])
app.include_router(meetings.router, prefix="/api/v1/meetings", tags=["meetings"], dependencies=[Depends(verify_api_key)])

# Public routes (no key needed)
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["bookings"])