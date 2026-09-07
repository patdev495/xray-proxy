from datetime import datetime, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.main import app
from app.models.node import Node
from app.models.plan import Plan
from app.models.region import Region
from app.models.user import User, UserRole


@pytest.fixture
async def test_customer(db_session: AsyncSession) -> User:
    """Create a customer user for testing."""
    customer = User(
        username="buyer_customer",
        hashed_password="hashedpassword123",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)
    return customer


@pytest.fixture
def customer_token(test_customer: User) -> str:
    """Generate JWT token for customer."""
    return create_access_token({"sub": test_customer.username, "role": test_customer.role.value})


@pytest.fixture
async def test_plan_and_nodes(db_session: AsyncSession) -> tuple[Plan, Region]:
    """Create test region, nodes with capacity, and test plan."""
    from sqlalchemy import select

    region_res = await db_session.execute(select(Region).where(Region.code == "VN"))
    region = region_res.scalar_one()

    node = Node(
        name="Test Node VN",
        host="1.2.3.4",
        inbound_port=443,
        grpc_port=10085,
        max_subscriptions=10,
        region_id=region.id,
        is_active=True,
        reality_private_key="priv",
        reality_public_key="pub",
        reality_short_id="sid",
    )
    db_session.add(node)


    plan = Plan(
        name="Pro VIP 4G",
        price_vnd=50000,
        traffic_quota_bytes=100 * 1024 * 1024 * 1024,
        days_valid=30,
        allowed_regions=["VN", "SG"],
        is_active=True,
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)
    await db_session.refresh(region)
    return plan, region


@pytest.mark.asyncio
async def test_create_order_success(
    test_plan_and_nodes: tuple[Plan, Region],
    customer_token: str,
) -> None:
    """Customer can successfully create an order and receive VietQR details."""
    plan, region = test_plan_and_nodes
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        res = await client.post(
            "/api/v1/orders/create",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"plan_id": plan.id, "region": "VN"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["code"].startswith("ORD-")
        assert data["plan_id"] == plan.id
        assert data["plan_name"] == "Pro VIP 4G"
        assert data["region"] == "VN"
        assert data["amount_vnd"] == 50000
        assert data["status"] == "PENDING"
        assert "vietqr_url" in data
        assert "50000" in data["vietqr_url"]
        assert data["code"] in data["vietqr_url"]


@pytest.mark.asyncio
async def test_create_order_inactive_plan(
    test_plan_and_nodes: tuple[Plan, Region],
    customer_token: str,
    db_session: AsyncSession,
) -> None:
    """Creating order for inactive plan fails with 400 Bad Request."""
    plan, _ = test_plan_and_nodes
    plan.is_active = False
    await db_session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        res = await client.post(
            "/api/v1/orders/create",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"plan_id": plan.id, "region": "VN"},
        )
        assert res.status_code == 400
        assert "Plan is not available" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_order_disallowed_region(
    test_plan_and_nodes: tuple[Plan, Region],
    customer_token: str,
) -> None:
    """Selecting region not permitted by plan fails with 400 Bad Request."""
    plan, _ = test_plan_and_nodes
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        res = await client.post(
            "/api/v1/orders/create",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"plan_id": plan.id, "region": "US"},
        )
        assert res.status_code == 400
        assert "Region US is not permitted" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_order_sold_out_region(
    test_plan_and_nodes: tuple[Plan, Region],
    customer_token: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Selecting sold-out region fails with 400 Bad Request."""
    plan, _ = test_plan_and_nodes
    import app.services.region_service as region_service

    async def mock_sold_out_status(db: AsyncSession) -> list[dict[str, object]]:
        return [{
            "code": "VN",
            "name": "Việt Nam",
            "flag": "🇻🇳",
            "location": "",
            "total_nodes": 1,
            "active_nodes": 1,
            "total_capacity": 10,
            "active_subscriptions": 10,
            "available_slots": 0,
            "is_sold_out": True,
        }]

    monkeypatch.setattr(region_service, "get_regions_status", mock_sold_out_status)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        res = await client.post(
            "/api/v1/orders/create",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"plan_id": plan.id, "region": "VN"},
        )
        assert res.status_code == 400
        assert "Region is currently sold out" in res.json()["detail"]


@pytest.mark.asyncio
async def test_get_order_by_code(
    test_plan_and_nodes: tuple[Plan, Region],
    customer_token: str,
) -> None:
    """Querying order by code returns current status and payment instructions."""
    plan, _ = test_plan_and_nodes
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        create_res = await client.post(
            "/api/v1/orders/create",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"plan_id": plan.id, "region": "VN"},
        )
        code = create_res.json()["code"]

        get_res = await client.get(f"/api/v1/orders/{code}")
        assert get_res.status_code == 200
        order_data = get_res.json()
        assert order_data["code"] == code
        assert order_data["amount_vnd"] == 50000
        assert order_data["status"] == "PENDING"
        assert "transfer_content" in order_data


@pytest.mark.asyncio
async def test_order_transfer_prefix_and_vietinbank(
    test_plan_and_nodes: tuple[Plan, Region],
    customer_token: str,
    db_session: AsyncSession,
) -> None:
    """If bank is ICB or bank_transfer_prefix is configured, transfer_content includes prefix."""
    from app.services.setting_service import update_system_settings

    # 1. Update settings to ICB (VietinBank) with empty prefix -> auto defaults to SEVQR
    await update_system_settings(db_session, {"bank_id": "ICB", "bank_transfer_prefix": ""})

    plan, _ = test_plan_and_nodes
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        res = await client.post(
            "/api/v1/orders/create",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"plan_id": plan.id, "region": "VN"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["transfer_content"].startswith("SEVQR ORD-")
        assert "SEVQR" in data["vietqr_url"]

        # 2. Custom prefix on another bank
        await update_system_settings(db_session, {"bank_id": "VCB", "bank_transfer_prefix": "MYSHOP"})
        code = data["code"]
        get_res = await client.get(f"/api/v1/orders/{code}")
        assert get_res.status_code == 200
        assert get_res.json()["transfer_content"] == f"MYSHOP {code}"
