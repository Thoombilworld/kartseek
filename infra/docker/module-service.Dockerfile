# syntax=docker/dockerfile:1
#
# Generic image for any of the eight module backends. Build from the repository
# ROOT:
#
#   docker build -f infra/docker/module-service.Dockerfile \
#     --build-arg APP=marketplace --build-arg PORT=3012 \
#     -t kartseek/marketplace-service:2.0.0 .
#
# APP is the module directory name (marketplace, grocery, restaurant, pharmacy,
# doctor, hotel, taxi, franchise) — `modules/${APP}/backend` is the workspace.
#
# PORT has no default on purpose: it is the port the HEALTHCHECK probes, not the
# port the service binds (the service reads its own `<MODULE>_SERVICE_PORT`), so
# a build that forgets it fails at the `RUN test -n "$PORT"` guard in the
# runtime stage rather than producing an image that is `unhealthy` for ever.
# `EXPOSE ${PORT}` does NOT enforce it: an empty expansion is a silent no-op,
# and `docker build --check` passes on it. The generator in `scripts/stack`
# always passes it.
#
# The service lives in modules/<module>/backend and builds against the platform
# libraries in apps/api/libs through the shared rspack config, so the builder
# needs both trees. Root context for the same reason as the other API images:
# one lockfile, at the root, installed through npm workspaces.
#
# This file replaced marketplace-service.Dockerfile, which hard-coded one module
# and baked that module's three ports as ENV. The ports now come from Compose
# and Kubernetes, which is where they are already declared; baking them meant an
# image that quietly ignored the port its own orchestrator had given it.

FROM node:26-alpine AS deps
ARG APP
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
RUN npm ci --workspace=modules/${APP}/backend --workspace=apps/api --include-workspace-root

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
ARG APP
# apps/api supplies libs/, rspack.config.js, tsconfig.json and proto/; the
# module's nest-cli.json copies the protos into dist/proto as build assets.
COPY apps/api ./apps/api
COPY modules/${APP}/backend ./modules/${APP}/backend
# Four of the eight modules have no gRPC transport and therefore no proto/
# directory. The runtime COPY below is unconditional — Dockerfiles have no
# conditional copy — so create the directory here and it succeeds empty.
RUN mkdir -p modules/${APP}/backend/proto \
  && cd modules/${APP}/backend && npx nest build

# ── Production dependencies ─────────────────────────────────────────────────
FROM deps AS prod-deps
ARG APP
# Same two workspaces at runtime: the bundle requires the platform libraries'
# dependencies from node_modules rather than inlining them.
RUN npm ci --workspace=modules/${APP}/backend --workspace=apps/api --include-workspace-root --omit=dev \
  && mkdir -p modules/${APP}/backend/node_modules

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:26-alpine AS runner
ARG APP
ARG PORT
ARG HEALTH_PATH=/health
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

WORKDIR /repo/modules/${APP}/backend
ENV NODE_ENV=production
ENV APP_NAME=${APP}

# PORT has no default, and this is what enforces that — `EXPOSE ${PORT}` does
# not. BuildKit word-splits that instruction's arguments after expansion, so an
# empty expansion yields zero ports and EXPOSE silently does nothing; `docker
# build --check` reports no warning either. Without this line a build that
# forgot the argument would ship `HEALTHCHECK_PORT=` and be unhealthy for ever.
RUN test -n "$PORT" || { echo "build arg PORT is required (see infra/docker/README.md)" >&2; exit 1; }

# Where the HEALTHCHECK looks, baked at build time from the service registry.
# The service still binds whatever `<MODULE>_SERVICE_PORT` says at runtime.
ENV HEALTHCHECK_PORT=${PORT}
ENV HEALTHCHECK_PATH=${HEALTH_PATH}

COPY --from=prod-deps --chown=nestjs:nodejs /repo/node_modules /repo/node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /repo/modules/${APP}/backend/node_modules ./node_modules
COPY --from=builder   --chown=nestjs:nodejs /repo/modules/${APP}/backend/dist ./dist
COPY --from=builder   --chown=nestjs:nodejs /repo/modules/${APP}/backend/package.json ./package.json
# The gRPC server loads proto/<module>.proto relative to the working directory
# (createGrpcMicroserviceOptions in @app/grpc), not from dist/proto where the
# build assets land. Without this the service dies after the TCP transport
# starts: "file at .../proto/marketplace.proto not found". The builder stage
# creates the folder unconditionally so this succeeds for the modules that have
# no gRPC transport.
COPY --from=builder   --chown=nestjs:nodejs /repo/modules/${APP}/backend/proto ./proto

USER nestjs

# A module service is consumed over TCP and gRPC; its HTTP listener exists for
# the health check and is not the public surface. Compose and Kubernetes publish
# the transport ports they need, from the same registry entry that supplied
# PORT. 127.0.0.1 rather than localhost: the listener is IPv4 and busybox wget
# has no fallback if localhost resolves to ::1 first.
EXPOSE ${PORT}
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${HEALTHCHECK_PORT}${HEALTHCHECK_PATH}" >/dev/null || exit 1

CMD ["node", "dist/main.js"]
