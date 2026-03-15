from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from schemas.settings import CompanySettingsUpdate, CompanySettingsResponse
from utils import get_or_create_settings, log_audit

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])

@router.get("", response_model=CompanySettingsResponse)
def get_settings(db: Session = Depends(get_db), current_admin=Depends(get_current_user)):
    return get_or_create_settings(db)

@router.put("", response_model=CompanySettingsResponse)
def update_settings(
    payload: CompanySettingsUpdate, 
    db: Session = Depends(get_db), 
    current_admin=Depends(require_role([AdminRoleEnum.super_admin, AdminRoleEnum.admin]))
):
    s = get_or_create_settings(db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    log_audit(db, current_admin, "UPDATE", "settings", s.id, payload.model_dump(exclude_unset=True))
    return s
