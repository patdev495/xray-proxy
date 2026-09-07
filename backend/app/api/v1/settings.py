from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.schemas.setting import SystemSettingsResponse, SystemSettingsUpdate
from app.services.setting_service import get_system_settings, update_system_settings

admin_router: APIRouter = APIRouter(
    prefix="/admin/settings",
    tags=["admin-settings"],
    dependencies=[Depends(get_current_admin)],
)

public_router: APIRouter = APIRouter(
    prefix="/public/settings",
    tags=["public-settings"],
)


@admin_router.get("", response_model=SystemSettingsResponse)
async def get_admin_settings_endpoint(
    db: AsyncSession = Depends(get_db),
) -> SystemSettingsResponse:
    """Get all system settings."""
    settings = await get_system_settings(db)
    return SystemSettingsResponse.model_validate(settings)


@admin_router.put("", response_model=SystemSettingsResponse)
async def update_admin_settings_endpoint(
    payload: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
) -> SystemSettingsResponse:
    """Update system settings."""
    updated = await update_system_settings(db, payload.model_dump())
    return SystemSettingsResponse.model_validate(updated)


@public_router.get("", response_model=SystemSettingsResponse)
async def get_public_settings_endpoint(
    db: AsyncSession = Depends(get_db),
) -> SystemSettingsResponse:
    """Public endpoint returning support channel URLs."""
    settings = await get_system_settings(db)
    return SystemSettingsResponse.model_validate(settings)
