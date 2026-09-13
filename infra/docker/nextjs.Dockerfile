# syntax=docker/dockerfile:1
#
# Any Next workspace in the repository whose next.config sets
# `output: 'standalone'`. Build from the repository ROOT:
#
#   docker build -f infra/docker/nextjs.Dockerfile \
#     --build-arg WORKSPACE_DIR=apps/web --build-arg PORT=3000 \
#     --build-arg HEALTH_PATH=/admin/login \
#     --build-arg NEXT_PUBLIC_API_URL=http://nginx/api/v1 \
#     --build-arg API_URL=http://nginx/api/v1 \
#     --build-arg NEXT_PUBLIC_WS_URL=http://nginx -t kartseek/web:dev .
#
# Root context for the same reason as the API images: one lockfile, at the root,
# installed through npm workspaces. It also has a second reason here — a Next
# workspace imports from packages/shared-core and, in the shell's case, from
# modules/*/frontend, so a context scoped to the workspace directory could not
# even typecheck.
#
# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they are
# build args and changing one means rebuilding. The zone rewrite targets
# (MARKETPLACE_ZONE_ORIGIN and friends, read by next.config.mjs at request time)
# stay runtime env and must NOT be passed here.
#
# ALL THREE OF `NEXT_PUBLIC_API_URL`, `API_URL` AND `NEXT_PUBLIC_WS_URL` ARE
# REQUIRED for a production build, even though `api-base.ts` falls back from the
# first to the second at run time. The build itself evaluates that module while
# collecting page data, some route handlers run on the Edge Runtime where only
# inlined values exist, and `NODE_ENV=production` makes a missing value a thrown
# error rather than the localhost default.
#
# Each one omitted fails the build with a message that names a ROUTE, not the
# variable — "Failed to collect configuration for /api/loyalty" — with the real
# cause one `[cause]:` line further down. Read that line.
#
# ── Precondition: the workspace must emit .next/standalone ───────────────────
#
# ALL NINE NEXT WORKSPACES DO: `apps/web` and the eight module zones
# (modules/<m>/frontend). The runtime stage copies `.next/standalone`, which
# Next only produces when that workspace's own next.config.mjs sets `output:
# 'standalone'` — and each also sets `outputFileTracingRoot` to the monorepo
# root, without which everything it imports from packages/shared-core is traced
# from outside the workspace and silently left out. Pointed at a workspace
# missing either key, this file builds the whole application and then fails on
# the standalone COPY; `node --test scripts/registry/compose.test.mjs` catches
# that in a second instead.
#
# A ZONE ALSO NEEDS `--build-arg HEALTH_PATH=<basePath>/` (the generator emits
# it from services.yaml): every zone is served under its own basePath, so `/` on
# a zone container is a 404 and the default below would leave it `unhealthy` for
# ever.

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
#
# EVERYTHING NEXT READS AT BUILD TIME IS A BUILD ARG.
#
# Two separate reasons, and neither is negotiable for an image that has to work:
#
#  1. `NEXT_PUBLIC_*` is INLINED into the client bundle by `next build`. It is
#     not read at runtime and never will be, so a value handed to the container
#     as `environment:` changes nothing. `.dockerignore` excludes `.env` and
#     `.env.*` (keeping only `.env.example`, which Next does not read), so the
#     build sees whatever is declared here and nothing else. That is how every
#     console and zone image came to trade in one market: without
#     `NEXT_PUBLIC_ACTIVE_REGIONS`, `packages/shared-core/src/localization/
#     countries.ts` falls back to `[DEFAULT_COUNTRY]` alone and the region
#     picker holds one entry (whole-branch review N3).
#
#  2. `next.config.mjs` reads `API_GATEWAY_ORIGIN` and the eight
#     `<M>_ZONE_ORIGIN`s to build its `rewrites()`, and a standalone build
#     FREEZES those rewrites into `server.js`. The compose renderer used to emit
#     them as runtime `environment:` and say in a comment that they were inert;
#     they are build args now, with the container service names, so a
#     server-side fetch and every `/api/*` rewrite reach the gateway on the
#     compose network instead of `localhost:3001` inside the container.
#
# The list is `grep -rhoE 'process\.env\.NEXT_PUBLIC_[A-Z0-9_]+'` over apps/web,
# modules/*/frontend and packages/shared-core. A NEW `NEXT_PUBLIC_*` that is not
# added here is silently absent from every image.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG API_URL
# The market list and the home market — N3. Without the first, every container
# trades in one country whatever cookie the reader carries.
ARG NEXT_PUBLIC_ACTIVE_REGIONS
ARG NEXT_PUBLIC_DEFAULT_REGION
# A zone's own base path (`zone-href.ts`); empty for the shell.
ARG NEXT_PUBLIC_ZONE_BASE_PATH
# Canonical URLs and the verification/analytics ids. Empty is a legitimate
# value for all of these — the tags are omitted — but they must be declarable.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_GTM_ID
ARG NEXT_PUBLIC_CLARITY_ID
ARG NEXT_PUBLIC_FB_APP_ID
ARG NEXT_PUBLIC_GOOGLE_VERIFICATION
ARG NEXT_PUBLIC_BING_VERIFICATION
# Server-side rewrites: the gateway and the eight zones, by container name.
ARG API_GATEWAY_ORIGIN
ARG MARKETPLACE_ZONE_ORIGIN
ARG GROCERY_ZONE_ORIGIN
ARG RESTAURANT_ZONE_ORIGIN
ARG PHARMACY_ZONE_ORIGIN
ARG DOCTOR_ZONE_ORIGIN
ARG HOTEL_ZONE_ORIGIN
ARG TAXI_ZONE_ORIGIN
ARG FRANCHISE_ZONE_ORIGIN
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV API_URL=${API_URL}
ENV NEXT_PUBLIC_ACTIVE_REGIONS=${NEXT_PUBLIC_ACTIVE_REGIONS}
ENV NEXT_PUBLIC_DEFAULT_REGION=${NEXT_PUBLIC_DEFAULT_REGION}
ENV NEXT_PUBLIC_ZONE_BASE_PATH=${NEXT_PUBLIC_ZONE_BASE_PATH}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
ENV NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID}
ENV NEXT_PUBLIC_GTM_ID=${NEXT_PUBLIC_GTM_ID}
ENV NEXT_PUBLIC_CLARITY_ID=${NEXT_PUBLIC_CLARITY_ID}
ENV NEXT_PUBLIC_FB_APP_ID=${NEXT_PUBLIC_FB_APP_ID}
ENV NEXT_PUBLIC_GOOGLE_VERIFICATION=${NEXT_PUBLIC_GOOGLE_VERIFICATION}
ENV NEXT_PUBLIC_BING_VERIFICATION=${NEXT_PUBLIC_BING_VERIFICATION}
ENV API_GATEWAY_ORIGIN=${API_GATEWAY_ORIGIN}
ENV MARKETPLACE_ZONE_ORIGIN=${MARKETPLACE_ZONE_ORIGIN}
ENV GROCERY_ZONE_ORIGIN=${GROCERY_ZONE_ORIGIN}
ENV RESTAURANT_ZONE_ORIGIN=${RESTAURANT_ZONE_ORIGIN}
ENV PHARMACY_ZONE_ORIGIN=${PHARMACY_ZONE_ORIGIN}
ENV DOCTOR_ZONE_ORIGIN=${DOCTOR_ZONE_ORIGIN}
ENV HOTEL_ZONE_ORIGIN=${HOTEL_ZONE_ORIGIN}
ENV TAXI_ZONE_ORIGIN=${TAXI_ZONE_ORIGIN}
ENV FRANCHISE_ZONE_ORIGIN=${FRANCHISE_ZONE_ORIGIN}
ENV NEXT_TELEMETRY_DISABLED=1
# The market list is what N3 was about, so it is the one that fails the build
# rather than producing a single-market image nobody notices until a reader in
# another country sees the wrong currency.
RUN test -n "$NEXT_PUBLIC_ACTIVE_REGIONS" || { echo "build arg NEXT_PUBLIC_ACTIVE_REGIONS is required — without it every page in this image trades in one market (see infra/docker/README.md)" >&2; exit 1; }
COPY . .
# Only apps/web has a public/ directory; the eight module zones have none. The
# runtime COPY below is unconditional — Dockerfiles have no conditional copy —
# so create it here and it succeeds empty. Same reason module-service.Dockerfile
# creates an empty proto/ for the modules with no gRPC transport.
RUN mkdir -p ${WORKSPACE_DIR}/public \
  && npm run build --workspace=./${WORKSPACE_DIR}

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:26-alpine AS runner
ARG WORKSPACE_DIR
ARG PORT
ARG HEALTH_PATH=/admin/login
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
WORKDIR /repo
# PORT has no default, and this is what enforces that — `EXPOSE ${PORT}` does
# not. BuildKit word-splits that instruction's arguments after expansion, so an
# empty expansion yields zero ports and EXPOSE silently does nothing; `docker
# build --check` reports no warning either. Here an empty PORT is worse than
# elsewhere: it is also what the server binds. `ENV PORT=` leaves the variable
# empty, and Next's standalone `server.js` falls back to its own default of
# 3000 — so the container listens on 3000 whatever the registry entry says, and
# is unhealthy for ever because `HEALTHCHECK_PORT` is empty. Not a random port:
# a WRONG one, silently, which is harder to spot than a random one would be.
RUN test -n "$PORT" || { echo "build arg PORT is required (see infra/docker/README.md)" >&2; exit 1; }
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
