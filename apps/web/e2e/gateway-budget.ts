import { test, type Page } from '@playwright/test';

/*
 * ── Gateway budget ─────────────────────────────────────────────────────────
 *
 * The gateway's DDoS layer (apps/api/libs/security/ddos-protection.middleware)
 * counts every request from one address: 100 per fixed 60-second window and
 * 20 per fixed 5-second window, and five violations ban the address for
 * fifteen minutes. In development this runner, the Next server's own
 * catalogue fetches and the developer's browser all arrive as 127.0.0.1, and
 * the counters cannot be read back (the Throttler guard overwrites the
 * X-RateLimit-* headers with its own 600-per-minute figures). A 429 here
 * makes a page render its "couldn't load" state, which looks exactly like the
 * defect under test, so every e2e suite budgets itself: each page load and
 * API call is charged against a sliding window sized under the gateway's.
 *
 * Costs are gateway requests per page load measured on 2026-09-13 with the
 * dev server (React StrictMode doubles client fetches): a category or
 * subcategory page is 2 server-side + 2 client-side, a product page 1 + 15.
 * Set E2E_GATEWAY_UNLIMITED=1 when the gateway exempts this address.
 */
export const UNLIMITED = process.env.E2E_GATEWAY_UNLIMITED === '1';
export const BUDGET = {
  burst: Number(process.env.E2E_GATEWAY_BURST ?? 18), // gateway default: 20 / 5 s
  burstMs: 5_000,
  rate: Number(process.env.E2E_GATEWAY_RATE ?? 85), // gateway default: 100 / 60 s
  rateMs: 60_000,
};
export const COST = { category: 5, product: 17, api: 1 } as const;

const charges: Array<{ at: number; n: number }> = [];
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Block until `cost` more gateway requests fit in both windows, then charge them. */
export async function pace(cost: number): Promise<void> {
  if (UNLIMITED) return;
  if (cost > BUDGET.burst)
    throw new Error(`a ${cost}-request step can never fit a ${BUDGET.burst}-request burst window`);
  for (;;) {
    const now = Date.now();
    while (charges.length && charges[0].at <= now - BUDGET.rateMs) charges.shift();
    const inRate = charges.reduce((sum, c) => sum + c.n, 0);
    const burstStart = charges.findIndex((c) => c.at > now - BUDGET.burstMs);
    const inBurst = burstStart < 0 ? 0 : charges.slice(burstStart).reduce((sum, c) => sum + c.n, 0);
    if (inBurst + cost <= BUDGET.burst && inRate + cost <= BUDGET.rate) {
      charges.push({ at: now, n: cost });
      return;
    }
    const untilBurst =
      inBurst + cost > BUDGET.burst ? charges[burstStart].at + BUDGET.burstMs - now : 0;
    const untilRate = inRate + cost > BUDGET.rate ? charges[0].at + BUDGET.rateMs - now : 0;
    await sleep(Math.max(50, untilBurst, untilRate) + 20);
  }
}

/**
 * The gateway's 60-second window is fixed, not sliding, and whatever ran in
 * it before this process started (a previous run, a build) is invisible. A
 * suite therefore opens on a fresh window. Call from `test.beforeAll`.
 */
export async function waitForFreshWindow(): Promise<void> {
  if (UNLIMITED) return;
  // Hooks have their own 30-second budget, which a full-window wait exceeds.
  test.setTimeout(BUDGET.rateMs + 30_000);
  const intoWindow = Date.now() % BUDGET.rateMs;
  await sleep(BUDGET.rateMs - intoWindow + 500);
}

// Charged navigation. Every page load goes through one of these so the
// budget above stays honest; a bare page.goto() would be an uncounted burst.
export async function open(page: Page, path: string, cost: number = COST.category): Promise<void> {
  await pace(cost);
  await page.goto(path);
}
export async function reload(page: Page, cost: number): Promise<void> {
  await pace(cost);
  await page.reload();
}
export async function follow(
  page: Page,
  selector: string,
  lands: RegExp,
  cost: number,
): Promise<void> {
  await pace(cost);
  await page.click(selector);
  await page.waitForURL(lands);
}
