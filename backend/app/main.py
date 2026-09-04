import asyncio
from collections.abc import AsyncGenerator
import contextlib
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.api.v1.health import router as health_router
from app.api.v1.public_sub import router as public_sub_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, init_db
from app.services.user_service import seed_default_admin
from app.services.xray_grpc_service import sync_all_nodes_stats_and_enforce

logger = logging.getLogger(__name__)



async def periodic_poller_task(interval_seconds: int = 300) -> None:
    """Periodically query stats from active nodes and enforce limits."""
    logger.info("Starting periodic Xray sync poller (interval: %ds)", interval_seconds)
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            async with AsyncSessionLocal() as session:
                await sync_all_nodes_stats_and_enforce(session)
        except asyncio.CancelledError:
            logger.info("Periodic Xray sync poller cancelled.")
            break
        except Exception as exc:
            logger.error("Error in periodic Xray sync poller: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle handler."""
    # Startup: initialize database tables and default admin
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_default_admin(session)

    # Start periodic poller in background
    poller = asyncio.create_task(periodic_poller_task(300))
    yield
    # Shutdown: cancel background poller
    poller.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await poller



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

# Root-level public subscription endpoint: /sub/{token}
app.include_router(public_sub_router)

# API v1 endpoints: /api/v1/...
app.include_router(api_router, prefix=settings.api_v1_prefix)

