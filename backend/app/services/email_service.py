# 

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str, text_body: str = ""):
    """Send an email via SMTP with full debug logging."""

    logger.info("📨 send_email() CALLED")

    # 🔥 HARD FAIL instead of silent skip
    if not settings.EMAIL_ENABLED:
        raise ValueError("EMAIL_ENABLED is False")

    if not settings.SMTP_USER:
        raise ValueError("SMTP_USER is missing")

    if not settings.SMTP_PASSWORD:
        raise ValueError("SMTP_PASSWORD is missing")

    if not settings.SMTP_HOST:
        raise ValueError("SMTP_HOST is missing")

    if not settings.SMTP_PORT:
        raise ValueError("SMTP_PORT is missing")

    try:
        logger.info(f"🔌 Connecting to SMTP: {settings.SMTP_HOST}:{settings.SMTP_PORT}")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Schedulr <{settings.SMTP_FROM}>"
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            logger.info("➡️ Starting TLS...")
            server.starttls()

            logger.info("🔐 Logging in to SMTP...")
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            logger.info(f"📤 Sending email to {to_email}...")
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

        logger.info(f"✅ Email sent successfully to {to_email}")
        return True

    except Exception as e:
        logger.error(f"❌ EMAIL FAILED: {str(e)}")
        raise  # 🔥 re-raise so you SEE the error