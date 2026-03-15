from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class EmployeeDocument(Base):
    """Uploaded documents for an employee."""
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    doc_type = Column(String(50), nullable=False)   # resume, id_proof, contract, photo, other
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(1000), nullable=False)
    public_id = Column(String(255))  # Cloudinary public_id for deletion
    file_size = Column(Integer)      # bytes
    mime_type = Column(String(100))
    notes = Column(Text)
    uploaded_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", backref="documents")
