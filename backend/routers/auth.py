from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user, verify_firebase_token, require_role
from core.config import settings
from models.enums import AdminRoleEnum
from services.auth_service import auth_service
from schemas.admin import AdminCreate, AdminResponse

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post("/register", response_model=AdminResponse)
def register_admin(
    payload: AdminCreate,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_firebase_token)
):
    """
    Register a new admin.

    Security controls:
    - In production: requires super_admin approval (ALLOW_ADMIN_SELF_REGISTRATION=false)
    - In development: open registration allowed for testing
    - Always validates that the Firebase token matches the submitted UID and email
    """
    # Security: Bind Firebase token to submitted credentials
    token_uid = token_data.get("uid")
    token_email = token_data.get("email", "").lower()

    if not token_uid:
        raise HTTPException(status_code=401, detail="Invalid token: missing uid")

    if token_uid != payload.firebase_uid:
        raise HTTPException(status_code=403, detail="Token UID does not match submitted firebase_uid")

    if token_email != payload.email.lower():
        raise HTTPException(status_code=403, detail="Token email does not match submitted email")

    # Production: Require super_admin approval for new admins
    if not settings.ALLOW_ADMIN_SELF_REGISTRATION:
        existing = auth_service.get_admin_by_uid(db, payload.firebase_uid)
        if existing:
            # Allow existing admins to re-login
            auth_service.update_last_login(db, existing)
            return existing
        # New admin registration requires explicit super_admin approval
        # For now, create as viewer - require manual role upgrade
        payload = AdminCreate(
            firebase_uid=payload.firebase_uid,
            email=payload.email,
            name=payload.name,
            role=AdminRoleEnum.viewer  # New admins start as viewers
        )
        admin = auth_service.create_admin(db, payload)
        return admin

    # Development: Allow open registration
    existing = auth_service.get_admin_by_uid(db, payload.firebase_uid)
    if existing:
        auth_service.update_last_login(db, existing)
        return existing

    return auth_service.create_admin(db, payload)


@router.post("/register/approve/{admin_id}", response_model=AdminResponse)
def approve_admin(
    admin_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.super_admin]))
):
    """Super admin: Approve and set role for pending admin."""
    new_role = payload.get("role", AdminRoleEnum.admin.value)
    if new_role not in [r.value for r in AdminRoleEnum]:
        raise HTTPException(400, "Invalid role")

    admin = auth_service.approve_admin(db, admin_id, new_role)
    if not admin:
        raise HTTPException(404, "Admin not found")

    return admin

@router.get("/me", response_model=AdminResponse)
def get_me(current_admin = Depends(get_current_user)):
    return current_admin
