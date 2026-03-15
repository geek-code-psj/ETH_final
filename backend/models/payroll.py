from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Text, Boolean, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class SalaryStructure(Base):
    """Defines salary components for an employee."""
    __tablename__ = "salary_structures"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    basic_salary = Column(Numeric(12, 2), nullable=False, default=0)
    hra = Column(Numeric(12, 2), default=0)
    transport = Column(Numeric(12, 2), default=0)
    medical = Column(Numeric(12, 2), default=0)
    other_allowances = Column(Numeric(12, 2), default=0)
    pf_deduction = Column(Numeric(12, 2), default=0)
    tax_deduction = Column(Numeric(12, 2), default=0)
    other_deductions = Column(Numeric(12, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    employee = relationship("Employee", backref="salary_structure")
    payroll_records = relationship("PayrollRecord", back_populates="salary_structure")


class PayrollRecord(Base):
    """Monthly payroll record per employee."""
    __tablename__ = "payroll_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    salary_structure_id = Column(Integer, ForeignKey("salary_structures.id"), nullable=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    working_days = Column(Integer, default=0)
    present_days = Column(Integer, default=0)
    gross_salary = Column(Numeric(12, 2), default=0)
    total_deductions = Column(Numeric(12, 2), default=0)
    bonus = Column(Numeric(12, 2), default=0)
    net_salary = Column(Numeric(12, 2), default=0)
    status = Column(String(20), default="draft", index=True)
    notes = Column(Text)
    paid_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", backref="payroll_records")
    salary_structure = relationship("SalaryStructure", back_populates="payroll_records")

    __table_args__ = (
        # Primary access pattern: get payroll for employee for a month/year
        Index("ix_payroll_emp_year_month", "employee_id", "year", "month"),
        # Filter all records by month/year for bulk payroll runs
        Index("ix_payroll_year_month", "year", "month"),
    )
