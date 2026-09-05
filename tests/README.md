# tests/

Repository-wide tests that exercise the platform as a whole, as opposed to a
single workspace's own unit and integration suites (see
[`docs/guides/testing.md`](../docs/guides/testing.md) for those — Vitest for
the backends, Jest for the web shell and the module frontends, Playwright for
the customer-facing end-to-end flows, and the gateway↔service contract spec).

## `postman/`

The Postman collections, environments, test data and Newman runners used to
exercise the API gateway's HTTP surface end to end, independently of the unit
and integration suites. See [`postman/README.md`](postman/README.md).

## `smoke/`

`boot-all.mjs` boots every built Nest deployable from its `dist/` output and
probes it for a healthy response, in batches, without needing the full
`npm run dev` stack:

```bash
npm run build
npm run infra:up
npm run smoke
```

Each service's stdout and stderr go to `smoke/logs/`, which is git-ignored.
