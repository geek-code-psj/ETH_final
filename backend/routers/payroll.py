from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import io, csv

from core.database import get_db
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from models.payroll import SalaryStructure, PayrollRecord
from services.payroll_service import payroll_service
from schemas.payroll import (
    SalaryStructureCreate, SalaryStructureResponse,
    PayrollRecordResponse, PayrollGenerateRequest, PayslipData
)
from utils import log_audit
from core.email import send_email_notification

router = APIRouter(prefix="/api/v1/payroll", tags=["Payroll"])


@router.get("", response_model=list[PayrollRecordResponse])
def list_payroll(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020),
    employee_id: Optional[int] = None,
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    from models.employee import Employee
    q = db.query(PayrollRecord)
    if month: q = q.filter(PayrollRecord.month == month)
    if year: q = q.filter(PayrollRecord.year == year)
    if employee_id: q = q.filter(PayrollRecord.employee_id == employee_id)
    records = q.order_by(PayrollRecord.year.desc(), PayrollRecord.month.desc()).offset(skip).limit(limit).all()

    result = []
    for r in records:
        emp = db.query(Employee).filter(Employee.id == r.employee_id).first()
        result.append(PayrollRecordResponse(
            **{c.name: getattr(r, c.name) for c in r.__table__.columns},
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            employee_id_code=emp.employee_id if emp else "",
            department=emp.department.value if emp else "",
        ))
    return result


@router.post("/generate")
def generate_payroll(
    payload: PayrollGenerateRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.super_admin, AdminRoleEnum.admin]))
):
    records = payroll_service.generate_monthly_payroll(
        db, payload.month, payload.year, payload.bonus_override
    )
    log_audit(db, current_admin, "CREATE", "payroll", f"{payload.year}-{payload.month:02d}",
              {"month": payload.month, "year": payload.year, "count": len(records)})
    return {"message": f"Payroll generated for {payload.month}/{payload.year}", "count": len(records)}


@router.get("/{record_id}/payslip", response_model=PayslipData)
def get_payslip(
    record_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    return payroll_service.get_payslip(db, record_id)


@router.put("/{record_id}/status")
def update_payroll_status(
    record_id: int,
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.super_admin, AdminRoleEnum.admin]))
):
    record = db.query(PayrollRecord).filter(PayrollRecord.id == record_id).first()
    if not record:
        raise HTTPException(404, "Payroll record not found")
    record.status = payload.get("status", record.status)
    if payload.get("status") == "paid":
        from datetime import datetime
        record.paid_at = datetime.utcnow()
        
        # notify employee
        emp = record.employee
        if emp and emp.email:
            background_tasks.add_task(
                send_email_notification,
                to_email=emp.email,
                subject=f"Payroll Processed: {record.month}/{record.year}",
                body=f"Hello {emp.first_name},\nYour salary for {record.month}/{record.year} has been processed and paid out."
            )
            
    db.commit()
    return {"message": "Status updated"}


@router.get("/salary-structure/{employee_id}", response_model=SalaryStructureResponse)
def get_salary_structure(
    employee_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    struct = db.query(SalaryStructure).filter(SalaryStructure.employee_id == employee_id).first()
    if not struct:
        raise HTTPException(404, "No salary structure found")
    from models.employee import Employee
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    return SalaryStructureResponse(
        **{c.name: getattr(struct, c.name) for c in struct.__table__.columns},
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else ""
    )


@router.post("/salary-structure", response_model=SalaryStructureResponse)
def upsert_salary_structure(
    payload: SalaryStructureCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.super_admin]))
):
    struct = payroll_service.get_or_create_structure(db, payload)
    log_audit(db, current_admin, "UPDATE", "salary_structure", struct.employee_id, payload.model_dump())
    from models.employee import Employee
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    return SalaryStructureResponse(
        **{c.name: getattr(struct, c.name) for c in struct.__table__.columns},
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else ""
    )
