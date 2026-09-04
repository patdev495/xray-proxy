from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.nodes import router as nodes_router
from app.api.v1.subscriptions import router as subscriptions_router

api_router: APIRouter = APIRouter()
api_router.include_router(health_router, prefix="", tags=["health"])
api_router.include_router(auth_router)
api_router.include_router(nodes_router)
api_router.include_router(subscriptions_router)
