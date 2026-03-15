from pydantic import BaseModel
from typing import Optional, List
from schemas.employee import EmployeeResponse

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
