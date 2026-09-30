FROM node:20-alpine
ENV NPM_CONFIG_FETCH_RETRIES=10
ENV NPM_CONFIG_FETCH_RETRY_FACTOR=2
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
WORKDIR /app
ENV no_proxy="*"
ENV NO_PROXY="*"
COPY packages/shared/package*.json /app/packages/shared/
COPY packages/web/package*.json /app/packages/web/
WORKDIR /app/packages/shared
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && npm config rm proxy || true && npm config rm https-proxy || true && npm ci --no-audit --no-fund
WORKDIR /app/packages/web
RUN unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY && npm config rm proxy || true && npm config rm https-proxy || true && npm ci --no-audit --no-fund
COPY packages/shared /app/packages/shared
COPY packages/web /app/packages/web
RUN npm --prefix /app/packages/shared run build
ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_API_BASE_URL=/api
ARG NEXT_PUBLIC_VISION_BASE=/vision
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_VISION_BASE=$NEXT_PUBLIC_VISION_BASE
RUN npm --prefix /app/packages/web run build
WORKDIR /app/packages/web
EXPOSE 3000
CMD ["npm", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
