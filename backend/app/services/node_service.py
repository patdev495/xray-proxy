from datetime import datetime, timezone
import json
from typing import Any
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node, SniProfile
from app.models.region import Region
from app.models.subscription import Subscription, SubscriptionStatus, subscription_nodes
from app.schemas.node import NodeCreate, NodeUpdate, SniProfileCreate, SniProfileUpdate
from app.services.reality_service import generate_reality_keypair


class RegionOutOfCapacityError(Exception):
    """Raised when a region has no active nodes or all nodes have reached max_subscriptions capacity."""
    pass


async def create_node(db: AsyncSession, node_in: NodeCreate) -> Node:
    """Create a new Node. If reality keys are omitted, auto-generate them."""
    priv_key: str = node_in.reality_private_key or ""
    pub_key: str = node_in.reality_public_key or ""
    short_id: str = node_in.reality_short_id or ""

    if not (priv_key and pub_key and short_id):
        generated = generate_reality_keypair()
        priv_key = priv_key or generated.private_key
        pub_key = pub_key or generated.public_key
        short_id = short_id or generated.short_id

    location = node_in.location
    flag = node_in.flag
    if node_in.region_id is not None:
        reg_stmt = select(Region).where(Region.id == node_in.region_id)
        reg_res = await db.execute(reg_stmt)
        reg = reg_res.scalar_one_or_none()
        if reg:
            if not flag or flag in ("🇻🇳", "🌐"):
                flag = reg.flag
            if not location or location == "Unknown":
                location = reg.name

    db_node = Node(
        name=node_in.name,
        host=node_in.host,
        location=location,
        flag=flag,
        region_id=node_in.region_id,
        grpc_port=node_in.grpc_port,
        inbound_port=node_in.inbound_port,
        reality_private_key=priv_key,
        reality_public_key=pub_key,
        reality_short_id=short_id,
        max_subscriptions=node_in.max_subscriptions,
        is_active=True,
    )

    used_ports: set[int] = set()
    next_port = node_in.inbound_port
    for sni_in in node_in.sni_profiles:
        if sni_in.port is not None:
            port = sni_in.port
        else:
            while next_port in used_ports:
                next_port += 1
            port = next_port
            next_port += 1
        used_ports.add(port)

        db_sni = SniProfile(
            carrier=sni_in.carrier,
            domain=sni_in.domain,
            port=port,
            is_active=sni_in.is_active,
        )
        db_node.sni_profiles.append(db_sni)

    db.add(db_node)
    await db.commit()
    await db.refresh(db_node)
    return db_node


async def get_nodes(db: AsyncSession) -> list[Node]:
    """Retrieve all nodes ordered by ID."""
    result = await db.execute(select(Node).order_by(Node.id.asc()))
    return list(result.scalars().all())


async def get_node_by_id(db: AsyncSession, node_id: int) -> Node | None:
    """Retrieve a single node by its primary key."""
    result = await db.execute(select(Node).where(Node.id == node_id))
    return result.scalar_one_or_none()


async def update_node(db: AsyncSession, node: Node, node_in: NodeUpdate) -> Node:
    """Update node attributes."""
    update_data = node_in.model_dump(exclude_unset=True)
    if "region_id" in update_data and update_data["region_id"] is not None:
        reg_stmt = select(Region).where(Region.id == update_data["region_id"])
        reg_res = await db.execute(reg_stmt)
        reg = reg_res.scalar_one_or_none()
        if reg:
            if "flag" not in update_data:
                node.flag = reg.flag
            if "location" not in update_data:
                node.location = reg.name

    for field, value in update_data.items():
        setattr(node, field, value)

    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node


async def delete_node(db: AsyncSession, node: Node) -> None:
    """Delete a node and its cascade-related SNI profiles."""
    await db.delete(node)
    await db.commit()


async def create_sni_profile(
    db: AsyncSession,
    node: Node,
    sni_in: SniProfileCreate,
) -> SniProfile:
    """Add a new SNI profile to a node with explicit or auto-allocated port."""
    if sni_in.port is not None:
        port = sni_in.port
    else:
        existing_ports = {sni.port for sni in node.sni_profiles}
        port = node.inbound_port
        while port in existing_ports:
            port += 1

    db_sni = SniProfile(
        node_id=node.id,
        carrier=sni_in.carrier,
        domain=sni_in.domain,
        port=port,
        is_active=sni_in.is_active,
    )
    db.add(db_sni)
    await db.commit()
    await db.refresh(db_sni)
    return db_sni


async def get_sni_profile_by_id(db: AsyncSession, sni_id: int) -> SniProfile | None:
    """Retrieve an SNI profile by its ID."""
    result = await db.execute(select(SniProfile).where(SniProfile.id == sni_id))
    return result.scalar_one_or_none()


async def update_sni_profile(
    db: AsyncSession,
    sni: SniProfile,
    sni_in: SniProfileUpdate,
) -> SniProfile:
    """Update an SNI profile."""
    update_data = sni_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sni, field, value)

    db.add(sni)
    await db.commit()
    await db.refresh(sni)
    return sni


async def delete_sni_profile(db: AsyncSession, sni: SniProfile) -> None:
    """Delete an SNI profile."""
    await db.delete(sni)
    await db.commit()


async def get_active_subscriptions_for_node(db: AsyncSession, node_id: int) -> list[Subscription]:
    """Retrieve all active, unexpired subscriptions applicable to the specified node."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Subscription).where(
            Subscription.status == SubscriptionStatus.ACTIVE,
        )
    )
    all_active = list(result.scalars().all())
    applicable: list[Subscription] = []
    for sub in all_active:
        sub_expires_at = sub.expires_at
        if sub_expires_at.tzinfo is None:
            sub_expires_at = sub_expires_at.replace(tzinfo=timezone.utc)
        if sub_expires_at <= now:
            continue
        if sub.traffic_quota_bytes > 0 and sub.traffic_used_bytes >= sub.traffic_quota_bytes:
            continue
        if sub.nodes:
            if any(n.id == node_id for n in sub.nodes):
                applicable.append(sub)
        else:
            applicable.append(sub)
    return applicable


from app.services.node_script_service import (
    generate_install_script,
    generate_sync_script,
    generate_xray_config_dict,
)


async def get_node_active_subscriptions_count(db: AsyncSession, node_id: int) -> int:
    """Count number of active subscriptions bound to a node."""
    stmt = (
        select(func.count(Subscription.id))
        .join(subscription_nodes, subscription_nodes.c.subscription_id == Subscription.id)
        .where(
            subscription_nodes.c.node_id == node_id,
            Subscription.status == SubscriptionStatus.ACTIVE,
        )
    )
    result = await db.execute(stmt)
    return int(result.scalar() or 0)


async def allocate_node_for_region(
    db: AsyncSession,
    flag: str | None = None,
    region_id: int | None = None,
) -> Node:
    """Find and return the least-loaded active node in the specified region.

    Raises RegionOutOfCapacityError if no active node exists or all active nodes
    have reached their max_subscriptions limit.
    """
    conditions = [Node.is_active.is_(True)]
    if region_id is not None:
        reg_stmt = select(Region).where(Region.id == region_id)
        reg_res = await db.execute(reg_stmt)
        reg = reg_res.scalar_one_or_none()
        if reg:
            conditions.append(
                (Node.region_id == region_id) | (Node.flag == reg.flag) | (Node.flag == reg.code)
            )
        else:
            conditions.append(Node.region_id == region_id)
    elif flag:
        reg_stmt = select(Region).where((Region.flag == flag) | (Region.code == flag.upper()))
        reg_res = await db.execute(reg_stmt)
        reg = reg_res.scalar_one_or_none()
        if reg:
            conditions.append(
                (Node.region_id == reg.id) | (Node.flag == flag) | (Node.flag == reg.flag)
            )
        else:
            conditions.append(Node.flag == flag)

    stmt = select(Node).where(*conditions)
    result = await db.execute(stmt)
    active_nodes = list(result.scalars().all())

    region_label = flag or f"id={region_id}"
    if not active_nodes:
        raise RegionOutOfCapacityError(f"No active nodes in region '{region_label}'")

    eligible_nodes: list[tuple[Node, int]] = []
    for node in active_nodes:
        active_count = await get_node_active_subscriptions_count(db, node.id)
        if active_count < node.max_subscriptions:
            eligible_nodes.append((node, active_count))

    if not eligible_nodes:
        raise RegionOutOfCapacityError(f"All nodes in region '{region_label}' have reached maximum subscription capacity")

    eligible_nodes.sort(key=lambda x: x[1])
    return eligible_nodes[0][0]


async def get_regions_status(db: AsyncSession) -> list[dict[str, Any]]:
    """Retrieve capacity and availability status for all distinct node regions."""
    from app.services.region_service import get_regions_status as get_reg_status
    return await get_reg_status(db)


