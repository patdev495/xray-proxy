from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.nodes import router as nodes_router
from app.api.v1.orders import admin_router as orders_admin_router, router as orders_router
from app.api.v1.payments import router as payments_router
from app.api.v1.plans import admin_router as plans_admin_router, public_router as plans_public_router
from app.api.v1.regions import (
    admin_router as regions_admin_router,
    public_router as regions_public_router,
    router as regions_router,
)
from app.api.v1.settings import admin_router as settings_admin_router, public_router as settings_public_router
from app.api.v1.portal import router as portal_router
from app.api.v1.subscriptions import router as subscriptions_router
from app.api.v1.sync import router as sync_router

api_router: APIRouter = APIRouter()
api_router.include_router(health_router, prefix="", tags=["health"])
api_router.include_router(auth_router)
api_router.include_router(portal_router)
api_router.include_router(orders_router)
api_router.include_router(orders_admin_router)
api_router.include_router(payments_router)
api_router.include_router(nodes_router)
api_router.include_router(plans_admin_router)
api_router.include_router(plans_public_router)
api_router.include_router(regions_router)
api_router.include_router(regions_admin_router)
api_router.include_router(regions_public_router)
api_router.include_router(settings_admin_router)
api_router.include_router(settings_public_router)
api_router.include_router(subscriptions_router)
api_router.include_router(sync_router)



