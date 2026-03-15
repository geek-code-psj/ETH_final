from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Tuple
from models.employee import Employee
from models.attendance import Attendance
from models.enums import StatusEnum
from schemas.employee import EmployeeCreate, EmployeeUpdate
from datetime import datetime

class EmployeeService:
    @staticmethod
    def generate_employee_id(db: Session, department_code: str = "EMP") -> str:
        count = db.query(func.count(Employee.id)).scalar()
        return f"{department_code}-{1000 + count + 1}"

    @staticmethod
    def get_employees(
        db: Session, 
        skip: int = 0, 
        limit: int = 20,
        search: Optional[str] = None,
        department: Optional[str] = None,
        status: Optional[str] = None
    ) -> Tuple[List[Employee], int]:
        query = db.query(Employee)
        
        if search:
            search_filt = f"%{search}%"
            query = query.filter(
                (Employee.first_name.ilike(search_filt)) |
                (Employee.last_name.ilike(search_filt)) |
                (Employee.email.ilike(search_filt)) |
                (Employee.employee_id.ilike(search_filt))
            )
        
        if department:
            query = query.filter(Employee.department == department)
        if status:
            query = query.filter(Employee.status == status)
            
        total = query.count()
        employees = query.order_by(Employee.created_at.desc()).offset(skip).limit(limit).all()
        
        # Enrich with manager name and direct reports count if needed
        # (Though we can also do this in the schema/response model)
        return employees, total

    @staticmethod
    def get_employee_by_id(db: Session, employee_id: int) -> Optional[Employee]:
        return db.query(Employee).filter(Employee.id == employee_id).first()

    @staticmethod
    def create_employee(db: Session, obj_in: EmployeeCreate) -> Employee:
        data = obj_in.model_dump()
        if not data.get("employee_id"):
            data["employee_id"] = EmployeeService.generate_employee_id(db)
        
        db_obj = Employee(**data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def update_employee(db: Session, db_obj: Employee, obj_in: EmployeeUpdate) -> Employee:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def delete_employee(db: Session, employee_id: int) -> bool:
        db_obj = db.query(Employee).filter(Employee.id == employee_id).first()
        if not db_obj:
            return False
        db.delete(db_obj)
        db.commit()
        return True

employee_service = EmployeeService()
