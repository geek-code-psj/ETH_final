from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from models.leave import LeaveRequest
from models.employee import Employee
from models.enums import StatusEnum
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
        # Validation: end_date >= start_date
        if obj_in.end_date < obj_in.start_date:
            raise ValueError("End date must be on or after start date")

        # Validation: No past dates for new requests
        if obj_in.start_date < date.today():
            raise ValueError("Start date cannot be in the past")

        # Validation: Check for overlapping requests
        existing = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == obj_in.employee_id,
            LeaveRequest.status.in_(["pending", "approved"]),
            LeaveRequest.start_date <= obj_in.end_date,
            LeaveRequest.end_date >= obj_in.start_date
        ).first()

        if existing:
            raise ValueError("Overlapping leave request already exists")

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

        # Validate status
        valid_statuses = ["pending", "approved", "rejected", "cancelled"]
        if obj_in.status and obj_in.status.lower() not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        db_obj.status = obj_in.status
        db_obj.approved_by = obj_in.approved_by
        db.commit()
        db.refresh(db_obj)
        return db_obj


leave_service = LeaveService()
