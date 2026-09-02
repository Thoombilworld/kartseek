#!/usr/bin/env node
/**
 * Fails when a type-only binding is imported as a value.
 *
 *   node scripts/check-type-imports.js <workspace-dir>
 *
 * Why this exists. The rspack builder compiles each file alone with swc, which
 * cannot see that `import { Foo }` names an interface. In a file with
 * decorators, swc keeps that import for the `design:paramtypes` /
 * `design:type` metadata it emits, and the build fails to link it — but only
 * for the files a given service reaches, so a new service can regress without
 * touching a line that any existing build compiles.
 *
 * Why not something else. `isolatedModules` rejects type re-exports, not type
 * imports. `verbatimModuleSyntax` rejects exactly this, but it also forbids
 * ESM syntax in CommonJS output (TS1295/TS1287 in every file), so it cannot
 * stay on. TS1272 is gated on ESM emit. And
 * `@typescript-eslint/consistent-type-imports` deliberately reports nothing in
 * any file containing a decorator once `emitDecoratorMetadata` is on
 * (eslint-plugin/dist/rules/consistent-type-imports.js, the `Decorator`
 * visitor) — which is every controller, service, entity and DTO here, i.e.
 * precisely the files that can fail.
 *
 * So: run tsc under `verbatimModuleSyntax` through a side tsconfig that
 * extends the workspace's own, keep only TS1484 (type imported as value) and
 * TS1205 (type re-exported as value), and ignore the ESM-in-CommonJS noise.
 * Verified to catch a bare `EmptyMessage` import in a decorated controller.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ws = path.resolve(process.argv[2] || '.');
const cfg = path.join(ws, 'tsconfig.type-imports.json');
if (!fs.existsSync(cfg)) {
  console.error(`check-type-imports: no tsconfig.type-imports.json in ${ws}`);
  process.exit(2);
}

// TypeScript's own entry point under the current node, rather than the
// `.bin` shim: no shell, so no `.cmd` special-casing on Windows and none of
// the shell-argument deprecation noise Node prints for it.
const tsc = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');
const run = spawnSync(process.execPath, [tsc, '--noEmit', '-p', cfg], {
  cwd: ws,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

const output = `${run.stdout || ''}${run.stderr || ''}`;
const hits = output.split(/\r?\n/).filter((line) => /error TS(1484|1205)\b/.test(line));
if (hits.length) {
  console.error(hits.join('\n'));
  console.error(
    `\ncheck-type-imports: ${hits.length} type-only import(s) written as value imports in ${ws}`,
  );
  process.exit(1);
}
console.log(`check-type-imports: OK (${path.relative(process.cwd(), ws) || '.'})`);
