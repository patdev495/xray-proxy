from datetime import datetime, timedelta, timezone
import secrets
from urllib.parse import quote_plus
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderStatus
from app.models.plan import Plan
from app.schemas.order import OrderResponse
from app.services.plan_service import get_plan_by_id
import app.services.region_service as region_service
from app.services.setting_service import get_system_settings



def generate_order_code() -> str:
    """Generate a unique order code, e.g. ORD-8F2K9M."""
    alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"ORD-{suffix}"


def generate_vietqr_url(
    bank_id: str,
    account_number: str,
    account_name: str,
    amount_vnd: int,
    content: str,
) -> str:
    """Generate standard VietQR image link with transfer amount and remark."""
    safe_memo = quote_plus(content)
    safe_name = quote_plus(account_name)
    return (
        f"https://img.vietqr.io/image/{bank_id}-{account_number}-compact.png"
        f"?amount={amount_vnd}&addInfo={safe_memo}&accountName={safe_name}"
    )


async def get_order_by_code(db: AsyncSession, code: str) -> Order | None:
    """Retrieve an order by unique order code."""
    stmt = (
        select(Order)
        .where(Order.code == code)
        .options(selectinload(Order.plan), selectinload(Order.user))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_order(
    db: AsyncSession,
    user_id: int,
    plan_id: int,
    region: str,
) -> Order:
    """Validate capacity and create a new pending order."""
    # 1. Validate Plan
    plan = await get_plan_by_id(db, plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan is not available",
        )

    # 2. Validate Allowed Regions
    if plan.allowed_regions and region not in plan.allowed_regions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Region {region} is not permitted for this plan",
        )

    # 3. Validate Region Capacity
    region_statuses = await region_service.get_regions_status(db)
    matched_status = next(
        (s for s in region_statuses if s.get("code") == region),
        None,
    )
    if not matched_status or matched_status.get("is_sold_out", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Region is currently sold out",
        )

    # 4. Generate unique code
    code = generate_order_code()
    for _ in range(5):
        existing = await get_order_by_code(db, code)
        if not existing:
            break
        code = generate_order_code()

    # 5. Set 15-minute payment window
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=15)


    order = Order(
        code=code,
        user_id=user_id,
        plan_id=plan.id,
        region=region,
        amount_vnd=plan.price_vnd,
        status=OrderStatus.PENDING,
        created_at=now,
        expires_at=expires_at,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # Reload with relations
    reloaded = await get_order_by_code(db, order.code)
    return reloaded or order


async def to_order_response(order: Order, db: AsyncSession) -> OrderResponse:
    """Format Order entity into OrderResponse with dynamic VietQR details."""
    settings_dict = await get_system_settings(db)
    bank_id = settings_dict.get("bank_id", "MB") or "MB"
    account_number = settings_dict.get("bank_account_number", "0987654321") or "0987654321"
    account_name = settings_dict.get("bank_account_name", "XRAY PROXY") or "XRAY PROXY"

    vietqr_url = generate_vietqr_url(
        bank_id=bank_id,
        account_number=account_number,
        account_name=account_name,
        amount_vnd=order.amount_vnd,
        content=order.code,
    )

    plan_name = order.plan.name if order.plan else "Proxy Plan"

    return OrderResponse(
        id=order.id,
        code=order.code,
        user_id=order.user_id,
        plan_id=order.plan_id,
        plan_name=plan_name,
        region=order.region,
        amount_vnd=order.amount_vnd,
        status=order.status.value,
        created_at=order.created_at,
        expires_at=order.expires_at,
        vietqr_url=vietqr_url,
        bank_id=bank_id,
        bank_account_number=account_number,
        bank_account_name=account_name,
    )
