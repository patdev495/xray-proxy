from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.subscription import SubscriptionStatus
from app.services.node_service import get_nodes
from app.services.subscription_service import (
    build_subscription_bundle,
    get_subscription_by_token,
)

router: APIRouter = APIRouter(tags=["public-subscription"])


@router.get(
    "/sub/{token}",
    response_class=Response,
    summary="Fetch Base64 Subscription Bundle for Shadowrocket/Xray clients",
)
async def get_public_subscription(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Public subscription link fetched by client applications."""
    sub = await get_subscription_by_token(db, token)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    if sub.status == SubscriptionStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription is suspended",
        )

    now = datetime.now(timezone.utc)
    # Ensure timezone-aware comparison
    expires_at_aware = sub.expires_at
    if expires_at_aware.tzinfo is None:
        expires_at_aware = expires_at_aware.replace(tzinfo=timezone.utc)

    if now > expires_at_aware:
        if sub.status != SubscriptionStatus.EXPIRED:
            sub.status = SubscriptionStatus.EXPIRED
            db.add(sub)
            await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription expired",
        )

    if sub.traffic_used_bytes >= sub.traffic_quota_bytes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription quota exceeded",
        )

    nodes = await get_nodes(db)
    bundle_b64 = build_subscription_bundle(uuid=sub.uuid, nodes=nodes)

    expire_ts = int(expires_at_aware.timestamp())
    userinfo_header = (
        f"upload=0; download={sub.traffic_used_bytes}; "
        f"total={sub.traffic_quota_bytes}; expire={expire_ts}"
    )

    return Response(
        content=bundle_b64,
        media_type="text/plain; charset=utf-8",
        headers={
            "Profile-Update-Interval": "12",
            "Subscription-Userinfo": userinfo_header,
            "Content-Disposition": f'inline; filename="{sub.token}.txt"',
        },
    )
