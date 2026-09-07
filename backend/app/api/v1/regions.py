from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.node import RegionStatusResponse
from app.services.node_service import get_regions_status

router: APIRouter = APIRouter(
    prefix="/regions",
    tags=["regions"],
)


@router.get(
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
