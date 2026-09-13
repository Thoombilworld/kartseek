#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# KARTSEEK — regenerate infra/k8s/microservices-generated.yaml
#
# A wrapper. The generator is `scripts/registry/k8s.mjs`, it reads
# `services.yaml`, and `npm run registry:generate` is the entry point that
# rewrites every generated file at once — this manifest, the Compose file and
# the documentation tables. `npm run registry:check` fails when any of them is
# stale, and the pre-commit hook runs it.
#
# What used to be here was a hand-written table of 22 service names and their
# HTTP/gRPC/TCP ports, and a probe block that defaulted to `tcpSocket`: a second
# copy of the port map, and 42 probes that passed the moment Nest bound a socket
# regardless of whether the service could reach its database (AUD2-002). Both
# problems were the same problem — the truth lived in two places.
#
# To change what a service gets in Kubernetes, edit `services.yaml` (ports,
# health routes, dependencies) or `scripts/registry/k8s.mjs` (how a manifest is
# shaped). Never edit the generated file.
# ══════════════════════════════════════════════════════════════════════════════
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

node scripts/registry/generate.mjs

OUT="infra/k8s/microservices-generated.yaml"
echo "Services:    $(grep -c '^kind: Service' "$OUT")"
echo "Deployments: $(grep -c '^kind: Deployment' "$OUT")"
echo "httpGet:     $(grep -c 'httpGet:' "$OUT") probes"
echo "tcpSocket:   $(grep -c 'tcpSocket:' "$OUT") probes (pharmacy-service only)"
