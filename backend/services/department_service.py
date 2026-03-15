from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from models.department import Department
from models.employee import Employee
from schemas.department import DepartmentCreate

class DepartmentService:
    @staticmethod
    def list_departments(db: Session) -> List[dict]:
        depts = db.query(Department).all()
        result = []
        for d in depts:
            count = db.query(func.count(Employee.id)).filter(Employee.department == d.name).scalar()
            result.append({
                "id": d.id,
                "name": d.name,
                "code": d.code,
                "head_employee_id": d.head_employee_id,
                "description": d.description,
                "is_active": d.is_active,
                "employee_count": count
            })
        return result

    @staticmethod
    def create_department(db: Session, obj_in: DepartmentCreate) -> Department:
        db_obj = Department(**obj_in.model_dump())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def delete_department(db: Session, dept_id: int) -> bool:
        db_obj = db.query(Department).filter(Department.id == dept_id).first()
        if not db_obj:
            return False
        db.delete(db_obj)
        db.commit()
        return True

department_service = DepartmentService()
