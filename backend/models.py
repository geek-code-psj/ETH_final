from sqlalchemy import (
    Column, Integer, String, Date, DateTime, ForeignKey,
    Enum, Text, Numeric, Boolean, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class DepartmentEnum(str, enum.Enum):
    engineering = "Engineering"
    hr = "HR"
    finance = "Finance"
    marketing = "Marketing"
    operations = "Operations"
    sales = "Sales"
    design = "Design"
    legal = "Legal"


class StatusEnum(str, enum.Enum):
    active = "Active"
    inactive = "Inactive"
    on_leave = "On Leave"


class AttendanceStatusEnum(str, enum.Enum):
    present = "Present"
    absent = "Absent"
    late = "Late"
    half_day = "Half Day"
    on_leave = "On Leave"


class AdminRoleEnum(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    hr_manager = "hr_manager"
    viewer = "viewer"


class AuditActionEnum(str, enum.Enum):
    create = "CREATE"
    update = "UPDATE"
    delete = "DELETE"
    login = "LOGIN"
    export = "EXPORT"


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


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    leave_type = Column(String(50), nullable=False)  # sick, casual, earned, etc.
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    approved_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    employee = relationship("Employee", back_populates="leave_requests")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True)
    head_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String(128), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(200))
    role = Column(Enum(AdminRoleEnum), default=AdminRoleEnum.admin)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    admin_email = Column(String(255))
    action = Column(Enum(AuditActionEnum), nullable=False)
    resource = Column(String(100))   # "employee", "attendance", etc.
    resource_id = Column(String(50))
    details = Column(Text)           # JSON string of changes
    ip_address = Column(String(45))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class CompanySettings(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(200), default="My Company")
    company_email = Column(String(255))
    company_phone = Column(String(20))
    company_address = Column(Text)
    logo_url = Column(String(500))
    work_start_time = Column(String(10), default="09:00")  # HH:MM
    work_end_time = Column(String(10), default="18:00")
    late_threshold_minutes = Column(Integer, default=15)
    timezone = Column(String(50), default="Asia/Kolkata")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
