from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import re

from core.database import get_db
from core.config import settings
from core.security import get_current_user, require_role
from models.enums import AdminRoleEnum
from models.document import EmployeeDocument
from schemas.extras import DocumentResponse
from utils import log_audit

router = APIRouter(prefix="/api/v1/employees", tags=["Documents"])

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# File validation
ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # Convert MB to bytes


def _validate_file(file: UploadFile):
    """Validate file type and size."""
    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB")

    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"Invalid file type. Allowed: {', '.join(ALLOWED_MIME_TYPES)}")

    return True


def _sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path injection."""
    # Remove any path components
    filename = os.path.basename(filename)
    # Remove special characters except alphanumeric, dash, underscore, dot
    filename = re.sub(r'[^a-zA-Z0-9\-_\.]', '_', filename)
    # Limit length
    if len(filename) > 200:
        filename = filename[:200]
    return filename


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
        raise HTTPException(500, f"Upload failed")


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

    # Validate file
    _validate_file(file)

    contents = await file.read()

    # Double-check size after reading (in case client lied)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB")

    # Sanitize filename
    safe_filename = _sanitize_filename(file.filename)
    safe_name = f"{emp.employee_id}_{doc_type}_{safe_filename}"
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
