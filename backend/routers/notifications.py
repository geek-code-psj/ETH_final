from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db
from core.security import get_current_user
from core.employee_auth import get_current_employee
from models.notification import Notification
from models.employee import Employee
from services.notification_service import notification_service
from schemas.extras import NotificationResponse

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def get_my_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(20, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    """Get notifications for the current admin."""
    q = db.query(Notification).filter(Notification.admin_id == current_admin.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    return q.order_by(Notification.created_at.desc()).limit(limit).all()


@router.get("/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    from sqlalchemy import func
    count = db.query(func.count(Notification.id)).filter(
        Notification.admin_id == current_admin.id,
        Notification.is_read == False
    ).scalar()
    return {"unread_count": count or 0}


@router.put("/{notif_id}/read")
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    notification_service.mark_read(db, notif_id, admin_id=current_admin.id)
    return {"message": "Marked as read"}


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.admin_id == current_admin.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
