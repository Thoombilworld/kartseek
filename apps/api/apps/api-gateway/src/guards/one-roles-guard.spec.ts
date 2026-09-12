import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ONE `RolesGuard`, one `Roles`, for everything the gateway mounts.
 *
 * Two implementations of the same decorator existed and they disagreed about
 * what it means:
 *
 *   `apps/api-gateway/src/guards/roles.guard.ts`  role **AND** every `perm:` key
 *   `libs/guards/src/roles.guard.ts`              one flat `some()` over the
 *                                                 whole argument list
 *
 * So `@Roles(SUPER_ADMIN, ADMIN, 'perm:staff.manage')` means "an ADMIN who
 * holds staff.manage" under the first and "any ADMIN, or anyone whose role is
 * literally the string `perm:staff.manage`" under the second — a permission key
 * that narrows under one guard and is inert under the other. R12 put such a key
 * on `libs/gdpr`'s three personal-data routes while that controller was bound to
 * the second guard, and the key enforced nothing; the role half happened to be
 * `SUPER_ADMIN` alone, so nothing was open, but the next edit to that list
 * would have silently removed the only real check (review I2/I3).
 *
 * Both files are now on the gateway's own pair. This spec is what stops the
 * other one coming back: a `RolesGuard` or `Roles` imported from `@app/guards`
 * or `@app/decorators` anywhere the gateway mounts fails here, by name, with the
 * relative path to import instead.
 *
 * `libs/guards` itself is NOT deleted: `modules/marketplace/backend`'s own
 * controller still binds it, in a different process with no `perm:` key on any
 * route. Unifying that one belongs with whoever owns the module's HTTP surface;
 * this spec draws the line at the gateway, which is where the permission keys
 * live.
 */

/** Every tree whose controllers the gateway process mounts. */
const ROOTS = [
  { label: 'apps/api-gateway/src', dir: path.join(__dirname, '..') },
  // `api-gateway.module.ts` imports `GdprModule`, so this library's controller
  // is a gateway controller in every sense that matters here — and it is the
  // file the finding was raised against.
  { label: 'libs/gdpr/src', dir: path.join(__dirname, '..', '..', '..', '..', 'libs', 'gdpr') },
];

/** `RolesGuard` or `Roles` taken from the wrong package, in any import form. */
const WRONG_IMPORT =
  /import\s*(?:type\s*)?{[^}]*\b(?:RolesGuard|Roles)\b[^}]*}\s*from\s*['"]@app\/(?:guards|decorators)(?:\/[^'"]*)?['"]/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...walk(full));
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('the gateway binds exactly one RolesGuard', () => {
  for (const root of ROOTS) {
    it(`takes RolesGuard and Roles from the gateway's own files in ${root.label}`, () => {
      const offenders = walk(root.dir)
        .filter((f) => WRONG_IMPORT.test(fs.readFileSync(f, 'utf8')))
        .map((f) => path.relative(root.dir, f).replace(/\\/g, '/'));
      // Named, so a failure says which file. The fix is
      // `../guards/roles.guard` and `../decorators/roles.decorator` (a
      // relative path from `libs/gdpr`), never `@app/guards`/`@app/decorators`.
      expect({ root: root.label, offenders }).toEqual({ root: root.label, offenders: [] });
    });
  }

  it('reads the two implementations and confirms they really differ', () => {
    // The claim above is about behaviour, so it is checked rather than
    // asserted: if `libs/guards` ever grows `perm:` handling this spec should
    // be revisited rather than quietly protecting a difference that is gone.
    const gateway = fs.readFileSync(path.join(__dirname, 'roles.guard.ts'), 'utf8');
    const shared = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', '..', 'libs', 'guards', 'src', 'roles.guard.ts'),
      'utf8',
    );
    expect(gateway).toContain("startsWith('perm:')");
    expect(shared).not.toContain('perm:');
  });
});
