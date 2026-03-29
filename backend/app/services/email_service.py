import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# def send_email(to_email: str, subject: str, html_body: str, text_body: str = ""):
#     """Send an email via SMTP. Gracefully skips if not configured."""
#     if not settings.EMAIL_ENABLED or not settings.SMTP_USER:
#         logger.info(f"Email not configured. Would have sent to {to_email}: {subject}")
#         return False

#     try:
#         msg = MIMEMultipart("alternative")
#         msg["Subject"] = subject
#         msg["From"] = f"Schedulr <{settings.SMTP_FROM}>"
#         msg["To"] = to_email

#         if text_body:
#             msg.attach(MIMEText(text_body, "plain"))
#         msg.attach(MIMEText(html_body, "html"))

#         with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
#             server.starttls()
#             server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
#             server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

#         logger.info(f"✅ Email sent to {to_email}: {subject}")
#         return True
#     except Exception as e:
#         logger.error(f"❌ Email failed: {e}")
#         return False

def send_email(to_email: str, subject: str, html_body: str, text_body: str = ""):
    """Send an email via SMTP. Gracefully skips if not configured."""
    if not settings.EMAIL_ENABLED or not settings.SMTP_USER:
        logger.info(f"Email not configured. Would have sent to {to_email}: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Schedulr <{settings.SMTP_FROM}>"
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

        logger.info(f"✅ Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"❌ Email failed: {e}")
        return False


def _format_datetime(dt: datetime, tz: str) -> str:
    return dt.strftime("%A, %B %d, %Y at %I:%M %p") + f" ({tz})"


EMAIL_STYLE = """
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,105,255,0.08); }
  .header { background: linear-gradient(135deg, #0069ff 0%, #00a2ff 100%); padding: 36px 32px; text-align: center; }
  .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; }
  .body { padding: 32px; }
  .detail-card { background: #f8faff; border: 1px solid #e0eaff; border-radius: 12px; padding: 20px; margin: 20px 0; }
  .detail-row { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
  .detail-row:last-child { margin-bottom: 0; }
  .detail-label { color: #6b7280; font-size: 13px; min-width: 80px; font-weight: 500; }
  .detail-value { color: #1f2937; font-size: 14px; font-weight: 600; }
  .btn { display: inline-block; background: #0069ff; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px; }
  .btn-danger { background: #ef4444; }
  .footer { text-align: center; padding: 20px 32px; color: #9ca3af; font-size: 12px; border-top: 1px solid #f3f4f6; }
  .color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
</style>
"""


def send_booking_confirmation_to_invitee(meeting, event_type, host):
    """Email sent to invitee after booking."""
    formatted_time = _format_datetime(meeting.start_time, meeting.timezone)
    cancel_url = f"{settings.APP_URL}/cancel/{meeting.booking_token}"

    html = f"""
<!DOCTYPE html><html><head>{EMAIL_STYLE}</head><body>
<div class="container">
  <div class="header">
    <h1>✅ You're Scheduled!</h1>
    <p>A calendar invitation has been sent to your email</p>
  </div>
  <div class="body">
    <p>Hi <strong>{meeting.invitee_name}</strong>,</p>
    <p>Your meeting has been confirmed. Here are the details:</p>
    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">
          <span class="color-dot" style="background:{event_type.color}"></span>
          {event_type.name}
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Host</span>
        <span class="detail-value">{host.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Time</span>
        <span class="detail-value">{formatted_time}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Duration</span>
        <span class="detail-value">{event_type.duration_minutes} minutes</span>
      </div>
      {"<div class='detail-row'><span class='detail-label'>Location</span><span class='detail-value'>" + meeting.location + "</span></div>" if meeting.location else ""}
    </div>
    <p>Need to cancel? <a href="{cancel_url}">Click here to cancel this meeting</a></p>
  </div>
  <div class="footer">Powered by Schedulr &bull; <a href="{settings.APP_URL}">schedulr.app</a></div>
</div>
</body></html>
"""
    send_email(meeting.invitee_email, f"Confirmed: {event_type.name} with {host.name}", html)


def send_booking_notification_to_host(meeting, event_type, host):
    """Email sent to host when someone books with them."""
    formatted_time = _format_datetime(meeting.start_time, meeting.timezone)

    html = f"""
<!DOCTYPE html><html><head>{EMAIL_STYLE}</head><body>
<div class="container">
  <div class="header">
    <h1>📅 New Booking!</h1>
    <p>{meeting.invitee_name} has scheduled a meeting with you</p>
  </div>
  <div class="body">
    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">{event_type.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Invitee</span>
        <span class="detail-value">{meeting.invitee_name} ({meeting.invitee_email})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Time</span>
        <span class="detail-value">{formatted_time}</span>
      </div>
      {("<div class='detail-row'><span class='detail-label'>Notes</span><span class='detail-value'>" + meeting.invitee_notes + "</span></div>") if meeting.invitee_notes else ""}
    </div>
    <a href="{settings.APP_URL}/dashboard/meetings" class="btn">View in Dashboard</a>
  </div>
  <div class="footer">Powered by Schedulr</div>
</div>
</body></html>
"""
    send_email(host.email, f"New Booking: {event_type.name} with {meeting.invitee_name}", html)


def send_cancellation_email(meeting, event_type, host, cancelled_by="invitee"):
    """Email both parties on cancellation."""
    formatted_time = _format_datetime(meeting.start_time, meeting.timezone)

    for recipient_email, recipient_name in [
        (meeting.invitee_email, meeting.invitee_name),
        (host.email, host.name),
    ]:
        html = f"""
<!DOCTYPE html><html><head>{EMAIL_STYLE}</head><body>
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);">
    <h1>❌ Meeting Cancelled</h1>
    <p>Your scheduled meeting has been cancelled</p>
  </div>
  <div class="body">
    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">{event_type.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Was</span>
        <span class="detail-value">{formatted_time}</span>
      </div>
      {("<div class='detail-row'><span class='detail-label'>Reason</span><span class='detail-value'>" + meeting.cancel_reason + "</span></div>") if meeting.cancel_reason else ""}
    </div>
    <a href="{settings.APP_URL}/{host.username}" class="btn">Book a new time</a>
  </div>
  <div class="footer">Powered by Schedulr</div>
</div>
</body></html>
"""
        send_email(recipient_email, f"Cancelled: {event_type.name}", html)


def send_reschedule_email(old_meeting, new_meeting, event_type, host):
    """Email on reschedule."""
    old_time = _format_datetime(old_meeting.start_time, old_meeting.timezone)
    new_time = _format_datetime(new_meeting.start_time, new_meeting.timezone)
    cancel_url = f"{settings.APP_URL}/cancel/{new_meeting.booking_token}"

    html = f"""
<!DOCTYPE html><html><head>{EMAIL_STYLE}</head><body>
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%);">
    <h1>🔄 Meeting Rescheduled</h1>
    <p>Your meeting time has been updated</p>
  </div>
  <div class="body">
    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">Event</span>
        <span class="detail-value">{event_type.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Old Time</span>
        <span class="detail-value" style="text-decoration:line-through;color:#9ca3af">{old_time}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">New Time</span>
        <span class="detail-value">{new_time}</span>
      </div>
    </div>
    <p><a href="{cancel_url}">Cancel this meeting</a></p>
  </div>
  <div class="footer">Powered by Schedulr</div>
</div>
</body></html>
"""
    send_email(new_meeting.invitee_email, f"Rescheduled: {event_type.name} with {host.name}", html)
