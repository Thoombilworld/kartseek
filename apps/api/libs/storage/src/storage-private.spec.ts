import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  StorageService,
  StorageObjectNotFoundError,
  StorageMisconfiguredError,
} from './storage.service';

/**
 * The private storage seam, and the swallowed write that made the public one
 * dangerous.
 *
 * Re-review RF-1: KYC identity documents were routed through
 * `StorageService.upload`, which is the platform's PUBLIC seam — the GCS
 * provider saves with `public: true`, S3 and R2 stamp a public immutable
 * `CacheControl` for the CDN in front of them — and *every* provider caught a
 * failed write and returned a plausible CDN URL anyway, while the default
 * `local` provider wrote no bytes at all and returned the same string. So the
 * applicant-facing false success the fix wave was raised to remove survived one
 * layer down, on a bucket anyone could read from.
 *
 * Two guarantees here, because the fix is two things:
 *   1. a write that fails throws — no provider returns a URL for an object it
 *      did not write;
 *   2. `storePrivate` returns an opaque KEY, never a URL, and `local` really
 *      writes the bytes, under a directory nothing serves.
 */
const SOURCE = fs.readFileSync(path.join(__dirname, 'storage.service.ts'), 'utf8');

let dir: string;
const ENV_KEYS = [
  'STORAGE_PROVIDER',
  'STORAGE_PRIVATE_DIR',
  'STORAGE_PRIVATE_BUCKET',
  'STORAGE_PRIVATE_PREFIX',
  'STORAGE_LOCAL_DIR',
  'CDN_DOMAIN',
];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kartseek-private-'));
  process.env.STORAGE_PROVIDER = 'local';
  process.env.STORAGE_PRIVATE_DIR = dir;
  process.env.STORAGE_LOCAL_DIR = path.join(dir, 'public');
  delete process.env.STORAGE_PRIVATE_BUCKET;
  delete process.env.STORAGE_PRIVATE_PREFIX;
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const body = Buffer.from('%PDF-1.7 pretend identity document');

describe('storePrivate returns a key and never a URL', () => {
  it('returns the logical object key', async () => {
    const key = await new StorageService().storePrivate(
      'kyc',
      'u-1/8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf',
      body,
      'application/pdf',
    );
    expect(key).toBe('kyc/u-1/8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf');
    expect(key).not.toContain('http');
    expect(key).not.toContain('cdn');
  });

  it('the local provider writes the bytes, under the private directory', async () => {
    const svc = new StorageService();
    const key = await svc.storePrivate('kyc', 'u-1/abc.pdf', body, 'application/pdf');

    // `private/` prefix by default, inside STORAGE_PRIVATE_DIR and nowhere else.
    const onDisk = path.join(dir, 'private', 'kyc', 'u-1', 'abc.pdf');
    expect(fs.existsSync(onDisk)).toBe(true);
    expect(fs.readFileSync(onDisk)).toEqual(body);

    const read = await svc.readPrivate(key);
    expect(read.body).toEqual(body);
    expect(read.contentType).toBe('application/pdf');
    expect(read.size).toBe(body.length);
  });

  it('honours STORAGE_PRIVATE_PREFIX', async () => {
    process.env.STORAGE_PRIVATE_PREFIX = 'compliance';
    const svc = new StorageService();
    await svc.storePrivate('kyc', 'u-1/abc.pdf', body, 'application/pdf');
    expect(fs.existsSync(path.join(dir, 'compliance', 'kyc', 'u-1', 'abc.pdf'))).toBe(true);
  });

  it('a missing object is not found, which is not the same as a broken store', async () => {
    const svc = new StorageService();
    await expect(svc.readPrivate('kyc/u-1/nothing-here.pdf')).rejects.toBeInstanceOf(
      StorageObjectNotFoundError,
    );
  });

  it('refuses a key that would traverse out of the private store', async () => {
    const svc = new StorageService();
    await expect(svc.readPrivate('kyc/../../etc/passwd')).rejects.toBeInstanceOf(
      StorageMisconfiguredError,
    );
  });

  it('deletePrivate removes the object', async () => {
    const svc = new StorageService();
    const key = await svc.storePrivate('kyc', 'u-1/abc.pdf', body, 'application/pdf');
    await svc.deletePrivate(key);
    expect(fs.existsSync(path.join(dir, 'private', 'kyc', 'u-1', 'abc.pdf'))).toBe(false);
    await expect(svc.readPrivate(key)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
  });

  it('refuses a cloud provider with no private bucket rather than using the public one', async () => {
    process.env.STORAGE_PROVIDER = 's3';
    process.env.S3_BUCKET = 'kartseek-uploads';
    const svc = new StorageService();
    await expect(svc.storePrivate('kyc', 'u-1/abc.pdf', body, 'application/pdf')).rejects.toThrow(
      /STORAGE_PRIVATE_BUCKET is not set/,
    );
    delete process.env.S3_BUCKET;
  });
});

/**
 * RF-4 — the private bucket may not be the public bucket.
 *
 * Requiring `STORAGE_PRIVATE_BUCKET` closed the fallback: the private seam can
 * no longer drift into `S3_BUCKET` by omission. It left the other way in open —
 * setting both variables to the same string — and that one is undetectable
 * after the fact. Every upload succeeds, every signed URL resolves, the KYC
 * route tells the applicant their identity document is filed, and the document
 * is sitting in the CDN-fronted bucket. There is no later check that could
 * notice, because by then there is one bucket and both seams agree about it.
 *
 * It is therefore refused at construction, which for an `@Injectable()` means
 * the process does not start.
 */
describe('the private bucket is never the public bucket', () => {
  const cloudEnv = (priv: string, pub = 'kartseek-uploads') => {
    process.env.STORAGE_PROVIDER = 's3';
    process.env.S3_BUCKET = pub;
    process.env.STORAGE_PRIVATE_BUCKET = priv;
  };

  afterEach(() => {
    delete process.env.S3_BUCKET;
    delete process.env.GCS_BUCKET;
  });

  it('refuses to start when the two are the same bucket', () => {
    cloudEnv('kartseek-uploads');
    expect(() => new StorageService()).toThrow(StorageMisconfiguredError);
    expect(() => new StorageService()).toThrow(/which is the public bucket/);
  });

  it('names both variables, so the fix is obvious from the boot log', () => {
    cloudEnv('kartseek-uploads');
    const err = (() => {
      try {
        new StorageService();
      } catch (e) {
        return e as Error;
      }
    })()!;
    expect(err.message).toContain('STORAGE_PRIVATE_BUCKET');
    expect(err.message).toContain('S3_BUCKET');
  });

  it('catches the same collision through GCS_BUCKET', () => {
    process.env.STORAGE_PROVIDER = 'gcs';
    process.env.GCS_BUCKET = 'kartseek-uploads';
    process.env.STORAGE_PRIVATE_BUCKET = 'kartseek-uploads';
    expect(() => new StorageService()).toThrow(StorageMisconfiguredError);
  });

  it('ignores surrounding whitespace, which would otherwise slip past', () => {
    cloudEnv('  kartseek-uploads  ');
    expect(() => new StorageService()).toThrow(StorageMisconfiguredError);
  });

  it('starts normally when they are two different buckets', () => {
    cloudEnv('kartseek-private');
    expect(() => new StorageService()).not.toThrow();
  });

  it('leaves the local provider alone, which reads neither variable', () => {
    // A developer with leftover bucket names in their `.env` is not a reason to
    // refuse to boot a process that keeps files on disk.
    process.env.STORAGE_PROVIDER = 'local';
    process.env.S3_BUCKET = 'kartseek-uploads';
    process.env.STORAGE_PRIVATE_BUCKET = 'kartseek-uploads';
    expect(() => new StorageService()).not.toThrow();
  });

  it('refuses the write too, not only the boot', async () => {
    // `process.env` is read at call time throughout the service, so a value
    // that changes after construction must not walk past the boot guard.
    cloudEnv('kartseek-private');
    const svc = new StorageService();
    process.env.STORAGE_PRIVATE_BUCKET = 'kartseek-uploads';
    await expect(svc.storePrivate('kyc', 'u-1/abc.pdf', body, 'application/pdf')).rejects.toThrow(
      /CDN-fronted public bucket/,
    );
  });
});

describe('a write failure propagates, and no provider fabricates a URL', () => {
  /**
   * A real filesystem failure rather than a mocked one: the private root is
   * pointed *inside a regular file*, so `mkdir` cannot create the tree. This is
   * the same break the live probe performs (`STORAGE_PRIVATE_DIR` at an
   * unusable path), and it is the case the old code answered with a URL.
   */
  it('the local provider throws when the directory cannot be written', async () => {
    const blocker = path.join(dir, 'not-a-directory');
    fs.writeFileSync(blocker, 'x');
    process.env.STORAGE_PRIVATE_DIR = path.join(blocker, 'nested');
    const svc = new StorageService();
    await expect(
      svc.storePrivate('kyc', 'u-1/abc.pdf', body, 'application/pdf'),
    ).rejects.toThrowError();
  });

  it('the public seam throws too, instead of returning a CDN URL for nothing', async () => {
    const blocker = path.join(dir, 'not-a-directory-either');
    fs.writeFileSync(blocker, 'x');
    process.env.STORAGE_LOCAL_DIR = path.join(blocker, 'nested');
    const svc = new StorageService();
    const result = await svc
      .upload('products', 'u-1/p.png', body, 'image/png')
      .catch((e: Error) => e);
    expect(result).toBeInstanceOf(Error);
    expect(String(result)).not.toContain('cdn.kartseek.com');
  });

  /**
   * Source-read, because the three cloud providers cannot be exercised without
   * their SDKs and credentials — and the fabricated URL was a `return` inside a
   * `catch`, which is exactly the shape a reader can check.
   */
  it('no provider returns a cdn url from a catch block', () => {
    const catches = SOURCE.split(/catch \(error: any\) \{/).slice(1);
    expect(catches.length).toBeGreaterThanOrEqual(6);
    for (const block of catches) {
      const upToClose = block.slice(0, block.indexOf('\n    }'));
      expect(upToClose).not.toMatch(/return `https:\/\/\$\{this\.cdnDomain\}/);
    }
    // The comment that justified it is gone with it.
    expect(SOURCE).not.toContain("Fallback to simulated URL so the API doesn't crash");
  });

  it('the private providers set no public acl and no public cache header', () => {
    const between = (from: string, to: string) => {
      const a = SOURCE.indexOf(from);
      const b = SOURCE.indexOf(to);
      expect(a).toBeGreaterThan(-1);
      expect(b).toBeGreaterThan(a);
      return SOURCE.slice(a, b);
    };
    const s3 = between(
      'private async putPrivateToS3Compatible(',
      'private async getPrivateFromS3Compatible(',
    );
    const gcs = between('private async putPrivateToGCS(', 'private async getPrivateFromGCS(');

    for (const body of [s3, gcs]) {
      expect(body).not.toContain('public: true');
      expect(body).not.toContain('public, max-age=31536000');
      expect(body).not.toContain('cdnDomain');
    }
    expect(s3).toContain("CacheControl: 'private, no-store'");
    expect(gcs).toContain("predefinedAcl: 'private'");
  });
});
