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
