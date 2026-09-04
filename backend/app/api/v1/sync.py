from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.models.node import Node
from app.models.user import User
from app.services.xray_grpc_service import query_node_stats, sync_all_nodes_stats_and_enforce



router: APIRouter = APIRouter(prefix="/admin/sync", tags=["sync"])


class SyncResponse(BaseModel):
    success: bool
    message: str
    details: dict[str, Any]
    timestamp: datetime


class NodeGrpcStatus(BaseModel):
    id: int
    name: str
    host: str
    grpc_port: int
    is_reachable: bool


class SyncStatusResponse(BaseModel):
    timestamp: datetime
    active_nodes_count: int
    nodes: list[NodeGrpcStatus]


@router.post("/live-stats", response_model=SyncResponse, status_code=status.HTTP_200_OK)
async def trigger_live_stats_sync(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> SyncResponse:
    """Manually poll traffic statistics from all active nodes and enforce quotas/expiries."""
    details = await sync_all_nodes_stats_and_enforce(db)
    return SyncResponse(
        success=True,
        message="Live stats polled and policies enforced successfully",
        details=details,
        timestamp=datetime.now(timezone.utc),
    )


@router.post("/enforce-limits", response_model=SyncResponse, status_code=status.HTTP_200_OK)
async def trigger_enforce_limits(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> SyncResponse:
    """Manually evaluate all subscriptions and suspend expired/over-quota accounts."""
    details = await sync_all_nodes_stats_and_enforce(db)
    return SyncResponse(
        success=True,
        message="Limits evaluated and enforcement executed",
        details=details,
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/status", response_model=SyncStatusResponse, status_code=status.HTTP_200_OK)
async def get_sync_and_node_status(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
) -> SyncStatusResponse:
    """Check connectivity and gRPC responsiveness across active nodes."""
    result = await db.execute(select(Node).where(Node.is_active.is_(True)))
    nodes = result.scalars().all()

    node_statuses: list[NodeGrpcStatus] = []
    for node in nodes:
        # A quick query test with reset=False to verify gRPC reachability
        stats = query_node_stats(node, reset=False, timeout=2.0)
        is_reachable = stats is not None  # empty dict is still a valid response if node is reachable
        node_statuses.append(
            NodeGrpcStatus(
                id=node.id,
                name=node.name,
                host=node.host,
                grpc_port=node.grpc_port,
                is_reachable=is_reachable,
            )
        )

    return SyncStatusResponse(
        timestamp=datetime.now(timezone.utc),
        active_nodes_count=len(nodes),
        nodes=node_statuses,
    )
