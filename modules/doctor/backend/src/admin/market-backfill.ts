/**
 * Attribute every unattributed practitioner to their clinic's market — again,
 * and as often as it takes.
 *
 * ── Why this exists as a re-runnable task and not only as a migration ───────
 *
 * `migrations/1786502800000-DoctorAdminSurfaces.ts` added `doctors.region_code`
 * and ran this same `UPDATE` once. On the databases it ran against it attributed
 * **nothing**, because every clinic's own `region_code` was NULL — there was no
 * value to copy. That is the correct fail-closed outcome, and it leaves the work
 * to be done again the moment somebody gives those clinics a market.
 *
 * A migration cannot be that second run: it is in the ledger on both databases,
 * and `down()` drops the column rather than resetting it, so reverting is not a
 * backfill path either. Until this file existed the only bulk re-stamp in the
 * module was `DoctorAdminService.approveClinic`, which an operator can only
 * reach one clinic at a time and which used to refuse a clinic that was already
 * `active` — which all of them are. So "seed `clinics.region_code` and the
 * console fills" was not true (M6 review, Important 1). It is now:
 *
 *     cd modules/doctor/backend && npm run backfill:markets
 *
 * ── The three rules, and where each is enforced ─────────────────────────────
 *
 *  1. **Only NULL rows are touched.** The candidate query selects
 *     `WHERE d.region_code IS NULL`, and every `UPDATE` repeats the condition,
 *     so a value written by hand, by a decision or by an earlier run is never
 *     overwritten — not even by a concurrent run.
 *  2. **The market comes from the practitioner's CLINIC.** `doctor.hospitals`
 *     has no market column of any kind, so a practitioner attached only to a
 *     hospital cannot be attributed by this or by anything else until that
 *     column exists. They are counted and reported, never guessed at.
 *  3. **A clinic with no market of its own attributes nobody.** Copying its NULL
 *     would look like an attribution attempt and read identically to rule 2.
 *
 * ── Why the decision is taken in TypeScript and not in one `UPDATE … FROM` ───
 *
 * The migration's single statement is the obvious implementation and it is not
 * the one here. A task whose whole output is a set of counts has to be able to
 * say *which* rows it could not reach and *why* — hospital-only, no parent at
 * all, or a clinic that has no market yet — and a bare `UPDATE … FROM` reports
 * one number and hides that distinction. Loading the candidates first also makes
 * the rules testable without a database: `market-backfill.spec.ts` drives this
 * function with a recording `query` and asserts the assignments, the still-NULL
 * rows and the no-op second run. The `UPDATE`s it then issues still carry the
 * `region_code IS NULL` guard, so the SQL is safe on its own terms.
 */

/** Whatever can run parameterised SQL — a `DataSource`, a `QueryRunner`, a test double. */
export interface SqlRunner {
  query<T = unknown>(sql: string, parameters?: unknown[]): Promise<T>;
}

/** One unattributed practitioner, with whatever market their clinic can offer. */
interface Candidate {
  id: string;
  clinicId: string | null;
  hospitalId: string | null;
  market: string | null;
}

/** One market's share of a census. */
export interface MarketCount {
  market: string | null;
  count: number;
}

export interface BackfillResult {
  /** Practitioners with `region_code IS NULL` when the run started. */
  candidates: number;
  /** Rows this run actually wrote. */
  attributed: number;
  /** What it wrote, per market. */
  assigned: MarketCount[];
  /** Why the rest could not be reached. */
  unreachable: {
    /** Attached to a hospital only — `hospitals` has no market column. */
    hospitalOnly: number;
    /** Attached to a clinic that has no market of its own yet. */
    clinicWithoutMarket: number;
    /** Attached to neither a clinic nor a hospital. */
    noParent: number;
  };
  /** Practitioners still unattributed after the run. */
  stillNull: number;
  /** Every practitioner, by market, after the run. */
  census: MarketCount[];
  total: number;
}

/** The candidates: unattributed practitioners, and the market their clinic offers. */
const CANDIDATES_SQL = `
  SELECT d."id",
         d."clinicId",
         d."hospitalId",
         c."region_code" AS market
    FROM "doctor"."doctors" d
    LEFT JOIN "doctor"."clinics" c ON c."id" = d."clinicId"
   WHERE d."region_code" IS NULL
   ORDER BY d."id"
`;

/**
 * One market's worth of writes.
 *
 * `AND "region_code" IS NULL` is repeated here even though the candidate query
 * already selected on it: the two statements are not in one transaction from the
 * database's point of view, and a decision taken between them (which stamps the
 * row from the same clinic) must win rather than be re-written.
 */
const ASSIGN_SQL = `
  UPDATE "doctor"."doctors"
     SET "region_code" = $1
   WHERE "id" = ANY($2::uuid[])
     AND "region_code" IS NULL
`;

/** Every practitioner by market, for the after-run census. */
const CENSUS_SQL = `
  SELECT "region_code" AS market, COUNT(*)::int AS count
    FROM "doctor"."doctors"
   GROUP BY 1
   ORDER BY 1
`;

const countOf = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Run the backfill and report what it could and could not do.
 *
 * Throws whatever the driver throws — the caller decides what a database error
 * means. `scripts/backfill-markets.ts` exits non-zero on one.
 */
export async function backfillDoctorMarkets(db: SqlRunner): Promise<BackfillResult> {
  const candidates = (await db.query<Candidate[]>(CANDIDATES_SQL)) ?? [];

  const byMarket = new Map<string, string[]>();
  const unreachable = { hospitalOnly: 0, clinicWithoutMarket: 0, noParent: 0 };

  for (const row of candidates) {
    const market = typeof row.market === 'string' ? row.market.trim() : '';
    if (market) {
      const ids = byMarket.get(market) ?? [];
      ids.push(row.id);
      byMarket.set(market, ids);
      continue;
    }
    if (row.clinicId) unreachable.clinicWithoutMarket += 1;
    else if (row.hospitalId) unreachable.hospitalOnly += 1;
    else unreachable.noParent += 1;
  }

  const assigned: MarketCount[] = [];
  let attributed = 0;
  // Sorted so a run's output is stable and two runs are diffable.
  for (const market of [...byMarket.keys()].sort()) {
    const ids = byMarket.get(market) as string[];
    await db.query(ASSIGN_SQL, [market, ids]);
    assigned.push({ market, count: ids.length });
    attributed += ids.length;
  }

  const censusRows =
    (await db.query<Array<{ market: string | null; count: unknown }>>(CENSUS_SQL)) ?? [];
  const census: MarketCount[] = censusRows.map((r) => ({
    market: r.market ?? null,
    count: countOf(r.count),
  }));

  return {
    candidates: candidates.length,
    attributed,
    assigned,
    unreachable,
    stillNull: census.find((r) => r.market === null)?.count ?? 0,
    census,
    total: census.reduce((n, r) => n + r.count, 0),
  };
}

/** The run, as the lines the script prints. Shared so the spec can read them too. */
export function formatBackfillResult(target: string, r: BackfillResult): string[] {
  const lines = [
    `doctor market backfill — ${target}`,
    `  unattributed before : ${r.candidates}`,
    `  attributed this run : ${r.attributed}${
      r.assigned.length ? ` (${r.assigned.map((a) => `${a.market} ${a.count}`).join(', ')})` : ''
    }`,
    `  still NULL after    : ${r.stillNull} of ${r.total}`,
  ];
  if (r.stillNull) {
    lines.push(
      `    hospital only          : ${r.unreachable.hospitalOnly}  (doctor.hospitals has no market column)`,
      `    clinic has no market   : ${r.unreachable.clinicWithoutMarket}  (seed clinics.region_code, then re-run)`,
      `    no clinic, no hospital : ${r.unreachable.noParent}`,
    );
  }
  lines.push(
    `  by market           : ${r.census
      .map((c) => `${c.market ?? '(NULL)'} ${c.count}`)
      .join(', ')}`,
  );
  return lines;
}
