import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_region_crud_and_public_access(client: AsyncClient, admin_token: str) -> None:
    """Test admin CRUD on regions and public read-only access."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Admin creates a new region
    create_res = await client.post(
        "/api/v1/admin/regions",
        json={
            "code": "KR",
            "name": "South Korea",
            "flag": "🇰🇷",
            "sort_order": 5,
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    region = create_res.json()
    assert region["code"] == "KR"
    assert region["name"] == "South Korea"
    assert region["flag"] == "🇰🇷"
    region_id = region["id"]

    # 2. Duplicate code fails
    dup_res = await client.post(
        "/api/v1/admin/regions",
        json={"code": "kr", "name": "Korea Duplicate", "flag": "🇰🇷"},
        headers=headers,
    )
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Public lists active regions
    pub_res = await client.get("/api/v1/public/regions")
    assert pub_res.status_code == 200
    pub_regions = pub_res.json()
    assert any(r["code"] == "KR" for r in pub_regions)

    # 4. Admin updates region (set inactive)
    patch_res = await client.patch(
        f"/api/v1/admin/regions/{region_id}",
        json={"name": "Republic of Korea", "is_active": False},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Republic of Korea"
    assert patch_res.json()["is_active"] is False

    # 5. Public should no longer see inactive region
    pub_after = await client.get("/api/v1/public/regions")
    assert not any(r["code"] == "KR" for r in pub_after.json())

    # 6. Admin deletes region
    del_res = await client.delete(f"/api/v1/admin/regions/{region_id}", headers=headers)
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_node_region_assignment(client: AsyncClient, admin_token: str) -> None:
    """Test assigning a VPS node to a specific region."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch existing active regions (seeded by database migration)
    regions_res = await client.get("/api/v1/admin/regions", headers=headers)
    assert regions_res.status_code == 200
    regions = regions_res.json()
    assert len(regions) >= 4
    sg_region = next(r for r in regions if r["code"] == "SG")

    # Create node with region_id
    node_res = await client.post(
        "/api/v1/admin/nodes",
        json={
            "name": "Singapore VPS 01",
            "host": "128.199.204.14",
            "region_id": sg_region["id"],
            "max_subscriptions": 25,
            "inbound_port": 8443,
        },
        headers=headers,
    )
    assert node_res.status_code == 201
    node = node_res.json()
    assert node["region_id"] == sg_region["id"]
    assert node["flag"] == sg_region["flag"]
    assert node["location"] == sg_region["name"]

    # Verify status reflects node
    status_res = await client.get("/api/v1/regions/status")
    assert status_res.status_code == 200
    sg_status = next(s for s in status_res.json() if s["code"] == "SG")
    assert sg_status["total_nodes"] >= 1
    assert sg_status["total_capacity"] >= 25
    assert sg_status["is_sold_out"] is False


@pytest.mark.asyncio
async def test_subscription_creation_with_plan_and_single_region(
    client: AsyncClient, admin_token: str
) -> None:
    """Subscriber picks 1 plan and 1 single region; node is auto-allocated."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Get regions
    reg_res = await client.get("/api/v1/admin/regions", headers=headers)
    regions = reg_res.json()
    vn_reg = next(r for r in regions if r["code"] == "VN")
    jp_reg = next(r for r in regions if r["code"] == "JP")

    # 2. Add active node to VN
    await client.post(
        "/api/v1/admin/nodes",
        json={
            "name": "VN Auto Alloc Node",
            "host": "103.1.2.3",
            "region_id": vn_reg["id"],
            "max_subscriptions": 10,
            "inbound_port": 8443,
        },
        headers=headers,
    )

    # 3. Create Plan with allowed_regions=["VN", "SG"]
    plan_res = await client.post(
        "/api/v1/admin/plans",
        json={
            "name": "VN-SG Pro VIP",
            "price_vnd": 120000,
            "quota_gb": 150,
            "days_valid": 60,
            "allowed_regions": ["VN", "SG"],
        },
        headers=headers,
    )
    assert plan_res.status_code == 201
    plan = plan_res.json()
    plan_id = plan["id"]

    # 4. Attempt subscription with disallowed region (JP) -> fails 400
    disallowed_res = await client.post(
        "/api/v1/admin/subscriptions",
        json={
            "customer_name": "Invalid Region User",
            "plan_id": plan_id,
            "region_id": jp_reg["id"],
        },
        headers=headers,
    )
    assert disallowed_res.status_code == 400
    assert "not permitted" in disallowed_res.json()["detail"]

    # 5. Create subscription with allowed single region (VN)
    sub_res = await client.post(
        "/api/v1/admin/subscriptions",
        json={
            "customer_name": "Happy VN Customer",
            "plan_id": plan_id,
            "region_id": vn_reg["id"],
        },
        headers=headers,
    )
    assert sub_res.status_code == 201
    sub = sub_res.json()
    assert sub["plan_id"] == plan_id
    assert sub["plan_name"] == "VN-SG Pro VIP"
    assert sub["region_id"] == vn_reg["id"]
    assert sub["region_code"] == "VN"
    assert sub["region_name"] == vn_reg["name"]
    assert sub["region_flag"] == vn_reg["flag"]
    assert sub["traffic_quota_bytes"] == 150 * 1024 * 1024 * 1024
    assert len(sub["node_ids"]) == 1
