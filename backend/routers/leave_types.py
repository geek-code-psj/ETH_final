from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from models.leave_types import LeaveType, LeaveBalance
from schemas.extras import LeaveTypeCreate, LeaveTypeResponse, LeaveBalanceResponse
from utils import log_audit

router = APIRouter(prefix="/api/v1/leave-types", tags=["Leave Types"])


@router.get("", response_model=list[LeaveTypeResponse])
def list_leave_types(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    return db.query(LeaveType).filter(LeaveType.is_active == True).all()


@router.post("", response_model=LeaveTypeResponse, status_code=201)
def create_leave_type(
    payload: LeaveTypeCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.super_admin]))
):
    existing = db.query(LeaveType).filter(LeaveType.code == payload.code).first()
    if existing:
        raise HTTPException(400, f"Leave type with code '{payload.code}' already exists")
    lt = LeaveType(**payload.model_dump())
    db.add(lt)
    db.commit()
    db.refresh(lt)
    log_audit(db, current_admin, "CREATE", "leave_type", lt.id, {"name": lt.name})
    return lt


@router.put("/{leave_type_id}", response_model=LeaveTypeResponse)
def update_leave_type(
    leave_type_id: int,
    payload: LeaveTypeCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.super_admin]))
):
    lt = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not lt:
        raise HTTPException(404, "Leave type not found")
    for k, v in payload.model_dump().items():
        setattr(lt, k, v)
    db.commit()
    db.refresh(lt)
    return lt


@router.delete("/{leave_type_id}", status_code=204)
def deactivate_leave_type(
    leave_type_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.super_admin]))
):
    lt = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not lt:
        raise HTTPException(404, "Leave type not found")
    lt.is_active = False
    db.commit()


@router.get("/balances/{employee_id}", response_model=list[LeaveBalanceResponse])
def get_employee_balances(
    employee_id: int,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    from datetime import date
    if not year:
        year = date.today().year
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.year == year
    ).all()
    result = []
    for b in balances:
        lt = db.query(LeaveType).filter(LeaveType.id == b.leave_type_id).first()
        result.append(LeaveBalanceResponse(
            **{c.name: getattr(b, c.name) for c in b.__table__.columns},
            leave_type_name=lt.name if lt else None,
            leave_type_code=lt.code if lt else None
        ))
    return result


@router.post("/allocate")
def allocate_leave(
    payload: dict,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager, AdminRoleEnum.super_admin]))
):
    """Allocate leave balance for an employee for a given year."""
    from datetime import date
    employee_id = payload.get("employee_id")
    leave_type_id = payload.get("leave_type_id")
    year = payload.get("year", date.today().year)
    days = payload.get("days", 0)

    lt = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not lt:
        raise HTTPException(404, "Leave type not found")

    existing = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.leave_type_id == leave_type_id,
        LeaveBalance.year == year
    ).first()

    if existing:
        existing.allocated = days
        existing.remaining = max(0, float(days) - float(existing.used))
    else:
        balance = LeaveBalance(
            employee_id=employee_id,
            leave_type_id=leave_type_id,
            year=year,
            allocated=days,
            remaining=days
        )
        db.add(balance)

    db.commit()
    return {"message": "Leave balance allocated"}
