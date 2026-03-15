import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from core.config import settings
from core.database import get_db
from models.admin import AdminUser
from models.enums import AdminRoleEnum
import json

security = HTTPBearer()

def init_firebase():
    try:
        if firebase_admin._apps:
            return
            
        if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
            cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(cred_dict)
        else:
            # Fallback for individual env vars
            cred_dict = {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                # ... other fields if needed, but the primary way is JSON
            }
            # Note: For brevity and security, recommending JSON. 
            # If individual vars are used, they should be mapped here.
            cred = credentials.Certificate(cred_dict)
        
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Firebase init warning: {e}")

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")

def get_current_user(
    token_data: dict = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
) -> AdminUser:
    if settings.DEV_MODE:
        admin = db.query(AdminUser).first()
        if admin: return admin
    
    uid = token_data.get("uid")
    admin = db.query(AdminUser).filter(
        AdminUser.firebase_uid == uid,
        AdminUser.is_active == True
    ).first()
    
    if not admin:
        raise HTTPException(status_code=403, detail="Access denied. Admin account not found or inactive.")
    
    return admin

def require_role(roles: list[AdminRoleEnum]):
    def role_checker(current_user: AdminUser = Depends(get_current_user)):
        if current_user.role not in roles and current_user.role != AdminRoleEnum.super_admin:
            raise HTTPException(
                status_code=403, 
                detail=f"Action requires one of these roles: {[r.value for r in roles]}"
            )
        return current_user
    return role_checker
