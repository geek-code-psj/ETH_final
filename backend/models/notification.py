from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Text, Index
from sqlalchemy.sql import func
from core.database import Base


class Notification(Base):
    """In-app notification for admins and employees."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=True, index=True)
    type = Column(String(50), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    action_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        # Bell dropdown: unread notifications for this admin
        Index("ix_notif_admin_unread", "admin_id", "is_read"),
        # Employee portal notifications
        Index("ix_notif_emp_unread", "employee_id", "is_read"),
    )
