import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { PATTERN_METADATA, TRANSPORT_METADATA } from '@nestjs/microservices/constants';
import { Transport } from '@nestjs/microservices';
import { AuditLogController } from './audit-log.controller';

/**
 * The audit service's HTTP surface.
 *
 * This service listens on three transports at once (HTTP 3028, TCP 4028, Kafka)
 * and the HTTP one is the only unauthenticated listener in the set: `main.ts`
 * calls `app.enableCors()` and the gateway's `JwtAuthGuard` is nowhere near it.
 * Four read/write routes lived here — `GET /audit-logs`,
 * `GET /audit-logs/user/:userId`, `GET /audit-logs/resource/:r/:id` and
 * `POST /audit-logs` — which handed every market's administrative history to
 * anyone who could reach the port, and accepted forged entries into it.
 *
 * They were deleted. This spec is what keeps them deleted: it reads the route
 * metadata Nest itself uses to build the router, so adding `@Get(':id')` to the
 * controller fails here, not in a review six weeks later. It also asserts the
 * two transports that *are* the service's interface still exist — deleting the
 * HTTP routes must not take the TCP reader or the Kafka consumer with them.
 */

/** Every own method on the prototype except the constructor. */
function handlers(): string[] {
  return Object.getOwnPropertyNames(AuditLogController.prototype).filter(
    (n) => n !== 'constructor',
  );
}

function httpRoutesOf(): Array<{ method: string; path: unknown; verb: unknown }> {
  return handlers()
    .map((name) => {
      const fn = (AuditLogController.prototype as Record<string, any>)[name];
      return {
        method: name,
        path: Reflect.getMetadata(PATH_METADATA, fn),
        verb: Reflect.getMetadata(METHOD_METADATA, fn),
      };
    })
    .filter((r) => r.path !== undefined);
}

/**
 * Nest stores the pattern as an array (a handler may carry several), so the
 * single pattern each of these declares is unwrapped for a readable assertion.
 */
function patternOf(name: string) {
  const fn = (AuditLogController.prototype as Record<string, any>)[name];
  const raw = Reflect.getMetadata(PATTERN_METADATA, fn);
  return {
    pattern: Array.isArray(raw) && raw.length === 1 ? raw[0] : raw,
    transport: Reflect.getMetadata(TRANSPORT_METADATA, fn),
  };
}

describe('AuditLogController — HTTP exposure', () => {
  it('exposes exactly one HTTP route, and it is health', () => {
    const routes = httpRoutesOf();
    expect(routes.map((r) => r.method)).toEqual(['health']);
    expect(routes[0].path).toBe('health');
  });

  it('has no HTTP handler that reads or writes the trail', () => {
    const httpMethods = httpRoutesOf().map((r) => r.method);
    for (const gone of ['log', 'getRecent', 'getByUser', 'getByResource']) {
      expect(httpMethods).not.toContain(gone);
      // and the method is not merely un-decorated — it is gone from the class
      expect(handlers()).not.toContain(gone);
    }
  });

  it('mounts under the audit-logs prefix, so the gateway health probe still resolves', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuditLogController)).toBe('audit-logs');
  });
});

describe('AuditLogController — the transports that remain', () => {
  it('still answers audit.query and audit.record over TCP', () => {
    expect(patternOf('query')).toEqual({
      pattern: { cmd: 'audit.query' },
      transport: Transport.TCP,
    });
    expect(patternOf('record')).toEqual({
      pattern: { cmd: 'audit.record' },
      transport: Transport.TCP,
    });
  });

  it('still consumes audit.log from Kafka', () => {
    expect(patternOf('handleAuditEvent')).toEqual({
      pattern: 'audit.log',
      transport: Transport.KAFKA,
    });
  });
});
