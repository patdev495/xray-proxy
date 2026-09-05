import logging
from datetime import datetime, timezone
from typing import Any

import grpc
from sqlalchemy import inspect as sa_inspect, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node
from app.models.subscription import Subscription, SubscriptionStatus, subscription_nodes
import app.proto  # noqa: F401 - ensures sys.path has proto directory
from xray.app.proxyman.command import command_pb2 as proxyman_cmd
from xray.app.proxyman.command import command_pb2_grpc as proxyman_grpc
from xray.app.stats.command import command_pb2 as stats_cmd
from xray.app.stats.command import command_pb2_grpc as stats_grpc
from xray.common.protocol import user_pb2 as protocol_user
from xray.common.serial import typed_message_pb2 as serial_msg
from xray.proxy.vless import account_pb2 as vless_account

logger = logging.getLogger(__name__)


def get_node_inbound_tags(node: Node) -> list[str]:
    """Retrieve all active VLESS reality inbound tags for the node."""
    active_snis = [
        sni for sni in getattr(node, "sni_profiles", [])
        if getattr(sni, "is_active", True) and getattr(sni, "domain", None)
    ]
    if not active_snis:
        return ["vless-reality"]
    tags: list[str] = []
    for sni in active_snis:
        raw_port = getattr(sni, "port", None)
        port = raw_port if isinstance(raw_port, int) else getattr(node, "inbound_port", 443)
        tag = f"vless-reality-{port}"
        if tag not in tags:
            tags.append(tag)
    return tags or ["vless-reality"]


def add_user_to_node(node: Node, sub_uuid: str, sub_token: str, timeout: float = 5.0) -> bool:
    """Register a VLESS user dynamically into a remote Xray node via gRPC HandlerService across all inbounds."""
    target = f"{node.host}:{node.grpc_port}"
    tags = get_node_inbound_tags(node)
    try:
        with grpc.insecure_channel(target) as channel:
            stub = proxyman_grpc.HandlerServiceStub(channel)

            vless_acc = vless_account.Account(id=sub_uuid, flow="")
            acc_typed = serial_msg.TypedMessage(
                type="xray.proxy.vless.Account",
                value=vless_acc.SerializeToString(),
            )

            user = protocol_user.User(
                level=0,
                email=sub_token,
                account=acc_typed,
            )

            add_op = proxyman_cmd.AddUserOperation(user=user)
            op_typed = serial_msg.TypedMessage(
                type="xray.app.proxyman.command.AddUserOperation",
                value=add_op.SerializeToString(),
            )

            for tag in tags:
                request = proxyman_cmd.AlterInboundRequest(
                    tag=tag,
                    operation=op_typed,
                )
                stub.AlterInbound(request, timeout=timeout)

            logger.info("Added user %s to node %s (%s) on tags %s", sub_token, node.name, target, tags)
            return True
    except grpc.RpcError as exc:
        logger.warning("Failed to add user %s to node %s (%s): %s", sub_token, node.name, target, exc)
        return False
    except Exception as exc:
        logger.error("Unexpected error adding user %s to node %s: %s", sub_token, node.name, exc)
        return False


def remove_user_from_node(node: Node, sub_token: str, timeout: float = 5.0) -> bool:
    """Remove a user dynamically from a remote Xray node via gRPC HandlerService across all inbounds."""
    target = f"{node.host}:{node.grpc_port}"
    tags = get_node_inbound_tags(node)
    try:
        with grpc.insecure_channel(target) as channel:
            stub = proxyman_grpc.HandlerServiceStub(channel)

            rm_op = proxyman_cmd.RemoveUserOperation(email=sub_token)
            op_typed = serial_msg.TypedMessage(
                type="xray.app.proxyman.command.RemoveUserOperation",
                value=rm_op.SerializeToString(),
            )

            for tag in tags:
                request = proxyman_cmd.AlterInboundRequest(
                    tag=tag,
                    operation=op_typed,
                )
                stub.AlterInbound(request, timeout=timeout)

            logger.info("Removed user %s from node %s (%s) on tags %s", sub_token, node.name, target, tags)
            return True
    except grpc.RpcError as exc:
        logger.warning("Failed to remove user %s from node %s (%s): %s", sub_token, node.name, target, exc)
        return False
    except Exception as exc:
        logger.error("Unexpected error removing user %s from node %s: %s", sub_token, node.name, exc)
        return False


def query_node_stats(
    node: Node,
    pattern: str = "user>>>",
    reset: bool = True,
    timeout: float = 5.0,
) -> dict[str, int]:
    """Query traffic counters from remote Xray node via gRPC StatsService."""
    target = f"{node.host}:{node.grpc_port}"
    user_traffic: dict[str, int] = {}
    try:
        with grpc.insecure_channel(target) as channel:
            stub = stats_grpc.StatsServiceStub(channel)
            request = stats_cmd.QueryStatsRequest(pattern=pattern, reset=reset)
            response = stub.QueryStats(request, timeout=timeout)

            for stat in response.stat:
                # Name format: user>>>{token/email}>>>traffic>>>{uplink|downlink}
                if stat.name.startswith("user>>>"):
                    parts = stat.name.split(">>>")
                    if len(parts) >= 2:
                        token = parts[1]
                        user_traffic[token] = user_traffic.get(token, 0) + int(stat.value)
            return user_traffic
    except grpc.RpcError as exc:
        logger.warning("Failed to query stats from node %s (%s): %s", node.name, target, exc)
        return {}
    except Exception as exc:
        logger.error("Unexpected error querying stats from node %s: %s", node.name, exc)
        return {}


async def _get_target_nodes(db: AsyncSession, subscription: Subscription) -> list[Node]:
    """Retrieve active nodes assigned to subscription, or all active nodes if none assigned."""
    sub_id = getattr(subscription, "id", None)
    if sub_id is not None:
        assigned_query = (
            select(Node)
            .join(subscription_nodes, Node.id == subscription_nodes.c.node_id)
            .where(subscription_nodes.c.subscription_id == sub_id, Node.is_active.is_(True))
        )
        res = await db.execute(assigned_query)
        assigned = list(res.scalars().all())
        if assigned:
            return assigned

    try:
        insp = sa_inspect(subscription)
        if insp is not None and "nodes" in insp.dict and subscription.nodes:
            return [n for n in subscription.nodes if n.is_active]
    except Exception:
        pass

    result = await db.execute(select(Node).where(Node.is_active.is_(True)))
    return list(result.scalars().all())


async def sync_user_to_all_nodes(db: AsyncSession, subscription: Subscription) -> list[int]:
    """Push user credentials to assigned active Xray nodes."""
    nodes = await _get_target_nodes(db, subscription)
    success_ids: list[int] = []
    for node in nodes:
        if add_user_to_node(node, subscription.uuid, subscription.token):
            success_ids.append(node.id)
    return success_ids


async def remove_user_from_all_nodes(db: AsyncSession, subscription: Subscription) -> list[int]:
    """Revoke user credentials from assigned active Xray nodes."""
    nodes = await _get_target_nodes(db, subscription)
    success_ids: list[int] = []
    for node in nodes:
        if remove_user_from_node(node, subscription.token):
            success_ids.append(node.id)
    return success_ids


async def sync_all_users_to_node(db: AsyncSession, node: Node) -> int:
    """Register all active applicable subscriptions to the specified node across all inbound tags."""
    from app.services.node_service import get_active_subscriptions_for_node

    active_subs = await get_active_subscriptions_for_node(db, node.id)
    success_count = 0
    for sub in active_subs:
        if add_user_to_node(node, sub.uuid, sub.token):
            success_count += 1
    logger.info("Synced %d/%d active users to node %s", success_count, len(active_subs), node.name)
    return success_count


async def sync_all_active_users_to_all_nodes(db: AsyncSession) -> dict[str, int]:
    """Startup & recovery routine: register all active subscriptions to all active nodes."""
    res = await db.execute(select(Node).where(Node.is_active.is_(True)))
    nodes = list(res.scalars().all())
    stats: dict[str, int] = {}
    for node in nodes:
        count = await sync_all_users_to_node(db, node)
        stats[node.name] = count
    return stats



async def sync_all_nodes_stats_and_enforce(db: AsyncSession) -> dict[str, Any]:
    """
    Poll traffic deltas from all active nodes, accumulate used_bytes in DB,
    and automatically suspend & revoke accounts exceeding quota or expired.
    """
    result = await db.execute(select(Node).where(Node.is_active.is_(True)))
    nodes = result.scalars().all()

    aggregated_deltas: dict[str, int] = {}
    for node in nodes:
        node_stats = query_node_stats(node, reset=True)
        for token, delta_bytes in node_stats.items():
            aggregated_deltas[token] = aggregated_deltas.get(token, 0) + delta_bytes

    sub_result = await db.execute(select(Subscription))
    subscriptions = sub_result.scalars().all()

    now = datetime.now(timezone.utc)
    updated_count = 0
    suspended_count = 0

    for sub in subscriptions:
        delta = aggregated_deltas.get(sub.token, 0)
        if delta > 0:
            sub.traffic_used_bytes += delta
            updated_count += 1

        sub_expires_at = sub.expires_at
        if sub_expires_at.tzinfo is None:
            sub_expires_at = sub_expires_at.replace(tzinfo=timezone.utc)

        is_quota_exhausted = sub.traffic_quota_bytes > 0 and sub.traffic_used_bytes >= sub.traffic_quota_bytes
        is_expired = sub_expires_at < now

        if (is_quota_exhausted or is_expired) and sub.status == SubscriptionStatus.ACTIVE:
            sub.status = SubscriptionStatus.EXPIRED if is_expired else SubscriptionStatus.SUSPENDED
            await remove_user_from_all_nodes(db, sub)
            suspended_count += 1

    await db.commit()


    return {
        "synced_nodes": len(nodes),
        "updated_subscriptions": updated_count,
        "suspended_count": suspended_count,
    }
