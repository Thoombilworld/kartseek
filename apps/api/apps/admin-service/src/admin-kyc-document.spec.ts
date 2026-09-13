import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminService } from './admin.service';

/**
 * The KYC approval queue gets a row, and one document has an owner and a market.
 *
 * `getPendingKyc` scans `admin:kyc:pending:*`, and until now NOTHING on the
 * platform wrote those keys: the gateway's KYC upload stored a document (once
 * it stored anything at all) and left the queue empty, so a submitted identity
 * document was invisible to the reviewers who were supposed to decide on it
 * (whole-branch review MUST FIX 9; re-review RF-1, "no KYC approval-queue row").
 *
 * `recordKycDocument` is the producer, called by `POST /upload/kyc-document`.
 * It writes two keys — the queue row the console reads, and the document record
 * `GET /admin/kyc/documents/:key` authorises against — and the market on that
 * record is what stops a region-locked reviewer reading another market's
 * identity documents.
 */
function makeService() {
  const store = new Map<string, any>();
  const counters = new Map<string, string>();
  const redis = {
    scanKeys: vi.fn(async (pattern: string) =>
      [...store.keys()].filter((k) => k.startsWith(pattern.replace('*', ''))),
    ),
    getJson: vi.fn(async (k: string) => store.get(k) ?? null),
    setJson: vi.fn(async (k: string, v: any) => {
      store.set(k, JSON.parse(JSON.stringify(v)));
    }),
    get: vi.fn(async (k: string) => counters.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      counters.set(k, v);
    }),
    del: vi.fn(async (k: string) => {
      store.delete(k);
    }),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const orderClient = { send: vi.fn(() => of({})) };
  const svc = new AdminService(redis as any, kafka as any, {} as any, null, orderClient as any);
  return { svc, store, counters, kafka };
}

const KEY = 'kyc/u-2/8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf';
const submission = {
  key: KEY,
  owner: 'u-2',
  entityType: 'seller',
  market: 'QA',
  mime: 'application/pdf',
  size: 245760,
  uploadedAt: '2026-09-12T10:00:00.000Z',
};

describe('an uploaded KYC document reaches the approval queue', () => {
  it('writes the row getPendingKyc reads', async () => {
    const { svc } = makeService();
    await svc.recordKycDocument(submission);

    const page = await svc.getPendingKyc(1, 20);
    expect(page.total).toBe(1);
    expect(page.data[0]).toMatchObject({
      entityId: 'u-2',
      entityType: 'seller',
      country: 'QA',
      submittedAt: submission.uploadedAt,
    });
    expect(page.data[0].documents).toHaveLength(1);
    expect(page.data[0].documents[0]).toMatchObject({ key: KEY, type: 'application/pdf' });
  });

  it('scopes that row to the market it was submitted in', async () => {
    const { svc } = makeService();
    await svc.recordKycDocument(submission);
    expect((await svc.getPendingKyc(1, 20, 'QA')).total).toBe(1);
    expect((await svc.getPendingKyc(1, 20, 'IN')).total).toBe(0);
  });

  it('appends a second document to the same applicant rather than queueing twice', async () => {
    const { svc } = makeService();
    await svc.recordKycDocument(submission);
    await svc.recordKycDocument({ ...submission, key: 'kyc/u-2/second-doc.pdf' });
    const page = await svc.getPendingKyc(1, 20);
    expect(page.total).toBe(1);
    expect(page.data[0].documents).toHaveLength(2);
  });

  /**
   * The applicant is counted once because there is ONE ROW, not because a
   * counter was incremented once.
   *
   * This asserted `admin:counter:pending_kyc === '1'` — a key kept by
   * `set(get() + 1)` with no rebuild path, which read 0 for ever after the
   * Redis AOF transition wiped the development instance and which the console
   * would then have displayed. The queue rows are the count now (dispatch
   * addendum item 13), so a second document from the same applicant adds
   * nothing to it, and that is what is checked.
   */
  it('counts the applicant once, from the queue rows themselves', async () => {
    const { svc } = makeService();
    await svc.recordKycDocument(submission);
    await svc.recordKycDocument({ ...submission, key: 'kyc/u-2/second-doc.pdf' });
    expect((await svc.getPendingKyc(1, 20)).total).toBe(1);
    expect(((await svc.getDashboardStats()) as any).pendingKyc).toEqual({ value: 1 });
  });

  it('keeps no free-standing counter that could drift from the queue', async () => {
    const { svc, counters } = makeService();
    await svc.recordKycDocument(submission);
    expect([...counters.keys()].filter((k) => k.includes('pending_kyc'))).toEqual([]);
  });

  it('drops back to zero when the queue is emptied', async () => {
    // The decrement used to be a second `set(get() - 1)`, so a crash between
    // deleting the row and writing the counter left the console reporting work
    // that was already done, permanently.
    const { svc } = makeService();
    await svc.recordKycDocument(submission);
    await svc.approveKyc(submission.owner, submission.entityType, 'admin-1');
    expect(((await svc.getDashboardStats()) as any).pendingKyc).toEqual({ value: 0 });
  });

  it('records no pointer a reviewer could follow without a token', async () => {
    const { svc } = makeService();
    await svc.recordKycDocument(submission);
    const [doc] = (await svc.getPendingKyc(1, 20)).data[0].documents;
    // The gateway route, not a CDN or signed URL — RF-1 was a public URL
    // contract for exactly these files.
    expect(doc.url).toBe(`/admin/kyc/documents/${Buffer.from(KEY).toString('base64url')}`);
    expect(doc.url).not.toContain('http');
    expect(doc.url).not.toContain('cdn');
  });

  it('is decidable: approve resolves the row the upload wrote', async () => {
    const { svc, store } = makeService();
    await svc.recordKycDocument(submission);
    await svc.approveKyc('u-2', 'seller', 'admin-1', 'QA');
    expect(store.has('admin:kyc:pending:seller:u-2')).toBe(false);
    expect(store.has('admin:kyc:verified:seller:u-2')).toBe(true);
  });

  it('refuses a submission with no key or no owner', async () => {
    const { svc } = makeService();
    await expect(svc.recordKycDocument({ key: '', owner: 'u-2' })).rejects.toThrow();
    await expect(svc.recordKycDocument({ key: KEY, owner: '' })).rejects.toThrow();
  });
});

describe('one document, read back by market', () => {
  it('returns the record for an administrator in its market', async () => {
    const { svc } = makeService();
    await svc.recordKycDocument(submission);
    const doc = await svc.getKycDocument(KEY, 'QA');
    expect(doc).toMatchObject({ key: KEY, owner: 'u-2', market: 'QA', mime: 'application/pdf' });
  });

  it('returns it for a global administrator', async () => {
    const { svc } = makeService();
    await svc.recordKycDocument(submission);
    expect((await svc.getKycDocument(KEY, undefined)).key).toBe(KEY);
  });

  it("refuses another market's document", async () => {
    const { svc } = makeService();
    await svc.recordKycDocument(submission);
    await expect(svc.getKycDocument(KEY, 'IN')).rejects.toThrow(ForbiddenException);
  });

  it('refuses an unattributed document for a locked reviewer', async () => {
    const { svc } = makeService();
    await svc.recordKycDocument({ ...submission, market: null });
    await expect(svc.getKycDocument(KEY, 'QA')).rejects.toThrow(ForbiddenException);
  });

  it('is not found rather than empty when no such document exists', async () => {
    const { svc } = makeService();
    await expect(svc.getKycDocument('kyc/u-9/nothing.pdf', undefined)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('outlives the decision, so an approved document is still readable', async () => {
    const { svc } = makeService();
    await svc.recordKycDocument(submission);
    await svc.approveKyc('u-2', 'seller', 'admin-1', 'QA');
    expect((await svc.getKycDocument(KEY, 'QA')).key).toBe(KEY);
  });
});
