from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.main import app
from app.models.node import Node
from app.models.order import Order, OrderStatus
from app.models.plan import Plan
from app.models.region import Region
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User, UserRole
from app.services.order_service import extract_order_code
from app.services.setting_service import update_system_settings


@pytest.fixture
async def test_customer(db_session: AsyncSession) -> User:
    customer = User(
        username="sepay_tester",
        hashed_password="hashed_pass_123",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)
    return customer


@pytest.fixture
async def test_admin(db_session: AsyncSession) -> User:
    admin = User(
        username="admin_sepay",
        hashed_password="admin_pass_123",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest.fixture
def admin_token(test_admin: User) -> str:
    return create_access_token({"sub": test_admin.username, "role": test_admin.role.value})


@pytest.fixture
async def setup_environment(db_session: AsyncSession, test_customer: User) -> tuple[Plan, Region, Node, Order]:
    region_res = await db_session.execute(select(Region).where(Region.code == "VN"))
    region = region_res.scalar_one()

    node = Node(
        name="SePay Target Node",
        host="10.0.0.1",
        inbound_port=443,
        grpc_port=10085,
        max_subscriptions=10,
        region_id=region.id,
        is_active=True,
        reality_private_key="priv_test",
        reality_public_key="pub_test",
        reality_short_id="sid_test",
    )
    db_session.add(node)

    plan = Plan(
        name="SePay Fast 4G",
        price_vnd=50000,
        traffic_quota_bytes=50 * 1024 * 1024 * 1024,
        days_valid=30,
        allowed_regions=["VN"],
        is_active=True,
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)
    await db_session.refresh(node)

    order = Order(
        code="ORD-TEST01",
        user_id=test_customer.id,
        plan_id=plan.id,
        region="VN",
        amount_vnd=50000,
        status=OrderStatus.PENDING,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    return plan, region, node, order


def test_extract_order_code_unit() -> None:
    assert extract_order_code("Chuyen tien ORD-TEST01 cho peebot") == "ORD-TEST01"
    assert extract_order_code("ORD-123456") == "ORD-123456"
    assert extract_order_code("MBVCB.12345.ORD-987654.THANHTOAN") == "ORD-987654"
    assert extract_order_code("Chuyen khoan khong co ma don") is None


@pytest.mark.asyncio
async def test_sepay_webhook_invalid_token(
    db_session: AsyncSession,
    setup_environment: tuple[Plan, Region, Node, Order],
) -> None:
    await update_system_settings(db_session, {"sepay_api_key": "SECRET_KEY_999"})

    async with AsyncClient(
        transport=ASGITransport(app=app),  # type: ignore[arg-type]
        base_url="http://test",
    ) as ac:
        payload = {
            "content": "ORD-TEST01",
            "transferAmount": 50000,
            "transferType": "in",
        }
        res = await ac.post(
            "/api/v1/payments/sepay-webhook",
            json=payload,
            headers={"Authorization": "Apikey WRONG_TOKEN"},
        )
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_sepay_webhook_insufficient_amount(
    db_session: AsyncSession,
    setup_environment: tuple[Plan, Region, Node, Order],
) -> None:
    _, _, _, order = setup_environment
    await update_system_settings(db_session, {"sepay_api_key": ""})

    async with AsyncClient(
        transport=ASGITransport(app=app),  # type: ignore[arg-type]
        base_url="http://test",
    ) as ac:
        payload = {
            "content": f"Thanh toan {order.code}",
            "transferAmount": 10000,  # Expected 50000
            "transferType": "in",
        }
        res = await ac.post("/api/v1/payments/sepay-webhook", json=payload)
        assert res.status_code == 400
        data = res.json()
        assert "less than order amount" in data["detail"]

    # Order must remain PENDING
    await db_session.refresh(order)
    assert order.status == OrderStatus.PENDING
    assert order.subscription_id is None


@pytest.mark.asyncio
async def test_sepay_webhook_success_provisions_subscription(
    db_session: AsyncSession,
    setup_environment: tuple[Plan, Region, Node, Order],
    test_customer: User,
) -> None:
    plan, _, node, order = setup_environment
    await update_system_settings(db_session, {"sepay_api_key": ""})

    with patch("app.services.order_service.sync_user_to_all_nodes", new_callable=AsyncMock) as mock_sync:
        async with AsyncClient(
            transport=ASGITransport(app=app),  # type: ignore[arg-type]
            base_url="http://test",
        ) as ac:
            payload = {
                "id": 888,
                "gateway": "MBBank",
                "content": f"Chuyen khoan {order.code} don hang",
                "transferAmount": 50000,
                "transferType": "in",
            }
            res = await ac.post("/api/v1/payments/sepay-webhook", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["order_code"] == order.code
            assert data["subscription_id"] is not None

        # Verify Order updated to PAID
        await db_session.refresh(order)
        assert order.status == OrderStatus.PAID
        assert order.subscription_id == data["subscription_id"]

        # Verify created Subscription in DB
        sub_res = await db_session.execute(select(Subscription).where(Subscription.id == order.subscription_id))
        sub = sub_res.scalar_one()
        assert sub.user_id == test_customer.id
        assert sub.plan_id == plan.id
        assert sub.status == SubscriptionStatus.ACTIVE
        assert sub.traffic_quota_bytes == plan.traffic_quota_bytes
        assert len(sub.nodes) == 1
        assert sub.nodes[0].id == node.id

        # Verify gRPC sync was called
        mock_sync.assert_called_once()


@pytest.mark.asyncio
async def test_sepay_webhook_idempotent(
    db_session: AsyncSession,
    setup_environment: tuple[Plan, Region, Node, Order],
) -> None:
    _, _, _, order = setup_environment
    await update_system_settings(db_session, {"sepay_api_key": ""})

    with patch("app.services.order_service.sync_user_to_all_nodes", new_callable=AsyncMock):
        async with AsyncClient(
            transport=ASGITransport(app=app),  # type: ignore[arg-type]
            base_url="http://test",
        ) as ac:
            payload = {
                "content": order.code,
                "transferAmount": 50000,
                "transferType": "in",
            }
            # First call
            res1 = await ac.post("/api/v1/payments/sepay-webhook", json=payload)
            assert res1.status_code == 200
            sub_id_1 = res1.json()["subscription_id"]

            # Second duplicate call
            res2 = await ac.post("/api/v1/payments/sepay-webhook", json=payload)
            assert res2.status_code == 200
            data2 = res2.json()
            assert data2["success"] is True
            assert data2["subscription_id"] == sub_id_1


@pytest.mark.asyncio
async def test_admin_manual_confirm_order(
    db_session: AsyncSession,
    setup_environment: tuple[Plan, Region, Node, Order],
    admin_token: str,
) -> None:
    _, _, node, order = setup_environment

    with patch("app.services.order_service.sync_user_to_all_nodes", new_callable=AsyncMock):
        async with AsyncClient(
            transport=ASGITransport(app=app),  # type: ignore[arg-type]
            base_url="http://test",
        ) as ac:
            res = await ac.post(
                f"/api/v1/admin/orders/{order.id}/confirm",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "PAID"
            assert data["subscription_id"] is not None

        await db_session.refresh(order)
        assert order.status == OrderStatus.PAID
        assert order.subscription_id is not None


@pytest.mark.asyncio
async def test_admin_list_orders(
    db_session: AsyncSession,
    setup_environment: tuple[Plan, Region, Node, Order],
    admin_token: str,
) -> None:
    _, _, _, order = setup_environment

    async with AsyncClient(
        transport=ASGITransport(app=app),  # type: ignore[arg-type]
        base_url="http://test",
    ) as ac:
        res = await ac.get(
            "/api/v1/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1
        assert any(o["code"] == order.code for o in data)
