"""
Notification Service: creates in-app notifications and optionally sends emails.
"""
import os
from sqlalchemy.orm import Session
from models.notification import Notification


SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("NOTIFICATION_FROM_EMAIL", "noreply@hrms.com")


def _send_email(to: str, subject: str, body: str):
    """Attempt to send email via SendGrid if API key is configured."""
    if not SENDGRID_API_KEY:
        return
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=to,
            subject=subject,
            html_content=body
        )
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(message)
    except Exception as e:
        print(f"Email send failed: {e}")


class NotificationService:
    @staticmethod
    def create(
        db: Session,
        notif_type: str,
        title: str,
        message: str,
        admin_id: int = None,
        employee_id: int = None,
        action_url: str = None,
        email_to: str = None
    ) -> Notification:
        notif = Notification(
            type=notif_type,
            title=title,
            message=message,
            admin_id=admin_id,
            employee_id=employee_id,
            action_url=action_url
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        # Optional email
        if email_to:
            _send_email(email_to, title, f"<p>{message}</p>")

        return notif

    @staticmethod
    def mark_read(db: Session, notif_id: int, admin_id: int = None, employee_id: int = None):
        q = db.query(Notification).filter(Notification.id == notif_id)
        if admin_id:
            q = q.filter(Notification.admin_id == admin_id)
        if employee_id:
            q = q.filter(Notification.employee_id == employee_id)
        notif = q.first()
        if notif:
            notif.is_read = True
            db.commit()

    @staticmethod
    def get_unread(db: Session, admin_id: int = None, employee_id: int = None, limit: int = 20):
        q = db.query(Notification).filter(Notification.is_read == False)
        if admin_id:
            q = q.filter(Notification.admin_id == admin_id)
        if employee_id:
            q = q.filter(Notification.employee_id == employee_id)
        return q.order_by(Notification.created_at.desc()).limit(limit).all()

    # ── Convenience notifiers ─────────────────────────────────────────────────
    @staticmethod
    def notify_leave_status(db: Session, employee, admin, status: str):
        msg = f"Your leave request has been {status}."
        NotificationService.create(
            db=db,
            notif_type="leave_update",
            title=f"Leave {status.capitalize()}",
            message=msg,
            employee_id=employee.id,
            email_to=employee.email
        )
        # Notify admin team too
        NotificationService.create(
            db=db,
            notif_type="leave_update",
            title=f"Leave {status.capitalize()} by {admin.email}",
            message=f"{employee.first_name} {employee.last_name}'s leave was {status}.",
            admin_id=admin.id
        )

    @staticmethod
    def notify_employee_added(db: Session, employee, admin):
        NotificationService.create(
            db=db,
            notif_type="employee_added",
            title="New Employee Added",
            message=f"{employee.first_name} {employee.last_name} has been added to {employee.department.value}.",
            admin_id=admin.id,
            action_url=f"/employees/{employee.id}"
        )

notification_service = NotificationService()
