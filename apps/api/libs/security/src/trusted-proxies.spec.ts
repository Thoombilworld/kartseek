import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isTrustedProxy,
  parseTrustedProxies,
  DEFAULT_TRUSTED_PROXIES,
} from './trusted-proxies.util';
import { WsDdosGuard } from './ws-ddos.guard';
import { DdosProtectionMiddleware } from './ddos-protection.middleware';

/**
 * Behind the containerised nginx, every WebSocket client shared one ban and one
 * connection cap.
 *
 * `nginx.compose.conf` repeats the seven forwarding headers on `/socket.io/`,
 * and three comments said that was the fix. It was half of it. The guard
 * believed `x-forwarded-for` only from a peer in `DDOS_TRUSTED_PROXIES`, and
 * matched that list as EXACT STRINGS against a default of `127.0.0.1,::1` —
 * while the nginx container's address on `kartseek-network` is a `172.x.y.z`.
 * So the header arrived, was discarded, and `ws:banned:`, `ws:strikes:` and
 * `ws:connections:` all keyed on the edge: one `MAX_CONNECTIONS_PER_IP` for the
 * whole platform, and one flooder banning every socket (whole-branch review
 * N1). `ddos-protection.middleware.ts`'s own header had documented the variable
 * as "trusted proxy CIDRs" the entire time.
 *
 * Membership is by CIDR now, in one parser both halves share, and the compose
 * renderer emits the pinned subnet so the value is actually present.
 */
afterEach(() => vi.unstubAllEnvs());

const socket = (address: string, forwarded?: string) =>
  ({ handshake: { address, headers: forwarded ? { 'x-forwarded-for': forwarded } : {} } }) as any;

/** The guard's private resolver — every Redis key in that file is built from it. */
const wsIp = (client: unknown) => (new WsDdosGuard({} as any) as any).getSocketIp(client);

/** The middleware's private resolver, which reaches the same verdict for HTTP. */
const httpIp = (req: unknown) =>
  (new DdosProtectionMiddleware({} as any) as any).extractClientIp(req);

const req = (ip: string, forwarded?: string) =>
  ({ ip, socket: {}, headers: forwarded ? { 'x-forwarded-for': forwarded } : {} }) as any;

describe('CIDR membership', () => {
  it('matches an address inside an IPv4 range', () => {
    expect(isTrustedProxy('172.28.0.7', '172.28.0.0/16')).toBe(true);
    expect(isTrustedProxy('172.28.255.254', '172.28.0.0/16')).toBe(true);
  });

  it('refuses an address outside it, including the neighbouring /16', () => {
    expect(isTrustedProxy('172.29.0.7', '172.28.0.0/16')).toBe(false);
    expect(isTrustedProxy('172.27.255.255', '172.28.0.0/16')).toBe(false);
    expect(isTrustedProxy('8.8.8.8', '172.28.0.0/16')).toBe(false);
  });

  it('respects the prefix length rather than the octet boundary', () => {
    // /23 spans 10.1.0.0–10.1.1.255 and stops there. An implementation that
    // compares octets or string prefixes gets this wrong in both directions.
    expect(isTrustedProxy('10.1.1.9', '10.1.0.0/23')).toBe(true);
    expect(isTrustedProxy('10.1.2.0', '10.1.0.0/23')).toBe(false);
    expect(isTrustedProxy('10.1.0.0', '10.1.0.0/32')).toBe(true);
    expect(isTrustedProxy('10.1.0.1', '10.1.0.0/32')).toBe(false);
  });

  it('still accepts an exact address, which is what the default is', () => {
    expect(isTrustedProxy('127.0.0.1', '127.0.0.1,::1')).toBe(true);
    expect(isTrustedProxy('127.0.0.2', '127.0.0.1,::1')).toBe(false);
    expect(isTrustedProxy('::1', '127.0.0.1,::1')).toBe(true);
    expect(DEFAULT_TRUSTED_PROXIES).toBe('127.0.0.1,::1');
  });

  it('does the same for IPv6, compressed forms and all', () => {
    expect(isTrustedProxy('2001:db8::1', '2001:db8::/32')).toBe(true);
    expect(isTrustedProxy('2001:db9::1', '2001:db8::/32')).toBe(false);
    expect(isTrustedProxy('fd12:3456:789a:1::1', 'fd00::/8')).toBe(true);
    expect(isTrustedProxy('fc00::1', 'fd00::/8')).toBe(false);
    // Fully written out and compressed are the same address.
    expect(isTrustedProxy('0:0:0:0:0:0:0:1', '::1')).toBe(true);
  });

  it('treats the IPv4-mapped form as the IPv4 address it is', () => {
    // Node hands this back on a dual-stack listener, and socket.io's
    // handshake.address carries it on Windows — the platform's own machines.
    expect(isTrustedProxy('::ffff:127.0.0.1', '127.0.0.1')).toBe(true);
    expect(isTrustedProxy('::ffff:172.28.0.4', '172.28.0.0/16')).toBe(true);
    expect(isTrustedProxy('::FFFF:172.28.0.4', '172.28.0.0/16')).toBe(true);
  });

  it('never lets a family cross over', () => {
    // `::1` is not inside `0.0.0.0/0`, and 127.0.0.1 is not inside `::/0`.
    expect(isTrustedProxy('::1', '0.0.0.0/0')).toBe(false);
    expect(isTrustedProxy('127.0.0.1', '::/0')).toBe(false);
    // …but a genuine catch-all in the right family does match, so the case
    // above is about families and not about /0 being ignored.
    expect(isTrustedProxy('8.8.8.8', '0.0.0.0/0')).toBe(true);
  });

  it('fails closed on anything it cannot parse', () => {
    for (const junk of ['unknown', '', 'nginx', '999.1.1.1', '10.0.0.1/33', undefined, null])
      expect(isTrustedProxy(junk as any, '10.0.0.0/8,127.0.0.1'), String(junk)).toBe(false);
    // A junk ENTRY is dropped; the rest of the list still works.
    expect(isTrustedProxy('127.0.0.1', 'nginx,not-an-ip,127.0.0.1')).toBe(true);
    expect(parseTrustedProxies('nginx,not-an-ip')).toEqual([]);
  });

  it('reads the environment per call, not once at import', () => {
    // A module-level `const` fixes the answer before a test can stub the
    // environment, and before a process that loads its `.env` late has one.
    vi.stubEnv('DDOS_TRUSTED_PROXIES', '10.9.0.0/16');
    expect(isTrustedProxy('10.9.4.4')).toBe(true);
    vi.stubEnv('DDOS_TRUSTED_PROXIES', '10.8.0.0/16');
    expect(isTrustedProxy('10.9.4.4')).toBe(false);
  });

  it('falls back to loopback when the variable is unset or blank', () => {
    vi.stubEnv('DDOS_TRUSTED_PROXIES', '');
    expect(isTrustedProxy('127.0.0.1')).toBe(true);
    expect(isTrustedProxy('172.28.0.4')).toBe(false);
  });
});

describe('both halves of the shield reach the same verdict', () => {
  it('a socket behind the compose edge is identified by the forwarded header', () => {
    vi.stubEnv('DDOS_TRUSTED_PROXIES', '172.28.0.0/16,127.0.0.1,::1');
    // This is the case that was broken: the edge is a container, not loopback.
    expect(wsIp(socket('172.28.0.4', '203.0.113.9, 10.1.1.1'))).toBe('203.0.113.9');
    expect(httpIp(req('172.28.0.4', '203.0.113.9, 10.1.1.1'))).toBe('203.0.113.9');
  });

  it('a spoofed header from outside the network is ignored by both', () => {
    vi.stubEnv('DDOS_TRUSTED_PROXIES', '172.28.0.0/16');
    expect(wsIp(socket('198.51.100.4', '8.8.8.8'))).toBe('198.51.100.4');
    expect(httpIp(req('198.51.100.4', '8.8.8.8'))).toBe('198.51.100.4');
  });

  it('every client through the edge gets its own bucket, not one shared one', () => {
    // The defect stated as the property it broke: two different clients behind
    // the same nginx container must not resolve to the same key.
    vi.stubEnv('DDOS_TRUSTED_PROXIES', '172.28.0.0/16');
    const a = wsIp(socket('172.28.0.4', '203.0.113.9'));
    const b = wsIp(socket('172.28.0.4', '203.0.113.10'));
    expect(a).not.toBe(b);
    expect([a, b]).not.toContain('172.28.0.4');
  });

  it('a trusted hop forwarding junk falls back to the hop, not to the junk', () => {
    vi.stubEnv('DDOS_TRUSTED_PROXIES', '172.28.0.0/16');
    expect(wsIp(socket('172.28.0.4', 'evil.example.com'))).toBe('172.28.0.4');
    expect(httpIp(req('172.28.0.4', 'evil.example.com'))).toBe('172.28.0.4');
  });
});
