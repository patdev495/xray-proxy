from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.schemas.node import RegionStatusResponse
from app.schemas.region import RegionCreate, RegionResponse, RegionUpdate
from app.services.region_service import (
    create_region,
    delete_region,
    get_region_by_id,
    get_regions,
    get_regions_status,
    update_region,
)

# Compatibility router for /api/v1/regions
router: APIRouter = APIRouter(
    prefix="/regions",
    tags=["regions"],
)

admin_router: APIRouter = APIRouter(
    prefix="/admin/regions",
    tags=["admin-regions"],
    dependencies=[Depends(get_current_admin)],
)

public_router: APIRouter = APIRouter(
    prefix="/public/regions",
    tags=["public-regions"],
)


# --- Public Endpoints ---

@router.get(
    "/status",
    response_model=list[RegionStatusResponse],
    summary="Get capacity status of all regions",
)
@public_router.get(
    "/status",
    response_model=list[RegionStatusResponse],
    summary="Get capacity status of all regions",
)
async def get_regions_status_endpoint(
    db: AsyncSession = Depends(get_db),
) -> list[RegionStatusResponse]:
    """Public endpoint returning availability and slot capacity for all regions."""
    statuses = await get_regions_status(db)
    return [RegionStatusResponse.model_validate(s) for s in statuses]


@public_router.get(
    "",
    response_model=list[RegionResponse],
    summary="List active regions",
)
async def list_active_regions_endpoint(
    db: AsyncSession = Depends(get_db),
) -> list[RegionResponse]:
    """Public endpoint returning active regions for subscription creation."""
    regions = await get_regions(db, active_only=True)
    return [RegionResponse.model_validate(r) for r in regions]


# --- Admin Endpoints ---

@admin_router.get(
    "",
    response_model=list[RegionResponse],
    summary="List all regions",
)
async def list_all_regions_endpoint(
    db: AsyncSession = Depends(get_db),
) -> list[RegionResponse]:
    """Admin endpoint returning all regions."""
    regions = await get_regions(db, active_only=False)
    return [RegionResponse.model_validate(r) for r in regions]


@admin_router.post(
    "",
    response_model=RegionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a region",
)
async def create_region_endpoint(
    region_in: RegionCreate,
    db: AsyncSession = Depends(get_db),
) -> RegionResponse:
    """Admin endpoint creating a new region."""
    try:
        region = await create_region(db, region_in)
        return RegionResponse.model_validate(region)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@admin_router.get(
    "/{region_id}",
    response_model=RegionResponse,
    summary="Get region by ID",
)
async def get_region_endpoint(
    region_id: int,
    db: AsyncSession = Depends(get_db),
) -> RegionResponse:
    """Get single region by ID."""
    region = await get_region_by_id(db, region_id)
    if not region:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region not found")
    return RegionResponse.model_validate(region)


@admin_router.patch(
    "/{region_id}",
    response_model=RegionResponse,
    summary="Update a region",
)
async def update_region_endpoint(
    region_id: int,
    region_in: RegionUpdate,
    db: AsyncSession = Depends(get_db),
) -> RegionResponse:
    """Admin endpoint updating region details."""
    region = await get_region_by_id(db, region_id)
    if not region:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region not found")
    try:
        updated = await update_region(db, region, region_in)
        return RegionResponse.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@admin_router.delete(
    "/{region_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a region",
)
async def delete_region_endpoint(
    region_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Admin endpoint deleting a region."""
    region = await get_region_by_id(db, region_id)
    if not region:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Region not found")
    await delete_region(db, region)
