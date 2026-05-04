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
RUN npm ci --no-audit --no-fund
WORKDIR /app/packages/web
RUN npm ci --no-audit --no-fund
COPY packages/shared /app/packages/shared
COPY packages/web /app/packages/web
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
