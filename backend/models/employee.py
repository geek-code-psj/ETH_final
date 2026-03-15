from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, Text, Numeric, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base
from models.enums import DepartmentEnum, StatusEnum

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20))
    department = Column(Enum(DepartmentEnum), nullable=False, index=True)
    position = Column(String(100), nullable=False)
    role_permission = Column(String(100))
    salary = Column(Numeric(12, 2))
    hire_date = Column(Date, nullable=False, index=True)
    date_of_birth = Column(Date)
    address = Column(Text)
    status = Column(Enum(StatusEnum), default=StatusEnum.active, index=True)
    avatar_url = Column(String(500))
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    manager = relationship("Employee", remote_side=[id], backref="direct_reports")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_employees_dept_status", "department", "status"),
    )
