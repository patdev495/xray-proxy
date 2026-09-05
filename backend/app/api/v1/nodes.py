from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.models.user import User
from app.schemas.node import (
    NodeCreate,
    NodeResponse,
    NodeUpdate,
    RealityKeysResponse,
    SniProfileCreate,
    SniProfileResponse,
    SniProfileUpdate,
)
from app.services.node_service import (
    create_node,
    create_sni_profile,
    delete_node,
    delete_sni_profile,
    generate_install_script,
    generate_sync_script,
    get_node_by_id,
    get_nodes,
    get_sni_profile_by_id,
    update_node,
    update_sni_profile,
)
from app.services.reality_service import generate_reality_keypair

router: APIRouter = APIRouter(
    prefix="/admin/nodes",
    tags=["admin-nodes"],
    dependencies=[Depends(get_current_admin)],
)


@router.post(
    "/generate-keys",
    response_model=RealityKeysResponse,
    summary="Generate Reality X25519 Keypair on-demand",
)
async def generate_keys_endpoint() -> RealityKeysResponse:
    """Generate ephemeral X25519 keypair and short ID."""
    keys = generate_reality_keypair()
    return RealityKeysResponse(
        private_key=keys.private_key,
        public_key=keys.public_key,
        short_id=keys.short_id,
    )


@router.get(
    "",
    response_model=list[NodeResponse],
    summary="List all nodes",
)
async def list_nodes(db: AsyncSession = Depends(get_db)) -> list[NodeResponse]:
    """List all registered proxy nodes."""
    nodes = await get_nodes(db)
    return [NodeResponse.model_validate(n) for n in nodes]


@router.post(
    "",
    response_model=NodeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new node",
)
async def register_node(
    node_in: NodeCreate,
    db: AsyncSession = Depends(get_db),
) -> NodeResponse:
    """Create a new proxy node with auto-generated Reality keys if omitted."""
    node = await create_node(db, node_in)
    return NodeResponse.model_validate(node)


@router.get(
    "/{node_id}",
    response_model=NodeResponse,
    summary="Get node details",
)
async def get_node(
    node_id: int,
    db: AsyncSession = Depends(get_db),
) -> NodeResponse:
    """Get single node by ID."""
    node = await get_node_by_id(db, node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )
    return NodeResponse.model_validate(node)


@router.patch(
    "/{node_id}",
    response_model=NodeResponse,
    summary="Update node settings",
)
async def update_node_endpoint(
    node_id: int,
    node_in: NodeUpdate,
    db: AsyncSession = Depends(get_db),
) -> NodeResponse:
    """Update node attributes or toggle active status."""
    node = await get_node_by_id(db, node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )
    updated = await update_node(db, node, node_in)
    return NodeResponse.model_validate(updated)


@router.delete(
    "/{node_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a node",
)
async def delete_node_endpoint(
    node_id: int,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete node and all associated SNI profiles."""
    node = await get_node_by_id(db, node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )
    await delete_node(db, node)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{node_id}/sni-profiles",
    response_model=SniProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add SNI profile to node",
)
async def add_sni_profile_endpoint(
    node_id: int,
    sni_in: SniProfileCreate,
    db: AsyncSession = Depends(get_db),
) -> SniProfileResponse:
    """Add a carrier SNI profile to the specified node."""
    node = await get_node_by_id(db, node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )
    sni = await create_sni_profile(db, node, sni_in)
    return SniProfileResponse.model_validate(sni)


@router.put(
    "/{node_id}/sni-profiles/{sni_id}",
    response_model=SniProfileResponse,
    summary="Update SNI profile",
)
async def update_sni_profile_endpoint(
    node_id: int,
    sni_id: int,
    sni_in: SniProfileUpdate,
    db: AsyncSession = Depends(get_db),
) -> SniProfileResponse:
    """Update carrier or domain on an existing SNI profile."""
    sni = await get_sni_profile_by_id(db, sni_id)
    if not sni or sni.node_id != node_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SNI profile {sni_id} not found on node {node_id}",
        )
    updated = await update_sni_profile(db, sni, sni_in)
    return SniProfileResponse.model_validate(updated)


@router.delete(
    "/{node_id}/sni-profiles/{sni_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete SNI profile",
)
async def delete_sni_profile_endpoint(
    node_id: int,
    sni_id: int,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete an SNI profile."""
    sni = await get_sni_profile_by_id(db, sni_id)
    if not sni or sni.node_id != node_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SNI profile {sni_id} not found on node {node_id}",
        )
    await delete_sni_profile(db, sni)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{node_id}/install-script",
    response_class=Response,
    summary="Get 1-line bash install script for node",
)
async def get_node_install_script_endpoint(
    node_id: int,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Generate runnable bash script to provision xray-core container on remote VPS."""
    node = await get_node_by_id(db, node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )
    script_content = generate_install_script(node)
    return Response(
        content=script_content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="xray-install-node-{node.id}.sh"'},
    )


@router.get(
    "/{node_id}/sync-script",
    response_class=Response,
    summary="Get 1-line bash sync script for node",
)
async def get_node_sync_script_endpoint(
    node_id: int,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Generate lightweight bash script to update /etc/xray/config.json and reload xray on remote VPS."""
    node = await get_node_by_id(db, node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found",
        )
    script_content = generate_sync_script(node)
    return Response(
        content=script_content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="xray-sync-node-{node.id}.sh"'},
    )

