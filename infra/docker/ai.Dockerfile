FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_DEFAULT_TIMEOUT=120
ENV PIP_RETRIES=10
ENV no_proxy="*"
ENV NO_PROXY="*"
WORKDIR /app
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && python -m pip install --upgrade pip setuptools wheel

# ── Install CPU-only PyTorch to prevent massive CUDA binaries from causing SIGBUS OOM ──
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && pip install --no-cache-dir \
    "torch==2.5.1+cpu" \
    "torchvision==0.20.1+cpu" \
    --extra-index-url https://download.pytorch.org/whl/cpu

COPY packages/ai /app/packages/ai
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && python -m pip install --no-cache-dir --no-build-isolation /app/packages/ai
WORKDIR /app/packages/ai
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
