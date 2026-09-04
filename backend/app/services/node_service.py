import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.node import Node, SniProfile
from app.schemas.node import NodeCreate, NodeUpdate, SniProfileCreate, SniProfileUpdate
from app.services.reality_service import generate_reality_keypair


async def create_node(db: AsyncSession, node_in: NodeCreate) -> Node:
    """Create a new Node. If reality keys are omitted, auto-generate them."""
    priv_key: str = node_in.reality_private_key or ""
    pub_key: str = node_in.reality_public_key or ""
    short_id: str = node_in.reality_short_id or ""

    if not (priv_key and pub_key and short_id):
        generated = generate_reality_keypair()
        priv_key = priv_key or generated.private_key
        pub_key = pub_key or generated.public_key
        short_id = short_id or generated.short_id

    db_node = Node(
        name=node_in.name,
        host=node_in.host,
        location=node_in.location,
        flag=node_in.flag,
        grpc_port=node_in.grpc_port,
        inbound_port=node_in.inbound_port,
        reality_private_key=priv_key,
        reality_public_key=pub_key,
        reality_short_id=short_id,
        is_active=True,
    )

    for sni_in in node_in.sni_profiles:
        db_sni = SniProfile(
            carrier=sni_in.carrier,
            domain=sni_in.domain,
            is_active=sni_in.is_active,
        )
        db_node.sni_profiles.append(db_sni)

    db.add(db_node)
    await db.commit()
    await db.refresh(db_node)
    return db_node


async def get_nodes(db: AsyncSession) -> list[Node]:
    """Retrieve all nodes ordered by ID."""
    result = await db.execute(select(Node).order_by(Node.id.asc()))
    return list(result.scalars().all())


async def get_node_by_id(db: AsyncSession, node_id: int) -> Node | None:
    """Retrieve a single node by its primary key."""
    result = await db.execute(select(Node).where(Node.id == node_id))
    return result.scalar_one_or_none()


async def update_node(db: AsyncSession, node: Node, node_in: NodeUpdate) -> Node:
    """Update node attributes."""
    update_data = node_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(node, field, value)

    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node


async def delete_node(db: AsyncSession, node: Node) -> None:
    """Delete a node and its cascade-related SNI profiles."""
    await db.delete(node)
    await db.commit()


async def create_sni_profile(
    db: AsyncSession,
    node: Node,
    sni_in: SniProfileCreate,
) -> SniProfile:
    """Add a new SNI profile to a node."""
    db_sni = SniProfile(
        node_id=node.id,
        carrier=sni_in.carrier,
        domain=sni_in.domain,
        is_active=sni_in.is_active,
    )
    db.add(db_sni)
    await db.commit()
    await db.refresh(db_sni)
    return db_sni


async def get_sni_profile_by_id(db: AsyncSession, sni_id: int) -> SniProfile | None:
    """Retrieve an SNI profile by its ID."""
    result = await db.execute(select(SniProfile).where(SniProfile.id == sni_id))
    return result.scalar_one_or_none()


async def update_sni_profile(
    db: AsyncSession,
    sni: SniProfile,
    sni_in: SniProfileUpdate,
) -> SniProfile:
    """Update an SNI profile."""
    update_data = sni_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sni, field, value)

    db.add(sni)
    await db.commit()
    await db.refresh(sni)
    return sni


async def delete_sni_profile(db: AsyncSession, sni: SniProfile) -> None:
    """Delete an SNI profile."""
    await db.delete(sni)
    await db.commit()


def generate_install_script(node: Node) -> str:
    """Generate a 1-line runnable bash deployment script for remote VPS."""
    server_names = [sni.domain for sni in node.sni_profiles if sni.domain]
    if not server_names:
        server_names = ["images.apple.com"]
    dest_domain = f"{server_names[0]}:443"

    xray_config = {
        "log": {"loglevel": "warning"},
        "api": {
            "tag": "api",
            "services": ["HandlerService", "StatsService"],
        },
        "stats": {},
        "policy": {
            "levels": {
                "0": {
                    "statsUserUplink": True,
                    "statsUserDownlink": True,
                }
            },
            "system": {
                "statsInboundUplink": True,
                "statsInboundDownlink": True,
                "statsOutboundUplink": True,
                "statsOutboundDownlink": True,
            },
        },
        "inbounds": [
            {
                "listen": "0.0.0.0",
                "port": node.inbound_port,
                "protocol": "vless",
                "settings": {
                    "clients": [],
                    "decryption": "none",
                },
                "streamSettings": {
                    "network": "tcp",
                    "security": "reality",
                    "realitySettings": {
                        "show": False,
                        "dest": dest_domain,
                        "xver": 0,
                        "serverNames": server_names,
                        "privateKey": node.reality_private_key,
                        "shortIds": [node.reality_short_id],
                    },
                },
                "tag": "vless-reality",
            },
            {
                "listen": "0.0.0.0",
                "port": node.grpc_port,
                "protocol": "dokodemo-door",
                "settings": {
                    "address": "127.0.0.1",
                },
                "tag": "api",
            },
        ],
        "outbounds": [
            {
                "protocol": "freedom",
                "tag": "direct",
                "settings": {
                    "domainStrategy": "UseIPv4",
                },
            },
            {
                "protocol": "blackhole",
                "tag": "blocked",
            },
        ],
        "routing": {
            "rules": [
                {
                    "inboundTag": ["api"],
                    "outboundTag": "api",
                    "type": "field",
                },
                {
                    "ip": ["::/0"],
                    "outboundTag": "blocked",
                    "type": "field",
                },
            ]
        },

    }

    config_json_str = json.dumps(xray_config, indent=2)

    script = f"""#!/usr/bin/env bash
# ==============================================================================
# xray-proxy VPS Node Automated Provisioning Script
# Node Name: {node.name}
# Host: {node.host}
# Inbound Port: {node.inbound_port} | gRPC Port: {node.grpc_port}
# ==============================================================================
set -euo pipefail

echo "==> [1/4] Checking Docker environment..."
if ! command -v docker >/dev/null 2>&1; then
    echo "Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com | sh
fi

echo "==> [2/4] Generating /etc/xray/config.json..."
mkdir -p /etc/xray

cat << 'EOF' > /etc/xray/config.json
{config_json_str}
EOF

echo "==> [3/4] Pulling teddysun/xray Docker image..."
docker pull teddysun/xray:latest

echo "==> [4/4] Starting xray-core container..."
docker stop xray-core 2>/dev/null || true
docker rm xray-core 2>/dev/null || true

docker run -d \\
  --name xray-core \\
  --restart always \\
  --network host \\
  -v /etc/xray/config.json:/etc/xray/config.json \\
  teddysun/xray:latest

echo "=============================================================================="
echo "==> xray-core Node successfully installed and running on {node.host}!"
echo "==> VLESS Reality listening on port {node.inbound_port}"
echo "==> gRPC Service listening on port {node.grpc_port}"
echo "=============================================================================="
"""
    return script.replace("\r\n", "\n")

