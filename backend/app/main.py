from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.api import api_router
from app.core.database import engine, Base, SessionLocal
# Import models to register them with Base.metadata
from app.models import user, valuation
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.future import select

# TODO: Remove this after testing
async def create_initial_data():
    async with SessionLocal() as session:
        # Check if users exist
        result = await session.execute(select(User).where(User.email.in_([
            "user@mail.com", "admin@mail.com", "appraiser@mail.com"
        ])))
        existing_users = result.scalars().all()
        existing_emails = {u.email for u in existing_users}

        users_to_create = []
        
        # Client
        if "user@mail.com" not in existing_emails:
            users_to_create.append(User(
                email="user@mail.com",
                phone="+43299754341",
                first_name="Client",
                last_name="User",
                middle_name="Test",
                role=UserRole.CLIENT,
                hashed_password=get_password_hash("string") # Valid password
            ))
        
        # Employee
        if "admin@mail.com" not in existing_emails:
            users_to_create.append(User(
                email="admin@mail.com",
                phone="+4329754341",
                first_name="Admin",
                last_name="Employee",
                middle_name="Test",
                role=UserRole.EMPLOYEE,
                hashed_password=get_password_hash("string")
            ))

        # Appraiser
        if "appraiser@mail.com" not in existing_emails:
            users_to_create.append(User(
                email="appraiser@mail.com",
                phone="+4399754341",
                first_name="Appraiser",
                last_name="User",
                middle_name="Test",
                role=UserRole.APPRAISER,
                hashed_password=get_password_hash("string")
            ))
            
        if users_to_create:
            session.add_all(users_to_create)
            await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # TODO: Remove this after testing
    await create_initial_data()
    
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.include_router(api_router, prefix=settings.API_V1_STR)


# cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to Real Estate Valuation CRM API"}
