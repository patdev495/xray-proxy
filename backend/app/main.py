from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.api.v1.health import router as health_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, init_db
from app.services.user_service import seed_default_admin


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle handler."""
    # Startup: initialize database tables and default admin
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_default_admin(session)
    yield
    # Shutdown: cleanup if needed


app: FastAPI = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health endpoint: /api/health
app.include_router(health_router, prefix="/api")

# API v1 endpoints: /api/v1/...
app.include_router(api_router, prefix=settings.api_v1_prefix)
