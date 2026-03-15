from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional, List, Tuple
from models.attendance import Attendance
from models.employee import Employee
from models.enums import AttendanceStatusEnum
from schemas.attendance import AttendanceCreate, AttendanceUpdate
from datetime import date, datetime, timedelta

class AttendanceService:
    @staticmethod
    def get_records(
        db: Session,
        employee_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Attendance], int]:
        query = db.query(Attendance)
        if employee_id:
            query = query.filter(Attendance.employee_id == employee_id)
        if date_from:
            query = query.filter(Attendance.date >= date_from)
        if date_to:
            query = query.filter(Attendance.date <= date_to)
            
        total = query.count()
        records = query.order_by(Attendance.date.desc(), Attendance.created_at.desc())\
                      .offset(skip).limit(limit).all()
        return records, total

    @staticmethod
    def log_attendance(db: Session, obj_in: AttendanceCreate) -> Attendance:
        # Check if record already exists for this employee and date
        existing = db.query(Attendance).filter(
            Attendance.employee_id == obj_in.employee_id,
            Attendance.date == obj_in.date
        ).first()
        
        if existing:
            # Update existing instead of creating new if it's a re-log
            update_data = obj_in.model_dump(exclude_unset=True)
            for field in update_data:
                setattr(existing, field, update_data[field])
            db.commit()
            db.refresh(existing)
            return existing
            
        db_obj = Attendance(**obj_in.model_dump())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def update_attendance(db: Session, attendance_id: int, obj_in: AttendanceUpdate) -> Optional[Attendance]:
        db_obj = db.query(Attendance).filter(Attendance.id == attendance_id).first()
        if not db_obj:
            return None
            
        update_data = obj_in.model_dump(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
            
        db.commit()
        db.refresh(db_obj)
        return db_obj

attendance_service = AttendanceService()
