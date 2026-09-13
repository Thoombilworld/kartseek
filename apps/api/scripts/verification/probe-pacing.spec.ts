import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
// @ts-expect-error — plain ESM beside the CLIs that use it; there are no types.
import { probeDelayMs, pacedFetch, pacingSummary, ProbeThrottledError, GATEWAY_LIMIT_DEFAULTS } from './probe-pacing.mjs'; // prettier-ignore

/**
 * The probe scripts must not be able to ban the machine they run on.
 *
 * `verify:regional` and its six siblings drive the live gateway as fast as
 * `await` allows. `DdosProtectionMiddleware` counts requests per IP, and on a
 * developer's machine one IP is every local caller, so the flood the scripts
 * caused on 2026-09-12 was not throttled to the script — it took the whole
 * local fleet down for fifteen minutes, and a Playwright run repeated it with
 * `Retry-After: 21397`.
 *
 * The delay is derived from the middleware's own variables rather than typed in
 * again, which is what these cases pin: the transcription of the defaults is
 * checked against the middleware file, the arithmetic is checked against the
 * limits, and the scripts are checked for two things they must never do — call
 * `fetch` unpaced, or reach into the shield's Redis keys to clear up after
 * themselves.
 */
const VERIFICATION = __dirname;
const SECURITY = path.join(
  __dirname,
  '..',
  '..',
  'libs',
  'security',
  'src',
  'ddos-protection.middleware.ts',
);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('the delay is derived from the gateway, not guessed', () => {
  it('transcribes the middleware defaults exactly', () => {
    // If somebody retunes the shield, this fails and names the number to change
    // — the alternative is a probe that paces to a limit that no longer exists.
    const src = fs.readFileSync(SECURITY, 'utf8');
    for (const [name, value] of Object.entries(GATEWAY_LIMIT_DEFAULTS)) {
      const m = src.match(new RegExp(`process\\.env\\.${name}\\s*\\|\\|\\s*(\\d[\\d_]*)`));
      expect(m, `${name} is no longer read with a default in the middleware`).toBeTruthy();
      expect(Number(m![1].replace(/_/g, '')), `${name} default drifted`).toBe(value);
    }
  });

  it('paces below the slower of the two per-IP windows', () => {
    // 60 s / 100 requests = 600 ms; the burst window allows 250 ms, so the
    // sliding window is the binding constraint. Plus headroom.
    const delay = probeDelayMs({});
    expect(delay).toBeGreaterThan(600);
    expect(delay).toBeLessThan(1000);
  });

  it('follows the gateway when the gateway is given more room', () => {
    // The documented remedy: a temporary :3099 gateway with the limits raised.
    // The probe must then go faster on its own, or the remedy is not one.
    const fast = probeDelayMs({ DDOS_RATE_LIMIT_MAX: '2000', DDOS_BURST_MAX: '500' });
    expect(fast).toBeLessThan(probeDelayMs({}));
  });

  it('takes the burst window when it is the tighter of the two', () => {
    const delay = probeDelayMs({ DDOS_RATE_LIMIT_MAX: '10000', DDOS_BURST_MAX: '2' });
    // 5 s / 2 = 2500 ms
    expect(delay).toBeGreaterThanOrEqual(2500);
  });

  it('lets PROBE_DELAY_MS override outright, including zero', () => {
    expect(probeDelayMs({ PROBE_DELAY_MS: '1500' })).toBe(1500);
    expect(probeDelayMs({ PROBE_DELAY_MS: '0' })).toBe(0);
  });

  it('ignores a nonsense override rather than pacing at NaN', () => {
    expect(probeDelayMs({ PROBE_DELAY_MS: 'soon' })).toBe(probeDelayMs({}));
    expect(probeDelayMs({ DDOS_RATE_LIMIT_MAX: '0' })).toBe(probeDelayMs({}));
  });
});

describe('pacedFetch', () => {
  const headers = (h: Record<string, string> = {}) => ({
    get: (k: string) => h[k.toLowerCase()] ?? null,
  });

  it('leaves the configured gap between two requests', async () => {
    vi.stubEnv('PROBE_DELAY_MS', '120');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 200, headers: headers() })),
    );
    const started = Date.now();
    await pacedFetch('http://x/1');
    await pacedFetch('http://x/2');
    await pacedFetch('http://x/3');
    // Two gaps between three requests; the first is free.
    expect(Date.now() - started).toBeGreaterThanOrEqual(200);
  });

  it('throws on a 429 instead of reporting it as a route failure', async () => {
    // Every one of these scripts reads a status as evidence about the ROUTE. A
    // throttled response is evidence about the probe, and retrying it is how
    // the ban happened.
    vi.stubEnv('PROBE_DELAY_MS', '0');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 429, headers: headers({ 'retry-after': '900' }) })),
    );
    await expect(pacedFetch('http://x/admin/users')).rejects.toBeInstanceOf(ProbeThrottledError);
  });

  it('names both remedies and forbids the one that was used last time', async () => {
    vi.stubEnv('PROBE_DELAY_MS', '0');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status: 429, headers: headers() })),
    );
    const err = await pacedFetch('http://x/a').catch((e: Error) => e);
    expect(err.message).toContain('PROBE_DELAY_MS');
    expect(err.message).toContain('3099');
    expect(err.message).toMatch(/Do NOT delete the shield's keys/);
  });

  it('backs off to the window reset when the shared budget is nearly spent', async () => {
    // `X-RateLimit-Remaining` counts what is left across EVERY local caller in
    // this window, not just this script's share of it.
    vi.stubEnv('PROBE_DELAY_MS', '0');
    const reset = Math.floor(Date.now() / 1000) + 1;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 200,
        headers: headers({ 'x-ratelimit-remaining': '2', 'x-ratelimit-reset': String(reset) }),
      })),
    );
    await pacedFetch('http://x/a');
    const started = Date.now();
    await pacedFetch('http://x/b');
    expect(Date.now() - started).toBeGreaterThan(500);
  });

  it('reports what it did, so a clean run is evidence and not a claim', async () => {
    expect(pacingSummary()).toMatch(/paced \d+ request\(s\) at \d+ ms\/request/);
  });
});

describe('every probe script is paced, and none of them touches the shield', () => {
  const scripts = fs
    .readdirSync(VERIFICATION)
    .filter((f) => f.endsWith('.mjs') && f !== 'probe-pacing.mjs');

  for (const file of scripts) {
    const src = fs.readFileSync(path.join(VERIFICATION, file), 'utf8');

    it(`${file} never calls fetch() unpaced`, () => {
      // A new script (or a new call site in an old one) that forgets the import
      // is the exact regression this whole file exists to prevent.
      // A call site, not the word: `await fetch(`, `= fetch(`, `(fetch(`.
      // `pacedFetch(` has a capital F and never matches.
      const bare = [...src.matchAll(/(?:\bawait|=|\(|\breturn)\s*fetch\s*\(/g)];
      expect(bare.map((m) => src.slice(Math.max(0, m.index! - 40), m.index! + 20))).toEqual([]);
      if (src.includes('pacedFetch(')) expect(src).toContain("from './probe-pacing.mjs'");
    });

    it(`${file} never reads or deletes a ban or strike key`, () => {
      // These live in the Redis the running platform shares. A verification
      // script that clears the evidence of its own flood proves nothing, and
      // one that clears somebody else's ban is editing production state.
      expect(src).not.toMatch(/['"`]ddos:(banned|strikes|violation)/);
      expect(src).not.toMatch(/['"`]ws:(banned|strikes)/);
    });
  }

  it('found the scripts it claims to be checking', () => {
    // A loop over an empty directory listing passes silently.
    expect(scripts.length).toBeGreaterThanOrEqual(7);
  });
});
