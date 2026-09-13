import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { resolveAuditUri } from './audit-log-service.module';

/** Just the one method `resolveAuditUri` uses. */
const cfg = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('resolveAuditUri', () => {
  it('prefers an explicit MONGO_AUDIT_URI', () => {
    expect(
      resolveAuditUri(
        cfg({
          MONGO_AUDIT_URI: 'mongodb://audit:pw@mongodb:27017/somewhere_else',
          MONGO_URI: 'mongodb://admin:pw@mongodb:27017/kartseek_catalog',
        }),
      ),
    ).toBe('mongodb://audit:pw@mongodb:27017/somewhere_else');
  });

  it('reuses the platform URI with the audit database swapped in', () => {
    // The catalogue database is bulk-reseeded; the audit trail must not live in
    // it, and the credentials and host are the same either way.
    expect(
      resolveAuditUri(cfg({ MONGO_URI: 'mongodb://admin:pw@mongodb:27017/kartseek_catalog' })),
    ).toBe('mongodb://admin:pw@mongodb:27017/kartseek_audit');
  });

  it('falls back to localhost for a developer running the service alone', () => {
    expect(resolveAuditUri(cfg({}))).toBe('mongodb://localhost:27017/kartseek_audit');
  });

  // In a pod localhost is the pod: the connection is refused and the record of
  // who did what to the platform silently has nowhere to go. The manifests
  // deployed this service with no Mongo anywhere in them (AUD2-028).
  it('refuses to start in production with no Mongo configured', () => {
    expect(() => resolveAuditUri(cfg({ NODE_ENV: 'production' }))).toThrow(/MONGO_URI is not set/);
  });

  it('is unchanged in production once MONGO_URI is set', () => {
    expect(
      resolveAuditUri(
        cfg({
          NODE_ENV: 'production',
          MONGO_URI:
            'mongodb://admin:pw@mongodb.kartseek.svc.cluster.local:27017/kartseek_catalog?authSource=admin',
        }),
      ),
    ).toBe(
      'mongodb://admin:pw@mongodb.kartseek.svc.cluster.local:27017/kartseek_audit?authSource=admin',
    );
  });
});
