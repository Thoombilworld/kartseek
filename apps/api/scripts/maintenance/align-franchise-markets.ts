/**
 * KARTSEEK — align existing franchises with the multi-region setup
 * ────────────────────────────────────────────────────────────────
 * Brings franchise rows written before multi-region support into line with
 * REGION_CONFIGS, without touching anything the registry does not decide.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/align-franchise-markets.ts [--apply]
 *
 * Dry by default: it prints what it would change and exits. Nothing about a
 * franchise's country should be rewritten by a script someone ran to see what
 * it did.
 *
 * What it aligns, and why each one matters:
 *
 *   country_code       Normalised to upper case and checked against the active
 *                      franchise markets. A row pointing at a country the
 *                      platform does not run is reported, never guessed at —
 *                      the country decides which currency the estate settles
 *                      in, and a wrong guess is a wrong ledger.
 *
 *   commission_rates   Rekeyed to the module names the registry uses, and
 *                      limited to the modules the market enables. Rows carried
 *                      `hotel` where everything else says `hotel-booking`, so
 *                      an enablement check never matched; and every row carried
 *                      a doctor rate, including the Doha estate, where the
 *                      module is not offered.
 *
 * Currency, tax, timezone and locale are deliberately NOT written to the row.
 * They are derived from country_code at read time, so a correction to a
 * region's tax rate reaches every franchise without a migration.
 */

import { DataSource } from 'typeorm';
import { Franchise } from '../../../../modules/franchise/backend/src/entities/franchise.entity';
import { REGION_CONFIGS } from '../../libs/region/src/region.config';
import type { SupportedCountryCode } from '../../libs/region/src/region.types';

const APPLY = process.argv.includes('--apply');

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kartseek123',
  database: process.env.FRANCHISE_DB_NAME ?? 'kartseek_franchise',
  schema: 'franchise',
  entities: [Franchise],
  synchronize: false,
  logging: false,
});

/** Markets a franchise may operate in — active, and running the franchise module. */
const MARKETS = (Object.keys(REGION_CONFIGS) as SupportedCountryCode[]).filter(
  (c) =>
    REGION_CONFIGS[c].isActive && REGION_CONFIGS[c].enabledModules.includes('franchise' as never),
);

/** Commission keys that predate the registry's naming. */
const RENAMED: Record<string, string> = {
  hotel: 'hotel-booking',
  hotels: 'hotel-booking',
  hotel_booking: 'hotel-booking',
};

const DEFAULT_RATES: Record<string, number> = {
  marketplace: 8,
  grocery: 12,
  restaurant: 18,
  pharmacy: 10,
  doctor: 12,
  taxi: 20,
  'hotel-booking': 15,
};

async function main() {
  await ds.initialize();
  const repo = ds.getRepository(Franchise);
  const rows = await repo.find({ order: { businessName: 'ASC' } });

  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN — pass --apply to write'}`);
  console.log(
    `${rows.length} franchises; ${MARKETS.length} active markets: ${MARKETS.join(', ')}\n`,
  );

  let changed = 0;
  const unsupported: string[] = [];

  for (const f of rows) {
    const before = { country: f.countryCode, rates: { ...(f.commissionRates ?? {}) } };
    const code = (f.countryCode ?? '').trim().toUpperCase();

    if (!(MARKETS as string[]).includes(code)) {
      unsupported.push(`${f.businessName} → '${f.countryCode}'`);
      continue;
    }
    const market = code as SupportedCountryCode;
    const region = REGION_CONFIGS[market];
    const enabled = region.enabledModules.filter((m: string) => m !== 'franchise');

    // Rekey first, so a rate stored under an old name survives the filter.
    const rekeyed: Record<string, number> = {};
    for (const [k, v] of Object.entries(before.rates)) {
      rekeyed[RENAMED[k] ?? k] = Number(v);
    }

    const aligned: Record<string, number> = {};
    for (const m of enabled) {
      if (!(m in DEFAULT_RATES)) continue; // wallet, loyalty and delivery take no commission
      const existing = rekeyed[m];
      aligned[m] =
        Number.isFinite(existing) && existing >= 0 && existing <= 100 ? existing : DEFAULT_RATES[m];
    }

    const dropped = Object.keys(rekeyed).filter((k) => !(k in aligned));
    const added = Object.keys(aligned).filter((k) => !(k in rekeyed));
    const renamed = Object.keys(before.rates).filter((k) => k in RENAMED);
    const countryChanged = f.countryCode !== market;

    if (!countryChanged && !dropped.length && !added.length && !renamed.length) continue;

    changed++;
    const cur = `${region.currencyCode} ${region.currencySymbol} ${region.currencyDecimals}dp`;
    console.log(`  ${f.businessName}  [${market} · ${cur}]`);
    if (countryChanged) console.log(`      country   '${before.country}' → '${market}'`);
    if (renamed.length)
      console.log(`      rekeyed   ${renamed.map((k) => `${k} → ${RENAMED[k]}`).join(', ')}`);
    if (dropped.length)
      console.log(`      dropped   ${dropped.join(', ')}   (not enabled in ${market})`);
    if (added.length)
      console.log(`      added     ${added.map((k) => `${k}=${aligned[k]}`).join(', ')}`);

    if (APPLY) {
      f.countryCode = market;
      f.commissionRates = aligned;
      await repo.save(f);
    }
  }

  if (unsupported.length) {
    console.log(
      `\n  ${unsupported.length} franchise(s) in a country that is not an active market:`,
    );
    unsupported.forEach((u) => console.log(`      ${u}`));
    console.log(
      '      Left untouched. Set the country deliberately — guessing one picks a currency.',
    );
  }

  console.log(
    `\n${changed} franchise(s) ${APPLY ? 'updated' : 'would change'}, ${unsupported.length} need a decision.`,
  );
  await ds.destroy();
}

main().catch((err) => {
  console.error('\nAlignment failed:', err?.message ?? err);
  process.exit(1);
});
