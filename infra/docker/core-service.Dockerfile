# syntax=docker/dockerfile:1
#
# Generic image for any apps/api service. Build from the repository ROOT:
#
#   docker build -f infra/docker/core-service.Dockerfile --build-arg APP=order-service -t kartseek/order-service:2.0.0 .
#
# Root context because the repository has one lockfile, at the root, and
# installs through npm workspaces; apps/api has no lockfile of its own, and the
# rspack builder's dependencies are declared in the root manifest. See
# Dockerfile.prod for the api-gateway-specific variant and the root
# .dockerignore for what reaches the daemon.

FROM node:25-alpine AS deps
WORKDIR /repo

# The root lockfile and every workspace manifest — npm ci reconciles the whole
# workspace tree against the lock, so each workspace directory must exist.
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

FROM deps AS builder
ARG APP
COPY apps/api ./apps/api
RUN cd apps/api && npx nest build ${APP}

FROM deps AS prod-deps
RUN npm ci --workspace=apps/api --include-workspace-root --omit=dev \
  && mkdir -p apps/api/node_modules

FROM node:25-alpine
ARG APP
ENV APP_NAME=${APP}
ENV NODE_ENV=production

# Repository layout preserved so module resolution matches a developer
# machine: apps/api/node_modules first, then /repo/node_modules.
WORKDIR /repo/apps/api
COPY --from=prod-deps --chown=node:node /repo/node_modules /repo/node_modules
COPY --from=prod-deps --chown=node:node /repo/apps/api/node_modules ./node_modules
COPY --from=builder   --chown=node:node /repo/apps/api/dist/apps/${APP} ./dist
COPY --from=builder   --chown=node:node /repo/apps/api/package.json ./package.json
COPY --from=builder   --chown=node:node /repo/apps/api/proto ./proto
USER node

# Each service reads its own *_SERVICE_PORT; set PORT to match it so the
# health check probes the right one. Only HTTP services answer /health —
# for a TCP-only service, override the check. 127.0.0.1 rather than
# localhost: the listeners are IPv4, and localhost may resolve to ::1 first.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
