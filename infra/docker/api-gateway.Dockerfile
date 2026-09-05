# syntax=docker/dockerfile:1
#
# API gateway image. Build from the repository ROOT, not from apps/api:
#
#   docker build -f infra/docker/api-gateway.Dockerfile -t kartseek/api-gateway:2.0.0 .
#
# The repository has one lockfile, at the root, and installs through npm
# workspaces. apps/api has no lockfile of its own — it used to carry a stale
# copy that `npm ci` failed on — and the rspack builder's dependencies live in
# the root manifest, so an image built from apps/api alone cannot run
# `nest build` at all. Hence the root context, the workspace-scoped install,
# and the root .dockerignore that keeps the upload to what these images need.

FROM node:25-alpine AS deps
WORKDIR /repo

# The root lockfile and every workspace manifest. `npm ci` reconciles the whole
# workspace tree against the lock, so each workspace directory has to exist
# with its package.json even though only apps/api is installed here.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY modules/doctor/backend/package.json modules/doctor/backend/
COPY modules/doctor/frontend/package.json modules/doctor/frontend/
COPY modules/franchise/backend/package.json modules/franchise/backend/
COPY modules/franchise/frontend/package.json modules/franchise/frontend/
COPY modules/grocery/backend/package.json modules/grocery/backend/
COPY modules/grocery/frontend/package.json modules/grocery/frontend/
COPY modules/hotel/backend/package.json modules/hotel/backend/
COPY modules/hotel/frontend/package.json modules/hotel/frontend/
COPY modules/marketplace/backend/package.json modules/marketplace/backend/
COPY modules/marketplace/frontend/package.json modules/marketplace/frontend/
COPY modules/pharmacy/backend/package.json modules/pharmacy/backend/
COPY modules/pharmacy/frontend/package.json modules/pharmacy/frontend/
COPY modules/restaurant/backend/package.json modules/restaurant/backend/
COPY modules/restaurant/frontend/package.json modules/restaurant/frontend/
COPY modules/taxi/backend/package.json modules/taxi/backend/
COPY modules/taxi/frontend/package.json modules/taxi/frontend/
RUN npm ci --workspace=apps/api --include-workspace-root

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY apps/api ./apps/api
RUN cd apps/api && npx nest build api-gateway

# ── Production dependencies ─────────────────────────────────────────────────
FROM deps AS prod-deps
RUN npm ci --workspace=apps/api --include-workspace-root --omit=dev \
  && mkdir -p apps/api/node_modules

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:25-alpine AS runner

# Run as non-root.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

# Same layout as the repository, so module resolution walks the same path it
# does on a developer machine: apps/api/node_modules first (if npm nested
# anything there), then /repo/node_modules.
WORKDIR /repo/apps/api
ENV NODE_ENV=production
ENV API_GATEWAY_PORT=3001

COPY --from=prod-deps --chown=nestjs:nodejs /repo/node_modules /repo/node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /repo/apps/api/node_modules ./node_modules
COPY --from=builder   --chown=nestjs:nodejs /repo/apps/api/dist ./dist
COPY --from=builder   --chown=nestjs:nodejs /repo/apps/api/package.json ./package.json
COPY --from=builder   --chown=nestjs:nodejs /repo/apps/api/proto ./proto

USER nestjs

# The gateway serves under the global prefix `api` with URI versioning, on
# API_GATEWAY_PORT (default 3001 — 3000 belongs to the web portal).
# 127.0.0.1 rather than localhost: the listener is IPv4 and busybox wget has
# no fallback if localhost resolves to ::1 first.
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/v1/health || exit 1

CMD ["node", "dist/apps/api-gateway/main.js"]
