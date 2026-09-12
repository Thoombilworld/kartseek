import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { FranchiseService } from './franchise.service';
import { FranchiseController } from './franchise.controller';

/**
 * franchise-service's first authorisation rule, and its first spec.
 *
 * A franchise belongs to one country. Until now nothing in this service read
 * that column for authorisation and nothing in the gateway checked who was
 * asking, so any authenticated user could name any franchise id and read or
 * act on the whole estate behind it (audit AUD2, §13 X-46/X-47).
 *
 * The gateway's `FranchiseAccessGuard` is the primary control; these tests
 * cover the second half — the TCP surface refusing on its own, so that a
 * command reaching this service by any other path is still checked.
 */

function build(row: { ownerId?: string | null; countryCode?: string | null } | null) {
  const franchiseRepo = {
    findOne: vi.fn(async () =>
      row === null ? null : { id: 'fr-1', ownerId: 'owner-1', countryCode: 'IN', ...row },
    ),
  };
  const client = { send: vi.fn(() => of({ total: 3, verified: 2 })) };
  const svc = Object.create(FranchiseService.prototype) as FranchiseService;
  Object.assign(svc, {
    franchiseRepo,
    redis: { setJson: vi.fn(async () => 'OK'), getJson: vi.fn(async () => null) },
    kafka: { publish: vi.fn(async () => undefined) },
    marketplace: client,
    grocery: client,
    restaurant: client,
    pharmacy: client,
    doctor: client,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, ctrl: new FranchiseController(svc), franchiseRepo, client };
}

describe('assertFranchiseInScope', () => {
  it('refuses a QA-locked caller an IN franchise, with the platform denial copy', async () => {
    const { svc } = build({ countryCode: 'IN' });
    await expect(svc.assertFranchiseInScope('fr-1', 'QA')).rejects.toThrow(ForbiddenException);
    await expect(svc.assertFranchiseInScope('fr-1', 'QA')).rejects.toThrow(
      'This franchise belongs to IN, not to the QA market.',
    );
  });

  it('admits a QA-locked caller a QA franchise — the control', async () => {
    const { svc } = build({ countryCode: 'QA' });
    await expect(svc.assertFranchiseInScope('fr-1', 'QA')).resolves.toBe('fr-1');
  });

  it('normalises a sub-region lock to its country', async () => {
    const { svc } = build({ countryCode: 'QA' });
    await expect(svc.assertFranchiseInScope('fr-1', 'QA-DOH')).resolves.toBe('fr-1');
  });

  it('refuses an unknown franchise to a locked caller, and never 404s the id away', async () => {
    const { svc } = build(null);
    await expect(svc.assertFranchiseInScope('fr-nope', 'QA')).rejects.toThrow(
      'This franchise belongs to every market, not to the QA market.',
    );
  });

  it('asks the database nothing for an unscoped caller', async () => {
    const { svc, franchiseRepo } = build({ countryCode: 'IN' });
    await expect(svc.assertFranchiseInScope('fr-1')).resolves.toBe('fr-1');
    expect(franchiseRepo.findOne).not.toHaveBeenCalled();
  });

  it('rejects a command that names no franchise at all', async () => {
    // `where: { id: undefined }` is no predicate in TypeORM: it returns the
    // first franchise in the table, so a missing id used to answer with
    // somebody's estate.
    const { svc, franchiseRepo } = build({ countryCode: 'IN' });
    await expect(svc.assertFranchiseInScope(undefined, 'QA')).rejects.toThrow(BadRequestException);
    await expect(svc.assertFranchiseInScope('')).rejects.toThrow('A franchise id is required.');
    expect(franchiseRepo.findOne).not.toHaveBeenCalled();
  });
});

describe('franchise.get_access', () => {
  it('answers with the owner and the market, and nothing else', async () => {
    const { ctrl } = build({ ownerId: 'owner-7', countryCode: 'QA' });
    await expect(ctrl.getAccess({ id: 'fr-1' })).resolves.toEqual({
      id: 'fr-1',
      ownerId: 'owner-7',
      countryCode: 'QA',
    });
  });

  it('answers nulls for an unknown franchise and for no id — both deny', async () => {
    const { ctrl } = build(null);
    await expect(ctrl.getAccess({ id: 'fr-nope' })).resolves.toEqual({
      id: null,
      ownerId: null,
      countryCode: null,
    });
    const { ctrl: noId, franchiseRepo } = build({ countryCode: 'IN' });
    await expect(noId.getAccess({ id: undefined as unknown as string })).resolves.toEqual({
      id: null,
      ownerId: null,
      countryCode: null,
    });
    expect(franchiseRepo.findOne).not.toHaveBeenCalled();
  });
});

describe('every franchise command refuses out-of-market before it reads anything', () => {
  it('refuses the dashboard, the stores, a module read and a module write', async () => {
    for (const call of [
      (c: FranchiseController) => c.getDashboard({ id: 'fr-1', scope: 'QA' }),
      (c: FranchiseController) => c.getStores({ id: 'fr-1', scope: 'QA' }),
      (c: FranchiseController) => c.getGroceryOrders({ id: 'fr-1', scope: 'QA' }),
      (c: FranchiseController) =>
        c.updateGroceryStoreStatus({
          id: 'fr-1',
          scope: 'QA',
          storeId: 'st-1',
          status: 'SUSPENDED',
        }),
      (c: FranchiseController) =>
        c.updateTaxiDriverStatus({ id: 'fr-1', scope: 'QA', driverId: 'd-1', status: 'BLOCKED' }),
    ]) {
      const { ctrl, client } = build({ countryCode: 'IN' });
      await expect(call(ctrl)).rejects.toThrow(
        'This franchise belongs to IN, not to the QA market.',
      );
      // Refused before the module service is asked — a denial that still calls
      // grocery-service has already told the caller the estate exists.
      expect(client.send).not.toHaveBeenCalled();
    }
  });

  it('serves the same commands in the caller’s own market — the control', async () => {
    const { ctrl, client } = build({ countryCode: 'QA' });
    await expect(ctrl.getDashboard({ id: 'fr-1', scope: 'QA' })).resolves.toMatchObject({
      franchiseId: 'fr-1',
      region: 'QA',
    });
    expect(client.send).toHaveBeenCalled();
  });

  it('leaves a global caller (no scope) free in any market', async () => {
    const { ctrl } = build({ countryCode: 'IN' });
    await expect(ctrl.getDashboard({ id: 'fr-1' })).resolves.toMatchObject({ region: 'IN' });
  });
});

/**
 * A lock this platform cannot read must not skip the franchise lookup.
 *
 * `assertFranchiseInScope` opened with `if (!normaliseMarket(scope)) return
 * franchiseId;` — a readability gate deciding absent-vs-unreadable for itself.
 * Once `normaliseMarket` became registry-backed, a lock such as `ZZ` returned
 * the id WITHOUT loading the franchise, so no market assert ran at all and
 * every command behind it answered for any estate. Before that change the same
 * lock filtered to a plausible wrong market; afterwards it filtered to nothing
 * (R11 fix round 3 / R2-1).
 */
describe('an unreadable lock cannot skip the franchise market assert', () => {
  it('refuses ZZ, QAT and NOT-A-COUNTRY rather than returning the id unchecked', async () => {
    for (const brokenLock of ['ZZ', 'QAT', 'NOT-A-COUNTRY']) {
      const { svc, franchiseRepo } = build({ countryCode: 'IN' });
      await expect(svc.assertFranchiseInScope('fr-1', brokenLock)).rejects.toThrow(
        ForbiddenException,
      );
      // The lookup DID happen — the refusal comes from the row, not from the gate.
      expect(franchiseRepo.findOne).toHaveBeenCalled();
    }
  });

  it('still refuses a readable lock on another market, and allows its own', async () => {
    const other = build({ countryCode: 'IN' });
    await expect(other.svc.assertFranchiseInScope('fr-1', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    const own = build({ countryCode: 'QA' });
    await expect(own.svc.assertFranchiseInScope('fr-1', 'QA')).resolves.toBe('fr-1');
  });

  it('skips the lookup only for a genuinely global caller', async () => {
    for (const noLock of [undefined, '', '   ']) {
      const { svc, franchiseRepo } = build({ countryCode: 'IN' });
      await expect(svc.assertFranchiseInScope('fr-1', noLock)).resolves.toBe('fr-1');
      expect(franchiseRepo.findOne).not.toHaveBeenCalled();
    }
  });
});
