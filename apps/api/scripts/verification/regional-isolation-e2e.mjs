/* global process, console, fetch */
import fs from 'node:fs';
import pg from 'pg';
import Redis from 'ioredis';
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const API = 'http://127.0.0.1:3001/api/v1';
const PID = '8428d620-3d14-4850-a4f9-b4cfe971be90'; // 3M dash cam: an offer and a flash deal in every market
const MARKETS = {
  QA: {
    currency: 'QAR',
    offer: 300,
    deal: 255,
    flat: 'SAVE50QA',
    other: 'SAVE500IN',
    address: {
      fullName: 'Test Customer',
      phone: '+97455512345',
      line1: 'Tower 5, The Pearl',
      city: 'Doha',
      country: 'Qatar',
      countryCode: 'QA',
      poBox: '12345',
    },
  },
  IN: {
    currency: 'INR',
    offer: 7789,
    deal: 6621,
    flat: 'SAVE500IN',
    other: 'SAVE50QA',
    address: {
      fullName: 'Test Customer',
      phone: '+919876543210',
      line1: '12 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
      countryCode: 'IN',
    },
  },
  AE: {
    currency: 'AED',
    offer: 302.68,
    deal: 257.28,
    flat: 'SAVE50AE',
    other: 'SAVE50SA',
    address: {
      fullName: 'Test Customer',
      phone: '+971501234567',
      line1: 'Latifa Tower',
      area: 'Trade Centre',
      city: 'Dubai',
      country: 'United Arab Emirates',
      countryCode: 'AE',
    },
  },
  SA: {
    currency: 'SAR',
    offer: 309.07,
    deal: 262.71,
    flat: 'SAVE50SA',
    other: 'SAVE50AE',
    address: {
      fullName: 'Test Customer',
      phone: '+966551234567',
      line1: 'Olaya Towers',
      area: 'Al Olaya',
      city: 'Riyadh',
      postalCode: '12211',
      country: 'Saudi Arabia',
      countryCode: 'SA',
    },
  },
};
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
/**
 * Signs in, completing the staff second factor when one is demanded. A customer
 * never sees a challenge, so this one helper covers both callers below.
 */
const login = async (email, password) => {
  const r = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let j = await r.json();
  if (j.requires2FA) {
    if (!j.devCode)
      throw new Error(`MFA required for ${email}; run the fleet with DEV_MFA_ECHO=true`);
    const v = await fetch(API + '/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken: j.challengeToken, code: j.devCode }),
    });
    j = await v.json();
  }
  if (!j.accessToken)
    throw new Error(`login failed for ${email}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.accessToken;
};
const customer = await login('testcustomer@kartseek.com', 'TestPass123!');
const superAdmin = await login('admin@kartseek.com', 'AdminPass123!');
const call = async (cc, method, path, body, token = customer) => {
  const r = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(cc ? { 'X-Region-Code': cc } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j;
  try {
    j = JSON.parse(t);
  } catch {
    j = t;
  }
  return { status: r.status, j };
};
const rows = (j) => {
  const d = j?.data?.data ?? j?.data ?? j;
  return Array.isArray(d) ? d : [];
};
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.02;

const c = new pg.Client({
  host: '127.0.0.1',
  port: 5433,
  user: 'marketplace_user',
  password: 'change_me_in_development',
  database: 'kartseek_marketplace',
});
await c.connect();
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
});
const main = new pg.Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
await main.connect();

for (const [cc, m] of Object.entries(MARKETS)) {
  console.log(`\n══ ${cc} ══`);
  // PDP
  let r = await call(cc, 'GET', `/marketplace/products/${PID}`);
  const p = r.j?.data ?? r.j;
  const offer = (p?.listings ?? []).find((l) => l.isBuyBoxWinner) ?? p?.listings?.[0] ?? p?.listing;
  check(
    `${cc} PDP buy box is the ${cc} seller at the ${cc} price`,
    offer?.seller?.regionCode === cc && near(offer?.sellingPrice, m.offer),
    `seller ${offer?.seller?.regionCode} price ${offer?.sellingPrice}`,
  );
  check(
    `${cc} PDP carries no other market's offer`,
    (p?.listings ?? []).every((l) => !l.seller?.regionCode || l.seller.regionCode === cc),
    `${(p?.listings ?? []).map((l) => l.seller?.regionCode).join(',')}`,
  );
  // Flash deal
  r = await call(cc, 'GET', '/marketplace/flash-deals');
  const deal = rows(r.j).find((d) => d.id === PID);
  check(
    `${cc} flash deal price is the ${cc} deal`,
    deal && near(deal.dealPrice, m.deal) && /—/.test(deal.dealName),
    `dealPrice ${deal?.dealPrice} "${deal?.dealName}"`,
  );
  // Coupons
  r = await call(cc, 'GET', '/marketplace/coupons');
  const codes = rows(r.j)
    .map((x) => x.code)
    .sort();
  check(
    `${cc} coupons: WELCOME10 + ${m.flat} only`,
    codes.join(',') === ['WELCOME10', m.flat].sort().join(','),
    codes.join(','),
  );
  r = await call(cc, 'POST', '/marketplace/coupons/validate', { code: m.flat, cartTotal: 5000 });
  check(
    `${cc} own flat coupon validates`,
    (r.j?.data ?? r.j)?.valid === true,
    JSON.stringify(r.j?.data ?? r.j).slice(0, 100),
  );
  r = await call(cc, 'POST', '/marketplace/coupons/validate', { code: m.other, cartTotal: 5000 });
  const v = r.j?.data ?? r.j;
  check(
    `${cc} refuses ${m.other} (another market's code)`,
    v?.valid === false && /market/i.test(v?.reason ?? ''),
    JSON.stringify(v).slice(0, 100),
  );
  // Home
  r = await call(cc, 'GET', '/marketplace/home');
  const h = r.j?.data ?? r.j;
  const heroIds = (h?.heroBanners ?? []).map((b) => b.id);
  check(
    `${cc} home banners are ${cc}'s`,
    heroIds.length === 2 &&
      heroIds.every((id) => id.includes(`-${cc}-`)) &&
      (h?.campaignBanners ?? []).every((b) => b.id.includes(`-${cc}-`)),
    heroIds.join(','),
  );
  check(
    `${cc} home flash deals in ${cc} prices`,
    (h?.flashDeals ?? []).length === 8 &&
      near((h?.flashDeals ?? []).find((d) => d.id === PID)?.dealPrice, m.deal),
    `${(h?.flashDeals ?? []).length} deals`,
  );
  // Cart
  await call(cc, 'POST', '/marketplace/cart', { productId: PID, quantity: 1 });
  r = await call(cc, 'GET', '/marketplace/cart');
  const cart = r.j?.data ?? r.j;
  const line = (cart?.items ?? []).find((i) => i.productId === PID);
  check(
    `${cc} cart line priced at the ${cc} deal, tagged ${cc}`,
    line &&
      near(line.price, m.deal) &&
      line.regionCode === cc &&
      (cart.items ?? []).every((i) => i.regionCode === cc),
    `price ${line?.price} region ${line?.regionCode} lines ${(cart?.items ?? []).length}`,
  );
  // Order
  const before = (
    await c.query(
      `SELECT n.stock_sold FROM marketplace.flash_deal_nominations n JOIN marketplace.flash_deals d ON d.id=n.deal_id WHERE n.product_id=$1 AND d.region_code=$2`,
      [PID, cc],
    )
  ).rows[0]?.stock_sold;
  r = await call(cc, 'POST', '/marketplace/orders', {
    items: [{ productId: PID, quantity: 1 }],
    paymentMethod: 'cod',
    shippingAddress: m.address,
  });
  const od = r.j?.order ?? r.j?.data?.order ?? r.j?.data ?? r.j;
  const item = od?.items?.[0];
  check(
    `${cc} order placed at the ${cc} deal price`,
    r.status === 201 && near(item?.price, m.deal),
    `status ${r.status} price ${item?.price} ${JSON.stringify(r.j).slice(0, 100)}`,
  );
  check(
    `${cc} order records market ${cc} and currency ${m.currency}`,
    od?.regionCode === cc && od?.currency === m.currency,
    `regionCode ${od?.regionCode} currency ${od?.currency}`,
  );
  const after = (
    await c.query(
      `SELECT n.stock_sold FROM marketplace.flash_deal_nominations n JOIN marketplace.flash_deals d ON d.id=n.deal_id WHERE n.product_id=$1 AND d.region_code=$2`,
      [PID, cc],
    )
  ).rows[0]?.stock_sold;
  check(
    `${cc} deal allocation counted`,
    Number(after) === Number(before) + 1,
    `stock_sold ${before} → ${after}`,
  );
  const others = (
    await c.query(
      `SELECT d.region_code, n.stock_sold FROM marketplace.flash_deal_nominations n JOIN marketplace.flash_deals d ON d.id=n.deal_id WHERE n.product_id=$1 AND d.region_code<>$2`,
      [PID, cc],
    )
  ).rows;
  check(
    `${cc} order touched no other market's allocation`,
    others.every((o) => Number(o.stock_sold) === 0),
    others.map((o) => `${o.region_code}:${o.stock_sold}`).join(' '),
  );
  const dbOrder = od?.orderId
    ? (
        await main.query(
          `SELECT region_code, currency, "totalAmount" FROM "order"."orders" WHERE id=$1`,
          [od.orderId],
        )
      ).rows[0]
    : null;
  check(
    `${cc} order row persisted with market and currency`,
    dbOrder?.region_code === cc && dbOrder?.currency === m.currency,
    JSON.stringify(dbOrder),
  );
  if (od?.id)
    await call(cc, 'PUT', `/marketplace/orders/${od.id}/cancel`, { reason: 'verification' });
  // Put back what the verification order took (cancellation does not release: B-10).
  await c.query(
    `UPDATE marketplace.flash_deal_nominations n SET stock_sold = GREATEST(stock_sold - 1, 0) FROM marketplace.flash_deals d WHERE d.id=n.deal_id AND n.product_id=$1 AND d.region_code=$2`,
    [PID, cc],
  );
  await c.query(
    `UPDATE marketplace.product_listings l SET "stockQuantity" = "stockQuantity" + 1 FROM marketplace.sellers s WHERE s.id=l.seller_id AND s.region_code=$2 AND l.product_id=$1`,
    [PID, cc],
  );
}

console.log('\n══ cross-market cart view ══');
for (const cc of Object.keys(MARKETS)) {
  const r = await call(cc, 'GET', '/marketplace/cart');
  const items = (r.j?.data ?? r.j)?.items ?? [];
  check(
    `cart viewed as ${cc} shows only the ${cc} line`,
    items.length === 1 && items[0].regionCode === cc && near(items[0].price, MARKETS[cc].deal),
    `${items.map((i) => `${i.regionCode}:${i.price}`).join(' ')}`,
  );
  await call(cc, 'DELETE', `/marketplace/cart/${PID}`);
}

console.log('\n══ cache isolation ══');
const detailKeys = (await redis.keys(`product:${PID}:*`)).sort();
check(
  'product detail cached once per market',
  ['AE', 'IN', 'QA', 'SA'].every((cc) => detailKeys.includes(`product:${PID}:${cc}`)),
  detailKeys.join(' '),
);
const prices = {};
for (const cc of Object.keys(MARKETS)) {
  const j = JSON.parse((await redis.get(`product:${PID}:${cc}`)) || 'null');
  prices[cc] =
    (j?.listings ?? []).find((l) => l.isBuyBoxWinner)?.sellingPrice ?? j?.listing?.sellingPrice;
}
check(
  "each market's cached detail holds its own price",
  Object.entries(MARKETS).every(([cc, m]) => near(prices[cc], m.offer)),
  JSON.stringify(prices),
);
const homeKeys = (await redis.keys('marketplace:home:*')).sort();
check(
  'home feed cached per market',
  ['QA', 'IN', 'AE', 'SA'].every((cc) => homeKeys.includes(`marketplace:home:${cc}`)),
  homeKeys.join(' '),
);

// Regional purge: editing a Qatari banner drops Qatar's feed and leaves the others.
const heroBefore = JSON.parse((await redis.get('marketplace:hero-banners')) || '[]');
const qaLocal = heroBefore.find((b) => b.id === 'hero-QA-local');
await call(
  undefined,
  'POST',
  '/admin/marketplace/banners/hero',
  { id: 'hero-QA-local', subheadline: 'QATAR TEST' },
  superAdmin,
);
const afterKeys = await redis.keys('marketplace:home:*');
check(
  'editing a QA banner purges QA (and global) only',
  !afterKeys.includes('marketplace:home:QA') &&
    ['IN', 'AE', 'SA'].every((cc) => afterKeys.includes(`marketplace:home:${cc}`)),
  afterKeys.sort().join(' '),
);
let r = await call('QA', 'GET', '/marketplace/home');
check('QA home shows the edit immediately', JSON.stringify(r.j).includes('QATAR TEST'));
r = await call('IN', 'GET', '/marketplace/home');
check('IN home never shows the Qatari edit', !JSON.stringify(r.j).includes('QATAR TEST'));
await call(
  undefined,
  'POST',
  '/admin/marketplace/banners/hero',
  {
    id: 'hero-QA-local',
    subheadline: qaLocal?.subheadline ?? 'Free delivery on orders over QR 200',
  },
  superAdmin,
);

console.log('\n══ concurrent contamination ══');
const burst = await Promise.all(
  Array.from({ length: 24 }, (_, i) => {
    const cc = ['QA', 'IN', 'AE', 'SA'][i % 4];
    return Promise.all([
      call(cc, 'GET', `/marketplace/products/${PID}`).then((x) => ({
        cc,
        kind: 'pdp',
        ok: (() => {
          const p = x.j?.data ?? x.j;
          const o = (p?.listings ?? []).find((l) => l.isBuyBoxWinner);
          return o?.seller?.regionCode === cc && near(o?.sellingPrice, MARKETS[cc].offer);
        })(),
      })),
      call(cc, 'GET', '/marketplace/home').then((x) => ({
        cc,
        kind: 'home',
        ok:
          ((x.j?.data ?? x.j)?.heroBanners ?? []).every((b) => b.id.includes(`-${cc}-`)) &&
          (x.j?.data ?? x.j)?.region === cc,
      })),
      call(cc, 'GET', '/marketplace/flash-deals').then((x) => ({
        cc,
        kind: 'deals',
        ok: near(rows(x.j).find((d) => d.id === PID)?.dealPrice, MARKETS[cc].deal),
      })),
    ]);
  }),
);
const flat = burst.flat();
check(
  '72 concurrent reads across four markets each answered in their own market',
  flat.every((x) => x.ok),
  `${
    flat
      .filter((x) => !x.ok)
      .map((x) => `${x.kind}:${x.cc}`)
      .join(' ') || 'no leaks'
  }`,
);

await redis.quit();
await c.end();
await main.end();
const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} end-to-end checks passed`);
if (failed.length) process.exitCode = 1;
