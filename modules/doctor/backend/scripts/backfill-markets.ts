/* eslint-disable no-console */
/**
 * Attribute every unattributed practitioner to their clinic's market.
 *
 *     cd modules/doctor/backend
 *     npm run backfill:markets
 *
 * Re-runnable, idempotent, and safe to run at any time: it only ever writes to a
 * row whose `region_code` is NULL, and only ever writes the market its CLINIC
 * already carries. A value written by hand, by an administrator's decision or by
 * an earlier run is never overwritten. See `src/admin/market-backfill.ts` for
 * the three rules and for why the decision is taken per row rather than in one
 * `UPDATE … FROM`.
 *
 * ── Which database ──────────────────────────────────────────────────────────
 *
 * The module's own, through the module's own DataSource, as the module's own
 * role (`doctor_user`) — `resolveDoctorDbConfig`, the same function
 * `doctor-service.module.ts` calls, so this task and the running service can
 * never reach different databases.
 *
 * `dotenv/config` reads `.env` from the process's working directory, so **run
 * this from this directory**. It resolves `DOCTOR_DB_*` first and the shared
 * `DB_*` second; a variable already in the environment wins over the file, which
 * is how a second database is reached without editing a developer's `.env`:
 *
 *     DOCTOR_DB_PORT=5437 DOCTOR_DB_NAME=kartseek_doctor npm run backfill:markets
 *
 * There are two in this development tree and BOTH need it — the module `.env`
 * names `kartseek_db`:5432 and `apps/api/.env` names `kartseek_doctor`:5437.
 * The target is printed on the first line of the output for exactly that reason.
 *
 * ── Exit codes ──────────────────────────────────────────────────────────────
 *
 * 0 when the run completed, whatever it was able to attribute — "nothing to do"
 * is a successful run, and it is the expected one until somebody seeds
 * `clinics.region_code`. Non-zero on any database error, so a caller in a
 * pipeline cannot mistake a failed connection for an empty result. That is the
 * same distinction the gateway's fallback-free `send` exists to preserve.
 */
import 'dotenv/config';
import { DoctorDataSource } from '../data-source';
import { backfillDoctorMarkets, formatBackfillResult } from '../src/admin/market-backfill';

async function main(): Promise<number> {
  const { host, port, database, username } = DoctorDataSource.options as {
    host: string;
    port: number;
    database: string;
    username: string;
  };
  const target = `${username}@${host}:${port}/${database}`;

  await DoctorDataSource.initialize();
  try {
    const result = await backfillDoctorMarkets(DoctorDataSource);
    for (const line of formatBackfillResult(target, result)) console.log(line);
    return 0;
  } finally {
    await DoctorDataSource.destroy();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(`doctor market backfill FAILED: ${(err as Error)?.message ?? String(err)}`);
    process.exit(1);
  });
