import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { clientIp } from './audit.interceptor';

/**
 * AUD2-125 — the address in the audit trail is not the caller's to choose.
 *
 * The interceptor and `geo-security.controller.ts` both preferred
 * `X-Forwarded-For`, then `X-Real-IP`, over anything Express had resolved. So
 * `actorIp` on every row of the immutable audit collection, and every
 * geo-fencing decision, was whatever the client typed. `main.ts` sets
 * `trust proxy` to a hop count, which is exactly what makes `req.ip` the last
 * address no caller controls.
 */
describe('clientIp', () => {
  it('uses the value Express resolved under trust proxy', () => {
    expect(clientIp({ ip: '203.0.113.9', headers: { 'x-forwarded-for': '1.2.3.4' } } as any)).toBe(
      '203.0.113.9',
    );
  });

  it('ignores a spoofed header entirely', () => {
    expect(clientIp({ ip: '10.0.0.5', headers: { 'x-real-ip': '8.8.8.8' } } as any)).toBe(
      '10.0.0.5',
    );
  });

  it('falls back to the socket, never to a header', () => {
    expect(
      clientIp({
        headers: { 'x-forwarded-for': '1.2.3.4' },
        socket: { remoteAddress: '10.0.0.7' },
      } as any),
    ).toBe('10.0.0.7');
  });

  it('says so rather than inventing an address when there is nothing to read', () => {
    expect(clientIp({} as any)).toBe('unknown');
  });
});

/**
 * The grep from the brief's Step 1, as a spec, because a helper nothing uses
 * fixes nothing: the defect was six separate hand-rolled extractors, and the
 * only durable form of "one helper" is a check that the seventh cannot appear.
 *
 * Three files are allowed a header read, and each is allowed it for a reason
 * stated here rather than in a `.gitignore`-style list nobody revisits:
 *
 *   • `ddos-protection.middleware.ts` — its own extractor trusts the header
 *     only when the direct peer is in `DDOS_TRUSTED_PROXIES`, which is a
 *     second, independent way of reaching the same verdict.
 *   • `ws-ddos.guard.ts` — a socket.io handshake never passes through Express's
 *     `trust proxy`, so this is the one place that still has to decide for
 *     itself. It now decides the same way, against the same variable.
 *   • `geo-security.controller.ts` — `analyzeThreat` counts forwarding hops
 *     and looks for `via` / `proxy-connection` as EVIDENCE THAT THE REQUEST IS
 *     PROXIED. That is a property of the header, not an identity taken from it,
 *     and the spec below pins that the file no longer reads one as an address.
 */
const ALLOWED = new Set([
  'libs/security/src/ddos-protection.middleware.ts',
  'libs/security/src/ws-ddos.guard.ts',
]);

const IP_HEADER = /['"](?:x-forwarded-for|x-real-ip|cf-connecting-ip)['"]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('nothing else hand-rolls a client-IP extractor', () => {
  const apiRoot = path.join(__dirname, '..', '..', '..', '..');

  it('reads no client-IP header outside the two files that may', () => {
    const offenders = walk(path.join(apiRoot, 'apps'))
      .concat(walk(path.join(apiRoot, 'libs')))
      .map((f) => ({
        rel: path.relative(apiRoot, f).replace(/\\/g, '/'),
        src: fs.readFileSync(f, 'utf8'),
      }))
      .filter(({ rel }) => !ALLOWED.has(rel))
      // The threat analyser's hop count is the documented exception; it is
      // pinned separately below so removing the comment cannot quietly widen
      // this allowance to the address reads that used to sit in the same file.
      .filter(({ rel }) => rel !== 'apps/api-gateway/src/controllers/geo-security.controller.ts')
      .filter(({ src }) => IP_HEADER.test(src))
      .map(({ rel }) => rel);

    expect(offenders).toEqual([]);
  });

  it('leaves geo-security reading the header as evidence, never as an address', () => {
    const src = fs.readFileSync(
      path.join(apiRoot, 'apps/api-gateway/src/controllers/geo-security.controller.ts'),
      'utf8',
    );
    // The hop count survives…
    expect(src).toContain("(req.headers['x-forwarded-for'] || '').split(',').length > 2");
    // …and the extractor that turned the same header into an identity is gone.
    expect(src).not.toContain('private extractIp');
    expect(src).toContain('clientIp(req)');
  });
});
