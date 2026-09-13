import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ONE `RolesGuard`, one `Roles`, and a LIBRARY may reach both.
 *
 * Two implementations of the same decorator existed and they disagreed about
 * what it means:
 *
 *   `apps/api-gateway/src/guards/roles.guard.ts`  role **AND** every `perm:` key
 *   `libs/guards/src/roles.guard.ts`              one flat `some()` over the
 *                                                 whole argument list
 *
 * So `@Roles(SUPER_ADMIN, ADMIN, 'perm:staff.manage')` meant "an ADMIN who
 * holds staff.manage" under the first and "any ADMIN, or anyone whose role is
 * literally the string `perm:staff.manage`" under the second — a permission key
 * that narrows under one guard and is inert under the other. R12 put such a key
 * on `libs/gdpr`'s three personal-data routes while that controller was bound to
 * the second guard, and the key enforced nothing (review I2/I3).
 *
 * ── What changed, and why this spec is inverted ─────────────────────────────
 *
 * The first fix bound both files to the GATEWAY's pair, which meant `libs/gdpr`
 * — a library — importing `apps/api-gateway/src/...` by relative path. That is
 * a dependency the module graph cannot express: it builds only because both
 * trees sit in one tsconfig, and it inverts the direction every other import in
 * this repository points (dispatch addendum item 5).
 *
 * So the gateway's implementation MOVED into `libs/guards` / `@app/decorators`,
 * replacing the weak duplicate, and the gateway's own files became aliases of
 * it. The rule this spec enforces is therefore no longer "never import from
 * `@app/guards`" — it is the thing that rule was protecting: exactly one
 * implementation exists, it is the permission-aware one, and nothing declares a
 * second.
 */
const REPO = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const API = path.join(REPO, 'apps', 'api');

const LIB_GUARD = path.join(API, 'libs', 'guards', 'src', 'roles.guard.ts');
const LIB_DECORATOR = path.join(API, 'libs', 'decorators', 'src', 'roles.decorator.ts');
const GATEWAY_GUARD = path.join(API, 'apps', 'api-gateway', 'src', 'guards', 'roles.guard.ts');
const GATEWAY_DECORATOR = path.join(
  API,
  'apps',
  'api-gateway',
  'src',
  'decorators',
  'roles.decorator.ts',
);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.next', 'build'].includes(entry.name)) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** Every `.ts` in the API and the module backends. */
const sources = () =>
  [
    ...walk(path.join(API, 'apps')),
    ...walk(path.join(API, 'libs')),
    ...walk(path.join(REPO, 'modules')),
  ].filter((f) => !f.endsWith('.spec.ts'));

describe('there is exactly one RolesGuard on the platform', () => {
  it('declares the class in one file, and that file is a library', () => {
    const declarations = sources().filter((f) =>
      /export class RolesGuard\b/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(declarations).toEqual([LIB_GUARD]);
  });

  it('declares the Roles decorator in one file, and that file is a library', () => {
    const declarations = sources().filter((f) =>
      /export const Roles\s*=/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(declarations).toEqual([LIB_DECORATOR]);
  });

  it('is the permission-aware implementation, not the flat one', () => {
    const src = fs.readFileSync(LIB_GUARD, 'utf8');
    expect(src).toContain("startsWith('perm:')");
    // The weak duplicate's shape: one `some()` over the whole argument list,
    // with no separation of role requirements from permission requirements.
    expect(src).toContain('permRequirements');
    expect(src).toContain('hasPermission');
  });

  it('accepts a permission key in the decorator signature', () => {
    // Typed `UserRole[]`, a `'perm:…'` argument does not type-check, and the
    // temptation is then a second, wider decorator rather than a wider type.
    expect(fs.readFileSync(LIB_DECORATOR, 'utf8')).toContain('(UserRole | string)[]');
  });

  it('leaves the gateway paths as aliases, so every existing import still lands on it', () => {
    // Thirty-four controllers bind the guard from the gateway path and thirty-six
    // name the decorator there; the aliases are what let one implementation move
    // without touching all of them.
    expect(fs.readFileSync(GATEWAY_GUARD, 'utf8')).toMatch(
      /export\s*{\s*RolesGuard\s*}\s*from\s*'@app\/guards'/,
    );
    expect(fs.readFileSync(GATEWAY_DECORATOR, 'utf8')).toMatch(
      /export\s*{[^}]*\bRoles\b[^}]*}\s*from\s*'@app\/decorators'/,
    );
  });
});

describe('no library reaches up into an application', () => {
  /** An import whose specifier walks out of `libs/` and into `apps/`. */
  const INTO_APPS = /from\s*['"](?:\.\.\/)+apps\/[^'"]*['"]/;

  it('libs/ imports nothing from apps/', () => {
    const offenders = walk(path.join(API, 'libs'))
      .filter((f) => INTO_APPS.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(API, f).replace(/\\/g, '/'));
    // `libs/gdpr/src/gdpr.controller.ts` was the one. The fix is to move the
    // symbol into a library and alias it from the application, never to add a
    // second copy.
    expect(offenders).toEqual([]);
  });

  it('the module backends import nothing from apps/api/apps either', () => {
    const offenders = walk(path.join(REPO, 'modules'))
      .filter((f) =>
        /from\s*['"][^'"]*apps\/api\/apps\/[^'"]*['"]/.test(fs.readFileSync(f, 'utf8')),
      )
      .map((f) => path.relative(REPO, f).replace(/\\/g, '/'));
    expect(offenders).toEqual([]);
  });
});

/**
 * The module backends bind the same guard, and it is now the permission-aware
 * one — so what makes that a no-op for them has to be checked, not assumed.
 *
 * `modules/marketplace/backend` binds `RolesGuard` from `@app/guards`. That used
 * to be the weak duplicate — one flat `some()` over the whole argument list,
 * under which a `perm:` key matched nobody and enforced nothing — and it is now
 * the implementation above. The verdict for that module's routes is unchanged
 * ONLY because every `@Roles(...)` under `modules/` is a plain role list: the
 * role half of the guard is the same case-insensitive `some()` it always was.
 *
 * The day someone adds `@Roles(UserRole.ADMIN, 'perm:orders.manage')` to a
 * module route, that key starts narrowing — and it will be checked against an
 * `adminPermissions` claim in an injector that registers no permission source,
 * so it will deny everyone. This is the tripwire for that day, and it is the
 * note the module's owner was handed (review M10): adding the first `perm:` key
 * under `modules/` means wiring the claim through that module's login path
 * first.
 */
describe('no module route carries a permission key yet', () => {
  it('finds no `perm:` in any module backend', () => {
    const offenders = walk(path.join(REPO, 'modules'))
      .filter((f) => !f.endsWith('.spec.ts'))
      .filter((f) => /@Roles\([^)]*['"]perm:/s.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(REPO, f).replace(/\\/g, '/'));

    // Not "never do this" — it is a fine thing to do. It just cannot be done
    // silently: the claim has to reach the request first, or the key denies
    // everyone rather than narrowing anyone.
    expect(offenders).toEqual([]);
  });
});
