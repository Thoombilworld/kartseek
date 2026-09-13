import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { resolveJwtSecret } from './jwt.strategy';

/**
 * AUD2-071 — a signing secret that is in the repository is not a secret.
 *
 * `jwt.strategy.ts` threw only when `NODE_ENV === 'production'` and otherwise
 * fell back to a literal anyone can read in tracked source. No compose file and
 * no dev script sets NODE_ENV here, so "not production" was every environment
 * that had not explicitly declared itself otherwise — local, CI and any staging
 * box included. On such a box a SUPER_ADMIN token could be minted by anyone who
 * had read the repository.
 *
 * The requirement is now unconditional, and the development value is an opt-in
 * somebody has to type.
 */
const REAL = 'a'.repeat(32);

describe('resolveJwtSecret', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a configured secret of full length', () => {
    vi.stubEnv('JWT_SECRET', REAL);
    expect(resolveJwtSecret()).toBe(REAL);
  });

  it('refuses when JWT_SECRET is unset, whatever NODE_ENV says', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('ALLOW_DEV_JWT_SECRET', '');
    for (const env of ['production', 'staging', 'development', '']) {
      vi.stubEnv('NODE_ENV', env);
      expect(() => resolveJwtSecret()).toThrow(/JWT_SECRET is not set/);
    }
  });

  it('refuses a secret shorter than 32 characters', () => {
    vi.stubEnv('ALLOW_DEV_JWT_SECRET', '');
    vi.stubEnv('JWT_SECRET', 'a'.repeat(31));
    expect(() => resolveJwtSecret()).toThrow(/shorter than 32/);
  });

  it('hands out the development value only on an explicit opt-in', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('ALLOW_DEV_JWT_SECRET', 'true');
    expect(resolveJwtSecret()).toBe('kartseek-development-secret-not-for-any-deployment');
  });

  it('treats any value other than the exact string "true" as not opted in', () => {
    vi.stubEnv('JWT_SECRET', '');
    for (const v of ['1', 'yes', 'TRUE', 'true ']) {
      vi.stubEnv('ALLOW_DEV_JWT_SECRET', v);
      expect(() => resolveJwtSecret()).toThrow();
    }
  });

  it('prefers a real secret over the opt-in', () => {
    vi.stubEnv('JWT_SECRET', REAL);
    vi.stubEnv('ALLOW_DEV_JWT_SECRET', 'true');
    expect(resolveJwtSecret()).toBe(REAL);
  });
});

/**
 * There were four fallback literals and they were four DIFFERENT strings, so a
 * deployment without JWT_SECRET verified HTTP against one and WebSocket
 * handshakes against another. That is the half of this finding a unit test of
 * the resolver alone cannot see, so it is checked where it lived: in the source.
 */
describe('one secret, one literal', () => {
  const apiRoot = path.join(__dirname, '..', '..', '..');

  const files = [
    'libs/security/src/jwt.strategy.ts',
    'libs/security/src/security.module.ts',
    'apps/auth-service/src/jwt.strategy.ts',
    'apps/api-gateway/src/gateways/ws-auth.util.ts',
    'apps/api-gateway/src/config/app.config.ts',
  ];

  /**
   * Comments are stripped first, deliberately. Each of these files now explains
   * which literal it used to fall back to and why that was a finding, and that
   * explanation is the reason the defect will not be reintroduced by someone
   * who never saw it — a check that forbade naming the old value would delete
   * the only record of it. What must not survive is a fallback in code.
   */
  const code = (rel: string) =>
    fs
      .readFileSync(path.join(apiRoot, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('leaves no hard-coded fallback secret in any signer or verifier', () => {
    const offenders = files.filter((rel) => /['"]kartseek[-_]dev[-_]secret/i.test(code(rel)));
    expect(offenders).toEqual([]);
  });

  it('routes every one of them through the shared resolver', () => {
    const missing = files.filter(
      (rel) => !fs.readFileSync(path.join(apiRoot, rel), 'utf8').includes('resolveJwtSecret'),
    );
    expect(missing).toEqual([]);
  });

  it('names the development value exactly once', () => {
    const hits = files.filter((rel) =>
      fs.readFileSync(path.join(apiRoot, rel), 'utf8').includes('not-for-any-deployment'),
    );
    expect(hits).toEqual(['libs/security/src/jwt.strategy.ts']);
  });
});
