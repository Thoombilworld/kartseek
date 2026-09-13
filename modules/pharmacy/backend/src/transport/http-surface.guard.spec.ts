import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Logger, NotFoundException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpSurfaceGuard, AllowHttp, ALLOW_HTTP_KEY } from './http-surface.guard';

/**
 * The pod probe and the closed surface are one change, and neither is safe
 * alone.
 *
 * pharmacy-service used to call `app.listen(port, '127.0.0.1')` with no
 * override. The kubelet probes a pod on its pod IP, never on loopback, so
 * `scripts/registry/k8s.mjs` fell all three of its probes back to
 * `tcpSocket: 4010` — a check that cannot fail while Postgres is gone and every
 * route answers 503. That is the AUD2-002 defect the infrastructure plan set
 * out to remove, and pharmacy was the last service still carrying it.
 *
 * Binding wide fixes the probe and, on its own, publishes 41 unguarded HTTP
 * routes (the customer catalogue, orders, prescriptions, `admin/*`) to whatever
 * shares the pod network. So the surface is closed in the same breath: the two
 * health routes answer, everything else is a 404, and TCP — the transport the
 * gateway actually uses — is untouched.
 */
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

const guard = () => new HttpSurfaceGuard(new Reflector());

/** An HTTP context for one request, with no metadata on handler or class. */
const httpCtx = (method: string, url: string, handler: unknown = () => undefined) =>
  ({
    getType: () => 'http',
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ method, url, path: url.split('?')[0] }) }),
  }) as unknown as ExecutionContext;

const rpcCtx = () =>
  ({
    getType: () => 'rpc',
    getHandler: () => () => undefined,
    getClass: () => class {},
  }) as unknown as ExecutionContext;

describe('the HTTP surface answers health and nothing else', () => {
  it('lets the two registry health routes through', () => {
    // These are the paths `services.yaml` gives this service and the ones both
    // renderers build the probes from — a probe that 404s is a pod that never
    // becomes ready.
    expect(guard().canActivate(httpCtx('GET', '/health'))).toBe(true);
    expect(guard().canActivate(httpCtx('GET', '/health/ready'))).toBe(true);
  });

  it('tolerates the shapes a probe URL actually arrives in', () => {
    expect(guard().canActivate(httpCtx('GET', '/health/'))).toBe(true);
    expect(guard().canActivate(httpCtx('GET', '/health?verbose=1'))).toBe(true);
  });

  it('404s every route on PharmacyController', () => {
    for (const url of [
      '/pharmacy/stores',
      '/pharmacy/admin/orders',
      '/pharmacy/prescriptions/1',
      '/pharmacy/health',
    ]) {
      expect(() => guard().canActivate(httpCtx('GET', url)), url).toThrow(NotFoundException);
    }
  });

  it('404s rather than 403s — a 403 confirms the route is worth attacking', () => {
    try {
      guard().canActivate(httpCtx('POST', '/pharmacy/admin/stores'));
      throw new Error('expected a refusal');
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundException);
      expect((e as NotFoundException).getStatus()).toBe(404);
    }
  });

  it('is not fooled by a path that merely starts with the health prefix', () => {
    expect(() => guard().canActivate(httpCtx('GET', '/healthz'))).toThrow(NotFoundException);
    expect(() => guard().canActivate(httpCtx('GET', '/health/ready/../admin'))).toThrow(
      NotFoundException,
    );
  });

  it('leaves TCP alone — that is the transport the gateway uses', () => {
    expect(guard().canActivate(rpcCtx())).toBe(true);
  });

  it('honours an explicit @AllowHttp() as a deliberate decision', () => {
    class Deliberate {
      @AllowHttp()
      route() {}
    }
    const handler = Deliberate.prototype.route;
    expect(Reflect.getMetadata(ALLOW_HTTP_KEY, handler)).toBe(true);
    expect(guard().canActivate(httpCtx('GET', '/pharmacy/anything', handler))).toBe(true);
  });
});

describe('the HTTP listener binds where it is told', () => {
  const MAIN = fs.readFileSync(path.join(__dirname, '..', 'main.ts'), 'utf8');

  it('reads PHARMACY_HTTP_HOST and defaults to loopback', () => {
    // The literal `app.listen(httpPort, '127.0.0.1')` is what made the pod
    // TCP-probed. Asserted on the source because `main.ts` is a bootstrap with
    // no export to call — the live proof is in the fix-wave report (the service
    // booted from dist, answering on 0.0.0.0 with the variable set and refusing
    // the connection without it).
    expect(MAIN).toContain("process.env.PHARMACY_HTTP_HOST ?? '127.0.0.1'");
    // Code, not the comment above it that quotes the old call.
    const code = MAIN.split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
    expect([...code.matchAll(/app\.listen\(/g)]).toHaveLength(1);
    expect(code).toContain('await app.listen(httpPort, httpHost)');
  });

  it('installs the guard that makes a wide bind safe', () => {
    // The two halves ship together or not at all.
    expect(MAIN).toContain('new HttpSurfaceGuard(app.get(Reflector))');
  });
});
