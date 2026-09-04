from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionUpdate,
)
from app.services.subscription_service import (
    create_subscription,
    delete_subscription,
    get_subscription_by_id,
    get_subscriptions,
    update_subscription,
)

router: APIRouter = APIRouter(
    prefix="/admin/subscriptions",
    tags=["admin-subscriptions"],
    dependencies=[Depends(get_current_admin)],
)


@router.get(
    "",
    response_model=list[SubscriptionResponse],
    summary="List all subscriptions",
)
async def list_subscriptions_endpoint(
    db: AsyncSession = Depends(get_db),
) -> list[SubscriptionResponse]:
    """List all customer subscriptions."""
    subs = await get_subscriptions(db)
    return [SubscriptionResponse.model_validate(s) for s in subs]


@router.post(
    "",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new customer subscription",
)
async def create_subscription_endpoint(
    sub_in: SubscriptionCreate,
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    """Create a subscription with random token, UUID, and quota."""
    sub = await create_subscription(db, sub_in)
    return SubscriptionResponse.model_validate(sub)


@router.get(
    "/{sub_id}",
    response_model=SubscriptionResponse,
    summary="Get subscription details",
)
async def get_subscription_endpoint(
    sub_id: int,
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    """Get single subscription by ID."""
    sub = await get_subscription_by_id(db, sub_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription {sub_id} not found",
        )
    return SubscriptionResponse.model_validate(sub)


@router.patch(
    "/{sub_id}",
    response_model=SubscriptionResponse,
    summary="Update subscription (renew, add quota, change status)",
)
async def update_subscription_endpoint(
    sub_id: int,
    sub_in: SubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    """Update subscription parameters."""
    sub = await get_subscription_by_id(db, sub_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription {sub_id} not found",
        )
    updated = await update_subscription(db, sub, sub_in)
    return SubscriptionResponse.model_validate(updated)


@router.delete(
    "/{sub_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete subscription",
)
async def delete_subscription_endpoint(
    sub_id: int,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete a subscription."""
    sub = await get_subscription_by_id(db, sub_id)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription {sub_id} not found",
        )
    await delete_subscription(db, sub)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
