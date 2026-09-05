# Seeding

This guide is for anyone who needs demo data in a local database — which
scripts exist, what each one populates, what order they have to run in, which
ones are safe to re-run, and the one prerequisite (Kafka topics) that has
nothing to do with the seed scripts themselves but silently breaks anything
that publishes an event while working through them.

## The root `db:seed*` scripts

```bash
npm run db:seed             # runs the four below, in this order
npm run db:seed:grocery
npm run db:seed:marketplace
npm run db:seed:restaurant
npm run db:seed:pharmacy
```

Only these four modules are wired to a root script today. Each runs its own
`apps/api/scripts/seed/seed-<module>.ts` via `ts-node`:

- **`seed-grocery`** — seeds `grocery_categories`, `grocery_stores`, and
  `grocery_items` with demo data. **Idempotent**: existing records are
  upserted, safe to re-run.
- **`seed-marketplace`** — seeds 10 brands, 20 categories (each with 8
  subcategories as tree children), and products spread across every category.
  Unlike the others, this one does **not** connect to Postgres directly: it
  calls the marketplace service's own HTTP write endpoints (see
  `MARKETPLACE_SERVICE_URL` to point it elsewhere; the service's default port
  is in `services.yaml`), because those endpoints are the only place the write
  logic lives. They are guarded by `JwtAuthGuard` + `RolesGuard` requiring
  `ADMIN` or `SUPER_ADMIN`, so this seed needs a bearer token:
  `SEED_ADMIN_TOKEN=<jwt> npm run db:seed:marketplace`. **Idempotent**:
  re-running resolves existing rows by slug rather than failing — see
  "Idempotency" below for why that specific choice matters.
- **`seed-restaurant`** — populates the restaurant tables (menu categories,
  menu items, tables, staff, reviews, promotions, orders, reservations).
  **Idempotent**: checks for existing data before inserting.
- **`seed-pharmacy`** — populates 6 pharmacies across Mumbai, 16 categories,
  50+ medicines with real compositions, plus staff, promotions, reviews,
  orders, and prescriptions. Its header does not document idempotency the way
  the other three do — treat re-running it as unverified rather than assumed
  safe.

## Everything else — `seed-all.ts`

Six more seed scripts exist under `apps/api/scripts/seed/` with **no root npm
script**: `seed-taxi.ts`, `seed-hotel.ts`, `seed-grocery.ts` (also reachable
above), `seed-restaurant.ts` (also above), `seed-doctor.ts`,
`seed-delivery.ts`, `seed-partner.ts`, and `seed-franchise.ts`. The master
runner, `apps/api/scripts/seed/seed-all.ts`, runs all ten in this fixed order:

```
Marketplace → Taxi → Pharmacy → Hotel → Grocery → Restaurant → Doctor →
Delivery → Partner → Franchise
```

Run it directly (it is not wired to a root or workspace script):

```bash
npx ts-node apps/api/scripts/seed/seed-all.ts
```

**Franchise has to run last**, and the script enforces that ordering. It owns
exactly one table, `franchises` — everything a franchise dashboard shows is
fetched live from the module that owns it, over TCP. What `seed-franchise.ts`
actually does is seed six demo franchise zones and then mark a handful of rows
in each _other_ vertical's own tables (`sellers`, `grocery_stores`,
`restaurants`, `pharmacy_stores`, `clinics` — currently five separate
databases) as belonging to one of those zones. It never creates the rows it
links, so every vertical it touches has to be seeded first.

`seed-hotel.ts` is also explicitly idempotent (upserts). The remaining scripts
not covered above — taxi, doctor, delivery, partner, franchise — do not state
an idempotency guarantee in their headers; assume a clean database unless
you've checked the script.

## Kafka topics (do this before seeding anything that publishes)

The broker runs with topic auto-creation disabled
(`KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'`), so a topic nothing has created
does not spring into existence on first publish — the send just fails.
`npm run infra:up` already runs this for you (chained after `docker compose
up`), but if you bring Kafka up separately, or ever run `docker compose down
-v` (which drops the broker's data and every topic with it), re-provision
before seeding or running anything that emits an event:

```bash
npm run kafka:topics
```

This reads every topic name straight out of
`apps/api/libs/kafka/src/kafka-topics.constants.ts` — one source of truth — and
creates whichever ones are missing. It is idempotent by design: existing
topics are left alone, so it is always safe to re-run.

## Idempotency, in general

Where a seed script says it upserts, check _what_ it upserts by — the
marketplace seed resolves by slug, not by name or id. Two rows meant to be the
same thing but seeded under different slugs are treated as different rows, and
a slug that was renamed between seed runs orphans the old row rather than
updating it. When writing a new seed script, prefer resolving by a stable,
human-meaningful key (a slug, not an auto-generated id) for exactly this
reason.
