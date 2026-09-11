import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ADMIN_PERMISSIONS,
  ALL_PERMISSIONS,
  SYSTEM_ROLES,
  unknownPermissionKeys,
} from './permissions';

const MIGRATION = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'migrations',
  '1786501800000-AdminRoles.ts',
);

/**
 * The seeded rows as the migration actually writes them, read out of the SQL.
 *
 * The point of parsing rather than hard-coding: the TypeScript list and the
 * migration are two copies of the same permission sets, and a role that says
 * one thing in the database and another in the code is exactly the drift this
 * file exists to prevent.
 */
function rolesFromMigration(): Array<{ key: string; name: string; permissions: string[] }> {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const rows = [...sql.matchAll(/\('([a-z_]+)','([^']+)','([^']+)','\{([^}]*)\}',true\)/g)];
  return rows.map((m) => ({
    key: m[1],
    name: m[2],
    permissions: m[4].split(',').filter(Boolean),
  }));
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

  it('cannot drift from the migration that seeds the same roles', () => {
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
