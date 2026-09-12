import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * An object this service was asked for and could not find.
 *
 * A separate class so a caller can answer 404 for a key that is not there and
 * 5xx for a store that is broken. Both used to be indistinguishable, because
 * both used to be a fabricated URL.
 */
export class StorageObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`No stored object at "${key}".`);
    this.name = 'StorageObjectNotFoundError';
  }
}

/** The configured provider cannot serve a private object with the env it was given. */
export class StorageMisconfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageMisconfiguredError';
  }
}

/** A private object, read back for an authorised caller to stream. */
export interface PrivateObject {
  key: string;
  body: Buffer;
  contentType?: string;
  size: number;
}

/**
 * Cloud Storage Service — Abstracts object storage (S3, GCS, R2, or local filesystem).
 *
 * Production: Streams files to AWS S3 / Google Cloud Storage / Cloudflare R2.
 * Development: `local` writes to the filesystem.
 *
 * To enable real cloud storage, set the following environment variables:
 *   STORAGE_PROVIDER=s3|gcs|r2|local
 *   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET
 *   CDN_DOMAIN=cdn.kartseek.com
 *
 * ── TWO SEAMS, NOT ONE ──────────────────────────────────────────────────────
 *
 * `upload` is the PUBLIC seam: product photos, brand logos, category
 * thumbnails. It returns a CDN URL, the GCS provider saves with `public: true`
 * and S3/R2 stamp a public immutable `CacheControl`, all of which is correct
 * for content meant to be fetched by anyone from a CDN.
 *
 * `storePrivate` / `readPrivate` is the PRIVATE seam, for identity documents.
 * It returns an opaque object KEY and never a URL, there is no CDN in front of
 * it, no public ACL on the object and no caching: the only way to read one back
 * is `readPrivate`, behind whatever authorisation the calling route enforces.
 * Government-issued IDs, business registrations and licence scans go here.
 * KYC documents were routed through `upload` for one commit (fix-wave item 9)
 * and the re-review found them on the public seam (RF-1); this is the split
 * that fix needed.
 *
 * Private-seam configuration, validated in the gateway's `env.validation.ts`:
 *   STORAGE_PRIVATE_BUCKET  — the private bucket for s3/gcs/r2. REQUIRED for
 *                             those providers: without it this service refuses
 *                             rather than writing an identity document into the
 *                             public bucket.
 *   STORAGE_PRIVATE_PREFIX  — key prefix inside that bucket (default `private/`).
 *   STORAGE_PRIVATE_DIR     — where the `local` provider writes the bytes. Must
 *                             be outside any served static path.
 *
 * ── NOTHING HERE FABRICATES A RESULT ────────────────────────────────────────
 *
 * Every provider used to `catch` a failed upload and return a plausible CDN URL
 * "so the API doesn't crash", and the default `local` provider wrote no bytes at
 * all and returned the same string. So every caller was told the file was stored
 * whatever happened, and on the KYC path that told an applicant their identity
 * document had been filed when nothing existed anywhere (re-review RF-1). A
 * failed write now throws, and answering the caller is the route's job.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: string;
  private readonly bucket: string;
  private readonly cdnDomain: string;

  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'local';
    this.bucket = process.env.S3_BUCKET || process.env.GCS_BUCKET || 'kartseek-uploads';
    this.cdnDomain = process.env.CDN_DOMAIN || 'cdn.kartseek.com';
  }

  /**
   * Upload a file to cloud storage.
   *
   * @param folder  - Storage folder (e.g., 'products', 'brands', 'categories')
   * @param key     - Unique file key (e.g., 'usr_abc/1719468000000_photo.jpg')
   * @param body    - File buffer
   * @param contentType - MIME type
   * @returns Public CDN URL for the uploaded file
   */
  async upload(folder: string, key: string, body: Buffer, contentType: string): Promise<string> {
    const fullKey = `${folder}/${key}`;

    switch (this.provider) {
      case 's3':
        return this.uploadToS3(fullKey, body, contentType);

      case 'gcs':
        return this.uploadToGCS(fullKey, body, contentType);

      case 'r2':
        return this.uploadToR2(fullKey, body, contentType);

      case 'local':
      default:
        // Development fallback for PUBLIC content only — the bytes are written
        // so the URL is not a lie about an object that does not exist, and the
        // warning says the CDN in the returned URL is not serving them.
        await this.writeLocal(fullKey, body);
        this.logger.warn(
          `[StorageService] local provider: wrote ${fullKey} under ${this.localPublicDir()}; ` +
            `the returned ${this.cdnDomain} URL is not serving it. ` +
            `Set STORAGE_PROVIDER=s3|gcs|r2 for production.`,
        );
        return `https://${this.cdnDomain}/${fullKey}`;
    }
  }

  /**
   * Store a PRIVATE object and return its opaque key — never a URL.
   *
   * The key is the logical `<folder>/<key>` pair the caller passed, so it stays
   * stable if the bucket or the prefix is later reconfigured; the bucket and
   * `STORAGE_PRIVATE_PREFIX` are applied inside this service, on both the write
   * and the read. There is no public ACL, no public `CacheControl` and no CDN
   * URL anywhere on this path: `readPrivate` is the only way back to the bytes.
   *
   * Throws on any failure. A caller that cannot store an identity document must
   * not report one as stored.
   */
  async storePrivate(
    folder: string,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const logicalKey = `${folder}/${key}`;
    const objectPath = this.privateObjectPath(logicalKey);

    switch (this.provider) {
      case 's3':
      case 'r2':
        await this.putPrivateToS3Compatible(objectPath, body, contentType);
        break;
      case 'gcs':
        await this.putPrivateToGCS(objectPath, body, contentType);
        break;
      case 'local':
      default:
        await this.writePrivateLocal(objectPath, body, contentType);
        break;
    }

    this.logger.log(
      `[StorageService] private object stored (${this.provider}): ${logicalKey} (${body.length} bytes)`,
    );
    return logicalKey;
  }

  /**
   * Read a private object back, for a route that has already authorised the
   * caller against the record that owns it.
   *
   * `StorageObjectNotFoundError` for a key that is not there — which is not the
   * same answer as a broken store, and must not be reported as one.
   */
  async readPrivate(logicalKey: string): Promise<PrivateObject> {
    const objectPath = this.privateObjectPath(logicalKey);

    switch (this.provider) {
      case 's3':
      case 'r2':
        return this.getPrivateFromS3Compatible(logicalKey, objectPath);
      case 'gcs':
        return this.getPrivateFromGCS(logicalKey, objectPath);
      case 'local':
      default:
        return this.readPrivateLocal(logicalKey, objectPath);
    }
  }

  /**
   * Delete a private object. Throws, like every other write on this seam — a
   * caller undoing a half-finished submission needs to know whether the
   * document is still there.
   */
  async deletePrivate(logicalKey: string): Promise<void> {
    const objectPath = this.privateObjectPath(logicalKey);

    switch (this.provider) {
      case 's3':
      case 'r2': {
        const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const client = this.privateS3Client(S3Client);
        await client.send(
          new DeleteObjectCommand({ Bucket: this.privateBucket(), Key: objectPath }),
        );
        return;
      }
      case 'gcs': {
        // @ts-expect-error -- @google-cloud/storage is an optional dependency, installed only where GCS is the configured provider
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage({
          projectId: process.env.GCLOUD_PROJECT,
          keyFilename: process.env.GCS_KEY_FILE,
        });
        await storage.bucket(this.privateBucket()).file(objectPath).delete();
        return;
      }
      case 'local':
      default: {
        const file = this.privateLocalPath(objectPath);
        try {
          await fs.unlink(file);
        } catch (error: any) {
          if (error?.code === 'ENOENT') throw new StorageObjectNotFoundError(logicalKey);
          throw error;
        }
        try {
          await fs.unlink(`${file}.type`);
        } catch {
          // The sidecar holding the MIME type is best-effort metadata; the
          // object itself is gone, which is what the caller asked for.
        }
        return;
      }
    }
  }

  // ── Private-seam configuration ──────────────────────────────────────────────

  /**
   * The bucket private objects live in.
   *
   * REQUIRED for s3/gcs/r2, with no fallback to `this.bucket`: the public
   * bucket is CDN-fronted, and defaulting to it would put an identity document
   * exactly where RF-1 found them. An unset variable is a misconfiguration the
   * route reports, not a quieter place to write.
   */
  private privateBucket(): string {
    const bucket = (process.env.STORAGE_PRIVATE_BUCKET || '').trim();
    if (!bucket) {
      throw new StorageMisconfiguredError(
        `STORAGE_PRIVATE_BUCKET is not set, so provider "${this.provider}" has no private ` +
          `bucket to store confidential documents in. Refusing to use the public bucket ` +
          `"${this.bucket}", which is CDN-fronted.`,
      );
    }
    return bucket;
  }

  /** Key prefix inside the private bucket. `private/` unless configured. */
  private privatePrefix(): string {
    const raw = process.env.STORAGE_PRIVATE_PREFIX;
    const prefix = (raw === undefined ? 'private/' : raw).trim();
    if (!prefix) return '';
    return prefix.replace(/^\/+/, '').replace(/\/*$/, '/');
  }

  /**
   * Where the `local` provider keeps private objects. Must be outside any
   * served static path — the API serves no static assets at all today, and a
   * default under `var/` keeps it that way if one is ever added under `public/`.
   */
  private privateLocalDir(): string {
    return (
      (process.env.STORAGE_PRIVATE_DIR || '').trim() ||
      path.join(process.cwd(), 'var', 'private-storage')
    );
  }

  /** Where the `local` provider keeps public-seam objects. */
  private localPublicDir(): string {
    return (
      (process.env.STORAGE_LOCAL_DIR || '').trim() || path.join(process.cwd(), 'var', 'uploads')
    );
  }

  /**
   * The object path inside the private bucket/directory, with the key checked.
   *
   * A key is data from a URL on the read path, so traversal is refused here as
   * well as at the route: `..` or an absolute path must never resolve outside
   * the private root.
   */
  private privateObjectPath(logicalKey: string): string {
    const key = String(logicalKey ?? '').replace(/^\/+/, '');
    if (!key || key.includes('..') || key.includes('\\') || /^[a-zA-Z]:/.test(key)) {
      throw new StorageMisconfiguredError(`"${logicalKey}" is not a usable object key.`);
    }
    return `${this.privatePrefix()}${key}`;
  }

  private privateLocalPath(objectPath: string): string {
    const root = path.resolve(this.privateLocalDir());
    const full = path.resolve(root, objectPath);
    if (full !== root && !full.startsWith(root + path.sep)) {
      throw new StorageMisconfiguredError(`"${objectPath}" resolves outside the private store.`);
    }
    return full;
  }

  private privateS3Client(S3Client: any) {
    return this.provider === 'r2'
      ? new S3Client({
          region: 'auto',
          endpoint: process.env.R2_ENDPOINT!,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
          },
        })
      : new S3Client({
          region: process.env.AWS_REGION || 'ap-south-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
        });
  }

  // ── Private seam: S3 and R2 ─────────────────────────────────────────────────

  /**
   * No ACL and no public cache header — the two things the public seam sets and
   * this one must not. `private, no-store` so a proxy that does sit in front of
   * the bucket cannot keep a copy.
   */
  private async putPrivateToS3Compatible(
    objectPath: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = this.privateS3Client(S3Client);
    await client.send(
      new PutObjectCommand({
        Bucket: this.privateBucket(),
        Key: objectPath,
        Body: body,
        ContentType: contentType,
        CacheControl: 'private, no-store',
      }),
    );
  }

  private async getPrivateFromS3Compatible(
    logicalKey: string,
    objectPath: string,
  ): Promise<PrivateObject> {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = this.privateS3Client(S3Client);
    let res: any;
    try {
      res = await client.send(
        new GetObjectCommand({ Bucket: this.privateBucket(), Key: objectPath }),
      );
    } catch (error: any) {
      if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
        throw new StorageObjectNotFoundError(logicalKey);
      }
      throw error;
    }
    const bytes = await res.Body.transformToByteArray();
    const buffer = Buffer.from(bytes);
    return {
      key: logicalKey,
      body: buffer,
      contentType: res.ContentType,
      size: buffer.length,
    };
  }

  // ── Private seam: GCS ───────────────────────────────────────────────────────

  /**
   * `predefinedAcl: 'private'` and no `public: true` — the public seam's
   * `file.save(…, { public: true })` is what put identity documents on an
   * anonymously readable object (RF-1).
   */
  private async putPrivateToGCS(
    objectPath: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    // @ts-expect-error -- @google-cloud/storage is an optional dependency, installed only where GCS is the configured provider
    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage({
      projectId: process.env.GCLOUD_PROJECT,
      keyFilename: process.env.GCS_KEY_FILE,
    });
    await storage
      .bucket(this.privateBucket())
      .file(objectPath)
      .save(body, {
        contentType,
        metadata: { cacheControl: 'private, no-store' },
        predefinedAcl: 'private',
        resumable: false,
      });
  }

  private async getPrivateFromGCS(logicalKey: string, objectPath: string): Promise<PrivateObject> {
    // @ts-expect-error -- @google-cloud/storage is an optional dependency, installed only where GCS is the configured provider
    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage({
      projectId: process.env.GCLOUD_PROJECT,
      keyFilename: process.env.GCS_KEY_FILE,
    });
    const file = storage.bucket(this.privateBucket()).file(objectPath);
    try {
      const [contents] = await file.download();
      const [metadata] = await file.getMetadata();
      const buffer = Buffer.from(contents);
      return {
        key: logicalKey,
        body: buffer,
        contentType: metadata?.contentType,
        size: buffer.length,
      };
    } catch (error: any) {
      if (error?.code === 404) throw new StorageObjectNotFoundError(logicalKey);
      throw error;
    }
  }

  // ── Private seam: local filesystem ──────────────────────────────────────────

  /**
   * The `local` provider WRITES THE BYTES. It used to write nothing and return a
   * simulated CDN URL, which is how a dev environment reported a stored KYC
   * document that existed nowhere (RF-1) — and dev is what `STORAGE_PROVIDER`
   * unset selects.
   *
   * The MIME type goes in a `.type` sidecar so a read can answer with the
   * content type it was given rather than guessing from the extension.
   */
  private async writePrivateLocal(
    objectPath: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    const file = this.privateLocalPath(objectPath);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body, { mode: 0o600 });
    await fs.writeFile(`${file}.type`, contentType, { mode: 0o600 });
  }

  private async readPrivateLocal(logicalKey: string, objectPath: string): Promise<PrivateObject> {
    const file = this.privateLocalPath(objectPath);
    let body: Buffer;
    try {
      body = await fs.readFile(file);
    } catch (error: any) {
      if (error?.code === 'ENOENT') throw new StorageObjectNotFoundError(logicalKey);
      throw error;
    }
    let contentType: string | undefined;
    try {
      contentType = (await fs.readFile(`${file}.type`, 'utf8')).trim() || undefined;
    } catch {
      contentType = undefined;
    }
    return { key: logicalKey, body, contentType, size: body.length };
  }

  /** Public-seam local write — same honesty, different directory. */
  private async writeLocal(fullKey: string, body: Buffer): Promise<void> {
    const root = path.resolve(this.localPublicDir());
    const file = path.resolve(root, fullKey.replace(/^\/+/, ''));
    if (!file.startsWith(root + path.sep)) {
      throw new StorageMisconfiguredError(`"${fullKey}" resolves outside the local store.`);
    }
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }

  /**
   * Delete a file from cloud storage.
   */
  async delete(folder: string, key: string): Promise<void> {
    const fullKey = `${folder}/${key}`;

    switch (this.provider) {
      case 's3':
        return this.deleteFromS3(fullKey);
      case 'gcs':
        return this.deleteFromGCS(fullKey);
      case 'r2':
        return this.deleteFromR2(fullKey);
      default:
        this.logger.warn(`[StorageService] Delete called on local provider — no-op.`);
    }
  }

  /**
   * Generate a public CDN URL for an existing file.
   */
  getPublicUrl(folder: string, key: string): string {
    return `https://${this.cdnDomain}/${folder}/${key}`;
  }

  // ── AWS S3 Implementation ───────────────────────────────────────────────

  private async uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
    // A failed PUT used to return `https://${cdnDomain}/${key}` "so the API
    // doesn't crash", which handed every caller a URL for an object that was
    // never written. It throws now; the route decides what the client is told.
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

      const client = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      await client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      this.logger.log(`[S3] Uploaded: ${key} (${body.length} bytes)`);
      return `https://${this.cdnDomain}/${key}`;
    } catch (error: any) {
      this.logger.error(`[S3] Upload failed: ${error.message}`);
      throw error;
    }
  }

  private async deleteFromS3(key: string): Promise<void> {
    try {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      this.logger.log(`[S3] Deleted: ${key}`);
    } catch (error: any) {
      // Propagated, like the uploads: a delete that failed must not read as done.
      this.logger.error(`[S3] Delete failed: ${error.message}`);
      throw error;
    }
  }

  // ── Google Cloud Storage Implementation ─────────────────────────────────

  private async uploadToGCS(key: string, body: Buffer, contentType: string): Promise<string> {
    try {
      // @ts-expect-error -- @google-cloud/storage is an optional dependency, installed only where GCS is the configured provider
      const { Storage } = await import('@google-cloud/storage');
      const storage = new Storage({
        projectId: process.env.GCLOUD_PROJECT,
        keyFilename: process.env.GCS_KEY_FILE,
      });

      const file = storage.bucket(this.bucket).file(key);
      await file.save(body, {
        contentType,
        metadata: { cacheControl: 'public, max-age=31536000, immutable' },
        public: true,
      });

      this.logger.log(`[GCS] Uploaded: ${key} (${body.length} bytes)`);
      return `https://${this.cdnDomain}/${key}`;
    } catch (error: any) {
      // Same as S3: no fabricated URL for a save that failed.
      this.logger.error(`[GCS] Upload failed: ${error.message}`);
      throw error;
    }
  }

  private async deleteFromGCS(key: string): Promise<void> {
    try {
      // @ts-expect-error -- @google-cloud/storage is an optional dependency, installed only where GCS is the configured provider
      const { Storage } = await import('@google-cloud/storage');
      const storage = new Storage({
        projectId: process.env.GCLOUD_PROJECT,
        keyFilename: process.env.GCS_KEY_FILE,
      });
      await storage.bucket(this.bucket).file(key).delete();
      this.logger.log(`[GCS] Deleted: ${key}`);
    } catch (error: any) {
      // Propagated, like the uploads: a delete that failed must not read as done.
      this.logger.error(`[GCS] Delete failed: ${error.message}`);
      throw error;
    }
  }

  // ── Cloudflare R2 Implementation ────────────────────────────────────────

  private async uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT!,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });

      await client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      this.logger.log(`[R2] Uploaded: ${key} (${body.length} bytes)`);
      return `https://${this.cdnDomain}/${key}`;
    } catch (error: any) {
      // Same as S3: no fabricated URL for a put that failed.
      this.logger.error(`[R2] Upload failed: ${error.message}`);
      throw error;
    }
  }

  private async deleteFromR2(key: string): Promise<void> {
    try {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT!,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });
      await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      this.logger.log(`[R2] Deleted: ${key}`);
    } catch (error: any) {
      // Propagated, like the uploads: a delete that failed must not read as done.
      this.logger.error(`[R2] Delete failed: ${error.message}`);
      throw error;
    }
  }
}
