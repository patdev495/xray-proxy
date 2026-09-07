from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.schemas.plan import PlanCreate, PlanResponse, PlanUpdate
from app.services.plan_service import (
    create_plan,
    delete_plan,
    get_plan_by_id,
    get_plans,
    update_plan,
)

admin_router: APIRouter = APIRouter(
    prefix="/admin/plans",
    tags=["admin-plans"],
    dependencies=[Depends(get_current_admin)],
)

public_router: APIRouter = APIRouter(
    prefix="/public/plans",
    tags=["public-plans"],
)


def _to_response(plan) -> PlanResponse:
    quota_gb = int(plan.traffic_quota_bytes // (1024 * 1024 * 1024))
    return PlanResponse(
        id=plan.id,
        name=plan.name,
        price_vnd=plan.price_vnd,
        quota_gb=quota_gb,
        days_valid=plan.days_valid,
        allowed_regions=plan.allowed_regions or [],
        is_active=plan.is_active,
        sort_order=plan.sort_order,
        traffic_quota_bytes=plan.traffic_quota_bytes,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


# --- Admin Endpoints ---

@admin_router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan_endpoint(
    plan_in: PlanCreate,
    db: AsyncSession = Depends(get_db),
) -> PlanResponse:
    """Create a new subscription plan."""
    plan = await create_plan(db, plan_in)
    return _to_response(plan)


@admin_router.get("", response_model=list[PlanResponse])
async def list_all_plans_endpoint(
    db: AsyncSession = Depends(get_db),
) -> list[PlanResponse]:
    """List all plans including inactive ones."""
    plans = await get_plans(db, active_only=False)
    return [_to_response(p) for p in plans]


@admin_router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan_endpoint(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
) -> PlanResponse:
    """Get single plan by ID."""
    plan = await get_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return _to_response(plan)


@admin_router.patch("/{plan_id}", response_model=PlanResponse)
async def update_plan_endpoint(
    plan_id: int,
    plan_in: PlanUpdate,
    db: AsyncSession = Depends(get_db),
) -> PlanResponse:
    """Update a plan."""
    plan = await get_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    updated = await update_plan(db, plan, plan_in)
    return _to_response(updated)


@admin_router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan_endpoint(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a plan."""
    plan = await get_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    await delete_plan(db, plan)


# --- Public Endpoints ---

@public_router.get("", response_model=list[PlanResponse])
async def list_active_plans_endpoint(
    db: AsyncSession = Depends(get_db),
) -> list[PlanResponse]:
    """Public store endpoint listing active plans only."""
    plans = await get_plans(db, active_only=True)
    return [_to_response(p) for p in plans]
