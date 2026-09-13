/**
 * The client IP, from Express rather than from the caller.
 *
 * The audit interceptor, the geo-security controller, the admin audit route,
 * the grocery moderation actor and both region detectors each read
 * `X-Forwarded-For` / `X-Real-IP` / `CF-Connecting-IP` unconditionally, so
 * anyone could write any address into the immutable audit trail and past every
 * geo-fence with one header (AUD2-125). `main.ts:55-58` sets `trust proxy` to a
 * hop count, which is precisely the configuration that makes `req.ip` the last
 * untrusted hop — so `req.ip` is the answer, and a header is never consulted.
 *
 * A header is still read in exactly two places, and neither treats it as an
 * identity:
 *
 *   • `ddos-protection.middleware.ts:314` keeps its own extractor, which trusts
 *     `X-Forwarded-For` only when the direct peer is in `DDOS_TRUSTED_PROXIES`.
 *     That predates `trust proxy` and reaches the same verdict by a different
 *     route; it is the model this helper generalises.
 *   • `geo-security.controller.ts` counts forwarding hops as *evidence that the
 *     request is proxied*, which is a property of the header itself.
 */
export interface ClientIpRequest {
  ip?: string;
  socket?: { remoteAddress?: string };
}

/**
 * `req.ip` first, the raw socket second, `'unknown'` last.
 *
 * Never a header. Under `trust proxy` Express has already walked
 * `X-Forwarded-For` right-to-left across exactly the configured number of hops
 * and stopped at the first address the platform did not vouch for, which is the
 * only address in that list a caller cannot choose. `req.socket.remoteAddress`
 * is the fallback for a request that never passed through Express's own
 * parsing — a test double, or a raw `http.IncomingMessage`.
 */
export function clientIp(req: ClientIpRequest): string {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Is this address this machine talking to itself?
 *
 * The whole of `127.0.0.0/8`, `::1`, and the IPv4-mapped form Node hands back
 * on a dual-stack listener (`::ffff:127.0.0.1`). Not a hostname: `localhost` is
 * a name that resolves to one of these, and the callers here always hold an
 * address.
 *
 * Used by the DDoS layer to decide whether a ban would be self-inflicted. On a
 * developer's machine every local caller — the probe scripts, Next's SSR
 * fetches, a Playwright run, `/health`, the smoke — arrives from one of these
 * addresses, so a single ban key written against it takes the entire local
 * platform offline (observed twice on 2026-09-12, once for 21397 seconds). In
 * production nothing reaches the gateway from loopback except the pod itself.
 */
export function isLoopbackAddress(ip: string | undefined | null): boolean {
  if (!ip) return false;
  const addr = ip.trim().toLowerCase();
  if (addr === '::1' || addr === '0:0:0:0:0:0:0:1') return true;
  // A dual-stack listener reports an IPv4 peer as `::ffff:127.0.0.1`.
  const v4 = addr.startsWith('::ffff:') ? addr.slice('::ffff:'.length) : addr;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v4);
}

/**
 * Would banning this address be self-inflicted rather than protective?
 *
 * `NODE_ENV=development` **and** a loopback address. Both halves matter:
 *
 *   • In development one IP is every local caller. A ban keyed on `127.0.0.1`
 *     is not "the flooder is refused", it is "the machine is refused" — Next's
 *     SSR fetches, the smoke, the probe scripts and `/health` all answer 429
 *     for the ban's whole duration, out of a Redis the whole fleet shares. Two
 *     incidents on 2026-09-12 cost 15 minutes and 21397 seconds of exactly
 *     that, and both were recovered by hand-deleting keys the platform owns.
 *   • In production nothing arrives from loopback but the pod itself, so
 *     nothing changes there — and this must not become a way to opt out of
 *     being banned, which is why it is pinned to `NODE_ENV` and not to a
 *     `DDOS_*` switch a deployment could set.
 *
 * What is NOT suppressed: the per-window 429s, the strike counter, the
 * violation records. A local flood is still refused request by request; it just
 * cannot leave a fifteen-minute crater behind it. Read per call, because a
 * process that loads its `.env` late has no `NODE_ENV` at import time.
 */
export function banSuppressedForLoopback(ip: string | undefined | null): boolean {
  return process.env.NODE_ENV === 'development' && isLoopbackAddress(ip);
}
