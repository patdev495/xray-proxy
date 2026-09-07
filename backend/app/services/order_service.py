from datetime import datetime, timedelta, timezone
import re
import secrets
from urllib.parse import quote_plus
import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderStatus
from app.models.plan import Plan
from app.models.region import Region
from app.models.subscription import Subscription, SubscriptionStatus
from app.schemas.order import OrderResponse
from app.schemas.payment import SepayWebhookPayload, SepayWebhookResponse
from app.services.node_service import allocate_node_for_region
from app.services.plan_service import get_plan_by_id
import app.services.region_service as region_service
from app.services.setting_service import get_system_settings
from app.services.subscription_service import get_subscription_by_id
from app.services.xray_grpc_service import sync_user_to_all_nodes


def generate_order_code() -> str:
    """Generate a unique order code, e.g. ORD-8F2K9M."""
    alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"ORD-{suffix}"


def extract_order_code(content: str) -> str | None:
    """Extract ORD-XXXXXX order code from transfer remark text."""
    if not content:
        return None
    match = re.search(r"ORD-[A-Za-z0-9]{4,12}", content, re.IGNORECASE)
    if match:
        return match.group(0).upper()
    return None


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
        .options(
            selectinload(Order.plan),
            selectinload(Order.user),
            selectinload(Order.subscription),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_order_by_id(db: AsyncSession, order_id: int) -> Order | None:
    """Retrieve an order by internal primary key."""
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.plan),
            selectinload(Order.user),
            selectinload(Order.subscription),
        )
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


async def provision_order_subscription(db: AsyncSession, order: Order) -> Subscription:
    """Provision a new active subscription for a paid order and sync to node via gRPC."""
    if order.subscription_id is not None:
        existing_sub = await get_subscription_by_id(db, order.subscription_id)
        if existing_sub:
            return existing_sub

    plan = order.plan or await get_plan_by_id(db, order.plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan {order.plan_id} not found",
        )

    # 1. Allocate least-loaded node in order's region
    reg_stmt = select(Region).where(
        or_(Region.code == order.region.upper(), Region.name == order.region, Region.flag == order.region)
    )
    reg_res = await db.execute(reg_stmt)
    region = reg_res.scalar_one_or_none()
    region_id = region.id if region else None

    allocated_node = await allocate_node_for_region(
        db,
        region_id=region_id,
        flag=order.region if not region_id else None,
    )

    # 2. Generate credentials
    sub_token = f"sub_{secrets.token_urlsafe(16)}"
    client_uuid = str(uuid.uuid4())
    customer_name = order.user.username if order.user else f"Customer-{order.user_id}"

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=plan.days_valid)

    # 3. Create Subscription
    subscription = Subscription(
        customer_name=customer_name,
        token=sub_token,
        uuid=client_uuid,
        traffic_quota_bytes=plan.traffic_quota_bytes,
        traffic_used_bytes=0,
        expires_at=expires_at,
        status=SubscriptionStatus.ACTIVE,
        plan_id=plan.id,
        region_id=region_id,
        user_id=order.user_id,
        nodes=[allocated_node],
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)

    # Reload subscription with nodes eager loaded
    reloaded_sub = await get_subscription_by_id(db, subscription.id)
    if not reloaded_sub:
        raise RuntimeError("Failed to reload created subscription")

    # 4. Sync credentials to target node via gRPC
    await sync_user_to_all_nodes(db, reloaded_sub)

    # 5. Link to Order and mark PAID
    order.status = OrderStatus.PAID
    order.subscription_id = reloaded_sub.id
    await db.commit()
    await db.refresh(order)

    return reloaded_sub


async def process_sepay_webhook(
    db: AsyncSession,
    payload: SepayWebhookPayload,
    auth_header: str | None,
) -> SepayWebhookResponse:
    """Validate SePay webhook API key, extract order code, verify amount, and provision subscription."""
    system_settings = await get_system_settings(db)
    configured_key = system_settings.get("sepay_api_key", "").strip()

    if configured_key:
        token = ""
        if auth_header:
            parts = auth_header.split()
            token = parts[1] if len(parts) > 1 else parts[0]
        if token != configured_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid SePay webhook authentication token",
            )

    order_code = extract_order_code(payload.content) or extract_order_code(payload.description or "")
    if not order_code:
        return SepayWebhookResponse(
            success=False,
            message="No valid order code found in transaction content",
        )

    order = await get_order_by_code(db, order_code)
    if not order:
        return SepayWebhookResponse(
            success=False,
            message=f"Order {order_code} not found",
            order_code=order_code,
        )

    if order.status == OrderStatus.PAID and order.subscription_id is not None:
        return SepayWebhookResponse(
            success=True,
            message="Order already processed and paid",
            order_code=order.code,
            subscription_id=order.subscription_id,
        )

    if payload.transferAmount < order.amount_vnd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transfer amount {payload.transferAmount} is less than order amount {order.amount_vnd}",
        )

    subscription = await provision_order_subscription(db, order)

    return SepayWebhookResponse(
        success=True,
        message="Payment confirmed and subscription provisioned successfully",
        order_code=order.code,
        subscription_id=subscription.id,
    )


async def confirm_order_payment_manually(db: AsyncSession, order_id: int) -> Order:
    """Admin fallback endpoint to manually confirm payment and provision subscription."""
    order = await get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found",
        )

    if order.status != OrderStatus.PAID:
        await provision_order_subscription(db, order)

    reloaded = await get_order_by_id(db, order_id)
    return reloaded or order


async def get_admin_orders(
    db: AsyncSession,
    status_filter: OrderStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Order]:
    """Retrieve orders for Admin dashboard with filters and eager loading."""
    stmt = (
        select(Order)
        .options(
            selectinload(Order.plan),
            selectinload(Order.user),
            selectinload(Order.subscription),
        )
        .order_by(Order.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if status_filter is not None:
        stmt = stmt.where(Order.status == status_filter)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_user_orders(
    db: AsyncSession,
    user_id: int,
    limit: int = 50,
) -> list[Order]:
    """Retrieve orders for a specific user ordered by created_at desc."""
    stmt = (
        select(Order)
        .where(Order.user_id == user_id)
        .options(
            selectinload(Order.plan),
            selectinload(Order.user),
            selectinload(Order.subscription),
        )
        .order_by(Order.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def cancel_user_order(
    db: AsyncSession,
    order_id: int,
    user_id: int,
) -> Order:
    """Cancel a pending order belonging to the user."""
    order = await get_order_by_id(db, order_id)
    if not order or order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found",
        )
    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order with status {order.status.value}",
        )
    order.status = OrderStatus.CANCELLED
    await db.commit()
    await db.refresh(order)
    reloaded = await get_order_by_id(db, order_id)
    return reloaded or order


async def to_order_response(order: Order, db: AsyncSession) -> OrderResponse:
    """Format Order entity into OrderResponse with dynamic VietQR details."""
    settings_dict = await get_system_settings(db)
    bank_id = settings_dict.get("bank_id", "MB") or "MB"
    account_number = settings_dict.get("bank_account_number", "0987654321") or "0987654321"
    account_name = settings_dict.get("bank_account_name", "XRAY PROXY") or "XRAY PROXY"
    transfer_prefix = (settings_dict.get("bank_transfer_prefix") or "").strip()

    # Auto-default to SEVQR if bank is VietinBank (ICB) and prefix not explicitly set
    if not transfer_prefix and bank_id.upper() in {"ICB", "VIETINBANK"}:
        transfer_prefix = "SEVQR"

    transfer_content = f"{transfer_prefix} {order.code}".strip() if transfer_prefix else order.code

    vietqr_url = generate_vietqr_url(
        bank_id=bank_id,
        account_number=account_number,
        account_name=account_name,
        amount_vnd=order.amount_vnd,
        content=transfer_content,
    )

    plan_name = order.plan.name if order.plan else "Proxy Plan"
    username = order.user.username if order.user else None

    sub_token: str | None = None
    sub_url: str | None = None
    if order.subscription:
        sub_token = order.subscription.token
        sub_url = f"/api/v1/subscriptions/{sub_token}/sub"
    elif order.subscription_id:
        sub = await get_subscription_by_id(db, order.subscription_id)
        if sub:
            sub_token = sub.token
            sub_url = f"/api/v1/subscriptions/{sub_token}/sub"

    return OrderResponse(
        id=order.id,
        code=order.code,
        user_id=order.user_id,
        username=username,
        plan_id=order.plan_id,
        plan_name=plan_name,
        region=order.region,
        amount_vnd=order.amount_vnd,
        status=order.status.value,
        subscription_id=order.subscription_id,
        subscription_token=sub_token,
        subscription_url=sub_url,
        created_at=order.created_at,
        expires_at=order.expires_at,
        vietqr_url=vietqr_url,
        bank_id=bank_id,
        bank_account_number=account_number,
        bank_account_name=account_name,
        transfer_content=transfer_content,
    )
