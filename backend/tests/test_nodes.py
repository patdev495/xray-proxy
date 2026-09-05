import pytest
from httpx import AsyncClient
from app.services.reality_service import generate_reality_keypair, RealityKeyPair


def test_generate_reality_keypair() -> None:
    """Test generating a valid X25519 Reality keypair and short ID."""
    keys: RealityKeyPair = generate_reality_keypair()

    assert keys.private_key is not None
    assert keys.public_key is not None
    assert keys.short_id is not None

    # Base64url without padding: 32 bytes -> 43 chars
    assert len(keys.private_key) == 43
    assert len(keys.public_key) == 43
    # 8 bytes hex -> 16 chars
    assert len(keys.short_id) == 16
    int(keys.short_id, 16)  # valid hex


@pytest.mark.asyncio
async def test_generate_reality_keys_endpoint(client: AsyncClient, admin_token: str) -> None:
    """Admin can request on-demand generated Reality keypair."""
    response = await client.post(
        "/api/v1/admin/nodes/generate-keys",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["private_key"]) == 43
    assert len(data["public_key"]) == 43
    assert len(data["short_id"]) == 16


@pytest.mark.asyncio
async def test_create_node_with_auto_generated_keys(client: AsyncClient, admin_token: str) -> None:
    """Creating node without providing keys automatically generates them."""
    payload = {
        "name": "Tokyo Node 01",
        "host": "159.65.12.88",
        "location": "Tokyo, Japan",
        "flag": "🇯🇵",
        "grpc_port": 10085,
        "inbound_port": 443,
        "sni_profiles": [
            {"carrier": "Docomo 5G", "domain": "images.apple.com"},
            {"carrier": "SoftBank", "domain": "www.yahoo.co.jp"},
        ],
    }
    response = await client.post(
        "/api/v1/admin/nodes",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    node = response.json()
    assert node["id"] > 0
    assert node["name"] == "Tokyo Node 01"
    assert node["host"] == "159.65.12.88"
    assert node["is_active"] is True
    assert len(node["reality_private_key"]) == 43
    assert len(node["reality_public_key"]) == 43
    assert len(node["reality_short_id"]) == 16
    assert len(node["sni_profiles"]) == 2
    assert node["sni_profiles"][0]["carrier"] == "Docomo 5G"
    assert node["sni_profiles"][0]["domain"] == "images.apple.com"


@pytest.mark.asyncio
async def test_node_crud_and_status_toggle(client: AsyncClient, admin_token: str) -> None:
    """Test listing, retrieving, updating (status toggle), and deleting a node."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a node
    create_res = await client.post(
        "/api/v1/admin/nodes",
        json={
            "name": "Osaka Node 02",
            "host": "159.65.12.99",
            "location": "Osaka, Japan",
            "flag": "🇯🇵",
            "grpc_port": 10085,
            "inbound_port": 443,
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    node_id = create_res.json()["id"]

    # 2. List nodes
    list_res = await client.get("/api/v1/admin/nodes", headers=headers)
    assert list_res.status_code == 200
    nodes = list_res.json()
    assert any(n["id"] == node_id for n in nodes)

    # 3. Get node by id
    get_res = await client.get(f"/api/v1/admin/nodes/{node_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Osaka Node 02"

    # 4. Toggle active status to False
    patch_res = await client.patch(
        f"/api/v1/admin/nodes/{node_id}",
        json={"is_active": False},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["is_active"] is False

    # 5. Delete node
    del_res = await client.delete(f"/api/v1/admin/nodes/{node_id}", headers=headers)
    assert del_res.status_code == 204

    # 6. Verify 404
    get_after_del = await client.get(f"/api/v1/admin/nodes/{node_id}", headers=headers)
    assert get_after_del.status_code == 404


@pytest.mark.asyncio
async def test_sni_profile_crud(client: AsyncClient, admin_token: str) -> None:
    """Test adding, updating, and deleting SNI profiles under a node."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create node
    node_res = await client.post(
        "/api/v1/admin/nodes",
        json={"name": "SG Node", "host": "128.199.204.14"},
        headers=headers,
    )
    node_id = node_res.json()["id"]

    # 2. Add SNI profile
    add_sni_res = await client.post(
        f"/api/v1/admin/nodes/{node_id}/sni-profiles",
        json={"carrier": "Singtel", "domain": "gateway.icloud.com"},
        headers=headers,
    )
    assert add_sni_res.status_code == 201
    sni = add_sni_res.json()
    sni_id = sni["id"]
    assert sni["carrier"] == "Singtel"
    assert sni["domain"] == "gateway.icloud.com"

    # 3. Update SNI profile
    update_sni_res = await client.put(
        f"/api/v1/admin/nodes/{node_id}/sni-profiles/{sni_id}",
        json={"carrier": "Singtel 5G", "domain": "itunes.apple.com"},
        headers=headers,
    )
    assert update_sni_res.status_code == 200
    assert update_sni_res.json()["carrier"] == "Singtel 5G"
    assert update_sni_res.json()["domain"] == "itunes.apple.com"

    # 4. Verify node now has updated SNI
    get_node_res = await client.get(f"/api/v1/admin/nodes/{node_id}", headers=headers)
    sni_list = get_node_res.json()["sni_profiles"]
    assert len(sni_list) == 1
    assert sni_list[0]["carrier"] == "Singtel 5G"

    # 5. Delete SNI profile
    del_sni_res = await client.delete(
        f"/api/v1/admin/nodes/{node_id}/sni-profiles/{sni_id}",
        headers=headers,
    )
    assert del_sni_res.status_code == 204

    # 6. Verify SNI deleted from node
    get_node_after = await client.get(f"/api/v1/admin/nodes/{node_id}", headers=headers)
    assert len(get_node_after.json()["sni_profiles"]) == 0


@pytest.mark.asyncio
async def test_sni_profile_port_allocation(client: AsyncClient, admin_token: str) -> None:
    """Test explicit port setting and auto-increment port allocation for SNI profiles."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create node with base inbound_port 8443 and 2 SNI profiles without explicit ports
    node_res = await client.post(
        "/api/v1/admin/nodes",
        json={
            "name": "Port Test Node",
            "host": "107.175.144.245",
            "inbound_port": 8443,
            "sni_profiles": [
                {"carrier": "Docomo", "domain": "images.apple.com"},
                {"carrier": "Linemo", "domain": "www.linemo.jp"},
            ],
        },
        headers=headers,
    )
    assert node_res.status_code == 201
    node_data = node_res.json()
    node_id = node_data["id"]
    snis = node_data["sni_profiles"]
    assert len(snis) == 2
    assert snis[0]["port"] == 8443
    assert snis[1]["port"] == 8444

    # 2. Add 3rd SNI profile with explicit custom port 8499
    add_custom = await client.post(
        f"/api/v1/admin/nodes/{node_id}/sni-profiles",
        json={"carrier": "Custom", "domain": "custom.com", "port": 8499},
        headers=headers,
    )
    assert add_custom.status_code == 201
    assert add_custom.json()["port"] == 8499

    # 3. Add 4th SNI profile without port -> should auto-allocate next available port (8445)
    add_auto = await client.post(
        f"/api/v1/admin/nodes/{node_id}/sni-profiles",
        json={"carrier": "Viettel", "domain": "gateway.icloud.com"},
        headers=headers,
    )
    assert add_auto.status_code == 201
    assert add_auto.json()["port"] == 8445


@pytest.mark.asyncio
async def test_get_node_install_script(client: AsyncClient, admin_token: str) -> None:
    """Endpoint returns runnable bash script for remote VPS deployment."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    create_res = await client.post(
        "/api/v1/admin/nodes",
        json={
            "name": "Tokyo VPS 01",
            "host": "159.65.12.88",
            "grpc_port": 10085,
            "inbound_port": 443,
            "sni_profiles": [
                {"carrier": "Docomo", "domain": "images.apple.com"},
                {"carrier": "SoftBank", "domain": "www.yahoo.co.jp"},
            ],
        },
        headers=headers,
    )
    node = create_res.json()
    node_id = node["id"]

    script_res = await client.get(
        f"/api/v1/admin/nodes/{node_id}/install-script",
        headers=headers,
    )
    assert script_res.status_code == 200
    assert "text/plain" in script_res.headers.get("content-type", "")

    script_text = script_res.text
    assert "#!/usr/bin/env bash" in script_text
    assert "docker run" in script_text
    assert "10085" in script_text
    assert "443" in script_text
    assert node["reality_private_key"] in script_text
    assert node["reality_short_id"] in script_text
    assert "images.apple.com" in script_text
    assert "www.yahoo.co.jp" in script_text


@pytest.mark.asyncio
async def test_generate_install_script_multi_inbound(client: AsyncClient, admin_token: str) -> None:
    """Multi-carrier node generates independent inbounds for each SNI with matching dest and port."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    create_res = await client.post(
        "/api/v1/admin/nodes",
        json={
            "name": "Multi Carrier VPS",
            "host": "107.175.144.245",
            "inbound_port": 8443,
            "sni_profiles": [
                {"carrier": "Docomo", "domain": "images.apple.com", "port": 8443},
                {"carrier": "Linemo", "domain": "www.linemo.jp", "port": 8444},
                {"carrier": "Viettel", "domain": "gateway.icloud.com", "port": 8445},
            ],
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    node_id = create_res.json()["id"]

    script_res = await client.get(
        f"/api/v1/admin/nodes/{node_id}/install-script",
        headers=headers,
    )
    assert script_res.status_code == 200
    script_text = script_res.text

    # Verify all ports exist
    assert "8443" in script_text
    assert "8444" in script_text
    assert "8445" in script_text

    # Verify all distinct dest domains exist
    assert '"dest": "images.apple.com:443"' in script_text
    assert '"dest": "www.linemo.jp:443"' in script_text
    assert '"dest": "gateway.icloud.com:443"' in script_text

    # Verify tags
    assert '"tag": "vless-reality-8443"' in script_text
    assert '"tag": "vless-reality-8444"' in script_text
    assert '"tag": "vless-reality-8445"' in script_text


@pytest.mark.asyncio
async def test_get_node_sync_script(client: AsyncClient, admin_token: str) -> None:
    """Endpoint returns lightweight 1-second reload script for syncing config changes to VPS."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    create_res = await client.post(
        "/api/v1/admin/nodes",
        json={
            "name": "Sync VPS",
            "host": "107.175.144.245",
            "inbound_port": 8443,
            "sni_profiles": [
                {"carrier": "Docomo", "domain": "images.apple.com", "port": 8443},
                {"carrier": "Linemo", "domain": "www.linemo.jp", "port": 8444},
            ],
        },
        headers=headers,
    )
    node_id = create_res.json()["id"]

    sync_res = await client.get(
        f"/api/v1/admin/nodes/{node_id}/sync-script",
        headers=headers,
    )
    assert sync_res.status_code == 200
    assert "text/plain" in sync_res.headers.get("content-type", "")

    script_text = sync_res.text
    assert "#!/usr/bin/env bash" in script_text
    assert "/etc/xray/config.json" in script_text
    assert "docker restart xray-core" in script_text
    assert "www.linemo.jp:443" in script_text
    # Ensure it doesn't do heavy re-installation
    assert "get.docker.com" not in script_text
