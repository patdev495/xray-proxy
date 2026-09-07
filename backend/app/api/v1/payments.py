from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.payment import SepayWebhookPayload, SepayWebhookResponse
from app.services.order_service import process_sepay_webhook

router: APIRouter = APIRouter(
    prefix="/payments",
    tags=["payments"],
)


@router.post("/sepay-webhook", response_model=SepayWebhookResponse)
async def sepay_webhook_endpoint(
    payload: SepayWebhookPayload,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> SepayWebhookResponse:
    """Public webhook receiver for SePay bank transfer notifications."""
    return await process_sepay_webhook(
        db=db,
        payload=payload,
        auth_header=authorization,
    )
