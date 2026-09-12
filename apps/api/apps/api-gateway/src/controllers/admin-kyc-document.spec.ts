import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { of } from 'rxjs';
import { AdminCoreController } from './admin-core.controller';
import { StorageObjectNotFoundError } from '@app/storage';

/**
 * `GET /admin/kyc/documents/:key` — the only read path to a KYC document.
 *
 * Re-review RF-1: the fix wave stored identity documents on the platform's
 * PUBLIC seam (GCS `public: true`, a CDN-domain URL contract, no signing),
 * partly because there was no authenticated read path at all — a document
 * nobody could read looked like a document that had not been stored. The
 * documents are private now, and this is how a reviewer sees one:
 *
 *   • an admin role plus `kyc.view`;
 *   • the caller's market resolved through `this.scopeOf` and compared against
 *     the market recorded on the document's own row, so a region-locked
 *     administrator holding a valid key still cannot read another market's
 *     identity documents;
 *   • `Content-Disposition: attachment` and `no-store`, so the bytes are not
 *     rendered inline and nothing keeps a copy.
 */
const SOURCE = fs.readFileSync(path.join(__dirname, 'admin-core.controller.ts'), 'utf8');

const KEY = 'kyc/u-2/8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf';
const ENCODED = Buffer.from(KEY, 'utf8').toString('base64url');
const BYTES = Buffer.from('%PDF-1.7 pretend identity document');

function build(record: any = { key: KEY, owner: 'u-2', market: 'QA', mime: 'application/pdf' }) {
  const send = vi.fn(() => of(record));
  const readPrivate = vi.fn(async () => ({
    key: KEY,
    body: BYTES,
    contentType: 'application/pdf',
    size: BYTES.length,
  }));
  const ctrl = Object.create(AdminCoreController.prototype) as any;
  Object.assign(ctrl, {
    adminClient: { send },
    storage: { readPrivate },
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { ctrl, send, readPrivate };
}

function res() {
  const headers: Record<string, string> = {};
  const sink: any = {
    headers,
    statusCode: 0,
    ended: undefined as Buffer | undefined,
    setHeader: (k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    },
    status(code: number) {
      sink.statusCode = code;
      return sink;
    },
    end(body: Buffer) {
      sink.ended = body;
      return sink;
    },
  };
  return sink;
}

const req = (user: object) => ({
  user,
  method: 'GET',
  originalUrl: `/admin/kyc/documents/${ENCODED}`,
  headers: {},
});
const globalAdmin = { userId: 'a-1', id: 'a-1', role: 'SUPER_ADMIN' };
const qaAdmin = { userId: 'a-2', id: 'a-2', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const inAdmin = { userId: 'a-3', id: 'a-3', role: 'ADMIN', regionCode: 'IN', regionLocked: true };

describe('an admin reads one KYC document, in their own market', () => {
  it('streams the bytes as an uncached attachment', async () => {
    const { ctrl, readPrivate } = build();
    const sink = res();
    await ctrl.kycDocument(req(globalAdmin), ENCODED, sink);

    expect(readPrivate).toHaveBeenCalledWith(KEY);
    expect(sink.statusCode).toBe(200);
    expect(sink.ended).toEqual(BYTES);
    expect(sink.headers['content-type']).toBe('application/pdf');
    expect(sink.headers['content-disposition']).toBe(
      'attachment; filename="8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf"',
    );
    expect(sink.headers['cache-control']).toContain('no-store');
    expect(sink.headers['pragma']).toBe('no-cache');
    expect(sink.headers['x-content-type-options']).toBe('nosniff');
  });

  it('forwards the lock as scope, so admin-service asserts it too', async () => {
    const { ctrl, send } = build();
    await ctrl.kycDocument(req(qaAdmin), ENCODED, res());
    const [pattern, payload] = send.mock.calls[0] as unknown as [any, any];
    expect(pattern).toEqual({ cmd: 'admin_kyc_document' });
    expect(payload).toEqual({ key: KEY, scope: 'QA' });
  });

  it('lets an own-market administrator read it', async () => {
    const { ctrl } = build({ key: KEY, owner: 'u-2', market: 'QA' });
    const sink = res();
    await ctrl.kycDocument(req(qaAdmin), ENCODED, sink);
    expect(sink.ended).toEqual(BYTES);
  });

  /** The platform's fixed denial copy, word for word. */
  it("refuses another market's document with the fixed denial wording", async () => {
    const { ctrl, readPrivate } = build({ key: KEY, owner: 'u-2', market: 'QA' });
    await expect(ctrl.kycDocument(req(inAdmin), ENCODED, res())).rejects.toThrow(
      'Your account is restricted to the IN market; that identity document belongs to QA.',
    );
    expect(readPrivate).not.toHaveBeenCalled();
  });

  it('refuses an unattributed document for a locked administrator', async () => {
    const { ctrl, readPrivate } = build({ key: KEY, owner: 'u-2', market: null });
    await expect(ctrl.kycDocument(req(qaAdmin), ENCODED, res())).rejects.toThrow(
      'Your account is restricted to the QA market; that identity document belongs to every market.',
    );
    expect(readPrivate).not.toHaveBeenCalled();
  });

  it('rejects a key that is not one of ours, before touching storage', async () => {
    const { ctrl, send, readPrivate } = build();
    const traversal = Buffer.from('kyc/../../etc/passwd', 'utf8').toString('base64url');
    await expect(ctrl.kycDocument(req(globalAdmin), traversal, res())).rejects.toMatchObject({
      status: 400,
    });
    expect(send).not.toHaveBeenCalled();
    expect(readPrivate).not.toHaveBeenCalled();
  });

  it('answers 404 for a key whose object is gone', async () => {
    const { ctrl } = build();
    ctrl.storage.readPrivate = vi.fn(async () => {
      throw new StorageObjectNotFoundError(KEY);
    });
    await expect(ctrl.kycDocument(req(globalAdmin), ENCODED, res())).rejects.toMatchObject({
      status: 404,
    });
  });

  it('answers 502 for a store that cannot be read at all', async () => {
    const { ctrl } = build();
    ctrl.storage.readPrivate = vi.fn(async () => {
      throw new Error('connection reset');
    });
    await expect(ctrl.kycDocument(req(globalAdmin), ENCODED, res())).rejects.toMatchObject({
      status: 502,
    });
  });

  it('is declared with the role, the permission and the scope call', () => {
    const at = SOURCE.indexOf("@Get('kyc/documents/:key')");
    expect(at).toBeGreaterThan(-1);
    const block = SOURCE.slice(at, SOURCE.indexOf('private decodeDocumentKey('));
    expect(block).toContain("@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:kyc.view')");
    expect(block).toContain('this.scopeOf(');
    expect(block).toContain("assertRecordInScope(req, record?.market, 'that identity document')");
    // Authentication is class-level on this controller, which is what
    // route-exposure.regression.spec.ts reads.
    expect(SOURCE).toContain('@UseGuards(JwtAuthGuard, RolesGuard)');
  });
});
