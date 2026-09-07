from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.models.order import OrderStatus
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse
from app.services.order_service import (
    cancel_user_order,
    confirm_order_payment_manually,
    create_order,
    get_admin_orders,
    get_order_by_code,
    get_user_orders,
    to_order_response,
)

router: APIRouter = APIRouter(prefix="/orders", tags=["orders"])

admin_router: APIRouter = APIRouter(
    prefix="/admin/orders",
    tags=["admin-orders"],
    dependencies=[Depends(get_current_admin)],
)


@router.post("/create", response_model=OrderResponse)
async def create_order_endpoint(
    payload: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    """Create a new pending order and return VietQR payment instructions."""
    order = await create_order(
        db,
        user_id=current_user.id,
        plan_id=payload.plan_id,
        region=payload.region,
        billing_cycle=payload.billing_cycle,
        subscription_id=payload.subscription_id,
    )
    return await to_order_response(order, db)


@router.get("/my-orders", response_model=list[OrderResponse])
async def list_my_orders_endpoint(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[OrderResponse]:
    """Retrieve list of orders belonging to the currently authenticated customer."""
    orders = await get_user_orders(db, user_id=current_user.id, limit=limit)
    return [await to_order_response(o, db) for o in orders]


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order_endpoint(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    """Customer cancels their own pending order."""
    order = await cancel_user_order(db, order_id=order_id, user_id=current_user.id)
    return await to_order_response(order, db)


@router.get("/{code}", response_model=OrderResponse)
async def get_order_endpoint(
    code: str,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    """Look up order by code to check payment status and VietQR details."""
    order = await get_order_by_code(db, code)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {code} not found",
        )
    return await to_order_response(order, db)


@admin_router.get("", response_model=list[OrderResponse])
async def list_admin_orders_endpoint(
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[OrderResponse]:
    """Admin endpoint to list all orders with optional status filter."""
    orders = await get_admin_orders(
        db,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return [await to_order_response(o, db) for o in orders]


@admin_router.post("/{order_id}/confirm", response_model=OrderResponse)
async def confirm_order_endpoint(
    order_id: int,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    """Admin fallback endpoint to manually confirm payment and provision subscription."""
    order = await confirm_order_payment_manually(db, order_id)
    return await to_order_response(order, db)
