from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from app.models.valuation import RequestStatus
from app.models.user import UserRole

class CommentItem(BaseModel):
    role: UserRole
    text: str
    created_at: datetime
    user_name: Optional[str] = None # To show who wrote it

class ValuationRequestBase(BaseModel):
    address: str
    property_type: str
    room_count: int
    room_details: str

class ValuationRequestCreate(ValuationRequestBase):
    pass

class ValuationRequestUpdate(BaseModel):
    appraiser_id: Optional[int] = None
    status: Optional[RequestStatus] = None
    comment_text: Optional[str] = None # New comment to add
    assessment_date: Optional[datetime] = None # Date of assessment
    
    # Editable property fields
    address: Optional[str] = None
    property_type: Optional[str] = None
    room_count: Optional[int] = None
    room_details: Optional[str] = None

class ValuationRequestResponse(ValuationRequestBase):
    id: int
    status: RequestStatus
    client_id: int
    appraiser_id: Optional[int] = None
    assessment_date: Optional[datetime] = None
    
    comments: List[CommentItem] = []
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
