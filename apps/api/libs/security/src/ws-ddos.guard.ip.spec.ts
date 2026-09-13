import { describe, it, expect } from 'vitest';
import { WsDdosGuard } from './ws-ddos.guard';

/**
 * A WebSocket ban has to be keyed on an address the banned client cannot
 * change, or it is not a ban.
 *
 * `getSocketIp` took the leftmost `X-Forwarded-For` entry from the handshake
 * unconditionally, and every key in this guard is built from its return value:
 * `ws:banned:<ip>`, `ws:strikes:<ip>`, `ws:connections:<ip>` and the per-IP
 * connection-rate window. So a flooder evaded their own ban by sending a
 * different header on the next connection, and could equally have written
 * somebody else's address into it and had them banned instead.
 *
 * Express's `trust proxy` does not help here — socket.io reads the raw upgrade
 * request — so the guard applies the rule `DdosProtectionMiddleware` already
 * applies to HTTP: the header counts only from a peer in
 * `DDOS_TRUSTED_PROXIES`, which defaults to loopback.
 */
const socket = (address: string, forwarded?: string) =>
  ({ handshake: { address, headers: forwarded ? { 'x-forwarded-for': forwarded } : {} } }) as any;

const ipOf = (client: unknown) => (new WsDdosGuard({} as any) as any).getSocketIp(client);

describe('WsDdosGuard.getSocketIp', () => {
  it('ignores a forwarded header from an untrusted peer', () => {
    expect(ipOf(socket('198.51.100.4', '203.0.113.9'))).toBe('198.51.100.4');
  });

  it('cannot be made to ban a third party', () => {
    // The flooder is 198.51.100.4 and names the victim in the header.
    expect(ipOf(socket('198.51.100.4', '8.8.8.8'))).not.toBe('8.8.8.8');
  });

  it('believes the header when the peer is the proxy we run', () => {
    expect(ipOf(socket('127.0.0.1', '203.0.113.9, 10.1.1.1'))).toBe('203.0.113.9');
  });

  it('falls back to the peer when a trusted proxy sends no header', () => {
    expect(ipOf(socket('127.0.0.1'))).toBe('127.0.0.1');
  });

  it('says unknown rather than inventing an address', () => {
    expect(ipOf({ handshake: { headers: {} } })).toBe('unknown');
  });
});
