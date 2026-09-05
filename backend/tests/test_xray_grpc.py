from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import grpc
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node
from app.models.subscription import Subscription, SubscriptionStatus
from app.services.xray_grpc_service import (
    add_user_to_node,
    query_node_stats,
    remove_user_from_all_nodes,
    remove_user_from_node,
    sync_all_nodes_stats_and_enforce,
    sync_user_to_all_nodes,
)


@pytest.fixture
def mock_node() -> Node:
    return Node(
        name="Test Node 1",
        host="127.0.0.1",
        inbound_port=8443,
        grpc_port=10085,
        reality_public_key="pub123",
        reality_private_key="priv123",
        reality_short_id="sid123",
        is_active=True,
    )


import secrets
import uuid


@pytest.fixture
def mock_subscription() -> Subscription:
    return Subscription(
        customer_name="Test Customer",
        token=f"sub-{secrets.token_hex(6)}",
        uuid=str(uuid.uuid4()),
        status=SubscriptionStatus.ACTIVE,
        traffic_quota_bytes=10 * 1024 * 1024 * 1024,  # 10 GB
        traffic_used_bytes=1024 * 1024,  # 1 MB
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )




def test_add_user_to_node_success(mock_node: Node) -> None:
    with patch("grpc.insecure_channel") as mock_chan, patch(
        "xray.app.proxyman.command.command_pb2_grpc.HandlerServiceStub"
    ) as mock_stub_cls:
        mock_stub = MagicMock()
        mock_stub_cls.return_value = mock_stub
        mock_stub.AlterInbound.return_value = MagicMock()

        success = add_user_to_node(mock_node, "test-uuid", "test-token")
        assert success is True
        mock_stub.AlterInbound.assert_called_once()
        req = mock_stub.AlterInbound.call_args[0][0]
        assert req.tag == "vless-reality"
        assert req.operation.type == "xray.app.proxyman.command.AddUserOperation"


def test_add_and_remove_user_multi_inbound() -> None:
    """gRPC service registers user across all active inbound tags on multi-carrier node."""
    from app.models.node import SniProfile
    multi_node = Node(
        name="Multi Node",
        host="127.0.0.1",
        inbound_port=8443,
        grpc_port=10085,
        reality_public_key="pub123",
        reality_private_key="priv123",
        reality_short_id="sid123",
        is_active=True,
        sni_profiles=[
            SniProfile(carrier="Docomo", domain="images.apple.com", port=8443, is_active=True),
            SniProfile(carrier="Linemo", domain="www.linemo.jp", port=8444, is_active=True),
        ],
    )

    with patch("grpc.insecure_channel") as mock_chan, patch(
        "xray.app.proxyman.command.command_pb2_grpc.HandlerServiceStub"
    ) as mock_stub_cls:
        mock_stub = MagicMock()
        mock_stub_cls.return_value = mock_stub

        # Test Add User
        success = add_user_to_node(multi_node, "test-uuid", "test-token")
        assert success is True
        assert mock_stub.AlterInbound.call_count == 2
        tags_called = [call[0][0].tag for call in mock_stub.AlterInbound.call_args_list]
        assert "vless-reality-8443" in tags_called
        assert "vless-reality-8444" in tags_called

        # Test Remove User
        mock_stub.reset_mock()
        rm_success = remove_user_from_node(multi_node, "test-token")
        assert rm_success is True
        assert mock_stub.AlterInbound.call_count == 2
        rm_tags = [call[0][0].tag for call in mock_stub.AlterInbound.call_args_list]
        assert "vless-reality-8443" in rm_tags
        assert "vless-reality-8444" in rm_tags


def test_add_user_to_node_failure(mock_node: Node) -> None:
    with patch("grpc.insecure_channel") as mock_chan, patch(
        "xray.app.proxyman.command.command_pb2_grpc.HandlerServiceStub"
    ) as mock_stub_cls:
        mock_stub = MagicMock()
        mock_stub_cls.return_value = mock_stub
        mock_stub.AlterInbound.side_effect = grpc.RpcError("Connection failed")

        success = add_user_to_node(mock_node, "test-uuid", "test-token")
        assert success is False


def test_remove_user_from_node_success(mock_node: Node) -> None:
    with patch("grpc.insecure_channel") as mock_chan, patch(
        "xray.app.proxyman.command.command_pb2_grpc.HandlerServiceStub"
    ) as mock_stub_cls:
        mock_stub = MagicMock()
        mock_stub_cls.return_value = mock_stub
        mock_stub.AlterInbound.return_value = MagicMock()

        success = remove_user_from_node(mock_node, "test-token")
        assert success is True
        mock_stub.AlterInbound.assert_called_once()
        req = mock_stub.AlterInbound.call_args[0][0]
        assert req.tag == "vless-reality"
        assert req.operation.type == "xray.app.proxyman.command.RemoveUserOperation"


def test_query_node_stats_success(mock_node: Node) -> None:
    with patch("grpc.insecure_channel") as mock_chan, patch(
        "xray.app.stats.command.command_pb2_grpc.StatsServiceStub"
    ) as mock_stub_cls:
        mock_stub = MagicMock()
        mock_stub_cls.return_value = mock_stub

        stat1 = MagicMock()
        stat1.name = "user>>>sub-token-xyz>>>traffic>>>uplink"
        stat1.value = 1000

        stat2 = MagicMock()
        stat2.name = "user>>>sub-token-xyz>>>traffic>>>downlink"
        stat2.value = 2000

        stat3 = MagicMock()
        stat3.name = "inbound>>>vless-reality>>>traffic>>>downlink"
        stat3.value = 99999

        resp = MagicMock()
        resp.stat = [stat1, stat2, stat3]
        mock_stub.QueryStats.return_value = resp

        stats = query_node_stats(mock_node, reset=True)
        assert stats == {"sub-token-xyz": 3000}


@pytest.mark.asyncio
async def test_sync_user_to_all_nodes(
    db_session: AsyncSession, mock_node: Node, mock_subscription: Subscription
) -> None:
    db_session.add(mock_node)
    db_session.add(mock_subscription)
    await db_session.commit()

    with patch("app.services.xray_grpc_service.add_user_to_node", return_value=True) as mock_add:
        success_node_ids = await sync_user_to_all_nodes(db_session, mock_subscription)
        assert success_node_ids == [mock_node.id]
        mock_add.assert_called_once_with(mock_node, mock_subscription.uuid, mock_subscription.token)


@pytest.mark.asyncio
async def test_remove_user_from_all_nodes(
    db_session: AsyncSession, mock_node: Node, mock_subscription: Subscription
) -> None:
    db_session.add(mock_node)
    db_session.add(mock_subscription)
    await db_session.commit()

    with patch("app.services.xray_grpc_service.remove_user_from_node", return_value=True) as mock_rm:
        success_node_ids = await remove_user_from_all_nodes(db_session, mock_subscription)
        assert success_node_ids == [mock_node.id]
        mock_rm.assert_called_once_with(mock_node, mock_subscription.token)


@pytest.mark.asyncio
async def test_sync_all_nodes_stats_and_enforce_quota_exceeded(
    db_session: AsyncSession, mock_node: Node, mock_subscription: Subscription
) -> None:
    mock_subscription.traffic_quota_bytes = 5000
    mock_subscription.traffic_used_bytes = 4000
    db_session.add(mock_node)
    db_session.add(mock_subscription)
    await db_session.commit()

    with patch(
        "app.services.xray_grpc_service.query_node_stats",
        return_value={mock_subscription.token: 2000},
    ), patch(
        "app.services.xray_grpc_service.remove_user_from_all_nodes",
        return_value=[mock_node.id],
    ) as mock_rm:
        result = await sync_all_nodes_stats_and_enforce(db_session)


        await db_session.refresh(mock_subscription)
        assert mock_subscription.traffic_used_bytes == 6000
        assert mock_subscription.status == SubscriptionStatus.SUSPENDED
        mock_rm.assert_called_once_with(db_session, mock_subscription)
        assert result["suspended_count"] == 1


@pytest.mark.asyncio
async def test_sync_all_nodes_stats_and_enforce_expired(
    db_session: AsyncSession, mock_node: Node, mock_subscription: Subscription
) -> None:
    mock_subscription.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db_session.add(mock_node)
    db_session.add(mock_subscription)
    await db_session.commit()

    with patch(
        "app.services.xray_grpc_service.query_node_stats",
        return_value={},
    ), patch(
        "app.services.xray_grpc_service.remove_user_from_all_nodes",
        return_value=[mock_node.id],
    ) as mock_rm:
        result = await sync_all_nodes_stats_and_enforce(db_session)

        await db_session.refresh(mock_subscription)
        assert mock_subscription.status == SubscriptionStatus.EXPIRED
        mock_rm.assert_called_once_with(db_session, mock_subscription)
        assert result["suspended_count"] == 1

