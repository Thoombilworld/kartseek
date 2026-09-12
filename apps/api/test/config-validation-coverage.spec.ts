import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Every `ConfigModule.forRoot` validates, or the guard it carries is not there.
 *
 * `devOnlyStoreSwitch()` refuses `SKIP_DB` / `SKIP_KAFKA` / `SKIP_REDIS` in
 * production, and it lives in `buildEnvSchema()`'s BASE_SCHEMA — which is
 * reached only through `validationSchema`. Fourteen core services called bare
 * `ConfigModule.forRoot({ isGlobal: true })` and so loaded no schema at all, so
 * the refusal was written, tested in isolation, and absent from the majority of
 * the deployables it was written for. Nothing failed: a schema that is never
 * loaded looks exactly like one that passes.
 *
 * `SKIP_KAFKA` is why that mattered most. `@app/kafka`'s producer and consumer
 * no-op unconditionally on `SKIP_KAFKA === 'true'` with no `NODE_ENV` check of
 * their own, so on an unvalidated service a stray flag in production silently
 * stopped publishing events with no guard at either layer.
 *
 * Deliberately a source scan and deliberately without an exclusion list. An
 * exclusion list is where the next unvalidated module would hide, and these
 * files cannot be imported here without booting the Nest modules they declare.
 */
const REPO_ROOT = path.resolve(__dirname, '../../..');

function moduleFiles(): string[] {
  const found: string[] = [];
  const roots = [path.join(REPO_ROOT, 'apps', 'api', 'apps'), path.join(REPO_ROOT, 'modules')];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '.next', 'frontend'].includes(entry.name)) continue;
        walk(full);
      } else if (entry.name.endsWith('.module.ts')) {
        found.push(full);
      }
    }
  };
  for (const r of roots) if (fs.existsSync(r)) walk(r);
  return found;
}

/** Strips block and line comments so a commented-out option is not read as live code. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** The `ConfigModule.forRoot(...)` argument list, balanced-paren scanned. */
function forRootCalls(src: string): string[] {
  const calls: string[] = [];
  const marker = 'ConfigModule.forRoot';
  let from = 0;
  for (;;) {
    const at = src.indexOf(marker, from);
    if (at === -1) return calls;
    let i = src.indexOf('(', at);
    let depth = 0;
    const start = i;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    calls.push(src.slice(start, i + 1));
    from = i + 1;
  }
}

describe('ConfigModule validation coverage', () => {
  const files = moduleFiles();

  it('finds the module tree it is meant to be scanning', () => {
    // A broken walker would pass every assertion below with nothing to check.
    expect(files.length).toBeGreaterThan(25);
    expect(files.some((f) => f.endsWith('cart-service.module.ts'))).toBe(true);
    expect(files.some((f) => f.endsWith('marketplace-service.module.ts'))).toBe(true);
  });

  it('validates the environment everywhere ConfigModule.forRoot is called', () => {
    const unvalidated: string[] = [];
    for (const file of files) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      for (const call of forRootCalls(src)) {
        if (!/validationSchema\s*:/.test(call)) {
          unvalidated.push(path.relative(REPO_ROOT, file).split(path.sep).join('/'));
        }
      }
    }
    expect(unvalidated.join('\n')).toBe('');
  });

  it('reaches the shared schema, not a hand-rolled one, in every service', () => {
    // `buildEnvSchema()` is what carries `devOnlyStoreSwitch()`. A service that
    // wrote its own `Joi.object({...})` would validate its ports and silently
    // drop the production refusal, which is the failure this file exists for.
    // api-gateway is the one exception: it keeps its own large schema, and
    // spreads STORE_EMULATOR_SWITCHES through the same helper.
    const offenders: string[] = [];
    for (const file of files) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      if (!forRootCalls(src).some((c) => /validationSchema\s*:/.test(c))) continue;
      const rel = path.relative(REPO_ROOT, file).split(path.sep).join('/');
      if (rel.includes('api-gateway')) {
        if (!/envValidationSchema/.test(src)) offenders.push(`${rel}: gateway schema not used`);
        continue;
      }
      if (!/buildEnvSchema\s*\(/.test(src)) offenders.push(`${rel}: does not use buildEnvSchema`);
    }
    expect(offenders.join('\n')).toBe('');
  });

  it('declares the gateway schema through the shared switch helper', () => {
    const src = fs.readFileSync(
      path.join(REPO_ROOT, 'apps/api/apps/api-gateway/src/config/env.validation.ts'),
      'utf8',
    );
    expect(src).toMatch(/STORE_EMULATOR_SWITCHES/);
    expect(src).toMatch(/devOnlyStoreSwitch/);
    // And no hand-written copy left behind to drift from it.
    expect(src).not.toMatch(/SKIP_(DB|KAFKA|REDIS):\s*Joi/);
  });
});
