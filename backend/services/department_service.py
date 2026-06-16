from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from models.department import Department
from models.employee import Employee
from models.enums import DepartmentEnum
from schemas.department import DepartmentCreate


class DepartmentService:
    @staticmethod
    def list_departments(db: Session) -> List[dict]:
        depts = db.query(Department).all()
        result = []
        for d in depts:
            # Fix: Match DepartmentEnum value to Department.name
            # Employee.department is DepartmentEnum, Department.name is string
            try:
                dept_enum = DepartmentEnum(d.name.lower())
            except ValueError:
                dept_enum = None

            if dept_enum:
                count = db.query(func.count(Employee.id)).filter(
                    Employee.department == dept_enum
                ).scalar()
            else:
                count = 0

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
    def update_department(db: Session, dept_id: int, obj_in: DepartmentCreate) -> bool:
        db_obj = db.query(Department).filter(Department.id == dept_id).first()
        if not db_obj:
            return None
        for k, v in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, k, v)
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
