from fastapi import APIRouter

from app.api.v1 import auth, users, valuations

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(valuations.router, prefix="/valuations", tags=["valuations"])

