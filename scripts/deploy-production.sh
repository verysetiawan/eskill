#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/eskill}"
SERVICE_NAME="${SERVICE_NAME:-eskill}"

cd "$APP_DIR"

git pull
npm ci
npm run build
go build -o esuk-server .
mkdir -p uploads

sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager
