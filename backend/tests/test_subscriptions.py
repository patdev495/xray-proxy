import base64
import urllib.parse
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from app.services.subscription_service import build_vless_link, build_subscription_bundle


def test_build_vless_link() -> None:
    """Validate standard Xray VLESS-Reality link format for Shadowrocket."""
    uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    host = "107.175.144.245"
    port = 8443
    public_key = "qGPc6JKKUpHXPSMRQC2TIk2srUu9nvnWJW8NuBft_3Y"
    short_id = "6760aa63fc01cff2"
    sni = "images.apple.com"
    remark = "🇺🇸 VPS-US-01 - Docomo 5G"

    link = build_vless_link(
        uuid=uuid,
        host=host,
        port=port,
        public_key=public_key,
        short_id=short_id,
        sni=sni,
        remark=remark,
    )

    assert link.startswith(f"vless://{uuid}@{host}:{port}?")
    assert "security=reality" in link
    assert "encryption=none" in link
    assert f"pbk={public_key}" in link
    assert f"sid={short_id}" in link
    assert f"sni={sni}" in link
    assert "fp=chrome" in link
    assert "type=tcp" in link
    assert "headerType=none" in link
    assert f"#{urllib.parse.quote(remark)}" in link


def test_build_subscription_bundle() -> None:
    """Bundle encodes all active nodes and their SNI profiles into Base64 string."""
    from unittest.mock import MagicMock

    sub_uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

    # Mock Node 1 with 2 SNIs
    sni1 = MagicMock(carrier="Docomo", domain="images.apple.com", is_active=True)
    sni2 = MagicMock(carrier="SoftBank", domain="www.yahoo.co.jp", is_active=True)
    node1 = MagicMock(
        name="Tokyo 01",
        flag="🇯🇵",
        host="159.65.12.88",
        inbound_port=443,
        reality_public_key="pub1",
        reality_short_id="sid1",
        is_active=True,
        sni_profiles=[sni1, sni2],
    )

    bundle_b64 = build_subscription_bundle(uuid=sub_uuid, nodes=[node1])
    decoded_text = base64.b64decode(bundle_b64.encode("utf-8")).decode("utf-8")
    lines = [line.strip() for line in decoded_text.strip().split("\n") if line.strip()]

    assert len(lines) == 2
    assert "Docomo" in lines[0] or "Docomo" in lines[1]
    assert "SoftBank" in lines[0] or "SoftBank" in lines[1]


@pytest.mark.asyncio
async def test_create_and_list_subscription(client: AsyncClient, admin_token: str) -> None:
    """Admin creates a subscription, receives unique token and UUID."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "customer_name": "Customer #1042",
        "quota_gb": 50.0,
        "days_valid": 30,
    }

    create_res = await client.post(
        "/api/v1/admin/subscriptions",
        json=payload,
        headers=headers,
    )
    assert create_res.status_code == 201
    sub = create_res.json()
    assert sub["id"] > 0
    assert sub["customer_name"] == "Customer #1042"
    assert sub["token"].startswith("sub_")
    assert len(sub["uuid"]) == 36
    assert sub["traffic_quota_bytes"] == int(50.0 * 1024 * 1024 * 1024)
    assert sub["traffic_used_bytes"] == 0
    assert sub["status"] == "ACTIVE"

    # List subscriptions
    list_res = await client.get("/api/v1/admin/subscriptions", headers=headers)
    assert list_res.status_code == 200
    subs = list_res.json()
    assert any(s["id"] == sub["id"] for s in subs)


@pytest.mark.asyncio
async def test_public_subscription_endpoint(client: AsyncClient, admin_token: str) -> None:
    """Public endpoint /sub/{token} returns base64 bundle with Shadowrocket headers."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a node with SNI profiles
    await client.post(
        "/api/v1/admin/nodes",
        json={
            "name": "Tokyo Node 01",
            "host": "159.65.12.88",
            "flag": "🇯🇵",
            "inbound_port": 443,
            "sni_profiles": [
                {"carrier": "Docomo", "domain": "images.apple.com"},
                {"carrier": "SoftBank", "domain": "www.yahoo.co.jp"},
            ],
        },
        headers=admin_headers,
    )

    # 2. Create subscription
    sub_res = await client.post(
        "/api/v1/admin/subscriptions",
        json={"customer_name": "VIP User", "quota_gb": 100.0, "days_valid": 30},
        headers=admin_headers,
    )
    token = sub_res.json()["token"]
    sub_uuid = sub_res.json()["uuid"]

    # 3. Call public endpoint WITHOUT auth
    resp = await client.get(f"/sub/{token}")
    assert resp.status_code == 200
    assert "text/plain" in resp.headers.get("content-type", "")
    assert "subscription-userinfo" in resp.headers
    assert "profile-update-interval" in resp.headers

    # Check Base64 decode
    b64_content = resp.text.strip()
    decoded = base64.b64decode(b64_content.encode("utf-8")).decode("utf-8")
    lines = [ln.strip() for ln in decoded.split("\n") if ln.strip()]
    assert len(lines) >= 2
    assert all(ln.startswith(f"vless://{sub_uuid}@") for ln in lines)


@pytest.mark.asyncio
async def test_subscription_lifecycle_crud_and_suspend(client: AsyncClient, admin_token: str) -> None:
    """Admin can retrieve, expand quota, renew days, suspend (which blocks public sub), and delete."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create subscription
    create_res = await client.post(
        "/api/v1/admin/subscriptions",
        json={"customer_name": "Customer Renew", "quota_gb": 10.0, "days_valid": 7},
        headers=headers,
    )
    sub = create_res.json()
    sub_id = sub["id"]
    token = sub["token"]

    # 2. Get detail
    get_res = await client.get(f"/api/v1/admin/subscriptions/{sub_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["customer_name"] == "Customer Renew"

    # 3. Update: add 20GB and add 14 days
    patch_res = await client.patch(
        f"/api/v1/admin/subscriptions/{sub_id}",
        json={"add_quota_gb": 20.0, "add_days": 14},
        headers=headers,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["traffic_quota_bytes"] == int(30.0 * 1024 * 1024 * 1024)

    # 4. Suspend subscription
    suspend_res = await client.patch(
        f"/api/v1/admin/subscriptions/{sub_id}",
        json={"status": "SUSPENDED"},
        headers=headers,
    )
    assert suspend_res.status_code == 200
    assert suspend_res.json()["status"] == "SUSPENDED"

    # 5. Public access should now be blocked with 403
    pub_blocked = await client.get(f"/sub/{token}")
    assert pub_blocked.status_code == 403

    # 6. Delete subscription
    del_res = await client.delete(f"/api/v1/admin/subscriptions/{sub_id}", headers=headers)
    assert del_res.status_code == 204

    # 7. Public access returns 404
    pub_not_found = await client.get(f"/sub/{token}")
    assert pub_not_found.status_code == 404
