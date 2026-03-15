from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from services.department_service import department_service
from schemas.department import DepartmentCreate, DepartmentResponse

router = APIRouter(prefix="/api/v1/departments", tags=["Departments"])

@router.get("")
def list_departments(db: Session = Depends(get_db), current_admin=Depends(get_current_user)):
    depts = department_service.list_departments(db)
    return {"total": len(depts), "departments": depts}

@router.post("", response_model=DepartmentResponse, status_code=201)
def create_department(
    payload: DepartmentCreate, 
    db: Session = Depends(get_db), 
    current_admin=Depends(require_role([AdminRoleEnum.admin]))
):
    # Search for existing department
    from models.department import Department
    if db.query(Department).filter(Department.name == payload.name).first():
        pass # Service could handle this, but keeping it simple for now
        
    dept = department_service.create_department(db, payload)
    from utils import log_audit
    log_audit(db, current_admin, "CREATE", "department", dept.id, {"name": payload.name})
    return dept

@router.delete("/{dept_id}", status_code=204)
def delete_department(
    dept_id: int, 
    db: Session = Depends(get_db), 
    current_admin=Depends(require_role([AdminRoleEnum.super_admin]))
):
    success = department_service.delete_department(db, dept_id)
    if not success:
        raise HTTPException(404, "Department not found")
    from utils import log_audit
    log_audit(db, current_admin, "DELETE", "department", dept_id, {})

@router.put("/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: int,
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin]))
):
    dept = department_service.update_department(db, dept_id, payload)
    if not dept:
        raise HTTPException(404, "Department not found")
    from utils import log_audit
    log_audit(db, current_admin, "UPDATE", "department", dept_id, {"name": payload.name})
    # Return with employee_count
    from sqlalchemy import func
    from models.employee import Employee
    count = db.query(func.count(Employee.id)).filter(Employee.department == dept.name).scalar()
    return DepartmentResponse(
        id=dept.id, name=dept.name, code=dept.code,
        head_employee_id=dept.head_employee_id,
        description=dept.description,
        is_active=dept.is_active,
        employee_count=count
    )

