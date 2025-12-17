import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone, timedelta

# Helper for MSK time
def get_msk_now():
    return datetime.now(timezone(timedelta(hours=3)))

class RequestStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CREATED = "CREATED"
    RETURNED_TO_CLIENT = "RETURNED_TO_CLIENT"
    APPROVED_BY_EMPLOYEE = "APPROVED_BY_EMPLOYEE"
    APPRAISER_ASSIGNED = "APPRAISER_ASSIGNED"
    REPORT_SUBMITTED = "REPORT_SUBMITTED"
    RETURNED_TO_APPRAISER = "RETURNED_TO_APPRAISER"
    REPORT_APPROVED_BY_EMPLOYEE = "REPORT_APPROVED_BY_EMPLOYEE"
    COMPLETED = "COMPLETED"
    RETURNED_TO_EMPLOYEE = "RETURNED_TO_EMPLOYEE"

class PropertyType(str, enum.Enum):
    APARTMENT = "APARTMENT"      # Квартира
    HOUSE = "HOUSE"              # Жилой дом
    OFFICE = "OFFICE"            # Офисное помещение
    WAREHOUSE = "WAREHOUSE"      # Склад
    COMMERCIAL = "COMMERCIAL"    # Торговое помещение

class ValuationRequest(Base):
    __tablename__ = "valuation_requests"

    id = Column(Integer, primary_key=True, index=True)
    
    # --- Location Details ---
    city = Column(String, nullable=False)
    street = Column(String, nullable=False)
    house_number = Column(String, nullable=False)
    
    # --- Property Specifics ---
    property_type = Column(Enum(PropertyType), nullable=False)
    
    # Optional fields depending on type
    apartment_number = Column(String, nullable=True) # For APARTMENT
    floor = Column(Integer, nullable=True)           # For APARTMENT, OFFICE
    office_number = Column(String, nullable=True)    # For OFFICE
    
    # General details
    description = Column(Text, nullable=True)    # Client comment / Additional details
    
    status = Column(Enum(RequestStatus), default=RequestStatus.DRAFT, nullable=False)
    
    # --- Appraiser Report Data ---
    report_url = Column(String, nullable=True) # Link to file
    final_price = Column(Float, nullable=True) # Estimated value
    
    # 5 Basic Criteria (1-10 or similar)
    condition_score = Column(Integer, nullable=True)      # Состояние (ремонт)
    location_score = Column(Integer, nullable=True)       # Расположение/Инфраструктура
    liquidity_score = Column(Integer, nullable=True)      # Ликвидность объекта
    material_quality_score = Column(Integer, nullable=True) # Качество материалов/постройки
    legal_purity_score = Column(Integer, nullable=True)   # Юридическая чистота (предварительная)

    # Workflow Data
    comments = Column(JSON, default=list, nullable=False) 
    
    assessment_date = Column(DateTime(timezone=True), nullable=True)

    # Foreign Keys
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    appraiser_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps (Stored as MSK time for simplicity based on user request)
    created_at = Column(DateTime(timezone=True), default=get_msk_now)
    updated_at = Column(DateTime(timezone=True), default=get_msk_now, onupdate=get_msk_now)
    
    # Relationships
    client = relationship("app.models.user.User", back_populates="client_requests", foreign_keys=[client_id])
    appraiser = relationship("app.models.user.User", back_populates="appraiser_assignments", foreign_keys=[appraiser_id])
