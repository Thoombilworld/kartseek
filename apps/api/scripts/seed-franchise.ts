/**
 * KARTSEEK Franchise — database seed
 * ──────────────────────────────────
 * Seeds the six demo franchise zones, then marks a handful of rows in each
 * vertical as belonging to one of them, so the franchise dashboards have
 * something to aggregate.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-franchise.ts
 *
 * Run after the vertical seeds — this one only *links* their rows, it never
 * creates them.
 *
 * ── Why this touches six databases ────────────────────────────────────────
 * Franchise owns exactly one table, `franchises`. It is an aggregator: every
 * figure on a franchise dashboard is fetched from the module that owns it, over
 * TCP. The link between the two lives on the *vertical's* row — `sellers`,
 * `grocery_stores`, `restaurants`, `pharmacy_stores` and `clinics` each carry
 * their own franchise column — and since the extraction those tables live in
 * five separate databases.
 *
 * A seed may open five connections; a service may not. Nothing here runs at
 * request time, and each connection is closed before the next is opened.
 *
 * The previous version of this script wrote all of it into one database with
 * `UPDATE grocery_stores ...` and no schema, wrapped in `catch` blocks that
 * printed a warning and let the run finish with "seed completed successfully".
 * On a per-module database every one of those statements failed and the seed
 * still reported success. Failures are fatal here.
 */

import { DataSource } from 'typeorm';
import { Franchise } from '../../../modules/franchise/backend/src/entities/franchise.entity';

const PG = {
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kartseek123',
};

/**
 * One franchise per active market.
 *
 * Five of the six seeded estates were Indian and the sixth was in Doha, so the
 * console was only ever exercised against ₹ and QR — both two-decimal
 * currencies, both left-positioned. Bahrain, Kuwait and Oman divide into
 * thousandths, and a rounding bug there is invisible until a market that uses
 * them exists.
 *
 * `commissionRates` carries only the modules the market actually enables:
 * Qatar, Bahrain, Kuwait and Oman do not run doctor, and the UK and US run a
 * shorter list again. The registry in apps/api/libs/region decides, not this
 * file — these rates are the market-specific numbers, nothing more.
 *
 * The `f000000N-` prefix makes demo data obvious in a table of generated uuids.
 */
const FRANCHISES = [
  {
    id: 'f0000001-0000-4000-8000-000000000001',
    ownerId: 'usr-franchise-001',
    businessName: 'Mumbai Metro Franchise',
    countryCode: 'IN',
    operationalZones: ['Andheri', 'Bandra', 'Juhu', 'Versova', 'Goregaon'],
    commissionRates: { marketplace: 8, grocery: 12, restaurant: 18, pharmacy: 10, doctor: 12, taxi: 20, 'hotel-booking': 15 },
    status: 'active',
  },
  {
    id: 'f0000002-0000-4000-8000-000000000002',
    ownerId: 'usr-franchise-002',
    businessName: 'Bandra West Franchise',
    countryCode: 'IN',
    operationalZones: ['Bandra West', 'Khar', 'Santacruz'],
    commissionRates: { marketplace: 8, grocery: 12, restaurant: 18, pharmacy: 10, doctor: 12, taxi: 20, 'hotel-booking': 15 },
    status: 'active',
  },
  {
    id: 'f0000003-0000-4000-8000-000000000003',
    ownerId: 'usr-franchise-003',
    businessName: 'Powai Franchise',
    countryCode: 'IN',
    operationalZones: ['Powai', 'Chandivali', 'Saki Naka'],
    commissionRates: { marketplace: 8, grocery: 11, restaurant: 16, pharmacy: 10, doctor: 11, taxi: 18, 'hotel-booking': 14 },
    status: 'active',
  },
  {
    id: 'f0000004-0000-4000-8000-000000000004',
    ownerId: 'usr-franchise-004',
    businessName: 'Doha Central Franchise',
    countryCode: 'QA',
    operationalZones: ['West Bay', 'The Pearl', 'Al Sadd', 'Msheireb'],
    // No doctor rate: Qatar does not enable the module.
    commissionRates: { marketplace: 7, grocery: 10, restaurant: 15, pharmacy: 9, taxi: 18, 'hotel-booking': 12 },
    status: 'active',
  },
  {
    id: 'f0000005-0000-4000-8000-000000000005',
    ownerId: 'usr-franchise-005',
    businessName: 'Bengaluru South Franchise',
    countryCode: 'IN',
    operationalZones: ['Koramangala', 'Indiranagar', 'HSR Layout', 'BTM Layout'],
    commissionRates: { marketplace: 8, grocery: 12, restaurant: 17, pharmacy: 10, doctor: 12, taxi: 19, 'hotel-booking': 14 },
    status: 'active',
  },
  {
    id: 'f0000006-0000-4000-8000-000000000006',
    ownerId: 'usr-franchise-006',
    businessName: 'Pune Central Franchise',
    countryCode: 'IN',
    operationalZones: ['Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'Baner', 'Hinjewadi'],
    commissionRates: { marketplace: 8, grocery: 10, restaurant: 15, pharmacy: 10, doctor: 10, taxi: 20, 'hotel-booking': 12 },
    status: 'pending',
  },
  {
    id: 'f0000007-0000-4000-8000-000000000007',
    ownerId: 'usr-franchise-007',
    businessName: 'Dubai Marina Franchise',
    countryCode: 'AE',
    operationalZones: ['Dubai Marina', 'JBR', 'Business Bay', 'Downtown'],
    commissionRates: { marketplace: 7, grocery: 10, restaurant: 15, pharmacy: 9, doctor: 11, taxi: 18, 'hotel-booking': 12 },
    status: 'active',
  },
  {
    id: 'f0000008-0000-4000-8000-000000000008',
    ownerId: 'usr-franchise-008',
    businessName: 'Riyadh North Franchise',
    countryCode: 'SA',
    operationalZones: ['Olaya', 'Al Malqa', 'Hittin', 'Al Nakheel'],
    commissionRates: { marketplace: 7, grocery: 11, restaurant: 16, pharmacy: 9, doctor: 11, taxi: 19, 'hotel-booking': 13 },
    status: 'active',
  },
  {
    id: 'f0000009-0000-4000-8000-000000000009',
    ownerId: 'usr-franchise-009',
    businessName: 'Manama Bay Franchise',
    countryCode: 'BH',
    // Bahraini dinar — three decimal places.
    operationalZones: ['Manama', 'Seef', 'Juffair', 'Amwaj'],
    commissionRates: { marketplace: 7, grocery: 10, restaurant: 15, pharmacy: 9, taxi: 18, 'hotel-booking': 12 },
    status: 'active',
  },
  {
    id: 'f000000a-0000-4000-8000-00000000000a',
    ownerId: 'usr-franchise-010',
    businessName: 'Kuwait City Franchise',
    countryCode: 'KW',
    // Kuwaiti dinar — three decimal places, and the highest-value unit here.
    operationalZones: ['Salmiya', 'Hawally', 'Kuwait City', 'Farwaniya'],
    commissionRates: { marketplace: 7, grocery: 10, restaurant: 15, pharmacy: 9, taxi: 18, 'hotel-booking': 12 },
    status: 'active',
  },
  {
    id: 'f000000b-0000-4000-8000-00000000000b',
    ownerId: 'usr-franchise-011',
    businessName: 'Muscat Franchise',
    countryCode: 'OM',
    // Omani rial — three decimal places.
    operationalZones: ['Muscat', 'Seeb', 'Bawshar', 'Qurum'],
    commissionRates: { marketplace: 7, grocery: 10, restaurant: 15, pharmacy: 9, taxi: 18, 'hotel-booking': 12 },
    status: 'active',
  },
  {
    id: 'f000000c-0000-4000-8000-00000000000c',
    ownerId: 'usr-franchise-012',
    businessName: 'London Central Franchise',
    countryCode: 'GB',
    operationalZones: ['Camden', 'Shoreditch', 'Southwark', 'Islington'],
    commissionRates: { marketplace: 9, grocery: 12, restaurant: 18, pharmacy: 10 },
    status: 'active',
  },
  {
    id: 'f000000d-0000-4000-8000-00000000000d',
    ownerId: 'usr-franchise-013',
    businessName: 'New York Metro Franchise',
    countryCode: 'US',
    operationalZones: ['Manhattan', 'Brooklyn', 'Queens', 'Jersey City'],
    commissionRates: { marketplace: 10, grocery: 13, restaurant: 20, pharmacy: 11 },
    status: 'pending',
  },
];

const FR1 = FRANCHISES[0].id;
const FR2 = FRANCHISES[1].id;
const FR3 = FRANCHISES[2].id;

/**
 * Where each vertical keeps its franchise link.
 *
 * `column` is not uniform: marketplace, grocery and doctor declared
 * `name: 'franchise_id'` on the entity, restaurant and pharmacy did not, so
 * TypeORM created a camelCase `franchiseId` column in those two databases. The
 * franchise service already documents this; the seed has to respect it too, and
 * a quoted identifier is required for the camelCase pair.
 */
const LINKS = [
  { module: 'marketplace', database: 'kartseek_marketplace', schema: 'marketplace', table: 'sellers',         column: 'franchise_id', assign: [[FR1, 10], [FR2, 3], [FR3, 2]] },
  { module: 'grocery',     database: 'kartseek_grocery',     schema: 'grocery',     table: 'grocery_stores',  column: 'franchise_id', assign: [[FR1, 3], [FR2, 2]] },
  { module: 'restaurant',  database: 'kartseek_restaurant',  schema: 'restaurant',  table: 'restaurants',     column: 'franchiseId',  assign: [[FR1, 4], [FR3, 2]] },
  { module: 'pharmacy',    database: 'kartseek_pharmacy',    schema: 'pharmacy',    table: 'pharmacy_stores', column: 'franchiseId',  assign: [[FR1, 3]] },
  { module: 'doctor',      database: 'kartseek_doctor',      schema: 'doctor',      table: 'clinics',         column: 'franchise_id', assign: [[FR1, 3]] },
] as const;

async function seedFranchises() {
  const ds = new DataSource({
    ...PG,
    type: 'postgres',
    database: process.env.FRANCHISE_DB_NAME ?? 'kartseek_franchise',
    schema: 'franchise',
    entities: [Franchise],
    synchronize: false,
    logging: false,
  });
  await ds.initialize();
  const repo = ds.getRepository(Franchise);
  for (const f of FRANCHISES) {
    const exists = await repo.findOne({ where: { id: f.id } });
    if (exists) await repo.update(f.id, f);
    else await repo.save(repo.create(f));
  }
  const total = await repo.count();
  await ds.destroy();
  console.log(`  franchises   ${FRANCHISES.length} upserted, ${total} in table`);
}

async function link(spec: (typeof LINKS)[number]) {
  const ds = new DataSource({
    ...PG,
    type: 'postgres',
    database: spec.database,
    schema: spec.schema,
    synchronize: false,
    logging: false,
  });
  await ds.initialize();
  try {
    const col = `"${spec.column}"`;
    const path = `"${spec.schema}"."${spec.table}"`;
    // Clear first, so a re-run redistributes rather than only ever adding. Only
    // the demo franchises are cleared — a link set by anything else survives.
    await ds.query(`UPDATE ${path} SET ${col} = NULL WHERE ${col} = ANY($1)`, [FRANCHISES.map((f) => f.id)]);

    let assigned = 0;
    for (const [franchiseId, count] of spec.assign) {
      // No offset: the `IS NULL` filter already excludes whatever the previous
      // franchise claimed, so each pass takes the next unclaimed rows.
      // ORDER BY id: every table has one, and it makes the split repeatable.
      const res = await ds.query(
        `UPDATE ${path} SET ${col} = $1
          WHERE id IN (SELECT id FROM ${path} WHERE ${col} IS NULL ORDER BY id LIMIT $2)`,
        [franchiseId, count],
      );
      assigned += Array.isArray(res) ? res[1] ?? 0 : 0;
    }
    const totalRows = Number((await ds.query(`SELECT count(*) AS c FROM ${path}`))[0].c);
    const want = spec.assign.reduce((s, [, n]) => s + n, 0);
    const short = assigned < want ? `  (wanted ${want}; the table holds ${totalRows})` : '';
    console.log(`  ${spec.module.padEnd(12)} ${String(assigned).padStart(2)}/${totalRows} ${spec.table} linked${short}`);
  } finally {
    await ds.destroy();
  }
}

async function main() {
  console.log('Seeding franchise zones\n');
  await seedFranchises();
  console.log('\nLinking vertical rows to a franchise (one connection per module database)\n');
  for (const spec of LINKS) await link(spec);
  console.log('\nDone. Franchise dashboards aggregate these over TCP — the verticals must be running.');
}

main().catch((err) => {
  // No swallowing: a seed that reports success on a failed write is worse than
  // one that fails.
  console.error('\nSeed failed:', err?.message ?? err);
  process.exit(1);
});
