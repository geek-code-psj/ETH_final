import smtplib
from email.message import EmailMessage
from core.config import settings
from core.logger import logger

def send_email_notification(to_email: str, subject: str, body: str):
    """
    Sends an email notification if SMTP is configured.
    Otherwise, just logs the would-be email for local testing.
    """
    if not settings.SMTP_SERVER or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info("Email simulated (SMTP not fully configured)", to=to_email, subject=subject)
        return

    try:
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = settings.SMTP_USER
        msg['To'] = to_email

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
        logger.info("Email sent successfully", to=to_email, subject=subject)
    except Exception as e:
        logger.error("Failed to send email", error=str(e), to=to_email)
