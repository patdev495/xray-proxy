from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.node import Node
from app.models.order import Order
from app.models.plan import Plan
from app.models.region import Region
from app.models.subscription import Subscription, SubscriptionStatus
from app.schemas.subscription import (
    EligibleNodeResponse,
    SubscriptionResponse,
)
from app.services.node_service import get_node_active_subscriptions_count
from app.services.order_service import create_order
from app.services.xray_grpc_service import add_user_to_node, remove_user_from_node


def to_subscription_response(sub: Subscription) -> SubscriptionResponse:
    """Format Subscription into response model with full metadata and subscription_url."""
    node_names = [n.name for n in sub.nodes] if sub.nodes else []
    node_ids = [n.id for n in sub.nodes] if sub.nodes else []
    sub_url = f"/api/v1/subscriptions/{sub.token}/sub"

    created_at = sub.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    expires_at = sub.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    return SubscriptionResponse(
        id=sub.id,
        customer_name=sub.customer_name,
        token=sub.token,
        uuid=sub.uuid,
        traffic_quota_bytes=sub.traffic_quota_bytes,
        traffic_used_bytes=sub.traffic_used_bytes,
        expires_at=expires_at,
        status=sub.status,
        created_at=created_at,
        node_ids=node_ids,
        node_names=node_names,
        subscription_url=sub_url,
        plan_id=sub.plan_id,
        plan_name=sub.plan_name,
        region_id=sub.region_id,
        region_code=sub.region_code,
        region_name=sub.region_name,
        region_flag=sub.region_flag,
    )


async def get_customer_subscriptions(
    db: AsyncSession,
    user_id: int,
) -> list[SubscriptionResponse]:
    """Retrieve all subscriptions belonging to customer with eager-loaded relations."""
    stmt = (
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .options(
            selectinload(Subscription.nodes),
            selectinload(Subscription.plan),
            selectinload(Subscription.region),
        )
        .order_by(Subscription.id.desc())
    )
    result = await db.execute(stmt)
    subs = list(result.scalars().all())
    return [to_subscription_response(s) for s in subs]


async def get_customer_subscription_by_id(
    db: AsyncSession,
    subscription_id: int,
    user_id: int,
) -> Subscription:
    """Fetch subscription verifying customer ownership."""
    stmt = (
        select(Subscription)
        .where(Subscription.id == subscription_id)
        .options(
            selectinload(Subscription.nodes),
            selectinload(Subscription.plan),
            selectinload(Subscription.region),
        )
    )
    res = await db.execute(stmt)
    sub = res.scalar_one_or_none()
    if not sub or sub.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found or access denied",
        )
    return sub


async def get_eligible_nodes_for_switch(
    db: AsyncSession,
    subscription_id: int,
    user_id: int,
) -> list[EligibleNodeResponse]:
    """Find active nodes in same region with available capacity, excluding current node."""
    sub = await get_customer_subscription_by_id(db, subscription_id, user_id)

    # Determine region
    region_id = sub.region_id
    region_code = sub.region_code
    if not region_id and sub.nodes:
        region_id = sub.nodes[0].region_id
        region_code = sub.nodes[0].flag

    if not region_id and not region_code:
        return []

    conditions: list[ColumnElement[bool]] = [Node.is_active.is_(True)]
    if region_id is not None:
        conditions.append(Node.region_id == region_id)
    elif region_code:
        conditions.append(Node.flag == region_code)

    current_node_ids = {n.id for n in sub.nodes}
    result = await db.execute(select(Node).where(*conditions))
    nodes = list(result.scalars().all())

    eligible: list[EligibleNodeResponse] = []
    for node in nodes:
        if node.id in current_node_ids:
            continue

        active_count = await get_node_active_subscriptions_count(db, node.id)
        if active_count < node.max_subscriptions:
            eligible.append(
                EligibleNodeResponse(
                    id=node.id,
                    name=node.name,
                    host=node.host,
                    flag=node.flag,
                    location=node.location,
                    available_slots=node.max_subscriptions - active_count,
                    max_subscriptions=node.max_subscriptions,
                )
            )

    return eligible


async def switch_subscription_node(
    db: AsyncSession,
    subscription_id: int,
    user_id: int,
    target_node_id: int,
) -> SubscriptionResponse:
    """Migrate customer subscription to destination node in same region."""
    sub = await get_customer_subscription_by_id(db, subscription_id, user_id)

    # Validate target node
    res = await db.execute(select(Node).where(Node.id == target_node_id))
    target_node = res.scalar_one_or_none()
    if not target_node or not target_node.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected node is inactive or unavailable",
        )

    # Region compatibility check
    if sub.region_id is not None and target_node.region_id is not None:
        if target_node.region_id != sub.region_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target node is not in the same region as subscription",
            )

    current_node_ids = {n.id for n in sub.nodes}
    if target_node.id in current_node_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription is already assigned to this node",
        )

    # Capacity check
    active_count = await get_node_active_subscriptions_count(db, target_node.id)
    if active_count >= target_node.max_subscriptions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected node has reached maximum capacity",
        )

    # Sync via gRPC: remove from old nodes, add to new node
    for old_node in sub.nodes:
        remove_user_from_node(old_node, sub.token)

    add_user_to_node(target_node, sub.uuid, sub.token)

    # Update database associations
    sub.nodes = [target_node]
    if target_node.region_id:
        sub.region_id = target_node.region_id

    await db.commit()
    await db.refresh(sub)

    # Re-fetch with loaded relations
    reloaded = await get_customer_subscription_by_id(db, sub.id, user_id)
    return to_subscription_response(reloaded)


async def create_renewal_order_for_subscription(
    db: AsyncSession,
    subscription_id: int,
    user_id: int,
    plan_id: int | None = None,
) -> Order:
    """Create renewal Order pre-populated with subscription's region and plan."""
    sub = await get_customer_subscription_by_id(db, subscription_id, user_id)

    target_plan_id = plan_id or sub.plan_id
    if not target_plan_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No plan specified and subscription has no linked plan",
        )

    region_code = sub.region_code
    if not region_code and sub.nodes and sub.nodes[0].flag:
        region_code = sub.nodes[0].flag
    if not region_code:
        region_code = "VN"

    order = await create_order(
        db=db,
        user_id=user_id,
        plan_id=target_plan_id,
        region=region_code,
        subscription_id=sub.id,
    )
    return order
