from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.user import UserRole
import re

class UserBase(BaseModel):
    email: EmailStr
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$", description="Phone number in E.164 format")
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    role: UserRole = Field(default=UserRole.CLIENT, description="User Role: CLIENT, EMPLOYEE, or APPRAISER")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=72, description="Password must be at least 6 characters long and contain at least one uppercase letter.")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v

class UserUpdate(BaseModel):
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    
    class Config:
        from_attributes = True
