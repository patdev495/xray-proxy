from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.node import Node
from app.models.order import Order, OrderStatus
from app.models.plan import Plan
from app.models.region import Region
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from app.schemas.node import NodeCreate
from app.schemas.order import OrderCreate
from app.schemas.payment import SepayWebhookPayload
from app.schemas.plan import PlanCreate, PlanUpdate
from app.services.node_service import (
    create_node,
    get_node_active_subscriptions_count,
)
from app.services.order_service import (
    create_order,
    get_order_by_id,
    process_sepay_webhook,
)
from app.services.plan_service import create_plan, get_plan_by_id, update_plan
from app.services.region_service import get_region_by_code
from app.services.user_service import create_customer_user
from app.services.xray_grpc_service import sync_all_nodes_stats_and_enforce


@pytest.fixture
async def customer_user(db_session: AsyncSession) -> User:
    """Create a customer user."""
    return await create_customer_user(
        db_session,
        username="daily_cust_test",
        password="Password123!",
    )


@pytest.fixture
def customer_token(customer_user: User) -> str:
    """JWT token for test customer."""
    return create_access_token({"sub": customer_user.username})


@pytest.fixture
async def composite_plan(db_session: AsyncSession) -> Plan:
    """Create a test plan with composite monthly and daily pricing."""
    return await create_plan(
        db_session,
        PlanCreate(
            name="Basic 4G",
            price_vnd=50000,
            traffic_quota_gb=200.0,
            days_valid=30,
            is_active=True,
            allowed_regions=["VN"],
            enable_daily=True,
            price_daily_vnd=3000,
            quota_daily_gb=6.0,
        ),
    )


@pytest.mark.asyncio
async def test_plan_composite_pricing_crud(db_session: AsyncSession, composite_plan: Plan):
    """Plan model supports composite pricing for both monthly and daily test cycles."""
    assert composite_plan.price_vnd == 50000
    assert composite_plan.enable_daily is True
    assert composite_plan.price_daily_vnd == 3000
    assert composite_plan.quota_daily_bytes == int(6.0 * 1024 * 1024 * 1024)

    # Update daily pricing
    updated = await update_plan(
        db_session,
        composite_plan,
        PlanUpdate(
            price_daily_vnd=4000,
            quota_daily_gb=8.0,
        ),
    )
    assert updated.price_daily_vnd == 4000
    assert updated.quota_daily_bytes == int(8.0 * 1024 * 1024 * 1024)


@pytest.mark.asyncio
async def test_order_daily_pricing_and_single_pending_rule(
    db_session: AsyncSession,
    customer_user: User,
    composite_plan: Plan,
):
    """Daily order calculates 3,000 VND amount and enforces max 1 pending order rule."""
    region = await get_region_by_code(db_session, "VN")
    assert region is not None
    await create_node(
        db_session,
        NodeCreate(name="VN Node 1", host="10.20.1.10", region_id=region.id, flag="🇻🇳", max_subscriptions=10),
    )

    # 1. Create first order with DAILY cycle
    order1 = await create_order(
        db_session,
        user_id=customer_user.id,
        plan_id=composite_plan.id,
        region="VN",
        billing_cycle="DAILY",
    )
    assert order1.amount_vnd == 3000
    assert order1.billing_cycle == "DAILY"
    assert order1.status == OrderStatus.PENDING

    # 2. Create second order for same user -> order1 should be auto-cancelled
    order2 = await create_order(
        db_session,
        user_id=customer_user.id,
        plan_id=composite_plan.id,
        region="VN",
        billing_cycle="MONTHLY",
    )
    assert order2.amount_vnd == 50000
    assert order2.billing_cycle == "MONTHLY"
    assert order2.status == OrderStatus.PENDING

    # Verify order1 was auto-cancelled
    reloaded_order1 = await get_order_by_id(db_session, order1.id)
    assert reloaded_order1 is not None
    assert reloaded_order1.status == OrderStatus.CANCELLED


@pytest.mark.asyncio
async def test_daily_subscription_provisioning_exact_24h(
    db_session: AsyncSession,
    customer_user: User,
    composite_plan: Plan,
):
    """Paying daily order provisions subscription valid for exactly 24 hours with daily quota."""
    now = datetime.now(timezone.utc)
    region = await get_region_by_code(db_session, "VN")
    assert region is not None

    node = await create_node(
        db_session,
        NodeCreate(
            name="Daily Node",
            host="10.20.1.1",
            region_id=region.id,
            flag="🇻🇳",
            max_subscriptions=10,
        ),
    )

    order = await create_order(
        db_session,
        user_id=customer_user.id,
        plan_id=composite_plan.id,
        region="VN",
        billing_cycle="DAILY",
    )

    # Process payment
    with patch("app.services.xray_grpc_service.add_user_to_node", return_value=True):
        payload = SepayWebhookPayload(
            id=2001,
            gateway="MBBank",
            transactionDate=now.strftime("%Y-%m-%d %H:%M:%S"),
            accountNumber="0987654321",
            subAccount=None,
            code=None,
            content=f"Thanh toan {order.code}",
            transferType="in",
            description=f"Thanh toan {order.code}",
            transferAmount=order.amount_vnd,
            referenceCode="REF2001",
            accumulated=1000000,
        )
        resp = await process_sepay_webhook(db_session, payload, auth_header=None)
        assert resp.success is True

    # Check provisioned subscription
    await db_session.refresh(order)
    assert order.subscription is not None
    sub = order.subscription

    assert sub.billing_cycle == "DAILY"
    assert sub.traffic_quota_bytes == composite_plan.quota_daily_bytes
    assert sub.traffic_used_bytes == 0

    sub_exp = sub.expires_at
    if sub_exp.tzinfo is None:
        sub_exp = sub_exp.replace(tzinfo=timezone.utc)

    expected_exp = now + timedelta(hours=24)
    diff = abs((sub_exp - expected_exp).total_seconds())
    # Within 10s of 24 hours
    assert diff < 10


@pytest.mark.asyncio
async def test_daily_subscription_zero_grace_period(
    db_session: AsyncSession,
    composite_plan: Plan,
):
    """Daily subscriptions have 0-day grace period, releasing node slot immediately on expiration."""
    now = datetime.now(timezone.utc)
    region = await get_region_by_code(db_session, "VN")
    assert region is not None

    node = await create_node(
        db_session,
        NodeCreate(
            name="Cap Test Node",
            host="10.20.1.2",
            region_id=region.id,
            flag="🇻🇳",
            max_subscriptions=2,
        ),
    )

    # 1. Daily sub expired 1 hour ago -> MUST NOT hold slot (0 grace period)
    daily_expired = Subscription(
        customer_name="Daily Expired",
        token="sub_daily_exp",
        uuid="uuid-daily-exp",
        traffic_quota_bytes=int(6.0 * 1024 * 1024 * 1024),
        traffic_used_bytes=1000,
        expires_at=now - timedelta(hours=1),
        status=SubscriptionStatus.EXPIRED,
        billing_cycle="DAILY",
        nodes=[node],
    )
    # 2. Monthly sub expired 1 hour ago -> MUST hold slot (within 3-day grace period)
    monthly_expired = Subscription(
        customer_name="Monthly Grace",
        token="sub_monthly_grace",
        uuid="uuid-monthly-grace",
        traffic_quota_bytes=int(50.0 * 1024 * 1024 * 1024),
        traffic_used_bytes=1000,
        expires_at=now - timedelta(hours=1),
        status=SubscriptionStatus.EXPIRED,
        billing_cycle="MONTHLY",
        nodes=[node],
    )
    db_session.add_all([daily_expired, monthly_expired])
    await db_session.commit()

    # Slot count should be 1 (only monthly_expired holds slot; daily_expired is released immediately)
    count = await get_node_active_subscriptions_count(db_session, node.id)
    assert count == 1

    # Node sync should immediately release daily_expired sub's nodes
    with patch("app.services.xray_grpc_service.query_node_stats", return_value={}):
        with patch("app.services.xray_grpc_service.remove_user_from_node", return_value=True):
            await sync_all_nodes_stats_and_enforce(db_session)

    await db_session.refresh(daily_expired)
    await db_session.refresh(monthly_expired)

    # Daily sub disassociated from node
    assert len(daily_expired.nodes) == 0
    # Monthly sub still retains node assignment during grace period
    assert len(monthly_expired.nodes) == 1


@pytest.mark.asyncio
async def test_daily_subscription_renewal_blocked(
    client: AsyncClient,
    db_session: AsyncSession,
    customer_user: User,
    customer_token: str,
    composite_plan: Plan,
):
    """Daily subscriptions cannot be renewed via in-place renewal endpoint."""
    now = datetime.now(timezone.utc)
    region = await get_region_by_code(db_session, "VN")
    assert region is not None

    node = await create_node(
        db_session,
        NodeCreate(name="Block Renew Node", host="10.20.1.3", region_id=region.id, flag="🇻🇳"),
    )

    daily_sub = Subscription(
        customer_name=customer_user.username,
        token="sub_daily_no_renew",
        uuid="uuid-daily-no-renew",
        traffic_quota_bytes=composite_plan.quota_daily_bytes or 6000000000,
        traffic_used_bytes=100,
        expires_at=now + timedelta(hours=12),
        status=SubscriptionStatus.ACTIVE,
        plan_id=composite_plan.id,
        region_id=region.id,
        billing_cycle="DAILY",
        user_id=customer_user.id,
        nodes=[node],
    )
    db_session.add(daily_sub)
    await db_session.commit()

    # Attempt to renew daily subscription
    resp = await client.post(
        f"/api/v1/portal/subscriptions/{daily_sub.id}/renew",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={},
    )
    assert resp.status_code == 400
    assert "Daily test subscriptions cannot be renewed in-place" in resp.json()["detail"]
