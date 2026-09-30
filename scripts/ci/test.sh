#!/usr/bin/env bash
set -euo pipefail

npm --prefix packages/api run test
npm --prefix packages/web run test
python -m pytest packages/ai/tests
python -m pytest packages/vision/tests

echo "Test checks complete."
