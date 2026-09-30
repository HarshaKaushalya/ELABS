#!/usr/bin/env bash
set -euo pipefail

npm --prefix packages/shared run build
npm --prefix packages/api run build
npm --prefix packages/web run build

echo "Build complete."