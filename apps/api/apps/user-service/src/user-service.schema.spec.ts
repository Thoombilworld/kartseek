import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * user-service registered `schema: 'user'` against `@Entity('users')`. The
 * `user` schema in kartseek_db is empty; the 51 real users are in
 * `public.users`, which the gateway also registers. Every DB-backed
 * user-service route therefore failed (AUD2-025). admin-service had the same
 * shape with `admin.page_layouts`, which does not exist (AUD2-026).
 *
 * A string in a module file is exactly the kind of thing that gets "tidied"
 * back, so it is pinned here rather than only in the commit message.
 */
const read = (p: string) => fs.readFileSync(path.join(__dirname, p), 'utf8');

describe('service schema targets', () => {
  it('user-service queries the schema that holds the users', () => {
    expect(read('user-service.module.ts')).toMatch(/schema:\s*'public'/);
    expect(read('user-service.module.ts')).not.toMatch(/schema:\s*'user'/);
  });

  it('admin-service queries the schema that holds page_layouts', () => {
    const src = read('../../admin-service/src/admin-service.module.ts');
    expect(src).toMatch(/schema:\s*'public'/);
    expect(src).not.toMatch(/schema:\s*'admin'/);
  });
});
