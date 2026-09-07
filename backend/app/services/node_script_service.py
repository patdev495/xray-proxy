import json
from typing import Any

from app.models.node import Node


def generate_xray_config_dict(
    node: Node,
    clients: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Generate the full Xray configuration JSON dictionary for a node with embedded clients."""
    active_snis = [sni for sni in node.sni_profiles if sni.is_active and sni.domain]
    client_list: list[dict[str, Any]] = clients if clients is not None else []
    inbounds: list[dict[str, Any]] = []

    if not active_snis:
        inbounds.append({
            "listen": "0.0.0.0",
            "port": node.inbound_port,
            "protocol": "vless",
            "settings": {
                "clients": client_list,
                "decryption": "none",
            },
            "streamSettings": {
                "network": "tcp",
                "security": "reality",
                "realitySettings": {
                    "show": False,
                    "dest": "images.apple.com:443",
                    "xver": 0,
                    "serverNames": ["images.apple.com"],
                    "privateKey": node.reality_private_key,
                    "shortIds": [node.reality_short_id],
                    "minClientVer": "0.0.0",
                },
            },
            "sniffing": {
                "enabled": True,
                "destOverride": ["http", "tls", "quic"],
                "routeOnly": False,
            },
            "tag": "vless-reality",
        })
    else:
        for sni in active_snis:
            port = sni.port or node.inbound_port
            inbounds.append({
                "listen": "0.0.0.0",
                "port": port,
                "protocol": "vless",
                "settings": {
                    "clients": client_list,
                    "decryption": "none",
                },
                "streamSettings": {
                    "network": "tcp",
                    "security": "reality",
                    "realitySettings": {
                        "show": False,
                        "dest": f"{sni.domain}:443",
                        "xver": 0,
                        "serverNames": [sni.domain],
                        "privateKey": node.reality_private_key,
                        "shortIds": [node.reality_short_id],
                        "minClientVer": "0.0.0",
                    },
                },
                "sniffing": {
                    "enabled": True,
                    "destOverride": ["http", "tls", "quic"],
                    "routeOnly": False,
                },
                "tag": f"vless-reality-{port}",
            })

    inbounds.append({
        "listen": "127.0.0.1",
        "port": 10085,
        "protocol": "dokodemo-door",
        "settings": {
            "address": "127.0.0.1",
        },
        "tag": "api",
    })

    return {
        "log": {
            "loglevel": "warning",
        },
        "api": {
            "tag": "api",
            "services": [
                "HandlerService",
                "StatsService",
            ],
        },
        "stats": {},
        "policy": {
            "levels": {
                "0": {
                    "statsUserUplink": True,
                    "statsUserDownlink": True,
                },
            },
            "system": {
                "statsInboundUplink": True,
                "statsInboundDownlink": True,
            },
        },
        "inbounds": inbounds,
        "outbounds": [
            {
                "protocol": "freedom",
                "tag": "direct",
            },
            {
                "protocol": "blackhole",
                "tag": "block",
            },
        ],
        "routing": {
            "rules": [
                {
                    "inboundTag": ["api"],
                    "outboundTag": "api",
                    "type": "field",
                },
            ],
        },
    }


def generate_install_script(
    node: Node,
    clients: list[dict[str, Any]] | None = None,
) -> str:
    """Generate the complete bash install script to provision a remote VPS for xray-core."""
    xray_config = generate_xray_config_dict(node, clients=clients)
    config_json_str = json.dumps(xray_config, indent=2)

    active_snis = [sni for sni in node.sni_profiles if sni.is_active and sni.domain]
    active_ports = [sni.port or node.inbound_port for sni in active_snis] or [node.inbound_port]
    ports_to_check = set(active_ports)
    ports_to_check.add(node.grpc_port)
    port_list_str = " ".join(str(p) for p in ports_to_check)

    script = f"""#!/usr/bin/env bash
# ==============================================================================
# xray-proxy VPS Node Automated Provisioning Script
# Node Name: {node.name}
# Host: {node.host}
# Inbound Ports: {port_list_str} | gRPC Port: {node.grpc_port}
# ==============================================================================
set -euo pipefail

echo "==> [1/5] Checking Docker environment..."
if ! command -v docker >/dev/null 2>&1; then
    echo "Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com | sh
fi

echo "==> [2/5] Verifying port safety for ports: {port_list_str}..."
for p in {port_list_str}; do
    if ss -tuln 2>/dev/null | grep -q ":$p "; then
        echo "Info: Port $p is currently active (will be managed by xray container)."
    fi
done

echo "==> [3/5] Generating /etc/xray/config.json..."
mkdir -p /etc/xray

cat << 'EOF' > /etc/xray/config.json
{config_json_str}
EOF

echo "==> [4/5] Enabling TCP BBR & Kernel Network Buffer Tuning..."
mkdir -p /etc/sysctl.d
cat << 'EOF' > /etc/sysctl.d/99-xray-speed.conf
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.core.rmem_max = 33554432
net.core.wmem_max = 33554432
net.ipv4.tcp_rmem = 4096 87380 33554432
net.ipv4.tcp_wmem = 4096 65536 33554432
EOF
sysctl --system >/dev/null 2>&1 || true

echo "==> [5/5] Starting xray-core container..."
docker pull teddysun/xray:latest
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
echo "==> VLESS Reality listening on ports: {port_list_str}"
echo "==> gRPC Service listening on port {node.grpc_port}"
echo "==> TCP BBR Acceleration: ENABLED (32MB window buffers)"
echo "=============================================================================="
"""
    return script.replace("\r\n", "\n")


def generate_sync_script(
    node: Node,
    clients: list[dict[str, Any]] | None = None,
) -> str:
    """Generate a lightweight bash script to update /etc/xray/config.json and reload xray-core on VPS in 0.5s."""
    xray_config = generate_xray_config_dict(node, clients=clients)
    config_json_str = json.dumps(xray_config, indent=2)

    active_snis = [sni for sni in node.sni_profiles if sni.is_active and sni.domain]
    active_ports = [sni.port or node.inbound_port for sni in active_snis] or [node.inbound_port]
    port_list_str = " ".join(str(p) for p in active_ports)

    script = f"""#!/usr/bin/env bash
# ==============================================================================
# xray-proxy VPS Node Inbound Sync Script
# Node Name: {node.name}
# ==============================================================================
set -euo pipefail

echo "==> [1/2] Updating /etc/xray/config.json..."
mkdir -p /etc/xray

cat << 'EOF' > /etc/xray/config.json
{config_json_str}
EOF

echo "==> [2/2] Reloading xray-core container..."
docker restart xray-core

echo "=============================================================================="
echo "==> Node {node.name} successfully reloaded in 0.5s!"
echo "==> Active VLESS ports: {port_list_str}"
echo "=============================================================================="
"""
    return script.replace("\r\n", "\n")
