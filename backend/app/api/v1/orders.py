from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse
from app.services.order_service import (
    create_order,
    get_order_by_code,
    to_order_response,
)

router: APIRouter = APIRouter(prefix="/orders", tags=["orders"])


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
    )
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
