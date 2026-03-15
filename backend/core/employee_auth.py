"""
JWT-based authentication for the Employee Self-Service Portal.
Separate from the Firebase admin auth used by admin users.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from core.database import get_db
import os

# ── Config ──────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("EMPLOYEE_JWT_SECRET", "change-this-in-production-employee-secret-key")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24
REFRESH_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
employee_bearer = HTTPBearer(scheme_name="EmployeeToken")


# ── Password helpers ─────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def validate_password_strength(password: str):
    """Enforce: 8+ chars, 1 uppercase, 1 digit."""
    import re
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(400, "Password must contain at least one uppercase letter")
    if not re.search(r'[0-9]', password):
        raise HTTPException(400, "Password must contain at least one number")


# ── JWT helpers ──────────────────────────────────────────────────────────────
def create_employee_token(employee_id: int, email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(employee_id),
        "email": email,
        "type": "employee",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(employee_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=REFRESH_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(employee_id), "type": "refresh", "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM
    )


def decode_employee_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "employee":
            raise HTTPException(401, "Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired employee token")


def decode_refresh_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid refresh token")
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired refresh token")


# ── FastAPI dependency ────────────────────────────────────────────────────────
def get_current_employee(
    credentials: HTTPAuthorizationCredentials = Security(employee_bearer),
    db: Session = Depends(get_db)
):
    from models.employee import Employee
    from models.employee_auth import EmployeeAuth

    payload = decode_employee_token(credentials.credentials)
    employee_id = int(payload["sub"])

    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(403, "Employee not found")

    auth = db.query(EmployeeAuth).filter(
        EmployeeAuth.employee_id == employee_id,
        EmployeeAuth.is_active == True
    ).first()
    if not auth:
        raise HTTPException(403, "Employee account is inactive")

    return emp
