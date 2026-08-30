/**
 * Print the DDL TypeORM would run to bring `public` in line with the gateway's
 * own entities — without executing any of it.
 *
 * The gateway registers ~48 entities (taxi, partner/delivery, page layouts,
 * static pages, users) through `DatabaseModule.registerPostgres`, which
 * hardcodes `synchronize: false`. Most of those tables were therefore never
 * created, and every route reading them answered
 * `relation "public.taxi_drivers" does not exist`.
 *
 * Running `synchronize` against `public` directly is not safe here: the schema
 * holds 57 tables, not all of them owned by these entities, and synchronize
 * drops what it does not recognise. So this uses the schema builder's *log*
 * mode, which returns the queries it would run and executes nothing. Review the
 * output, keep the CREATE statements, and commit them as a migration.
 *
 *   npx ts-node -T -r tsconfig-paths/register scripts/generate-gateway-ddl.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kartseek123',
  database: process.env.DB_NAME || 'kartseek_db',
  entities: [path.join(__dirname, process.env.ENTITY_GLOB || '../apps/api-gateway/src/entities/*.entity.{ts,js}')],
  schema: process.env.TARGET_SCHEMA || undefined,
  synchronize: false,
  logging: false,
});

async function main() {
  await ds.initialize();
  const sqlInMemory = await ds.driver.createSchemaBuilder().log();

  const up = sqlInMemory.upQueries.map((q) => q.query);
  const destructive = up.filter((q) => /^\s*(DROP|ALTER TABLE .* DROP)/i.test(q));
  const creates = up.filter((q) => /^\s*CREATE TABLE/i.test(q));
  const other = up.filter((q) => !creates.includes(q) && !destructive.includes(q));

  console.error(`-- total queries: ${up.length}`);
  console.error(`-- CREATE TABLE : ${creates.length}`);
  console.error(`-- other        : ${other.length}`);
  console.error(`-- DESTRUCTIVE  : ${destructive.length}`);
  if (destructive.length) {
    console.error('-- !! destructive statements present, review before using:');
    destructive.forEach((q) => console.error('--   ' + q.slice(0, 160)));
  }

  // stdout carries only the SQL, so it can be redirected straight to a file.
  // Original order is preserved: TypeORM emits CREATE TYPE before the CREATE
  // TABLE that references it, and printing tables first would fail on the enum.
  for (const q of up) {
    if (destructive.includes(q)) continue;
    console.log(q + ';');
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
