from sqlalchemy.orm import Session
from typing import Optional, List
from models.admin import AdminUser
from models.enums import AdminRoleEnum
from schemas.admin import AdminCreate
from datetime import datetime


class AuthService:
    @staticmethod
    def get_admin_by_uid(db: Session, uid: str) -> Optional[AdminUser]:
        return db.query(AdminUser).filter(AdminUser.firebase_uid == uid).first()

    @staticmethod
    def create_admin(db: Session, obj_in: AdminCreate) -> AdminUser:
        # Determine role - use provided role or default to admin
        role = getattr(obj_in, 'role', None) or AdminRoleEnum.admin

        db_obj = AdminUser(
            firebase_uid=obj_in.firebase_uid,
            email=obj_in.email,
            name=obj_in.name,
            role=role,
            last_login=datetime.now()
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def update_last_login(db: Session, admin: AdminUser):
        admin.last_login = datetime.now()
        db.commit()

    @staticmethod
    def list_admins(db: Session) -> List[AdminUser]:
        return db.query(AdminUser).all()

    @staticmethod
    def update_role(db: Session, admin_id: int, role: str) -> Optional[AdminUser]:
        admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        if admin:
            try:
                admin.role = AdminRoleEnum(role)
            except ValueError:
                admin.role = role  # Allow raw string if enum fails
            db.commit()
            db.refresh(admin)
        return admin

    @staticmethod
    def approve_admin(db: Session, admin_id: int, role: str) -> Optional[AdminUser]:
        """Approve a pending admin and set their role."""
        admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        if not admin:
            return None
        try:
            admin.role = AdminRoleEnum(role)
        except ValueError:
            admin.role = role
        admin.is_active = True
        db.commit()
        db.refresh(admin)
        return admin


auth_service = AuthService()
