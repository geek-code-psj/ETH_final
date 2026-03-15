from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os

from core.database import get_db
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from models.document import EmployeeDocument
from schemas.extras import DocumentResponse
from utils import log_audit

router = APIRouter(prefix="/api/v1/employees", tags=["Documents"])

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

def _upload_to_cloudinary(file_bytes: bytes, filename: str, folder: str = "hrms_docs"):
    """Upload a file to Cloudinary and return (url, public_id)."""
    if not all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
        raise HTTPException(500, "Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars.")
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True
        )
        import io
        result = cloudinary.uploader.upload(
            io.BytesIO(file_bytes),
            folder=folder,
            resource_type="raw",
            public_id=filename
        )
        return result["secure_url"], result["public_id"]
    except ImportError:
        raise HTTPException(500, "cloudinary package not installed. Run: pip install cloudinary")
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")


@router.get("/{employee_id}/documents", response_model=list[DocumentResponse])
def list_documents(
    employee_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_user)
):
    docs = db.query(EmployeeDocument).filter(
        EmployeeDocument.employee_id == employee_id
    ).order_by(EmployeeDocument.created_at.desc()).all()
    return docs


@router.post("/{employee_id}/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(
    employee_id: int,
    doc_type: str = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager]))
):
    from models.employee import Employee
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")

    contents = await file.read()
    safe_name = f"{emp.employee_id}_{doc_type}_{file.filename}"
    file_url, public_id = _upload_to_cloudinary(contents, safe_name)

    doc = EmployeeDocument(
        employee_id=employee_id,
        doc_type=doc_type,
        file_name=file.filename,
        file_url=file_url,
        public_id=public_id,
        file_size=len(contents),
        mime_type=file.content_type,
        notes=notes,
        uploaded_by=current_admin.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    log_audit(db, current_admin, "CREATE", "document", doc.id, {"employee_id": employee_id, "type": doc_type})
    return doc


@router.delete("/{employee_id}/documents/{doc_id}", status_code=204)
def delete_document(
    employee_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_role([AdminRoleEnum.admin, AdminRoleEnum.hr_manager]))
):
    doc = db.query(EmployeeDocument).filter(
        EmployeeDocument.id == doc_id,
        EmployeeDocument.employee_id == employee_id
    ).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Try Cloudinary delete
    if doc.public_id and all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
        try:
            import cloudinary, cloudinary.uploader
            cloudinary.config(cloud_name=CLOUDINARY_CLOUD_NAME, api_key=CLOUDINARY_API_KEY, api_secret=CLOUDINARY_API_SECRET)
            cloudinary.uploader.destroy(doc.public_id, resource_type="raw")
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    log_audit(db, current_admin, "DELETE", "document", doc_id, {})
