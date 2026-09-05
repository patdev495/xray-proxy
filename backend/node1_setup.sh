#!/usr/bin/env bash
# ==============================================================================
# xray-proxy VPS Node Automated Provisioning Script
# Node Name: VPS-US-01
# Host: 107.175.144.245
# Inbound Port: 8443 | gRPC Port: 10085
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
{
  "log": {
    "loglevel": "warning"
  },
  "api": {
    "tag": "api",
    "services": [
      "HandlerService",
      "StatsService"
    ]
  },
  "stats": {},
  "policy": {
    "levels": {
      "0": {
        "statsUserUplink": true,
        "statsUserDownlink": true
      }
    },
    "system": {
      "statsInboundUplink": true,
      "statsInboundDownlink": true,
      "statsOutboundUplink": true,
      "statsOutboundDownlink": true
    }
  },
  "inbounds": [
    {
      "listen": "0.0.0.0",
      "port": 8443,
      "protocol": "vless",
      "settings": {
        "clients": [],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "images.apple.com:443",
          "xver": 0,
          "serverNames": [
            "images.apple.com",
            "gateway.icloud.com",
            "www.yahoo.co.jp"
          ],
          "privateKey": "qGPc6JKKUpHXPSMRQC2TIk2srUu9nvnWJW8NuBft_3Y",
          "shortIds": [
            "6760aa63fc01cff2"
          ],
          "minClientVer": "0.0.0"
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"],
        "routeOnly": false
      },
      "tag": "vless-reality"
    },
    {
      "listen": "0.0.0.0",
      "port": 10085,
      "protocol": "dokodemo-door",
      "settings": {
        "address": "127.0.0.1"
      },
      "tag": "api"
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "tag": "direct"
    },
    {
      "protocol": "blackhole",
      "tag": "blocked"
    }
  ],
  "routing": {
    "rules": [
      {
        "inboundTag": [
          "api"
        ],
        "outboundTag": "api",
        "type": "field"
      }
    ]
  }
}
EOF

echo "==> [3/4] Pulling teddysun/xray Docker image..."
docker pull teddysun/xray:latest

echo "==> [4/4] Starting xray-core container..."
docker stop xray-core 2>/dev/null || true
docker rm xray-core 2>/dev/null || true

docker run -d \
  --name xray-core \
  --restart always \
  --network host \
  -v /etc/xray/config.json:/etc/xray/config.json \
  teddysun/xray:latest run -config /etc/xray/config.json

echo "=============================================================================="
echo "==> xray-core Node successfully installed and running on 107.175.144.245!"
echo "==> VLESS Reality listening on port 8443"
echo "==> gRPC Service listening on port 10085"
echo "=============================================================================="
