# 0005 — A service registry drives ports, manifests and docs

**Status:** Accepted, 2026-09-05

## Context

On 2026-09-05 the platform's ports were declared in five places: each
service's `main.ts` defaults, `apps/api/.env.example`, `infra/k8s/config.yaml`,
the table inside `k8s/gen-microservices.sh`, and `apps/api/docs/runbook.md`.
They disagreed, and a mismatch between a gateway default and a service's bind
port had already caused a silent outage that `.env` masked on every developer
machine.

## Decision

`services.yaml` at the repository root is the only place a deployable's name,
kind, path, ports, environment-variable names, health paths, database and
dependencies are declared. `scripts/registry/validate.mjs` fails when any
`main.ts` default, `.env.example`, Kubernetes ConfigMap or generated artifact
disagrees with it, and runs in the gate and in CI. `scripts/registry/generate.mjs`
emits everything derived from it: the services table in
`docs/architecture/services.md`, the port block in every workspace README,
and (from phases 2 and 3) the Kubernetes service manifests and the Compose
services file.

## Consequences

Adding a service means adding a registry entry first; the validator tells you
what else is missing. Port tables in documentation cannot drift because they
are not typed. The registry is one more file to maintain, and generated files
are committed so that a diff shows what a registry change does.
