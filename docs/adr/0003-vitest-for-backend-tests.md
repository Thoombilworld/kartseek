# 0003 — Vitest for the backend test suites

**Status:** Accepted, 2026-09-05

## Context

NestJS 12 is ESM-only and Jest runs CommonJS, so on Nest 12 every suite that
imports Nest fails to load — the estate that had been 960 tests dropped to a
mere 344. Swapping the test runner first, while still on Nest 11, means the
Nest 12 upgrade can later be judged against a test estate that survives the
runner change on its own.

The alternative, ts-jest in ESM mode, needs `module` changed in
`tsconfig.json`, and that setting also controls what `nest build` emits for
production — so adopting it would tie the test runner's requirements to the
production build's output format. Vitest compiles TypeScript itself, so its
requirements stop at the runner.

The specs themselves are unmodified. `apps/api/test/vitest-setup.ts` aliases
`globalThis.jest` to Vitest's `vi`, which is sufficient because the surface
these suites actually use is `jest.fn` and one `jest.resetModules` — no
`jest.mock`, `spyOn`, `useFakeTimers` or `requireActual` anywhere in the
backend suites. Keeping the specs byte-for-byte during the move means a
failure belongs to the runner swap, not to an edit made while porting.

A single shared factory, `apps/api/test/vitest-backend.mts`, replaces a
config per workspace because all eight module backends had a byte-identical
Jest `moduleNameMapper`; separate copies would drift, and a workspace
resolving `@app/common` to a different file than its neighbour is the kind of
difference that surfaces as an unrelated failure much later. The factory
takes the calling workspace's own directory rather than deriving one, because
Vite bundles a config file and its relative imports into a single module
before evaluating it, which makes `import.meta.dirname` inside the shared
file itself undependable.

Decorator metadata was the assumption worth proving rather than trusting:
Nest resolves class dependencies from `design:paramtypes`, which esbuild does
not emit but Vitest does. A dedicated `decorator-metadata.spec.ts` asserts
this directly.

Moving the specs onto a runner that actually collects and runs them also
exposed problems the old setup had been masking: the `include` glob had to
match Jest's whole-root `testRegex` rather than `src/**`, because
marketplace keeps a unit spec under `test/`, which a narrower glob would have
skipped silently while still reporting green; a `verification.spec.ts` that
mixed static checks with live-HTTP smoke tests always showed failures when no
gateway was running, training people to ignore a red suite; and specs that
had been excluded from every run entirely had no way to execute at all.

Verified by running both runners on every workspace and comparing counts,
since a Vitest run that collects nothing also exits zero: 659 tests,
identical results under Jest and Vitest, across all 9 workspaces.

## Decision

Backend suites run under Vitest through the shared factory in
`apps/api/test/vitest-backend.mts`; Jest remains for the Next.js workspaces.
`globalThis.jest = vi` is a migration shim to be deleted once specs use `vi`
directly.

## Consequences

Jest stays installed: `apps/api`'s `test:e2e` keeps its own Jest config, and
the three frontend workspaces are still on Jest. The `globalThis.jest = vi`
shim in `vitest-setup.ts` is a migration aid, not a destination — it should
come out once the specs that reference `jest.fn` are renamed to call `vi`
directly, and until then every backend suite depends on it being loaded
before any decorated class is evaluated.

Because the shared factory's `include` matches the whole workspace rather
than only `src/**`, a unit spec can live outside `src/` (as marketplace's
does) without being silently dropped from the run. Integration specs that
need live infrastructure are reachable through a companion config rather
than being excluded outright, so a spec with no way to run does not rot
unnoticed.

The `decorator-metadata.spec.ts` guard means a future Vitest upgrade that
stops emitting `design:paramtypes` fails in one specific, named suite instead
of surfacing as "Nest can't resolve dependencies" across dozens of unrelated
suites.
