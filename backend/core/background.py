"""
Background Task Utilities for HRMS.

Uses FastAPI's built-in BackgroundTasks (no extra infrastructure needed).
For heavier jobs, swap these out for Celery tasks later.

Usage in a router:
    from fastapi import BackgroundTasks
    from core.background import bg_send_notification_email

    @router.post("/leave")
    def create_leave(bg: BackgroundTasks, ...):
        leave = leave_service.create(...)
        bg.add_task(bg_send_notification_email, to=emp.email, subject="Leave submitted", body="...")
        return leave
"""
import os
from core.logger import logger


# ── Email (SendGrid or SMTP fallback) ─────────────────────────────────────────

def bg_send_notification_email(to: str, subject: str, body: str):
    """
    Background task: send an email notification.
    Runs after the HTTP response is already returned to the user.
    """
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        logger.warning("email_skipped", reason="SENDGRID_API_KEY not set", to=to, subject=subject)
        return

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        from_email = os.getenv("NOTIFICATION_FROM_EMAIL", "noreply@hrms.com")
        msg = Mail(from_email=from_email, to_emails=to, subject=subject, html_content=body)
        SendGridAPIClient(api_key).send(msg)
        logger.info("email_sent", to=to, subject=subject)
    except ImportError:
        logger.error("email_failed", reason="sendgrid package not installed", to=to)
    except Exception as e:
        logger.error("email_failed", error=str(e), to=to, subject=subject)


# ── Payroll PDF generation (placeholder) ────────────────────────────────────

def bg_generate_payslip_pdf(payroll_record_id: int, employee_email: str):
    """
    Background task: generate a PDF payslip and email it.
    Replace body with actual PDF generation (reportlab / weasyprint).
    """
    logger.info("payslip_generation_started", record_id=payroll_record_id)
    # TODO: generate PDF, save to Cloudinary, email the link
    bg_send_notification_email(
        to=employee_email,
        subject="Your Payslip is Ready",
        body="<p>Your monthly payslip has been generated. Login to view it.</p>"
    )


# ── Attendance anomaly alert ─────────────────────────────────────────────────

def bg_alert_attendance_anomaly(employee_name: str, admin_email: str, date_str: str, reason: str):
    """
    Background task: alert admin of an attendance anomaly (e.g. absent with no leave).
    """
    bg_send_notification_email(
        to=admin_email,
        subject=f"Attendance Alert: {employee_name}",
        body=f"<p><strong>{employee_name}</strong> was absent on {date_str}. Reason: {reason}</p>"
    )


# ── Leave status email ───────────────────────────────────────────────────────

def bg_leave_status_email(employee_email: str, employee_name: str, status: str, leave_type: str):
    """
    Background task: email employee about their leave approval/rejection.
    """
    emoji = "✅" if status == "approved" else "❌"
    bg_send_notification_email(
        to=employee_email,
        subject=f"{emoji} Leave {status.capitalize()} — {leave_type}",
        body=(
            f"<p>Hi {employee_name},</p>"
            f"<p>Your <strong>{leave_type}</strong> request has been "
            f"<strong>{status}</strong>.</p>"
            f"<p>Login to the portal to view details.</p>"
        )
    )


# ── New employee welcome email ────────────────────────────────────────────────

def bg_welcome_email(employee_email: str, employee_name: str, temp_password: str = None):
    """
    Background task: send welcome email to a new employee with optional portal credentials.
    """
    password_section = (
        f"<p>Your temporary portal password is: <strong>{temp_password}</strong><br>"
        f"Please change it on first login.</p>"
    ) if temp_password else ""

    bg_send_notification_email(
        to=employee_email,
        subject="Welcome to the Team! 🎉",
        body=(
            f"<p>Hi {employee_name},</p>"
            f"<p>Welcome aboard! Your HR account has been set up.</p>"
            f"{password_section}"
            f"<p>If you have any questions, contact HR.</p>"
        )
    )
