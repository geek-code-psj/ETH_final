from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from core.database import get_db
from core.security import get_current_user
from services.dashboard_service import dashboard_service
from schemas.dashboard import DashboardStats

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardStats)
def get_dashboard(request: Request, db: Session = Depends(get_db), current_admin=Depends(get_current_user)):
    return dashboard_service.get_stats(db)
