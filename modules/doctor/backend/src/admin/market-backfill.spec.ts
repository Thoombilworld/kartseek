import { describe, it, expect } from 'vitest';
import { backfillDoctorMarkets, formatBackfillResult } from './market-backfill';

/**
 * The re-runnable backfill, measured.
 *
 * The double below is a small but HONEST implementation of the two statements
 * the task issues: the candidate query really selects only rows whose
 * `region_code` is NULL and really resolves the market through the clinic, and
 * the `UPDATE` really refuses to write over a non-NULL value. So "a second run
 * changes nothing" is a property of the code under test rather than of a
 * recording stub — the first run's writes are visible to the second.
 *
 * Two of the assertions are textual, on the SQL itself, and deliberately so:
 * the `region_code IS NULL` guards are the whole safety argument for a task that
 * is meant to be run repeatedly and unattended, and a guard nobody asserts is a
 * guard somebody eventually simplifies away.
 */

type Row = {
  id: string;
  clinicId: string | null;
  hospitalId: string | null;
  region_code: string | null;
};
type Clinic = { id: string; region_code: string | null };

/** An in-memory `doctors` + `clinics` pair behind the same two statements. */
function db(doctors: Row[], clinics: Clinic[] = []) {
  const sqls: string[] = [];
  return {
    doctors,
    sqls,
    async query(sql: string, parameters?: unknown[]): Promise<any> {
      sqls.push(sql);

      if (sql.includes('LEFT JOIN')) {
        return doctors
          .filter((d) => d.region_code === null)
          .map((d) => ({
            id: d.id,
            clinicId: d.clinicId,
            hospitalId: d.hospitalId,
            market: clinics.find((c) => c.id === d.clinicId)?.region_code ?? null,
          }));
      }

      if (sql.includes('UPDATE')) {
        const [market, ids] = (parameters ?? []) as [string, string[]];
        for (const d of doctors) {
          // The real statement's `AND "region_code" IS NULL`, honoured here so
          // the "never overwrites" test is exercising the guard and not the
          // double's own generosity.
          if (ids.includes(d.id) && d.region_code === null) d.region_code = market;
        }
        return [];
      }

      const by = new Map<string | null, number>();
      for (const d of doctors) by.set(d.region_code, (by.get(d.region_code) ?? 0) + 1);
      return [...by.entries()]
        .map(([market, count]) => ({ market, count }))
        .sort((a, b) => String(a.market).localeCompare(String(b.market)));
    },
  };
}

const doctor = (id: string, over: Partial<Row> = {}): Row => ({
  id,
  clinicId: null,
  hospitalId: null,
  region_code: null,
  ...over,
});

describe('the backfill attributes a practitioner from their clinic', () => {
  it('gives a NULL practitioner whose clinic is in IN the market IN', async () => {
    const store = db([doctor('d-1', { clinicId: 'c-1' })], [{ id: 'c-1', region_code: 'IN' }]);
    const r = await backfillDoctorMarkets(store);

    expect(store.doctors[0].region_code).toBe('IN');
    expect(r).toMatchObject({ candidates: 1, attributed: 1, stillNull: 0 });
    expect(r.assigned).toEqual([{ market: 'IN', count: 1 }]);
  });

  it('writes one statement per market, in a stable order', async () => {
    const store = db(
      [
        doctor('d-1', { clinicId: 'c-qa' }),
        doctor('d-2', { clinicId: 'c-in' }),
        doctor('d-3', { clinicId: 'c-in' }),
      ],
      [
        { id: 'c-in', region_code: 'IN' },
        { id: 'c-qa', region_code: 'QA' },
      ],
    );
    const r = await backfillDoctorMarkets(store);

    expect(r.assigned).toEqual([
      { market: 'IN', count: 2 },
      { market: 'QA', count: 1 },
    ]);
    expect(r.attributed).toBe(3);
  });
});

describe('what the backfill will not do', () => {
  it('leaves a practitioner with no clinic NULL, and says why', async () => {
    const store = db([
      doctor('d-none'),
      doctor('d-hosp', { hospitalId: 'h-1' }),
      doctor('d-unseeded', { clinicId: 'c-1' }),
    ]);
    const r = await backfillDoctorMarkets(store);

    expect(store.doctors.every((d) => d.region_code === null)).toBe(true);
    expect(r).toMatchObject({ candidates: 3, attributed: 0, stillNull: 3 });
    // Three different reasons, reported apart: only the middle one is anything
    // M11 can fix by seeding, and the first cannot be fixed at all until
    // `hospitals` gains a market column.
    expect(r.unreachable).toEqual({
      hospitalOnly: 1,
      clinicWithoutMarket: 1,
      noParent: 1,
    });
  });

  it('does not copy a clinic market that is itself NULL', async () => {
    const store = db([doctor('d-1', { clinicId: 'c-1' })], [{ id: 'c-1', region_code: null }]);
    const r = await backfillDoctorMarkets(store);

    expect(store.doctors[0].region_code).toBeNull();
    expect(r.unreachable.clinicWithoutMarket).toBe(1);
    expect(r.attributed).toBe(0);
  });

  it('never overwrites a market that is already written', async () => {
    // The clinic says QA; the practitioner already says IN. The row is not a
    // candidate at all, so nothing about it is touched or reported as written.
    const store = db(
      [doctor('d-1', { clinicId: 'c-1', region_code: 'IN' })],
      [{ id: 'c-1', region_code: 'QA' }],
    );
    const r = await backfillDoctorMarkets(store);

    expect(store.doctors[0].region_code).toBe('IN');
    expect(r).toMatchObject({ candidates: 0, attributed: 0, stillNull: 0 });
    expect(store.sqls.some((s) => s.includes('UPDATE'))).toBe(false);
  });
});

describe('running it again is a no-op', () => {
  it('attributes on the first run and writes nothing on the second', async () => {
    const store = db(
      [doctor('d-1', { clinicId: 'c-1' }), doctor('d-2')],
      [{ id: 'c-1', region_code: 'IN' }],
    );

    const first = await backfillDoctorMarkets(store);
    expect(first).toMatchObject({ candidates: 2, attributed: 1, stillNull: 1 });

    store.sqls.length = 0;
    const second = await backfillDoctorMarkets(store);

    expect(second).toMatchObject({ candidates: 1, attributed: 0, stillNull: 1 });
    expect(store.sqls.some((s) => s.includes('UPDATE'))).toBe(false);
    expect(store.doctors.find((d) => d.id === 'd-1')?.region_code).toBe('IN');
  });
});

describe('the guards are in the SQL, not only in the loop', () => {
  it('selects candidates on region_code IS NULL and resolves through the clinic', async () => {
    const store = db([]);
    await backfillDoctorMarkets(store);
    const candidates = store.sqls.find((s) => s.includes('LEFT JOIN')) ?? '';

    expect(candidates).toContain('d."region_code" IS NULL');
    expect(candidates).toContain('LEFT JOIN "doctor"."clinics" c ON c."id" = d."clinicId"');
    // The hospital has no market column, so it is not in the statement at all.
    expect(candidates).not.toContain('hospitals');
  });

  it('repeats the NULL guard on the write', async () => {
    const store = db([doctor('d-1', { clinicId: 'c-1' })], [{ id: 'c-1', region_code: 'IN' }]);
    await backfillDoctorMarkets(store);
    const update = store.sqls.find((s) => s.includes('UPDATE')) ?? '';

    expect(update).toContain('"region_code" IS NULL');
  });
});

describe('a database error is an error', () => {
  it('propagates rather than reporting an empty run', async () => {
    // The script turns this into a non-zero exit. A task that reported
    // "0 attributed" on a failed connection would be indistinguishable from a
    // successful run with nothing to do — the same confusion the gateway's
    // fallback-free `send` exists to prevent.
    const broken = {
      async query(): Promise<never> {
        throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
      },
    };
    await expect(backfillDoctorMarkets(broken)).rejects.toThrow('ECONNREFUSED');
  });
});

describe('what a run prints', () => {
  it('names the target, the counts and the reason each row was missed', async () => {
    const store = db(
      [doctor('d-1', { clinicId: 'c-1' }), doctor('d-2', { hospitalId: 'h-1' })],
      [{ id: 'c-1', region_code: 'IN' }],
    );
    const lines = formatBackfillResult(
      'doctor_user@127.0.0.1:5432/kartseek_db',
      await backfillDoctorMarkets(store),
    );
    const text = lines.join('\n');

    expect(text).toContain('doctor_user@127.0.0.1:5432/kartseek_db');
    expect(text).toContain('unattributed before : 2');
    expect(text).toContain('attributed this run : 1 (IN 1)');
    expect(text).toContain('still NULL after    : 1 of 2');
    expect(text).toContain('hospital only          : 1');
    expect(text).toContain('(NULL) 1');
  });
});
