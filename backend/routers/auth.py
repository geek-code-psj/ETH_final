from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user, verify_firebase_token
from services.auth_service import auth_service
from schemas.admin import AdminCreate, AdminResponse

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

@router.post("/register", response_model=AdminResponse)
def register_admin(
    payload: AdminCreate, 
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_firebase_token)
):
    existing = auth_service.get_admin_by_uid(db, payload.firebase_uid)
    if existing:
        auth_service.update_last_login(db, existing)
        return existing
        
    return auth_service.create_admin(db, payload)

@router.get("/me", response_model=AdminResponse)
def get_me(current_admin = Depends(get_current_user)):
    return current_admin
