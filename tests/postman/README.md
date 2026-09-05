# Postman collections

The Postman/Newman suite that exercises the API gateway's HTTP surface end to
end: 34 collections (31 numbered ones covering auth through loyalty, plus
`KARTSEEK_Hotel_Booking_API`, `KARTSEEK_Pharmacy_API` and `payment-service`),
9 environments, shared test data, and two ways to run them — Postman's own
Collection Runner, or Newman from the command line.

## Import into Postman

1. Postman Desktop → **Import** → **Folder** → select `tests/postman/collections/`.
2. **Import** again → select every file in `tests/postman/environments/`.
3. Pick **KARTSEEK — Local Development** as the active environment — not to
   be confused with the environment named plainly **KARTSEEK Local**, which
   belongs to `local.postman_environment.json` and the payment runner below.
4. Open `01-auth-user-management` and run a registration or login request
   first — every other collection depends on the tokens it stores into
   environment variables (`user_token`, `admin_token`, `seller_token`, …).

## Running with Newman

A single collection:

```bash
newman run tests/postman/collections/01-auth-user-management.postman_collection.json \
  -e tests/postman/environments/KARTSEEK_Local.postman_environment.json
```

All of them, via the batch runner:

```bash
node tests/postman/scripts/run-all.js                    # KARTSEEK_Local, every collection
node tests/postman/scripts/run-all.js --env staging       # against staging
node tests/postman/scripts/run-all.js --collection 01     # one collection by number prefix
node tests/postman/scripts/run-all.js --critical-only     # the 8 collections CI treats as required
node tests/postman/scripts/run-all.js --env staging --bail # stop on first failure
```

`--env` selects one of the eight `KARTSEEK_*` environments by short name
(`local`, `staging`, `production`, `india`, `qatar`, `uae`, `uk`, `usa`,
default `local`); it copies the chosen environment file into `reports/` and
runs every collection against that working copy in sequence, so tokens and
IDs one collection creates carry into the next.

The payment service has its own collection and its own runner, because it
targets the environment named `local` rather than `KARTSEEK_Local`:

```bash
tests/postman/newman/run-payment-tests.sh            # against local
tests/postman/newman/run-payment-tests.sh staging    # or: staging, production
```

## Directory structure

```
tests/postman/
├── collections/     34 collection files (31 numbered + hotel + pharmacy + payment)
├── environments/    9 environment files: 8 KARTSEEK_* (local through usa) + local
├── data/            Shared test data — users, products, orders, countries
├── scripts/
│   ├── generate-collections.js   Regenerates the 31 numbered collections
│   └── run-all.js                The Newman batch runner described above
├── newman/
│   └── run-payment-tests.sh      The payment-service-only runner
├── reports/         Newman output — git-ignored except .gitkeep
└── newman.config.js Shared reporter/timeout configuration
```

## Environments

| File                                                                                                                                                                                                           | Purpose                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KARTSEEK_Local.postman_environment.json`                                                                                                                                                                      | The numbered suite's local target — used by `run-all.js` by default.                                                                                  |
| `KARTSEEK_Staging.postman_environment.json`, `KARTSEEK_Production.postman_environment.json`                                                                                                                    | Staging and production targets for the numbered suite.                                                                                                |
| `KARTSEEK_India.postman_environment.json`, `KARTSEEK_Qatar.postman_environment.json`, `KARTSEEK_UAE.postman_environment.json`, `KARTSEEK_UK.postman_environment.json`, `KARTSEEK_USA.postman_environment.json` | Per-market variants: country code, currency, tax label.                                                                                               |
| `local.postman_environment.json`                                                                                                                                                                               | The target `run-payment-tests.sh` uses by default — a separate file from `KARTSEEK_Local` because the payment collection predates the numbered suite. |

## Regenerating the numbered collections

```bash
node tests/postman/scripts/generate-collections.js
```

Run this after adding or changing gateway endpoints; it rewrites the 31
numbered collection files from the generator's own endpoint list. The hotel,
pharmacy and payment collections are hand-authored and are not touched by it.

## Reports

Newman writes to `tests/postman/reports/`, which is git-ignored apart from a
`.gitkeep` — nothing under it is meant to be committed.

## Notes

- Run the auth collection first; almost everything else depends on tokens it
  stores.
- Never commit a real token — production environment values must stay empty.
- `data/` holds synthetic test data only.
