#!/bin/sh
set -e

mkdir -p /app/uploads/logos
chown -R app:app /app/uploads 2>/dev/null || true

exec su-exec app "$@"
