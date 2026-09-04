from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node


@pytest.mark.asyncio
async def test_trigger_live_stats_unauthorized(client: AsyncClient) -> None:
    response = await client.post("/api/v1/admin/sync/live-stats")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_trigger_live_stats_success(
    client: AsyncClient, admin_token: str, db_session: AsyncSession
) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    with patch(
        "app.api.v1.sync.sync_all_nodes_stats_and_enforce",
        return_value={"synced_nodes": 1, "updated_subscriptions": 0, "suspended_count": 0},
    ):
        response = await client.post("/api/v1/admin/sync/live-stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["details"]["synced_nodes"] == 1


@pytest.mark.asyncio
async def test_trigger_enforce_limits_success(
    client: AsyncClient, admin_token: str, db_session: AsyncSession
) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    with patch(
        "app.api.v1.sync.sync_all_nodes_stats_and_enforce",
        return_value={"synced_nodes": 0, "updated_subscriptions": 0, "suspended_count": 0},
    ):
        response = await client.post("/api/v1/admin/sync/enforce-limits", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


@pytest.mark.asyncio
async def test_get_sync_status_success(
    client: AsyncClient, admin_token: str, db_session: AsyncSession
) -> None:
    node = Node(
        name="Node EU",
        host="127.0.0.1",
        inbound_port=8443,
        grpc_port=10085,
        reality_public_key="pub",
        reality_private_key="priv",
        reality_short_id="sid",
        is_active=True,
    )
    db_session.add(node)
    await db_session.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}
    with patch("app.api.v1.sync.query_node_stats", return_value={}):
        response = await client.get("/api/v1/admin/sync/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["active_nodes_count"] == 1
        assert len(data["nodes"]) == 1
        assert data["nodes"][0]["name"] == "Node EU"
        assert data["nodes"][0]["is_reachable"] is True
