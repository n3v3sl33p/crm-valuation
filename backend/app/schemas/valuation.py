from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.models.valuation import RequestStatus, PropertyType
from app.models.user import UserRole

class CommentItem(BaseModel):
    role: UserRole
    text: str
    created_at: datetime
    user_name: Optional[str] = None

class ValuationRequestBase(BaseModel):
    # Location
    city: str
    street: str
    house_number: str
    
    # Type and Details
    property_type: PropertyType
    description: Optional[str] = Field(None, description="Comment to request / Additional details")

    # Optional specifics
    apartment_number: Optional[str] = None
    floor: Optional[int] = None
    office_number: Optional[str] = None

class ValuationRequestCreate(ValuationRequestBase):
    pass

class ValuationRequestUpdate(BaseModel):
    appraiser_id: Optional[int] = None
    status: Optional[RequestStatus] = None
    comment_text: Optional[str] = None
    assessment_date: Optional[datetime] = None
    
    # Editable property fields (Client)
    city: Optional[str] = None
    street: Optional[str] = None
    house_number: Optional[str] = None
    property_type: Optional[PropertyType] = None
    description: Optional[str] = None
    apartment_number: Optional[str] = None
    floor: Optional[int] = None
    office_number: Optional[str] = None
    
    # Appraiser Report Fields
    report_url: Optional[str] = None
    final_price: Optional[float] = None
    condition_score: Optional[int] = Field(None, ge=1, le=10, description="Score 1-10")
    location_score: Optional[int] = Field(None, ge=1, le=10, description="Score 1-10")
    liquidity_score: Optional[int] = Field(None, ge=1, le=10, description="Score 1-10")
    material_quality_score: Optional[int] = Field(None, ge=1, le=10, description="Score 1-10")
    legal_purity_score: Optional[int] = Field(None, ge=1, le=10, description="Score 1-10")

class ValuationRequestResponse(ValuationRequestBase):
    id: int
    status: RequestStatus
    client_id: int
    appraiser_id: Optional[int] = None
    assessment_date: Optional[datetime] = None
    
    # Report Data
    report_url: Optional[str] = None
    final_price: Optional[float] = None
    condition_score: Optional[int] = None
    location_score: Optional[int] = None
    liquidity_score: Optional[int] = None
    material_quality_score: Optional[int] = None
    legal_purity_score: Optional[int] = None
    
    comments: List[CommentItem] = []
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
