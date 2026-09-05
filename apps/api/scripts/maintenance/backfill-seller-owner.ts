/**
 * Backfill `marketplace.sellers.owner_id`.
 *
 * `owner_id` is what `SellerOwnershipGuard` authorises on and what
 * `GET /sellers/me` resolves the portal's identity from. The column was added
 * after the seller rows were created, so existing rows carry NULL — and because
 * the guard fails closed, a seller with a NULL owner cannot reach their own
 * portal at all. Every such row needs an owner before its portal works.
 *
 * Matching is by email: `public.users.email` = `marketplace.sellers.email`,
 * case-insensitively. That is the only link the two tables share, and it is a
 * safe one to automate — both sides are set by the platform during onboarding,
 * neither is free-text supplied by the person signing in.
 *
 * Idempotent: only ever fills rows where `owner_id IS NULL`, so re-running is a
 * no-op. Never reassigns an existing owner — moving a shop to a different
 * account is an ownership transfer and needs a deliberate, audited path.
 *
 * Usage:
 *   npx ts-node scripts/backfill-seller-owner.ts          # report only
 *   npx ts-node scripts/backfill-seller-owner.ts --apply  # write
 */
import { Client } from 'pg';

async function main() {
  const apply = process.argv.includes('--apply');
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: +(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'kartseek123',
    database: process.env.DB_NAME ?? 'kartseek_db',
  });
  await client.connect();

  try {
    const { rows: unowned } = await client.query(
      `SELECT id, "businessName", email FROM marketplace.sellers WHERE owner_id IS NULL ORDER BY "businessName"`,
    );
    const { rows: matched } = await client.query(
      `SELECT s.id AS seller_id, s."businessName", s.email, u.id AS user_id, u.role
         FROM marketplace.sellers s
         JOIN public.users u ON lower(u.email) = lower(s.email)
        WHERE s.owner_id IS NULL`,
    );

    console.log(`sellers with no owner : ${unowned.length}`);
    console.log(`resolvable by email   : ${matched.length}`);
    for (const r of matched) {
      console.log(`  ${r.businessName} <${r.email}> -> user ${r.user_id} (${r.role})`);
    }

    const unresolved = unowned.filter(
      (s: any) => !matched.some((m: any) => m.seller_id === s.id),
    );
    if (unresolved.length) {
      console.log(`\nno matching user — these need a link chosen by hand:`);
      for (const s of unresolved) console.log(`  ${s.businessName} <${s.email}> (${s.id})`);
    }

    if (!apply) {
      console.log(`\nDry run. Re-run with --apply to write ${matched.length} row(s).`);
      return;
    }

    const { rowCount } = await client.query(
      `UPDATE marketplace.sellers s
          SET owner_id = u.id, "updatedAt" = now()
         FROM public.users u
        WHERE lower(u.email) = lower(s.email)
          AND s.owner_id IS NULL`,
    );
    console.log(`\nupdated ${rowCount} seller row(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
