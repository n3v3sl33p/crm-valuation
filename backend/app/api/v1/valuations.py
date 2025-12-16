from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models.user import User, UserRole
from app.models.valuation import ValuationRequest, RequestStatus
from app.schemas.valuation import ValuationRequestCreate, ValuationRequestResponse, ValuationRequestUpdate

router = APIRouter()

@router.post("/", response_model=ValuationRequestResponse)
async def create_valuation_request(
    request_in: ValuationRequestCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new valuation request. Only Clients can create.
    Initial status is DRAFT.
    """
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can create requests")
    
    valuation_request = ValuationRequest(
        **request_in.model_dump(),
        client_id=current_user.id,
        status=RequestStatus.DRAFT,
        comments=[] # Initialize empty list
    )
    db.add(valuation_request)
    await db.commit()
    await db.refresh(valuation_request)
    return valuation_request

@router.get("/", response_model=List[ValuationRequestResponse])
async def read_valuation_requests(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve valuation requests. Visibility depends on role.
    Employee sees all EXCEPT Drafts.
    """
    query = select(ValuationRequest)
    
    if current_user.role == UserRole.CLIENT:
        query = query.where(ValuationRequest.client_id == current_user.id)
    elif current_user.role == UserRole.APPRAISER:
        query = query.where(ValuationRequest.appraiser_id == current_user.id)
    elif current_user.role == UserRole.EMPLOYEE:
        # Employee should not see drafts
        query = query.where(ValuationRequest.status != RequestStatus.DRAFT)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{id}", response_model=ValuationRequestResponse)
async def read_valuation_request(
    id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a specific valuation request.
    """
    result = await db.execute(select(ValuationRequest).where(ValuationRequest.id == id))
    valuation_request = result.scalars().first()
    
    if not valuation_request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    # Permission check
    if current_user.role == UserRole.CLIENT and valuation_request.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")
    if current_user.role == UserRole.APPRAISER and valuation_request.appraiser_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")
    if current_user.role == UserRole.EMPLOYEE and valuation_request.status == RequestStatus.DRAFT:
         raise HTTPException(status_code=404, detail="Request not found") 
        
    return valuation_request

@router.patch("/{id}", response_model=ValuationRequestResponse)
async def update_valuation_request(
    id: int,
    request_in: ValuationRequestUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update valuation request status/fields and add comments.
    """
    result = await db.execute(select(ValuationRequest).where(ValuationRequest.id == id))
    valuation_request = result.scalars().first()
    
    if not valuation_request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Helper to append comment
    def add_comment(text: str):
        if not text:
             return
        new_comment = {
            "role": current_user.role.value,
            "text": text,
            "created_at": datetime.utcnow().isoformat(),
            "user_name": f"{current_user.first_name} {current_user.last_name}"
        }
        current_comments = list(valuation_request.comments) if valuation_request.comments else []
        current_comments.append(new_comment)
        valuation_request.comments = current_comments

    # Helper to validate appraiser
    async def validate_appraiser(appraiser_id: int) -> User:
        result = await db.execute(select(User).where(User.id == appraiser_id))
        appraiser = result.scalars().first()
        if not appraiser:
            raise HTTPException(status_code=404, detail=f"User with ID {appraiser_id} not found")
        if appraiser.role != UserRole.APPRAISER:
            raise HTTPException(status_code=400, detail=f"User with ID {appraiser_id} is not an APPRAISER")
        return appraiser

    # --- Property Details Updates ---
    has_property_updates = any([
        request_in.address is not None,
        request_in.property_type is not None,
        request_in.room_count is not None,
        request_in.room_details is not None
    ])
    
    if has_property_updates:
        can_edit = False
        if current_user.role == UserRole.EMPLOYEE:
            can_edit = True
        elif current_user.role == UserRole.CLIENT and valuation_request.client_id == current_user.id:
            # Client can edit only in DRAFT or RETURNED_TO_CLIENT
            if valuation_request.status in [RequestStatus.DRAFT, RequestStatus.RETURNED_TO_CLIENT]:
                can_edit = True
        
        if can_edit:
            if request_in.address is not None: valuation_request.address = request_in.address
            if request_in.property_type is not None: valuation_request.property_type = request_in.property_type
            if request_in.room_count is not None: valuation_request.room_count = request_in.room_count
            if request_in.room_details is not None: valuation_request.room_details = request_in.room_details
        else:
             raise HTTPException(status_code=403, detail="Cannot edit property details at this stage or with your role")


    # --- Employee Logic ---
    if current_user.role == UserRole.EMPLOYEE:
        # Return to Client
        if request_in.status == RequestStatus.RETURNED_TO_CLIENT:
            if valuation_request.status != RequestStatus.CREATED:
                 raise HTTPException(status_code=400, detail="Can only return CREATED requests to client")
            if not request_in.comment_text:
                 raise HTTPException(status_code=400, detail="Reason for return is required")
            
            valuation_request.status = RequestStatus.RETURNED_TO_CLIENT
            add_comment(request_in.comment_text)

        # 1. Approve Request
        elif request_in.status == RequestStatus.APPROVED_BY_EMPLOYEE:
             if valuation_request.status != RequestStatus.CREATED and valuation_request.status != RequestStatus.RETURNED_TO_EMPLOYEE:
                  raise HTTPException(status_code=400, detail="Can only approve CREATED or RETURNED_TO_EMPLOYEE requests")
             valuation_request.status = RequestStatus.APPROVED_BY_EMPLOYEE
             
             # 2. Assign Appraiser (if both actions in one request)
             if request_in.appraiser_id:
                 await validate_appraiser(request_in.appraiser_id)
                 if not request_in.assessment_date:
                     raise HTTPException(status_code=400, detail="Assessment date is required when assigning appraiser")
                 
                 valuation_request.appraiser_id = request_in.appraiser_id
                 valuation_request.assessment_date = request_in.assessment_date
                 valuation_request.status = RequestStatus.APPRAISER_ASSIGNED
                 add_comment(request_in.comment_text or f"Request approved and appraiser assigned (ID: {request_in.appraiser_id}). Date: {request_in.assessment_date}")
             else:
                 add_comment(request_in.comment_text or "Request approved by employee.")

        # 2. Assign Appraiser (only if not already handled above)
        elif request_in.appraiser_id:
             if valuation_request.status != RequestStatus.APPROVED_BY_EMPLOYEE:
                  raise HTTPException(status_code=400, detail="Approve request before assigning appraiser")
             await validate_appraiser(request_in.appraiser_id)
             
             if not request_in.assessment_date:
                     raise HTTPException(status_code=400, detail="Assessment date is required when assigning appraiser")

             valuation_request.appraiser_id = request_in.appraiser_id
             valuation_request.assessment_date = request_in.assessment_date
             valuation_request.status = RequestStatus.APPRAISER_ASSIGNED
             add_comment(request_in.comment_text or f"Appraiser assigned (ID: {request_in.appraiser_id}). Date: {request_in.assessment_date}")

        # Return Report to Appraiser
        elif request_in.status == RequestStatus.RETURNED_TO_APPRAISER:
             if valuation_request.status not in [RequestStatus.REPORT_SUBMITTED, RequestStatus.RETURNED_TO_EMPLOYEE]:
                  raise HTTPException(status_code=400, detail="Can only return reports that are submitted or returned by client")
             if not request_in.comment_text:
                  raise HTTPException(status_code=400, detail="Reason for return is required")
             
             valuation_request.status = RequestStatus.RETURNED_TO_APPRAISER
             add_comment(request_in.comment_text)

        # 3. Approve Report
        elif request_in.status == RequestStatus.REPORT_APPROVED_BY_EMPLOYEE:
             if valuation_request.status != RequestStatus.REPORT_SUBMITTED:
                  raise HTTPException(status_code=400, detail="Report must be submitted before approval")
             valuation_request.status = RequestStatus.REPORT_APPROVED_BY_EMPLOYEE
             add_comment(request_in.comment_text or "Report approved by employee.")

        # Allow Employee to just comment
        elif request_in.comment_text and not request_in.status and not request_in.appraiser_id:
             add_comment(request_in.comment_text)


    # --- Appraiser Logic ---
    elif current_user.role == UserRole.APPRAISER:
        if valuation_request.appraiser_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not your assignment")
        
        # Self-cancellation
        if request_in.status == RequestStatus.APPROVED_BY_EMPLOYEE:
             if valuation_request.status != RequestStatus.APPRAISER_ASSIGNED:
                  raise HTTPException(status_code=400, detail="Can only cancel assignment if in assigned status")
             
             add_comment(request_in.comment_text or "Appraiser declined the assignment.")
             valuation_request.appraiser_id = None
             valuation_request.assessment_date = None
             valuation_request.status = RequestStatus.APPROVED_BY_EMPLOYEE
             
        # 4. Submit Report
        elif request_in.status == RequestStatus.REPORT_SUBMITTED:
             if valuation_request.status not in [RequestStatus.APPRAISER_ASSIGNED, RequestStatus.RETURNED_TO_APPRAISER]:
                  raise HTTPException(status_code=400, detail="Cannot submit report at this stage")
             
             if not request_in.comment_text:
                  raise HTTPException(status_code=400, detail="Report content (comment) is required")
                  
             valuation_request.status = RequestStatus.REPORT_SUBMITTED
             add_comment(request_in.comment_text) 

        # Allow Appraiser to comment
        elif request_in.comment_text and not request_in.status:
             add_comment(request_in.comment_text)

    # --- Client Logic ---
    elif current_user.role == UserRole.CLIENT:
        if valuation_request.client_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not your request")

        # Submit / Resubmit
        if request_in.status == RequestStatus.CREATED:
            if valuation_request.status not in [RequestStatus.DRAFT, RequestStatus.RETURNED_TO_CLIENT]:
                raise HTTPException(status_code=400, detail="Can only submit DRAFT or RETURNED_TO_CLIENT requests")
            
            valuation_request.status = RequestStatus.CREATED
            add_comment(request_in.comment_text or "Request submitted to employee.")

        # 5. Review Report
        elif request_in.status == RequestStatus.COMPLETED:
             if valuation_request.status != RequestStatus.REPORT_APPROVED_BY_EMPLOYEE:
                  raise HTTPException(status_code=400, detail="Report not ready for final approval")
             valuation_request.status = RequestStatus.COMPLETED
             add_comment(request_in.comment_text or "Client accepted the report.")
        
        elif request_in.status == RequestStatus.RETURNED_TO_EMPLOYEE:
             if valuation_request.status != RequestStatus.REPORT_APPROVED_BY_EMPLOYEE:
                  raise HTTPException(status_code=400, detail="Report not ready for review")
             if not request_in.comment_text:
                 raise HTTPException(status_code=400, detail="Reason for return is required")
             
             valuation_request.status = RequestStatus.RETURNED_TO_EMPLOYEE
             add_comment(request_in.comment_text)

        # Allow Client to comment
        elif request_in.comment_text and not request_in.status:
             add_comment(request_in.comment_text)

    else:
        pass

    # Save changes
    db.add(valuation_request)
    await db.commit()
    await db.refresh(valuation_request)
    return valuation_request

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_valuation_request(
    id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> None:
    """
    Delete a valuation request.
    Only EMPLOYEE can delete any request.
    CLIENT can delete their own request if it is in DRAFT or CREATED state.
    """
    result = await db.execute(select(ValuationRequest).where(ValuationRequest.id == id))
    valuation_request = result.scalars().first()
    
    if not valuation_request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if current_user.role == UserRole.EMPLOYEE:
        pass # OK
    elif current_user.role == UserRole.CLIENT:
        if valuation_request.client_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to delete this request")
        if valuation_request.status not in [RequestStatus.DRAFT, RequestStatus.CREATED]:
             raise HTTPException(status_code=400, detail="Can only delete requests in DRAFT or CREATED status")
    else:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    await db.delete(valuation_request)
    await db.commit()
