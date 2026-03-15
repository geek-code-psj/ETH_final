from sqlalchemy import Column, Integer, ForeignKey, String, Enum, Text, DateTime, Index
from sqlalchemy.sql import func
from core.database import Base
from models.enums import AuditActionEnum


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admin_users.id"), nullable=True, index=True)
    admin_email = Column(String(255), index=True)
    action = Column(Enum(AuditActionEnum), nullable=False, index=True)
    resource = Column(String(100), index=True)
    resource_id = Column(String(50))
    details = Column(Text)
    ip_address = Column(String(45))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        # Find all actions by a specific user quickly
        Index("ix_audit_email_action", "admin_email", "action"),
        # Find all logs for a specific resource/entity
        Index("ix_audit_resource_id", "resource", "resource_id"),
    )
