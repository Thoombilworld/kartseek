/**
 * Which direct peers may speak for somebody else.
 *
 * `X-Forwarded-For` is a claim the sender writes, so it is worth exactly as
 * much as the sender's own address. Both halves of the rate limiter consult
 * this list before believing one: `DdosProtectionMiddleware.extractClientIp`
 * for HTTP, `WsDdosGuard.getSocketIp` for a socket handshake — and `req.ip`
 * itself, which Express resolves under `trust proxy`, reaches the same verdict
 * by a different route.
 *
 * ── Why this file exists (whole-branch review N1) ───────────────────────────
 *
 * Both halves used an exact-string `Set`:
 *
 *     new Set((process.env.DDOS_TRUSTED_PROXIES || '127.0.0.1,::1').split(','))
 *
 * while `ddos-protection.middleware.ts`'s own header documented the variable as
 * "trusted proxy CIDRs". Behind the containerised nginx that gap is the whole
 * shield: nginx's address on the compose network is a DHCP-ish `172.x.y.z` that
 * is neither `127.0.0.1` nor `::1`, so every forwarded header was discarded and
 * `ws:banned:`, `ws:strikes:` and `ws:connections:` all keyed on **the nginx
 * container's IP**. One `MAX_CONNECTIONS_PER_IP` for the entire platform, and
 * one flooder banning every WebSocket client at once. Three comments — in
 * `nginx.compose.conf`, `conf.d/default.conf` and `compose.test.mjs` — asserted
 * that repeating the forwarding headers on `/socket.io/` fixed this. Repeating
 * them is necessary (nginx header inheritance is all-or-nothing) and it was
 * never sufficient: the header arrived and was thrown away.
 *
 * So membership is by CIDR, the private network the app tier runs on is pinned
 * (`infra/docker/compose.infra.yml`: `networks.default.ipam.config.subnet`) and
 * emitted as the default trust list for every service by
 * `scripts/registry/compose.mjs`. Trusting the private network is the intent:
 * nothing reaches a service on it except through the edge.
 *
 * An exact address still works and still means exactly itself — the default,
 * `127.0.0.1,::1`, is two of them.
 */

/** One entry: a normalised address plus the number of leading bits that must match. */
interface Cidr {
  /** 4 or 6 — an IPv4 entry never matches an IPv6 address, or the other way round. */
  family: 4 | 6;
  value: bigint;
  bits: number;
}

const V4_BITS = 32;
const V6_BITS = 128;

/**
 * `::ffff:127.0.0.1` is the IPv4 address `127.0.0.1`.
 *
 * Node hands back the mapped form on a dual-stack listener, and socket.io's
 * `handshake.address` carries it on Windows — so without this, loopback does
 * not match the loopback entry in the default list.
 */
function unmapV4(addr: string): string {
  const m = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(addr);
  return m ? m[1] : addr;
}

function parseV4(addr: string): bigint | null {
  const parts = addr.split('.');
  if (parts.length !== 4) return null;
  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = (value << 8n) | BigInt(n);
  }
  return value;
}

/**
 * An IPv6 literal as a 128-bit number, `::` expanded and a trailing IPv4
 * embedding (`::ffff:10.0.0.1`, `64:ff9b::192.0.2.1`) accepted.
 */
function parseV6(addr: string): bigint | null {
  let text = addr;
  // A trailing dotted quad is the low 32 bits.
  const dotted = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(text);
  if (dotted) {
    const v4 = parseV4(dotted[1]);
    if (v4 === null) return null;
    const high = Number((v4 >> 16n) & 0xffffn).toString(16);
    const low = Number(v4 & 0xffffn).toString(16);
    text = text.slice(0, dotted.index) + `${high}:${low}`;
  }

  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : [];
  if (halves.length === 1 && head.length !== 8) return null;
  const gap = 8 - head.length - tail.length;
  if (gap < 0 || (halves.length === 2 && gap < 1)) return null;

  const groups = [...head, ...Array<string>(halves.length === 2 ? gap : 0).fill('0'), ...tail];
  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    value = (value << 16n) | BigInt(parseInt(group, 16));
  }
  return value;
}

/** One list entry: `10.0.0.0/8`, `fd00::/8`, `127.0.0.1`, `::1`. */
function parseEntry(raw: string): Cidr | null {
  const entry = unmapV4(raw.trim().toLowerCase());
  if (!entry) return null;
  const slash = entry.lastIndexOf('/');
  const addr = slash === -1 ? entry : entry.slice(0, slash);
  const suffix = slash === -1 ? null : entry.slice(slash + 1);

  const isV6 = addr.includes(':');
  const value = isV6 ? parseV6(addr) : parseV4(addr);
  if (value === null) return null;

  const family: 4 | 6 = isV6 ? 6 : 4;
  const width = isV6 ? V6_BITS : V4_BITS;
  // No suffix is a host route: an exact address means exactly itself.
  let bits = width;
  if (suffix !== null) {
    if (!/^\d{1,3}$/.test(suffix)) return null;
    bits = Number(suffix);
    if (bits > width) return null;
  }
  const mask = bits === 0 ? 0n : ((1n << BigInt(bits)) - 1n) << BigInt(width - bits);
  return { family, value: value & mask, bits };
}

/** The default: this machine talking to itself, and nothing else. */
export const DEFAULT_TRUSTED_PROXIES = '127.0.0.1,::1';

/**
 * Parsed lists, keyed by the raw string they came from.
 *
 * The list is read per request on the hottest path on the platform, and the
 * variable does not change within a process — but it MUST NOT be read once at
 * import: a module-level `const` fixes the answer before a test can stub the
 * environment and before a process that loads its `.env` late has one. Caching
 * on the raw value gets both.
 */
const cache = new Map<string, Cidr[]>();

export function parseTrustedProxies(raw: string | undefined): Cidr[] {
  const source = raw === undefined || raw === '' ? DEFAULT_TRUSTED_PROXIES : raw;
  const hit = cache.get(source);
  if (hit) return hit;
  const parsed = source
    .split(',')
    .map((e) => parseEntry(e))
    .filter((e): e is Cidr => e !== null);
  // Bounded: the number of distinct values a process ever sees is the number of
  // times its environment is stubbed, which is a test concern.
  if (cache.size > 64) cache.clear();
  cache.set(source, parsed);
  return parsed;
}

/**
 * May this peer's `X-Forwarded-For` be believed?
 *
 * `false` for an address that cannot be parsed, including `'unknown'` — an
 * unparseable peer is not a proxy we run, and the fail-closed answer is to key
 * the rate limit on whatever we have rather than on whatever it claims.
 */
export function isTrustedProxy(peer: string | undefined | null, raw?: string): boolean {
  if (!peer) return false;
  const addr = unmapV4(String(peer).trim().toLowerCase());
  const isV6 = addr.includes(':');
  const value = isV6 ? parseV6(addr) : parseV4(addr);
  if (value === null) return false;
  const family: 4 | 6 = isV6 ? 6 : 4;
  const width = isV6 ? V6_BITS : V4_BITS;

  for (const entry of parseTrustedProxies(raw ?? process.env.DDOS_TRUSTED_PROXIES)) {
    if (entry.family !== family) continue;
    const mask = entry.bits === 0 ? 0n : ((1n << BigInt(entry.bits)) - 1n) << BigInt(width - entry.bits); // prettier-ignore
    if ((value & mask) === entry.value) return true;
  }
  return false;
}
