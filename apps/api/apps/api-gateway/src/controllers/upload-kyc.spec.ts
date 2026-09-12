import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { UploadController } from './upload.controller';

/**
 * `POST /upload/kyc-document` stores the document it says it stored.
 *
 * What it used to do (whole-branch review, MUST FIX 9): validate the file, mint
 * an opaque reference with `generateDocumentId('KYC')`, compute a `fileKey` it
 * then never used, **discard `file.buffer`**, and answer
 * `"KYC Document securely uploaded to object storage."` with
 * `status: 'PENDING_ADMIN_APPROVAL'`. No row recorded the document and no
 * object existed, so the reference resolved to nothing — on a compliance path,
 * to the applicant whose identity document it was.
 *
 * `StorageService.upload` is the platform's one storage seam and the same call
 * the other four uploads on this controller make, so the file is stored rather
 * than the response being downgraded to a 501. The reply carries the STORED KEY
 * — not a public CDN URL, and not the original filename — so the console and
 * the applicant have something that resolves.
 */
const SOURCE = fs.readFileSync(path.join(__dirname, 'upload.controller.ts'), 'utf8');

function build() {
  const upload = vi.fn(async () => 'https://cdn.kartseek.com/kyc/QA/u-1/abc.pdf');
  const ctrl = Object.create(UploadController.prototype) as any;
  Object.assign(ctrl, { storage: { upload } });
  return { ctrl, upload };
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

describe('a KYC upload is stored, and reports what was stored', () => {
  it('sends the bytes to StorageService', async () => {
    const { ctrl, upload } = build();
    await ctrl.uploadKycDocument(req(seller), file);
    expect(upload).toHaveBeenCalledTimes(1);
    const [folder, key, body, mime] = upload.mock.calls[0] as unknown as [
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
    expect(res.filename).toMatch(/^kyc\/u-2\/[0-9a-f-]{36}\.pdf$/);
  });

  it('never returns the original filename, and never a public url', async () => {
    const { ctrl } = build();
    const res = await ctrl.uploadKycDocument(req(seller), file);
    expect(res.filename).not.toContain('national_id');
    expect(JSON.stringify(res)).not.toContain('https://');
  });

  it('stamps the uploader market on the storage path when they have one', async () => {
    const { ctrl, upload } = build();
    await ctrl.uploadKycDocument(req(qaSeller), file);
    expect((upload.mock.calls[0] as unknown as string[])[0]).toBe('kyc/QA');
  });

  it('fails the request when the store fails, rather than reporting success', async () => {
    const ctrl = Object.create(UploadController.prototype) as any;
    Object.assign(ctrl, {
      storage: {
        upload: vi.fn(async () => {
          throw new Error('S3 down');
        }),
      },
    });
    await expect(ctrl.uploadKycDocument(req(seller), file)).rejects.toThrow('S3 down');
  });

  it('no longer claims an object that does not exist', () => {
    expect(SOURCE).not.toContain('KYC Document securely uploaded to object storage.');
    expect(SOURCE).not.toContain('NOT STORED');
    // `generateDocumentId` minted the reference that resolved to nothing. The
    // stored key is the reference now, so nothing on this controller imports
    // it — if that import comes back, so has the fabrication.
    expect(SOURCE).not.toMatch(/^import .*generateDocumentId/m);
    // And the Swagger description no longer promises a record write this
    // handler does not make.
    expect(SOURCE).not.toContain('is stored against the seller/driver record');
  });
});
