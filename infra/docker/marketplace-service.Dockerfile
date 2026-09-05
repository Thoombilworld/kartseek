# syntax=docker/dockerfile:1
#
# Marketplace service image. Build from the repository ROOT:
#
#   docker build -f infra/docker/marketplace-service.Dockerfile -t kartseek/marketplace-service:2.0.0 .
#
# The service lives in modules/marketplace/backend and builds against the
# platform libraries in apps/api/libs through the shared rspack config, so the
# builder needs both trees. Root context for the same reason as the other API
# images: one lockfile, at the root, installed through npm workspaces.

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
# apps/api is installed as well: the module compiles the platform libraries in
# apps/api/libs into its bundle, and their imports (@nestjs/schedule, and the
# rest of the platform set) are declared by apps/api, not by the module. On a
# developer machine hoisting hides that; in an image it is a build failure —
# "Can't resolve '@nestjs/schedule' in apps/api/libs/security/src".
RUN npm ci --workspace=modules/marketplace/backend --workspace=apps/api --include-workspace-root

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
# apps/api supplies libs/, rspack.config.js, tsconfig.json and proto/; the
# module's nest-cli.json copies the protos into dist/proto as build assets.
COPY apps/api ./apps/api
COPY modules/marketplace/backend ./modules/marketplace/backend
RUN cd modules/marketplace/backend && npx nest build

# ── Production dependencies ─────────────────────────────────────────────────
FROM deps AS prod-deps
# Same two workspaces at runtime: the bundle requires the platform libraries'
# dependencies from node_modules rather than inlining them.
RUN npm ci --workspace=modules/marketplace/backend --workspace=apps/api --include-workspace-root --omit=dev \
  && mkdir -p modules/marketplace/backend/node_modules

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:25-alpine AS runner
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

WORKDIR /repo/modules/marketplace/backend
ENV NODE_ENV=production
ENV MARKETPLACE_SERVICE_PORT=3012
ENV MARKETPLACE_TCP_PORT=4002
ENV MARKETPLACE_GRPC_PORT=5006

COPY --from=prod-deps --chown=nestjs:nodejs /repo/node_modules /repo/node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /repo/modules/marketplace/backend/node_modules ./node_modules
COPY --from=builder   --chown=nestjs:nodejs /repo/modules/marketplace/backend/dist ./dist
COPY --from=builder   --chown=nestjs:nodejs /repo/modules/marketplace/backend/package.json ./package.json
# The gRPC server loads proto/marketplace.proto relative to the working
# directory (createGrpcMicroserviceOptions in @app/grpc), not from dist/proto
# where the build assets land. Without this the service dies after the TCP
# transport starts: "file at .../proto/marketplace.proto not found".
COPY --from=builder   --chown=nestjs:nodejs /repo/modules/marketplace/backend/proto ./proto

USER nestjs

# The service is consumed over TCP and gRPC. Its HTTP listener binds to
# loopback and exists for the health check only, so it is not exposed.
EXPOSE 4002 5006
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3012/health || exit 1

CMD ["node", "dist/main.js"]
