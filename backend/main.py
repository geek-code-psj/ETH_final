import os, json, io, csv
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from fastapi import FastAPI, Depends, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from typing import Optional, List
from datetime import date, datetime, timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import structlog
import models, schemas
from database import engine, get_db
from auth import init_firebase, get_current_admin
from dotenv import load_dotenv

load_dotenv()

# ─── Logging ──────────────────────────────────────────────────────────────────
structlog.configure(
    processors=[structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.JSONRenderer()],
)
logger = structlog.get_logger()

# ─── Rate Limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ─── App ──────────────────────────────────────────────────────────────────────
# ─── Sentry ───────────────────────────────────────────────────────────────────
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.2,
        environment=os.getenv("ENVIRONMENT", "production"),
    )

models.Base.metadata.create_all(bind=engine)
init_firebase()

app = FastAPI(title="HRMS API v2", version="2.0.0", docs_url="/docs")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def generate_employee_id(db: Session) -> str:
    count = db.query(func.count(models.Employee.id)).scalar()
    return f"EMP{str(count + 1).zfill(4)}"


def paginate(skip: int, limit: int, total: int):
    page = (skip // limit) + 1
    total_pages = max(1, -(-total // limit))
    return page, total_pages


def log_audit(db: Session, admin, action: str, resource: str, resource_id: str, details: dict = None):
    try:
        log = models.AuditLog(
            admin_id=admin.id if admin else None,
            admin_email=admin.email if admin else "system",
            action=action,
            resource=resource,
            resource_id=str(resource_id),
            details=json.dumps(details) if details else None,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error("audit_log_failed", error=str(e))


def get_or_create_settings(db: Session) -> models.CompanySettings:
    s = db.query(models.CompanySettings).first()
    if not s:
        s = models.CompanySettings()
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def calc_late(check_in: datetime, work_start: str, threshold: int) -> tuple[bool, int]:
    if not check_in:
        return False, 0
    h, m = map(int, work_start.split(":"))
    work_start_dt = check_in.replace(hour=h, minute=m, second=0, microsecond=0)
    diff = (check_in - work_start_dt).total_seconds() / 60
    if diff > threshold:
        return True, int(diff)
    return False, 0


def enrich_employee(emp: models.Employee, db: Session) -> dict:
    d = {c.name: getattr(emp, c.name) for c in emp.__table__.columns}
    manager = db.query(models.Employee).filter(models.Employee.id == emp.manager_id).first() if emp.manager_id else None
    d["manager_name"] = f"{manager.first_name} {manager.last_name}" if manager else None
    d["direct_reports_count"] = db.query(func.count(models.Employee.id)).filter(models.Employee.manager_id == emp.id).scalar()
    return d


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat(), "version": "2.0.0"}


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/v1/auth/register", response_model=schemas.AdminResponse)
def register_admin(payload: schemas.AdminCreate, db: Session = Depends(get_db)):
    existing = db.query(models.AdminUser).filter(models.AdminUser.firebase_uid == payload.firebase_uid).first()
    if existing:
        existing.last_login = datetime.utcnow()
        db.commit()
        return existing
    admin = models.AdminUser(firebase_uid=payload.firebase_uid, email=payload.email, name=payload.name)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@app.get("/api/v1/auth/me", response_model=schemas.AdminResponse)
def get_me(current_admin=Depends(get_current_admin)):
    return current_admin


# ─── Dashboard ────────────────────────────────────────────────────────────────

@app.get("/api/v1/dashboard", response_model=schemas.DashboardStats)
@limiter.limit("60/minute")
def get_dashboard(request: Request, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    today = date.today()
    total_employees = db.query(func.count(models.Employee.id)).scalar()
    active_employees = db.query(func.count(models.Employee.id)).filter(models.Employee.status == models.StatusEnum.active).scalar()
    on_leave = db.query(func.count(models.Employee.id)).filter(models.Employee.status == models.StatusEnum.on_leave).scalar()

    today_records = db.query(models.Attendance).filter(models.Attendance.date == today).all()
    present_today = sum(1 for r in today_records if r.status == models.AttendanceStatusEnum.present)
    absent_today = sum(1 for r in today_records if r.status == models.AttendanceStatusEnum.absent)
    late_today = sum(1 for r in today_records if r.status == models.AttendanceStatusEnum.late)
    attendance_rate = round((present_today / active_employees * 100) if active_employees > 0 else 0, 1)

    dept_rows = db.query(models.Employee.department, func.count(models.Employee.id)).filter(
        models.Employee.status == models.StatusEnum.active
    ).group_by(models.Employee.department).all()
    department_breakdown = {str(d.value): c for d, c in dept_rows}

    recent_hires_raw = db.query(models.Employee).order_by(models.Employee.created_at.desc()).limit(5).all()
    recent_hires = [schemas.EmployeeResponse(**enrich_employee(e, db)) for e in recent_hires_raw]

    # Monthly attendance trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        d = today.replace(day=1) - timedelta(days=i * 28)
        month_present = db.query(func.count(models.Attendance.id)).filter(
            extract('month', models.Attendance.date) == d.month,
            extract('year', models.Attendance.date) == d.year,
            models.Attendance.status == models.AttendanceStatusEnum.present
        ).scalar()
        month_total = db.query(func.count(models.Attendance.id)).filter(
            extract('month', models.Attendance.date) == d.month,
            extract('year', models.Attendance.date) == d.year,
        ).scalar()
        monthly_trend.append({
            "month": d.strftime("%b"),
            "year": d.year,
            "present": month_present,
            "total": month_total,
            "rate": round((month_present / month_total * 100) if month_total > 0 else 0, 1)
        })

    # Recent activity from audit log
    audit_rows = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(10).all()
    recent_activity = [{"id": a.id, "action": a.action, "resource": a.resource,
                        "admin_email": a.admin_email, "details": a.details,
                        "created_at": a.created_at.isoformat() if a.created_at else None} for a in audit_rows]

    return schemas.DashboardStats(
        total_employees=total_employees, active_employees=active_employees,
        on_leave=on_leave, present_today=present_today, absent_today=absent_today,
        late_today=late_today, attendance_rate=attendance_rate,
        department_breakdown=department_breakdown, recent_hires=recent_hires,
        monthly_trend=monthly_trend, recent_activity=recent_activity,
    )


# ─── Employees ────────────────────────────────────────────────────────────────

@app.get("/api/v1/employees", response_model=schemas.EmployeeListResponse)
@limiter.limit("100/minute")
def list_employees(
    request: Request,
    skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None, department: Optional[str] = None,
    status: Optional[str] = None, sort_by: Optional[str] = "created_at",
    sort_dir: Optional[str] = "desc",
    db: Session = Depends(get_db), current_admin=Depends(get_current_admin)
):
    q = db.query(models.Employee)
    if search:
        t = f"%{search}%"
        q = q.filter(
            (models.Employee.first_name.ilike(t)) | (models.Employee.last_name.ilike(t)) |
            (models.Employee.email.ilike(t)) | (models.Employee.employee_id.ilike(t)) |
            (models.Employee.position.ilike(t))
        )
    if department:
        q = q.filter(models.Employee.department == department)
    if status:
        q = q.filter(models.Employee.status == status)

    SORT_MAP = {
        "name": models.Employee.first_name, "email": models.Employee.email,
        "department": models.Employee.department, "hire_date": models.Employee.hire_date,
        "salary": models.Employee.salary, "created_at": models.Employee.created_at,
        "status": models.Employee.status,
    }
    sort_col = SORT_MAP.get(sort_by, models.Employee.created_at)
    q = q.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    total = q.count()
    employees = q.offset(skip).limit(limit).all()
    page, total_pages = paginate(skip, limit, total)

    return schemas.EmployeeListResponse(
        total=total, page=page, limit=limit, total_pages=total_pages,
        employees=[schemas.EmployeeResponse(**enrich_employee(e, db)) for e in employees]
    )


@app.get("/api/v1/employees/{employee_id}", response_model=schemas.EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    return schemas.EmployeeResponse(**enrich_employee(emp, db))


@app.post("/api/v1/employees", response_model=schemas.EmployeeResponse, status_code=201)
def create_employee(
    payload: schemas.EmployeeCreate, db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    if db.query(models.Employee).filter(models.Employee.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    emp = models.Employee(**payload.model_dump(), employee_id=generate_employee_id(db))
    db.add(emp)
    db.commit()
    db.refresh(emp)
    log_audit(db, current_admin, "CREATE", "employee", emp.id, {"name": f"{emp.first_name} {emp.last_name}"})
    return schemas.EmployeeResponse(**enrich_employee(emp, db))


@app.put("/api/v1/employees/{employee_id}", response_model=schemas.EmployeeResponse)
def update_employee(
    employee_id: int, payload: schemas.EmployeeUpdate,
    db: Session = Depends(get_db), current_admin=Depends(get_current_admin)
):
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(emp, k, v)
    db.commit()
    db.refresh(emp)
    log_audit(db, current_admin, "UPDATE", "employee", employee_id, update_data)
    return schemas.EmployeeResponse(**enrich_employee(emp, db))


@app.delete("/api/v1/employees/{employee_id}", status_code=204)
def delete_employee(
    employee_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)
):
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    name = f"{emp.first_name} {emp.last_name}"
    db.delete(emp)
    db.commit()
    log_audit(db, current_admin, "DELETE", "employee", employee_id, {"name": name})


# ─── Attendance ───────────────────────────────────────────────────────────────

@app.get("/api/v1/attendance", response_model=schemas.AttendanceListResponse)
def list_attendance(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    employee_id: Optional[int] = None, date_from: Optional[date] = None,
    date_to: Optional[date] = None, status: Optional[str] = None,
    sort_dir: Optional[str] = "desc",
    db: Session = Depends(get_db), current_admin=Depends(get_current_admin)
):
    q = db.query(models.Attendance)
    if employee_id: q = q.filter(models.Attendance.employee_id == employee_id)
    if date_from: q = q.filter(models.Attendance.date >= date_from)
    if date_to: q = q.filter(models.Attendance.date <= date_to)
    if status: q = q.filter(models.Attendance.status == status)
    q = q.order_by(models.Attendance.date.desc() if sort_dir == "desc" else models.Attendance.date.asc())

    total = q.count()
    records = q.offset(skip).limit(limit).all()
    page, total_pages = paginate(skip, limit, total)

    result = []
    for r in records:
        emp = db.query(models.Employee).filter(models.Employee.id == r.employee_id).first()
        result.append(schemas.AttendanceResponse(
            **{c.name: getattr(r, c.name) for c in r.__table__.columns},
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
            employee_department=emp.department.value if emp else None,
        ))
    return schemas.AttendanceListResponse(total=total, page=page, limit=limit, total_pages=total_pages, records=result)


@app.get("/api/v1/attendance/today")
def get_today_attendance(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    today = date.today()
    records = db.query(models.Attendance).filter(models.Attendance.date == today).all()
    result = []
    for r in records:
        emp = db.query(models.Employee).filter(models.Employee.id == r.employee_id).first()
        result.append({
            "id": r.id, "employee_id": r.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            "employee_department": emp.department.value if emp else None,
            "date": str(r.date),
            "check_in": r.check_in.isoformat() if r.check_in else None,
            "check_out": r.check_out.isoformat() if r.check_out else None,
            "status": r.status.value if r.status else None,
            "hours_worked": float(r.hours_worked) if r.hours_worked else None,
            "is_late": r.is_late, "late_minutes": r.late_minutes, "notes": r.notes,
        })
    return {"date": str(today), "total": len(result), "records": result}


@app.get("/api/v1/attendance/monthly-summary")
def monthly_summary(
    month: int = Query(..., ge=1, le=12), year: int = Query(..., ge=2020),
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db), current_admin=Depends(get_current_admin)
):
    q = db.query(models.Employee).filter(models.Employee.status == models.StatusEnum.active)
    if employee_id:
        q = q.filter(models.Employee.id == employee_id)
    employees = q.all()

    result = []
    for emp in employees:
        records = db.query(models.Attendance).filter(
            models.Attendance.employee_id == emp.id,
            extract('month', models.Attendance.date) == month,
            extract('year', models.Attendance.date) == year,
        ).all()
        total_hours = sum(float(r.hours_worked) for r in records if r.hours_worked)
        working_days = len(records)
        present = sum(1 for r in records if r.status == models.AttendanceStatusEnum.present)
        result.append({
            "employee_id": emp.id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "employee_id_code": emp.employee_id,
            "department": emp.department.value,
            "present": present,
            "absent": sum(1 for r in records if r.status == models.AttendanceStatusEnum.absent),
            "late": sum(1 for r in records if r.status == models.AttendanceStatusEnum.late),
            "half_day": sum(1 for r in records if r.status == models.AttendanceStatusEnum.half_day),
            "on_leave": sum(1 for r in records if r.status == models.AttendanceStatusEnum.on_leave),
            "total_hours": round(total_hours, 1),
            "attendance_rate": round((present / working_days * 100) if working_days > 0 else 0, 1),
        })
    return {"month": month, "year": year, "summary": result}


@app.post("/api/v1/attendance", response_model=schemas.AttendanceResponse, status_code=201)
def create_attendance(
    payload: schemas.AttendanceCreate, db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    emp = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    existing = db.query(models.Attendance).filter(
        and_(models.Attendance.employee_id == payload.employee_id, models.Attendance.date == payload.date)
    ).first()
    if existing:
        raise HTTPException(400, "Attendance record already exists for this date")

    hours_worked = None
    if payload.check_in and payload.check_out:
        hours_worked = round((payload.check_out - payload.check_in).total_seconds() / 3600, 2)

    settings = get_or_create_settings(db)
    is_late, late_minutes = False, 0
    if payload.check_in and payload.status == models.AttendanceStatusEnum.present:
        is_late, late_minutes = calc_late(payload.check_in, settings.work_start_time, settings.late_threshold_minutes)
        if is_late and payload.status == models.AttendanceStatusEnum.present:
            payload = payload.model_copy(update={"status": models.AttendanceStatusEnum.late})

    record = models.Attendance(**payload.model_dump(), hours_worked=hours_worked, is_late=is_late, late_minutes=late_minutes)
    db.add(record)
    db.commit()
    db.refresh(record)
    log_audit(db, current_admin, "CREATE", "attendance", record.id, {"employee_id": payload.employee_id, "date": str(payload.date)})
    return schemas.AttendanceResponse(
        **{c.name: getattr(record, c.name) for c in record.__table__.columns},
        employee_name=f"{emp.first_name} {emp.last_name}",
        employee_department=emp.department.value,
    )


@app.put("/api/v1/attendance/{attendance_id}", response_model=schemas.AttendanceResponse)
def update_attendance(
    attendance_id: int, payload: schemas.AttendanceUpdate,
    db: Session = Depends(get_db), current_admin=Depends(get_current_admin)
):
    record = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(404, "Attendance record not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    if record.check_in and record.check_out:
        record.hours_worked = round((record.check_out - record.check_in).total_seconds() / 3600, 2)
    db.commit()
    db.refresh(record)
    emp = db.query(models.Employee).filter(models.Employee.id == record.employee_id).first()
    log_audit(db, current_admin, "UPDATE", "attendance", attendance_id, {})
    return schemas.AttendanceResponse(
        **{c.name: getattr(record, c.name) for c in record.__table__.columns},
        employee_name=f"{emp.first_name} {emp.last_name}" if emp else None,
        employee_department=emp.department.value if emp else None,
    )


@app.delete("/api/v1/attendance/{attendance_id}", status_code=204)
def delete_attendance(attendance_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    record = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(404, "Attendance record not found")
    db.delete(record)
    db.commit()
    log_audit(db, current_admin, "DELETE", "attendance", attendance_id, {})


@app.post("/api/v1/attendance/bulk")
def bulk_attendance(payload: dict, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    records = payload.get("records", [])
    settings = get_or_create_settings(db)
    created = updated = 0
    errors = []
    for rec in records:
        try:
            emp_id = rec.get("employee_id")
            att_date = date.fromisoformat(rec.get("date", str(date.today())))
            status_val = rec.get("status", "Present")
            existing = db.query(models.Attendance).filter(
                and_(models.Attendance.employee_id == emp_id, models.Attendance.date == att_date)
            ).first()
            if existing:
                existing.status = status_val
                updated += 1
            else:
                db.add(models.Attendance(employee_id=emp_id, date=att_date, status=status_val, notes=rec.get("notes")))
                created += 1
            db.commit()
        except Exception as e:
            errors.append({"employee_id": rec.get("employee_id"), "error": str(e)})
    log_audit(db, current_admin, "CREATE", "attendance_bulk", "bulk", {"created": created, "updated": updated})
    return {"created": created, "updated": updated, "errors": errors}


# ─── Export ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/attendance/export")
def export_attendance(
    date_from: Optional[date] = None, date_to: Optional[date] = None,
    format: str = Query("csv", regex="^(csv|excel)$"),
    db: Session = Depends(get_db), current_admin=Depends(get_current_admin)
):
    q = db.query(models.Attendance)
    if date_from: q = q.filter(models.Attendance.date >= date_from)
    if date_to: q = q.filter(models.Attendance.date <= date_to)
    records = q.order_by(models.Attendance.date.desc()).all()

    rows = []
    for r in records:
        emp = db.query(models.Employee).filter(models.Employee.id == r.employee_id).first()
        rows.append({
            "Employee ID": emp.employee_id if emp else r.employee_id,
            "Name": f"{emp.first_name} {emp.last_name}" if emp else "",
            "Department": emp.department.value if emp else "",
            "Date": str(r.date),
            "Check In": r.check_in.strftime("%H:%M") if r.check_in else "",
            "Check Out": r.check_out.strftime("%H:%M") if r.check_out else "",
            "Hours Worked": float(r.hours_worked) if r.hours_worked else "",
            "Status": r.status.value if r.status else "",
            "Is Late": r.is_late,
            "Late (min)": r.late_minutes,
            "Notes": r.notes or "",
        })

    log_audit(db, current_admin, "EXPORT", "attendance", "export", {"format": format, "rows": len(rows)})

    if format == "excel":
        import pandas as pd
        df = pd.DataFrame(rows)
        buf = io.BytesIO()
        df.to_excel(buf, index=False, engine="openpyxl")
        buf.seek(0)
        return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                  headers={"Content-Disposition": "attachment; filename=attendance.xlsx"})
    else:
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        output.seek(0)
        return StreamingResponse(output, media_type="text/csv",
                                  headers={"Content-Disposition": "attachment; filename=attendance.csv"})


# ─── Leave Requests ───────────────────────────────────────────────────────────

@app.get("/api/v1/leave-requests")
def list_leave_requests(
    status: Optional[str] = None, employee_id: Optional[int] = None,
    db: Session = Depends(get_db), current_admin=Depends(get_current_admin)
):
    q = db.query(models.LeaveRequest)
    if status: q = q.filter(models.LeaveRequest.status == status)
    if employee_id: q = q.filter(models.LeaveRequest.employee_id == employee_id)
    requests = q.order_by(models.LeaveRequest.created_at.desc()).all()
    result = []
    for r in requests:
        emp = db.query(models.Employee).filter(models.Employee.id == r.employee_id).first()
        result.append({**{c.name: getattr(r, c.name) for c in r.__table__.columns},
                       "employee_name": f"{emp.first_name} {emp.last_name}" if emp else None,
                       "start_date": str(r.start_date), "end_date": str(r.end_date)})
    return {"total": len(result), "requests": result}


@app.post("/api/v1/leave-requests", status_code=201)
def create_leave_request(payload: schemas.LeaveRequestCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    emp = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    req = models.LeaveRequest(**payload.model_dump())
    db.add(req)
    db.commit()
    db.refresh(req)
    log_audit(db, current_admin, "CREATE", "leave_request", req.id, {"employee_id": payload.employee_id})
    return req


@app.put("/api/v1/leave-requests/{request_id}")
def update_leave_request(request_id: int, payload: schemas.LeaveRequestUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    req = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Leave request not found")
    req.status = payload.status
    req.approved_by = payload.approved_by
    req.updated_at = datetime.utcnow()
    db.commit()
    log_audit(db, current_admin, "UPDATE", "leave_request", request_id, {"status": payload.status})
    return req


# ─── Departments ──────────────────────────────────────────────────────────────

@app.get("/api/v1/departments")
def list_departments(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    depts = db.query(models.Department).all()
    result = []
    for d in depts:
        count = db.query(func.count(models.Employee.id)).filter(models.Employee.department == d.name).scalar()
        result.append({**{c.name: getattr(d, c.name) for c in d.__table__.columns}, "employee_count": count})
    return {"total": len(result), "departments": result}


@app.post("/api/v1/departments", status_code=201)
def create_department(payload: schemas.DepartmentCreate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    if db.query(models.Department).filter(models.Department.name == payload.name).first():
        raise HTTPException(400, "Department already exists")
    dept = models.Department(**payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    log_audit(db, current_admin, "CREATE", "department", dept.id, {"name": payload.name})
    return dept


@app.delete("/api/v1/departments/{dept_id}", status_code=204)
def delete_department(dept_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    db.delete(dept)
    db.commit()
    log_audit(db, current_admin, "DELETE", "department", dept_id, {})


# ─── Audit Logs ───────────────────────────────────────────────────────────────

@app.get("/api/v1/audit-logs")
def get_audit_logs(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), current_admin=Depends(get_current_admin)
):
    total = db.query(func.count(models.AuditLog.id)).scalar()
    logs = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "logs": [schemas.AuditLogResponse.model_validate(l) for l in logs]}


# ─── Company Settings ─────────────────────────────────────────────────────────

@app.get("/api/v1/settings", response_model=schemas.CompanySettingsResponse)
def get_settings(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    return get_or_create_settings(db)


@app.put("/api/v1/settings", response_model=schemas.CompanySettingsResponse)
def update_settings(payload: schemas.CompanySettingsUpdate, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    s = get_or_create_settings(db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    log_audit(db, current_admin, "UPDATE", "settings", s.id, payload.model_dump(exclude_unset=True))
    return s


# ─── Admin Management ─────────────────────────────────────────────────────────

@app.get("/api/v1/admins")
def list_admins(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    admins = db.query(models.AdminUser).all()
    return {"admins": [schemas.AdminResponse.model_validate(a) for a in admins]}


@app.put("/api/v1/admins/{admin_id}/role")
def update_admin_role(admin_id: int, payload: dict, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    admin = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()
    if not admin:
        raise HTTPException(404, "Admin not found")
    admin.role = payload.get("role", admin.role)
    db.commit()
    log_audit(db, current_admin, "UPDATE", "admin", admin_id, {"role": payload.get("role")})
    return schemas.AdminResponse.model_validate(admin)

# ─── Backward-compat aliases (old /api/ paths) ────────────────────────────────
@app.get("/api/dashboard")
def dashboard_compat(request: Request, db=Depends(get_db), a=Depends(get_current_admin)):
    return get_dashboard(request, db, a)

@app.get("/api/employees")
def employees_compat(request: Request, skip=0, limit=20, search=None, department=None, status=None, sort_by="created_at", sort_dir="desc", db=Depends(get_db), a=Depends(get_current_admin)):
    return list_employees(request, skip, limit, search, department, status, sort_by, sort_dir, db, a)

@app.post("/api/auth/register", response_model=schemas.AdminResponse)
def register_compat(payload: schemas.AdminCreate, db=Depends(get_db)):
    return register_admin(payload, db)

@app.get("/api/auth/me", response_model=schemas.AdminResponse)
def me_compat(a=Depends(get_current_admin)):
    return a
