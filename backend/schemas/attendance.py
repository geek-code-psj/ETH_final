from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from models.enums import AttendanceStatusEnum

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
