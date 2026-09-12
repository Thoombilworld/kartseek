import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — grocery settings become per market, with a platform fallback row.
 *
 * `grocery.grocery_settings` was created by
 * `apps/api/migrations/1786500700000-GroceryTables.ts` as
 * `PRIMARY KEY ("key")`, one row per setting for the whole platform. A delivery
 * fee, a minimum basket and a service radius are market facts, so one admin
 * screen was showing every market's values at once (audit I9).
 *
 * ── Two things R12 got wrong here, both fixed by this file ──────────────────
 *
 *   • the column existed only as an entity annotation, so it was created by
 *     `synchronize` in development and by nothing at all in production, where
 *     `getSettings`' `WHERE region_code = …` would have hit a column that was
 *     not there and answered 500 (review C3);
 *   • `key` stayed the sole primary key, so `('defaultDeliveryFee', platform)`
 *     and `('defaultDeliveryFee', 'QA')` could not coexist and the per-market
 *     row the read looks for was impossible to write. The read's `source` field
 *     could only ever say `'platform'` (review I6).
 *
 * ── Why a composite primary key, and why `'*'` ──────────────────────────────
 *
 * The alternative — a surrogate id plus a unique index on
 * `(key, COALESCE(region_code,'*'))` — needs a new column, a new sequence and a
 * functional index, and it leaves two ways to say "the platform row" (NULL and
 * the sentinel). `(key, region_code)` is the real key: one row per setting per
 * market, enforced by the database rather than by an upsert convention.
 *
 * Postgres will not accept NULL in a primary key, so the platform row needs a
 * value. `'*'` fits the existing `varchar(2)`, so no column is widened; it is
 * the spelling this platform already uses for "everything" in the admin
 * permission vocabulary; and `normaliseMarket('*')` returns `undefined`, so no
 * scope check can ever read a platform row as a market's own. Existing rows
 * backfill to it and stay exactly what they were — the defaults every market
 * inherits — which is what keeps them valid through the key change.
 *
 * `down()` puts the table back as `GroceryTables` built it: any market-scoped
 * rows are removed (they cannot be represented under a primary key on `key`
 * alone — this is the one thing a revert here destroys, and each is named in
 * the log before it happens), `PRIMARY KEY ("key")` is restored and the column
 * is dropped.
 */
export class GrocerySettingsMarket1786502400000 implements MigrationInterface {
  name = 'GrocerySettingsMarket1786502400000';

  /** The `region_code` of the row every market inherits from. */
  private static readonly PLATFORM = '*';

  public async up(q: QueryRunner): Promise<void> {
    const platform = GrocerySettingsMarket1786502400000.PLATFORM;

    const [before]: Array<{ rows: string }> = await q.query(
      `SELECT count(*)::text AS rows FROM "grocery"."grocery_settings"`,
    );
    console.log(`[GrocerySettingsMarket] ${before?.rows ?? '0'} setting row(s) before`);

    // R12's annotation carried no `name:`, so `synchronize` created the column
    // as `"regionCode"` in every development database that booted it. Renaming
    // rather than adding is what keeps such a database to ONE market column:
    // an `ADD COLUMN IF NOT EXISTS "region_code"` there would leave a second,
    // empty one beside it, which is the two-columns-one-fact defect this
    // platform has already been bitten by (F-35 / I13).
    const [legacy]: Array<{ n: string }> = await q.query(
      `SELECT count(*)::text AS n FROM information_schema.columns
        WHERE table_schema = 'grocery' AND table_name = 'grocery_settings'
          AND column_name = 'regionCode'`,
    );
    if (Number(legacy?.n ?? 0) > 0) {
      console.log('[GrocerySettingsMarket] renaming the synchronize-made "regionCode" column');
      await q.query(
        `ALTER TABLE "grocery"."grocery_settings" RENAME COLUMN "regionCode" TO "region_code"`,
      );
      // A renamed column keeps whatever `synchronize` gave it, which may
      // already be NOT NULL with the sentinel default; the statements below are
      // written to be no-ops in that case.
      await q.query(
        `ALTER TABLE "grocery"."grocery_settings" ALTER COLUMN "region_code" DROP NOT NULL`,
      );
    }
    // Nullable first, so the ALTER succeeds whatever is in the table.
    await q.query(
      `ALTER TABLE "grocery"."grocery_settings" ADD COLUMN IF NOT EXISTS "region_code" varchar(2)`,
    );
    // Every row written before the market existed is a platform default, which
    // is precisely what the sentinel means.
    await q.query(
      `UPDATE "grocery"."grocery_settings" SET "region_code" = $1 WHERE "region_code" IS NULL`,
      [platform],
    );
    await q.query(
      `ALTER TABLE "grocery"."grocery_settings"
         ALTER COLUMN "region_code" SET DEFAULT '${platform}',
         ALTER COLUMN "region_code" SET NOT NULL`,
    );

    // The constraint is dropped by the name `GroceryTables` gave it, and by
    // whatever name the database actually holds — a table built by
    // `synchronize` instead of by that migration carries TypeORM's generated
    // `PK_<hash>`, and dropping a name that is not there would fail the
    // transaction.
    await q.query(
      `ALTER TABLE "grocery"."grocery_settings" DROP CONSTRAINT IF EXISTS "PK_grocery_settings"`,
    );
    const existing: Array<{ conname: string }> = await q.query(
      `SELECT conname FROM pg_constraint
        WHERE conrelid = '"grocery"."grocery_settings"'::regclass AND contype = 'p'`,
    );
    for (const { conname } of existing ?? []) {
      await q.query(
        `ALTER TABLE "grocery"."grocery_settings" DROP CONSTRAINT "${conname.replace(/"/g, '')}"`,
      );
    }
    await q.query(
      `ALTER TABLE "grocery"."grocery_settings"
         ADD CONSTRAINT "PK_grocery_settings" PRIMARY KEY ("key", "region_code")`,
    );

    const [after]: Array<{ rows: string; platformRows: string }> = await q.query(
      `SELECT count(*)::text AS rows,
              count(*) FILTER (WHERE "region_code" = $1)::text AS "platformRows"
         FROM "grocery"."grocery_settings"`,
      [platform],
    );
    console.log(
      `[GrocerySettingsMarket] ${after?.rows ?? '0'} setting row(s) after, ` +
        `${after?.platformRows ?? '0'} of them the platform fallback; ` +
        `key is now (key, region_code)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    const platform = GrocerySettingsMarket1786502400000.PLATFORM;

    // Named before they are deleted: a market's own settings cannot be
    // represented once `key` is the whole primary key again, so a revert really
    // does lose them and the log is the only record of what was there.
    const scoped: Array<{ key: string; region_code: string }> = await q.query(
      `SELECT "key", "region_code" FROM "grocery"."grocery_settings" WHERE "region_code" <> $1`,
      [platform],
    );
    for (const row of scoped ?? []) {
      console.warn(
        `[GrocerySettingsMarket] WARN dropping market-scoped setting ` +
          `"${row.key}" (${row.region_code}) — it has no place under PRIMARY KEY ("key")`,
      );
    }
    await q.query(`DELETE FROM "grocery"."grocery_settings" WHERE "region_code" <> $1`, [platform]);

    await q.query(
      `ALTER TABLE "grocery"."grocery_settings" DROP CONSTRAINT IF EXISTS "PK_grocery_settings"`,
    );
    await q.query(
      `ALTER TABLE "grocery"."grocery_settings"
         ADD CONSTRAINT "PK_grocery_settings" PRIMARY KEY ("key")`,
    );
    // The exact inverse: the column goes too, leaving the table as
    // `1786500700000-GroceryTables` built it. Its only content by then is the
    // sentinel this migration wrote, so nothing else is lost with it.
    await q.query(`ALTER TABLE "grocery"."grocery_settings" DROP COLUMN IF EXISTS "region_code"`);
  }
}
