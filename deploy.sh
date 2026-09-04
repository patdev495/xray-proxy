#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/3] Pulling latest code from GitHub..."
cd /opt/xray-proxy
git pull origin main

echo "==> [2/3] Rebuilding and restarting Docker containers..."
docker compose up -d --build

echo "==> [3/3] Cleaning up old unused images..."
docker image prune -f

echo "==> Deployment completed successfully!"
