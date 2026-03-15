from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
import io, csv
from core.database import get_db
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from services.attendance_service import attendance_service
from services.employee_service import employee_service
from schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceListResponse, AttendanceResponse
from utils import log_audit, get_or_create_settings

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance"])

@router.get("", response_model=AttendanceListResponse)
def list_attendance(
    skip: int = Query(0, ge=0), 
    limit: int = Query(50, ge=1, le=200),
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
