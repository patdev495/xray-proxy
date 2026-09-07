from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.order import OrderResponse
from app.schemas.subscription import (
    EligibleNodeResponse,
    RenewSubscriptionRequest,
    SubscriptionResponse,
    SwitchNodeRequest,
)
from app.services.order_service import to_order_response
from app.services.portal_service import (
    create_renewal_order_for_subscription,
    get_customer_subscriptions,
    get_eligible_nodes_for_switch,
    switch_subscription_node,
)

router: APIRouter = APIRouter(
    prefix="/portal",
    tags=["customer-portal"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/subscriptions", response_model=list[SubscriptionResponse])
async def list_my_subscriptions_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SubscriptionResponse]:
    """Retrieve all subscriptions owned by currently authenticated customer."""
    return await get_customer_subscriptions(db, user_id=current_user.id)


@router.get("/subscriptions/{sub_id}/eligible-nodes", response_model=list[EligibleNodeResponse])
async def list_eligible_nodes_endpoint(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[EligibleNodeResponse]:
    """List available nodes with free capacity in same region for switching."""
    return await get_eligible_nodes_for_switch(db, subscription_id=sub_id, user_id=current_user.id)


@router.post("/subscriptions/{sub_id}/switch-node", response_model=SubscriptionResponse)
async def switch_node_endpoint(
    sub_id: int,
    payload: SwitchNodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse:
    """Migrate subscription to new node via gRPC while retaining client UUID & token."""
    return await switch_subscription_node(
        db,
        subscription_id=sub_id,
        user_id=current_user.id,
        target_node_id=payload.target_node_id,
    )


@router.post("/subscriptions/{sub_id}/renew", response_model=OrderResponse)
async def renew_subscription_endpoint(
    sub_id: int,
    payload: RenewSubscriptionRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    """Create renewal Order for customer subscription with VietQR payment instructions."""
    plan_id = payload.plan_id if payload else None
    order = await create_renewal_order_for_subscription(
        db,
        subscription_id=sub_id,
        user_id=current_user.id,
        plan_id=plan_id,
    )
    return await to_order_response(order, db)
