from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Numeric, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class LeaveType(Base):
    """Defines leave types available in the company (Sick, Casual, Earned, etc.)."""
    __tablename__ = "leave_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)   # "Sick Leave"
    code = Column(String(20), unique=True, nullable=False)    # "SL"
    days_per_year = Column(Numeric(5, 1), default=0)
    carry_forward = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    color = Column(String(10), default="#7c6af7")              # hex for UI badge
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    balances = relationship("LeaveBalance", back_populates="leave_type")


class LeaveBalance(Base):
    """Tracks annual leave balance per employee per leave type."""
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    allocated = Column(Numeric(5, 1), default=0)    # total allocated for the year
    used = Column(Numeric(5, 1), default=0)
    pending = Column(Numeric(5, 1), default=0)      # pending approval
    remaining = Column(Numeric(5, 1), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    employee = relationship("Employee", backref="leave_balances")
    leave_type = relationship("LeaveType", back_populates="balances")
