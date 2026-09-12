import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ADMIN_PERMISSIONS,
  ALL_PERMISSIONS,
  SYSTEM_ROLES,
  unknownPermissionKeys,
} from './permissions';

const MIGRATIONS = path.join(__dirname, '..', '..', '..', '..', 'migrations');
const SEED = path.join(MIGRATIONS, '1786501800000-AdminRoles.ts');

/**
 * Migrations that GRANT a permission key to an already-seeded role, newest
 * last. A file here is applied on top of the seed below, in order, so what this
 * spec compares against `SYSTEM_ROLES` is the state a database really reaches —
 * not the state one migration's text would suggest on its own.
 *
 * This list is the fix for the failure it now catches: R12 added `staff.view` /
 * `staff.manage` to `regional_admin` by editing the seed of a migration that had
 * already run everywhere. The drift check compared the constant to that text,
 * agreed with itself, and stayed green while not one provisioned database had
 * received the keys (review C2). Adding a grant migration without adding it
 * here fails the comparison below, which is the intended tripwire.
 */
const GRANTS = ['1786502400000-RegionalAdminStaffPermissions.ts'] as const;

/**
 * The seeded rows as the migration actually writes them, read out of the SQL.
 *
 * The point of parsing rather than hard-coding: the TypeScript list and the
 * migration are two copies of the same permission sets, and a role that says
 * one thing in the database and another in the code is exactly the drift this
 * file exists to prevent.
 */
function rolesFromSeed(): Array<{ key: string; name: string; permissions: string[] }> {
  const sql = fs.readFileSync(SEED, 'utf8');
  const rows = [...sql.matchAll(/\('([a-z_]+)','([^']+)','([^']+)','\{([^}]*)\}',true\)/g)];
  return rows.map((m) => ({
    key: m[1],
    name: m[2],
    permissions: m[4].split(',').filter(Boolean),
  }));
}

/**
 * The seed with every later grant applied — the same `array_append` each grant
 * migration performs, in the same order, skipping a key the role already holds.
 *
 * Each grant file is read for the role it names (`WHERE "key" = '…'`) and the
 * keys it appends (its own `KEYS` list), so the assertion is against the SQL
 * that will run and not against a second hand-written copy of it.
 */
function rolesFromMigration(): Array<{ key: string; name: string; permissions: string[] }> {
  const roles = rolesFromSeed();
  for (const file of GRANTS) {
    const src = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8');
    const target = /WHERE "key" = '([a-z_]+)'/.exec(src)?.[1];
    const keys = [...(/KEYS = \[([^\]]*)\]/.exec(src)?.[1] ?? '').matchAll(/'([a-z.]+)'/g)].map(
      (m) => m[1],
    );
    expect({ file, target: Boolean(target), keys: keys.length > 0 }).toEqual({
      file,
      target: true,
      keys: true,
    });
    const role = roles.find((r) => r.key === target);
    if (!role) throw new Error(`${file} grants to '${target}', which the seed does not create`);
    for (const key of keys) {
      if (!role.permissions.includes(key)) role.permissions.push(key);
    }
  }
  return roles;
}

describe('admin permission registry', () => {
  it('declares unique, dotted permission keys', () => {
    const keys = ADMIN_PERMISSIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of ADMIN_PERMISSIONS) {
      expect(p.key).toMatch(/^[a-z]+\.[a-z]+$/);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.group.length).toBeGreaterThan(0);
    }
  });

  it('never lists the wildcard as a permission key', () => {
    expect(ADMIN_PERMISSIONS.some((p) => p.key === ALL_PERMISSIONS)).toBe(false);
  });

  it('grants only keys it declares — no system role may reference an unknown one', () => {
    for (const role of SYSTEM_ROLES) {
      expect({ role: role.key, unknown: unknownPermissionKeys(role.permissions) }).toEqual({
        role: role.key,
        unknown: [],
      });
    }
  });

  it('reserves the wildcard for super_admin alone', () => {
    for (const role of SYSTEM_ROLES) {
      const wildcard = role.permissions.includes(ALL_PERMISSIONS);
      expect({ role: role.key, wildcard }).toEqual({
        role: role.key,
        wildcard: role.key === 'super_admin',
      });
    }
  });

  it('cannot drift from the migrations that seed and then grant the same roles', () => {
    const seeded = rolesFromMigration();
    expect(seeded.length).toBe(6);
    expect(seeded.map((r) => r.key)).toEqual(SYSTEM_ROLES.map((r) => r.key));
    for (const role of SYSTEM_ROLES) {
      const row = seeded.find((r) => r.key === role.key)!;
      expect({ key: role.key, name: row.name, permissions: row.permissions }).toEqual({
        key: role.key,
        name: role.name,
        permissions: role.permissions,
      });
    }
  });

  it('rejects an unknown key and accepts the wildcard', () => {
    expect(unknownPermissionKeys(['orders.view', 'not.a.key'])).toEqual(['not.a.key']);
    expect(unknownPermissionKeys([ALL_PERMISSIONS])).toEqual([]);
  });
});
