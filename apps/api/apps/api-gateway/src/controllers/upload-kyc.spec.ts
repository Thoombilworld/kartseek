import { describe, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { UploadController } from './upload.controller';

/**
 * `POST /upload/kyc-document` stores the document it says it stored, PRIVATELY,
 * and queues it for review.
 *
 * Two fixes landed here and the first was wrong, so both are pinned.
 *
 * What it originally did (whole-branch review, MUST FIX 9): validate the file,
 * mint an opaque reference with `generateDocumentId('KYC')`, compute a
 * `fileKey` it then never used, **discard `file.buffer`**, and answer
 * `"KYC Document securely uploaded to object storage."` with
 * `status: 'PENDING_ADMIN_APPROVAL'`. Nothing was stored and no row recorded
 * it, on a compliance path, to the applicant whose identity document it was.
 *
 * What the fix wave then did (re-review RF-1): route it through
 * `StorageService.upload` — the PUBLIC seam. GCS saves those objects with
 * `public: true`, S3 and R2 stamp a public immutable `CacheControl` for the CDN
 * in front of them, and every provider caught a failed write and returned a
 * plausible CDN URL regardless. So a government ID landed on a CDN-fronted
 * bucket, and the "not swallowed" guarantee this spec asserted against a
 * rejecting mock did not exist in the real seam.
 *
 * What it does now: `storePrivate` (no ACL, no CDN, an opaque key back), a 502
 * naming the storage failure when the write fails, a queue row through
 * admin-service so `GET /admin/kyc/pending` can see it, a 503 plus a cleanup
 * when that row cannot be written, and no market segment in the key — the
 * market goes on the row, because `kyc/<market>/…` was a shape production never
 * produced (RF-2).
 */
const SOURCE = fs.readFileSync(path.join(__dirname, 'upload.controller.ts'), 'utf8');

function build(
  opts: {
    store?: () => Promise<string>;
    queue?: () => any;
    del?: () => Promise<void>;
  } = {},
) {
  const storePrivate = vi.fn(
    opts.store ?? (async () => 'kyc/u-2/8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf'),
  );
  const deletePrivate = vi.fn(opts.del ?? (async () => undefined));
  const send = vi.fn(opts.queue ?? (() => of({ success: true })));
  const ctrl = Object.create(UploadController.prototype) as any;
  Object.assign(ctrl, {
    storage: { storePrivate, deletePrivate, upload: vi.fn() },
    adminClient: { send },
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { ctrl, storePrivate, deletePrivate, send };
}

const file = {
  originalname: 'national_id.pdf',
  buffer: Buffer.from('%PDF-1.7 pretend'),
  mimetype: 'application/pdf',
  size: 16,
};
const req = (user: object) => ({ user, method: 'POST', originalUrl: '/upload/kyc', headers: {} });
const qaSeller = { userId: 'u-1', role: 'SELLER', regionCode: 'QA', regionLocked: true };
const seller = { userId: 'u-2', role: 'SELLER' };
const driver = { userId: 'u-3', role: 'DRIVER' };

describe('a KYC upload is stored privately, and reports what was stored', () => {
  it('sends the bytes to the PRIVATE seam, never the public one', async () => {
    const { ctrl, storePrivate } = build();
    await ctrl.uploadKycDocument(req(seller), file);
    expect(storePrivate).toHaveBeenCalledTimes(1);
    expect(ctrl.storage.upload).not.toHaveBeenCalled();
    const [folder, key, body, mime] = storePrivate.mock.calls[0] as unknown as [
      string,
      string,
      Buffer,
      string,
    ];
    expect(folder).toBe('kyc');
    expect(key).toMatch(/^u-2\/[0-9a-f-]{36}\.pdf$/);
    expect(body).toBe(file.buffer);
    expect(mime).toBe('application/pdf');
  });

  it('returns the stored key and the pending status', async () => {
    const { ctrl } = build();
    const res = await ctrl.uploadKycDocument(req(seller), file);
    expect(res.status).toBe('PENDING_ADMIN_APPROVAL');
    expect(res.size).toBe(16);
    expect(res.filename).toBe('kyc/u-2/8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf');
  });

  it('never returns the original filename, and never a url of any kind', async () => {
    const { ctrl } = build();
    const res = await ctrl.uploadKycDocument(req(seller), file);
    expect(res.filename).not.toContain('national_id');
    expect(JSON.stringify(res)).not.toContain('http');
    expect(JSON.stringify(res)).not.toContain('cdn');
  });

  /**
   * RF-2. The market segment needed `regionLocked: true`, which no seller or
   * driver token carries — `users.region_locked` is set only by the staff DTOs
   * — so `kyc/QA/…` was a documented shape production never produced. The
   * market is resolved and recorded on the QUEUE ROW, where the reviewer's
   * scope check uses it.
   */
  it('puts no market in the key, and the market on the queue row', async () => {
    const { ctrl, storePrivate, send } = build();
    await ctrl.uploadKycDocument(req(qaSeller), file);
    expect((storePrivate.mock.calls[0] as unknown as string[])[0]).toBe('kyc');
    const payload = (send.mock.calls[0] as unknown as any[])[1];
    expect(payload.market).toBe('QA');
    expect(payload.owner).toBe('u-1');
  });

  it('feeds the approval queue admin-service reads', async () => {
    const { ctrl, send } = build();
    await ctrl.uploadKycDocument(req(seller), file);
    expect(send).toHaveBeenCalledTimes(1);
    const [pattern, payload] = send.mock.calls[0] as unknown as [any, any];
    expect(pattern).toEqual({ cmd: 'admin_kyc_document_submitted' });
    expect(payload).toMatchObject({
      key: 'kyc/u-2/8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf',
      owner: 'u-2',
      entityType: 'seller',
      mime: 'application/pdf',
      size: 16,
    });
    expect(typeof payload.uploadedAt).toBe('string');
  });

  it('queues a driver as a driver', async () => {
    const { ctrl, send } = build();
    await ctrl.uploadKycDocument(req(driver), file);
    expect((send.mock.calls[0] as unknown as any[])[1].entityType).toBe('driver');
  });

  it('answers 502 naming the storage failure, and queues nothing', async () => {
    const { ctrl, send } = build({
      store: async () => {
        throw new Error('EACCES: permission denied');
      },
    });
    await expect(ctrl.uploadKycDocument(req(seller), file)).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('EACCES'),
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('answers 503 and removes the object when the queue row cannot be written', async () => {
    const { ctrl, deletePrivate } = build({
      queue: () => throwError(() => new Error('Admin service unavailable')),
    });
    await expect(ctrl.uploadKycDocument(req(seller), file)).rejects.toMatchObject({ status: 503 });
    expect(deletePrivate).toHaveBeenCalledWith('kyc/u-2/8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf');
  });

  it('no longer claims an object that does not exist, or a public one', () => {
    expect(SOURCE).not.toContain('KYC Document securely uploaded to object storage.');
    expect(SOURCE).not.toContain('NOT STORED');
    // `generateDocumentId` minted the reference that resolved to nothing.
    expect(SOURCE).not.toMatch(/^import .*generateDocumentId/m);
    expect(SOURCE).not.toContain('is stored against the seller/driver record');
    // The public seam is not on the KYC path, and the unreachable market
    // segment is gone with it.
    const handler = SOURCE.slice(
      SOURCE.indexOf('async uploadKycDocument('),
      SOURCE.indexOf("@Post('profile-image')"),
    );
    expect(handler).toContain('storePrivate');
    expect(handler).not.toContain('this.storage.upload(');
    expect(handler).not.toContain('`kyc/${market}`');
  });
});
