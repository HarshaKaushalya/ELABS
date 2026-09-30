#!/usr/bin/env bash
set -euo pipefail

npm --prefix packages/shared run lint
npm --prefix packages/api run lint
npm --prefix packages/web run lint
npm --prefix packages/mobile run lint
python -m compileall packages/ai/src packages/vision/src

echo "Lint checks complete."