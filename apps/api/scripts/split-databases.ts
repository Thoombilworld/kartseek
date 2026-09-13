/**
 * KARTSEEK — move each module's database onto its own Postgres instance
 * ═════════════════════════════════════════════════════════════════════
 * The eight module databases were created inside the shared `kartseek-postgres`
 * container. `docker compose --profile isolated up -d` gives each module its
 * own instance; this copies the data across and verifies it arrived.
 *
 *   npm run db:split -w kartseek-api               # report only, changes nothing
 *   npm run db:split -w kartseek-api -- --apply    # copy
 *   npm run db:split -w kartseek-api -- --apply --only=grocery,taxi
 *
 * Copies, never moves. The source database is left exactly as it is, so a
 * failed or half-finished run costs nothing and the shared instance stays a
 * working fallback until someone deliberately drops it. That also means the
 * two diverge the moment the app starts writing to the new one — do this with
 * the services stopped.
 *
 * Verification is per table, not "pg_restore exited 0": every table in the
 * source is counted on both sides and any mismatch is reported. A restore can
 * report success having skipped rows it could not insert.
 */

import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

/**
 * The database password comes from the environment or the script stops — there
 * is no built-in default (AUD2-074). CommonJS `require` because the helper is
 * shared with the plain-node scripts under `maintenance/marketplace-catalog`.
 */
const requireDbPassword: (...keys: string[]) => string =
  require('./lib/db-password').requireDbPassword;
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find((a) => a.startsWith('--only='))?.split('=')[1] ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Ports match the `isolated` profile in docker-compose.yml. */
const MODULES = [
  { name: 'marketplace', schema: 'marketplace', port: 5433 },
  { name: 'grocery', schema: 'grocery', port: 5434 },
  { name: 'restaurant', schema: 'restaurant', port: 5435 },
  { name: 'pharmacy', schema: 'pharmacy', port: 5436 },
  { name: 'doctor', schema: 'doctor', port: 5437 },
  { name: 'hotel', schema: 'hotel', port: 5438 },
  { name: 'taxi', schema: 'taxi', port: 5439 },
  { name: 'franchise', schema: 'franchise', port: 5440 },
].filter((m) => !ONLY.length || ONLY.includes(m.name));

const SRC = {
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: requireDbPassword(),
};

/**
 * Everything runs through `docker exec`, not a host psql.
 *
 * The client tools are not on the PATH on a machine that only runs Postgres in
 * Docker — which is every machine this is meant for. Going through the
 * containers also guarantees the client version matches the server.
 */
const SRC_CONTAINER = process.env.SPLIT_SOURCE_CONTAINER || 'kartseek-postgres';

function creds(m: (typeof MODULES)[number]) {
  const U = m.name.toUpperCase();
  return {
    container: `kartseek-postgres-${m.name}`,
    user: process.env[`${U}_DB_USER`] || `${m.name}_user`,
    // The destination, and it is the half that does the damage: the restore
    // below runs a dump taken with `--clean --if-exists`, so a silent default
    // here is a drop-and-recreate against whatever database that password does
    // open. Refused like the source side (AUD2-074).
    pass: requireDbPassword(`${U}_DB_PASSWORD`),
    db: process.env[`${U}_DB_NAME`] || `kartseek_${m.name}`,
  };
}

function dockerExec(
  container: string,
  argv: string[],
  opts: { input?: string; password?: string } = {},
) {
  const args = ['exec', '-i'];
  if (opts.password) args.push('-e', `PGPASSWORD=${opts.password}`);
  args.push(container, ...argv);
  return execFileSync('docker', args, {
    encoding: 'utf8',
    input: opts.input,
    maxBuffer: 512 * 1024 * 1024,
  });
}

function srcQuery(db: string, sql: string): string {
  return dockerExec(SRC_CONTAINER, ['psql', '-U', SRC.user, '-d', db, '-t', '-A', '-c', sql], {
    password: SRC.password,
  }).trim();
}

function dstQuery(m: (typeof MODULES)[number], sql: string): string {
  const c = creds(m);
  return dockerExec(c.container, ['psql', '-U', c.user, '-d', c.db, '-t', '-A', '-c', sql], {
    password: c.pass,
  }).trim();
}

/** Table name -> row count, for one schema. */
function tableCounts(read: (sql: string) => string, schema: string): Record<string, number> {
  const names = read(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = '${schema}' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  )
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!names.length) return {};
  const counts = read(
    names
      .map((t) => `SELECT '${t}' AS t, count(*)::bigint AS n FROM "${schema}"."${t}"`)
      .join(' UNION ALL '),
  );
  const out: Record<string, number> = {};
  for (const line of counts.split('\n')) {
    const [t, n] = line.split('|');
    if (t) out[t.trim()] = Number(n);
  }
  return out;
}

function reachable(fn: () => string): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(
    APPLY
      ? 'COPYING module databases onto their own instances\n'
      : 'DRY RUN — pass --apply to copy. Nothing is written.\n',
  );
  console.log(`source  ${SRC.host}:${SRC.port} (shared)\n`);
  console.log('module        target      source rows   target rows   status');

  let copied = 0,
    skipped = 0,
    failed = 0;

  for (const m of MODULES) {
    const srcDb = process.env[`${m.name.toUpperCase()}_DB_NAME`] || `kartseek_${m.name}`;
    const label = `${m.name.padEnd(12)} :${m.port}      `;

    if (!reachable(() => srcQuery(srcDb, 'SELECT 1'))) {
      console.log(`${label}—             —             source database absent`);
      skipped++;
      continue;
    }
    const before = tableCounts((sql) => srcQuery(srcDb, sql), m.schema);
    const srcRows = Object.values(before).reduce((a, b) => a + b, 0);

    if (!reachable(() => dstQuery(m, 'SELECT 1'))) {
      console.log(`${label}${String(srcRows).padStart(11)}   —             target not running`);
      skipped++;
      continue;
    }

    if (!APPLY) {
      const after = tableCounts((sql) => dstQuery(m, sql), m.schema);
      const dstRows = Object.values(after).reduce((a, b) => a + b, 0);
      console.log(
        `${label}${String(srcRows).padStart(11)}   ${String(dstRows).padStart(11)}   would copy`,
      );
      continue;
    }

    try {
      // Schema and data in one pass, restored into the same schema name.
      // --no-owner because the target runs as the module's own role, not postgres.
      const dump = dockerExec(
        SRC_CONTAINER,
        [
          'pg_dump',
          '-U',
          SRC.user,
          '-d',
          srcDb,
          '--schema',
          m.schema,
          '--no-owner',
          '--no-privileges',
          '--clean',
          '--if-exists',
        ],
        { password: SRC.password },
      );

      const c = creds(m);
      dockerExec(
        c.container,
        ['psql', '-U', c.user, '-d', c.db, '-v', 'ON_ERROR_STOP=1', '-f', '-'],
        { input: dump, password: c.pass },
      );

      // Per-table verification. A restore can exit 0 having skipped rows.
      const after = tableCounts((sql) => dstQuery(m, sql), m.schema);
      const mismatched = Object.entries(before)
        .filter(([t, n]) => (after[t] ?? -1) !== n)
        .map(([t, n]) => `${t} ${n}->${after[t] ?? 'missing'}`);

      const dstRows = Object.values(after).reduce((a, b) => a + b, 0);
      if (mismatched.length) {
        console.log(
          `${label}${String(srcRows).padStart(11)}   ${String(dstRows).padStart(11)}   MISMATCH`,
        );
        mismatched
          .slice(0, 4)
          .forEach((x) => console.log(`                                                ${x}`));
        failed++;
      } else {
        console.log(
          `${label}${String(srcRows).padStart(11)}   ${String(dstRows).padStart(11)}   copied, ${Object.keys(before).length} tables verified`,
        );
        copied++;
      }
    } catch (e) {
      console.log(`${label}${String(srcRows).padStart(11)}   —             FAILED`);
      console.log(
        `                                                ${String((e as Error).message)
          .split('\n')[0]
          .slice(0, 90)}`,
      );
      failed++;
    }
  }

  console.log(`\n${copied} copied, ${skipped} skipped, ${failed} failed`);
  if (APPLY && copied) {
    console.log('\nPoint the services at them — add to apps/api/.env:\n');
    for (const m of MODULES) {
      const U = m.name.toUpperCase();
      console.log(`  ${U}_DB_HOST=localhost`);
      console.log(`  ${U}_DB_PORT=${m.port}`);
    }
    console.log('\nThe source databases are untouched. They will drift the moment a service');
    console.log('writes to the new instance, so drop them only once you have switched over.');
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('\nSplit failed:', err?.message ?? err);
  process.exit(1);
});
