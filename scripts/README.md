# scripts/

Repository-wide tooling. Anything that belongs to one workspace lives in that
workspace (`apps/api/scripts/`, `apps/web/scripts/`), not here.

| Script | Purpose | Run |
| --- | --- | --- |
| `check-type-imports.js` | The type-import gate. `consistent-type-imports` cannot see decorated files under `emitDecoratorMetadata`, so this script checks every backend workspace's imports directly. Every backend `type-check` script calls it. | `node scripts/check-type-imports.js apps/api` (or a module backend path) |
| `registry/validate.mjs` | Drift check between `services.yaml` and the repository: paths, `main.ts` port defaults, `.env.example`, the k8s ConfigMap, port uniqueness, generated files. Runs in the gate and in CI. | `npm run registry:check` |
| `registry/generate.mjs` | Renders `docs/architecture/services.md` and the `<!-- registry:start -->` block in every workspace README from `services.yaml`. `--check` exits 1 when stale. | `npm run registry:generate` |

Tests for these scripts use Node's built-in runner: `npm run test:scripts`.

## What is not here any more

The one-off codemods that lived in `scripts/`, `scripts/web/`, `scripts/mobile/`
and `scripts/api/` (Dart `const` repairs, currency-symbol replacement, the
initial NestJS scaffolders, dark-theme and JSX fix-ups) were removed on
2026-09-05. They ran once, against a tree that no longer exists, and git
history keeps them: `git log --diff-filter=D --summary -- scripts/`.

## Adding a script

Put it here only if it operates on more than one workspace. Give it a
one-line header comment saying what it does and how to run it, add a row to
the table above, and wire it into a root `package.json` script if people are
expected to run it.
