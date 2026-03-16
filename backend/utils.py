import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.logger import logger, log_db_error, log_employee_action

from models.employee import Employee
from models.audit import AuditLog
from models.settings import CompanySettings


def generate_employee_id(db: Session) -> str:
    count = db.query(func.count(Employee.id)).scalar()
    return f"EMP{str(count + 1).zfill(4)}"


def paginate(skip: int, limit: int, total: int):
    page = (skip // limit) + 1
    total_pages = max(1, -(-total // limit))
    return page, total_pages


def log_audit(db: Session, admin, action: str, resource: str, resource_id: str, details: dict = None):
    try:
        log = AuditLog(
            admin_id=admin.id if admin else None,
            admin_email=admin.email if admin else "system",
            action=action.upper(),
            resource=resource,
            resource_id=str(resource_id),
            details=json.dumps(details) if details else None,
        )
        db.add(log)
        db.commit()
        logger.info(
            "audit_logged",
            action=action,
            resource=resource,
            resource_id=str(resource_id),
            by=admin.email if admin else "system"
        )
    except Exception as e:
        db.rollback()
        log_db_error("log_audit", e, resource=resource, resource_id=str(resource_id))


def get_or_create_settings(db: Session) -> CompanySettings:
    s = db.query(CompanySettings).first()
    if not s:
        s = CompanySettings()
        db.add(s)
        db.commit()
        db.refresh(s)
        logger.info("company_settings_created")
    return s


def calc_late(check_in: datetime, work_start: str, threshold: int) -> tuple[bool, int]:
    if not check_in:
        return False, 0
    try:
        h, m = map(int, work_start.split(":"))
        work_start_dt = check_in.replace(hour=h, minute=m, second=0, microsecond=0)
        diff = (check_in - work_start_dt).total_seconds() / 60
        if diff > threshold:
            return True, int(diff)
    except Exception as e:
        log_db_error("calc_late", e, check_in=str(check_in))
    return False, 0


def enrich_employee(emp: Employee, db: Session) -> dict:
    d = {c.name: getattr(emp, c.name) for c in emp.__table__.columns}
    manager = db.query(Employee).filter(Employee.id == emp.manager_id).first() if emp.manager_id else None
    d["manager_name"] = f"{manager.first_name} {manager.last_name}" if manager else None
    d["direct_reports_count"] = db.query(func.count(Employee.id)).filter(Employee.manager_id == emp.id).scalar()
    return d

