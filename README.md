# ELABS Monorepo

ELABS is a full-stack monorepo bootstrap for an advanced laboratory management + LMS platform.

## Services

- `packages/web`: Next.js LMS-style web shell
- `packages/api`: Express + TypeScript API with auth and health endpoints
- `packages/mobile`: Expo React Native mobile app skeleton
- `packages/ai`: FastAPI AI assistant service
- `packages/vision`: FastAPI demo video analysis service
- `packages/shared`: Shared TypeScript types, validators, RBAC helpers

## Quick Start

1. Copy environment templates and set values.
2. Bootstrap dependencies:
   - Bash: `bash scripts/init-dev.sh`
   - PowerShell: `./scripts/init-dev.ps1`
3. Start full stack with Docker:
   - `docker compose up --build`

## Local Run (without Docker)

- API: `npm --prefix packages/api run dev`
- Web: `npm --prefix packages/web run dev`
- Mobile: `npm --prefix packages/mobile run start`
- AI: `uvicorn src.main:app --reload --app-dir packages/ai`
- Vision: `uvicorn src.main:app --reload --app-dir packages/vision`