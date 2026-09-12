import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — one market encoding for the offer tables.
 *
 * `exchange_offers` carried its market only as `applicableCountries`, a
 * simple-array of comma-joined text, while `bank_offers` used a scalar
 * `region_code`, banners a `regions[]` in Redis and grocery categories a
 * `countries` jsonb: four encodings of one fact, four bespoke readers, four
 * ways to be wrong (2026-09-12 audit I7 / AUD2-082).
 *
 * A market BOUNDARY compared against comma-joined text is not a boundary at
 * all: an offer stored as `'QA,IN'` equalled no single market, so it was
 * invisible to both markets' admins and nobody's to edit. Both tables now carry
 * the platform's one spelling — `region_code` ISO-2 — plus an explicit
 * `is_global`, because a NULL market meant two different things (a promotion
 * that runs everywhere, and a row nobody has attributed yet) and
 * `assertInMarket` had to refuse both to be safe.
 *
 * `applicableCountries` is KEPT and is not dropped. It stays as the
 * customer-facing eligibility list, and it is the only record of the
 * multi-market case — an offer that runs in three of nine markets is real and
 * this plan has no mandate to model it. No admin authorisation path reads it
 * any more; `scope-helper-uniqueness.spec.ts` fails if one starts to.
 *
 * ── Backfill, and what it deliberately leaves alone ─────────────────────────
 *
 *   • exactly one entry  -> `region_code` = that market
 *   • empty or NULL      -> `is_global = true`, which is what an untargeted
 *                           offer has always meant
 *   • several entries    -> left NULL and not global, so it stays refused for a
 *                           locked admin and visibly unattributed. Reducing it
 *                           to one market silently would be inventing data; the
 *                           SELECT at the end of `up()` names any such row.
 *
 * ── Why `bank_offers.region_code` is not narrowed to varchar(2) here ────────
 *
 * It could be, and it is not. The column already exists as an unbounded
 * `varchar` holding ISO-2 values, and the same narrowing expressed as a
 * `length: 2` entity annotation made `synchronize` drop and recreate the column
 * on the next boot, emptying the two rows that had a market. That incident is
 * why `data-source.ts` beside this file exists at all. Narrowing it is a
 * separate, deliberate migration with a verified row count either side of it,
 * not a side effect of this one.
 */
export class OfferMarket1786502300000 implements MigrationInterface {
  name = 'OfferMarket1786502300000';

  public async up(q: QueryRunner): Promise<void> {
    for (const [table, column, type] of [
      ['exchange_offers', 'region_code', 'varchar(2)'],
      ['exchange_offers', 'is_global', 'boolean NOT NULL DEFAULT false'],
      ['bank_offers', 'is_global', 'boolean NOT NULL DEFAULT false'],
    ]) {
      await q.query(
        `ALTER TABLE marketplace.${table} ADD COLUMN IF NOT EXISTS "${column}" ${type}`,
      );
    }

    // A single-valued legacy array is the one unambiguous case.
    await q.query(`
      UPDATE marketplace.exchange_offers
         SET "region_code" = UPPER(TRIM("applicableCountries"))
       WHERE "region_code" IS NULL
         AND TRIM("applicableCountries") ~ '^[A-Za-z]{2}$'
    `);

    // Untargeted means every market, said explicitly.
    for (const table of ['exchange_offers', 'bank_offers']) {
      await q.query(`
        UPDATE marketplace.${table}
           SET "is_global" = true
         WHERE "is_global" = false
           AND "region_code" IS NULL
           AND COALESCE(TRIM("applicableCountries"), '') = ''
      `);
    }

    for (const [table, idx] of [
      ['exchange_offers', 'IDX_exchange_offers_region_code'],
      ['bank_offers', 'IDX_bank_offers_region_code'],
    ]) {
      await q.query(`CREATE INDEX IF NOT EXISTS "${idx}" ON marketplace.${table} ("region_code")`);
    }

    // Named, not guessed. A row here is a real multi-market offer that stays
    // refused for a locked admin until someone decides what it should mean.
    const unattributed: Array<{ table: string; id: string; countries: string | null }> =
      await q.query(`
        SELECT 'exchange_offers' AS table, id::text AS id, "applicableCountries" AS countries
          FROM marketplace.exchange_offers
         WHERE "region_code" IS NULL AND "is_global" = false
        UNION ALL
        SELECT 'bank_offers', id::text, "applicableCountries"
          FROM marketplace.bank_offers
         WHERE "region_code" IS NULL AND "is_global" = false
      `);
    for (const row of unattributed ?? []) {
      console.warn(
        `[OfferMarket] WARN ${row.table} ${row.id} runs in several markets ` +
          `("${row.countries}") and is left unattributed; it stays refused for a ` +
          `region-locked admin until the multi-market case is modelled.`,
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const idx of ['IDX_exchange_offers_region_code', 'IDX_bank_offers_region_code']) {
      await q.query(`DROP INDEX IF EXISTS marketplace."${idx}"`);
    }
    // `applicableCountries` was never touched, so dropping these columns
    // restores the previous encoding exactly.
    for (const [table, column] of [
      ['exchange_offers', 'region_code'],
      ['exchange_offers', 'is_global'],
      ['bank_offers', 'is_global'],
    ]) {
      await q.query(`ALTER TABLE marketplace.${table} DROP COLUMN IF EXISTS "${column}"`);
    }
  }
}
