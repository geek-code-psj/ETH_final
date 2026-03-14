import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
import models

security = HTTPBearer()

# Initialize Firebase Admin
_firebase_initialized = False

def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    try:
        firebase_config = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if firebase_config:
            import json
            cred_dict = json.loads(firebase_config)
            cred = credentials.Certificate(cred_dict)
        else:
            # Fallback: use individual env vars
            cred_dict = {
                "type": "service_account",
                "project_id": os.getenv("FIREBASE_PROJECT_ID"),
                "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
                "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
                "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                "client_id": os.getenv("FIREBASE_CLIENT_ID"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
            cred = credentials.Certificate(cred_dict)
        
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        _firebase_initialized = True
    except Exception as e:
        print(f"Firebase init warning: {e}")
        _firebase_initialized = True  # Continue without Firebase in dev mode


def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")


def get_current_admin(
    token_data: dict = Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    uid = token_data.get("uid")
    admin = db.query(models.AdminUser).filter(
        models.AdminUser.firebase_uid == uid,
        models.AdminUser.is_active == True
    ).first()
    
    if not admin:
        raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")
    
    return admin


# Optional dependency for development - skip auth if DEV_MODE=true
def get_current_admin_or_dev(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    if os.getenv("DEV_MODE", "false").lower() == "true":
        # Return a mock admin for development
        admin = db.query(models.AdminUser).first()
        if admin:
            return admin
        # Create a dev admin if none exists
        dev_admin = models.AdminUser(
            firebase_uid="dev-uid",
            email="dev@hrms.local",
            name="Dev Admin",
            role="admin"
        )
        db.add(dev_admin)
        db.commit()
        db.refresh(dev_admin)
        return dev_admin
    return get_current_admin(verify_firebase_token(credentials), db)


# ─── Session expiration helper ────────────────────────────────────────────────
# Firebase tokens expire in 1 hour by default.
# The frontend should call user.getIdToken(true) to force-refresh when needed.
# For extra security, check token issued-at time:

def check_token_freshness(decoded_token: dict, max_age_minutes: int = 60):
    """Raise 401 if token was issued more than max_age_minutes ago."""
    import time
    iat = decoded_token.get("iat", 0)
    age_minutes = (time.time() - iat) / 60
    if age_minutes > max_age_minutes:
        raise HTTPException(
            status_code=401,
            detail="Session expired. Please sign in again."
        )
