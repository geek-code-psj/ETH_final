import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from models.enums import DepartmentEnum, StatusEnum


class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    department: DepartmentEnum
    position: str
    role_permission: Optional[str] = None
    salary: Optional[Decimal] = None
    hire_date: date
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    status: Optional[StatusEnum] = StatusEnum.active
    avatar_url: Optional[str] = None
    manager_id: Optional[int] = None

    @field_validator('first_name', 'last_name', 'position')
    @classmethod
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r'^\+?[\d\s\-().]{7,20}$', v):
            raise ValueError('Invalid phone number format (7-20 digits)')
        return v

    @field_validator('salary')
    @classmethod
    def validate_salary(cls, v):
        if v is not None and (v < 0 or v > 9_999_999):
            raise ValueError('Salary must be between 0 and 9,999,999')
        return v

    @field_validator('address')
    @classmethod
    def validate_address(cls, v):
        if v and len(v) > 500:
            raise ValueError('Address must be 500 characters or fewer')
        return v

    @field_validator('avatar_url')
    @classmethod
    def validate_avatar_url(cls, v):
        if v and not (re.match(r'^https?://', v) or v.startswith('data:image/')):
            raise ValueError('Avatar URL must be an HTTP URL or a Base64 data URL')
        return v


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[DepartmentEnum] = None
    position: Optional[str] = None
    role_permission: Optional[str] = None
    salary: Optional[Decimal] = None
    hire_date: Optional[date] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    status: Optional[StatusEnum] = None
    avatar_url: Optional[str] = None
    manager_id: Optional[int] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r'^\+?[\d\s\-().]{7,20}$', v):
            raise ValueError('Invalid phone number format (7-20 digits)')
        return v


class EmployeeResponse(EmployeeBase):
    id: int
    employee_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    manager_name: Optional[str] = None
    direct_reports_count: Optional[int] = 0

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    employees: List[EmployeeResponse]
