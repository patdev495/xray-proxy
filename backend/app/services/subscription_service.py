import base64
import secrets
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node
from app.models.subscription import Subscription, SubscriptionStatus
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate
from app.services.xray_grpc_service import (
    add_user_to_node,
    remove_user_from_all_nodes,
    remove_user_from_node,
    sync_user_to_all_nodes,
)



def build_vless_link(
    uuid: str,
    host: str,
    port: int,
    public_key: str,
    short_id: str,
    sni: str,
    remark: str,
) -> str:
    """Build a standard VLESS-Reality URI compliant with Shadowrocket and Xray clients."""
    params: dict[str, Any] = {
        "security": "reality",
        "encryption": "none",
        "pbk": public_key,
        "headerType": "none",
        "type": "tcp",
        "sni": sni,
        "sid": short_id,
        "fp": "chrome",
    }
    query_string: str = urllib.parse.urlencode(params)
    safe_remark: str = urllib.parse.quote(remark)
    return f"vless://{uuid}@{host}:{port}?{query_string}#{safe_remark}"


def build_subscription_bundle(uuid: str, nodes: list[Node]) -> str:
    """Generate a Base64-encoded subscription bundle for a customer UUID across active nodes and SNIs."""
    links: list[str] = []

    for node in nodes:
        if not node.is_active:
            continue

        active_snis = [sni for sni in node.sni_profiles if sni.is_active]
        if not active_snis:
            remark = f"{node.flag} {node.name} - Default" if node.flag else f"{node.name} - Default"
            links.append(
                build_vless_link(
                    uuid=uuid,
                    host=node.host,
                    port=node.inbound_port,
                    public_key=node.reality_public_key,
                    short_id=node.reality_short_id,
                    sni="images.apple.com",
                    remark=remark,
                )
            )
            continue

        for sni in active_snis:
            flag_prefix = f"{node.flag} " if node.flag else ""
            remark = f"{flag_prefix}{node.name} - {sni.carrier}"
            raw_port = getattr(sni, "port", None)
            sni_port = raw_port if isinstance(raw_port, int) else node.inbound_port
            links.append(
                build_vless_link(
                    uuid=uuid,
                    host=node.host,
                    port=sni_port,
                    public_key=node.reality_public_key,
                    short_id=node.reality_short_id,
                    sni=sni.domain,
                    remark=remark,
                )
            )

    bundle_text = "\n".join(links)
    return base64.b64encode(bundle_text.encode("utf-8")).decode("utf-8")


async def create_subscription(db: AsyncSession, sub_in: SubscriptionCreate) -> Subscription:
    """Create a new subscription with unique token, UUID, quota, expiry, and assigned nodes."""
    token = f"sub_{secrets.token_urlsafe(16)}"
    client_uuid = str(uuid.uuid4())
    quota_bytes = int(sub_in.quota_gb * 1024 * 1024 * 1024)
    expires_at = datetime.now(timezone.utc) + timedelta(days=sub_in.days_valid)

    # Assign specific nodes or default to all active nodes
    if sub_in.node_ids is not None and len(sub_in.node_ids) > 0:
        node_query = select(Node).where(Node.id.in_(sub_in.node_ids), Node.is_active.is_(True))
    else:
        node_query = select(Node).where(Node.is_active.is_(True))
    
    nodes_res = await db.execute(node_query)
    assigned_nodes = list(nodes_res.scalars().all())

    db_sub = Subscription(
        customer_name=sub_in.customer_name,
        token=token,
        uuid=client_uuid,
        traffic_quota_bytes=quota_bytes,
        traffic_used_bytes=0,
        expires_at=expires_at,
        status=SubscriptionStatus.ACTIVE,
        nodes=assigned_nodes,
    )
    db.add(db_sub)
    await db.commit()
    await db.refresh(db_sub)

    # Sync new active subscription to assigned nodes
    if db_sub.status == SubscriptionStatus.ACTIVE:
        await sync_user_to_all_nodes(db, db_sub)

    return db_sub



async def get_subscriptions(db: AsyncSession) -> list[Subscription]:
    """Retrieve all subscriptions ordered by ID descending."""
    result = await db.execute(select(Subscription).order_by(Subscription.id.desc()))
    return list(result.scalars().all())


async def get_subscription_by_id(db: AsyncSession, sub_id: int) -> Subscription | None:
    """Retrieve subscription by primary key."""
    result = await db.execute(select(Subscription).where(Subscription.id == sub_id))
    return result.scalar_one_or_none()


async def get_subscription_by_token(db: AsyncSession, token: str) -> Subscription | None:
    """Retrieve subscription by secret token."""
    result = await db.execute(select(Subscription).where(Subscription.token == token))
    return result.scalar_one_or_none()


async def update_subscription(
    db: AsyncSession,
    sub: Subscription,
    sub_in: SubscriptionUpdate,
) -> Subscription:
    """Update subscription: customer name, quota, expiry, status, or node assignment."""
    now = datetime.now(timezone.utc)
    old_status = sub.status

    if sub_in.customer_name is not None:
        sub.customer_name = sub_in.customer_name

    if sub_in.traffic_quota_gb is not None and sub_in.traffic_quota_gb > 0:
        sub.traffic_quota_bytes = int(sub_in.traffic_quota_gb * 1024 * 1024 * 1024)
    elif sub_in.add_quota_gb is not None and sub_in.add_quota_gb > 0:
        sub.traffic_quota_bytes += int(sub_in.add_quota_gb * 1024 * 1024 * 1024)

    if sub_in.expires_at is not None:
        sub.expires_at = sub_in.expires_at
    elif sub_in.add_days is not None and sub_in.add_days > 0:
        expires_at = sub.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        base_date = expires_at if expires_at > now else now
        sub.expires_at = base_date + timedelta(days=sub_in.add_days)
        if sub.status in (SubscriptionStatus.EXPIRED, SubscriptionStatus.SUSPENDED):
            sub.status = SubscriptionStatus.ACTIVE

    if sub_in.status is not None:
        sub.status = sub_in.status

    removed_nodes: list[Node] = []
    added_nodes: list[Node] = []

    if sub_in.node_ids is not None:
        old_map = {n.id: n for n in (sub.nodes or [])}
        if len(sub_in.node_ids) > 0:
            nodes_res = await db.execute(
                select(Node).where(Node.id.in_(sub_in.node_ids), Node.is_active.is_(True))
            )
            new_nodes = list(nodes_res.scalars().all())
        else:
            new_nodes = []

        new_map = {n.id: n for n in new_nodes}
        removed_nodes = [n for nid, n in old_map.items() if nid not in new_map]
        added_nodes = [n for nid, n in new_map.items() if nid not in old_map]
        sub.nodes = new_nodes

    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    # Sync or revoke across nodes upon status transition
    if sub.status == SubscriptionStatus.ACTIVE and old_status != SubscriptionStatus.ACTIVE:
        await sync_user_to_all_nodes(db, sub)
    elif sub.status in (SubscriptionStatus.SUSPENDED, SubscriptionStatus.EXPIRED) and old_status == SubscriptionStatus.ACTIVE:
        await remove_user_from_all_nodes(db, sub)
    elif sub.status == SubscriptionStatus.ACTIVE:
        # Differential sync for node assignment changes
        for node in removed_nodes:
            remove_user_from_node(node, sub.token)
        for node in added_nodes:
            add_user_to_node(node, sub.uuid, sub.token)

    return sub


async def delete_subscription(db: AsyncSession, sub: Subscription) -> None:
    """Delete a subscription and remove user credentials from all nodes."""
    await remove_user_from_all_nodes(db, sub)
    await db.delete(sub)
    await db.commit()

