# Schedulr — Calendly Clone

A full-stack scheduling/booking web application that replicates Calendly's design and user experience. Built with React.js, FastAPI, and MySQL.

![Schedulr Screenshot](https://via.placeholder.com/800x400?text=Schedulr+Preview)

## 🔗 Links

- **Frontend (Netlify):** https://schedulr-app.netlify.app
- **Backend API (Railway):** https://schedulr-api.railway.app
- **API Docs:** https://schedulr-api.railway.app/docs

---

## 🛠 Tech Stack

| Layer    | Technology                           |
|----------|--------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS         |
| Backend  | Python 3.11, FastAPI, SQLAlchemy     |
| Database | MySQL 8 (Aiven free tier)            |
| Deploy   | Netlify (frontend), Railway (backend)|
| Email    | SMTP via Gmail (optional)            |

---

## 📦 Features

### Core (All Implemented)
- ✅ **Event Types** — Create, edit, delete, activate/deactivate event types with custom name, duration, URL slug, color, and location
- ✅ **Availability Settings** — Set weekly hours per day, timezone, with toggle per day
- ✅ **Public Booking Page** — Month calendar view, available time slots, booking form, double-booking prevention
- ✅ **Booking Confirmation** — Confirmation page with all meeting details and cancel link
- ✅ **Meetings Dashboard** — View upcoming/past meetings, cancel with reason

### Bonus (All Implemented)
- ✅ **Responsive Design** — Mobile, tablet, desktop fully supported
- ✅ **Email Notifications** — HTML emails on booking confirmation, cancellation, and reschedule (configurable)
- ✅ **Rescheduling Flow** — Reschedule via booking token endpoint
- ✅ **Buffer Time** — Per-event-type buffer before/after meetings, factored into slot calculation
- ✅ **Date-Specific Overrides** — Block or customize availability for specific dates
- ✅ **Copy Booking Link** — One-click copy from dashboard

---

## 🗄 Database Schema

```
users
├── id (PK)
├── name, email, username (unique)
├── timezone, welcome_message, avatar_url
└── created_at, updated_at

event_types
├── id (PK)
├── user_id (FK → users)
├── name, slug, description
├── duration_minutes, color, location
├── buffer_before_minutes, buffer_after_minutes
├── is_active, max_bookings_per_day
├── custom_questions (JSON)
└── created_at, updated_at

availability_schedules
├── id (PK)
├── user_id (FK → users)
├── name, timezone
├── is_default
└── created_at

weekly_availability_slots
├── id (PK)
├── schedule_id (FK → availability_schedules)
├── day_of_week (ENUM: monday–sunday)
├── start_time, end_time (HH:MM)
└── is_available

date_overrides
├── id (PK)
├── schedule_id (FK → availability_schedules)
├── date (YYYY-MM-DD)
├── is_unavailable (bool)
└── slots (JSON: [{start, end}])

meetings
├── id (PK)
├── host_id (FK → users)
├── event_type_id (FK → event_types)
├── invitee_name, invitee_email, invitee_notes
├── start_time, end_time, timezone
├── status (ENUM: scheduled/cancelled/completed/rescheduled)
├── cancel_reason
├── booking_token (unique, for public cancel/reschedule links)
├── rescheduled_from_id (self-FK → meetings)
├── location, custom_answers (JSON)
└── created_at, updated_at
```

**Key design decisions:**
- `booking_token` enables public cancel/reschedule without auth
- `buffer_before/after_minutes` stored on event_type, applied at slot calculation time
- `date_overrides` allows day-level granularity over the weekly schedule
- `rescheduled_from_id` preserves the full rescheduling chain
- Soft status (not hard delete) preserves meeting history

---

## 🚀 Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A MySQL database (Aiven free tier, PlanetScale, or local MySQL)

---

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your database URL and other settings

# 5. Run the server (auto-creates tables + seeds on first run)
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive API docs: `http://localhost:8000/docs`

---

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000

# 4. Run dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

### Aiven MySQL Setup (Free Tier)

1. Sign up at [aiven.io](https://aiven.io) → Create a new MySQL service (free tier)
2. Once running, go to **Connection information** → copy the **Service URI**
3. It looks like: `mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?ssl-mode=REQUIRED`
4. Convert to SQLAlchemy format for your `.env`:
   ```
   DATABASE_URL=mysql+pymysql://avnadmin:PASSWORD@HOST:PORT/defaultdb
   ```
5. Download the CA certificate if needed and add to connect args (see `app/db/database.py`)

---

## 🌐 Deployment

### Backend → Railway

1. Push backend code to a GitHub repository
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your backend repo
4. Add environment variables in Railway dashboard (from `.env.example`)
5. Railway auto-detects `railway.toml` and deploys via Nixpacks

### Frontend → Netlify

1. Push frontend code to GitHub
2. Go to [netlify.com](https://netlify.com) → New site from Git
3. Build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
4. Add environment variable: `VITE_API_URL=https://your-app.railway.app`
5. `netlify.toml` handles SPA routing redirects automatically

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get current user profile |
| PATCH | `/api/v1/users/me` | Update profile |
| GET | `/api/v1/users/:username` | Public profile lookup |
| GET | `/api/v1/event-types/` | List all event types |
| POST | `/api/v1/event-types/` | Create event type |
| PATCH | `/api/v1/event-types/:id` | Update event type |
| DELETE | `/api/v1/event-types/:id` | Delete event type |
| GET | `/api/v1/event-types/public/:username` | Public event type list |
| GET | `/api/v1/event-types/by-slug/:username/:slug` | Event type by slug |
| GET | `/api/v1/availability/schedules` | List schedules |
| POST | `/api/v1/availability/schedules` | Create schedule |
| PATCH | `/api/v1/availability/schedules/:id` | Update schedule + slots |
| GET | `/api/v1/availability/slots/:username/:slug` | Available time slots for a date |
| GET | `/api/v1/availability/available-days/:username` | Available calendar days |
| POST | `/api/v1/bookings/:username/:slug` | Create booking (public) |
| GET | `/api/v1/bookings/confirmation/:token` | Get booking by token |
| POST | `/api/v1/bookings/cancel/:token` | Cancel by token (public) |
| POST | `/api/v1/bookings/reschedule/:token` | Reschedule by token |
| GET | `/api/v1/meetings/` | List meetings (dashboard) |
| POST | `/api/v1/meetings/:id/cancel` | Cancel meeting (admin) |
| GET | `/api/v1/meetings/stats/summary` | Stats summary |

---

## 🧩 Project Structure

```
schedulr/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, lifespan, CORS
│   │   ├── core/
│   │   │   └── config.py        # Pydantic settings / env vars
│   │   ├── db/
│   │   │   ├── database.py      # SQLAlchemy engine + session
│   │   │   └── seed.py          # Sample data seeder
│   │   ├── models/
│   │   │   └── models.py        # All SQLAlchemy ORM models
│   │   ├── schemas/
│   │   │   └── schemas.py       # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── availability_service.py  # Slot calculation logic
│   │   │   └── email_service.py         # HTML email notifications
│   │   └── api/routes/
│   │       ├── users.py
│   │       ├── event_types.py
│   │       ├── availability.py
│   │       ├── bookings.py
│   │       └── meetings.py
│   ├── requirements.txt
│   ├── railway.toml
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── App.jsx              # Router + all routes
    │   ├── main.jsx             # React entry point
    │   ├── index.css            # Tailwind + global styles
    │   ├── services/
    │   │   └── api.js           # Axios API client (all endpoints)
    │   ├── lib/
    │   │   └── utils.js         # Date helpers, constants, slugify
    │   ├── components/
    │   │   ├── layout/
    │   │   │   └── DashboardLayout.jsx  # Sidebar + shell
    │   │   └── ui/
    │   │       └── index.jsx    # Modal, Spinner, EmptyState, etc.
    │   └── pages/
    │       ├── EventTypesPage.jsx     # CRUD event types
    │       ├── AvailabilityPage.jsx   # Weekly schedule editor
    │       ├── MeetingsPage.jsx       # Meetings dashboard
    │       ├── PublicProfilePage.jsx  # Public event type listing
    │       ├── BookingPage.jsx        # Calendar + slots + form
    │       ├── ConfirmationPage.jsx   # Booking confirmed
    │       ├── CancelPage.jsx         # Cancel via token
    │       └── NotFoundPage.jsx
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── netlify.toml
```

---

## ⚙️ Email Notifications (Optional)

To enable email notifications, set in your `.env`:

```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password  # Gmail App Password
SMTP_FROM=noreply@schedulr.app
APP_URL=https://your-frontend.netlify.app
```

**Gmail App Password setup:**
1. Enable 2FA on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate a password for "Mail"

Emails are sent for: booking confirmation (to invitee + host), cancellation (both parties), and reschedule (invitee).

---

## 📝 Assumptions

1. **Single user / no auth** — The application assumes one default admin user (ID=1) is always "logged in". No authentication system is needed per the assignment spec.
2. **One availability schedule** — Each user has one default schedule. The schema supports multiple schedules but the UI focuses on the primary one.
3. **Timezone handling** — Host sets their timezone in availability. Invitees see times in their browser's local timezone (auto-detected). All times stored in UTC internally.
4. **Slot granularity** — Time slots are generated every 15 minutes for events ≤15 min, every 30 minutes for longer events, matching Calendly's behavior.
5. **No recurring meetings** — All bookings are one-time events.
6. **Booking token** — A 32-byte URL-safe token is generated per booking to enable stateless cancel/reschedule without login.
7. **Email is optional** — The app works fully without email configured. If SMTP is not set up, booking still succeeds silently.
8. **Aiven SSL** — The database connection includes SSL mode detection for Aiven/PlanetScale hosted databases.

---

## 👤 Default Seed Data

On first startup, the following sample data is created:

**User:** Alex Johnson (`/alex`)

**Event Types:**
- Quick Chat (15 min, Google Meet)
- 30 Min Meeting (30 min, Zoom)
- 1 Hour Workshop (60 min, Zoom, with custom questions)
- Coffee Chat (20 min, Phone Call)

**Availability:** Mon–Sat, 9 AM–5 PM (Sat: 10 AM–2 PM), America/New_York

**Meetings:** 4 upcoming + 3 past (completed/cancelled)

---

## 🧠 Design Decisions

- **FastAPI + SQLAlchemy** chosen for type safety, automatic OpenAPI docs, and async-ready architecture
- **Pydantic v2** for strict request validation with clear error messages
- **Buffer time** is applied at query time (not stored as blocked slots) — more flexible for schedule changes
- **booking_token** enables passwordless cancel/reschedule URLs that can be shared via email
- **React Router v6** with nested routes for clean URL structure (`/username/slug`)
- **date-fns** (not moment.js) — lighter, tree-shakeable, immutable date handling
- **Tailwind CSS** — utility-first for rapid development matching Calendly's clean design language
