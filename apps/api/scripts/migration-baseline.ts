/**
 * Mark historical migrations as applied without running them.
 *
 *     npm run migration:baseline -- <cutoff-timestamp>
 *     npm run migration:baseline -- 1786000000000 --commit
 *
 * ── Why this is needed before the first `migration:run` ──────────────────────
 *
 * This database was built by `synchronize: true`, not by migrations. The eleven
 * files in `migrations/` were written against a schema that already existed, and
 * the `migrations` ledger has never been written to — so TypeORM considers every
 * one of them pending. A first `migration:run` would try to execute all of them,
 * oldest first, against tables that are already there.
 *
 * That is not merely redundant, it is destructive in a specific way. The early
 * migrations name their tables **bare**:
 *
 *     CREATE TABLE IF NOT EXISTS "products" (…)
 *
 * A bare name resolves against `search_path`, which is `public` — while the real
 * tables live in the `marketplace` schema. Running them would populate a second,
 * empty set of `public.*` tables shadowing the live ones, and every service would
 * carry on reading the real schema while the migration ledger claimed success.
 * No such shadow tables exist today; this script is how it stays that way.
 *
 * So: baseline everything the database already has, then run only what is new.
 *
 * ── Choosing the cutoff ─────────────────────────────────────────────────────
 *
 * Every migration whose timestamp is **at or below** the cutoff is recorded as
 * applied. Nothing is executed and no schema is touched — the only write is to
 * the ledger.
 *
 * Inspect first. `npm run migration:show` lists what TypeORM thinks is pending,
 * and the cutoff is your assertion about which of those the database already
 * satisfies. Get it wrong in one direction and a migration is skipped forever;
 * in the other, a migration runs against a schema that already has its changes.
 * The `IF NOT EXISTS` guards in these files make the second failure mostly
 * survivable, which is the safer way to be wrong.
 *
 * Runs as a dry run by default and prints exactly what it would record. Pass
 * `--commit` to write.
 */
import { AppDataSource } from '../data-source';

interface MigrationFile {
  timestamp: number;
  name: string;
}

/** `ListingApprovalAndBuyBox1786300000000` → its numeric suffix. */
function timestampOf(className: string): number {
  const match = /(\d{13,})$/.exec(className);
  return match ? Number(match[1]) : NaN;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const commit = args.includes('--commit');
  const cutoffArg = args.find((a) => /^\d+$/.test(a));

  if (!cutoffArg) {
    console.error(
      'Usage: npm run migration:baseline -- <cutoff-timestamp> [--commit]\n\n' +
      'Every migration at or below the cutoff is recorded as already applied.\n' +
      'Run `npm run migration:show` first to see what is pending.',
    );
    process.exit(1);
  }
  const cutoff = Number(cutoffArg);

  await AppDataSource.initialize();
  const runner = AppDataSource.createQueryRunner();

  try {
    // Same shape TypeORM creates on its own first run, so a later `migration:run`
    // finds a ledger it recognises rather than building a second one.
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "public"."migrations" (
        "id" SERIAL PRIMARY KEY,
        "timestamp" bigint NOT NULL,
        "name" character varying NOT NULL
      )
    `);

    const recorded: Array<{ name: string }> = await runner.query(
      `SELECT name FROM "public"."migrations"`,
    );
    const already = new Set(recorded.map((r) => r.name));

    const all: MigrationFile[] = AppDataSource.migrations
      .map((m) => ({ name: m.constructor.name, timestamp: timestampOf(m.constructor.name) }))
      .filter((m) => Number.isFinite(m.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (all.length === 0) {
      console.error(
        'No migrations were discovered. Check the `migrations` glob in data-source.ts — ' +
        'it is relative to the working directory, which must be apps/api.',
      );
      process.exit(1);
    }

    const toRecord = all.filter((m) => m.timestamp <= cutoff && !already.has(m.name));
    const leftPending = all.filter((m) => m.timestamp > cutoff);

    console.log(`\nBaseline cutoff: ${cutoff}\n`);

    console.log('Will be recorded as already applied (NOT executed):');
    if (toRecord.length === 0) console.log('  (none — everything at or below the cutoff is already recorded)');
    for (const m of toRecord) console.log(`  ✔ ${m.name}`);

    console.log('\nLeft pending, to be executed by `npm run migration:run`:');
    if (leftPending.length === 0) console.log('  (none)');
    for (const m of leftPending) console.log(`  → ${m.name}`);

    // A `.sql` file in the folder is invisible to TypeORM and will never run,
    // whatever the ledger says. Worth naming rather than leaving to be
    // discovered as a missing table.
    console.log(
      '\nNote: migrations/1753660800000-GatewayOfferTables.sql is a raw .sql file. ' +
      'TypeORM does not load it — apply it with psql if it has not been already.',
    );

    if (!commit) {
      console.log('\nDry run. Nothing was written. Re-run with --commit to record the above.\n');
      return;
    }

    for (const m of toRecord) {
      await runner.query(
        `INSERT INTO "public"."migrations" ("timestamp", "name") VALUES ($1, $2)`,
        [m.timestamp, m.name],
      );
    }
    console.log(`\nRecorded ${toRecord.length} migration(s). Now run: npm run migration:run\n`);
  } finally {
    await runner.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('\nBaseline failed:', err?.message ?? err);
  process.exit(1);
});
