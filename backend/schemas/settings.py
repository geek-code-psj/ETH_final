from pydantic import BaseModel
from typing import Optional

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    company_address: Optional[str] = None
    logo_url: Optional[str] = None
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    late_threshold_minutes: Optional[int] = None
    timezone: Optional[str] = None

class CompanySettingsResponse(CompanySettingsUpdate):
    id: int

    class Config:
        from_attributes = True
