# syntax=docker/dockerfile:1
#
# Any Next workspace in the repository — the admin/customer shell (apps/web) and
# the eight module zones (modules/<m>/frontend). Build from the repository ROOT:
#
#   docker build -f infra/docker/nextjs.Dockerfile \
#     --build-arg WORKSPACE_DIR=apps/web --build-arg PORT=3000 \
#     --build-arg HEALTH_PATH=/admin/login \
#     --build-arg NEXT_PUBLIC_API_URL=http://nginx/api/v1 -t kartseek/web:dev .
#
# Root context for the same reason as the API images: one lockfile, at the root,
# installed through npm workspaces. It also has a second reason here — a Next
# workspace imports from packages/shared-core and, in the shell's case, from
# modules/*/frontend, so a context scoped to the workspace directory could not
# even typecheck.
#
# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they are
# build args and changing one means rebuilding. Server-side values (API_URL, the
# zone rewrite targets read by next.config.mjs at request time) stay runtime env
# and must NOT be passed here.
#
# HEALTH_PATH has to be given for a module zone: every zone is served under its
# own basePath, so `/` on a zone container is a 404 and the default below would
# leave it `unhealthy` for ever.

FROM node:26-alpine AS deps
WORKDIR /repo

# Only the manifests, so the install layer is cached until a dependency actually
# changes. npm ci reconciles the whole workspace tree against the root lock, so
# every workspace directory must exist with its package.json even though the
# build needs one of them.
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
# A full install, not a workspace-scoped one: the shell's pages import from the
# module zones, and packages/shared-core is compiled from source rather than
# being a workspace of its own, so its imports resolve out of the root tree.
RUN npm ci

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
ARG WORKSPACE_DIR
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV API_URL=${API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build --workspace=./${WORKSPACE_DIR}

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:26-alpine AS runner
ARG WORKSPACE_DIR
ARG PORT
ARG HEALTH_PATH=/admin/login
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=${PORT}
# Next's standalone server binds 127.0.0.1 unless told otherwise, which inside a
# container means nothing outside it can reach the port at all.
ENV HOSTNAME=0.0.0.0
ENV HEALTHCHECK_PORT=${PORT}
ENV HEALTHCHECK_PATH=${HEALTH_PATH}

# `output: 'standalone'` with outputFileTracingRoot at the monorepo root emits
# the repository's own layout under .next/standalone — /repo/<workspace>/server.js
# beside a pruned /repo/node_modules — so this unpacks onto WORKDIR as-is.
# Static assets and public/ are not traced and are copied separately.
COPY --from=builder --chown=nextjs:nodejs /repo/${WORKSPACE_DIR}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/${WORKSPACE_DIR}/.next/static ./${WORKSPACE_DIR}/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/${WORKSPACE_DIR}/public ./${WORKSPACE_DIR}/public
USER nextjs

# A build arg is not visible to CMD, so the path is carried in env. The shell
# form is deliberate: `node $SERVER_JS` needs the expansion.
ENV SERVER_JS=${WORKSPACE_DIR}/server.js
EXPOSE ${PORT}
# Longer start period than the API images: a Next server compiles its first
# route on demand, and the shell's login page pulls in the whole auth provider.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${HEALTHCHECK_PORT}${HEALTHCHECK_PATH}" >/dev/null || exit 1

CMD ["sh", "-c", "node $SERVER_JS"]
