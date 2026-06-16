from pydantic import BaseModel, EmailStr
from typing import Optional
from models.enums import AdminRoleEnum


class AdminCreate(BaseModel):
    firebase_uid: str
    email: EmailStr
    name: Optional[str] = None
    role: AdminRoleEnum = AdminRoleEnum.admin


class AdminResponse(BaseModel):
    id: int
    firebase_uid: str
    email: str
    name: Optional[str]
    role: str
    is_active: bool
    last_login: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
