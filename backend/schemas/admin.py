from pydantic import BaseModel, EmailStr
from typing import Optional

class AdminCreate(BaseModel):
    firebase_uid: str
    email: EmailStr
    name: Optional[str] = None

class AdminResponse(BaseModel):
    id: int
    firebase_uid: str
    email: str
    name: Optional[str]
    role: str
    is_active: bool

    class Config:
        from_attributes = True
