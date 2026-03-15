from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class LeaveTypeCreate(BaseModel):
    name: str
    code: str
    days_per_year: float = 0
    carry_forward: bool = False
    color: Optional[str] = "#7c6af7"


class LeaveTypeResponse(BaseModel):
    id: int
    name: str
    code: str
    days_per_year: float
    carry_forward: bool
    is_active: bool
    color: Optional[str]

    class Config:
        from_attributes = True


class LeaveBalanceResponse(BaseModel):
    id: int
    employee_id: int
    leave_type_id: int
    leave_type_name: Optional[str] = None
    leave_type_code: Optional[str] = None
    year: int
    allocated: float
    used: float
    pending: float
    remaining: float

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: int
    employee_id: int
    doc_type: str
    file_name: str
    file_url: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    is_read: bool
    action_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
