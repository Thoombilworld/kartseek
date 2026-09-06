# Marketplace Customer Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every P0 gap found by `docs/audits/2026-09-06-marketplace-customer-frontend-audit.md` so a shopper in any active market can browse, pay truthfully and manage their account, then work the P1–P3 backlog in the order §34 of the brief prescribes.

**Architecture:** The customer storefront is the Next 16 zone `modules/marketplace/frontend` (basePath `/marketplace`) rendering through the shared packages `packages/shared-core` (API client, localization registry, contexts) and `packages/shared-ui`. It talks only to the API gateway (`apps/api/apps/api-gateway`), which forwards to the marketplace backend (`modules/marketplace/backend`, TCP pattern handlers in `marketplace.controller.ts`, catalogue logic in `catalog/catalog.service.ts`) and to order-service. Fixes land at the layer that owns the truth: pricing and stock in the marketplace backend, payment policy in the gateway, presentation in the zone.

**Tech Stack:** Next 16 / React 19 / Tailwind 4 (zone, jest via `apps/web/jest.base.cjs`), NestJS 11 + TypeORM (backend, vitest at `apps/api`, jest in `modules/marketplace/backend`), Playwright over system Chrome for validation sweeps.

## Global Constraints

- Zone links are written without the `/marketplace` prefix (`basePath` prepends it); links leaving the zone use `ZoneLink`. Helpers returning full paths (`productPath`) are wrapped in `zoneHref()`.
- Money: prices arrive as decimal strings; always `Number()` them; format with `formatCurrencyValue` / `formatMoney`, never a literal symbol.
- Region: every browser call goes through `apiFetch` / the typed `api` client so `X-Region-Code` is sent; never hard-code a country, language list, address shape or payment method — read `@/lib/localization`.
- Auth-gated calls check `isAuthenticated` (and `isHydrated`) from `useAuth()` and keep them in effect deps.
- `nest build` and `next build` are the gates; `tsc` alone is not. Editing `apps/api` or a module backend restarts that service under `npm run dev` — wait for `/api/v1/health` before probing.
- Commit per task on branch `fix/system-check-2026-09-06` (current) with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Seeded customer for live checks: `testcustomer@kartseek.com` / `TestPass123!` (obtain a token via `POST /api/v1/auth/login`; never type the password into a browser form during automation — inject the token as the audit harness does).

## Phase map (§34 of the brief)

| Phase                      | Tasks                                                                                                                              | Priority                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1 · Customer foundation    | Tasks 1–6 below (env, region header, address book, variant pricing/stock, payment truthfulness + success route, suspended sellers) | P0                                      |
| 2 · Shopping completeness  | B-01 … B-09                                                                                                                        | P1                                      |
| 3 · Customer experience    | B-10 … B-16                                                                                                                        | P1/P2                                   |
| 4 · Responsive & UX        | B-17 … B-21                                                                                                                        | P1/P2                                   |
| 5 · Country & localization | B-22 … B-25                                                                                                                        | P2                                      |
| 6 · Advanced               | B-26 … B-29                                                                                                                        | P3                                      |
| Data                       | S-01 curated seed                                                                                                                  | P1 (prerequisite for demonstrating 2–5) |

Every task's acceptance criteria are its own "Acceptance" block; §35 of the brief applies to all of them (UI + route + API + data + action + persistence + loading/error/empty + mobile/tablet/desktop + country + auth + end-to-end).

---

## Task 1: Give the zone its public environment and list only active markets (MKT-001)

**Files:**

- Create: `modules/marketplace/frontend/.env.example`
- Create: `modules/marketplace/frontend/.env.local` (git-ignored; copy of the example with dev values)
- Modify: `modules/marketplace/frontend/next.config.mjs` (startup warning)
- Modify: `modules/marketplace/frontend/src/app/marketplace-layout-client.tsx:151` (`CountryPicker` options)
- Test: `modules/marketplace/frontend/src/__tests__/zone-env.spec.ts`

**Interfaces:**

- Consumes: `useRegion().allRegions` (already `getActiveCountries()` mapped to `REGIONS`), `isActiveCountry` from `@/lib/localization`.
- Produces: the zone build inlines `NEXT_PUBLIC_ACTIVE_REGIONS`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_DEFAULT_REGION`.

- [ ] **Step 1: Write the failing test**

```ts
// modules/marketplace/frontend/src/__tests__/zone-env.spec.ts
/**
 * The zone is its own Next application, so it does not inherit apps/web's
 * environment. Without NEXT_PUBLIC_ACTIVE_REGIONS the localization registry
 * treats only the home market as active and the country picker snaps every
 * choice back to Qatar. This pins the documented variables.
 */
import fs from 'node:fs';
import path from 'node:path';

const REQUIRED = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_WS_URL',
  'NEXT_PUBLIC_ACTIVE_REGIONS',
  'NEXT_PUBLIC_DEFAULT_REGION',
];

describe('zone environment', () => {
  const example = fs.readFileSync(path.resolve(__dirname, '../../.env.example'), 'utf8');

  it.each(REQUIRED)('documents %s in .env.example', (key) => {
    expect(example).toMatch(new RegExp(`^${key}=`, 'm'));
  });

  it('lists the same active regions as the shell', () => {
    const shell = fs.readFileSync(
      path.resolve(__dirname, '../../../../../apps/web/.env.local'),
      'utf8',
    );
    const pick = (src: string) =>
      (src.match(/^NEXT_PUBLIC_ACTIVE_REGIONS=(.*)$/m) ?? [])[1]?.trim();
    expect(pick(example)).toBe(pick(shell));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx jest src/__tests__/zone-env.spec.ts -w @kartseek/marketplace-frontend` (from `modules/marketplace/frontend`: `npx jest src/__tests__/zone-env.spec.ts`)
Expected: FAIL — `ENOENT: .env.example`.

- [ ] **Step 3: Create the example and the local file**

```dotenv
# modules/marketplace/frontend/.env.example
# The marketplace zone is a separate Next.js application. It does NOT read
# apps/web/.env.local. Copy this file to .env.local and keep the values in step
# with the shell's — the two must agree or the storefront offers a market the
# shell (and the gateway's ACTIVE_REGIONS) refuse.
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_ACTIVE_REGIONS=QA,IN,AE,SA
NEXT_PUBLIC_DEFAULT_REGION=QA
NEXT_PUBLIC_APP_ENV=development
```

Copy it to `modules/marketplace/frontend/.env.local` (same content). `.gitignore` already ignores `.env.local`.

- [ ] **Step 4: Warn at build/start when the list is missing**

In `modules/marketplace/frontend/next.config.mjs`, directly after the `__dirname` line:

```js
// Every market outside the home market is refused by isActiveCountry() when
// this is unset — the country picker then snaps back to Qatar on every choice.
// Loud rather than silent: the fallback renders a perfectly healthy-looking page.
if (!process.env.NEXT_PUBLIC_ACTIVE_REGIONS) {
  console.warn(
    '[marketplace-frontend] NEXT_PUBLIC_ACTIVE_REGIONS is not set — only the home market will be active. Copy .env.example to .env.local.',
  );
}
```

- [ ] **Step 5: List only active markets in the picker**

In `marketplace-layout-client.tsx`, `CountryPicker`: replace `Object.values(REGIONS).map(r => (` with `allRegions.map(r => (` and destructure it: `const { currentRegionConfig, country, setSelectedRegion, allRegions } = useRegion();`. Keep the `REGIONS` import (still used at lines 132, 352, 374).

- [ ] **Step 6: Run the test, restart the zone, verify live**

Run: `npx jest src/__tests__/zone-env.spec.ts` → PASS.
Restart the zone dev server (it inlines env at start): `preview_start` name `dev`, or `npm run dev -w @kartseek/marketplace-frontend`.
Live: open `/marketplace`, choose **India** in the picker → cookie `kartseek_country=IN`, header shows India, prices in ₹; the picker lists exactly QA, IN, AE, SA.

- [ ] **Step 7: Commit**

```bash
git add modules/marketplace/frontend/.env.example modules/marketplace/frontend/next.config.mjs modules/marketplace/frontend/src/app/marketplace-layout-client.tsx modules/marketplace/frontend/src/__tests__/zone-env.spec.ts
git commit -m "fix(marketplace-frontend): give the zone its public env so every active market can be selected"
```

**Acceptance:** picker offers only active markets; choosing one persists (`kartseek_country`) and re-renders currency/address/payment set; zone test green; warning printed when the variable is absent.

---

## Task 2: Gateway honours `X-Region-Code` for every active market (MKT-002)

**Files:**

- Modify: `apps/api/libs/region/src/region.config.ts:269-310`
- Modify: `apps/api/libs/region/src/region.guard.ts:4,37`
- Modify: `apps/api/apps/api-gateway/src/main.ts:1-5`
- Test: `apps/api/libs/region/src/region.config.spec.ts`

**Interfaces:**

- Produces: `getActiveRegionCodes(): SupportedCountryCode[]` (reads `process.env.ACTIVE_REGIONS` on every call); `isActiveRegion()` and `getActiveRegions()` use it. `ACTIVE_REGION_CODES` is removed (it was stale by construction).

- [ ] **Step 1: Write the failing test** (append inside `describe('trading markets')`)

```ts
it('reads ACTIVE_REGIONS when asked, not when the module was imported', () => {
  const previous = process.env.ACTIVE_REGIONS;
  try {
    process.env.ACTIVE_REGIONS = 'QA,IN';
    expect(isActiveRegion('IN')).toBe(true);
    expect(getActiveRegionCodes()).toEqual(['QA', 'IN']);
    process.env.ACTIVE_REGIONS = 'QA';
    expect(isActiveRegion('IN')).toBe(false);
  } finally {
    process.env.ACTIVE_REGIONS = previous;
  }
});
```

Replace every `ACTIVE_REGION_CODES` reference in the spec with `getActiveRegionCodes()` and add it to the import.

- [ ] **Step 2: Run to see it fail**

Run: `cd apps/api && npx vitest run libs/region/src/region.config.spec.ts`
Expected: FAIL — `getActiveRegionCodes is not a function`.

- [ ] **Step 3: Make the list lazy**

```ts
// region.config.ts — replace the ACTIVE_REGION_CODES IIFE
/**
 * Markets the platform trades in, from ACTIVE_REGIONS.
 *
 * Read at call time. A module-scope constant was evaluated while the import
 * graph loaded — before main.ts had run dotenv.config() — so it always held
 * only the home market and every X-Region-Code header was refused.
 */
export function getActiveRegionCodes(): SupportedCountryCode[] {
  const raw = process.env.ACTIVE_REGIONS?.trim();
  if (!raw) return [DEFAULT_REGION];
  const parsed = raw
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c): c is SupportedCountryCode => c in REGION_CONFIGS);
  // An env var naming only unknown codes must not silently close every market.
  return parsed.length > 0 ? parsed : [DEFAULT_REGION];
}

export function isActiveRegion(code: string | undefined | null): code is SupportedCountryCode {
  if (!code) return false;
  return (getActiveRegionCodes() as string[]).includes(code.toUpperCase());
}

export function getActiveRegions(): RegionConfig[] {
  return getActiveRegionCodes()
    .map((c) => REGION_CONFIGS[c])
    .filter((r) => r?.isActive);
}
```

`region.guard.ts`: import `getActiveRegionCodes` instead of `ACTIVE_REGION_CODES` and use `getActiveRegionCodes().join(', ')` in the message.

- [ ] **Step 4: Load env before any import in the gateway**

`apps/api/apps/api-gateway/src/main.ts` — make the first two lines:

```ts
// Must be the very first import: ES imports are hoisted, so a `dotenv.config()`
// call further down runs only after every imported module has already read
// process.env. `dotenv/config` executes inside the import graph, first.
import 'dotenv/config';
```

Delete `import * as dotenv from 'dotenv'; dotenv.config();`. Grep `apps/api/apps/*/src/main.ts` and `modules/*/backend/src/main.ts` for the same `dotenv.config()` shape and apply the same change (one other service has it).

- [ ] **Step 5: Run the spec and the region lib tests**

Run: `cd apps/api && npx vitest run libs/region` → PASS.

- [ ] **Step 6: Rebuild, wait for health, verify live**

`nest build` runs under the dev watcher; wait until `curl -s http://127.0.0.1:3001/api/v1/health` is 200 again, then:

```bash
curl -s -H "X-Region-Code: IN" "http://127.0.0.1:3001/api/v1/marketplace/products?limit=1"
```

Expected: `"region":"IN"` (total may be 0 until S-01 seeds India). `X-Region-Code: ZZ` → `"region":"QA"`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/libs/region apps/api/apps/api-gateway/src/main.ts
git commit -m "fix(gateway): read ACTIVE_REGIONS at call time so X-Region-Code works for every active market"
```

**Acceptance:** header-scoped reads return the requested active region; unknown/closed codes fall back; region lib tests green; `nest build` green.

---

## Task 3: Address book renders any stored address and reports load state truthfully (MKT-013)

**Files:**

- Create: `modules/marketplace/frontend/src/app/addresses/normalise.ts`
- Modify: `modules/marketplace/frontend/src/app/addresses/page.tsx:14-30,78-110,236-262`
- Test: `modules/marketplace/frontend/src/__tests__/address-normalise.spec.ts`

**Interfaces:**

- Consumes: `formatAddressLines(value, { country, includeName, includeCountry })` from `@/lib/localization`; `useAuth().isHydrated`.
- Produces: `normaliseSavedAddress(raw: Record<string, unknown>, viewerCountry: string): SavedAddressRow` where
  `SavedAddressRow = { id: string; name: string; phone: string; type: 'home'|'work'|'other'; isDefault: boolean; country: string; foreign: boolean; lines: string[]; raw: Record<string, unknown> }`.

- [ ] **Step 1: Write the failing test**

```ts
// modules/marketplace/frontend/src/__tests__/address-normalise.spec.ts
import { normaliseSavedAddress } from '@/app/addresses/normalise';

const INDIAN = {
  id: 'ADDR-1',
  label: 'Home',
  fullName: 'Test Customer',
  phone: '+919999999999',
  line1: '14 MG Road',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
  country: 'IN',
  isDefault: true,
};
const QATARI = {
  id: 'ADDR-2',
  type: 'work',
  fullName: 'Test Customer',
  phone: '66301482',
  buildingNumber: '12',
  streetNumber: '223',
  zoneNumber: '55',
  area: 'Al Sadd',
  city: 'Doha',
  country: 'QA',
};

describe('normaliseSavedAddress', () => {
  it('maps label→type and never yields an unknown type', () => {
    expect(normaliseSavedAddress(INDIAN, 'QA').type).toBe('home');
    expect(normaliseSavedAddress({ id: 'x' }, 'QA').type).toBe('other');
  });

  it('renders an address in its own country format, marked foreign for the viewer', () => {
    const row = normaliseSavedAddress(INDIAN, 'QA');
    expect(row.foreign).toBe(true);
    expect(row.lines.join(' | ')).toContain('Mumbai');
    expect(row.lines.join(' | ')).toContain('400001');
  });

  it('renders a home-market address without a country line', () => {
    const row = normaliseSavedAddress(QATARI, 'QA');
    expect(row.foreign).toBe(false);
    expect(row.lines.some((l) => /Zone 55/.test(l))).toBe(true);
    expect(row.lines.some((l) => /Qatar/.test(l))).toBe(false);
  });

  it('survives rows with no address fields at all', () => {
    expect(() => normaliseSavedAddress({ id: 'empty' }, 'QA')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to see it fail** — `npx jest src/__tests__/address-normalise.spec.ts` → FAIL (module not found).

- [ ] **Step 3: Implement the normaliser**

```ts
// modules/marketplace/frontend/src/app/addresses/normalise.ts
import { formatAddressLines, isCountryCode } from '@/lib/localization';

export type SavedAddressType = 'home' | 'work' | 'other';

export interface SavedAddressRow {
  id: string;
  name: string;
  phone: string;
  type: SavedAddressType;
  isDefault: boolean;
  country: string;
  /** Stored for a different market than the one being browsed. */
  foreign: boolean;
  lines: string[];
  raw: Record<string, unknown>;
}

const str = (v: unknown) => (v == null ? '' : String(v)).trim();

/**
 * One saved address, whatever shape user-service stored it in.
 *
 * Rows carry `label` ("Home") rather than `type`, and an address saved in one
 * market has that market's fields (line1/city/state/postalCode in India,
 * building/street/zone in Qatar). The page used to index `TYPE_CONFIG[row.type]`
 * and print `line1, city, state – pincode` unconditionally, so a row without
 * `type` threw inside render and a Qatari row printed as "undefined".
 */
export function normaliseSavedAddress(
  raw: Record<string, unknown>,
  viewerCountry: string,
): SavedAddressRow {
  const typeRaw = str(raw.type || raw.label).toLowerCase();
  const type: SavedAddressType = typeRaw === 'home' || typeRaw === 'work' ? typeRaw : 'other';
  const country = isCountryCode(str(raw.country)) ? str(raw.country).toUpperCase() : viewerCountry;
  const foreign = country !== viewerCountry.toUpperCase();
  const lines = formatAddressLines(
    { ...raw, country, fullName: str(raw.fullName || raw.name) } as Parameters<
      typeof formatAddressLines
    >[0],
    { country, includeName: false, includeCountry: foreign },
  );
  return {
    id: str(raw.id),
    name: str(raw.fullName || raw.name),
    phone: str(raw.phone),
    type,
    isDefault: raw.isDefault === true,
    country,
    foreign,
    lines,
    raw,
  };
}
```

- [ ] **Step 4: Run the test** → PASS.

- [ ] **Step 5: Use it in the page and fix the load state**

In `addresses/page.tsx`:

1. `const { user, isHydrated } = useAuth();` and in `loadAddresses`: `if (!isHydrated) return;` before the `!user?.id` branch; on success call `setLoadFailed(false);` right after `setAddresses(...)`; add `isHydrated` to the `useCallback` deps.
2. Keep the local `Address` type for the edit form, but map rows for display: `const rows = useMemo(() => addresses.map((a) => normaliseSavedAddress(a as any, country.code)), [addresses, country.code]);`
3. In the list, iterate `rows`; replace `const cfg = TYPE_CONFIG[addr.type];` with `const cfg = TYPE_CONFIG[row.type];` and the three `<p>` address lines with `row.lines.map((l) => <p key={l} className="text-sm text-slate-600">{l}</p>)`; show a badge when `row.foreign`: `<span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Delivers in {getCountry(row.country).name}</span>` (import `getCountry` from `@/lib/localization`).
4. `openEdit(row.raw as Address)` keeps the edit path working for same-market rows; for `row.foreign` hide the Edit button (the form is region-shaped) and keep Delete.

- [ ] **Step 6: Verify live**

Signed in as the seeded customer (whose saved address is Indian) open `/marketplace/addresses` at 375 and 1440: the page renders the Mumbai address with a "Delivers in India" badge, no error boundary, no persistent "could not load" banner; add a Qatar address → it appears with building/street/zone lines; delete works.

- [ ] **Step 7: Commit**

```bash
git add modules/marketplace/frontend/src/app/addresses modules/marketplace/frontend/src/__tests__/address-normalise.spec.ts
git commit -m "fix(marketplace-frontend): address book renders any stored market shape and clears its failure state"
```

**Acceptance:** no crash for any stored row; foreign rows labelled; failure banner only after a real failure; add/edit/delete/default work; both widths.

---

## Task 4: Variant-aware pricing and stock from cart to seller order (MKT-010)

**Files:**

- Modify: `modules/marketplace/backend/src/catalog/catalog.service.ts:532-600` (`priceOrderItems`), `:636-700` (`reserveListingStock`), `:828-855` (`releaseListingStock`)
- Modify: `modules/marketplace/backend/src/seller/seller.service.ts:101-160` (`createSellerOrders` item shape)
- Modify: `apps/api/apps/api-gateway/src/services/marketplace-order.service.ts:100-125,220-245`
- Modify: `apps/api/apps/api-gateway/src/controllers/marketplace.controller.ts:430-470` (`addResolvedItem`)
- Modify: `modules/marketplace/frontend/src/app/checkout/page.tsx:41-47,116-126,310-318`
- Modify: `modules/marketplace/frontend/src/app/components/product-card.tsx:285-300,425-445`
- Test: `modules/marketplace/backend/src/catalog/catalog.service.spec.ts`

**Interfaces:**

- Produces (backend): `priceOrderItems(items: Array<{ productId: string; quantity: number; variantId?: string }>)` → each priced line gains `variantId: string | null`, `variantName: string | null`; `name` becomes `"<product> — <variant>"` when a variant is priced. `reserveListingStock(lines: Array<{ listingId?; productId?; quantity; variantId? }>)` → `reserved: Array<{ listingId; quantity; variantId?: string }>`; `releaseListingStock` accepts the same rows.
- Produces (gateway → order-service): `items[].variantId`, `items[].variantName`; seller order items carry `variantId`.
- Produces (zone): `CheckoutItem.variantId?: string`; checkout sends `{ productId, quantity, variantId }`.

- [ ] **Step 1: Write the failing backend tests** (inside `describe('CatalogService')`, using the existing `mockRepoFactory` repos — `productRepo`, `listingRepo`, `variantRepo` are the injected mocks)

```ts
describe('priceOrderItems with variants', () => {
  const PID = '2b3c706d-185e-4b7e-86e2-00b29682c552';
  const VID = '810a6dba-5f4b-4903-8001-47da6e9f1aa8';
  const product = {
    id: PID,
    name: 'iPhone 15 Pro',
    mrp: '5850.00',
    is_active: true,
    approval_status: 'APPROVED',
  };
  const listing = {
    id: 'L1',
    sellingPrice: '5050.00',
    stockQuantity: 335,
    isBuyBoxWinner: true,
    product: { id: PID },
    seller: { id: 'S1' },
  };
  const variant = {
    id: VID,
    productId: PID,
    variantName: '128GB / Midnight Black',
    sellingPrice: '115900.00',
    mrp: '134900.00',
    stockQuantity: 24,
    isActive: true,
  };

  beforeEach(() => {
    productRepo.find.mockResolvedValue([product]);
    listingRepo.find.mockResolvedValue([listing]);
  });

  it('charges the variant price and keeps the listing for seller attribution', async () => {
    variantRepo.find.mockResolvedValue([variant]);
    const res = await service.priceOrderItems([{ productId: PID, quantity: 1, variantId: VID }]);
    expect(res.ok).toBe(true);
    expect(res.items[0]).toMatchObject({
      unitPrice: 115900,
      variantId: VID,
      listingId: 'L1',
      sellerId: 'S1',
      name: 'iPhone 15 Pro — 128GB / Midnight Black',
    });
    expect(res.subtotal).toBe(115900);
  });

  it('refuses a variant product ordered without a variant', async () => {
    variantRepo.find.mockResolvedValue([variant]);
    const res = await service.priceOrderItems([{ productId: PID, quantity: 1 }]);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/choose an option/i);
  });

  it('refuses more units than the variant holds', async () => {
    variantRepo.find.mockResolvedValue([{ ...variant, stockQuantity: 1 }]);
    const res = await service.priceOrderItems([{ productId: PID, quantity: 2, variantId: VID }]);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Only 1 left/);
  });

  it('still prices a product with no variants from its buy-box listing', async () => {
    variantRepo.find.mockResolvedValue([]);
    const res = await service.priceOrderItems([{ productId: PID, quantity: 2 }]);
    expect(res.ok).toBe(true);
    expect(res.items[0]).toMatchObject({ unitPrice: 5050, variantId: null });
  });
});
```

- [ ] **Step 2: Run to see them fail** — `cd modules/marketplace/backend && npx jest src/catalog/catalog.service.spec.ts -t "variants"` → 3 of 4 FAIL.

- [ ] **Step 3: Implement pricing by variant**

In `priceOrderItems` after the listings query:

```ts
// Every active variant of every product in the basket, one query. A product
// that has variants must be ordered *by* variant: the parent listing's price
// is not what any SKU sells for, and the cart used to charge it regardless.
const variants = ids.length
  ? await this.variantRepo.find({ where: { productId: In(ids), isActive: true } })
  : [];
const variantsByProduct = new Map<string, ProductVariant[]>();
for (const v of variants) {
  const bucket = variantsByProduct.get(v.productId) ?? [];
  bucket.push(v);
  variantsByProduct.set(v.productId, bucket);
}
```

and inside the `lines.map` after the `!listing` check:

```ts
const variantId = String(line?.variantId ?? '');
const productVariants = variantsByProduct.get(productId) ?? [];
let variant: ProductVariant | undefined;
if (variantId) {
  variant = productVariants.find((v) => v.id === variantId);
  if (!variant) return fail('Selected option is not available');
} else if (productVariants.length > 0) {
  return fail('Please choose an option (size, colour…) for this product');
}

const unitPrice = Number(variant ? variant.sellingPrice : listing.sellingPrice);
if (!Number.isFinite(unitPrice) || unitPrice <= 0) return fail('Product has no valid price');
const available = variant ? Number(variant.stockQuantity) : listing.stockQuantity;
if (available < quantity) return fail(`Only ${available} left in stock`);
```

and in the returned object: `name: variant?.variantName ? `${product.name} — ${variant.variantName}` : product.name`, `mrp: Number(variant?.mrp ?? product.mrp) || 0`, `variantId: variant?.id ?? null`, `variantName: variant?.variantName ?? null`. Update the parameter type to include `variantId?: string`.

- [ ] **Step 4: Reserve and release variant stock in the same transaction**

`reserveListingStock`: extend the mapped `wanted` rows with `variantId: String(l?.variantId ?? '')`; inside the transaction loop, after the listing update succeeds:

```ts
if (line.variantId) {
  const v = await mgr
    .createQueryBuilder()
    .update(ProductVariant)
    .set({ stockQuantity: () => `"stockQuantity" - :quantity` })
    .where('id = :vid', { vid: line.variantId })
    .andWhere('"isActive" = true')
    .andWhere('"stockQuantity" >= :quantity')
    .setParameter('quantity', line.quantity)
    .execute();
  if (!v.affected) {
    throw new BadRequestException(
      `Not enough stock for the selected option of ${line.productId || line.listingId}`,
    );
  }
}
reserved.push({
  listingId: line.listingId,
  quantity: line.quantity,
  ...(line.variantId ? { variantId: line.variantId } : {}),
});
```

`releaseListingStock(lines: Array<{ listingId?: string; quantity: number; variantId?: string }>)`: after the listing increment, if `line.variantId` run the mirror `update(ProductVariant).set({ stockQuantity: () => '"stockQuantity" + :quantity' }).where('id = :vid', { vid })`. Import `ProductVariant` is already present.

- [ ] **Step 5: Carry the variant through the gateway and the seller projection**

`marketplace-order.service.ts`:

- pricing payload: `items: requested.map((i: any) => ({ productId: i?.productId, quantity: i?.quantity, variantId: i?.variantId || undefined }))`
- `items` map: add `variantId: line.variantId ?? undefined, variantName: line.variantName ?? undefined`.
- the `RESERVE_LISTING_STOCK` call already sends `{ items }` — the rows now carry `variantId`; `releaseStock` sends `reserved` which now carries it too.

`seller.service.ts` `createSellerOrders`: widen the `items` element type with `variantId?: string; variantName?: string;` and set `variantId: l.variantId ?? '', sellerSku: l.variantName ?? ''` in the projected item (the `sellerSku` slot is the human label the seller sees; `MarketplaceOrder.items` is jsonb so no migration).

`marketplace.controller.ts` `addResolvedItem`: after loading `product`, price the line through the same authority the checkout uses:

```ts
const quantity = Number((payload as any)?.quantity ?? 1) || 1;
const variantId = (payload as any)?.variantId || undefined;
const pricing: any = await this.sendToMarketplace(MARKETPLACE_PATTERNS.PRICE_ORDER_ITEMS, {
  items: [{ productId, quantity, variantId }],
});
if (!pricing?.ok || !pricing.items?.[0]?.ok) {
  throw new HttpException(pricing?.reason || 'Product is not purchasable', HttpStatus.CONFLICT);
}
const priced = pricing.items[0];
const price = Number(priced.unitPrice);
```

and the line becomes `name: priced.name, price, quantity, imageUrl, variantId, serviceType: 'marketplace'`. Remove the local buy-box computation (`listings`/`buyBox`). Keep the product fetch only for `images`.

- [ ] **Step 6: Send the variant from checkout, and stop cards adding variant products blind**

`checkout/page.tsx`: `interface CheckoutItem { …; variantId?: string; }`; in `orderItems` add `variantId: i.variantId`; in `placeOrder` items: `orderItems.map((i) => ({ productId: i.productId, quantity: i.qty, variantId: i.variantId }))`.

`product-card.tsx`: `const hasVariants = (product.variantAxes?.length ?? 0) > 0;` and in the button block: when `hasVariants`, render a `next/link` to the PDP instead of the add button:

```tsx
          {linkable && hasVariants ? (
            <Link
              href={zoneHref(productPath(product))}
              aria-label={`Choose options for ${product.title}`}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold border bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Choose options
            </Link>
          ) : linkable && ( …existing button… )}
```

(`Link` from `next/link`, `SlidersHorizontal` from `lucide-react`.)

- [ ] **Step 7: Run backend tests, rebuild, verify live**

`cd modules/marketplace/backend && npx jest src/catalog` → PASS. Wait for marketplace-service and the gateway to come back (`/api/v1/health` 200 and `GET /marketplace/products?limit=1` 200).
Live (token from `POST /auth/login`):

```bash
curl -s -X POST http://127.0.0.1:3001/api/v1/marketplace/cart -H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "X-Region-Code: QA" \
  -d '{"productId":"2b3c706d-185e-4b7e-86e2-00b29682c552","quantity":1,"variantId":"810a6dba-5f4b-4903-8001-47da6e9f1aa8"}'
```

Expected: the cart line shows `price: 115900` and name `iPhone 15 Pro (256GB) – Titanium Blue — 128GB / Midnight Black`. Adding without `variantId` → 409 "Please choose an option". Place an order from the browser with that line → order item `price 115900`, `variantId` set; `GET /marketplace/products/<id>/variants` shows that variant's `stockQuantity` decremented by 1; cancel the order.

- [ ] **Step 8: Commit**

```bash
git add modules/marketplace/backend/src/catalog modules/marketplace/backend/src/seller/seller.service.ts apps/api/apps/api-gateway/src/services/marketplace-order.service.ts apps/api/apps/api-gateway/src/controllers/marketplace.controller.ts modules/marketplace/frontend/src/app/checkout/page.tsx modules/marketplace/frontend/src/app/components/product-card.tsx
git commit -m "fix(marketplace): price, reserve and record the selected variant from cart to seller order"
```

**Acceptance:** variant price charged in cart and order; variant stock reserved/released; cart and order lines name the variant; variant products cannot be added without a selection; tests green; live probe as above.

---

## Task 5: Only a method that can settle the order may place it; success has its own route (MKT-011, MKT-012, MKT-034)

**Files:**

- Modify: `packages/shared-core/src/localization/payments.ts:12-26,129-160`
- Modify: `packages/shared-ui/src/shared/payment-method-selector.tsx:24-50`
- Create: `apps/api/apps/api-gateway/src/services/marketplace-payment-policy.ts`
- Modify: `apps/api/apps/api-gateway/src/services/marketplace-order.service.ts:100-104`
- Modify: `modules/marketplace/frontend/src/app/checkout/page.tsx:91-103,280-345,346-400`
- Test: `apps/web/src/__tests__/payments-settleable.spec.ts`, `apps/api/apps/api-gateway/src/services/marketplace-payment-policy.spec.ts`

**Interfaces:**

- Produces (shared-core): `SETTLEABLE_METHODS: readonly PaymentMethodType[]` (= `['cod']` until online payment or wallet debit exists — see B-03), `isSettleable(type: string): boolean`, `PaymentContext.requireSettleable?: boolean` (when true, `getPaymentRestriction` returns `'Not available yet — online payments are not connected'` for non-settleable methods).
- Produces (shared-ui): `PaymentMethodSelector` prop `requireSettleable?: boolean` passed into the context.
- Produces (gateway): `assertSettleablePayment(method: string | undefined, amount: number, regionCode: string | undefined): void` — throws `HttpException(400)`.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/src/__tests__/payments-settleable.spec.ts
import { getPaymentMethods, getPaymentRestriction, isSettleable } from '@/lib/localization';

describe('settleable payment methods', () => {
  it('only cash on delivery can settle an order until a PSP is connected', () => {
    expect(isSettleable('cod')).toBe(true);
    for (const t of [
      'card',
      'apple_pay',
      'google_pay',
      'bank_transfer',
      'debit_national',
      'wallet',
    ]) {
      expect(isSettleable(t)).toBe(false);
    }
  });

  it('marks every other method as unavailable when settlement is required', () => {
    const methods = getPaymentMethods({ country: 'QA', amount: 100, requireSettleable: true });
    const blocked = methods.filter((m) => m.type !== 'cod');
    expect(blocked.length).toBeGreaterThan(0);
    for (const m of blocked) {
      expect(
        getPaymentRestriction(m, { country: 'QA', amount: 100, requireSettleable: true }),
      ).toMatch(/not available yet/i);
    }
    const cod = methods.find((m) => m.type === 'cod')!;
    expect(
      getPaymentRestriction(cod, { country: 'QA', amount: 100, requireSettleable: true }),
    ).toBeNull();
  });

  it('still applies the cash-on-delivery ceiling', () => {
    const cod = getPaymentMethods({ country: 'QA' }).find((m) => m.type === 'cod')!;
    expect(
      getPaymentRestriction(cod, { country: 'QA', amount: 5960, requireSettleable: true }),
    ).toMatch(/up to/);
  });
});
```

```ts
// apps/api/apps/api-gateway/src/services/marketplace-payment-policy.spec.ts
import { describe, expect, it } from 'vitest';
import { HttpException } from '@nestjs/common';
import { assertSettleablePayment } from './marketplace-payment-policy';

describe('assertSettleablePayment', () => {
  it('accepts cash on delivery within the regional ceiling', () => {
    expect(() => assertSettleablePayment('COD', 4999, 'QA')).not.toThrow();
  });
  it('refuses cash on delivery above the ceiling', () => {
    expect(() => assertSettleablePayment('COD', 5960, 'QA')).toThrow(HttpException);
  });
  it('refuses every method that nothing settles', () => {
    for (const m of [
      'CARD',
      'WALLET_APPLE',
      'WALLET_GOOGLE',
      'BANK_TRANSFER',
      'ONLINE',
      'WALLET',
      undefined,
    ]) {
      expect(() => assertSettleablePayment(m, 100, 'QA')).toThrow(HttpException);
    }
  });
  it('falls back to the home market ceiling when no region is known', () => {
    expect(() => assertSettleablePayment('COD', 5001, undefined)).toThrow(HttpException);
  });
});
```

- [ ] **Step 2: Run them to see them fail** — `cd apps/web && npx jest src/__tests__/payments-settleable.spec.ts`; `cd apps/api && npx vitest run apps/api-gateway/src/services/marketplace-payment-policy.spec.ts` → both FAIL (missing exports / module).

- [ ] **Step 3: Implement the shared-core policy**

`payments.ts`: add to `PaymentContext`: `/** Only offer methods the platform can actually settle today. */ requireSettleable?: boolean;` and after `WIRE_METHOD`:

```ts
/**
 * Methods that actually settle an order today.
 *
 * Nothing on the platform calls `POST /payments/initiate`, order-service does
 * not debit the customer wallet, and no PSP is configured — so a card, Apple
 * Pay or bank-transfer "payment" placed an order that nobody ever paid for.
 * Grow this list only when the corresponding settlement path exists (see
 * plan tasks B-03 for the wallet and B-04 for a PSP).
 */
export const SETTLEABLE_METHODS: readonly PaymentMethodType[] = ['cod'] as const;

export function isSettleable(type: string): boolean {
  return (SETTLEABLE_METHODS as readonly string[]).includes(type);
}
```

In `getPaymentRestriction`, as the first check:

```ts
if (ctx.requireSettleable && !isSettleable(method.type)) {
  return 'Not available yet — online payments are not connected';
}
```

Export `isSettleable` and `SETTLEABLE_METHODS` from `packages/shared-core/src/localization/index.ts` beside `getPaymentRestriction`.

`payment-method-selector.tsx`: add `requireSettleable?: boolean` to the props, destructure it, and pass `requireSettleable` into both the `getPaymentMethodsFor({...})` call and the `getPaymentRestriction(method, {...})` context.

- [ ] **Step 4: Implement the gateway policy**

```ts
// apps/api/apps/api-gateway/src/services/marketplace-payment-policy.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { DEFAULT_REGION } from '@app/region';

/** Wire methods the platform can settle. Mirrors SETTLEABLE_METHODS in shared-core. */
export const SETTLEABLE_WIRE_METHODS: readonly string[] = ['COD'];

/** Cash-on-delivery ceiling per market, in that market's currency (mirrors shared-core COD_LIMITS). */
const COD_LIMITS: Record<string, number> = {
  QA: 5000,
  AE: 5000,
  SA: 5000,
  BH: 500,
  KW: 400,
  OM: 500,
  IN: 50000,
};

/**
 * Refuse an order whose payment nothing will collect.
 *
 * The browser hides such methods too, but a request can name any method it
 * likes; this is the check that keeps an unpaid order out of the system.
 */
export function assertSettleablePayment(
  method: string | undefined,
  amount: number,
  regionCode: string | undefined,
): void {
  const wire = String(method ?? '').toUpperCase();
  if (!SETTLEABLE_WIRE_METHODS.includes(wire)) {
    throw new HttpException(
      'This payment method is not available yet. Please choose cash on delivery.',
      HttpStatus.BAD_REQUEST,
    );
  }
  const region = (regionCode || DEFAULT_REGION).toUpperCase();
  const limit = COD_LIMITS[region] ?? COD_LIMITS[DEFAULT_REGION];
  if (wire === 'COD' && amount > limit) {
    throw new HttpException(
      `Cash on delivery is available on orders up to ${limit} in ${region}.`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
```

(If `DEFAULT_REGION` is not exported from `@app/region`'s index, import it from `@app/region/region.config` — check `apps/api/libs/region/src/index.ts`.)

In `marketplace-order.service.ts` `placeOrder`, right after the coupon/gift-card amounts are known and before `RESERVE_LISTING_STOCK`:

```ts
// ── 2c. A payment nothing can collect must not create an order ─────────
assertSettleablePayment(
  payload?.paymentMethod,
  Math.max(subtotal - discount - giftCardAmount, 0),
  String(req?.headers?.['x-region-code'] ?? '') || undefined,
);
```

(import it at the top of the file).

- [ ] **Step 5: Checkout picks, explains and gates**

`checkout/page.tsx`:

1. Pass `requireSettleable` to the selector: `<PaymentMethodSelector value={payMethod} onChange={setPayMethod} amount={total} module="marketplace" walletBalance={walletBalance} requireSettleable />`.
2. Default method: replace `(defaultPaymentMethod?.type ?? 'card')` with the first method that has no restriction:

```ts
const settleableDefault = useMemo(() => {
  const methods = getPaymentMethodsFor({
    amount: total,
    module: 'marketplace',
    walletBalance,
    requireSettleable: true,
  });
  return (
    methods.find(
      (m) =>
        !getPaymentRestriction(m, {
          country: country.code,
          language: currentLanguage,
          amount: total,
          walletBalance,
          requireSettleable: true,
        }),
    )?.type ?? ''
  );
}, [getPaymentMethodsFor, total, walletBalance, country.code, currentLanguage]);
```

(`getPaymentMethodsFor`, `currentLanguage` come from `useRegion()`; `getPaymentRestriction` from `@/lib/localization`.) Use `settleableDefault` where `'card'` was the fallback. 3. Gate: compute `const payBlockedReason = useMemo(() => { const m = getPaymentMethodsFor({ amount: total, module: 'marketplace', walletBalance, requireSettleable: true }).find((x) => x.type === payMethod); return !m ? 'Choose a payment method that can settle this order.' : getPaymentRestriction(m, { country: country.code, language: currentLanguage, amount: total, walletBalance, requireSettleable: true }); }, [...]);` — disable "Review Order" and "Place Order" while `payBlockedReason` is non-null and show it under the selector in `text-sm text-amber-700`. When no method is settleable (basket above the COD ceiling), show: "No payment method can settle a basket of {fmt(total)} yet. Cash on delivery is available up to {fmt(getCodLimit(country.code))} — reduce the basket, or check back once online payments launch." 4. Remove the card form entirely (the disabled "Card Number … CVV" block). 5. Success: replace the `placed` inline screen with navigation: after `cart.clear()`: `router.push(`/checkout/success?orderId=${encodeURIComponent(order?.orderNumber ?? order?.id ?? '')}`)` (`useRouter` from `next/navigation`; zone-relative path). Delete the `if (placed) { … }` branch and the `placed` state. On `checkout/success/page.tsx` replace "We've emailed your confirmation" with "You'll see status updates on your orders page." (until B-13 wires notifications). 6. Review step: render the chosen address (`formatAddressLines(address, { country: country.code })`) and the payment label (`getPaymentLabel(method, currentLanguage)`) with "Change" buttons that set the step — this closes MKT-017's review half at the same time.

- [ ] **Step 6: Run tests, rebuild, verify live**

`cd apps/web && npx jest src/__tests__/payments-settleable.spec.ts` → PASS; `cd apps/api && npx vitest run apps/api-gateway/src/services/marketplace-payment-policy.spec.ts` → PASS; `npm run type-check -w @kartseek/marketplace-frontend`.
Live: with a basket under QR 5,000 only "Cash on Delivery" is selectable and the review step shows address + method; Place Order → lands on `/marketplace/checkout/success?orderId=…`; with a basket over 5,000 the button is disabled with the explanation; `curl -X POST /marketplace/orders` with `paymentMethod: "WALLET_APPLE"` → 400.

- [ ] **Step 7: Commit**

```bash
git add packages/shared-core/src/localization packages/shared-ui/src/shared/payment-method-selector.tsx apps/api/apps/api-gateway/src/services/marketplace-payment-policy.ts apps/api/apps/api-gateway/src/services/marketplace-payment-policy.spec.ts apps/api/apps/api-gateway/src/services/marketplace-order.service.ts modules/marketplace/frontend/src/app/checkout apps/web/src/__tests__/payments-settleable.spec.ts
git commit -m "fix(checkout): only a settleable payment method can place an order; confirmation has its own route"
```

**Acceptance:** no order can be created with an unsettled method (client and server); COD ceiling enforced both sides; review shows address + method; confirmation route reached; no false "emailed" claim; tests green.

---

## Task 6: Storefront hides listings of suspended sellers; official store restored (MKT-003 code half)

**Files:**

- Modify: `modules/marketplace/backend/src/catalog/catalog.service.ts:186-200` (`localSellerExpr`), `:265-275` (`liveListing`), `:532-560` (`priceOrderItems` seller check)
- Test: `modules/marketplace/backend/src/catalog/catalog.service.spec.ts`
- Data: `apps/api/scripts/seed/seed-marketplace.ts` (official store status)

- [ ] **Step 1: Write the failing test**

```ts
describe('suspended sellers', () => {
  it('refuses to price a line whose only listing belongs to a suspended seller', async () => {
    productRepo.find.mockResolvedValue([
      { id: 'P', name: 'X', mrp: '10', is_active: true, approval_status: 'APPROVED' },
    ]);
    listingRepo.find.mockResolvedValue([
      {
        id: 'L',
        sellingPrice: '10',
        stockQuantity: 5,
        product: { id: 'P' },
        seller: { id: 'S', verificationStatus: 'SUSPENDED' },
      },
    ]);
    variantRepo.find.mockResolvedValue([]);
    const res = await service.priceOrderItems([{ productId: 'P', quantity: 1 }]);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/seller/i);
  });
});
```

- [ ] **Step 2: Run to see it fail** → FAIL (`ok: true`).

- [ ] **Step 3: Implement**

`priceOrderItems`: when picking the buy box, skip listings whose `seller?.verificationStatus === 'SUSPENDED' || seller?.isActive === false`; if none remain: `fail('This seller is not accepting orders right now')`.

`localSellerExpr()` / `regionPredicate()`: add `AND sll."verificationStatus" <> 'SUSPENDED' AND sll."isActive" = true` to the EXISTS subquery (confirm the quoted column names against `seller.entity.ts` — `verificationStatus` is a camelCase column, so it must be double-quoted).

`liveListing(alias)` (the SQL string used for `leftJoinAndSelect('p.listings', 'listings', …)`) is per-listing and has no seller join; leave it, but in `getProducts`/`searchProducts` add `.leftJoin('listings.seller', 'lseller')` and `.andWhere('(lseller.id IS NULL OR (lseller.verificationStatus <> :suspended AND lseller.isActive = true))', { suspended: 'SUSPENDED' })` so a suspended seller's rows never reach cards. Clear the Redis `products:*` and `marketplace:home:*` keys after deploying (the reads are cached).

- [ ] **Step 4: Restore the official store's status (data)**

Via the marketplace database (port 5432, schema `marketplace`, table path per `tablePath` — see `docs/audits` memory on `public.*` decoys):

```sql
UPDATE marketplace.sellers SET "verificationStatus" = 'VERIFIED' WHERE "storeSlug" = 'kartseek-official';
DELETE FROM marketplace.sellers WHERE "businessName" LIKE 'Probe Store %' OR "businessName" LIKE 'XXXXXXXX%';
```

and in `seed-marketplace.ts` make the official store upsert set `verificationStatus: 'VERIFIED'`. Note the SUSPENDED status came from an earlier admin test run; S-01 replaces this hand edit with a curated seed.

- [ ] **Step 5: Run tests, rebuild, verify live**

`npx jest src/catalog` → PASS. `GET /marketplace/products?limit=1` → 179 (official store verified again); temporarily suspend a seller via the admin route and confirm its products vanish from `/marketplace/products` and `POST /marketplace/cart` refuses them; restore.

- [ ] **Step 6: Commit**

```bash
git add modules/marketplace/backend/src/catalog apps/api/scripts/seed/seed-marketplace.ts
git commit -m "fix(marketplace): storefront and pricing ignore listings of suspended sellers"
```

**Acceptance:** suspended sellers' listings absent from every storefront read and refused at cart/checkout; official store live; directory data cleaned.

---

## Phase 2–6 backlog (Deliverables 12–13)

Each card: files → change → acceptance. Estimates: S ≤ ½ day, M ≤ 2 days, L ≤ 1 week.

### Phase 2 · Shopping completeness (P1)

**B-01 Saved-address picker in checkout (MKT-014) · M**
Files: `modules/marketplace/frontend/src/app/checkout/page.tsx` (address step), `packages/shared-core/src/hooks/use-saved-addresses.ts`, new `modules/marketplace/frontend/src/app/checkout/address-picker.tsx`.
Change: list `useSavedAddresses().addresses` filtered to the active country as radio cards (default first), "Add new address" toggles the `AddressForm`; a "Save to my addresses" checkbox posts the new address through `useSavedAddresses().add` before placing. Foreign-market rows are shown disabled with "Delivers in {country}".
Acceptance: returning customer completes the address step in one tap; new address saved appears in `/marketplace/addresses`; validation errors per field; works at 375 px.

**B-02 Guest cart merges at sign-in (MKT-015) · S**
Files: `packages/shared-core/src/contexts/cart-context.tsx:145-175`.
Change: on the `false→true` transition of `isAuthenticated`, read `kartseek_guest_cart_v1`, `POST /marketplace/cart` each line (`productId, quantity, variantId`), then `resync()` and clear the key. Skip lines the server refuses (toast "1 item could not be added").
Acceptance: add as guest → sign in → cart shows the line; refresh keeps it; test in `apps/web/src/__tests__/cart-merge.spec.ts` covering merge order and refusal.

**B-03 Wallet settlement at placement (MKT-011 follow-up) · M**
Files: `apps/api/apps/api-gateway/src/services/marketplace-order.service.ts` (after `place_order`), `apps/api/apps/api-gateway/src/services/marketplace-payment-policy.ts` (`SETTLEABLE_WIRE_METHODS` += `WALLET` when `walletAmount >= total`), `packages/shared-core/src/localization/payments.ts` (`SETTLEABLE_METHODS` += `wallet`), checkout sends `walletAmount`.
Change: gateway verifies `GET /wallet/:userId/balance` ≥ total, places the order, then `POST /wallet/:userId/debit` with the order number as reference; on debit failure cancel the order and release stock. Order `paymentStatus` = `PAID`.
Acceptance: wallet-covered order shows "Paid — KARTSEEK Wallet"; balance reduced; insufficient balance refused server-side; unit tests for the policy.

**B-04 Online payments (PSP) (MKT-011 full) · L · REQUIRES BUSINESS DECISION (provider per market)**
Files: gateway `payment.controller.ts` (`initiate`/`verify` already exist), new zone route `modules/marketplace/frontend/src/app/checkout/payment/return/page.tsx`, `checkout/failed/page.tsx` (retry with `orderId`), `marketplace-order.service.ts` (order created `AWAITING_PAYMENT`, confirmed on verify).
Acceptance: card/Apple Pay/bank methods redirect, verify, confirm; failure lands on `/checkout/failed?orderId=` with retry; webhook idempotent; pending orders expire.

**B-05 Cart as an evaluation point (MKT-016) · M**
Files: `modules/marketplace/frontend/src/app/cart/page.tsx`, `packages/shared-core/src/contexts/cart-context.tsx`.
Change: group lines by seller (`sellerId` from the priced line — add it to the cart line via `addResolvedItem`), show variant label, revalidate on load through `POST /marketplace/coupons/validate`-style `PRICE_ORDER_ITEMS` call (new gateway `POST /marketplace/cart/validate` returning per-line `ok/reason/unitPrice`) and flag lines whose price changed or stock fell; "Save for later" (localStorage list) and "Move to wishlist".
Acceptance: a line whose listing was deactivated shows "No longer available" and is excluded from totals; price change shows old→new; saved-for-later survives reload.

**B-06 Region-aware delivery promise and fee (MKT-019) · M**
Files: `packages/shared-core/src/localization/countries.ts` (per-market `delivery: { fee, freeAbove, standardDays, expressDays? }`), `packages/shared-core/src/marketplace/delivery.ts` (read the registry), `apps/api/apps/order-service/src/order.service.ts:89-113` (fee + ETA per `serviceType`+region: marketplace ETA = placed + `standardDays`), new `packages/shared-ui/src/shared/delivery-promise.tsx` (PDP/cart/checkout), `product/[id]/page.tsx` (replace the India PIN block outside India).
Acceptance: fee/threshold/ETA identical on PDP, cart, checkout, order and tracking for the same basket; `formatDateFor` in the region's clock; PIN check only in India.

**B-07 Search suggestions, typo tolerance, no-results help (MKT-020) · L**
Files: backend `catalog.service.ts` (`suggest(q, region)` over products/categories/brands using `ILIKE q%` + `pg_trgm similarity` — add the extension in a migration `modules/marketplace/backend/migrations/…-pg-trgm.sql`), `marketplace.controller.ts` (`{ cmd: 'search_suggest' }`), gateway `marketplace.controller.ts` (`GET /marketplace/search/suggest`), new `modules/marketplace/frontend/src/app/components/search-box.tsx` (debounced 200 ms dropdown: products with thumbnails, categories, brands, recent searches from localStorage, popular from `GET /marketplace/search/popular`), `search/page.tsx` (no-results: "Did you mean", top categories, remove mic/camera, drop the second search box).
Acceptance: typing "phne" suggests "phone"; arrow-key + Enter navigation; ESC closes; recent searches clearable; screen-reader `role="listbox"`.

**B-08 Server-side filters, facets and sort (MKT-021) · L**
Files: backend `catalog.service.ts` (`getProducts`/`searchProducts` accept `brand[]`, `minPrice`, `maxPrice`, `minRating`, `inStock`, `attributes[key]=v`, `sort ∈ relevance|popularity|newest|price_asc|price_desc|rating|discount|best_selling`; return `facets: { brands, categories, priceRange, attributes }` counted over the filtered set), gateway `GET /products` & `GET /search` DTOs, zone `category-filters.tsx`/`subcategory-filters.tsx`/`search/page.tsx` (URL-synced state via `useSearchParams`, refetch on change, counts from `facets`, attribute groups from `GET /categories/:slug/attributes`).
Acceptance: filter on a category with > 48 products changes the result count server-side; back/forward restores filters; facet counts match results; Lighthouse no layout shift on filter change.

**B-09 Wishlist state on cards and guest wishlist (MKT-026) · S/M**
Files: `product-card.tsx` (read `useWishlist()` from `@/lib/contexts/wishlist-context` instead of local state), `wishlist-context.tsx` (guest list in localStorage `kartseek_guest_wishlist_v1`, merged at sign-in like B-02), wishlist page share link (`/marketplace/wishlist?share=<id>` server-rendered read-only — needs `GET /marketplace/wishlist/:shareId` gateway route).
Acceptance: heart persists across reload and pages; guest saves survive sign-in; shared link renders items read-only.

**Follow-ups found while executing Phase 1 (not yet done)**

- **Cancelling an order does not release reserved stock.** `PUT /marketplace/orders/:id/cancel` moves the order to CANCELLED but the listing and variant units taken by `reserve_listing_stock` stay taken (verified: variant stock 24 → 23 stayed 23 after cancel). Fold into B-10: the cancel path must call `release_listing_stock` with the order's lines (`listingId`, `variantId`, `quantity`).
- **Wallet is never debited at placement**, so `WALLET` is not settleable either — B-03 is the prerequisite for offering it.
- **Probe seller rows cannot be deleted** (FK from `seller_kyc`); they were set `isActive=false` and the directory now hides inactive/suspended sellers. S-01 should delete them with their KYC rows.
- **Base listing price ≠ default variant price** in the seed (iPhone 5,050 vs 115,900): until S-01 fixes the data, the PDP shows the base price before a variant is chosen (B-12).

### Phase 3 · Customer experience (P1/P2)

**B-10 Order detail and list presentation (MKT-018) · S**
Files: `orders/[id]/page.tsx` (address via `formatAddressLines(parseAddress(raw))` keeping `fullName`, `phone`; `paymentStatusLabel` + a `PAYMENT_LABELS` map for `WALLET_APPLE` etc.; keep the seller lookup result across mutations; cancel via a modal with reason radios), `orders/page.tsx` (paginate with `page`/`limit` + "Load more").
Acceptance: address shows name/building/street/zone/area/city/phone; "Apple Pay · Awaiting payment"; cancel modal keyboard-accessible; list loads beyond 50 orders.

**B-11 Order progression and tracking events (MKT-031) · M · BUSINESS DECISION on seller fulfilment**
Files: seller portal status route (`PUT /orders/:id/status`, exists), `marketplace-fulfillment.service.ts` (emit `tracking/events` on each transition), dev-only `apps/api/scripts/dev/progress-orders.ts` that walks PENDING orders through CONFIRMED→PACKED→SHIPPED→OUT_FOR_DELIVERY→DELIVERED for demos.
Acceptance: a status change appears on `/orders/[id]/tracking` live over the socket ("Live" badge) and in the timeline; customer notification emitted (B-13).

**B-12 PDP default-variant price and share (MKT-027) · S**
Files: `product/[id]/page.tsx`, `product-price.tsx`, `variant-context.tsx` (`effectivePrice` before selection = cheapest in-stock variant), add `ShareButton` from shared-ui, `product-enhancements.tsx` (hide EMI unless `eligible`, exchange unless offers).
Acceptance: price never jumps on first selection; share copies the canonical URL; no India-only blocks outside India.

**B-13 Customer notifications + header bell + preferences (MKT-032, MKT-050) · M**
Files: gateway `marketplace-order.service.ts` (publish `order.placed`, `order.cancelled` → notification-service), zone `marketplace-layout-client.tsx` (bell with `unreadCount` from `GET /marketplace/notifications?limit=1`, `/orders` socket refresh), `notifications/page.tsx` (`PUT /notifications/:id/read` per item), new `notifications/preferences/page.tsx` (`POST /localization/preference` + notification-service prefs route).
Acceptance: placing an order creates a notification within 5 s; bell badge updates; per-item read persists; preferences persist per user.

**B-14 Profile editing and real security (MKT-040, MKT-041) · M**
Files: `packages/shared-ui/src/profile/module-profile.tsx` (edit name/phone → `PUT /users/:id/profile`, avatar → `POST /upload/profile-image`), gateway `gateway.controller.ts` (`POST /auth/change-password`, `GET /auth/sessions`, `DELETE /auth/sessions/:id` over the refresh slots, `POST /auth/2fa/enable|disable`), `apps/web/src/app/(account)/profile/security/page.tsx` wired to them.
Acceptance: password change requires the current password and invalidates other sessions; sessions list is real; no hard-coded rows.

**B-15 Support tickets and dispute (MKT-044) · M**
Files: gateway `POST/GET /marketplace/support/tickets`, `GET …/:id`, `POST …/:id/messages` (backed by the existing support ticket entity in marketplace-service if present, else a new `support_tickets` table + migration), `apps/web/src/app/support/tickets/page.tsx` (list/create wired), order page "File Dispute" → create ticket with `orderId`.
Acceptance: ticket created from the order page appears in the list with status; replies visible; `/help` "Live Chat" → ticket create.

**B-16 Reviews truthfulness (MKT-025) · S + S-01**
Files: backend `catalog.service.ts` (aggregate `averageRating`/`reviewCount` from `reviews` on product read, or a scheduled recompute), PDP verified-purchase badge (`reviews.isVerifiedPurchase` if present).
Acceptance: `reviewCount` equals review rows; a new review moves the aggregate.

### Phase 4 · Responsive & UX (P1/P2)

**B-17 Touch targets and labels (MKT-070) · M**
Files: `product-card.tsx` (remove per-card image dots or make them ≥ 24 px with 44 px hit area; wishlist 40×40; add-to-cart `py-2.5`), `page.tsx` "View All" links `min-h-[44px] flex items-center`, `AddressForm`/`Field` (`htmlFor` ↔ `id`), `search/page.tsx` inputs `aria-label`, `review/page.tsx` star buttons `aria-label="Rate N stars"`, `buy-again`, `checkout/success` icon buttons.
Acceptance: sweep metric `small` at 375 px < 5 % of controls per route; `unlabeled` 0; `unnamed` 0; axe (a11y-audit skill) 0 serious on the 10 key routes.

**B-18 Home composition and weight (MKT-022, MKT-072) · M**
Files: `page.tsx` (sections: hero, categories, deals of the day, recommended-or-hidden, three category rails, brands, trust, FAQ; each rail its own `GET /marketplace/<feed>?limit=8`; delete the 250-row fetch; remove `buildBrandDiscount` labels; hero only from feed banners else a neutral brand banner), `product-card.tsx` (no carousel).
Acceptance: home transfers < 400 KB JSON; no duplicate product across rails; one "Recommended" section; Lighthouse mobile performance ≥ 70 on dev build.

**B-19 Zone 404/error pages and titles (MKT-052, MKT-060, MKT-051) · S**
Files: new `src/app/not-found.tsx`, `src/app/error.tsx`; `generateMetadata` in `product/[id]/qa|review|emi/page.tsx` and `seller/[id]/page.tsx`; header wordmark `<h1>` → `<p>` in `marketplace-layout-client.tsx`; shell `auth/*` titles.
Acceptance: every route has one `<h1>` and a distinct `<title>`; unknown path shows branded 404 with search and categories, HTTP 404.

**B-20 Seller directory truthfulness (MKT-023) · S**
Files: backend `getSellers` (only `VERIFIED` + `isActive` + ≥ 1 live listing unless `?includeAll` for admin), `sellers/page.tsx` heading from `total`.
Acceptance: no PENDING/0-product rows; heading count correct.

**B-21 Consent banner mobile variant (MKT-071) · S**
Files: `packages/shared-ui/src/shared/consent-banner.tsx` (compact bottom sheet under 640 px).
Acceptance: banner ≤ 25 % of a 375×812 viewport; both actions reachable without scroll.

### Phase 5 · Country & localization (P2)

**B-22 Zone UI copy through next-intl (MKT-043) · L**
Files: `packages/shared-core/src/messages/{en,ar,hi}.json` (`marketplace.*` namespace), `marketplace-layout-client.tsx`, `cart`, `checkout`, `orders`, `product` pages (`useTranslations('marketplace')`), language picker writes `kartseek_language` cookie via `setLanguage` from `useRegion()` (not localStorage).
Acceptance: Arabic switch translates header, nav, cart, checkout, order pages; RTL verified; `ar` coverage ≥ 95 % of `marketplace.*` keys with a test that fails on untranslated keys (pattern from grocery).

**B-23 Return policy per market (MKT-033) · S**
Files: `countries.ts` (`returns: { windowDays, conditions[] }`), PDP, order detail, `returns/new` show it; `isReturnable` uses `windowDays`.
Acceptance: Qatar and India show their own window; return refused after the window with the reason.

**B-24 Multi-market seed (S-01) · M · data**
Files: `apps/api/scripts/seed/seed-marketplace.ts`.
Change: per active market (QA, IN, AE, SA) 3 VERIFIED sellers with listings (≥ 40 products each), 2 coupons, one flash-deal window, 3 hero + 1 campaign banner, 5–10 reviews on top products with recomputed aggregates, deterministic topical images (`images.unsplash.com` ids per category, no `loremflickr`/`placehold`), base listing price = default variant price, delete probe sellers.
Acceptance: `?country=IN` returns ≥ 40 products; `/flash-deals/active` non-empty during the window; `/coupons` ≥ 2; no random images; `verifyCatalog()` passes.

**B-25 Fabricated region stats (MKT-080) · S**
Files: gateway `region.controller.ts` (`/regions/stats` computed from sellers/orders or removed), `region-context.tsx` (delete the fallback table).
Acceptance: no invented figures reachable.

### Phase 6 · Advanced (P3)

**B-26 Recommendation engine population (MKT-028)** — recommendation-service consumes `product.viewed`/`order.placed` events; `/recommendations/marketplace` returns ≥ 8 `forYou` for a customer with history; home rail hidden otherwise.
**B-27 Server-side recently viewed and compare (MKT-029)** — write to `POST /marketplace/recently-viewed` when signed in; merge with local.
**B-28 Gift-card purchase or removal (MKT-081)** — business decision; either wire issuance via B-04 or remove the page from nav and sitemap.
**B-29 Notification preferences + language/country persistence (MKT-042)** — folded into B-13/B-22.

---

## Self-review

- Spec coverage: every MKT-0xx finding in the audit maps to a task above (MKT-001→T1, 002→T2, 003→T6+B-24, 010→T4, 011/012/034→T5 (+B-03/B-04), 013→T3, 014→B-01, 015→B-02, 016→B-05, 017→T5 step 5.6, 018→B-10, 019→B-06, 020→B-07, 021→B-08, 022/072→B-18, 023→B-20, 024/025/030→B-24/B-16, 026→B-09, 027→B-12, 028→B-26, 029→B-27, 031→B-11, 032/050→B-13, 033→B-23, 040/041→B-14, 042→B-29, 043→B-22, 044→B-15, 045→B-14 (OTP screen: add to B-14 scope — phone OTP via `/auth/otp/send|verify`), 051/052/060→B-19, 070→B-17, 071→B-21, 080→B-25, 081→B-28).
- Placeholder scan: none of the forbidden phrases; every P0 step has code; backlog cards name files and acceptance.
- Type consistency: `priceOrderItems` line shape (`variantId`, `variantName`) is used identically in T4 gateway mapping and B-05; `requireSettleable` name is the same in shared-core, shared-ui and checkout; `normaliseSavedAddress` signature matches its test.

### Done in the second pass (2026-09-06, "all region marketplace complete")

- **B-06 delivery rule per market** — landed (registry `delivery` + order-service `MARKETPLACE_RATES`).
- **S-01, catalogue half** — landed via `apps/api/scripts/maintenance/marketplace-catalog/marketplace-markets-seed.mjs` (sellers, offers, SKUs per active market). Coupons, flash deals, banners, reviews and images remain.
- **MKT-003 data half** — every active market now has a verified official seller with 115 live offers.
- Cart lines are tagged with their market and `GET /cart` is scoped to it (part of B-05).
- Cart Remove/quantity keyed by product + variant (found while verifying; not in the gap report).
- Zone layouts seed the region from `X-Country-Code` (all eight zones; found while verifying).
