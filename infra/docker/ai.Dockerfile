FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_DEFAULT_TIMEOUT=120
ENV PIP_RETRIES=10
WORKDIR /app
COPY packages/ai /app/packages/ai
RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install --no-cache-dir --no-build-isolation /app/packages/ai
WORKDIR /app/packages/ai
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
