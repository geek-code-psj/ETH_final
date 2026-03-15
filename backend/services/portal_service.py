"""
Employee Portal Service: handles self-service login, profile access,
attendance viewing, and leave submission for employees.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional

from core.employee_auth import hash_password, verify_password, create_employee_token
from models.employee import Employee
from models.employee_auth import EmployeeAuth
from models.attendance import Attendance
from models.leave import LeaveRequest
from schemas.portal import EmployeeLoginRequest, EmployeeTokenResponse, EmployeeProfileUpdate
from fastapi import HTTPException


class EmployeePortalService:
    @staticmethod
    def login(db: Session, req: EmployeeLoginRequest) -> EmployeeTokenResponse:
        emp = db.query(Employee).filter(Employee.email == req.email).first()
        if not emp:
            raise HTTPException(401, "Invalid email or password")

        auth = db.query(EmployeeAuth).filter(
            EmployeeAuth.employee_id == emp.id,
            EmployeeAuth.is_active == True
        ).first()
        if not auth or not verify_password(req.password, auth.hashed_password):
            raise HTTPException(401, "Invalid email or password")

        # Update last login
        auth.last_login = datetime.utcnow()
        db.commit()

        token = create_employee_token(emp.id, emp.email)
        return EmployeeTokenResponse(
            access_token=token,
            employee_id=emp.id,
            name=f"{emp.first_name} {emp.last_name}",
            email=emp.email,
            department=emp.department.value,
            position=emp.position,
            must_change_password=auth.must_change_password
        )

    @staticmethod
    def create_employee_account(db: Session, employee_id: int, password: str) -> EmployeeAuth:
        """Called by admin to provision employee portal access."""
        existing = db.query(EmployeeAuth).filter(EmployeeAuth.employee_id == employee_id).first()
        if existing:
            existing.hashed_password = hash_password(password)
            existing.is_active = True
            existing.must_change_password = True
            db.commit()
            return existing

        auth = EmployeeAuth(
            employee_id=employee_id,
            hashed_password=hash_password(password),
            must_change_password=True
        )
        db.add(auth)
        db.commit()
        db.refresh(auth)
        return auth

    @staticmethod
    def change_password(db: Session, employee_id: int, old_password: str, new_password: str):
        auth = db.query(EmployeeAuth).filter(EmployeeAuth.employee_id == employee_id).first()
        if not auth or not verify_password(old_password, auth.hashed_password):
            raise HTTPException(400, "Current password is incorrect")

        auth.hashed_password = hash_password(new_password)
        auth.must_change_password = False
        db.commit()

    @staticmethod
    def update_profile(db: Session, emp: Employee, data: EmployeeProfileUpdate) -> Employee:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(emp, field, value)
        db.commit()
        db.refresh(emp)
        return emp

portal_service = EmployeePortalService()
