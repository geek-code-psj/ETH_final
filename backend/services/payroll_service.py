"""
Payroll Service: generates monthly payroll records based on salary structures
and attendance data.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from decimal import Decimal
from datetime import datetime
from typing import Optional, List

from models.payroll import SalaryStructure, PayrollRecord
from models.employee import Employee
from models.attendance import Attendance
from models.enums import StatusEnum, AttendanceStatusEnum
from schemas.payroll import SalaryStructureCreate, PayrollGenerateRequest, PayslipData
from fastapi import HTTPException


class PayrollService:
    @staticmethod
    def get_or_create_structure(db: Session, data: SalaryStructureCreate) -> SalaryStructure:
        existing = db.query(SalaryStructure).filter(
            SalaryStructure.employee_id == data.employee_id
        ).first()
        if existing:
            for k, v in data.model_dump(exclude={"employee_id"}).items():
                setattr(existing, k, v)
            db.commit()
            db.refresh(existing)
            return existing

        struct = SalaryStructure(**data.model_dump())
        db.add(struct)
        db.commit()
        db.refresh(struct)
        return struct

    @staticmethod
    def generate_monthly_payroll(
        db: Session, month: int, year: int,
        bonus_override: Optional[dict] = None
    ) -> List[PayrollRecord]:
        employees = db.query(Employee).filter(Employee.status == StatusEnum.active).all()
        records = []
        working_days = 22  # Approximate working days per month

        for emp in employees:
            # Skip if already generated
            existing = db.query(PayrollRecord).filter(
                PayrollRecord.employee_id == emp.id,
                PayrollRecord.month == month,
                PayrollRecord.year == year
            ).first()
            if existing:
                records.append(existing)
                continue

            # Get salary structure
            structure = db.query(SalaryStructure).filter(
                SalaryStructure.employee_id == emp.id
            ).first()

            # Fallback to employee salary field if no structure
            base = structure.basic_salary if structure else (emp.salary or Decimal("0"))
            hra = structure.hra if structure else Decimal("0")
            transport = structure.transport if structure else Decimal("0")
            medical = structure.medical if structure else Decimal("0")
            other_allow = structure.other_allowances if structure else Decimal("0")
            pf = structure.pf_deduction if structure else Decimal("0")
            tax = structure.tax_deduction if structure else Decimal("0")
            other_ded = structure.other_deductions if structure else Decimal("0")

            # Count attendance for the month
            att_records = db.query(Attendance).filter(
                Attendance.employee_id == emp.id,
                extract("month", Attendance.date) == month,
                extract("year", Attendance.date) == year
            ).all()
            present_days = sum(1 for r in att_records
                               if r.status in [AttendanceStatusEnum.present, AttendanceStatusEnum.late, AttendanceStatusEnum.half_day])

            # Pro-rate if absent
            ratio = Decimal(str(present_days)) / Decimal(str(working_days)) if working_days else Decimal("0")
            prorated_base = base * ratio

            gross = prorated_base + hra + transport + medical + other_allow
            total_deductions = pf + tax + other_ded
            bonus = Decimal(str(bonus_override.get(emp.id, 0))) if bonus_override else Decimal("0")
            net = gross - total_deductions + bonus

            record = PayrollRecord(
                employee_id=emp.id,
                salary_structure_id=structure.id if structure else None,
                month=month,
                year=year,
                working_days=working_days,
                present_days=present_days,
                gross_salary=max(gross, Decimal("0")),
                total_deductions=max(total_deductions, Decimal("0")),
                bonus=bonus,
                net_salary=max(net, Decimal("0")),
                status="processed"
            )
            db.add(record)
            records.append(record)

        db.commit()
        return records

    @staticmethod
    def get_payslip(db: Session, record_id: int) -> PayslipData:
        record = db.query(PayrollRecord).filter(PayrollRecord.id == record_id).first()
        if not record:
            raise HTTPException(404, "Payroll record not found")

        emp = db.query(Employee).filter(Employee.id == record.employee_id).first()
        struct = db.query(SalaryStructure).filter(
            SalaryStructure.employee_id == record.employee_id
        ).first()

        return PayslipData(
            employee_name=f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
            employee_id_code=emp.employee_id if emp else "",
            department=emp.department.value if emp else "",
            position=emp.position if emp else "",
            month=record.month,
            year=record.year,
            basic_salary=struct.basic_salary if struct else Decimal("0"),
            hra=struct.hra if struct else Decimal("0"),
            transport=struct.transport if struct else Decimal("0"),
            medical=struct.medical if struct else Decimal("0"),
            other_allowances=struct.other_allowances if struct else Decimal("0"),
            gross_salary=record.gross_salary,
            pf_deduction=struct.pf_deduction if struct else Decimal("0"),
            tax_deduction=struct.tax_deduction if struct else Decimal("0"),
            other_deductions=struct.other_deductions if struct else Decimal("0"),
            total_deductions=record.total_deductions,
            bonus=record.bonus,
            net_salary=record.net_salary,
            working_days=record.working_days,
            present_days=record.present_days,
            status=record.status
        )

payroll_service = PayrollService()
