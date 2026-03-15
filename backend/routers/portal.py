"""
Employee Self-Service Portal Router.
All routes under /api/v1/portal/ use JWT auth (not Firebase).
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from core.database import get_db
from core.employee_auth import (
    get_current_employee, create_employee_token, create_refresh_token,
    decode_refresh_token, validate_password_strength
)
from core.security import get_current_user, require_role
from limiter import limiter
from models.enums import AdminRoleEnum, AuditActionEnum
from models.employee import Employee
from services.portal_service import portal_service
from services.attendance_service import attendance_service
from services.leave_service import leave_service
from schemas.portal import (
    EmployeeLoginRequest, EmployeeTokenResponse,
    EmployeePasswordChange, EmployeeProfileUpdate
)
from schemas.leave import LeaveRequestCreate

router = APIRouter(prefix="/api/v1/portal", tags=["Employee Portal"])


def _audit(db, email: str, action: str, resource: str, resource_id: str = None):
    """Create a lightweight audit log entry for employee portal actions."""
    from models.audit import AuditLog
    log = AuditLog(
        admin_email=email,          # re-use field to store employee email
        action=AuditActionEnum.login if action == "LOGIN" else AuditActionEnum.update,
        resource=resource,
        resource_id=str(resource_id) if resource_id else None
    )
    db.add(log)
    db.commit()


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=EmployeeTokenResponse)
@limiter.limit("5/minute")
def employee_login(request: Request, payload: EmployeeLoginRequest, db: Session = Depends(get_db)):
    result = portal_service.login(db, payload)
    # Attach refresh token
    refresh = create_refresh_token(result.employee_id)
    _audit(db, result.email, "LOGIN", "employee_portal", result.employee_id)
    return {**result.model_dump(), "refresh_token": refresh}


@router.post("/refresh")
@limiter.limit("10/minute")
def refresh_access_token(request: Request, payload: dict, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    token = payload.get("refresh_token")
    if not token:
        raise HTTPException(400, "refresh_token is required")
    data = decode_refresh_token(token)
    employee_id = int(data["sub"])

    from models.employee import Employee as EmpModel
    emp = db.query(EmpModel).filter(EmpModel.id == employee_id).first()
    if not emp:
        raise HTTPException(403, "Employee not found")

    new_token = create_employee_token(emp.id, emp.email)
    return {"access_token": new_token, "token_type": "bearer"}


# ── Admin: provision accounts ─────────────────────────────────────────────────

@router.post("/provision/{employee_id}", summary="Admin: Create portal account for employee")
def provision_employee(
    employee_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager]))
):
    password = payload.get("password")
    if not password:
        raise HTTPException(400, "Password is required")
    validate_password_strength(password)   # ← strong password enforcement

    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")

    portal_service.create_employee_account(db, employee_id, password)
    _audit(db, current_admin.email, "CREATE", "portal_account", employee_id)
    return {"message": f"Portal account created for {emp.first_name} {emp.last_name}"}


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/me")
def get_my_profile(current_employee: Employee = Depends(get_current_employee)):
    emp = current_employee
    return {
        "id": emp.id,
        "employee_id": emp.employee_id,
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "email": emp.email,
        "phone": emp.phone,
        "department": emp.department.value,
        "position": emp.position,
        "hire_date": str(emp.hire_date),
        "status": emp.status.value,
        "avatar_url": emp.avatar_url,
        "address": emp.address,
    }


@router.put("/me")
def update_my_profile(
    payload: EmployeeProfileUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    portal_service.update_profile(db, current_employee, payload)
    _audit(db, current_employee.email, "UPDATE", "employee_profile", current_employee.id)
    return {"message": "Profile updated successfully"}


@router.put("/change-password")
def change_password(
    payload: EmployeePasswordChange,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    validate_password_strength(payload.new_password)
    portal_service.change_password(
        db, current_employee.id,
        payload.current_password, payload.new_password
    )
    _audit(db, current_employee.email, "UPDATE", "employee_password", current_employee.id)
    return {"message": "Password changed successfully"}


# ── Attendance ────────────────────────────────────────────────────────────────

@router.get("/attendance")
def my_attendance(
    skip: int = 0,
    limit: int = 50,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    records, total = attendance_service.get_records(
        db, employee_id=current_employee.id, skip=skip, limit=limit
    )
    return {
        "total": total,
        "records": [
            {
                "id": r.id,
                "date": str(r.date),
                "check_in": r.check_in.isoformat() if r.check_in else None,
                "check_out": r.check_out.isoformat() if r.check_out else None,
                "status": r.status.value if r.status else None,
                "hours_worked": float(r.hours_worked) if r.hours_worked else None,
                "is_late": r.is_late,
                "late_minutes": r.late_minutes,
                "notes": r.notes,
            }
            for r in records
        ]
    }


# ── Leave ─────────────────────────────────────────────────────────────────────

@router.get("/leave")
def my_leave_requests(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    requests = leave_service.list_requests(db, employee_id=current_employee.id)
    return {
        "total": len(requests),
        "requests": [
            {
                "id": r.id,
                "leave_type": r.leave_type,
                "start_date": str(r.start_date),
                "end_date": str(r.end_date),
                "reason": r.reason,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in requests
        ]
    }


@router.post("/leave", status_code=201)
def submit_leave_request(
    payload: LeaveRequestCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    # Force employee_id to own id — prevents impersonation
    payload = payload.model_copy(update={"employee_id": current_employee.id})
    request = leave_service.create_request(db, payload)
    _audit(db, current_employee.email, "CREATE", "leave_request", request.id)
    return {"message": "Leave request submitted", "id": request.id, "status": request.status}


@router.get("/me")
def get_my_profile(current_employee: Employee = Depends(get_current_employee)):
    emp = current_employee
    return {
        "id": emp.id,
        "employee_id": emp.employee_id,
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "email": emp.email,
        "phone": emp.phone,
        "department": emp.department.value,
        "position": emp.position,
        "hire_date": str(emp.hire_date),
        "status": emp.status.value,
        "avatar_url": emp.avatar_url,
        "address": emp.address,
    }


@router.put("/me")
def update_my_profile(
    payload: EmployeeProfileUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    emp = portal_service.update_profile(db, current_employee, payload)
    return {"message": "Profile updated successfully"}


@router.put("/change-password")
def change_password(
    payload: EmployeePasswordChange,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    portal_service.change_password(
        db, current_employee.id,
        payload.current_password, payload.new_password
    )
    return {"message": "Password changed successfully"}


@router.get("/attendance")
def my_attendance(
    skip: int = 0,
    limit: int = 50,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    records, total = attendance_service.get_records(
        db, employee_id=current_employee.id, skip=skip, limit=limit
    )
    return {
        "total": total,
        "records": [
            {
                "id": r.id,
                "date": str(r.date),
                "check_in": r.check_in.isoformat() if r.check_in else None,
                "check_out": r.check_out.isoformat() if r.check_out else None,
                "status": r.status.value if r.status else None,
                "hours_worked": float(r.hours_worked) if r.hours_worked else None,
                "is_late": r.is_late,
                "late_minutes": r.late_minutes,
                "notes": r.notes,
            }
            for r in records
        ]
    }


@router.get("/leave")
def my_leave_requests(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    requests = leave_service.list_requests(db, employee_id=current_employee.id)
    return {
        "total": len(requests),
        "requests": [
            {
                "id": r.id,
                "leave_type": r.leave_type,
                "start_date": str(r.start_date),
                "end_date": str(r.end_date),
                "reason": r.reason,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in requests
        ]
    }


@router.post("/leave", status_code=201)
def submit_leave_request(
    payload: LeaveRequestCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    # Force employee_id to own id (no impersonation)
    payload = payload.model_copy(update={"employee_id": current_employee.id})
    request = leave_service.create_request(db, payload)
    return {"message": "Leave request submitted", "id": request.id, "status": request.status}
