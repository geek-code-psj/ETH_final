from pydantic import BaseModel
from typing import Optional

class DepartmentCreate(BaseModel):
    name: str
    code: Optional[str] = None
    head_employee_id: Optional[int] = None
    description: Optional[str] = None

class DepartmentResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    head_employee_id: Optional[int] = None
    description: Optional[str] = None
    is_active: bool
    employee_count: Optional[int] = 0

    class Config:
        from_attributes = True
