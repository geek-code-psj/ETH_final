from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date, datetime
import io, csv
from core.database import get_db
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from services.attendance_service import attendance_service
from services.employee_service import employee_service
from schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceListResponse, AttendanceResponse
from utils import log_audit, get_or_create_settings, calc_late

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance"])

@router.get("", response_model=AttendanceListResponse)
def list_attendance(
    skip: int = Query(0, ge=0), 
    limit: int = Query(50, ge=1, le=1000),
    employee_id: Optional[int] = None, 
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db), 
    current_admin=Depends(get_current_user)
):
    records, total = attendance_service.get_records(
        db, employee_id=employee_id, date_from=date_from, 
        date_to=date_to, skip=skip, limit=limit
    )
    total_pages = max(1, -(-total // limit))
    
    # Enrichment for response
    result = []
    for r in records:
        emp = employee_service.get_employee_by_id(db, r.employee_id)
        result.append(AttendanceResponse(
            **{c.name: getattr(r, c.name) for c in r.__table__.columns},
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_department=emp.department.value if emp else None,
        ))
        
    return {
        "total": total,
        "page": (skip // limit) + 1,
        "limit": limit,
        "total_pages": total_pages,
        "records": result
    }

@router.post("", response_model=AttendanceResponse, status_code=201)
def create_attendance(
    payload: AttendanceCreate, 
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager]))
):
    emp = employee_service.get_employee_by_id(db, payload.employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found")
        
    record = attendance_service.log_attendance(db, payload)
    log_audit(db, current_admin, "CREATE", "attendance", record.id, {"employee_id": payload.employee_id, "date": str(payload.date)})
    
    return AttendanceResponse(
        **{c.name: getattr(record, c.name) for c in record.__table__.columns},
        employee_name=f"{emp.first_name} {emp.last_name}",
        employee_department=emp.department.value,
    )

@router.put("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance(
    attendance_id: int, 
    payload: AttendanceUpdate,
    db: Session = Depends(get_db), 
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager]))
):
    record = attendance_service.update_attendance(db, attendance_id, payload)
    if not record:
        raise HTTPException(404, "Attendance record not found")
        
    emp = employee_service.get_employee_by_id(db, record.employee_id)
    log_audit(db, current_admin, "UPDATE", "attendance", attendance_id)
    
    return AttendanceResponse(
        **{c.name: getattr(record, c.name) for c in record.__table__.columns},
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_department=emp.department.value if emp else None,
    )

@router.delete("/{attendance_id}", status_code=204)
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.super_admin]))
):
    # This logic can also be moved to service, but keeping it thin for now
    from models.attendance import Attendance
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(404, "Attendance record not found")
    db.delete(record)
    db.commit()
    log_audit(db, current_admin, "DELETE", "attendance", attendance_id)


# ─── Additional Endpoints ─────────────────────────────────────────────────────

@router.get("/today", summary="Get today's attendance for all employees")
def get_today_attendance(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    """Get attendance records for today."""
    today = date.today()
    records, total = attendance_service.get_records(
        db, date_from=today, date_to=today
    )

    result = []
    for r in records:
        emp = employee_service.get_employee_by_id(db, r.employee_id)
        result.append({
            "id": r.id,
            "employee_id": r.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
            "department": emp.department.value if emp else None,
            "date": str(r.date),
            "check_in": r.check_in.isoformat() if r.check_in else None,
            "check_out": r.check_out.isoformat() if r.check_out else None,
            "status": r.status.value if r.status else None,
            "hours_worked": float(r.hours_worked) if r.hours_worked else None,
            "is_late": r.is_late,
            "late_minutes": r.late_minutes,
        })

    return {"total": total, "date": str(today), "records": result}


@router.post("/bulk", summary="Bulk create attendance records")
def bulk_create_attendance(
    payload: dict,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager]))
):
    """Create multiple attendance records in one request."""
    records = payload.get("records", [])
    if not records:
        raise HTTPException(400, "No records provided")

    if len(records) > 500:
        raise HTTPException(400, "Maximum 500 records per bulk request")

    results = []
    errors = []

    for i, rec in enumerate(records):
        try:
            emp_id = rec.get("employee_id")
            if not emp_id:
                errors.append({"index": i, "error": "employee_id required"})
                continue

            emp = employee_service.get_employee_by_id(db, emp_id)
            if not emp:
                errors.append({"index": i, "error": f"Employee {emp_id} not found"})
                continue

            record = attendance_service.log_attendance(db, rec)
            results.append({"index": i, "id": record.id, "status": "created"})
        except Exception as e:
            errors.append({"index": i, "error": str(e)})

    log_audit(db, current_admin, "CREATE", "attendance", "bulk", {"count": len(results)})

    return {
        "created": len(results),
        "errors": len(errors),
        "results": results,
        "error_details": errors
    }


@router.get("/export", summary="Export attendance to CSV")
def export_attendance(
    date_from: Optional[date] = Query(None, description="Start date"),
    date_to: Optional[date] = Query(None, description="End date"),
    employee_id: Optional[int] = Query(None, description="Filter by employee"),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    """Export attendance records as CSV."""
    records, total = attendance_service.get_records(
        db, employee_id=employee_id, date_from=date_from,
        date_to=date_to, skip=0, limit=10000
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Employee ID", "Employee Name", "Department",
        "Date", "Check In", "Check Out", "Status",
        "Hours Worked", "Is Late", "Late Minutes", "Notes"
    ])

    for r in records:
        emp = employee_service.get_employee_by_id(db, r.employee_id)
        writer.writerow([
            r.id,
            r.employee_id,
            f"{emp.first_name} {emp.last_name}" if emp else "",
            emp.department.value if emp else "",
            r.date,
            r.check_in.isoformat() if r.check_in else "",
            r.check_out.isoformat() if r.check_out else "",
            r.status.value if r.status else "",
            r.hours_worked or "",
            r.is_late,
            r.late_minutes or "",
            r.notes or ""
        ])

    output.seek(0)
    log_audit(db, current_admin, "EXPORT", "attendance", "csv", {
        "date_from": str(date_from), "date_to": str(date_to)
    })

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{date_from}_{date_to}.csv"}
    )


@router.get("/monthly-summary", summary="Get monthly attendance summary")
def monthly_summary(
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    year: int = Query(..., ge=2020, le=2030, description="Year"),
    employee_id: Optional[int] = Query(None, description="Filter by employee"),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    """Get monthly summary statistics for attendance."""
    from datetime import date as date_type
    from calendar import monthrange

    _, days_in_month = monthrange(year, month)
    date_from = date_type(year, month, 1)
    date_to = date_type(year, month, days_in_month)

    records, total = attendance_service.get_records(
        db, employee_id=employee_id, date_from=date_from,
        date_to=date_to, skip=0, limit=10000
    )

    # Calculate summaries
    summary = {
        "total_records": total,
        "total_days": days_in_month,
        "present": 0,
        "absent": 0,
        "late": 0,
        "half_day": 0,
        "on_leave": 0,
        "total_hours": 0.0,
        "avg_hours_per_day": 0.0,
    }

    for r in records:
        if r.status:
            status = r.status.value.lower()
            if status == "present":
                summary["present"] += 1
            elif status == "absent":
                summary["absent"] += 1
            elif status == "late":
                summary["late"] += 1
            elif status == "half day":
                summary["half_day"] += 1
            elif status == "on leave":
                summary["on_leave"] += 1

        if r.hours_worked:
            summary["total_hours"] += float(r.hours_worked)

    if summary["present"] > 0:
        summary["avg_hours_per_day"] = round(summary["total_hours"] / summary["present"], 2)

    return {
        "month": month,
        "year": year,
        "summary": summary
    }
