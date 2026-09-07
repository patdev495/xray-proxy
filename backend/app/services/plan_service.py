from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanUpdate


async def create_plan(db: AsyncSession, plan_in: PlanCreate) -> Plan:
    """Create a new plan with calculated traffic_quota_bytes."""
    quota_bytes = plan_in.quota_gb * 1024 * 1024 * 1024
    plan = Plan(
        name=plan_in.name,
        price_vnd=plan_in.price_vnd,
        traffic_quota_bytes=quota_bytes,
        days_valid=plan_in.days_valid,
        allowed_regions=plan_in.allowed_regions,
        is_active=plan_in.is_active,
        sort_order=plan_in.sort_order,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


async def get_plans(db: AsyncSession, active_only: bool = False) -> list[Plan]:
    """Retrieve plans ordered by sort_order."""
    stmt = select(Plan).order_by(Plan.sort_order.asc(), Plan.id.asc())
    if active_only:
        stmt = stmt.where(Plan.is_active.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_plan_by_id(db: AsyncSession, plan_id: int) -> Plan | None:
    """Retrieve single plan by ID."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    return result.scalar_one_or_none()


async def update_plan(db: AsyncSession, plan: Plan, plan_in: PlanUpdate) -> Plan:
    """Update plan attributes."""
    update_data = plan_in.model_dump(exclude_unset=True)
    if "quota_gb" in update_data and update_data["quota_gb"] is not None:
        plan.traffic_quota_bytes = update_data["quota_gb"] * 1024 * 1024 * 1024

    for field, value in update_data.items():
        if field != "quota_gb":
            setattr(plan, field, value)

    await db.commit()
    await db.refresh(plan)
    return plan


async def delete_plan(db: AsyncSession, plan: Plan) -> None:
    """Delete a plan."""
    await db.delete(plan)
    await db.commit()
