from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class EmployeeLoginRequest(BaseModel):
    email: EmailStr
    password: str


class EmployeeTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee_id: int
    name: str
    email: str
    department: str
    position: str
    must_change_password: bool = False


class EmployeePasswordChange(BaseModel):
    current_password: str
    new_password: str


class EmployeeProfileUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
