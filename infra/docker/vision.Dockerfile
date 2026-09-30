FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_DEFAULT_TIMEOUT=180
ENV PIP_RETRIES=10
# Tell ultralytics/YOLO to use CPU only and suppress CUDA warnings
ENV YOLO_VERBOSE=False
ENV no_proxy="*"
ENV NO_PROXY="*"

# System libs required by OpenCV headless (minimal set)
RUN apt-get update -o Acquire::http::Proxy="false" -o Acquire::https::Proxy="false" && apt-get install -y --no-install-recommends -o Acquire::http::Proxy="false" -o Acquire::https::Proxy="false" \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Step 1: upgrade pip ─────────────────────────────────────────────────────
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && python -m pip install --upgrade pip setuptools wheel

# ── Step 2: CPU-only PyTorch (174 MB, no CUDA) ─────────────────────────────
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && pip install --no-cache-dir \
    "torch==2.5.1+cpu" \
    "torchvision==0.20.1+cpu" \
    --extra-index-url https://download.pytorch.org/whl/cpu

# ── Step 3: ultralytics WITHOUT its heavy optional deps ─────────────────────
# This skips scipy, matplotlib, polars (~400 MB saved)
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && pip install --no-cache-dir --no-deps ultralytics

# ── Step 4: ultralytics runtime-only requirements ──────────────────────────
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && pip install --no-cache-dir \
    opencv-python-headless \
    numpy \
    pillow \
    pyyaml \
    requests \
    psutil \
    tqdm \
    py-cpuinfo

# ── Step 5: install the vision service itself ───────────────────────────────
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && pip install --no-cache-dir \
    "fastapi>=0.115.6" \
    "uvicorn[standard]>=0.32.1" \
    "pydantic-settings>=2.7.0" \
    "python-multipart>=0.0.9" \
    "aiofiles>=24.1.0"

# Pre-download YOLOv8n + YOLOv8n-pose weights at build time (~12 MB total)
RUN python -c "\
from ultralytics import YOLO; \
print('Downloading yolov8n.pt ...'); YOLO('yolov8n.pt'); \
print('Downloading yolov8n-pose.pt ...'); YOLO('yolov8n-pose.pt'); \
print('Models ready.')" \
    || echo "WARNING: Model pre-download skipped. Will auto-download on first request."

COPY packages/vision /app/packages/vision

# Ensure storage directories exist inside the container
RUN mkdir -p /app/packages/vision/src/storage/uploads \
             /app/packages/vision/src/storage/outputs \
             /app/packages/vision/src/storage/demo_videos

WORKDIR /app/packages/vision

# ── Step 6: install the package itself (no-deps, already installed above) ──
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && pip install --no-cache-dir --no-deps --no-build-isolation /app/packages/vision

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "120"]
