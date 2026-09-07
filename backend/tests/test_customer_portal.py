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
from app.models.user import User, UserRole
from app.schemas.node import NodeCreate
from app.schemas.order import OrderCreate
from app.schemas.payment import SepayWebhookPayload
from app.schemas.plan import PlanCreate
from app.services.node_service import (
    RegionOutOfCapacityError,
    create_node,
    get_node_active_subscriptions_count,
)
from app.services.order_service import (
    create_order,
    process_sepay_webhook,
    provision_order_subscription,
)
from app.services.plan_service import create_plan
from app.services.region_service import get_region_by_code
from app.services.user_service import create_customer_user
from app.services.xray_grpc_service import sync_all_nodes_stats_and_enforce


@pytest.fixture
async def customer_user(db_session: AsyncSession) -> User:
    """Create a customer user."""
    user = await create_customer_user(
        db_session,
        username="cust_test",
        password="Password123!",
    )
    return user


@pytest.fixture
def customer_token(customer_user: User) -> str:
    """JWT token for test customer."""
    return create_access_token({"sub": customer_user.username})


@pytest.fixture
async def sample_plan(db_session: AsyncSession) -> Plan:
    """Create an active test plan."""
    return await create_plan(
        db_session,
        PlanCreate(
            name="VIP 30 Days",
            price_vnd=50000,
            traffic_quota_gb=50.0,
            days_valid=30,
            is_active=True,
            allowed_regions=["VN"],
        ),
    )


@pytest.mark.asyncio
async def test_grace_period_slot_reservation(db_session: AsyncSession):
    """3-day grace period keeps node slot reserved after expiration, releases slot after 3 days."""
    now = datetime.now(timezone.utc)
    region = await get_region_by_code(db_session, "VN")
    assert region is not None

    node = await create_node(
        db_session,
        NodeCreate(
            name="Grace Node",
            host="10.10.1.1",
            region_id=region.id,
            flag="🇻🇳",
            max_subscriptions=2,
        ),
    )

    # Sub 1: Active, expires in 10 days -> occupies 1 slot
    sub1 = Subscription(
        customer_name="Active Sub",
        token="sub_active_1",
        uuid="uuid-1",
        traffic_quota_bytes=50 * 1024 * 1024 * 1024,
        traffic_used_bytes=1000,
        expires_at=now + timedelta(days=10),
        status=SubscriptionStatus.ACTIVE,
        nodes=[node],
    )
    db_session.add(sub1)

    # Sub 2: Expired 1 day ago (< 3 days grace period) -> MUST hold slot
    sub2 = Subscription(
        customer_name="Grace Sub 1 Day Expired",
        token="sub_grace_2",
        uuid="uuid-2",
        traffic_quota_bytes=50 * 1024 * 1024 * 1024,
        traffic_used_bytes=1000,
        expires_at=now - timedelta(days=1),
        status=SubscriptionStatus.EXPIRED,
        nodes=[node],
    )
    db_session.add(sub2)

    # Sub 3: Expired 5 days ago (> 3 days grace period) -> MUST NOT hold slot
    sub3 = Subscription(
        customer_name="Old Expired Sub",
        token="sub_expired_3",
        uuid="uuid-3",
        traffic_quota_bytes=50 * 1024 * 1024 * 1024,
        traffic_used_bytes=1000,
        expires_at=now - timedelta(days=5),
        status=SubscriptionStatus.EXPIRED,
        nodes=[node],
    )
    db_session.add(sub3)
    await db_session.commit()

    # Slot count should be 2 (sub1 + sub2), sub3 should be released
    active_count = await get_node_active_subscriptions_count(db_session, node.id)
    assert active_count == 2

    # Node sync enforcement should disassociate sub3 (expired > 3 days)
    with patch("app.services.xray_grpc_service.query_node_stats", return_value={}):
        with patch("app.services.xray_grpc_service.remove_user_from_node", return_value=True):
            await sync_all_nodes_stats_and_enforce(db_session)

    await db_session.refresh(sub3)
    assert len(sub3.nodes) == 0  # slot formally released


@pytest.mark.asyncio
async def test_inplace_renewal_order_and_provisioning(
    db_session: AsyncSession,
    customer_user: User,
    sample_plan: Plan,
):
    """Renewal extends expires_at and resets quota without altering client UUID or token."""
    now = datetime.now(timezone.utc)
    region = await get_region_by_code(db_session, "VN")
    assert region is not None

    node = await create_node(
        db_session,
        NodeCreate(
            name="Renewal Node",
            host="10.10.1.2",
            region_id=region.id,
            flag="🇻🇳",
            max_subscriptions=10,
        ),
    )

    # Existing active subscription with some used traffic and 5 days remaining
    initial_uuid = "uuid-stable-12345"
    initial_token = "sub_token_stable_99999"
    initial_expires = now + timedelta(days=5)

    sub = Subscription(
        customer_name="Cust Renew",
        token=initial_token,
        uuid=initial_uuid,
        traffic_quota_bytes=sample_plan.traffic_quota_bytes,
        traffic_used_bytes=45 * 1024 * 1024 * 1024,  # almost full
        expires_at=initial_expires,
        status=SubscriptionStatus.ACTIVE,
        plan_id=sample_plan.id,
        region_id=region.id,
        user_id=customer_user.id,
        nodes=[node],
    )
    db_session.add(sub)
    await db_session.commit()
    await db_session.refresh(sub)

    # Create renewal order linked to subscription_id
    order = await create_order(
        db_session,
        user_id=customer_user.id,
        plan_id=sample_plan.id,
        region="VN",
        subscription_id=sub.id,
    )
    assert order.subscription_id == sub.id

    # Payment reconciliation
    with patch("app.services.xray_grpc_service.add_user_to_node", return_value=True):
        payload = SepayWebhookPayload(
            id=1001,
            gateway="MBBank",
            transactionDate=now.strftime("%Y-%m-%d %H:%M:%S"),
            accountNumber="0987654321",
            subAccount=None,
            code=None,
            content=f"Thanh toan {order.code}",
            transferType="in",
            description=f"Thanh toan {order.code}",
            transferAmount=order.amount_vnd,
            referenceCode="REF1001",
            accumulated=1000000,
        )
        resp = await process_sepay_webhook(db_session, payload, auth_header=None)
        assert resp.success is True

    await db_session.refresh(sub)
    # Verification: UUID and token MUST be identical
    assert sub.uuid == initial_uuid
    assert sub.token == initial_token
    # Traffic quota reset
    assert sub.traffic_used_bytes == 0
    assert sub.traffic_quota_bytes == sample_plan.traffic_quota_bytes
    # Expiration extended by 30 days
    expected_expires = initial_expires + timedelta(days=sample_plan.days_valid)
    sub_exp = sub.expires_at
    if sub_exp.tzinfo is None:
        sub_exp = sub_exp.replace(tzinfo=timezone.utc)
    diff = abs((sub_exp - expected_expires).total_seconds())
    assert diff < 10
    assert sub.status == SubscriptionStatus.ACTIVE


@pytest.mark.asyncio
async def test_portal_api_my_subscriptions(
    client: AsyncClient,
    db_session: AsyncSession,
    customer_user: User,
    customer_token: str,
    sample_plan: Plan,
):
    """Customer endpoint /api/v1/portal/subscriptions returns only current user's subscriptions."""
    now = datetime.now(timezone.utc)
    region = await get_region_by_code(db_session, "VN")
    assert region is not None

    node = await create_node(
        db_session,
        NodeCreate(name="My Node", host="1.2.3.4", region_id=region.id, flag="🇻🇳"),
    )

    # Sub 1 for customer
    sub1 = Subscription(
        customer_name=customer_user.username,
        token="sub_my_token",
        uuid="my-uuid",
        traffic_quota_bytes=sample_plan.traffic_quota_bytes,
        traffic_used_bytes=1024,
        expires_at=now + timedelta(days=30),
        status=SubscriptionStatus.ACTIVE,
        plan_id=sample_plan.id,
        region_id=region.id,
        user_id=customer_user.id,
        nodes=[node],
    )
    # Sub 2 for another user
    sub2 = Subscription(
        customer_name="other_user",
        token="sub_other_token",
        uuid="other-uuid",
        traffic_quota_bytes=sample_plan.traffic_quota_bytes,
        traffic_used_bytes=1024,
        expires_at=now + timedelta(days=30),
        status=SubscriptionStatus.ACTIVE,
        user_id=99999,
        nodes=[node],
    )
    db_session.add_all([sub1, sub2])
    await db_session.commit()

    resp = await client.get(
        "/api/v1/portal/subscriptions",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == sub1.id
    assert data[0]["token"] == "sub_my_token"
    assert "subscription_url" in data[0]


@pytest.mark.asyncio
async def test_node_switching_flow(
    client: AsyncClient,
    db_session: AsyncSession,
    customer_user: User,
    customer_token: str,
    sample_plan: Plan,
):
    """Customer switches subscription to another eligible node in the same region."""
    now = datetime.now(timezone.utc)
    region = await get_region_by_code(db_session, "VN")
    assert region is not None

    node1 = await create_node(
        db_session,
        NodeCreate(name="VN Node 1", host="10.0.0.1", region_id=region.id, flag="🇻🇳", max_subscriptions=5),
    )
    node2 = await create_node(
        db_session,
        NodeCreate(name="VN Node 2", host="10.0.0.2", region_id=region.id, flag="🇻🇳", max_subscriptions=5),
    )

    sub = Subscription(
        customer_name=customer_user.username,
        token="sub_switch_token",
        uuid="switch-uuid",
        traffic_quota_bytes=sample_plan.traffic_quota_bytes,
        traffic_used_bytes=0,
        expires_at=now + timedelta(days=30),
        status=SubscriptionStatus.ACTIVE,
        region_id=region.id,
        user_id=customer_user.id,
        nodes=[node1],
    )
    db_session.add(sub)
    await db_session.commit()
    await db_session.refresh(sub)

    # 1. Query eligible nodes for switch
    resp = await client.get(
        f"/api/v1/portal/subscriptions/{sub.id}/eligible-nodes",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 200
    eligible = resp.json()
    assert len(eligible) == 1
    assert eligible[0]["id"] == node2.id
    assert eligible[0]["name"] == "VN Node 2"

    # 2. Perform switch
    with patch("app.services.portal_service.remove_user_from_node", return_value=True) as mock_rm:
        with patch("app.services.portal_service.add_user_to_node", return_value=True) as mock_add:
            switch_resp = await client.post(
                f"/api/v1/portal/subscriptions/{sub.id}/switch-node",
                headers={"Authorization": f"Bearer {customer_token}"},
                json={"target_node_id": node2.id},
            )
            assert switch_resp.status_code == 200
            assert mock_rm.called
            assert mock_add.called

    await db_session.refresh(sub)
    assert len(sub.nodes) == 1
    assert sub.nodes[0].id == node2.id
    assert sub.uuid == "switch-uuid"  # client UUID unchanged!
    assert sub.token == "sub_switch_token"  # token unchanged!


@pytest.mark.asyncio
async def test_node_switching_capacity_limit(
    client: AsyncClient,
    db_session: AsyncSession,
    customer_user: User,
    customer_token: str,
    sample_plan: Plan,
):
    """Switching to full node is rejected with 400 error."""
    now = datetime.now(timezone.utc)
    region = await get_region_by_code(db_session, "VN")
    assert region is not None

    node1 = await create_node(
        db_session,
        NodeCreate(name="Source Node", host="10.0.0.1", region_id=region.id, flag="🇻🇳", max_subscriptions=5),
    )
    node_full = await create_node(
        db_session,
        NodeCreate(name="Full Node", host="10.0.0.2", region_id=region.id, flag="🇻🇳", max_subscriptions=1),
    )

    # Sub 1 on source node
    sub = Subscription(
        customer_name=customer_user.username,
        token="sub_test_cap",
        uuid="uuid-test-cap",
        traffic_quota_bytes=sample_plan.traffic_quota_bytes,
        traffic_used_bytes=0,
        expires_at=now + timedelta(days=30),
        status=SubscriptionStatus.ACTIVE,
        region_id=region.id,
        user_id=customer_user.id,
        nodes=[node1],
    )
    # Existing sub filling full node
    sub_other = Subscription(
        customer_name="other",
        token="sub_full_node",
        uuid="uuid-other",
        traffic_quota_bytes=sample_plan.traffic_quota_bytes,
        traffic_used_bytes=0,
        expires_at=now + timedelta(days=30),
        status=SubscriptionStatus.ACTIVE,
        region_id=region.id,
        user_id=9999,
        nodes=[node_full],
    )
    db_session.add_all([sub, sub_other])
    await db_session.commit()

    # Attempt to switch to full node
    resp = await client.post(
        f"/api/v1/portal/subscriptions/{sub.id}/switch-node",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"target_node_id": node_full.id},
    )
    assert resp.status_code == 400
    assert "maximum capacity" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_node_switching_cross_region_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    customer_user: User,
    customer_token: str,
    sample_plan: Plan,
):
    """Switching to node in different region is rejected with 400 error."""
    now = datetime.now(timezone.utc)
    vn_region = await get_region_by_code(db_session, "VN")
    sg_region = await get_region_by_code(db_session, "SG")
    assert vn_region is not None and sg_region is not None

    vn_node = await create_node(
        db_session,
        NodeCreate(name="VN Node", host="10.0.0.1", region_id=vn_region.id, flag="🇻🇳", max_subscriptions=5),
    )
    sg_node = await create_node(
        db_session,
        NodeCreate(name="SG Node", host="10.0.0.2", region_id=sg_region.id, flag="🇸🇬", max_subscriptions=5),
    )

    sub = Subscription(
        customer_name=customer_user.username,
        token="sub_cross_reg",
        uuid="uuid-cross-reg",
        traffic_quota_bytes=sample_plan.traffic_quota_bytes,
        traffic_used_bytes=0,
        expires_at=now + timedelta(days=30),
        status=SubscriptionStatus.ACTIVE,
        region_id=vn_region.id,
        user_id=customer_user.id,
        nodes=[vn_node],
    )
    db_session.add(sub)
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/portal/subscriptions/{sub.id}/switch-node",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"target_node_id": sg_node.id},
    )
    assert resp.status_code == 400
    assert "same region" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_portal_renew_subscription_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
    customer_user: User,
    customer_token: str,
    sample_plan: Plan,
):
    """Calling POST /api/v1/portal/subscriptions/{id}/renew creates renewal order."""
    now = datetime.now(timezone.utc)
    region = await get_region_by_code(db_session, "VN")
    assert region is not None

    node = await create_node(
        db_session,
        NodeCreate(name="VN Renew Endpoint Node", host="10.0.0.9", region_id=region.id, flag="🇻🇳"),
    )

    sub = Subscription(
        customer_name=customer_user.username,
        token="sub_renew_ep",
        uuid="uuid-renew-ep",
        traffic_quota_bytes=sample_plan.traffic_quota_bytes,
        traffic_used_bytes=1000,
        expires_at=now + timedelta(days=5),
        status=SubscriptionStatus.ACTIVE,
        plan_id=sample_plan.id,
        region_id=region.id,
        user_id=customer_user.id,
        nodes=[node],
    )
    db_session.add(sub)
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/portal/subscriptions/{sub.id}/renew",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["subscription_id"] == sub.id
    assert data["status"] == "PENDING"
    assert data["amount_vnd"] == sample_plan.price_vnd
    assert "vietqr_url" in data

