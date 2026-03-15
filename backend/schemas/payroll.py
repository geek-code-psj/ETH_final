from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class SalaryStructureCreate(BaseModel):
    employee_id: int
    basic_salary: Decimal = Decimal("0")
    hra: Decimal = Decimal("0")
    transport: Decimal = Decimal("0")
    medical: Decimal = Decimal("0")
    other_allowances: Decimal = Decimal("0")
    pf_deduction: Decimal = Decimal("0")
    tax_deduction: Decimal = Decimal("0")
    other_deductions: Decimal = Decimal("0")


class SalaryStructureResponse(SalaryStructureCreate):
    id: int
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True


class PayrollRecordResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_id_code: Optional[str] = None
    department: Optional[str] = None
    month: int
    year: int
    working_days: int
    present_days: int
    gross_salary: Decimal
    total_deductions: Decimal
    bonus: Decimal
    net_salary: Decimal
    status: str
    notes: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PayrollGenerateRequest(BaseModel):
    month: int
    year: int
    bonus_override: Optional[dict] = None  # employee_id -> bonus amount


class PayslipData(BaseModel):
    employee_name: str
    employee_id_code: str
    department: str
    position: str
    month: int
    year: int
    basic_salary: Decimal
    hra: Decimal
    transport: Decimal
    medical: Decimal
    other_allowances: Decimal
    gross_salary: Decimal
    pf_deduction: Decimal
    tax_deduction: Decimal
    other_deductions: Decimal
    total_deductions: Decimal
    bonus: Decimal
    net_salary: Decimal
    working_days: int
    present_days: int
    status: str
