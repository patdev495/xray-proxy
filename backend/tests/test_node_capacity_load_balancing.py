import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node
from app.models.subscription import Subscription, SubscriptionStatus
from app.schemas.node import NodeCreate, NodeUpdate
from app.services.node_service import (
    RegionOutOfCapacityError,
    allocate_node_for_region,
    create_node,
    get_node_by_id,
    get_regions_status,
    update_node,
)
from app.services.subscription_service import create_subscription
from app.schemas.subscription import SubscriptionCreate


@pytest.mark.asyncio
async def test_node_capacity_default_and_update(db_session: AsyncSession):
    # Default is 100
    node = await create_node(
        db_session,
        NodeCreate(
            name="Node Cap Default",
            host="1.1.1.1",
            flag="🇻🇳",
        ),
    )
    assert node.max_subscriptions == 100

    # Custom capacity
    node_custom = await create_node(
        db_session,
        NodeCreate(
            name="Node Cap 50",
            host="1.1.1.2",
            flag="🇻🇳",
            max_subscriptions=50,
        ),
    )
    assert node_custom.max_subscriptions == 50

    # Update capacity
    updated = await update_node(
        db_session,
        node_custom,
        NodeUpdate(max_subscriptions=75),
    )
    assert updated.max_subscriptions == 75


@pytest.mark.asyncio
async def test_allocate_node_for_region_least_loaded(db_session: AsyncSession):
    # Node 1: max 10
    node1 = await create_node(
        db_session,
        NodeCreate(name="VN Node 1", host="10.0.0.1", flag="🇻🇳", max_subscriptions=10),
    )
    # Node 2: max 10
    node2 = await create_node(
        db_session,
        NodeCreate(name="VN Node 2", host="10.0.0.2", flag="🇻🇳", max_subscriptions=10),
    )

    # Assign 1 active sub to node1
    sub1 = await create_subscription(
        db_session,
        SubscriptionCreate(customer_name="Cust 1", quota_gb=10, days_valid=30, node_ids=[node1.id]),
    )
    assert sub1.status == SubscriptionStatus.ACTIVE

    # Allocate should pick node2 (0 subs vs 1 sub)
    chosen = await allocate_node_for_region(db_session, "🇻🇳")
    assert chosen.id == node2.id

    # Now add sub to node2
    await create_subscription(
        db_session,
        SubscriptionCreate(customer_name="Cust 2", quota_gb=10, days_valid=30, node_ids=[node2.id]),
    )
    # Now node1 and node2 both have 1 sub. Next sub to node2 -> node1 has fewer
    await create_subscription(
        db_session,
        SubscriptionCreate(customer_name="Cust 3", quota_gb=10, days_valid=30, node_ids=[node2.id]),
    )
    # node1 has 1, node2 has 2 -> allocate should pick node1
    chosen2 = await allocate_node_for_region(db_session, "🇻🇳")
    assert chosen2.id == node1.id


@pytest.mark.asyncio
async def test_allocate_node_for_region_out_of_capacity(db_session: AsyncSession):
    node_sg = await create_node(
        db_session,
        NodeCreate(name="SG Node", host="10.0.0.3", flag="🇸🇬", max_subscriptions=1),
    )

    # Assign 1 sub to hit capacity
    await create_subscription(
        db_session,
        SubscriptionCreate(customer_name="Cust SG", quota_gb=10, days_valid=30, node_ids=[node_sg.id]),
    )

    with pytest.raises(RegionOutOfCapacityError):
        await allocate_node_for_region(db_session, "🇸🇬")


@pytest.mark.asyncio
async def test_allocate_node_no_active_nodes(db_session: AsyncSession):
    with pytest.raises(RegionOutOfCapacityError):
        await allocate_node_for_region(db_session, "🇺🇸")


@pytest.mark.asyncio
async def test_get_regions_status_service_and_api(
    client: AsyncClient,
    db_session: AsyncSession,
):
    # Setup node JP with max 2
    node_jp = await create_node(
        db_session,
        NodeCreate(name="JP Node", host="10.0.0.4", location="Tokyo", flag="🇯🇵", max_subscriptions=2),
    )
    await create_subscription(
        db_session,
        SubscriptionCreate(customer_name="Cust JP", quota_gb=10, days_valid=30, node_ids=[node_jp.id]),
    )

    # Test service directly
    statuses = await get_regions_status(db_session)
    jp_status = next((r for r in statuses if r["flag"] == "🇯🇵"), None)
    assert jp_status is not None
    assert jp_status["total_capacity"] == 2
    assert jp_status["active_subscriptions"] == 1
    assert jp_status["available_slots"] == 1
    assert jp_status["is_sold_out"] is False

    # Test public API endpoint (no auth needed)
    res = await client.get("/api/v1/regions/status")
    assert res.status_code == 200
    data = res.json()
    jp_api = next((r for r in data if r["flag"] == "🇯🇵"), None)
    assert jp_api is not None
    assert jp_api["available_slots"] == 1
    assert jp_api["is_sold_out"] is False
