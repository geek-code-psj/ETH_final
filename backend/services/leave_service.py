from sqlalchemy.orm import Session
from typing import List, Optional
from models.leave import LeaveRequest
from models.employee import Employee
from schemas.leave import LeaveRequestCreate, LeaveRequestUpdate

class LeaveService:
    @staticmethod
    def list_requests(db: Session, employee_id: Optional[int] = None) -> List[LeaveRequest]:
        query = db.query(LeaveRequest)
        if employee_id:
            query = query.filter(LeaveRequest.employee_id == employee_id)
        return query.order_by(LeaveRequest.created_at.desc()).all()

    @staticmethod
    def create_request(db: Session, obj_in: LeaveRequestCreate) -> LeaveRequest:
        db_obj = LeaveRequest(**obj_in.model_dump())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def update_request(db: Session, request_id: int, obj_in: LeaveRequestUpdate) -> Optional[LeaveRequest]:
        db_obj = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
        if not db_obj:
            return None
        
        db_obj.status = obj_in.status
        db_obj.approved_by = obj_in.approved_by
        db.commit()
        db.refresh(db_obj)
        return db_obj

leave_service = LeaveService()
