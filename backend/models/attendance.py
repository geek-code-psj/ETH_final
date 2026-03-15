from sqlalchemy import Column, Integer, ForeignKey, Date, DateTime, Enum, Text, Numeric, Boolean, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base
from models.enums import AttendanceStatusEnum

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    check_in = Column(DateTime(timezone=True))
    check_out = Column(DateTime(timezone=True))
    status = Column(Enum(AttendanceStatusEnum), default=AttendanceStatusEnum.present)
    notes = Column(Text)
    hours_worked = Column(Numeric(4, 2))
    is_late = Column(Boolean, default=False)
    late_minutes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    employee = relationship("Employee", back_populates="attendance_records")

    __table_args__ = (
        Index("ix_attendance_emp_date", "employee_id", "date"),
    )
