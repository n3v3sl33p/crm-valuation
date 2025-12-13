from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.core import security
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Create new user.
    """
    # Check if user with this email or phone exists
    result_email = await db.execute(select(User).where(User.email == user_in.email))
    if result_email.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
        
    result_phone = await db.execute(select(User).where(User.phone == user_in.phone))
    if result_phone.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="The user with this phone number already exists.",
        )
    
    user = User(
        email=user_in.email,
        phone=user_in.phone,
        hashed_password=security.get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        middle_name=user_in.middle_name,
        role=user_in.role # User can choose role or we default to CLIENT? For MVP let them choose, usually this is restricted.
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/me", response_model=UserResponse)
async def read_user_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

# Endpoint to list apprasiers (for Employee to assign)
@router.get("/appraisers", response_model=List[UserResponse])
async def read_appraisers(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role != UserRole.EMPLOYEE:
         raise HTTPException(status_code=403, detail="Not enough permissions")
         
    result = await db.execute(select(User).where(User.role == UserRole.APPRAISER))
    appraisers = result.scalars().all()
    return appraisers

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> None:
    """
    Delete a user. Only EMPLOYEE can delete users.
    """
    if current_user.role != UserRole.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await db.delete(user)
    await db.commit()
