import { test, expect, type Page } from '@playwright/test';

/**
 * Marketplace data-consistency matrix.
 *
 * Every scenario here answers one question: does the same URL, in the same
 * market, against the same committed database, show the same category and the
 * same product cards — across refresh, navigation, back, cold and warm caches,
 * and concurrent requests? These are the reproduction steps from the
 * 2026-09-13 root-cause investigation, kept as tests so the defects cannot
 * come back unnoticed:
 *
 *   • a market with no live seller rendered an empty category (the service
 *     read a stale database copy);
 *   • the header's geolocation overwrote the market cookie on every load, so
 *     refresh and navigation disagreed;
 *   • listing caches were keyed on the raw filter JSON and never dropped on a
 *     seller's price edit;
 *   • the default sort had no unique tiebreak.
 *
 * Runs against the dev fleet on :3000 (the shell rewrites /marketplace to the
 * zone) with the API gateway on :3001. Markets come from the cookie the edge
 * proxy honours, so each scenario sets `kartseek_country` explicitly.
 */

const GATEWAY = process.env.E2E_GATEWAY_URL ?? 'http://localhost:3001/api/v1';
const CATEGORY = 'mobiles-tablets';
const MARKETS = ['QA', 'IN', 'AE', 'SA'] as const;

type Api = Parameters<Parameters<typeof test>[2]>[0]['request'];

/**
 * A gateway GET that waits out the per-IP throttle.
 *
 * The gateway rate-limits by client address, and this file's browser
 * scenarios spend a good part of that budget before the API scenarios run.
 * A 429 is the limiter doing its job, not a data inconsistency, so it is
 * retried after the `Retry-After` the gateway names (or a second).
 */
async function getJson(request: Api, url: string, market?: string): Promise<any> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await request.get(url, market ? { headers: { 'X-Region-Code': market } } : {});
    if (res.status() !== 429) {
      return { status: res.status(), body: res.status() === 204 ? null : await res.json() };
    }
    const wait = Number(res.headers()['retry-after']) || 1;
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  throw new Error(`still rate-limited after 8 attempts: ${url}`);
}

/**
 * Wait until the gateway's per-IP throttle has room for a scenario.
 *
 * The Next server's own catalogue fetches come from the same loopback address
 * as this runner, so a suite that spends the whole budget makes the *pages*
 * render their "couldn't load" state — a false failure that looks exactly like
 * the defect under test. Each scenario therefore starts with at least
 * `MIN_BUDGET` requests left in the window, waiting out the reset if not.
 */
const MIN_BUDGET = 150;
async function ensureThrottleBudget(request: Api): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await request.get(`${GATEWAY}/marketplace/categories`);
    const headers = res.headers();
    const remaining = Number(headers['x-ratelimit-remaining']);
    const reset = Number(headers['x-ratelimit-reset']) || 60;
    if (res.status() !== 429 && (Number.isNaN(remaining) || remaining >= MIN_BUDGET)) return;
    await new Promise((r) => setTimeout(r, (reset + 1) * 1000));
  }
}

test.beforeEach(async ({ request }) => ensureThrottleBudget(request));

/** The product heading — the second h1 on the page (the first is the header's wordmark). */
async function productTitle(page: Page): Promise<string> {
  const heading = page.locator('h1').nth(1);
  await heading.waitFor();
  return (await heading.textContent())?.trim() ?? '';
}

/** Product ids (last 8 chars of the uuid) in DOM order, plus the h1 and the visible count. */
async function readListing(page: Page) {
  await page.waitForSelector('main#main-content');
  const ids = await page.$$eval('main#main-content a[href*="/marketplace/product/"]', (links) =>
    links.filter((a) => a.querySelector('h3')).map((a) => (a.getAttribute('href') ?? '').slice(-8)),
  );
  const title = (await page.locator('h1').last().textContent())?.trim() ?? '';
  const count = (await page.locator('header p.tabular-nums').first().textContent())?.trim() ?? '';
  const prices = await page.$$eval(
    'main#main-content a[href*="/marketplace/product/"] span.font-bold.text-base, main#main-content a[href*="/marketplace/product/"] span.font-bold.sm\\:text-lg',
    (els) => els.map((e) => e.textContent?.trim() ?? ''),
  );
  return { ids, title, count, prices };
}

async function useMarket(page: Page, market: string) {
  await page.context().addCookies([
    { name: 'kartseek_country', value: market, domain: 'localhost', path: '/' },
    { name: 'kartseek_language', value: 'en', domain: 'localhost', path: '/' },
  ]);
}

test.describe('category listing is deterministic', () => {
  test.beforeEach(async ({ page }) => useMarket(page, 'QA'));

  test('the same URL renders the same category and the same cards across five refreshes', async ({
    page,
  }) => {
    await page.goto(`/marketplace/category/${CATEGORY}`);
    const first = await readListing(page);
    expect(first.title).toBe('Mobiles & Tablets');
    expect(first.ids.length).toBeGreaterThan(0);
    expect(new Set(first.ids).size).toBe(first.ids.length); // no duplicate cards

    for (let i = 0; i < 5; i++) {
      await page.reload();
      const again = await readListing(page);
      expect(again.title).toBe(first.title);
      expect(again.ids).toEqual(first.ids);
      expect(again.prices).toEqual(first.prices);
      expect(again.count).toBe(first.count);
    }
  });

  test('navigating away and back, then refreshing, keeps the correct category', async ({
    page,
  }) => {
    await page.goto(`/marketplace/category/${CATEGORY}`);
    const home = await readListing(page);

    await page.click('a[href="/marketplace/category/fashion"]');
    await page.waitForURL(/\/marketplace\/category\/fashion/);
    const fashion = await readListing(page);
    expect(fashion.title).toBe('Fashion');
    expect(fashion.ids).not.toEqual(home.ids);

    await page.goBack();
    await page.waitForURL(new RegExp(`/marketplace/category/${CATEGORY}$`));
    const back = await readListing(page);
    expect(back.title).toBe(home.title);
    expect(back.ids).toEqual(home.ids);

    await page.reload();
    const refreshed = await readListing(page);
    expect(refreshed.ids).toEqual(home.ids);
  });

  test('a subcategory chip narrows the listing and survives a refresh', async ({ page }) => {
    await page.goto(`/marketplace/category/${CATEGORY}`);
    const all = await readListing(page);
    await page.click('a.chip:has-text("Smartphones")');
    await page.waitForURL(/subcategory=smartphones/);
    const narrowed = await readListing(page);
    expect(narrowed.ids.length).toBeGreaterThan(0);
    expect(narrowed.ids.length).toBeLessThanOrEqual(all.ids.length);
    for (const id of narrowed.ids) expect(all.ids).toContain(id);

    await page.reload();
    expect((await readListing(page)).ids).toEqual(narrowed.ids);

    // The dedicated subcategory route shows the same set.
    await page.goto('/marketplace/subcategory/smartphones');
    const leaf = await readListing(page);
    expect(leaf.title).toBe('Smartphones');
    expect([...leaf.ids].sort()).toEqual([...narrowed.ids].sort());
  });

  test('client-side sort and filters never leak into another category', async ({ page }) => {
    await page.goto(`/marketplace/category/${CATEGORY}`);
    await page.getByRole('button', { name: /Sort:/ }).click();
    await page.getByRole('option', { name: 'Price: high to low' }).click();
    await expect(page.getByRole('button', { name: /Sort:/ })).toContainText('Price: high to low');

    await page.click('a[href="/marketplace/category/fashion"]');
    await page.waitForURL(/\/marketplace\/category\/fashion/);
    await expect(page.getByRole('button', { name: /Sort:/ })).toContainText('Recommended');
  });
});

test.describe('product identity', () => {
  test.beforeEach(async ({ page }) => useMarket(page, 'QA'));

  test('A → refresh ×5, A → B → refresh, B → back → refresh: the right product every time', async ({
    page,
  }) => {
    await page.goto(`/marketplace/category/${CATEGORY}`);
    const { ids } = await readListing(page);
    expect(ids.length).toBeGreaterThan(1);

    const cardA = page.locator(`main#main-content a[href*="${ids[0]}"]`).first();
    const hrefA = await cardA.getAttribute('href');
    await cardA.click();
    await page.waitForURL(/\/marketplace\/product\//);
    const titleA = await productTitle(page);
    expect(titleA).not.toBe('');
    expect(page.url()).toContain(ids[0]);

    for (let i = 0; i < 5; i++) {
      await page.reload();
      expect(page.url()).toContain(ids[0]);
      expect(await productTitle(page)).toBe(titleA);
    }

    await page.goto(`/marketplace/category/${CATEGORY}`);
    const cardB = page.locator(`main#main-content a[href*="${ids[1]}"]`).first();
    const hrefB = await cardB.getAttribute('href');
    expect(hrefB).not.toBe(hrefA);
    await cardB.click();
    await page.waitForURL(/\/marketplace\/product\//);
    const titleB = await productTitle(page);
    expect(page.url()).toContain(ids[1]);
    expect(titleB).not.toBe(titleA);

    await page.reload();
    expect(page.url()).toContain(ids[1]);
    expect(await productTitle(page)).toBe(titleB);

    // Back to the category, then forward to B again, then refresh: still B.
    await page.goBack();
    await page.waitForURL(new RegExp(`/marketplace/category/${CATEGORY}`));
    await page.goForward();
    await page.waitForURL(/\/marketplace\/product\//);
    await page.reload();
    expect(page.url()).toContain(ids[1]);
    expect(await productTitle(page)).toBe(titleB);
  });

  test('a product URL never gains a second /marketplace prefix', async ({ page }) => {
    await page.goto(`/marketplace/category/${CATEGORY}`);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.filter((h) => h.includes('/marketplace/marketplace'))).toEqual([]);
  });
});

test.describe('regional isolation', () => {
  for (const market of MARKETS) {
    test(`${market} sees its own offers, and only its own`, async ({ page, request }) => {
      await useMarket(page, market);
      await page.goto(`/marketplace/category/${CATEGORY}`);
      const listing = await readListing(page);
      expect(listing.ids.length).toBeGreaterThan(0);

      // Every card's price is this market's buy box, straight from the gateway.
      const { status, body } = await getJson(
        request,
        `${GATEWAY}/marketplace/products?category=${CATEGORY}&limit=48&country=${market}`,
        market,
      );
      expect(status).toBe(200);
      const rows: any[] = body?.data?.data ?? [];
      expect(body?.data?.region).toBe(market);
      expect(rows.map((r) => String(r.id).slice(-8))).toEqual(listing.ids);
      for (const row of rows) {
        const offers: any[] = row.listings ?? [];
        expect(offers.length).toBeGreaterThan(0);
        for (const offer of offers) {
          const code = offer?.seller?.regionCode ?? offer?.seller?.region_code ?? null;
          if (code) expect(code).toBe(market);
        }
      }
    });
  }

  test('two markets never share a cached listing', async ({ request }) => {
    const [qa, india] = await Promise.all(
      ['QA', 'IN'].map((m) =>
        getJson(
          request,
          `${GATEWAY}/marketplace/products?category=${CATEGORY}&limit=48&country=${m}`,
          m,
        ).then((r) => r.body),
      ),
    );
    const price = (b: any) => Number(b?.data?.data?.[0]?.listings?.[0]?.sellingPrice);
    expect(qa.data.region).toBe('QA');
    expect(india.data.region).toBe('IN');
    expect(price(qa)).toBeGreaterThan(0);
    expect(price(india)).toBeGreaterThan(0);
    expect(price(qa)).not.toBe(price(india));
  });
});

test.describe('API determinism', () => {
  test('ten concurrent identical requests return one logical dataset', async ({ request }) => {
    const url = `${GATEWAY}/marketplace/products?category=${CATEGORY}&limit=48&country=QA`;
    const bodies = await Promise.all(
      Array.from({ length: 10 }, () => getJson(request, url, 'QA').then((r) => r.body)),
    );
    const signature = (b: any) =>
      JSON.stringify({
        total: b?.data?.total,
        region: b?.data?.region,
        ids: (b?.data?.data ?? []).map((p: any) => p.id),
        prices: (b?.data?.data ?? []).map((p: any) => p?.listings?.[0]?.sellingPrice ?? null),
      });
    const first = signature(bodies[0]);
    for (const body of bodies) expect(signature(body)).toBe(first);
  });

  test('cold cache and warm cache answer identically', async ({ request }) => {
    // A limit nobody else uses, so the first read is a guaranteed miss.
    const url = `${GATEWAY}/marketplace/products?category=${CATEGORY}&limit=43&country=QA`;
    const cold = (await getJson(request, url, 'QA')).body;
    const warm = (await getJson(request, url, 'QA')).body;
    expect(warm.data.data.map((p: any) => p.id)).toEqual(cold.data.data.map((p: any) => p.id));
    expect(warm.data.total).toBe(cold.data.total);
  });

  test('the category resolves to one id from its slug, every time', async ({ request }) => {
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const { body } = await getJson(request, `${GATEWAY}/marketplace/categories/${CATEGORY}`);
      ids.add(body?.data?.id);
      expect(body?.data?.slug).toBe(CATEGORY);
    }
    expect(ids.size).toBe(1);
  });

  test('the retired /category-list alias is gone', async ({ request }) => {
    const { status } = await getJson(request, `${GATEWAY}/marketplace/category-list`);
    expect(status).toBe(404);
  });
});
