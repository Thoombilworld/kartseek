import { describe, it, expect } from 'vitest';
import { envValidationSchema } from './env.validation';

/**
 * RF-4, at the boot gate.
 *
 * `StorageService`'s constructor refuses a private bucket that is the public
 * bucket, which covers every process that constructs one. This is the other
 * half: the gateway validates its environment before anything is constructed,
 * so the operator is told at startup — in the log they are already reading —
 * rather than at the first KYC upload.
 */
const base = {
  NODE_ENV: 'development',
  JWT_SECRET: 'a'.repeat(48),
  ENCRYPTION_KEY: 'b'.repeat(64),
};

const validate = (env: Record<string, string>) =>
  envValidationSchema.validate({ ...base, ...env }, { allowUnknown: true, abortEarly: false });

describe('STORAGE_PRIVATE_BUCKET', () => {
  it('is refused when it is the public S3 bucket', () => {
    const { error } = validate({
      STORAGE_PROVIDER: 's3',
      S3_BUCKET: 'kartseek-uploads',
      STORAGE_PRIVATE_BUCKET: 'kartseek-uploads',
    });
    expect(error?.message).toMatch(/must not be the public bucket/);
  });

  it('is refused when it is the public GCS bucket', () => {
    const { error } = validate({
      STORAGE_PROVIDER: 'gcs',
      GCS_BUCKET: 'kartseek-uploads',
      STORAGE_PRIVATE_BUCKET: 'kartseek-uploads',
    });
    expect(error?.message).toMatch(/must not be the public bucket/);
  });

  it('is accepted when it is a separate bucket', () => {
    const { error } = validate({
      STORAGE_PROVIDER: 's3',
      S3_BUCKET: 'kartseek-uploads',
      STORAGE_PRIVATE_BUCKET: 'kartseek-private',
    });
    expect(error).toBeUndefined();
  });

  it('is still required for a cloud provider', () => {
    const { error } = validate({ STORAGE_PROVIDER: 's3', S3_BUCKET: 'kartseek-uploads' });
    expect(error?.message).toMatch(/STORAGE_PRIVATE_BUCKET/);
  });

  it('stays optional for the local provider', () => {
    const { error } = validate({ STORAGE_PROVIDER: 'local' });
    expect(error).toBeUndefined();
  });
});

/**
 * AUD2-071's boot half: the floor the schema enforces and the floor
 * `resolveJwtSecret()` enforces have to be the same number, or a secret that
 * passes validation is rejected at the point of use and the failure reads as
 * "auth is broken" rather than "the secret is too short".
 */
describe('JWT_SECRET', () => {
  it('refuses a secret shorter than the 32 characters the resolver requires', () => {
    const { error } = envValidationSchema.validate(
      { ...base, JWT_SECRET: 'a'.repeat(31) },
      { allowUnknown: true, abortEarly: false },
    );
    expect(error?.message).toMatch(/JWT_SECRET/);
  });

  it('accepts one of exactly 32', () => {
    const { error } = envValidationSchema.validate(
      { ...base, JWT_SECRET: 'a'.repeat(32) },
      { allowUnknown: true, abortEarly: false },
    );
    expect(error).toBeUndefined();
  });
});
