from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import Optional
from core.database import get_db
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from services.employee_service import employee_service
from schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeListResponse, EmployeeResponse
from utils import log_audit

router = APIRouter(prefix="/api/v1/employees", tags=["Employees"])

@router.get("", response_model=EmployeeListResponse)
def list_employees(
    skip: int = Query(0, ge=0), 
    limit: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None, 
    department: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_admin=Depends(get_current_user)
):
    employees, total = employee_service.get_employees(
        db, skip=skip, limit=limit, search=search, 
        department=department, status=status
    )
    total_pages = max(1, -(-total // limit))
    return {
        "total": total,
        "page": (skip // limit) + 1,
        "limit": limit,
        "total_pages": total_pages,
        "employees": employees
    }

@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int, 
    db: Session = Depends(get_db), 
    current_admin=Depends(get_current_user)
):
    emp = employee_service.get_employee_by_id(db, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found")
    return emp

@router.post("", response_model=EmployeeResponse, status_code=201)
def create_employee(
    payload: EmployeeCreate, 
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager]))
):
    emp = employee_service.create_employee(db, payload)
    log_audit(db, current_admin, "CREATE", "employee", emp.id, {"name": f"{emp.first_name} {emp.last_name}"})
    return emp

@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int, 
    payload: EmployeeUpdate,
    db: Session = Depends(get_db), 
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager]))
):
    emp = employee_service.get_employee_by_id(db, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found")
    
    updated_emp = employee_service.update_employee(db, emp, payload)
    log_audit(db, current_admin, "UPDATE", "employee", employee_id, payload.model_dump(exclude_unset=True))
    return updated_emp

@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: int, 
    db: Session = Depends(get_db), 
    current_admin=Depends(require_role([AdminRoleEnum.super_admin]))
):
    success = employee_service.delete_employee(db, employee_id)
    if not success:
        raise HTTPException(404, "Employee not found")
    log_audit(db, current_admin, "DELETE", "employee", employee_id)
