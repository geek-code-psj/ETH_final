import smtplib
import threading
from email.message import EmailMessage
from core.config import settings
from core.logger import logger

def _send_email_task(to_email: str, subject: str, body: str):
    if not settings.SMTP_SERVER or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info("Email simulated (SMTP not fully configured)", to=to_email, subject=subject)
        return

    try:
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = settings.SMTP_USER
        msg['To'] = to_email

        # 5-second timeout prevents Render proxy from dropping connection
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=5) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
        logger.info("Email sent successfully", to=to_email, subject=subject)
    except Exception as e:
        logger.error("Failed to send email", error=str(e), to=to_email)

def send_email_notification(to_email: str, subject: str, body: str):
    """
    Sends an email notification via a detached daemon thread.
    This entirely frees the FastAPI/Uvicorn request scope so the browser doesn't get a Network Error on timeout.
    """
    thread = threading.Thread(
        target=_send_email_task,
        args=(to_email, subject, body),
        daemon=True
    )
    thread.start()
