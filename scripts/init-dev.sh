#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

available_kb="$(df -Pk "$ROOT_DIR" | awk 'NR==2 {print $4}')"
required_kb="$((3 * 1024 * 1024))"
if [[ "$available_kb" -lt "$required_kb" ]]; then
  available_gb="$(awk "BEGIN {printf \"%.2f\", $available_kb/1024/1024}")"
  echo "Low disk space: ${available_gb}GB free. Free at least 3GB, then re-run scripts/init-dev.sh."
  exit 1
fi

echo "Installing Node dependencies..."
npm --prefix packages/shared install --no-audit --no-fund
npm --prefix packages/api install --no-audit --no-fund
npm --prefix packages/web install --no-audit --no-fund
npm --prefix packages/mobile install --no-audit --no-fund

echo "Installing Python services..."
python -m pip install --no-cache-dir wheel
python -m pip install --no-cache-dir --no-build-isolation packages/ai
python -m pip install --no-cache-dir --no-build-isolation packages/vision
python -m pip install --no-cache-dir pytest

echo "Bootstrap complete. Run: docker compose up --build"
