import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_admin_plan_crud_and_public_catalog(
    client: AsyncClient,
    admin_token: str,
    db_session: AsyncSession,
):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Admin creates Plan 1
    create_payload = {
        "name": "Gói 4G Tháng 100GB",
        "price_vnd": 30000,
        "quota_gb": 100,
        "days_valid": 30,
        "allowed_regions": ["🇻🇳", "🇸🇬"],
        "is_active": True,
        "sort_order": 1,
    }
    res = await client.post("/api/v1/admin/plans", json=create_payload, headers=headers)
    assert res.status_code == 201, res.text
    plan1 = res.json()
    assert plan1["name"] == "Gói 4G Tháng 100GB"
    assert plan1["price_vnd"] == 30000
    assert plan1["quota_gb"] == 100
    assert plan1["days_valid"] == 30
    assert plan1["allowed_regions"] == ["🇻🇳", "🇸🇬"]
    assert plan1["traffic_quota_bytes"] == 100 * 1024 * 1024 * 1024
    plan1_id = plan1["id"]

    # 2. Admin creates Plan 2 (inactive)
    create_payload_inactive = {
        "name": "Gói Thử Nghiệm",
        "price_vnd": 10000,
        "quota_gb": 10,
        "days_valid": 7,
        "allowed_regions": ["🇻🇳"],
        "is_active": False,
        "sort_order": 2,
    }
    res_inact = await client.post("/api/v1/admin/plans", json=create_payload_inactive, headers=headers)
    assert res_inact.status_code == 201
    plan2_id = res_inact.json()["id"]

    # 3. Admin lists all plans (both active and inactive)
    res_list = await client.get("/api/v1/admin/plans", headers=headers)
    assert res_list.status_code == 200
    all_plans = res_list.json()
    assert len(all_plans) >= 2

    # 4. Public lists only active plans
    res_pub = await client.get("/api/v1/public/plans")
    assert res_pub.status_code == 200
    active_plans = res_pub.json()
    assert any(p["id"] == plan1_id for p in active_plans)
    assert not any(p["id"] == plan2_id for p in active_plans)

    # 5. Admin updates plan
    res_update = await client.patch(
        f"/api/v1/admin/plans/{plan1_id}",
        json={"price_vnd": 35000, "name": "Gói 4G VIP 100GB"},
        headers=headers,
    )
    assert res_update.status_code == 200
    assert res_update.json()["price_vnd"] == 35000
    assert res_update.json()["name"] == "Gói 4G VIP 100GB"

    # 6. Admin deletes plan
    res_del = await client.delete(f"/api/v1/admin/plans/{plan2_id}", headers=headers)
    assert res_del.status_code == 204


@pytest.mark.asyncio
async def test_system_settings_admin_and_public(
    client: AsyncClient,
    admin_token: str,
    db_session: AsyncSession,
):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Update settings as Admin
    payload = {
        "support_telegram_url": "https://t.me/peebot_admin",
        "support_zalo_url": "https://zalo.me/0987654321",
    }
    res = await client.put("/api/v1/admin/settings", json=payload, headers=headers)
    assert res.status_code == 200, res.text
    settings_data = res.json()
    assert settings_data["support_telegram_url"] == "https://t.me/peebot_admin"
    assert settings_data["support_zalo_url"] == "https://zalo.me/0987654321"

    # 2. Get settings as Admin
    res_get = await client.get("/api/v1/admin/settings", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["support_telegram_url"] == "https://t.me/peebot_admin"

    # 3. Public get support channels
    res_pub = await client.get("/api/v1/public/settings")
    assert res_pub.status_code == 200
    pub_data = res_pub.json()
    assert pub_data["support_telegram_url"] == "https://t.me/peebot_admin"
    assert pub_data["support_zalo_url"] == "https://zalo.me/0987654321"
