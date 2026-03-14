from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any
from datetime import date, datetime
from decimal import Decimal
from models import DepartmentEnum, StatusEnum, AttendanceStatusEnum, AdminRoleEnum


# ─── Employee ─────────────────────────────────────────────────────────────────

class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    department: DepartmentEnum
    position: str
    role_permission: Optional[str] = None
    salary: Optional[Decimal] = None
    hire_date: date
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    status: Optional[StatusEnum] = StatusEnum.active
    avatar_url: Optional[str] = None
    manager_id: Optional[int] = None

    @field_validator('first_name', 'last_name', 'position')
    @classmethod
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[DepartmentEnum] = None
    position: Optional[str] = None
    role_permission: Optional[str] = None
    salary: Optional[Decimal] = None
    hire_date: Optional[date] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    status: Optional[StatusEnum] = None
    avatar_url: Optional[str] = None
    manager_id: Optional[int] = None


class EmployeeResponse(EmployeeBase):
    id: int
    employee_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    manager_name: Optional[str] = None
    direct_reports_count: Optional[int] = 0

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    employees: List[EmployeeResponse]


# ─── Attendance ───────────────────────────────────────────────────────────────

class AttendanceBase(BaseModel):
    employee_id: int
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: Optional[AttendanceStatusEnum] = AttendanceStatusEnum.present
    notes: Optional[str] = None
    hours_worked: Optional[Decimal] = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: Optional[AttendanceStatusEnum] = None
    notes: Optional[str] = None
    hours_worked: Optional[Decimal] = None


class AttendanceResponse(AttendanceBase):
    id: int
    created_at: Optional[datetime] = None
    employee_name: Optional[str] = None
    employee_department: Optional[str] = None
    is_late: Optional[bool] = False
    late_minutes: Optional[int] = 0

    class Config:
        from_attributes = True


class AttendanceListResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    records: List[AttendanceResponse]


class MonthlySummary(BaseModel):
    employee_id: int
    employee_name: str
    month: int
    year: int
    present: int
    absent: int
    late: int
    half_day: int
    on_leave: int
    total_hours: float
    attendance_rate: float


# ─── Leave ────────────────────────────────────────────────────────────────────

class LeaveRequestCreate(BaseModel):
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None


class LeaveRequestUpdate(BaseModel):
    status: str  # approved / rejected
    approved_by: Optional[int] = None


class LeaveRequestResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Department ───────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str
    code: Optional[str] = None
    head_employee_id: Optional[int] = None
    description: Optional[str] = None


class DepartmentResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    head_employee_id: Optional[int] = None
    description: Optional[str] = None
    is_active: bool
    employee_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_employees: int
    active_employees: int
    on_leave: int
    present_today: int
    absent_today: int
    late_today: int
    attendance_rate: float
    department_breakdown: dict
    recent_hires: List[EmployeeResponse]
    monthly_trend: List[dict]
    recent_activity: List[dict]


# ─── Audit Log ────────────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id: int
    admin_email: Optional[str] = None
    action: str
    resource: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Company Settings ─────────────────────────────────────────────────────────

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    company_address: Optional[str] = None
    logo_url: Optional[str] = None
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    late_threshold_minutes: Optional[int] = None
    timezone: Optional[str] = None


class CompanySettingsResponse(CompanySettingsUpdate):
    id: int

    class Config:
        from_attributes = True


# ─── Admin ────────────────────────────────────────────────────────────────────

class AdminCreate(BaseModel):
    firebase_uid: str
    email: EmailStr
    name: Optional[str] = None


class AdminResponse(BaseModel):
    id: int
    firebase_uid: str
    email: str
    name: Optional[str]
    role: str
    is_active: bool

    class Config:
        from_attributes = True


# ─── Pagination Metadata ──────────────────────────────────────────────────────

class PaginationMeta(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool
