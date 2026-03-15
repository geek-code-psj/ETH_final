from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from models.employee import Employee
from models.attendance import Attendance
from models.leave import LeaveRequest
from models.enums import StatusEnum, AttendanceStatusEnum
from datetime import date, timedelta
from typing import Dict, Any, List

class DashboardService:
    @staticmethod
    def get_stats(db: Session) -> Dict[str, Any]:
        today = date.today()
        
        total_employees = db.query(func.count(Employee.id)).scalar()
        active_employees = db.query(func.count(Employee.id)).filter(Employee.status == StatusEnum.active).scalar()
        on_leave = db.query(func.count(Employee.id)).filter(Employee.status == StatusEnum.on_leave).scalar()
        
        attendance_today = db.query(Attendance).filter(Attendance.date == today).all()
        present_today = sum(1 for r in attendance_today if r.status in [AttendanceStatusEnum.present, AttendanceStatusEnum.late])
        late_today = sum(1 for r in attendance_today if r.status == AttendanceStatusEnum.late)
        absent_today = sum(1 for r in attendance_today if r.status == AttendanceStatusEnum.absent)
        
        # Dept breakdown
        dept_counts = db.query(Employee.department, func.count(Employee.id))\
                        .group_by(Employee.department).all()
        dept_breakdown = {d.value: count for d, count in dept_counts}
        
        # Recent hires
        recent_hires = db.query(Employee).order_by(Employee.hire_date.desc()).limit(5).all()
        
        return {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "on_leave": on_leave,
            "present_today": present_today,
            "absent_today": absent_today,
            "late_today": late_today,
            "attendance_rate": (present_today / active_employees * 100) if active_employees > 0 else 0,
            "department_breakdown": dept_breakdown,
            "recent_hires": recent_hires,
            "monthly_trend": [], # Placeholder for actual trend logic
            "recent_activity": [] # Placeholder for audit integration
        }

dashboard_service = DashboardService()
