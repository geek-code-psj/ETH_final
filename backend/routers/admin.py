from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import get_db
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from services.auth_service import auth_service
from schemas.admin import AdminResponse
from schemas.audit import AuditLogResponse
from utils import log_audit

router = APIRouter(tags=["Admin"])

@router.get("/api/v1/audit-logs")
def get_audit_logs(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db), 
    current_admin=Depends(require_role([AdminRoleEnum.super_admin, AdminRoleEnum.admin]))
):
    from models.audit import AuditLog
    total = db.query(func.count(AuditLog.id)).scalar()
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "logs": [AuditLogResponse.model_validate(l) for l in logs]}

@router.get("/api/v1/admins", response_model=list[AdminResponse])
def list_admins(
    db: Session = Depends(get_db), 
    current_admin=Depends(require_role([AdminRoleEnum.super_admin, AdminRoleEnum.admin]))
):
    return auth_service.list_admins(db)

@router.put("/api/v1/admins/{admin_id}/role", response_model=AdminResponse)
def update_admin_role(
    admin_id: int, 
    payload: dict, 
    db: Session = Depends(get_db), 
    current_admin=Depends(require_role([AdminRoleEnum.super_admin]))
):
    role = payload.get("role")
    if role not in [r.value for r in AdminRoleEnum]:
        raise HTTPException(400, "Invalid role")
        
    admin = auth_service.update_role(db, admin_id, role)
    if not admin:
        raise HTTPException(404, "Admin not found")
        
    log_audit(db, current_admin, "UPDATE", "admin_role", admin_id, {"new_role": role})
    return admin
