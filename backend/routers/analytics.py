from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date
from typing import Optional

from core.database import get_db
from core.security import get_current_user
from models.employee import Employee
from models.attendance import Attendance
from models.leave import LeaveRequest
from models.enums import StatusEnum, AttendanceStatusEnum

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


@router.get("/attendance-trend")
def attendance_trend(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    """Monthly attendance stats for the last N months."""
    today = date.today()
    result = []

    for i in range(months - 1, -1, -1):
        # Calculate month going back
        m = (today.month - i - 1) % 12 + 1
        y = today.year - ((today.month - i - 1 + 12) // 12 - 1 if (today.month - i - 1) < 0 else (i - today.month + 1) // 12)
        # Simpler approach
        from datetime import datetime
        target = datetime(today.year, today.month, 1)
        from dateutil.relativedelta import relativedelta
        try:
            target = target - relativedelta(months=i)
            m, y = target.month, target.year
        except Exception:
            pass

        present = db.query(func.count(Attendance.id)).filter(
            extract("month", Attendance.date) == m,
            extract("year", Attendance.date) == y,
            Attendance.status == AttendanceStatusEnum.present
        ).scalar()
        absent = db.query(func.count(Attendance.id)).filter(
            extract("month", Attendance.date) == m,
            extract("year", Attendance.date) == y,
            Attendance.status == AttendanceStatusEnum.absent
        ).scalar()
        late = db.query(func.count(Attendance.id)).filter(
            extract("month", Attendance.date) == m,
            extract("year", Attendance.date) == y,
            Attendance.status == AttendanceStatusEnum.late
        ).scalar()
        total = (present or 0) + (absent or 0) + (late or 0)
        result.append({
            "month": m,
            "year": y,
            "label": f"{['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]} {y}",
            "present": present or 0,
            "absent": absent or 0,
            "late": late or 0,
            "total": total,
            "rate": round(((present or 0) / total * 100) if total > 0 else 0, 1)
        })
    return {"trend": result}


@router.get("/hiring-trend")
def hiring_trend(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    """Number of new hires per month."""
    today = date.today()
    result = []
    for i in range(months - 1, -1, -1):
        from datetime import datetime
        from dateutil.relativedelta import relativedelta
        try:
            t = datetime(today.year, today.month, 1) - relativedelta(months=i)
            m, y = t.month, t.year
        except Exception:
            continue

        count = db.query(func.count(Employee.id)).filter(
            extract("month", Employee.hire_date) == m,
            extract("year", Employee.hire_date) == y,
        ).scalar()
        result.append({
            "month": m, "year": y,
            "label": f"{['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]} {y}",
            "count": count or 0
        })
    return {"hiring_trend": result}


@router.get("/leave-usage")
def leave_usage(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    """Approved leave requests grouped by type."""
    if not year:
        year = date.today().year
    q = db.query(
        LeaveRequest.leave_type,
        func.count(LeaveRequest.id)
    ).filter(
        LeaveRequest.status == "approved",
        extract("year", LeaveRequest.start_date) == year
    ).group_by(LeaveRequest.leave_type).all()

    return {
        "year": year,
        "leave_usage": [{"type": lt, "count": cnt} for lt, cnt in q]
    }


@router.get("/department-headcount")
def department_headcount(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    """Current headcount per department, active only."""
    rows = db.query(
        Employee.department, func.count(Employee.id)
    ).filter(
        Employee.status == StatusEnum.active
    ).group_by(Employee.department).all()

    return {
        "headcount": [{"department": d.value, "count": c} for d, c in rows]
    }
