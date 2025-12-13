import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    CLIENT = "CLIENT"
    EMPLOYEE = "EMPLOYEE"
    APPRAISER = "APPRAISER"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    
    role = Column(Enum(UserRole), default=UserRole.CLIENT, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    client_requests = relationship("ValuationRequest", back_populates="client", foreign_keys="[ValuationRequest.client_id]")
    appraiser_assignments = relationship("ValuationRequest", back_populates="appraiser", foreign_keys="[ValuationRequest.appraiser_id]")

