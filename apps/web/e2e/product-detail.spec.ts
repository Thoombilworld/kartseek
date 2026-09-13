import { test, expect, type Page } from '@playwright/test';
import { pace, COST, open, waitForFreshWindow } from './gateway-budget';

/**
 * Product detail page — data integrity, isolation and UX, against the real
 * catalogue on :3001 through the shell on :3000.
 *
 * Every assertion compares the page with what the API answered for the same
 * product in the same market, so a passing run means the page shows the
 * catalogue's data and nothing invented. The suite paces itself against the
 * gateway's DDoS budget (see gateway-budget.ts): a product page costs ~17
 * requests, so scenarios reuse one open page where they can.
 *
 * Fixtures are real approved products from the seed: a phone with attribute
 * values and SKUs, a t-shirt with fashion attributes, and a car-care kit with
 * no attribute values at all.
 */

// 127.0.0.1, not localhost: Node resolves localhost to ::1 first on this
// platform and the gateway listens on IPv4, so a bare `localhost` request
// context fails with ECONNREFUSED ::1:3001 on some calls and not others.
const GATEWAY = process.env.E2E_GATEWAY_URL ?? 'http://127.0.0.1:3001/api/v1';
const PHONE = 'iphone-15-pro-256gb';
const TSHIRT = 'nike-drifit-mens-tshirt';
const BARE = '3m-car-wash-wax-kit';

type Api = Parameters<Parameters<typeof test>[2]>[0]['request'];

test.describe.configure({ mode: 'default', timeout: 300_000 });
test.beforeAll(waitForFreshWindow);

async function useMarket(page: Page, market: string) {
  await page.context().addCookies([
    { name: 'kartseek_country', value: market, domain: 'localhost', path: '/' },
    { name: 'kartseek_language', value: 'en', domain: 'localhost', path: '/' },
  ]);
}

/** A paced gateway GET; 429s are the limiter, not the page, and are retried. */
async function getJson(
  request: Api,
  url: string,
  market?: string,
): Promise<{ status: number; body: any }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    await pace(COST.api);
    const res = await request.get(url, { headers: market ? { 'X-Region-Code': market } : {} });
    if (res.status() !== 429)
      return { status: res.status(), body: await res.json().catch(() => null) };
    await new Promise((r) => setTimeout(r, (Number(res.headers()['retry-after']) || 1) * 1000));
  }
  throw new Error(`still rate-limited: ${url}`);
}

/** The catalogue's own view of a product in a market — the source of truth the page must match. */
async function apiProduct(request: Api, slug: string, market: string) {
  const { status, body } = await getJson(
    request,
    `${GATEWAY}/marketplace/products/${slug}?country=${market}`,
    market,
  );
  expect(status, `product ${slug} in ${market}`).toBe(200);
  const p = body?.data ?? body;
  const listings: any[] = (p.listings ?? []).filter((l: any) => l?.isActive !== false);
  const buyBox = listings.find((l: any) => l.isBuyBoxWinner) ?? listings[0];
  const variants: any[] = (p.variants ?? []).filter((v: any) => v?.isActive !== false);
  const inStock = variants.filter((v: any) => Number(v.stockQuantity) > 0);
  const opening = (inStock.length ? inStock : variants)
    .slice()
    .sort((a: any, b: any) => Number(a.sellingPrice) - Number(b.sellingPrice))[0];
  return {
    raw: p,
    id: String(p.id),
    name: String(p.name),
    canonical: `/marketplace/product/${p.slug}-${p.id}`,
    buyBoxPrice: Number(buyBox?.sellingPrice ?? 0),
    /** What the page shows first: the cheapest in-stock SKU's price, else the buy box. */
    openingPrice: opening ? Number(opening.sellingPrice) : Number(buyBox?.sellingPrice ?? 0),
    listings,
    variants,
    attributes: (p.attributes ?? []) as Array<{
      name: string;
      displayValue: string;
      group: string;
    }>,
    groups: (p.specificationGroups ?? []) as Array<{ group: string; attributes: any[] }>,
    highlights: (p.highlights ?? []) as string[],
  };
}

const digits = (text: string | null | undefined): number =>
  Number(String(text ?? '').replace(/[^0-9.]/g, '')) || 0;

async function shownPrice(page: Page): Promise<number> {
  return digits(await page.getByTestId('product-price-payable').textContent());
}

async function productJsonLd(page: Page): Promise<any | null> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const hit = list.find((x) => x?.['@type'] === 'Product');
      if (hit) return hit;
    } catch {
      /* not ours */
    }
  }
  return null;
}

test.describe('product data comes from the catalogue', () => {
  test('a phone shows its own specifications, highlights, price and SKU picker', async ({
    page,
    request,
  }) => {
    const market = 'QA';
    await useMarket(page, market);
    const api = await apiProduct(request, PHONE, market);
    expect(api.attributes.length).toBeGreaterThan(5);

    await open(page, api.canonical, COST.product);
    await expect(page.getByTestId('product-title')).toHaveText(api.name);

    // Price: the opening SKU's price, formatted for the market.
    await expect.poll(() => shownPrice(page)).toBeCloseTo(api.openingPrice, 0);
    await expect(page.getByTestId('product-price-payable')).toContainText('QR');

    // Every specification row on the page is an attribute value the API sent
    // — and every highlighted attribute is a bullet.
    const specs = page
      .locator('section[aria-labelledby]')
      .filter({ has: page.getByRole('heading', { name: 'Specifications' }) });
    await expect(specs).toBeVisible();
    const shownGroups = await specs.locator('h3').allTextContents();
    for (const g of shownGroups) expect(api.groups.map((x) => x.group)).toContain(g.trim());
    const dts = (await specs.locator('dt').allTextContents()).map((t) => t.trim());
    for (const dt of dts) expect(api.attributes.map((a) => a.name)).toContain(dt);
    expect(dts.length).toBeGreaterThan(0);
    expect(dts).not.toContain('Processor: N/A');

    const highlightSection = page.locator('section[aria-label="Highlights"]');
    await expect(highlightSection).toBeVisible();
    const shownHighlights = (await highlightSection.locator('li').allTextContents()).map((t) =>
      t.trim(),
    );
    expect(shownHighlights).toEqual(api.highlights);

    // SKU pickers exist for a product with variants, and the page never
    // claims a warranty or replacement policy the data does not carry.
    await expect(page.getByRole('button', { name: /512GB/ })).toBeVisible();
    const body = await page.locator('main').innerText();
    expect(body).not.toContain('7 Days Replacement');
    expect(body).not.toContain('Authorized');
    const warranty = api.attributes.find((a) => a.name.toLowerCase() === 'warranty');
    if (warranty) expect(body).toContain(warranty.displayValue);
    else expect(body).not.toMatch(/Brand Warranty/i);

    // Structured data agrees with the visible page.
    const ld = await productJsonLd(page);
    expect(ld).not.toBeNull();
    expect(ld.name).toBe(api.name);
    const offer = ld.offers;
    expect(offer.priceCurrency).toBe('QAR');
    expect(Number(offer.price ?? offer.highPrice)).toBeCloseTo(api.buyBoxPrice, 0);
    expect(String(offer.availability)).toMatch(/InStock|LimitedAvailability/);

    // Choosing another storage moves the price to that SKU's own price.
    const before = await shownPrice(page);
    const target = api.variants.find(
      (v: any) => v.attributes?.Storage === '512GB' && Number(v.stockQuantity) > 0,
    );
    if (target) {
      await page
        .getByRole('button', { name: /^512GB$/ })
        .first()
        .click();
      await expect.poll(() => shownPrice(page)).not.toBe(before);
      const after = await shownPrice(page);
      const candidates = api.variants
        .filter((v: any) => v.attributes?.Storage === '512GB')
        .map((v: any) => Number(v.sellingPrice));
      expect(candidates.some((c) => Math.abs(c - after) < 1)).toBe(true);
    }

    // Add to Cart takes the selection (guest cart), and says so.
    await page
      .getByTestId('product-actions')
      .getByRole('button', { name: /Add to Cart/i })
      .click();
    await expect(page.getByText(/Added .* to cart/)).toBeVisible();
  });

  test('a fashion product shows fashion attributes and no phone rows', async ({
    page,
    request,
  }) => {
    await useMarket(page, 'QA');
    const api = await apiProduct(request, TSHIRT, 'QA');
    await open(page, api.canonical, COST.product);
    await expect(page.getByTestId('product-title')).toHaveText(api.name);
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/\bProcessor\b|\bRAM\b|\bBattery capacity\b/);
    for (const a of api.attributes.slice(0, 4)) expect(text).toContain(a.name);
  });

  test('a product with no attribute values renders no specification section', async ({
    page,
    request,
  }) => {
    await useMarket(page, 'QA');
    const api = await apiProduct(request, BARE, 'QA');
    expect(api.attributes.length).toBe(0);
    await open(page, api.canonical, COST.product);
    await expect(page.getByTestId('product-title')).toHaveText(api.name);
    await expect(page.getByRole('heading', { name: 'Specifications' })).toHaveCount(0);
    await expect(page.locator('section[aria-label="Highlights"]')).toHaveCount(0);
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/N\/A/);
  });
});

test.describe('identifiers and error states', () => {
  test('a malformed id is a 400 and a missing product a 404 on the API, and both are a 404 page', async ({
    page,
    request,
  }) => {
    await useMarket(page, 'QA');
    const bad = await getJson(
      request,
      `${GATEWAY}/marketplace/products/${encodeURIComponent('not a product!!')}`,
      'QA',
    );
    expect(bad.status).toBe(400);
    const missing = await getJson(
      request,
      `${GATEWAY}/marketplace/products/00000000-0000-4000-8000-000000000000`,
      'QA',
    );
    expect(missing.status).toBe(404);
    expect(JSON.stringify(missing.body)).not.toMatch(/at .*\.js|QueryFailed|postgres/i);

    await open(
      page,
      '/marketplace/product/nothing-here-00000000-0000-4000-8000-000000000000',
      COST.category,
    );
    await expect(page.getByRole('heading', { name: /Product Not Found/i })).toBeVisible();
    await open(page, '/marketplace/product/no-uuid-at-all', COST.category);
    await expect(page.getByRole('heading', { name: /Product Not Found/i })).toBeVisible();
  });

  test('a legacy bare-uuid URL redirects to the canonical slug URL', async ({ page, request }) => {
    await useMarket(page, 'QA');
    const api = await apiProduct(request, PHONE, 'QA');
    await open(page, `/marketplace/product/${api.id}`, COST.product);
    await expect(page).toHaveURL(
      new RegExp(`${api.canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
    );
  });
});

test.describe('regional isolation', () => {
  test('the market decides the currency and the offer', async ({ page, request }) => {
    const qa = await apiProduct(request, PHONE, 'QA');
    const inr = await apiProduct(request, PHONE, 'IN');
    expect(qa.buyBoxPrice).not.toBe(inr.buyBoxPrice);
    for (const l of qa.listings)
      expect([null, undefined, 'QA']).toContain(l.seller?.regionCode ?? null);
    for (const l of inr.listings)
      expect([null, undefined, 'IN']).toContain(l.seller?.regionCode ?? null);

    await useMarket(page, 'IN');
    await open(page, inr.canonical, COST.product);
    await expect(page.getByTestId('product-price-payable')).toContainText('₹');
    await expect.poll(() => shownPrice(page)).toBeCloseTo(inr.openingPrice, 0);
  });
});

test.describe('security', () => {
  test('seller banking, identity and internal columns never reach the browser', async ({
    request,
  }) => {
    const { body } = await getJson(
      request,
      `${GATEWAY}/marketplace/products/${PHONE}?country=QA`,
      'QA',
    );
    const p = body?.data ?? body;
    for (const key of [
      'seller_id',
      'approval_status',
      'is_active',
      'availablePincodes',
      'translations',
    ]) {
      expect(p, key).not.toHaveProperty(key);
    }
    for (const l of p.listings ?? []) {
      for (const key of [
        'bankAccountNumber',
        'bankIfscCode',
        'panNumber',
        'gstNumber',
        'email',
        'phone',
        'ownerId',
        'kycDocuments',
        'commissionRate',
      ]) {
        expect(l.seller ?? {}, `listing seller ${key}`).not.toHaveProperty(key);
      }
    }
    const reviews = await getJson(
      request,
      `${GATEWAY}/marketplace/products/${p.id}/reviews?page=1&limit=5`,
      'QA',
    );
    expect(reviews.status).toBe(200);
    for (const r of (reviews.body?.data ?? reviews.body)?.reviews ?? [])
      expect(r).not.toHaveProperty('customerId');
  });

  test('a signed-out review or question is refused, never fabricated', async ({ request }) => {
    // A development gateway with DEV_AUTH_BYPASS=true treats every anonymous
    // request as a signed-in SUPER_ADMIN, so a "signed-out" write there would
    // succeed and leave a review in the shared catalogue. Detect the bypass
    // on a read that is guarded in every environment and skip rather than
    // pollute; the assertion runs for real wherever the guard is live.
    const cart = await getJson(request, `${GATEWAY}/marketplace/cart`);
    test.skip(
      cart.status !== 401,
      'gateway runs with DEV_AUTH_BYPASS — anonymous writes are authorised here',
    );

    const { body } = await getJson(
      request,
      `${GATEWAY}/marketplace/products/${PHONE}?country=QA`,
      'QA',
    );
    const id = (body?.data ?? body).id;
    await pace(COST.api);
    const review = await request.post(`${GATEWAY}/marketplace/products/${id}/reviews`, {
      data: { rating: 5, title: 'x', comment: 'y' },
    });
    expect(review.status()).toBe(401);
    await pace(COST.api);
    const question = await request.post(`${GATEWAY}/marketplace/products/${id}/questions`, {
      data: { questionText: 'is it good?' },
    });
    expect(question.status()).toBe(401);
  });
});

test.describe('responsive', () => {
  for (const [w, h] of [
    [320, 640],
    [1440, 900],
  ] as const) {
    test(`no horizontal overflow at ${w}px, and the mobile buy bar is present below the tablet breakpoint`, async ({
      page,
      request,
    }) => {
      await useMarket(page, 'QA');
      const api = await apiProduct(request, PHONE, 'QA');
      await page.setViewportSize({ width: w, height: h });
      await open(page, api.canonical, COST.product);
      await expect(page.getByTestId('product-title')).toHaveText(api.name);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const sticky = page.getByTestId('product-actions-sticky');
      if (w < 768) await expect(sticky).toBeVisible();
      else await expect(sticky).toBeHidden();
    });
  }
});
