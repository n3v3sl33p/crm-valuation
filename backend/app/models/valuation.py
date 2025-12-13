import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class RequestStatus(str, enum.Enum):
    CREATED = "CREATED" # Created by Client
    APPROVED_BY_EMPLOYEE = "APPROVED_BY_EMPLOYEE" # Approved by Employee
    APPRAISER_ASSIGNED = "APPRAISER_ASSIGNED" # Appraiser Assigned by Employee
    REPORT_SUBMITTED = "REPORT_SUBMITTED" # Report done by Appraiser
    REPORT_APPROVED_BY_EMPLOYEE = "REPORT_APPROVED_BY_EMPLOYEE" # Report approved by Employee
    COMPLETED = "COMPLETED" # Accepted by Client
    RETURNED_TO_EMPLOYEE = "RETURNED_TO_EMPLOYEE" # Rejected by Client

class ValuationRequest(Base):
    __tablename__ = "valuation_requests"

    id = Column(Integer, primary_key=True, index=True)
    
    # Property Details
    address = Column(String, nullable=False)
    property_type = Column(String, nullable=False)
    room_count = Column(Integer, nullable=False)
    room_details = Column(Text, nullable=False) # JSON or description
    
    status = Column(Enum(RequestStatus), default=RequestStatus.CREATED, nullable=False)
    
    # Workflow Data
    # Stores list of {role: str, text: str, created_at: str, action: str}
    comments = Column(JSON, default=list, nullable=False) 
    
    # Foreign Keys
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    appraiser_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    client = relationship("app.models.user.User", back_populates="client_requests", foreign_keys=[client_id])
    appraiser = relationship("app.models.user.User", back_populates="appraiser_assignments", foreign_keys=[appraiser_id])
