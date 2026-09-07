import base64
import secrets
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node
from app.models.plan import Plan
from app.models.region import Region
from app.models.subscription import Subscription, SubscriptionStatus
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate
from app.services.node_service import allocate_node_for_region
from app.services.plan_service import get_plan_by_id
from app.services.region_service import get_region_by_id
from app.services.user_service import get_user_by_id
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
    """Create a new subscription with unique token, UUID, quota, expiry, plan, and assigned nodes."""
    token = f"sub_{secrets.token_urlsafe(16)}"
    client_uuid = str(uuid.uuid4())

    plan: Plan | None = None
    if sub_in.plan_id is not None:
        plan = await get_plan_by_id(db, sub_in.plan_id)
        if not plan or not plan.is_active:
            raise ValueError("Selected plan is not found or inactive")
        quota_bytes = plan.traffic_quota_bytes if sub_in.quota_gb is None else int(sub_in.quota_gb * 1024 * 1024 * 1024)
        days = plan.days_valid if sub_in.days_valid is None else sub_in.days_valid
    else:
        quota_bytes = int(sub_in.quota_gb * 1024 * 1024 * 1024) if sub_in.quota_gb is not None else 0
        days = sub_in.days_valid if sub_in.days_valid is not None else 30

    expires_at = datetime.now(timezone.utc) + timedelta(days=days)

    # Determine region and node allocation
    assigned_region_id: int | None = None
    if sub_in.region_id is not None:
        region = await get_region_by_id(db, sub_in.region_id)
        if not region:
            raise ValueError(f"Region ID {sub_in.region_id} not found")
        if not region.is_active:
            raise ValueError(f"Region '{region.name}' is currently inactive")
        if plan and plan.allowed_regions and len(plan.allowed_regions) > 0:
            if region.code not in plan.allowed_regions:
                raise ValueError(f"Region '{region.code}' is not permitted for plan '{plan.name}'")
        allocated_node = await allocate_node_for_region(db, region_id=region.id)
        assigned_nodes = [allocated_node]
        assigned_region_id = region.id
    elif sub_in.node_ids is not None and len(sub_in.node_ids) > 0:
        node_query = select(Node).where(Node.id.in_(sub_in.node_ids), Node.is_active.is_(True))
        nodes_res = await db.execute(node_query)
        assigned_nodes = list(nodes_res.scalars().all())
        assigned_region_id = assigned_nodes[0].region_id if (len(assigned_nodes) == 1 and assigned_nodes[0].region_id) else None
    else:
        node_query = select(Node).where(Node.is_active.is_(True))
        nodes_res = await db.execute(node_query)
        assigned_nodes = list(nodes_res.scalars().all())

    user = None
    if sub_in.user_id is not None:
        user = await get_user_by_id(db, sub_in.user_id)
        if not user:
            raise ValueError(f"User with ID {sub_in.user_id} not found")

    cust_name = sub_in.customer_name.strip() if (sub_in.customer_name and sub_in.customer_name.strip()) else (user.username if user else "Anonymous")

    db_sub = Subscription(
        customer_name=cust_name,
        token=token,
        uuid=client_uuid,
        traffic_quota_bytes=quota_bytes,
        traffic_used_bytes=0,
        expires_at=expires_at,
        status=SubscriptionStatus.ACTIVE,
        plan_id=sub_in.plan_id,
        region_id=assigned_region_id,
        user_id=user.id if user else None,
        nodes=assigned_nodes,
    )
    db.add(db_sub)
    await db.commit()
    await db.refresh(db_sub)

    # Optional: Record as completed order if user and plan exist
    if sub_in.create_order and user and plan:
        from app.models.order import Order, OrderStatus
        from app.services.order_service import generate_order_code
        order_code = generate_order_code()
        reg_code = region.code if (sub_in.region_id and region) else "GLOBAL"
        now_dt = datetime.now(timezone.utc)
        order = Order(
            code=order_code,
            user_id=user.id,
            plan_id=plan.id,
            region=reg_code,
            billing_cycle="MONTHLY",
            duration_days=days,
            amount_vnd=plan.price_vnd,
            status=OrderStatus.PAID,
            subscription_id=db_sub.id,
            created_at=now_dt,
            expires_at=now_dt + timedelta(days=days),
        )
        db.add(order)
        await db.commit()

    # Eager load relationships for response serialization
    reloaded_sub = await get_subscription_by_id(db, db_sub.id)
    if reloaded_sub is None:
        raise RuntimeError(f"Failed to reload created subscription with ID {db_sub.id}")

    # Sync new active subscription to assigned nodes
    if reloaded_sub.status == SubscriptionStatus.ACTIVE:
        await sync_user_to_all_nodes(db, reloaded_sub)

    return reloaded_sub




async def get_subscriptions(db: AsyncSession) -> list[Subscription]:
    """Retrieve all subscriptions ordered by ID descending with relations eager loaded."""
    stmt = (
        select(Subscription)
        .options(
            selectinload(Subscription.nodes),
            selectinload(Subscription.plan),
            selectinload(Subscription.region),
        )
        .order_by(Subscription.id.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_subscription_by_id(db: AsyncSession, sub_id: int) -> Subscription | None:
    """Retrieve subscription by primary key with relations eager loaded."""
    stmt = (
        select(Subscription)
        .options(
            selectinload(Subscription.nodes),
            selectinload(Subscription.plan),
            selectinload(Subscription.region),
        )
        .where(Subscription.id == sub_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_subscription_by_token(db: AsyncSession, token: str) -> Subscription | None:
    """Retrieve subscription by secret token with relations eager loaded."""
    stmt = (
        select(Subscription)
        .options(
            selectinload(Subscription.nodes),
            selectinload(Subscription.plan),
            selectinload(Subscription.region),
        )
        .where(Subscription.token == token)
    )
    result = await db.execute(stmt)
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

    if sub_in.plan_id is not None:
        sub.plan_id = sub_in.plan_id

    if sub_in.region_id is not None:
        sub.region_id = sub_in.region_id

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

