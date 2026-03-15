from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from core.database import get_db
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from services.leave_service import leave_service
from services.employee_service import employee_service
from schemas.leave import LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestResponse
from core.email import send_email_notification

router = APIRouter(prefix="/api/v1/leave", tags=["Leave"])

@router.get("", response_model=list[LeaveRequestResponse])
def list_leave_requests(
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    requests = leave_service.list_requests(db, employee_id)
    result = []
    for r in requests:
        emp = employee_service.get_employee_by_id(db, r.employee_id)
        result.append(LeaveRequestResponse(
            **{c.name: getattr(r, c.name) for c in r.__table__.columns},
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else "Unknown"
        ))
    return result

@router.post("", response_model=LeaveRequestResponse, status_code=201)
def create_leave_request(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager]))
):
    emp = employee_service.get_employee_by_id(db, payload.employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found")
        
    request = leave_service.create_request(db, payload)
    from utils import log_audit
    log_audit(db, current_admin, "CREATE", "leave_request", request.id, {"employee_id": payload.employee_id})
    
    if emp.email:
        send_email_notification(
            to_email=emp.email,
            subject="Leave Request Created",
            body=f"Hello {emp.first_name},\nYour leave request for {payload.start_date} to {payload.end_date} has been submitted successfully."
        )
    
    return LeaveRequestResponse(
        **{c.name: getattr(request, c.name) for c in request.__table__.columns},
        employee_name=f"{emp.first_name} {emp.last_name}"
    )

@router.put("/{request_id}", response_model=LeaveRequestResponse)
def update_leave_status(
    request_id: int,
    payload: LeaveRequestUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager]))
):
    updated = leave_service.update_request(db, request_id, payload)
    if not updated:
        raise HTTPException(404, "Leave request not found")
        
    emp = employee_service.get_employee_by_id(db, updated.employee_id)
    from utils import log_audit
    log_audit(db, current_admin, "UPDATE", "leave_request", request_id, {"status": payload.status})
    
    if emp and emp.email:
        send_email_notification(
            to_email=emp.email,
            subject=f"Leave Request {payload.status.capitalize()}",
            body=f"Hello {emp.first_name},\nYour leave request has been marked as {payload.status}."
        )
    
    return LeaveRequestResponse(
        **{c.name: getattr(updated, c.name) for c in updated.__table__.columns},
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else "Unknown"
    )
