/* global process, fetch */
/**
 * Pacing for the live probe scripts, derived from the gateway's own limits.
 *
 * Every script in this directory drives the running gateway over HTTP as fast
 * as `await` will let it. That is a flood by the shield's own definition:
 * `DdosProtectionMiddleware` allows `DDOS_RATE_LIMIT_MAX` requests per
 * `DDOS_RATE_LIMIT_WINDOW` seconds **per IP**, records a strike on every
 * request past it, and bans the IP after `DDOS_STRIKE_THRESHOLD` strikes. On a
 * developer's machine every local caller — the probe, the Next SSR fetches, the
 * e2e run, `/health` — shares one IP, so the ban is not "the script gets 429":
 * it is *the whole local platform gets 429*, for fifteen minutes and upwards,
 * out of a Redis the whole fleet shares. It happened twice on 2026-09-12:
 * `verify:regional` banned `:3001` for 15 minutes, and a Playwright run banned
 * `127.0.0.1` with `Retry-After: 21397`.
 *
 * Two fixes, and this file is the first of them:
 *
 *   1. the probes pace themselves below the shield's threshold (here), and
 *   2. in development the shield never writes a BAN key for a loopback address
 *      (`ddos-protection.middleware.ts` / `ws-ddos.guard.ts`) — 429s and strikes
 *      still happen, so a genuine flood is still refused, but one local mistake
 *      can no longer take every other local caller down with it.
 *
 * The delay is DERIVED, not guessed: it is read from the same environment
 * variables the middleware reads, with the same defaults, so raising the
 * gateway's limits automatically shortens the probe's wait and there is no
 * second copy of the number to drift. `PROBE_DELAY_MS` overrides it outright
 * (`PROBE_DELAY_MS=0` disables pacing — only correct against a gateway started
 * with the limits raised for that process; see the runbook section
 * "Every local caller answers 429 after a probe or e2e run" in
 * `docs/guides/troubleshooting.md`).
 *
 * This module reads and writes NOTHING in Redis. It never inspects, clears or
 * resets a `ddos:banned:` / `ddos:strikes:` key: those are shared state owned by
 * the running platform, and a verification script that clears the evidence of
 * its own misbehaviour proves nothing.
 */

/**
 * The middleware's defaults, transcribed from
 * `apps/api/libs/security/src/ddos-protection.middleware.ts` (the `DDOS_*`
 * block at the top of the class).
 *
 * Kept as one object so the spec can assert the transcription is still true
 * against that file rather than trusting this comment.
 */
export const GATEWAY_LIMIT_DEFAULTS = Object.freeze({
  DDOS_RATE_LIMIT_WINDOW: 60,
  DDOS_RATE_LIMIT_MAX: 100,
  DDOS_BURST_WINDOW: 5,
  DDOS_BURST_MAX: 60,
});

/** How much slower than the limit to run. 1 would sit exactly on the threshold. */
const SAFETY_FACTOR = 1.25;

/** Below this many requests left in the window, wait for the window to roll over. */
const REMAINING_FLOOR = 10;

const positive = (raw, fallback) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Milliseconds to leave between two requests so neither the sliding window nor
 * the burst micro-window is ever reached.
 *
 * Both layers are per-IP counters over a fixed window, so the sustainable rate
 * of each is `window / max` seconds per request and the binding constraint is
 * the slower of the two (60/100 = 600 ms against 5/60 = 84 ms by default).
 * `PROBE_DELAY_MS` wins when set, including `0`.
 */
export function probeDelayMs(env = process.env) {
  if (env.PROBE_DELAY_MS !== undefined && env.PROBE_DELAY_MS !== '') {
    const explicit = Number(env.PROBE_DELAY_MS);
    if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  }
  const d = GATEWAY_LIMIT_DEFAULTS;
  const window = positive(env.DDOS_RATE_LIMIT_WINDOW, d.DDOS_RATE_LIMIT_WINDOW);
  const max = positive(env.DDOS_RATE_LIMIT_MAX, d.DDOS_RATE_LIMIT_MAX);
  const burstWindow = positive(env.DDOS_BURST_WINDOW, d.DDOS_BURST_WINDOW);
  const burstMax = positive(env.DDOS_BURST_MAX, d.DDOS_BURST_MAX);
  const perRequestMs = Math.max((window / max) * 1000, (burstWindow / burstMax) * 1000);
  return Math.ceil(perRequestMs * SAFETY_FACTOR);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One queue per process: the scripts fire requests from several `await` chains,
 * and pacing each chain separately would still add up to a flood.
 */
let queue = Promise.resolve();
let nextSlotAt = 0;

/** Requests this process has actually made — printed by `pacingSummary()`. */
let sent = 0;
let sleptMs = 0;

/** Take the next slot in the queue, waiting until it is due. */
async function takeSlot() {
  const run = queue.then(async () => {
    const delay = probeDelayMs();
    const wait = nextSlotAt - Date.now();
    if (wait > 0) {
      sleptMs += wait;
      await sleep(wait);
    }
    nextSlotAt = Date.now() + delay;
    sent += 1;
  });
  queue = run.catch(() => {});
  return run;
}

/**
 * A 429 the probe caused itself.
 *
 * Thrown rather than returned: every one of these scripts treats a status as
 * evidence about the ROUTE, and a throttled response is evidence about the
 * probe. Reporting it as a failed check would be a false finding, and retrying
 * it is how the ban happened. The message says which of the two remedies to
 * reach for.
 */
export class ProbeThrottledError extends Error {
  constructor(url, status, retryAfter) {
    super(
      `the gateway throttled the probe (${status} on ${url}` +
        (retryAfter ? `, Retry-After ${retryAfter}s` : '') +
        `). The probe is pacing at ${probeDelayMs()} ms/request, so the shared ` +
        `per-IP window is being spent by something else on this machine (the dev ` +
        `fleet, an e2e run). Either raise PROBE_DELAY_MS, or run a temporary ` +
        `gateway on API_GATEWAY_PORT=3099 with DDOS_RATE_LIMIT_MAX / ` +
        `DDOS_BURST_MAX raised for that process only and point API_BASE at it — ` +
        `see docs/guides/troubleshooting.md. Do NOT delete the shield's keys.`,
    );
    this.name = 'ProbeThrottledError';
    this.status = status;
  }
}

/**
 * `fetch`, paced, and loud about a 429.
 *
 * Also reads the shield's own budget back out of the response:
 * `X-Shield-Remaining` is the requests left in THIS window across every local
 * caller, not just this script, so when it runs low the only safe move is to
 * wait for `X-Shield-Reset` rather than to keep spending at the paced rate.
 * `X-RateLimit-*` is the fallback and not the first choice: `ThrottlerGuard`
 * runs after the shield and overwrites those three with its own, different
 * bucket — real, but not the one that records strikes and bans.
 */
export async function pacedFetch(url, init) {
  await takeSlot();
  const res = await fetch(url, init);

  if (res.status === 429) {
    throw new ProbeThrottledError(url, res.status, res.headers.get('retry-after'));
  }

  // `X-Shield-*` first: `ThrottlerGuard` runs after the DDoS middleware and
  // overwrites `X-RateLimit-*` with its own (different) bucket, so the generic
  // names report a budget that is not the one recording strikes.
  const remaining = Number(
    res.headers.get('x-shield-remaining') ?? res.headers.get('x-ratelimit-remaining'),
  );
  if (Number.isFinite(remaining) && remaining < REMAINING_FLOOR) {
    const reset = Number(res.headers.get('x-shield-reset') ?? res.headers.get('x-ratelimit-reset'));
    const waitMs = Number.isFinite(reset)
      ? Math.max(0, reset * 1000 - Date.now()) + 1000
      : probeDelayMs() * REMAINING_FLOOR;
    nextSlotAt = Math.max(nextSlotAt, Date.now() + waitMs);
    sleptMs += waitMs;
  }

  return res;
}

/** A line for the end of a probe run, so the pacing is visible in the transcript. */
export function pacingSummary() {
  return `paced ${sent} request(s) at ${probeDelayMs()} ms/request (${Math.round(sleptMs / 1000)}s waiting)`;
}
