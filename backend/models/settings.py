from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from core.database import Base

class CompanySettings(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(200), default="My Company")
    company_email = Column(String(255))
    company_phone = Column(String(20))
    company_address = Column(Text)
    logo_url = Column(String(500))
    work_start_time = Column(String(10), default="09:00")
    work_end_time = Column(String(10), default="18:00")
    late_threshold_minutes = Column(Integer, default=15)
    timezone = Column(String(50), default="Asia/Kolkata")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
