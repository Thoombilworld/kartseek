import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ComplaintManagementService } from '../services/complaint-management.service';

/**
 * A `where`-object market assignment drops the KEY for a market this platform
 * cannot read, and a `find` with no market key returns every market. Both taxi
 * complaint reads did that, and were found by
 * `scope-helper-uniqueness.spec.ts`'s where-object test rather than by review —
 * the bare-equality scan cannot see this shape (R11 round 3 / R2-1).
 */
function service() {
  const actionRepo = { find: vi.fn(async () => []) };
  const complaintRepo = { find: vi.fn(async () => []) };
  const svc = Object.create(ComplaintManagementService.prototype) as ComplaintManagementService;
  Object.assign(svc, {
    actionRepo,
    complaintRepo,
    logger: { warn: vi.fn(), log: vi.fn() },
  });
  return { svc, actionRepo, complaintRepo };
}

describe('taxi complaint reads refuse an unreadable market', () => {
  it('listDisciplinaryActions refuses ZZ, QAT and NOT-A-COUNTRY', async () => {
    for (const bad of ['ZZ', 'QAT', 'NOT-A-COUNTRY']) {
      const { svc, actionRepo } = service();
      await expect(svc.listDisciplinaryActions({ countryCode: bad })).rejects.toThrow(
        ForbiddenException,
      );
      expect(actionRepo.find).not.toHaveBeenCalled();
    }
  });

  it('getComplaintStats refuses the same, before reading a single complaint', async () => {
    for (const bad of ['ZZ', 'QAT', 'NOT-A-COUNTRY']) {
      const { svc, complaintRepo } = service();
      await expect(svc.getComplaintStats(bad)).rejects.toThrow(ForbiddenException);
      expect(complaintRepo.find).not.toHaveBeenCalled();
    }
  });

  it('narrows to one market for a readable one', async () => {
    const { svc, actionRepo } = service();
    await svc.listDisciplinaryActions({ countryCode: 'qa' });
    expect(actionRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ countryCode: 'QA' }) }),
    );
  });

  it('reads every market only when none is named', async () => {
    const { svc, complaintRepo } = service();
    await svc.getComplaintStats();
    const arg = complaintRepo.find.mock.calls[0][0] as any;
    expect('countryCode' in arg.where).toBe(false);
  });
});
