from typing import Any
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node
from app.models.region import Region
from app.models.subscription import Subscription, SubscriptionStatus, subscription_nodes
from app.schemas.region import RegionCreate, RegionUpdate


async def create_region(db: AsyncSession, region_in: RegionCreate) -> Region:
    """Create a new region."""
    code = region_in.code.strip().upper()
    existing = await get_region_by_code(db, code)
    if existing:
        raise ValueError(f"Region code '{code}' already exists")

    region = Region(
        code=code,
        name=region_in.name.strip(),
        flag=region_in.flag.strip(),
        is_active=region_in.is_active,
        sort_order=region_in.sort_order,
    )
    db.add(region)
    await db.commit()
    await db.refresh(region)
    return region


async def get_regions(db: AsyncSession, active_only: bool = False) -> list[Region]:
    """Retrieve all regions ordered by sort_order and code."""
    stmt = select(Region).order_by(Region.sort_order.asc(), Region.code.asc())
    if active_only:
        stmt = stmt.where(Region.is_active.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_region_by_id(db: AsyncSession, region_id: int) -> Region | None:
    """Retrieve region by ID."""
    result = await db.execute(select(Region).where(Region.id == region_id))
    return result.scalar_one_or_none()


async def get_region_by_code(db: AsyncSession, code: str) -> Region | None:
    """Retrieve region by uppercase code."""
    result = await db.execute(select(Region).where(Region.code == code.strip().upper()))
    return result.scalar_one_or_none()


async def update_region(db: AsyncSession, region: Region, region_in: RegionUpdate) -> Region:
    """Update region fields."""
    update_data = region_in.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"] is not None:
        new_code = update_data["code"].strip().upper()
        if new_code != region.code:
            existing = await get_region_by_code(db, new_code)
            if existing and existing.id != region.id:
                raise ValueError(f"Region code '{new_code}' already exists")
            update_data["code"] = new_code

    for field, value in update_data.items():
        setattr(region, field, value)

    await db.commit()
    await db.refresh(region)
    return region


async def delete_region(db: AsyncSession, region: Region) -> None:
    """Delete a region and unlink associated nodes."""
    # Unlink nodes
    nodes_stmt = select(Node).where(Node.region_id == region.id)
    nodes_result = await db.execute(nodes_stmt)
    for node in nodes_result.scalars().all():
        node.region_id = None

    await db.delete(region)
    await db.commit()


async def get_regions_status(db: AsyncSession) -> list[dict[str, Any]]:
    """Retrieve availability and capacity status for all regions."""
    regions_stmt = select(Region).order_by(Region.sort_order.asc(), Region.code.asc())
    regions_result = await db.execute(regions_stmt)
    all_regions = list(regions_result.scalars().all())

    nodes_stmt = select(Node).order_by(Node.id.asc())
    nodes_result = await db.execute(nodes_stmt)
    all_nodes = list(nodes_result.scalars().all())

    # Map nodes by region_id or flag
    nodes_by_region_id: dict[int, list[Node]] = {}
    nodes_by_flag: dict[str, list[Node]] = {}
    for node in all_nodes:
        if node.region_id is not None:
            nodes_by_region_id.setdefault(node.region_id, []).append(node)
        if node.flag:
            nodes_by_flag.setdefault(node.flag, []).append(node)

    statuses: list[dict[str, Any]] = []
    seen_region_ids: set[int] = set()

    for region in all_regions:
        seen_region_ids.add(region.id)
        # Match nodes either by region_id or by flag
        matched_nodes = nodes_by_region_id.get(region.id, [])
        if not matched_nodes and region.flag:
            matched_nodes = nodes_by_flag.get(region.flag, [])

        total_nodes = len(matched_nodes)
        active_nodes = 0
        total_capacity = 0
        active_subscriptions = 0

        for node in matched_nodes:
            if node.is_active:
                active_nodes += 1
                total_capacity += node.max_subscriptions
                count_stmt = (
                    select(func.count(Subscription.id))
                    .join(subscription_nodes, subscription_nodes.c.subscription_id == Subscription.id)
                    .where(
                        subscription_nodes.c.node_id == node.id,
                        Subscription.status == SubscriptionStatus.ACTIVE,
                    )
                )
                cnt_res = await db.execute(count_stmt)
                active_subscriptions += int(cnt_res.scalar() or 0)

        available_slots = max(0, total_capacity - active_subscriptions)
        is_sold_out = (active_nodes == 0) or (available_slots <= 0) or (not region.is_active)

        statuses.append(
            {
                "code": region.code,
                "name": region.name,
                "flag": region.flag,
                "location": region.name,
                "total_nodes": total_nodes,
                "active_nodes": active_nodes,
                "total_capacity": total_capacity,
                "active_subscriptions": active_subscriptions,
                "available_slots": available_slots,
                "is_sold_out": is_sold_out,
            }
        )

    return statuses


async def seed_default_regions(session: AsyncSession) -> None:
    """Seed initial default regions if table is empty."""
    stmt = select(func.count(Region.id))
    result = await session.execute(stmt)
    count = int(result.scalar() or 0)
    if count == 0:
        default_regions = [
            Region(code="VN", name="Việt Nam", flag="🇻🇳", is_active=True, sort_order=1),
            Region(code="SG", name="Singapore", flag="🇸🇬", is_active=True, sort_order=2),
            Region(code="JP", name="Nhật Bản", flag="🇯🇵", is_active=True, sort_order=3),
            Region(code="US", name="Hoa Kỳ", flag="🇺🇸", is_active=True, sort_order=4),
        ]
        session.add_all(default_regions)
        await session.commit()
