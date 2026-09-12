# Admin Console Page Migration Implementation Plan (Plan K2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Depends on Plan K1** (`docs/superpowers/plans/2026-09-12-console-platform-plan.md`). Do not start a task here until K1 tasks 1–4 and 6–9 have landed: every page below imports `apiCall`, `ApiError`, `useAdminData`, `AdminState`, `AdminPage`, `DataTable` and `Money` from there.

**Goal:** Take all 250 admin pages from "147 render fixtures and 159 call nothing" to "every page either shows what the API returned, or says in words which route did not answer". Each page gets exactly one of three dispositions — **wire** it to a real route, rebuild it as an **honest** not-connected page naming the missing route, or **remove** it with its nav item — and the census script reports **0 `FIXTURE`** and **0 `NO-API`-with-a-fixture** when the plan is done.

**Architecture:** No new client transport, no new state components, no second table. Every task is the same five moves against a different set of pages: delete the fixture array; call the real client method inside `useAdminData`; render through `AdminPage` + `DataTable` + `AdminState`; move every mutation into `useAdminAction.execute` so a refusal cannot become a success toast; replace every currency literal with `<Money>`. Routes that do not exist are not invented — the page says so and names them, and the missing route is recorded as a dependency on the MODULES plan.

**Tech Stack:** Next 16 App Router (`apps/web/src/app/admin/**`), React 19, the K1 design system in `packages/shared-ui/src/admin/`, the K1 client in `packages/shared-core/src/api/`, jest 30 + `react-dom/server` (no Testing Library), Playwright on system Chrome.

---

## Global Constraints

Verbatim, from the programme mandate:

> Do not use mock data. Do not leave fake buttons. Do not leave placeholder APIs. Do not rely on frontend-only permissions. Do not allow regional data leakage. Do not mark functionality complete without testing the real workflow.

And, specific to this plan:

- **Never hard-code `₹` or any currency.** Every amount goes through `<Money amount country={row.regionCode ?? row.countryCode} />`. 107 admin files break this today; each task clears its own files, and the final task flips `no-hardcoded-currency` from `warn` to `error`.
- **Nav and page controls gate on `hasPermission(key)` with keys the API enforces** (K1-5 put the keys on the routes). A control the viewer cannot use is hidden, not disabled-and-lying; a page the viewer cannot open renders `AdminState` with the 403 the server sent.
- **`npx next build`, `npx tsc --noEmit -p apps/web` and `npx jest` (baseline 610, growing with each task) stay green after every task.**
- **Every task ends with the census script and reports its counts:**
  ```bash
  node apps/api/scripts/verification/admin-console-census.mjs \
    --json .superpowers/sdd/2026-09-12-admin-platform-review/console-census-after-K2-<n>.json \
    --md  .superpowers/sdd/2026-09-12-admin-platform-review/console-census-after-K2-<n>.md
  node apps/api/scripts/verification/console-census-gate.mjs --fixture <budget> --no-api <budget>
  ```
  The audit's **MOCK-HARDCODED is the script's `FIXTURE` flag** and **MISSING is `NO-API`**. Record the actual numbers in the task's completion note; a task that cannot hit its budget says which pages it could not clear and why, rather than adjusting the budget.
- **Commits:** lower-case subject, ≤ 100 characters, `apps/web` and `packages/shared-*` may share one commit, `apps/api` commits separately. Trailer:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  ```
- **Browser verification** (every task, before its commit) — Playwright on **system Chrome** (`channel: 'chrome'`; Playwright's own browsers are not installed), against the console dev server pointed at a live gateway:
  ```bash
  cd apps/api && npm run dev:all                      # gateway on 3099
  cd apps/web && NEXT_PUBLIC_API_URL=http://127.0.0.1:3099/api/v1 \
    NEXT_PUBLIC_WS_URL=http://127.0.0.1:3099 npm run dev
  cd apps/web && npx playwright test --project=admin-chrome -g "<module>"
  ```
  Browse `localhost:3000`, never `127.0.0.1:3000`. **Screenshots at 375, 768, 1024 and 1440** for the module landing page, one list page and one detail page; the files land in `apps/web/e2e/screenshots/` and are named in the completion note.
- **`DEV_AUTH_BYPASS=false` for every authorisation check.** With the bypass on, an anonymous request is SUPER_ADMIN locally and a 403 state can never be reached, so "I could not reproduce the forbidden panel" means the bypass was on.
- **Probe before believing.** A route that answers 200 may be a fabricated fallback (`project_gateway_fabricated_fallbacks`) or a literal stub. Before wiring a page, call the route with an impossible id (`?id=00000000-0000-0000-0000-000000000000`) and with a market the data cannot be in. A route that returns plausible rows for a nonsense input is a stub: the page goes **honest**, not **wired**.

---

## Interfaces

### What this plan consumes from Plan K1

Restated verbatim from K1's Interfaces section — if either changes, both files change in the same commit.

```ts
// @/lib/api/client
class ApiError extends Error { status; messages: string[]; requestId?; route; retryAfterSeconds?; body? }
type ApiFailureKind = 'validation'|'reauth'|'forbidden'|'notfound'|'conflict'|'rate-limited'|'server'|'unavailable'|'network'|'timeout';
function apiCall<T>(route: string, init?: ApiCallInit): Promise<T>;   // throws ApiError
function classifyApiError(err: unknown): ApiFailureKind;
function errorMessages(err: unknown): string[];

// @/hooks/useAdminData
useAdminData<T>(fetcher, deps) → { data, loading, error, failure, refetch, toast, showToast }
useAdminAction(showToast)      → { execute, actionLoading }

// @/components/admin/api-states
<AdminState failure loading route what needs onRetry empty isEmpty>{children}</AdminState>

// @/components/admin-ui
<AdminPage title description breadcrumbs actions filters market>
<DataTable rows columns rowKey total page limit onPageChange onLimitChange sort onSortChange
           search filters filterValues onFilterChange selection bulkActions rowActions
           onRowClick exportCsv state emptyTitle emptyHint>
Column<T> { key header render value sortable align width hideBelow }
FilterSpec { key label kind options }
<FilterBar> <StatusBadge module status> <StatCard label value delta icon href perm failure loading>
<DashboardGrid> <ActivityFeed> <PendingApprovals> <AlertList> <QuickActions> <OperationalStatus>
<Money amount country currency compact showCode fallback> / useMoney(country)
<Modal> <ConfirmDialog> <ReasonDialog> <Drawer> <Dropdown> <Tabs> <Alert> <Badge> <Toaster>
ADMIN_NAV / navGroupsFor(has) / breadcrumbsFor(pathname)
```

### What this plan consumes from the MODULES plan, by route

Taken from `docs/superpowers/plans/2026-09-12-module-backends-plan.md` §"Interfaces (cross-plan)". A K2 task **wires** the page when the named MODULES task has landed; until then the page calls the route anyway and renders the 503 it gets, which is true and which the census counts as connected.

| Route MODULES produces                                                                                                                      | Task | Shape                                                                                                                                                                                                   | K2 task |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `GET /admin/marketplace/orders?page&limit&status&search&country`                                                                            | M1   | `{ data: AdminOrderRow[], total, page, limit }`; `AdminOrderRow = { id, orderNumber, orderId, customerId, sellerId, totalAmount, currency, regionCode, status, escrowStatus, paymentMethod, placedAt }` | K2-1    |
| `GET /admin/marketplace/orders/:orderNumber` — **keyed on the order number, not the uuid**                                                  | M1   | `AdminOrderRow & { items, subtotal, deliveryFee, discount, walletDeduction, deliveryAddress, notes, estimatedDeliveryAt, updatedAt }`                                                                   | K2-1    |
| `GET /admin/marketplace/returns?page&limit&status&country`                                                                                  | M1   | `{ data: ReturnRequest[], total, page, limit }`, rows carry `regionCode`                                                                                                                                | K2-3    |
| `GET /admin/marketplace/refunds?page&limit&country`                                                                                         | M1   | `{ data: RefundRequest[], total, page, limit }`, rows now carry `regionCode`                                                                                                                            | K2-3    |
| `GET /admin/marketplace/payments?page&limit&status&country`                                                                                 | M1   | `{ data: Payment[], total, page, limit }`, rows carry `countryCode`                                                                                                                                     | K2-3    |
| `GET /admin/marketplace/banners`                                                                                                            | M2   | `{ data: Banner[], total }` — the one stub M2 wires rather than removes                                                                                                                                 | K2-5    |
| `GET /admin/marketplace/reviews?page&limit&status&rating&country`                                                                           | M9   | `{ data: Review[], total, page, limit }` — the real moderation queue                                                                                                                                    | K2-2    |
| `GET /admin/marketplace/bank-offers`                                                                                                        | M9   | unchanged shape, now real region-scoped rows                                                                                                                                                            | K2-5    |
| `/admin/pharmacy/{dashboard,stores/:id,products,orders,prescriptions,verifications,commissions,settlements,reports,settings}` + 5 decisions | M3   | lists `{ data, total, page, limit }`; decisions `{ success: true, id, status }`                                                                                                                         | K2-9    |
| `/admin/restaurant/{dashboard,restaurants/:id,orders,menu-approvals,complaints,commissions,cuisines,analytics,zones}` + 4 decisions         | M4   | same                                                                                                                                                                                                    | K2-9    |
| `/admin/hotel/{rooms,bookings,bookings/:id,amenities,pricing,reports,reviews,settings}` + 4 writes                                          | M5   | same                                                                                                                                                                                                    | K2-8    |
| `/admin/doctor/{dashboard,clinics/:id,doctors/:id,appointments,prescriptions,specialties,reports,settings}` + 4 decisions                   | M6   | same                                                                                                                                                                                                    | K2-8    |
| `/admin/taxi/{vendors/:id,drivers/:id,pending-approvals}` + vendor/driver/payout approvals                                                  | M7   | same                                                                                                                                                                                                    | Plan D  |

**Routes MODULES M2 REMOVES**, because there is no data model behind them. Their console callers are **not** wired and **not** left showing an empty table: each renders `<NotBuiltState>` naming the feature, and the pages that were only a second door onto another page are deleted.

| Removed route           | Console caller(s)                                                  | K2 task     | Disposition                                                        |
| ----------------------- | ------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------ |
| `GET brand-center`      | `/admin/marketplace/brand-center`                                  | K2-2        | fold into `/admin/marketplace/brands`; page removed                |
| `GET campaigns`         | `/admin/marketplace/campaigns`, `campaigns/create`                 | K2-5        | removed (no `campaigns` table; design §5.2 and programme C1 agree) |
| `GET reports`           | `/admin/marketplace/reports`, `/admin/analytics`                   | K2-5, K2-11 | `NotBuiltState`; the seven report children go with it              |
| `GET loyalty/analytics` | `/admin/loyalty`                                                   | K2-12       | `NotBuiltState` over the loyalty adjust routes that do exist       |
| `GET gift-cards`        | `/admin/marketplace/gift-cards`, `gift-cards/create`               | K2-5        | `NotBuiltState`; the create page removed                           |
| `GET logistics`         | `/admin/marketplace/logistics`                                     | K2-5        | `NotBuiltState`                                                    |
| `GET delivery-partners` | `/admin/delivery/partners`, `/admin/marketplace/delivery-partners` | K2-4        | `NotBuiltState` on one; the marketplace twin removed               |
| `GET delivery-zones`    | `/admin/marketplace/delivery-zones`                                | K2-4        | **repointed at grocery**, which owns real zones — see K2-4         |
| `GET shipping-rates`    | `/admin/marketplace/shipping-rates`, `shipping-rates/config`       | K2-4        | `NotBuiltState`; the config child removed                          |
| `GET gst-invoicing`     | `/admin/marketplace/gst-invoicing`                                 | K2-5        | `NotBuiltState`                                                    |
| `GET abandoned-carts`   | `/admin/marketplace/abandoned-carts`                               | K2-5        | `NotBuiltState`                                                    |
| `GET ip-violations`     | `/admin/marketplace/ip-violations`                                 | K2-5        | `NotBuiltState`                                                    |

**Routes nobody has committed to.** These are named by pages in this plan and are produced by **no** sibling plan; each page renders `NotBuiltState` and the row is repeated in this plan's self-review so it reaches a backlog rather than a reader's memory: `POST /admin/marketplace/orders/:orderNumber/cancel` (K2-1 renders no cancel control without it), `GET /admin/refunds` standalone (K2-3 uses the marketplace refunds list instead), `POST/PUT/DELETE /admin/marketplace/coupons` admin-namespaced and scoped (K2-5 keeps the current seller-route writes and records the inconsistency), platform settings (K2-11), `admin.market_settings` CRUD (K2-11), a guarded `/admin/franchise*` (K2-12), `GET /admin/wallet/transactions` (K2-12), support tickets (K2-11).

### What this plan hands to the TAXI plan

**Plan K2 does not rebuild the taxi console.** `docs/superpowers/plans/2026-09-12-taxi-ops-plan.md` Task D8 owns all 20 taxi page files by name, with its own per-page disposition — including keeping `landing-editor` (wired to `adminLayoutApi`, `setSaved(true)` only on success), keeping `intercity`, `rentals`, `rental-fleet` and `scheduled` as `NotBuiltState`, and deleting only `reconciliation`. K2-10 is the handoff and the verification, not a second rebuild; building them here would produce two plans editing the same 20 files.

---

## Running census budget

Baseline at the start of this plan (after K1): **`FIXTURE` 145 · `NO-API` 159 · `FETCH-NO-AUTH-HEADER` 5 · `NO-GATEWAY-ROUTE` 2 · `DEAD-CLIENT-IMPORT` 57 · pages 250.**

| After task | `FIXTURE` ≤ | `NO-API` ≤ | Also                                                       |
| ---------- | ----------: | ---------: | ---------------------------------------------------------- |
| K2-1       |         136 |        152 | `NO-GATEWAY-ROUTE` 1                                       |
| K2-2       |         130 |        148 | —                                                          |
| K2-3       |         122 |        142 | —                                                          |
| K2-4       |         117 |        137 | `NO-GATEWAY-ROUTE` 0, `BARE-/api-NO-V1` 0, pages 250 → 247 |
| K2-5       |          86 |        102 | pages 247 → 239 (8 removed)                                |
| K2-6       |          84 |         93 | —                                                          |
| K2-7       |          80 |         93 | —                                                          |
| K2-8       |          52 |         65 | `DEAD-CLIENT-IMPORT` ≤ 21                                  |
| K2-9       |          28 |         43 | `DEAD-CLIENT-IMPORT` ≤ 7                                   |
| K2-10      |          12 |         30 | `FETCH-NO-AUTH-HEADER` 0 (with Plan D's D8)                |
| K2-11      |           3 |         12 | pages 239 → 238                                            |
| K2-12      |           0 |          8 | —                                                          |
| K2-13      |       **0** |     **26** | `DEAD-CLIENT-IMPORT` 0, `NOT-IN-NAV` ≤ 150                 |

**`FIXTURE` must reach 0. `NO-API` must not.** The two numbers measure different things, and conflating them would push the plan into inventing routes:

- `FIXTURE` counts a page shipping seeded data in the page file. That is always a defect, and 0 is the gate (`npm run verify:console --fixture 0`).
- `NO-API` counts a page that calls no client method. A page rendering `<NotBuiltState>` calls nothing **on purpose**, because MODULES M2 removed the literal-returning route it used to call and there is no data model behind it. Making that page "call something" would mean pointing it at a route that does not exist so the census could count a 404 — a worse lie than the honest panel.

The final `NO-API` budget of **26** is therefore not a remainder; it is an enumerated list, named page by page in the self-review, and `console-census-gate.mjs` is given the allowlist rather than a bare number:

```bash
node apps/api/scripts/verification/console-census-gate.mjs --fixture 0 --no-api-allowlist docs/superpowers/plans/console-not-built.txt
```

Any page that appears in `NO-API` and is **not** in that file fails the gate. The file is written in K2-5 and appended to by K2-4, K2-11 and K2-12; every line carries the route the page is waiting for, so it is a work order for the follow-up plans rather than an exemption.

---

### Task 1 (K2-1): Marketplace orders — one list, one detail, nine readers

**Closes:** AUD2-037

**Pages (11):** `/admin/orders`, `/admin/marketplace/orders`, `/admin/marketplace/orders/[id]`, `/admin/marketplace/orders/[id]/detail`, `/admin/marketplace/abandoned-carts`, `/admin/marketplace/gift-cards`, `/admin/marketplace/gift-cards/create`, `/admin/marketplace/gst-invoicing`, `/admin/marketplace/integrations`, `/admin/marketplace/logistics`, `/admin/marketplace/translations`

**Target routes:** `GET /admin/marketplace/orders?page&limit&status&search&country` and `GET /admin/marketplace/orders/:orderNumber` — both from MODULES **M1**. Note the detail route is keyed on the **order number**, not the uuid (`project_customer_order_identifiers`: orderNumber, the order-service uuid and the seller projection's uuid are three different identifiers, and the console has picked the wrong one before). The timeline comes from `GET /admin/audit-logs/entity/order/:id`, which already works.

**Not available:** MODULES produces **no** `POST …/orders/:orderNumber/cancel`. The cancel control is therefore **not rendered** in this task — a money- and inventory-moving control with no endpoint is exactly the fake button the mandate forbids. The `ReasonDialog` wiring below is written so the control appears the moment the route lands, and the row is carried into this plan's self-review as an open dependency.

**Disposition:** `/admin/orders` **remove** (it is a second page over the same route as `/admin/marketplace/orders`; the nav item repoints). `/admin/marketplace/orders` and `/admin/marketplace/orders/[id]` **wire**. `/admin/marketplace/orders/[id]/detail` **remove** (duplicate of `[id]`). The other seven read the orders stub only for a counter they do not need; each **drops the orders call** and is handled by its own module task — here they simply stop reading a stub that will now 501.

**Files:**

- Modify: `apps/web/src/app/admin/marketplace/orders/page.tsx`, `orders/[id]/page.tsx`
- Delete: `apps/web/src/app/admin/orders/page.tsx`, `apps/web/src/app/admin/marketplace/orders/[id]/detail/page.tsx`
- Modify: `apps/web/src/lib/admin/navigation.ts` (`/admin/orders` → `/admin/marketplace/orders`)
- Create: `apps/web/src/__tests__/marketplace-orders-page.spec.ts`

**DataTable:**

Columns use `AdminOrderRow`'s own field names, from the MODULES M1 shape — not the fixture's (`total`, `createdAt`, `customerName` do not exist on the real row).

| Column   | key             | sortable | hideBelow | render                                                                          |
| -------- | --------------- | -------- | --------- | ------------------------------------------------------------------------------- |
| Order    | `orderNumber`   | yes      | —         | link to `/admin/marketplace/orders/{orderNumber}`                               |
| Placed   | `placedAt`      | yes      | `sm`      | `<time dateTime>` + relative                                                    |
| Customer | `customerId`    | no       | `md`      | resolved name where the row carries one, else the id, never invented            |
| Market   | `regionCode`    | yes      | `lg`      | `<CountryFlag>` + code — column hidden for a locked admin                       |
| Payment  | `paymentMethod` | no       | `lg`      | plain text                                                                      |
| Total    | `totalAmount`   | yes      | —         | `<Money amount={r.totalAmount} currency={r.currency} country={r.regionCode} />` |
| Escrow   | `escrowStatus`  | yes      | `md`      | `<StatusBadge module="marketplace" …>`                                          |
| Status   | `status`        | yes      | —         | `<StatusBadge>`                                                                 |

**Filters:** `status` (select, from the server's enum), `placedAt` (date-range → `from`/`to`), `country` (select, hidden and forced for a locked admin), free-text `search` over order number and customer. The query parameter is `search` and the market parameter is `country` — those are the names M1's route declares; a page inventing `q` or `market` gets them dropped silently.
**Row actions:** _View_ (always). _Cancel order_ is written and left commented with the route it waits on; _Refund_ (`orders.refund`) links to the returns flow, which is real.
**Bulk actions:** none — there is no bulk order endpoint, and inventing one client-side by looping would report a partial failure as a success.
**Export:** current page only, `orders-{market}-{date}.csv`.

- [ ] **Step 1: Failing spec**

`apps/web/src/__tests__/marketplace-orders-page.spec.ts`:

```ts
/**
 * The order pages show the server's orders, or say which route did not answer.
 *
 * The detail page fetched the CUSTOMER route with no Authorization header,
 * swallowed the failure with `.catch(() => {})`, and rendered a hard-coded
 * order — "Sample Product", "John Doe", a Bangalore address, a fixed total and
 * an 18% tax line — under three buttons with no onClick.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiError } from '@/lib/api/client';

const getOrders = jest.fn();
const getOrderById = jest.fn();
const cancelOrder = jest.fn();
jest.mock('@/lib/modules/admin-marketplace-api', () => ({
  adminMarketplaceApi: {
    getOrders: (...a: unknown[]) => getOrders(...a),
    getOrderById: (...a: unknown[]) => getOrderById(...a),
    cancelOrder: (...a: unknown[]) => cancelOrder(...a),
  },
}));
let data: unknown = null,
  failure: ApiError | null = null,
  loading = false;
jest.mock('@/hooks/useAdminData', () => ({
  ...jest.requireActual('@/hooks/useAdminData'),
  useAdminData: () => ({
    data,
    loading,
    failure,
    error: failure?.message ?? null,
    refetch: jest.fn(),
    toast: null,
    showToast: jest.fn(),
  }),
  useAdminAction: () => ({ execute: jest.fn(), actionLoading: false }),
}));

import OrdersPage from '../app/admin/marketplace/orders/page';
import OrderDetailPage from '../app/admin/marketplace/orders/[id]/page';

const ROWS = {
  data: [
    {
      id: 'o1',
      orderNumber: 'ORD-9001',
      customerName: 'Fatima Al-Sayed',
      customerEmail: 'f@x.qa',
      total: 289.5,
      regionCode: 'QA',
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      itemCount: 3,
      createdAt: '2026-09-10T09:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 25,
};

describe('/admin/marketplace/orders', () => {
  beforeEach(() => {
    data = null;
    failure = null;
    loading = false;
  });

  it('renders the server’s rows and its total, not the page length', () => {
    data = { ...ROWS, total: 412 };
    const html = renderToStaticMarkup(React.createElement(OrdersPage));
    expect(html).toContain('ORD-9001');
    expect(html).toContain('412');
  });

  it('formats the total in the order’s own market', () => {
    data = ROWS;
    const html = renderToStaticMarkup(React.createElement(OrdersPage));
    expect(html).toContain('QR');
    expect(html).not.toContain('₹');
  });

  it('shows the forbidden panel and no rows on a 403', () => {
    failure = new ApiError({
      status: 403,
      messages: ['Missing required permissions: orders.view'],
      route: 'GET /admin/marketplace/orders',
    });
    const html = renderToStaticMarkup(React.createElement(OrdersPage));
    expect(html).toContain('orders.view');
    expect(html).not.toContain('ORD-');
  });

  it('names the route on a 503 rather than showing an empty table', () => {
    failure = new ApiError({
      status: 503,
      messages: ['order-service did not answer'],
      route: 'GET /admin/marketplace/orders',
    });
    const html = renderToStaticMarkup(React.createElement(OrdersPage));
    expect(html).toContain('GET /admin/marketplace/orders');
  });

  it('ships no fixture array at all', () => {
    const src = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../app/admin/marketplace/orders/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/MOCK_|SAMPLE_|FALLBACK_|=\s*\[\s*\{\s*id:/);
    expect(src).not.toContain('₹');
  });
});

describe('/admin/marketplace/orders/[id]', () => {
  it('calls the admin route through the authenticated client, never a raw fetch', () => {
    const src = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../app/admin/marketplace/orders/[id]/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/fetch\(/);
    expect(src).not.toContain('/api/v1/marketplace/orders');
    expect(src).toContain('getOrderById');
  });

  it('renders nothing invented when the order cannot be loaded', () => {
    failure = new ApiError({
      status: 404,
      messages: ['Order not found'],
      route: 'GET /admin/marketplace/orders/o1',
    });
    const html = renderToStaticMarkup(
      React.createElement(OrderDetailPage, { params: { id: 'o1' } } as never),
    );
    expect(html).not.toContain('Sample Product');
    expect(html).not.toContain('John Doe');
    expect(html).toMatch(/could not be found/i);
  });

  it('has no action button without a handler', () => {
    const src = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../app/admin/marketplace/orders/[id]/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/);
    expect(src).not.toMatch(/<button(?![^>]*onClick)[^>]*>(?![^<]*aria-hidden)/);
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Probe the route before wiring it**

```bash
curl -s -H "Authorization: Bearer $SUPER" "localhost:3099/api/v1/admin/marketplace/orders?limit=2" | head -c 400
curl -s -H "Authorization: Bearer $SUPER" "localhost:3099/api/v1/admin/marketplace/orders/00000000-0000-0000-0000-000000000000" | head -c 300
```

If the second call returns `{"id":"00000000-…","status":"PENDING"}`, the route is still the stub: **the page goes honest** (`AdminState` naming `GET /admin/marketplace/orders/:id` and the MODULES-plan dependency) and the wiring lands in the MODULES plan's follow-up. If it 404s, the handler is real and the page is wired. Record which branch was taken.

- [ ] **Step 4: Write the page (wired branch)**

```tsx
'use client';
export default function MarketplaceOrdersPage() {
  const t = useTableParams({ limit: 25, sort: { key: 'createdAt', dir: 'desc' } });
  const { user, hasPermission } = useAuth();
  const locked = user?.regionLocked === true;
  const { data, loading, failure, refetch, toast, showToast } = useAdminData(
    () =>
      adminMarketplaceApi.getOrders({
        page: t.page,
        limit: t.limit,
        sort: t.sortParam,
        q: t.q,
        status: t.filters.status,
        paymentStatus: t.filters.paymentStatus,
        from: t.filters.from,
        to: t.filters.to,
        // A locked admin never sends a market: the token decides, and sending one
        // the token does not allow is refused rather than silently widened.
        country: locked ? undefined : t.filters.regionCode,
      }),
    [t.key],
  );
  const { execute, actionLoading } = useAdminAction(showToast);
  const [cancelling, setCancelling] = useState<AdminOrder | null>(null);

  return (
    <AdminPage
      title="Orders"
      description="Every marketplace order in the markets you administer."
      market={
        <MarketSelect value={t.filters.regionCode} onChange={(v) => t.setFilter('regionCode', v)} />
      }
      filters={
        <FilterBar
          specs={ORDER_FILTERS(locked)}
          values={t.filters}
          onChange={t.setFilter}
          search={{ value: t.q, onChange: t.setQ, placeholder: 'Order number or customer email' }}
        />
      }
    >
      <DataTable<AdminOrder>
        rows={data?.data ?? []}
        total={data?.total ?? 0}
        columns={ORDER_COLUMNS(locked)}
        rowKey={(r) => r.id}
        page={t.page}
        limit={t.limit}
        onPageChange={t.setPage}
        onLimitChange={t.setLimit}
        sort={t.sort}
        onSortChange={t.setSort}
        onRowClick={(r) => router.push(`/admin/marketplace/orders/${r.id}`)}
        rowActions={(r) => [
          { label: 'View', onSelect: () => router.push(`/admin/marketplace/orders/${r.id}`) },
          ...(hasPermission('orders.manage') && CANCELLABLE.has(r.status)
            ? [{ label: 'Cancel order', tone: 'danger' as const, onSelect: () => setCancelling(r) }]
            : []),
        ]}
        exportCsv={{ filename: `orders-${t.filters.regionCode ?? user?.regionCode ?? 'all'}.csv` }}
        state={{ loading, failure, route: 'GET /admin/marketplace/orders', onRetry: refetch }}
        emptyTitle="No orders match these filters"
      />
      <ReasonDialog
        open={!!cancelling}
        title={cancelling ? `Cancel ${cancelling.orderNumber}` : ''}
        confirmLabel="Cancel order"
        busy={actionLoading}
        onClose={() => setCancelling(null)}
        onConfirm={(reason) =>
          execute(
            () => adminMarketplaceApi.cancelOrder(cancelling!.id, { reason }),
            `${cancelling!.orderNumber} cancelled`,
            () => {
              setCancelling(null);
              refetch();
            },
          )
        }
      />
      <Toaster toasts={toast ? [toast] : []} />
    </AdminPage>
  );
}
```

The detail page renders the order, its items priced with `<Money country={order.regionCode}>`, its address, its payment, and a timeline from `GET /admin/audit-logs/entity/order/:id`. **Every button either has a handler that calls a route, or it is not rendered.** The three buttons that had no `onClick` — Refund, Resend invoice, Contact customer — become: _Refund_ → the returns flow (`orders.refund`), _Resend invoice_ → `POST /admin/marketplace/orders/:id/invoice` **if it exists**, otherwise deleted; _Contact customer_ → deleted (there is no messaging route).

- [ ] **Step 5: Remove the two duplicate pages and repoint the nav**

```bash
git rm apps/web/src/app/admin/orders/page.tsx
git rm apps/web/src/app/admin/marketplace/orders/[id]/detail/page.tsx
```

`navigation.ts`: the _All Orders_ item's `href` becomes `/admin/marketplace/orders`. `admin-navigation.spec.ts` (K1-4) already asserts every href has a page, so a missed rename fails the suite.

- [ ] **Step 6: Verify**

```bash
cd apps/web && npx jest marketplace-orders-page      # 8 passed
cd apps/web && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "orders"
# screenshots: _admin_marketplace_orders@{375,768,1024,1440}.png,
#              _admin_marketplace_orders_o1@{375,768,1024,1440}.png
node apps/api/scripts/verification/console-census-gate.mjs --fixture 136 --no-api 152
```

Live workflow proof (the mandate's last sentence): sign in as the QA regional admin, open Orders, confirm every row's market is QA, cancel one order with a reason, reload and confirm the status persisted, then open the audit log and confirm the cancellation is recorded with the actor and the market.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/admin apps/web/src/lib/admin/navigation.ts apps/web/src/__tests__/marketplace-orders-page.spec.ts
git commit -m "fix(web): marketplace orders read the admin route and the detail page stops inventing an order" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2 (K2-2): Marketplace catalogue — products, moderation, brands, categories

**Closes:** AUD2-039, AUD2-047

**Pages (14):** `/admin/marketplace/products`, `products/[id]`, `products/[id]/edit`, `product-approvals`, `listing-approvals`, `listing-quality`, `inventory`, `featured-products`, `sponsored-products`, `brands`, `brands/[id]`, `brand-center`, `qa-moderation`, `reviews/moderation`

**Target routes:** `GET /admin/marketplace/products`, `GET /admin/marketplace/products/:id` (declared at `admin-marketplace.controller.ts:538`), `PATCH /admin/marketplace/products/:id/{approve,reject,request-correction,publish,unpublish,suspend,feature,unfeature}`, `GET/PATCH /admin/marketplace/brands`, `brands/:id/{approve,reject}`, `GET /admin/marketplace/categories|subcategories|attributes`, and `GET /admin/marketplace/reviews?page&limit&status&rating&country` from MODULES **M9** — which repoints the reviews route at the real moderation queue instead of at products.

**Disposition:** 11 **wire**. `listing-quality` and `sponsored-products` **honest** — `GET /admin/marketplace/sponsored` returns a constant empty payload (Plan A's carry-over: "implement with scope"), so the pages call it and render what comes back, with the dependency recorded. `brand-center` **removed**: MODULES M2 removes `GET brand-center` (a `{data:[],total:0}` literal), and the page's one real function — the brand approval queue — already exists on `/admin/marketplace/brands`; its nav entry, if any, goes in the same commit.

**Files:** the 14 page files; `apps/web/src/__tests__/marketplace-products-page.spec.ts`

**DataTable (products):** Image (thumb via `ProductThumb`) · Title (`title`, sortable, link) · Seller (`sellerName`, `hideBelow: md`) · Market (`regionCode`, `hideBelow: lg`) · Price (`<Money country={r.regionCode}>`, sortable) · Stock (`hideBelow: lg`) · Approval (`StatusBadge`) · Visibility (`StatusBadge`).
**Filters:** approval status, visibility, category, seller, market, date range, free-text.
**Row actions:** Approve (`content.manage`), Reject (`ReasonDialog`), Request correction (`ReasonDialog`), Publish / Unpublish, Feature / Unfeature, Suspend (`ReasonDialog`).
**Bulk actions:** Approve and Reject over selected ids — **only** if a bulk endpoint exists; otherwise the bar is omitted. Do not loop single calls and report one toast.

- [ ] **Step 1: Failing spec** — the central assertion is that nothing touches local state before the server answers:

```ts
/**
 * Product moderation is a decision, not an animation.
 *
 * `handleAction` set the local `products` array FIRST, then PATCHed
 * `/admin/marketplace/products/action` — a route that exists nowhere — and
 * discarded the 404 with `catch { // Silently handle — local state is already
 * updated }`. Every approval, rejection and correction request on this page was
 * cosmetic: the row changed colour and the catalogue did not change at all.
 */
it('calls a route that exists, and only then refetches', async () => {
  approveProduct.mockResolvedValue({ id: 'p1', approval: 'approved' });
  await handleAction({ productId: 'p1', action: 'approve' }, '');
  expect(approveProduct).toHaveBeenCalledWith('p1', expect.anything());
  expect(refetch).toHaveBeenCalled();
});

it('leaves the row alone when the server refuses', async () => {
  approveProduct.mockRejectedValue(new ApiError({ status: 403, messages: ['no'], route: 'PATCH …' }));
  await handleAction({ productId: 'p1', action: 'approve' }, '');
  expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/no/), 'error');
  expect(setProducts).not.toHaveBeenCalled();
});

it('never names the route that does not exist', () => {
  expect(src('products/page.tsx')).not.toContain('/admin/marketplace/products/action');
});

it('the detail page reads the admin route, not the public cached one', () => {
  const s = src('products/[id]/page.tsx');
  expect(s).not.toMatch(/fetch\(/);
  expect(s).not.toContain('/api/v1/marketplace/products');
  expect(s).toContain('getProductById');
});

it('requires a reason before a rejection can be sent', () => { … });
```

- [ ] **Step 2: FAIL. Step 3: implement.** `handleAction` becomes:

```ts
const handleAction = (modal: ActionModal, reason: string) =>
  execute(
    () => {
      switch (modal.action) {
        case 'approve':
          return adminMarketplaceApi.approveProduct(modal.productId);
        case 'reject':
          return adminMarketplaceApi.rejectProduct(modal.productId, { reason });
        case 'correction':
          return adminMarketplaceApi.requestProductCorrection(modal.productId, { reason });
      }
    },
    `Product ${modal.action === 'approve' ? 'approved' : modal.action === 'reject' ? 'rejected' : 'sent back for correction'}`,
    () => {
      setModal(null);
      refetch();
    }, // the list re-reads the server; no local mutation
  );
```

`toggleVisibility` and `toggleFeatured` get the same treatment against `publish`/`unpublish` and `feature`/`unfeature`. The product detail page moves to `adminMarketplaceApi.getProductById` so it can show a pending or suspended product (the public route is `@PublicCache(120)` and never returns them).

- [ ] **Step 4: Verify, screenshot, commit**

```bash
cd apps/web && npx jest marketplace-products && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "products"
node apps/api/scripts/verification/console-census-gate.mjs --fixture 130 --no-api 148
```

Live proof: approve a pending product as a SUPER_ADMIN, **reload**, confirm it is approved in the catalogue; then attempt the same as a SUPPORT_AGENT and confirm the page shows the 403 panel and the product is unchanged.

```bash
git commit -m "fix(web): product moderation calls a real route and waits for it before the row changes" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3 (K2-3): Marketplace money — payouts, commissions, refunds, returns, payments, wallets

**Closes:** AUD2-040, AUD2-042

**Pages (14):** `/admin/payouts`, `/admin/commissions`, `/admin/marketplace/payouts`, `payouts/[id]`, `marketplace/payments`, `marketplace/commissions`, `commissions/config`, `commissions/tiers`, `marketplace/refunds`, `marketplace/returns`, `returns/[id]`, `return-policies`, `marketplace/seller-wallets`, `marketplace/disputes`

**Target routes:** `GET /admin/marketplace/payouts`, `POST payouts/:id/{approve,retry}`, `GET/PATCH /admin/marketplace/commissions`, `GET /admin/marketplace/returns`, `POST returns/:id/{approve,reject}`, `GET /admin/marketplace/refunds`, `POST /admin/refunds/:id/{approve,reject}` (MODULES), `GET /admin/marketplace/payments` (MODULES — a stub today), `/admin/marketplace/wallet/*`

**Disposition:** payouts, commissions, returns, seller-wallets and disputes **wire**. `/admin/marketplace/payments` **honest** until the MODULES plan replaces its stub. `/admin/payouts` and `/admin/commissions` stay as the top-level entry points (they are the nav destinations) and the `/admin/marketplace/*` twins **redirect** to them, so one page owns each surface.

**This is money.** Three rules apply to every page in this task and nowhere else is an exception made:

1. **No optimistic UI.** A balance, a payout state or a refund state changes on screen only after the server has said it changed. (design §5.3)
2. **Every amount is `<Money>` with the row's own market.** A Qatari payout is QAR on an Indian admin's screen; BHD/KWD/OMR carry three minor units.
3. **A control that moves money is disabled until its permission is held, and confirmed with a `ConfirmDialog` that restates the amount and the recipient.**

- [ ] **Step 1: Failing spec**

```ts
/**
 * The payouts page had ten hardcoded partner rows — names, bank accounts and
 * amounts — replaced only when `res.success && data.length > 0`. A 401, a 403,
 * a 500 or an unreachable gateway therefore left an administrator reading
 * invented bank details with no error state and no demo indicator, on the page
 * where they approve payments.
 */
it('ships no seeded payout rows', () => {
  const s = src('payouts/page.tsx');
  expect(s).not.toMatch(/const payouts\s*[:=]/);
  expect(s).not.toMatch(/=\s*\[\s*\{\s*id:/);
  expect(s).not.toMatch(/\b\d{4,}\s*\d{4,}\b/); // no account-number-shaped literals
  expect(s).not.toContain('₹');
});

it('shows the failure panel instead of rows when the call fails', () => {
  failure = new ApiError({
    status: 500,
    messages: ['payout-service failed'],
    route: 'GET /admin/marketplace/payouts',
  });
  const html = renderToStaticMarkup(React.createElement(PayoutsPage));
  expect(html).toContain('GET /admin/marketplace/payouts');
  expect(html).not.toMatch(/\bAPPROVE\b/i); // no money control over a failed load
});

it('the returns page has no refund button without a handler', () => {
  const s = src('marketplace/returns/page.tsx');
  expect(s).not.toMatch(/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/);
});

it('confirms a refund with the amount and the recipient before it is sent', () => {
  const html = renderToStaticMarkup(React.createElement(ReturnsPage /* with a selected row */));
  expect(html).toMatch(/Refund .*to .*\?/);
});

it('renders an unknown payout status as itself rather than blanking the table', () => {
  data = { data: [{ id: 'p', status: 'ESCHEATED', amount: 10, regionCode: 'QA' }], total: 1 };
  expect(() => renderToStaticMarkup(React.createElement(PayoutsPage))).not.toThrow();
});
```

- [ ] **Step 2–3: implement.** The returns page's dead _Initiate Refund_ button becomes either a real call —

```tsx
{
  hasPermission('orders.refund') && (
    <Button tone="danger" onClick={() => setRefunding(row)}>
      Initiate refund
    </Button>
  );
}
<ConfirmDialog
  open={!!refunding}
  title="Initiate refund"
  body={
    <>
      Refund <Money amount={refunding?.amount} country={refunding?.regionCode} /> to{' '}
      {refunding?.customerName}? This moves money and cannot be undone here.
    </>
  }
  confirmLabel="Refund"
  busy={actionLoading}
  onClose={() => setRefunding(null)}
  onConfirm={() =>
    execute(
      () => adminMarketplaceApi.approveReturn(refunding!.id, { refund: true }),
      'Refund initiated',
      () => {
        setRefunding(null);
        refetch();
      },
    )
  }
/>;
```

— or, if `POST /admin/refunds/:id/approve` does not yet exist, the button is **removed** and the page carries one line naming the route it is waiting for. A money control that cannot move money is worse than no control.

- [ ] **Step 4: Verify, screenshot, commit**

```bash
cd apps/web && npx jest marketplace-money && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "payout|commission|return|refund"
node apps/api/scripts/verification/console-census-gate.mjs --fixture 122 --no-api 142
```

Live proof: as a QA regional admin, confirm the payouts list is QA-only and that a global payout view is refused; approve one payout and confirm the state persists across a reload and appears in the audit trail with the amount and the market.

```bash
git commit -m "fix(web): payouts, commissions and returns show real money or a failure, never seeded bank rows" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4 (K2-4): Delivery, zones and drivers

**Closes:** AUD2-038

**Pages (9):** `/admin/marketplace/delivery-zones`, `/admin/delivery-zones` (**remove** — duplicate), `/admin/marketplace/delivery-partners`, `/admin/marketplace/shipping-rates`, `shipping-rates/config`, `/admin/delivery`, `/admin/delivery/partners`, `/admin/delivery/live`, `/admin/drivers`

**Target routes:** `GET /admin/grocery/delivery-zones` (real, scoped, the only zone surface the platform has), `GET /admin/taxi/drivers` (for `/admin/drivers`), the `/admin-fleet` Socket.IO namespace for `/admin/delivery/live` (owned by EVENTS, consumed by the TAXI plan's D9).

**MODULES M2 removes** `GET /admin/marketplace/{delivery-zones,delivery-partners,shipping-rates,logistics}` — all four are `{data:[],total:0}` literals with no data model, and M2's own ruling is "the route is removed and the CONSOLE plan points that page at the module that owns zones". So this task does **not** wait for those routes; it disposes of the pages.

**Disposition:**

| Page                                       | Disposition         | Why                                                                                                                                                                                                                      |
| ------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin/marketplace/delivery-zones`        | **repoint**         | reads `GET /admin/grocery/delivery-zones` — the one real, market-scoped zone surface — and its mutations go to the grocery zone routes; the bare-`/api` fetch and `FALLBACK_ZONES` go now, whatever happens to the route |
| `/admin/delivery-zones`                    | **remove**          | a second page over the same subject, in no nav                                                                                                                                                                           |
| `/admin/marketplace/delivery-partners`     | **remove**          | duplicate of `/admin/delivery/partners`                                                                                                                                                                                  |
| `/admin/delivery/partners`                 | **`NotBuiltState`** | delivery-service has no entities; names `GET /admin/delivery/partners`                                                                                                                                                   |
| `/admin/marketplace/shipping-rates`        | **`NotBuiltState`** | route removed by M2                                                                                                                                                                                                      |
| `/admin/marketplace/shipping-rates/config` | **remove**          | a child of a not-built page                                                                                                                                                                                              |
| `/admin/delivery`                          | **wire**            | becomes the delivery landing page over the grocery zones and the taxi driver list, both real                                                                                                                             |
| `/admin/delivery/live`                     | **`NotBuiltState`** | names the `/admin-fleet` namespace; EVENTS owns it and the TAXI plan's D9 consumes it — this page is repointed there, not built here                                                                                     |
| `/admin/drivers`                           | **wire**            | `GET /admin/taxi/drivers`, which is real and scoped                                                                                                                                                                      |

**Files:** the 9 page files; `apps/web/src/__tests__/delivery-pages.spec.ts`

- [ ] **Step 1: Failing spec**

```ts
/**
 * The delivery-zones page fetched `'/api/admin/marketplace/delivery-zones'` —
 * a bare `/api` with no `/v1`, which the gateway answers 404 for, always. The
 * catch installed `FALLBACK_ZONES` permanently, and `toggleZone`/`deleteZone`
 * never called anything at all while toasting "Zone status updated" and "Zone
 * deleted" unconditionally.
 */
it('never issues a raw fetch and never omits /v1', () => {
  const s = src('marketplace/delivery-zones/page.tsx');
  expect(s).not.toMatch(/fetch\(/);
  expect(s).not.toContain("'/api/admin");
  expect(s).not.toContain('FALLBACK_ZONES');
});

it('does not toast success without a server result', () => {
  const s = src('marketplace/delivery-zones/page.tsx');
  // Every showToast(..., 'success') must be inside an execute() success callback.
  expect(countOutsideExecute(s, /showToast\([^)]*'success'/g)).toBe(0);
});

it('the duplicate top-level page is gone', () => {
  expect(exists('apps/web/src/app/admin/delivery-zones/page.tsx')).toBe(false);
});
```

The `countOutsideExecute` helper is worth writing once here and reusing in K2-7 to K2-12: it is the mechanical form of "do not leave fake buttons".

- [ ] **Step 2–4: implement, verify, commit**

```bash
cd apps/web && npx jest delivery-pages && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "delivery|driver|zone"
node apps/api/scripts/verification/console-census-gate.mjs --fixture 117 --no-api 137
# also: BARE-/api-NO-V1 must now be 0 and NO-GATEWAY-ROUTE 0.
git commit -m "fix(web): delivery zones call the gateway through a client and stop toasting success for nothing" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5 (K2-5): The rest of marketplace — promotions, reports, settings, and the pages that go

**Closes:** — (its 62 pages are counted under AUD2-111, closed in K2-13)

**Pages (62):** the marketplace remainder. Grouped by disposition:

- **Wire (31):** `sellers`, `sellers/[id]`, `seller-approvals`, `seller-health`, `customers`, `customers/[id]`, `customer-segments`, `coupons`, `coupons/create`, `coupons/[id]/detail`, `flash-deals`, `flash-deals/create`, `flash-deals/[id]/detail`, **`banners`** (MODULES M2 wires `GET /admin/marketplace/banners` to `admin_get_banners` — it is the one stub M2 keeps, and until now the Banners screen could save a banner it could never list), `banners/create`, `bank-offers` (real rows after M9), `exchange-offers`, `promotions`, `categories`, `categories/create`, `categories/[id]`, `subcategories`, `attributes`, `attributes/[id]`, `hsn-tax-master`, `compliance/countries`, `compliance/tax`, `audit-logs`, `notifications`, `settings`, `settings/global-config`
- **Honest — the route exists and may answer 501/503 (11):** `analytics/gmv`, `analytics/traffic`, `analytics/behavior`, `integrations`, `translations`, `system-health` (M2 keeps it: it reads the fleet), `webhooks`, `search-config`, `recommendations`, `feature-flags`, `messaging`. Each calls its route and renders whatever it returns.
- **`NotBuiltState` — MODULES M2 removes the route (14):** `reports` and its seven children (`revenue`, `traffic`, `conversion`, `fraud`, `categories`, `seller-rankings`, `ab-tests`), `gift-cards`, `logistics`, `gst-invoicing`, `abandoned-carts`, `ip-violations`. These call nothing because there is nothing to call; `<NotBuiltState feature="…" route="…" />` names the feature and the route, renders no table and no control, and the pages are **listed by name in this plan's self-review** as the console's permitted `NO-API` set.
- **Remove (8):** `campaigns`, `campaigns/create` (no `campaigns` table, no route; design §5.2 and programme C1 both say decide, and the decision is remove), `gift-cards/create` (a create page for a not-built feature), `brand-center` (M2 removes `GET brand-center`; its one real function folds into `/admin/marketplace/brands`), `marketplace/dashboard` (redirect twin of `marketplace`), `marketplace/page-builder` (twin of `/admin/page-builder`), `marketplace/seo-settings` (twin of `/admin/seo`), `india-ops` (a single-market page in a multi-market console — its two live features move onto `compliance/countries`)

**Coupon writes.** The admin client reads through the scoped `/admin/marketplace/coupons` and **writes** through the seller-facing `/marketplace/coupons` (`@Roles(SELLER, ADMIN, SUPER_ADMIN)`, no market scope). Coupons are per-market, so this is wrong, but no sibling plan has committed to `POST/PUT/DELETE /admin/marketplace/coupons`. K2-5 therefore leaves the writes where they are, adds a one-line comment at the three call sites naming the problem, and records the row in this plan's self-review. It does not quietly repoint them at a route that does not exist.

**The honest page, written once and reused 11 times:**

```tsx
export default function MarketplaceRevenueReportPage() {
  // `GET /admin/marketplace/reports` answers with a literal, and
  // `/admin/reports/revenue` answers 501. This page calls the real route and
  // renders whatever it says — which is how an administrator learns the
  // difference between "no revenue" and "no report service", and how the
  // census counts this page as connected rather than as a fixture.
  const { data, loading, failure, refetch } = useAdminData(
    () => adminMarketplaceApi.getRevenueReport({ country, from, to }), [country, from, to]);
  return (
    <AdminPage title="Revenue report" description="Gross and net revenue by market and period.">
      <AdminState
        loading={loading} failure={failure} route="GET /admin/marketplace/reports/revenue"
        what="The revenue report" onRetry={refetch}
        isEmpty={!data?.rows?.length}
        empty={{ title: 'No revenue in this period', hint: `${from} – ${to}, ${country ?? 'all markets'}` }}
      >
        <DataTable … />
      </AdminState>
    </AdminPage>
  );
}
```

There is no "coming soon" copy anywhere in it: the words come from the server.

**Files:** 62 page files, 6 deletions, `navigation.ts` (remove the `campaigns` entry if present), `apps/web/src/__tests__/marketplace-remainder.spec.ts`

- [ ] **Step 1: Failing spec** — one source-level sweep over the 62 files rather than 62 render tests:

```ts
const PAGES = glob('apps/web/src/app/admin/marketplace/**/page.tsx');

it('no marketplace page ships a fixture array', () => {
  expect(
    PAGES.filter((p) => /MOCK_|SAMPLE_|DEMO_|FALLBACK_|=\s*\[\s*\{\s*id:/.test(read(p))),
  ).toEqual([]);
});
it('no marketplace page hard-codes a currency', () => {
  expect(PAGES.filter((p) => /[₹$€£¥]|'(INR|QAR|AED|SAR|KWD|BHD|OMR)'/.test(read(p)))).toEqual([]);
});
it('every marketplace page renders one of the shared states', () => {
  expect(PAGES.filter((p) => !/AdminState|DataTable/.test(read(p)))).toEqual([]);
});
it('the six removed pages are gone', () => {
  for (const p of REMOVED) expect(exists(p)).toBe(false);
});
it('no page toasts success outside an execute callback', () => {
  expect(
    PAGES.filter((p) => countOutsideExecute(read(p), /showToast\([^)]*'success'/g) > 0),
  ).toEqual([]);
});
```

- [ ] **Steps 2–4: implement in three sub-batches** (wire / honest / remove), running the sweep after each so the failing list shrinks visibly.

- [ ] **Step 5: Verify, screenshot, commit**

```bash
cd apps/web && npx jest marketplace-remainder && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "marketplace"
node apps/api/scripts/verification/console-census-gate.mjs --fixture 86 --no-api 100   # pages 250 → 244
git commit -m "fix(web): the marketplace console shows the api or names the route; six duplicate pages removed" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6 (K2-6): Grocery (18 pages)

**Closes:** — (counted under AUD2-111)

**Pages (18):** `/admin/grocery`, `banners`, `brands`, `categories`, `commissions`, `complaints`, `countries`, `delivery-zones`, `flash-deals`, `offers`, `orders`, `page-builder`, `products`, `refunds`, `reports`, `seller-approvals`, `settings`, `stores`

**Target routes:** `GET/POST/PATCH/DELETE /admin/grocery/{products,categories,orders,delivery-zones,flash-deals,settings,reports,stores}` — grocery is the reference module: 8 of 18 pages already work, `scopeOf` plus `assertInMarket(store.regionCode)` is applied, and the category tree is `@GlobalEntity`.

**Disposition:** 8 **keep** (restyle onto `AdminPage`/`DataTable` only), 6 **wire** (`banners`, `complaints`, `offers`, `refunds`, `brands`, `commissions` — probe each; the four twenty-three-line stubs named in design §5.2 are among them), 4 **honest** if their probe shows a stub. `/admin/grocery/countries` becomes a **read-only market view** driven by the region registry — it is not a country CRUD (that is `/admin/regions`, K2-11).

**One grocery-specific rule:** the module ran its own country + language state once (`project_grocery_locale_split`). The admin pages take the market from the token and the header, never from a grocery-local selector.

**DataTable (stores):** Store · Market (`regionCode`) · City · Orders (7d) · Rating · Status (`StatusBadge`) · Actions (Approve / Suspend / View).

- [ ] **Step 1: spec** — same sweep shape as K2-5, over `apps/web/src/app/admin/grocery/**`, plus one render test for the store list's market scoping:

```ts
it('never sends a market when the admin is locked', () => {
  auth = { regionLocked: true, regionCode: 'QA' };
  renderToStaticMarkup(React.createElement(GroceryStoresPage));
  expect(getStores).toHaveBeenCalledWith(
    expect.not.objectContaining({ country: expect.anything() }),
  );
});
```

- [ ] **Steps 2–4: implement, verify, commit**

```bash
cd apps/web && npx jest grocery-admin && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "grocery"
node apps/api/scripts/verification/console-census-gate.mjs --fixture 84 --no-api 91
git commit -m "fix(web): grocery admin pages move onto the shared table and stop carrying their own fixtures" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7 (K2-7): The five module hub pages tell the truth

**Closes:** AUD2-041, AUD2-104

**Pages (6):** `/admin/doctor`, `/admin/hotel-booking`, `/admin/pharmacy`, `/admin/restaurant`, `/admin/taxi`, plus `/admin/restaurant/orders` and `/admin/restaurant/approvals` (the two other pages with the same dead-`catch` shape)

This is a small task placed before the four big module tasks on purpose: the bug it fixes is one pattern repeated six times, and fixing it first means K2-8 to K2-10 inherit a correct hub.

**The pattern, and why it is a lie twice over:**

```ts
// before
try {
  const res = await adminDoctorApi.getDoctors(); // never throws
  if (res.success && res.data?.length) {
    setData(res.data);
    setSource('api');
  }
} catch {
  /* keep demo */
} // dead code: nothing throws
const toggleBlock = (id: string) =>
  setData((d) => d.map((x) => (x.id === id ? { ...x, blocked: !x.blocked } : x))); // no API call at all
```

The `catch` can never run, so `res.success === false` is never checked and a 401, 403 or 500 leaves the seeded array on screen. And `source: 'api' | 'demo'` is tracked on all four pages and **read in none of them** — the demo banner was written and never rendered.

**Disposition:** all six **wire**.

```ts
// after
const { data, loading, failure, refetch, showToast } = useAdminData(
  () => adminDoctorApi.getDoctors({ page, limit, country }),
  [page, limit, country],
);
const { execute, actionLoading } = useAdminAction(showToast);
const toggleBlock = (row: Doctor) =>
  execute(
    () =>
      row.blocked
        ? adminDoctorApi.unblockDoctor(row.id)
        : adminDoctorApi.blockDoctor(row.id, { reason }),
    row.blocked ? 'Doctor unblocked' : 'Doctor blocked',
    refetch, // the list re-reads the server
  );
```

The `source` flag is deleted outright: with `useAdminData` there is no demo branch left to flag.

- [ ] **Step 1: Failing spec**

```ts
const HUBS = ['doctor', 'hotel-booking', 'pharmacy', 'restaurant', 'taxi']
  .map((m) => `admin/${m}/page.tsx`)
  .concat(['admin/restaurant/orders/page.tsx', 'admin/restaurant/approvals/page.tsx']);

it('has no dead catch around a non-throwing client', () => {
  expect(
    HUBS.filter((p) =>
      /catch\s*(\([^)]*\))?\s*\{\s*(\/\*[^*]*\*\/|\/\/[^\n]*)?\s*\}/.test(read(p)),
    ),
  ).toEqual([]);
});
it('has no handler that only calls setState', () => {
  expect(
    HUBS.filter((p) =>
      /const (toggle|approve|suspend|block)\w*\s*=\s*\([^)]*\)\s*=>\s*set\w+\(/.test(read(p)),
    ),
  ).toEqual([]);
});
it('no longer tracks a source flag nothing reads', () => {
  expect(HUBS.filter((p) => /setSource\(/.test(read(p)))).toEqual([]);
});
it('shows the failure panel instead of the seeded array on a 403', () => {
  /* per hub, render test */
});
```

- [ ] **Steps 2–4: implement, verify, commit**

```bash
cd apps/web && npx jest module-hubs && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "hub"
node apps/api/scripts/verification/console-census-gate.mjs --fixture 80 --no-api 91
```

Live proof, with `DEV_AUTH_BYPASS=false`: open each hub as a role that does **not** hold the module key and confirm the forbidden panel appears with the key named; block a doctor as a SUPER_ADMIN, reload, confirm it stuck.

```bash
git commit -m "fix(web): module hub pages check the result, and their block and approve buttons call the api" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8 (K2-8): Hotel (23 pages) and Doctor (8 pages)

**Closes:** — (counted under AUD2-111; the dead imports under AUD2-106, closed in K2-11)

**Pages (31):**
Hotel — `/admin/hotel-booking` (done in K2-7), `bookings`, `commission-tiers`, `commissions`, `complaints`, `compliance`, `disputes`, `fraud`, `hotels`, `loyalty`, `offers`, `onboarding`, `pricing`, `quality`, `refunds`, `reports`, `revenue`, `reviews`, `rooms`, `settings`, `settlements`, `tax`, `verifications`
Doctor — `/admin/doctor` (done in K2-7), `appointments`, `approvals`, `clinics`, `documents`, `hospitals`, `reviews`, `specialties`

These two modules have the worst ratio in the console: **all 22 hotel sub-pages import a client and never call it** and 21 of 23 are fixture templates; doctor is 8 fixtures over 7 pages. 12 hotel and 12 doctor gateway commands have no backend handler.

**Disposition, decided by one probe per page:**

```bash
for r in hotels rooms bookings reviews payouts settings; do
  printf '%-12s ' "$r"
  curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $SUPER" \
    "localhost:3099/api/v1/admin/hotel/$r?limit=1"
done
```

- **200 with rows that change when the filter changes** → **wire**.
- **200 with the same rows for any input** → a fabricated fallback (`project_gateway_fabricated_fallbacks`); **honest**, and record the command in the MODULES dependency list.
- **503** → the command has no handler; **honest**, naming the route, and the panel the user sees is the real 503.

The dead import in each page is the work list (audit D #17): each one already names the client method its author intended.

**Doctor-specific:** `Doctor` has no market column, so the directory fails closed for a locked admin — the page must render the 403 it gets rather than an empty list, and its copy says the market dimension is missing (that is the MODULES plan's migration, not a console bug).

- [ ] **Step 1: spec** — the sweep, plus one assertion per module that the dead imports are gone:

```ts
it('leaves no imported client uncalled', () => {
  for (const p of HOTEL_PAGES.concat(DOCTOR_PAGES)) {
    const s = read(p);
    const imported = [
      ...s.matchAll(/import\s*\{([^}]*)\}\s*from\s*'@\/lib\/api\/admin-(hotel|doctor)'/g),
    ].flatMap((m) => m[1].split(',').map((x) => x.trim().split(' ')[0]));
    for (const name of imported.filter((n) => /Api$/.test(n))) {
      expect(new RegExp(`${name}\\.`).test(s), `${p} imports ${name} and never calls it`).toBe(
        true,
      );
    }
  }
});
```

- [ ] **Steps 2–4: implement in two commits (hotel, then doctor), verify, screenshot**

```bash
cd apps/web && npx jest hotel-admin doctor-admin && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "hotel|doctor"
node apps/api/scripts/verification/console-census-gate.mjs --fixture 52 --no-api 63
git commit -m "fix(web): hotel admin pages call the clients they import, or name the command with no handler" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git commit -m "fix(web): doctor admin pages read the api and show the market refusal instead of an empty list" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9 (K2-9): Restaurant (15 pages) and Pharmacy (15 pages)

**Closes:** — (counted under AUD2-111)

**Pages (30):**
Restaurant — `/admin/restaurant` + `orders` + `approvals` (K2-7), `[id]`, `analytics`, `commissions`, `complaints`, `cuisines`, `dine-in-orders`, `landing-editor`, `menu-approvals`, `promotions`, `table-bookings`, `takeaway-orders`, `zones`
Pharmacy — `/admin/pharmacy` (K2-7), `banners`, `categories`, `commissions`, `complaints`, `offers`, `orders`, `products`, `refunds`, `reports`, `settings`, `settlements`, `stores`, `tax`, `verifications`

12 restaurant and 17 pharmacy commands have no handler; pharmacy has **no `assertInMarket` anywhere in the module** and its stores are seeded with Mumbai district codes (`MUM-*`) in `regionCode`, so the one market predicate it does have matches nothing. Both are noted here because they change what a correct page _shows_: a pharmacy list that comes back empty for a QA admin is the seed data, not the page.

**Disposition:** probe-driven as in K2-8. `restaurant/landing-editor` is **removed** if the taxi landing-editor's `/admin/layouts/*` surface is still unscoped (a locked admin saving a layout overwrites it for every market, audit D #18) — otherwise **wire** with the market in the key. Record the decision.

**Pharmacy-specific:** the module handles prescriptions. Any page that can display a prescription image or a patient name renders it behind an explicit `perm:` check and never in a CSV export.

- [ ] **Steps 1–4** as in K2-8, two commits.

```bash
cd apps/web && npx jest restaurant-admin pharmacy-admin && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "restaurant|pharmacy"
node apps/api/scripts/verification/console-census-gate.mjs --fixture 28 --no-api 41
git commit -m "fix(web): restaurant admin pages read the api and name the twelve commands with no handler" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git commit -m "fix(web): pharmacy admin pages read the api and keep prescription data behind a permission" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10 (K2-10): Taxi — the handoff to Plan D, and the verification

**Closes:** — (the taxi pages are counted under AUD2-111, and the taxi console rows AUD2-058/059/061 belong to the TAXI plan)

**This task does not rebuild the taxi console.** `docs/superpowers/plans/2026-09-12-taxi-ops-plan.md` Task **D8** ("The console taxi pages tell the truth") owns all 20 taxi page files by name and states a disposition for each. Two plans editing the same 20 files would produce conflicting removals — an earlier draft of this plan proposed deleting `landing-editor`, `routes`, `intercity`, `rentals`, `rental-fleet`, `scheduled` and `reconciliation`, while D8 keeps five of those seven. **D8's dispositions win**, because that plan also builds the handlers behind them.

D8's rulings, restated here so this plan's invariants (K2-13) do not contradict them:

| Pages                                                                                                                                 | D8 disposition                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `fleet`, `compliance`, `landing-editor`                                                                                               | **kept and wired** — the three unauthenticated `fetch` sites become `adminTaxiApi` / `adminLayoutApi` calls; `setSaved(true)` only on success |
| `routes`, `surge`, `rides`, `complaints`, `complaints/[id]`, `vendors`, `vendors/[id]`, `pending-approvals`, `ratings`, `/admin/taxi` | **rebuilt** on the handlers D3–D7 add                                                                                                         |
| `drivers`, `payouts`, `pricing`, `settings`                                                                                           | **kept**, paging wired to the new `{page,limit,total}`, `Money` replaces the symbol                                                           |
| `intercity`, `rentals`, `rental-fleet`, `scheduled`                                                                                   | **kept, marked not built** with `<NotBuiltState>` — no fixture rows, no controls                                                              |
| `reconciliation`                                                                                                                      | **deleted** with its nav entry — the only taxi page this programme removes                                                                    |

**What this task actually does:**

- [ ] **Step 1: Confirm Plan K1 gave Plan D what D8 declares it consumes**

D8's Interfaces block names `apiCall`, `DataTable<T>` (`columns`, server paging from `{ data, total, page, limit }`, `loading`, `error`, `empty`), `EmptyState`, `ErrorState`, `Skeleton`, `StatusBadge`, `Money` and `NotBuiltState`. K1-7 and K1-8 export all of them, and `DataTable` accepts the `loading` / `error` / `empty` shorthand as well as the `state` object precisely so D8's spelling compiles. Verify, do not assume:

```bash
cd apps/web && npx tsc --noEmit -p . 2>&1 | grep -i "admin-ui\|DataTable\|NotBuiltState" || echo "exports satisfied"
node -e "const s=require('fs').readFileSync('packages/shared-ui/src/admin/index.ts','utf8');
  for (const n of ['DataTable','EmptyState','ErrorState','Skeleton','StatusBadge','Money','NotBuiltState','useTableParams'])
    if (!s.includes(n)) { console.error('MISSING export:', n); process.exit(1); }
  console.log('all D8 imports are exported');"
```

If one is missing, add it to K1-7's `primitives.tsx` **in this task** and say so — an interface the sibling plan declared is this plan's obligation, not its excuse.

- [ ] **Step 2: `adminTaxiApi` is ready for D8**

K1-3 rewrote `packages/shared-core/src/api/admin-taxi.ts` as a thin wrapper over `apiCall` and added the three methods that had no client at all — `getPendingDocuments`, `approveDocument`, `getPayoutSummary` — so the driver-document approval workflow the gateway has always served is reachable. Confirm they are present and typed, and that no method in the file builds its own URL from `API_BASE_URL`:

```bash
grep -n "fetch(\|API_BASE_URL\|getHeaders" packages/shared-core/src/api/admin-taxi.ts   # expect: no output
grep -c "apiCall" packages/shared-core/src/api/admin-taxi.ts                             # one per method
```

- [ ] **Step 3: Extend the shared harness to the taxi routes**

Add the 19 surviving taxi routes to `apps/web/e2e/admin-routes.ts` so D8's work is measured by the same harness as everything else — one harness, not a taxi-specific one:

```ts
{ href: '/admin/taxi',                  module: 'taxi', needs: 'modules.taxi' },
{ href: '/admin/taxi/drivers',          module: 'taxi', needs: 'modules.taxi' },
// … 17 more; `reconciliation` is absent because D8 deletes it
```

- [ ] **Step 4: Verify D8's output against this plan's invariants**

Run after D8 has landed, not before. These are the same assertions K2-13 makes over every page; running them here means a taxi regression is caught by the workstream that owns the console rather than after the merge:

```bash
cd apps/web && npx jest -t "taxi"          # D8's own specs plus this plan's sweep
cd apps/web && npx playwright test --project=admin-chrome -g "taxi"
# screenshots: _admin_taxi@{375,768,1024,1440}.png, _admin_taxi_drivers@…, _admin_taxi_vendors_<id>@…
node apps/api/scripts/verification/console-census-gate.mjs --fixture 12 --no-api 28 --fetch-no-auth 0
```

`FETCH-NO-AUTH-HEADER` must be **0** after this point: taxi held four of the five, and `/admin/marketplace/{orders,products}/[id]` — the other two sites — were cleared in K2-1 and K2-2.

Live proof with `DEV_AUTH_BYPASS=false`: open `/admin/taxi/fleet` signed out — it must redirect to the login page and never render a board; signed in as the QA regional admin, confirm every panel shows QA data or the real 503 for a command with no handler, and that a driver approval persists across a reload and appears in the audit trail.

- [ ] **Step 5: If D8 has not landed when this task is reached**

Do **not** start rebuilding the pages. Do the one thing that is unambiguously this plan's and cannot conflict: delete the three unauthenticated `fetch` call sites' _fixture fallbacks_ (`mockDrivers`, `mockRides`, `mockSurgeZones`, the static `rules` list) and let the pages render `ErrorState`. That is a strict subset of D8's own instruction ("do not keep a bare `fetch` and do not keep a fixture fallback"), so it cannot be undone by D8, and it removes the console's most convincing lie — a board that polls every ten seconds and has never been live. Then leave the task open, note it in the completion record, and let D8 finish it.

- [ ] **Step 6: Commit (only if Step 5 was taken)**

```bash
git add apps/web/src/app/admin/taxi apps/web/e2e/admin-routes.ts
git commit -m "fix(web): the taxi fleet board shows its failure instead of polling three mock arrays" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11 (K2-11): Core, content and system pages

**Closes:** AUD2-044, AUD2-105, AUD2-106

**Pages (28):** `/admin/customers`, `analytics`, `system-health`, `settings`, `settings/module-titles`, `gdpr`, `notifications`, `support`, `sos`, `two-factor`, `seo`, `static-pages`, `static-pages/[slug]`, `content`, `content/create`, `content/edit`, `page-builder`, `brand-followers`, `seller-content`, `pages/terms`, `regions`, `regions/[code]`, `sellers`, `kyc-verification`, `security`, `audit-logs`, `staff`, `roles`

These are the 22 nav-linked pages that call nothing (AUD2-044) plus the six that already work and only need the design system.

**Disposition, page by page:**

| Page(s)                                                                                                         | Disposition                                                                  | Route                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `staff`, `roles`, `audit-logs`, `security`, `kyc-verification`, `sellers`                                       | **keep**                                                                     | already wired and correct — restyle onto `AdminPage`/`DataTable` only, no behaviour change                                                                                                                       |
| `customers`                                                                                                     | **wire**                                                                     | `GET /admin/users?role=CUSTOMER` with scope; delete the 10-row `init` literal and `₹`/`AED`/`£` strings                                                                                                          |
| `seo`, `static-pages`, `static-pages/[slug]`                                                                    | **wire**                                                                     | `admin-seo.controller.ts` (6 routes) and `static-pages.controller.ts` (5) — finished controllers with no client until K1-3 added `adminSeoApi`/`adminStaticPagesApi`. **The cheapest real wins in the console.** |
| `notifications`                                                                                                 | **wire**                                                                     | `GET /admin/marketplace/notifications` — the per-admin inbox Plan B built and this page never called                                                                                                             |
| `analytics`                                                                                                     | **wire**                                                                     | the marketplace analytics routes, scoped; drop `mockData`                                                                                                                                                        |
| `system-health`                                                                                                 | **wire**                                                                     | `GET /admin/platform/health` (MODULES: per-service state)                                                                                                                                                        |
| `two-factor`                                                                                                    | **rebuild**                                                                  | staff MFA enrolment state from the API; delete the `Math.random()` fixture outright                                                                                                                              |
| `regions`, `regions/[code]`                                                                                     | **rebuild**                                                                  | Countries & Markets over `admin.market_settings` (MODULES); until it lands, a read-only view of the region registry with the module toggles disabled and an explicit note                                        |
| `settings`, `settings/module-titles`                                                                            | **honest**                                                                   | there is no platform settings route; each names the route it needs                                                                                                                                               |
| `gdpr`, `support`, `sos`                                                                                        | **honest**                                                                   | no backend; `sos` names `GET /admin/taxi/complaints?type=SOS` as its intended source                                                                                                                             |
| `content`, `content/create`, `content/edit`, `page-builder`, `brand-followers`, `seller-content`, `pages/terms` | **wire or honest** per probe; `content/edit`'s fixture is removed either way |
| `/admin/dashboard`                                                                                              | **remove**                                                                   | a bare `redirect('/admin')` reachable from nothing                                                                                                                                                               |
| `/admin/refunds`, `/admin/loyalty`, `/admin/wallet-audit`, `/admin/franchise`                                   | deferred to K2-12                                                            |                                                                                                                                                                                                                  |

`/admin/customers` in full, as the worked example for this task:

```tsx
'use client';
export default function CustomersPage() {
  const t = useTableParams({ limit: 25, sort: { key: 'createdAt', dir: 'desc' } });
  const { user, hasPermission } = useAuth();
  const locked = user?.regionLocked === true;
  const { data, loading, failure, refetch, toast, showToast } = useAdminData(
    () =>
      adminCoreApi.getUsers({
        role: 'CUSTOMER',
        page: t.page,
        limit: t.limit,
        search: t.q,
        status: t.filters.status,
        country: locked ? undefined : t.filters.regionCode,
      }),
    [t.key],
  );
  const { execute, actionLoading } = useAdminAction(showToast);
  const [banning, setBanning] = useState<AdminUser | null>(null);
  const [detail, setDetail] = useState<AdminUser | null>(null);

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          <p className="text-xs text-slate-500">{r.email}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', hideBelow: 'lg' },
    {
      key: 'regionCode',
      header: 'Market',
      hideBelow: 'md',
      render: (r) => (
        <>
          <CountryFlag code={r.regionCode} /> {r.regionCode}
        </>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      hideBelow: 'sm',
      render: (r) => <time dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>,
    },
    {
      key: 'orderCount',
      header: 'Orders',
      align: 'right',
      sortable: true,
      value: (r) => r.orderCount,
    },
    {
      key: 'lifetimeValue',
      header: 'Lifetime value',
      align: 'right',
      sortable: true,
      // The old page wrote `spent: '₹24,500'` as a STRING in the fixture, so the
      // number was never a number and no market could change it.
      render: (r) => <Money amount={r.lifetimeValue} country={r.regionCode} />,
      value: (r) => r.lifetimeValue,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge module="core" status={r.status} />,
    },
  ];

  return (
    <AdminPage
      title="Customers"
      description="Everyone who has bought in the markets you administer."
      market={
        <MarketSelect
          value={t.filters.regionCode}
          onChange={(v) => t.setFilter('regionCode', v)}
          disabled={locked}
        />
      }
      filters={
        <FilterBar
          specs={CUSTOMER_FILTERS(locked)}
          values={t.filters}
          onChange={t.setFilter}
          search={{ value: t.q, onChange: t.setQ, placeholder: 'Name, email or phone' }}
        />
      }
    >
      <DataTable<AdminUser>
        rows={data?.data ?? []}
        total={data?.total ?? 0}
        columns={columns}
        rowKey={(r) => r.id}
        page={t.page}
        limit={t.limit}
        onPageChange={t.setPage}
        onLimitChange={t.setLimit}
        sort={t.sort}
        onSortChange={t.setSort}
        onRowClick={setDetail}
        rowActions={(r) => [
          { label: 'View', onSelect: () => setDetail(r) },
          ...(hasPermission('users.manage')
            ? [
                r.status === 'BANNED'
                  ? {
                      label: 'Unban',
                      onSelect: () =>
                        execute(() => adminCoreApi.unbanUser(r.id), `${r.name} unbanned`, refetch),
                    }
                  : { label: 'Ban', tone: 'danger' as const, onSelect: () => setBanning(r) },
              ]
            : []),
        ]}
        exportCsv={{
          filename: `customers-${t.filters.regionCode ?? user?.regionCode ?? 'all'}.csv`,
        }}
        state={{ loading, failure, route: 'GET /admin/users?role=CUSTOMER', onRetry: refetch }}
        emptyTitle="No customers match these filters"
      />
      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''}>
        {detail && <CustomerDetail user={detail} />} {/* orders from order-service, scoped */}
      </Drawer>
      <ReasonDialog
        open={!!banning}
        title={`Ban ${banning?.name ?? ''}`}
        confirmLabel="Ban customer"
        busy={actionLoading}
        onClose={() => setBanning(null)}
        onConfirm={(reason) =>
          execute(
            () => adminCoreApi.banUser(banning!.id, { reason }),
            `${banning!.name} banned`,
            () => {
              setBanning(null);
              refetch();
            },
          )
        }
      />
      <Toaster toasts={toast ? [toast] : []} />
    </AdminPage>
  );
}
```

Note the scoping bug this page must not inherit: `GET /admin/users` filters on `users.country`, **not** `users.region_code` (audit §4, E V6). Until the MODULES plan fixes the column, the page passes `country` and the market column shows what the API returned — it does not silently relabel `country` as the market.

- [ ] **Step 1: Failing spec** — `apps/web/src/__tests__/core-admin-pages.spec.ts`, the sweep plus the customers render tests above and one assertion for AUD2-106:

```ts
it('leaves no page importing a client it never calls', () => {
  expect(ALL_ADMIN_PAGES.filter(hasDeadClientImport)).toEqual([]);
});
```

- [ ] **Steps 2–4: implement in three commits** (core + customers; content + SEO + static pages; system + regions + two-factor), verify, screenshot.

```bash
cd apps/web && npx jest core-admin-pages && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "customers|seo|static|settings|regions|two-factor"
node apps/api/scripts/verification/console-census-gate.mjs --fixture 3 --no-api 10
# DEAD-CLIENT-IMPORT must now be 0; pages 244 → 241 (/admin/dashboard removed).
git commit -m "fix(web): customers, analytics and notifications read the api instead of a ten-row literal" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git commit -m "feat(web): the seo and static-pages consoles call the controllers that were already finished" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git commit -m "fix(web): system, regions and two-factor pages say what they need instead of inventing state" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12 (K2-12): Franchise, wallet, loyalty and refunds

**Closes:** — (counted under AUD2-111)

**Pages (4):** `/admin/franchise`, `/admin/wallet-audit`, `/admin/loyalty`, `/admin/refunds`

Four nav items whose permission keys — `franchise.view`, `wallet.audit`, `loyalty.view`, `orders.refund` — grant nothing today, because the gateway declares no admin franchise, wallet or loyalty route at all and no refund list route. K1-4 deliberately kept all four items rather than deleting a market the platform genuinely has.

**Disposition:**

| Page           | Disposition                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wallet-audit` | **wire** to what exists: `/admin/marketplace/wallet/*` (adjust and freeze are real and fail closed on an unattributable balance) plus a transaction list once MODULES lands `GET /admin/wallet/transactions`. Until then the page lists the adjustments it can read and names the missing list route.                                                             |
| `loyalty`      | same shape over `/admin/marketplace/loyalty/*`. Balances live in an `allkeys-lru` Redis with no entities — the page says so, because an administrator reading a balance needs to know it can be evicted.                                                                                                                                                          |
| `franchise`    | **honest**, naming the absent admin route. Do **not** wire it to `franchise.controller.ts`: that controller is customer-facing, `JwtAuthGuard`-only, with no role, owner or market check — calling it from the console would put an unguarded surface behind an admin page. Record it as a MODULES dependency and as a SECURITY row the REGIONAL workstream owns. |
| `refunds`      | **wire** to `GET /admin/marketplace/refunds` if the probe shows real rows, otherwise **honest** naming `GET /admin/refunds`.                                                                                                                                                                                                                                      |

Money on all four pages goes through `<Money country={row.regionCode}>`; the franchise page formats in the **franchise's** country, never the viewer's (`project_franchise_multi_region`).

- [ ] **Steps 1–4** as before.

```bash
cd apps/web && npx jest finance-pages && npx jest && npx tsc --noEmit -p . && npx next build
cd apps/web && npx playwright test --project=admin-chrome -g "wallet|loyalty|franchise|refund"
node apps/api/scripts/verification/console-census-gate.mjs --fixture 0 --no-api 6
git commit -m "fix(web): wallet, loyalty and refunds read the routes that exist; franchise names the one that does not" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13 (K2-13): The sweep — zero fixtures, zero dead code, one lint gate

**Closes:** AUD2-111

**Files:** whatever the sweep finds; `apps/web/eslint.config.mjs`; `apps/web/src/__tests__/console-invariants.spec.ts`

This task owns the number. Everything before it moved pages; this one proves nothing was left behind and makes the state permanent.

- [ ] **Step 1: The invariant spec**

`apps/web/src/__tests__/console-invariants.spec.ts` — the whole mandate, as assertions over all remaining admin pages:

```ts
const PAGES = glob('apps/web/src/app/admin/**/page.tsx');

describe('the admin console, as a whole', () => {
  it('ships no fixture data', () => {
    expect(PAGES.filter((p) =>
      /\b(?:const|let)\s+(?:MOCK_|SAMPLE_|DEMO_|FALLBACK_|DUMMY_|mock[A-Z]|sample[A-Z]|demo[A-Z])\w*/.test(read(p))
      || /useState(?:<[^>]*\[\]>)?\(\s*\[\s*\{/.test(read(p))
      || /=\s*\[\s*\{\s*id:/.test(read(p))
      || /Math\.random\(/.test(read(p))
    )).toEqual([]);
  });

  it('leaves no fake button', () => {
    expect(PAGES.filter((p) => /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/.test(read(p)))).toEqual([]);
  });

  it('never reports success the server did not give', () => {
    expect(PAGES.filter((p) => countOutsideExecute(read(p), /showToast\([^)]*'success'/g) > 0)).toEqual([]);
    expect(PAGES.filter((p) => /setSaved\(true\)/.test(read(p)) && !/execute\(/.test(read(p)))).toEqual([]);
  });

  it('issues no raw fetch from a page', () => {
    expect(PAGES.filter((p) => /\bfetch\(/.test(read(p)))).toEqual([]);
  });

  it('hard-codes no currency', () => {
    expect(PAGES.filter((p) => /[₹$€£¥﷼]|'(INR|QAR|AED|SAR|KWD|BHD|OMR|USD|GBP|EUR)'/.test(read(p)))).toEqual([]);
  });

  it('imports no client it does not call', () => {
    expect(PAGES.filter(hasDeadClientImport)).toEqual([]);
  });

  it('renders one of the shared states on every page that calls an API', () => {
    expect(PAGES.filter((p) => /useAdminData\(/.test(read(p)) && !/AdminState|DataTable/.test(read(p)))).toEqual([]);
  });

  it('every page that calls nothing says it is not built, and is on the allowlist', () => {
    // A page calling no API is only acceptable when there is nothing to call:
    // MODULES M2 removed eleven literal-returning routes, and pointing these
    // pages at a route that does not exist so the census could count a 404
    // would be a worse lie than the panel.
    const allowlist = new Set(
      read('docs/superpowers/plans/console-not-built.txt').split('\n')
        .map((l) => l.split('#')[0].trim()).filter(Boolean));
    const silent = PAGES.filter((p) => !/useAdminData\(|apiCall\(|Api\./.test(read(p))));
    for (const p of silent) {
      expect(read(p), `${p} calls nothing and does not say so`).toMatch(/NotBuiltState/);
      expect(allowlist.has(routeOf(p)), `${p} is not on console-not-built.txt`).toBe(true);
    }
    // And nothing is on the allowlist that has since been wired.
    for (const href of allowlist) expect(PAGES.map(routeOf)).toContain(href);
  });

  it('every not-built page names the route it is waiting for and offers no control', () => {
    for (const p of PAGES.filter((f) => /NotBuiltState/.test(read(f)))) {
      expect(read(p), `${p} must name a route`).toMatch(/route=["'](GET|POST|PATCH|PUT|DELETE) \//);
      expect(read(p), `${p} must render no table`).not.toMatch(/<DataTable/);
    }
  });

  it('gates every permission-bearing control on hasPermission', () => {
    // Any literal permission key in a page must appear inside a hasPermission call.
    for (const p of PAGES) {
      const keys = [...read(p).matchAll(/'(dashboard|orders|users|sellers|finance|kyc|content|staff|audit|system|security|wallet|loyalty|support|delivery|franchise|promotions|modules)\.[a-z]+'/g)];
      for (const k of keys) expect(read(p)).toContain(`hasPermission(${k[0]}`);
    }
  });
});
```

- [ ] **Step 2: Run — it names whatever survived. Fix each, do not weaken an assertion.**

- [ ] **Step 3: Dead code and duplicates**

```bash
cd apps/web && npx eslint "src/app/admin/**/*.tsx" --rule '{"@typescript-eslint/no-unused-vars":"error"}'
cd apps/web && npx knip --include files,exports 2>/dev/null || npx ts-prune | grep -E 'app/admin|shared-ui/src/admin'
```

Delete the unused imports, the components in `apps/web/src/components/admin/` that `DataTable`/`AdminState` replaced, and the `marketplace-audit-timeline` / per-page badge maps now covered by `Timeline` and `StatusBadge`. Do not delete anything a non-admin page imports; check before each removal.

- [ ] **Step 4: Flip the lint rule and make the gate permanent**

`apps/web/eslint.config.mjs`: `'local/no-hardcoded-currency': 'error'` (K1-9 registered it as `warn` precisely so this moment could be a deliberate step).

Add the census gate to the repo's checks so the number cannot drift back:

```json
// apps/web/package.json
"verify:console": "node ../../apps/api/scripts/verification/console-census-gate.mjs --fixture 0 --fetch-no-auth 0 --no-gateway-route 0 --bare-api 0 --dead-import 0 --no-api-allowlist ../../docs/superpowers/plans/console-not-built.txt"
```

- [ ] **Step 5: Full verification**

```bash
cd apps/web && npx jest                       # 610 baseline + every spec this plan added, 0 failed
cd apps/web && npx tsc --noEmit -p .          # 0 errors
cd apps/web && npx next build                 # compiled successfully
cd apps/web && npx eslint "src/app/admin/**/*.tsx"   # 0 errors, 0 warnings
cd apps/web && npm run verify:console
node apps/api/scripts/verification/admin-console-census.mjs \
  --json .superpowers/sdd/2026-09-12-admin-platform-review/console-census-final.json \
  --md  .superpowers/sdd/2026-09-12-admin-platform-review/console-census-final.md
# Required: FIXTURE 0 · FETCH-NO-AUTH-HEADER 0 · NO-GATEWAY-ROUTE 0 ·
#           BARE-/api-NO-V1 0 · DEAD-CLIENT-IMPORT 0 · navOrphans 0 ·
#           NO-API exactly the 26 pages on console-not-built.txt, no others.
cd apps/web && npx playwright test --project=admin-chrome
# Every route, at 375/768/1024/1440: no horizontal overflow, no overlap, no
# fixture string, no unreported failed request. Screenshots in e2e/screenshots/.
cd apps/api && npm run verify:admin-scope     # unchanged: all passed
```

- [ ] **Step 6: Commit**

```bash
git add -A apps/web packages/shared-ui packages/shared-core
git commit -m "chore(web): the admin console ships no fixture, no dead client import and no currency literal" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**AUD2 coverage — every CONSOLE row this plan owns, in exactly one task:**

| id       | Task | Row                      | id       | Task  | Row                      |
| -------- | ---- | ------------------------ | -------- | ----- | ------------------------ |
| AUD2-037 | K2-1 | Order detail page        | AUD2-044 | K2-11 | Nav-linked fixture pages |
| AUD2-038 | K2-4 | Delivery zones           | AUD2-047 | K2-2  | Product detail page      |
| AUD2-039 | K2-2 | Product moderation       | AUD2-104 | K2-7  | Module hub loads         |
| AUD2-040 | K2-3 | Platform payouts (money) | AUD2-105 | K2-11 | Uncalled controllers     |
| AUD2-041 | K2-7 | Module hub actions       | AUD2-106 | K2-11 | Dead imports             |
| AUD2-042 | K2-3 | Returns refund (money)   | AUD2-111 | K2-13 | Fixture pages (the tail) |

The other fourteen CONSOLE rows belong to Plan K1: AUD2-043, 045, 046, 048, 101, 102, 103, 107, 108, 109, 110, 112 in tasks K1-1 to K1-10, and AUD2-150 and AUD2-151 in K1's **Deferred (P3)** section with reasons. No row appears in both plans, and all 26 are accounted for.

**Deferred (P3) from this plan:** none. Every CONSOLE row assigned here is P1 or P2 and is closed by a task.

**Placeholder scan.** No task leaves a `TODO`, a "coming soon" toast, a fixture array, a `Math.random()`, a button with an empty handler or a toast that fires without a server result — K2-13's invariant spec asserts each of those over all remaining pages and fails the suite if one survives. Two dispositions render without data and neither is a placeholder: an **honest** page calls its real route and renders the 404 or 503 the gateway actually returns, with the route named in the panel; a **`NotBuiltState`** page calls nothing because MODULES M2 removed the literal-returning route and there is nothing to call, renders no table and no control, and names the route it is waiting for. Every one of the 26 is enumerated above with its owner, and `console-census-gate.mjs` fails if a twenty-seventh appears.

**Cross-plan consistency, checked against the sibling plans as written on 2026-09-12.** Three things in an earlier draft of this plan contradicted them and have been corrected: (1) MODULES M1 keys order detail on `:orderNumber`, not `:id`, and its row fields are `totalAmount`/`currency`/`placedAt`/`regionCode` — K2-1's columns and query parameters now use those names; (2) MODULES M2 **removes** eleven literal-returning routes rather than implementing them, so the eleven console callers go to `NotBuiltState` and `delivery-zones` is repointed at grocery, which owns the only real zone surface; (3) the TAXI plan's D8 owns all 20 taxi page files with its own dispositions, so K2-10 is a handoff and a verification. If any sibling plan changes one of those rulings, this plan's affected task changes in the same commit.

**Removals, in one place** (13 pages this plan removes; each loses its nav item in the same commit, and K1-4's `admin-navigation.spec.ts` fails if one is missed):

| Page                                               | Task  | Why                                                |
| -------------------------------------------------- | ----- | -------------------------------------------------- |
| `/admin/orders`                                    | K2-1  | second page over `/admin/marketplace/orders`       |
| `/admin/marketplace/orders/[id]/detail`            | K2-1  | duplicate of `orders/[id]`                         |
| `/admin/marketplace/brand-center`                  | K2-2  | M2 removes the route; folds into `brands`          |
| `/admin/delivery-zones`                            | K2-4  | second page over `marketplace/delivery-zones`      |
| `/admin/marketplace/delivery-partners`             | K2-4  | duplicate of `/admin/delivery/partners`            |
| `/admin/marketplace/shipping-rates/config`         | K2-4  | child of a not-built page                          |
| `/admin/marketplace/campaigns`, `campaigns/create` | K2-5  | no `campaigns` table, no route                     |
| `/admin/marketplace/gift-cards/create`             | K2-5  | create page for a not-built feature                |
| `/admin/marketplace/dashboard`                     | K2-5  | redirect twin of `/admin/marketplace`              |
| `/admin/marketplace/page-builder`                  | K2-5  | twin of `/admin/page-builder`                      |
| `/admin/marketplace/seo-settings`                  | K2-5  | twin of `/admin/seo`                               |
| `/admin/marketplace/india-ops`                     | K2-5  | a single-market page in a multi-market console     |
| `/admin/dashboard`                                 | K2-11 | a bare `redirect('/admin')` reachable from nothing |

Plus `/admin/taxi/reconciliation`, removed by the **TAXI** plan's D8, not here. Final page count: 250 → 236. Each removal is justified by "no backend exists and none is planned" or "a second page over one route set"; none by "it was hard to wire". The taxi pages an earlier draft of this plan proposed deleting — `landing-editor`, `routes`, `intercity`, `rentals`, `rental-fleet`, `scheduled` — are **kept**, because D8 wires two of them and marks four as not built.

**The permitted `NO-API` set** — `docs/superpowers/plans/console-not-built.txt`, written in K2-5 and appended by K2-4, K2-11, K2-12 and (from Plan D) D8. 26 pages, each rendering `<NotBuiltState>` and each naming the route it waits for:

```
# page                                    # waiting for                              # owner
/admin/marketplace/reports                GET /admin/marketplace/reports             MODULES (removed in M2; needs a report service)
/admin/marketplace/reports/revenue        GET /admin/marketplace/reports/revenue     MODULES
/admin/marketplace/reports/traffic        …                                          MODULES
/admin/marketplace/reports/conversion     …                                          MODULES
/admin/marketplace/reports/fraud          …                                          MODULES
/admin/marketplace/reports/categories     …                                          MODULES
/admin/marketplace/reports/seller-rankings …                                         MODULES
/admin/marketplace/reports/ab-tests       …                                          MODULES
/admin/marketplace/gift-cards             GET /admin/marketplace/gift-cards          MODULES (no gift-card model)
/admin/marketplace/logistics              GET /admin/marketplace/logistics           MODULES
/admin/marketplace/gst-invoicing          GET /admin/marketplace/gst-invoicing       MODULES
/admin/marketplace/abandoned-carts        GET /admin/marketplace/abandoned-carts     MODULES
/admin/marketplace/ip-violations          GET /admin/marketplace/ip-violations       MODULES
/admin/marketplace/shipping-rates         GET /admin/marketplace/shipping-rates      MODULES
/admin/delivery/partners                  GET /admin/delivery/partners               MODULES (delivery-service has no entities)
/admin/delivery/live                      ws /admin-fleet                            EVENTS (+ TAXI D9)
/admin/settings                           GET /admin/platform/settings               MODULES
/admin/settings/module-titles             GET /admin/platform/settings               MODULES
/admin/gdpr                               GET /admin/gdpr/requests                   MODULES
/admin/support                            GET /admin/support/tickets                 MODULES (no ticket backend)
/admin/sos                                GET /admin/taxi/complaints?type=SOS         TAXI D6
/admin/franchise                          GET /admin/franchise                        MODULES + REGIONAL (the module controller is unguarded)
/admin/taxi/intercity                     —                                           TAXI D8
/admin/taxi/rentals                       —                                           TAXI D8
/admin/taxi/rental-fleet                  —                                           TAXI D8
/admin/taxi/scheduled                     —                                           TAXI D8
```

**Open dependencies no sibling plan has committed to** — recorded here so they reach a backlog rather than a reader's memory: `POST /admin/marketplace/orders/:orderNumber/cancel` (K2-1 renders no cancel control without it); admin-namespaced, market-scoped `POST/PUT/DELETE /admin/marketplace/coupons` (K2-5 leaves the writes on the seller routes and comments the three call sites); `GET /admin/wallet/transactions` (K2-12); `admin.market_settings` CRUD behind `/admin/markets` (K2-11 ships a read-only market view until it lands); `GET /admin/search?q=` for the `Ctrl+K` palette in design §5.1, which no task in either console plan builds.

**Name and prop consistency with Plan K1.** Every import named in this plan's Interfaces section is copied verbatim from K1's Interfaces section: `apiCall`, `ApiError` (`status`, `messages`, `requestId`, `route`, `retryAfterSeconds`, `body`), `classifyApiError`, `errorMessages`, `useAdminData` (`data`, `loading`, `error`, `failure`, `refetch`, `toast`, `showToast`), `useAdminAction` (`execute`, `actionLoading`), `AdminState` (`failure`, `loading`, `route`, `what`, `needs`, `onRetry`, `empty`, `isEmpty`), `AdminPage` (`title`, `description`, `breadcrumbs`, `actions`, `filters`, `market`), `DataTable` (all 22 props), `Column` (`key`, `header`, `render`, `value`, `sortable`, `align`, `width`, `hideBelow`), `FilterSpec`, `Money` (`amount`, `country`, `currency`, `compact`, `showCode`, `fallback`), `StatCard`, `StatusBadge`, `ConfirmDialog`, `ReasonDialog`, `Drawer`, `Toaster`, `ADMIN_NAV` / `navGroupsFor` / `breadcrumbsFor`. Two names are introduced here and used in several tasks — `useTableParams` (K1-8's URL binder, imported from `@/components/admin-ui`) and `countOutsideExecute` (the spec helper written in K2-4 and reused in K2-5, K2-7 and K2-13); both are declared in the task that first uses them. If any name changes during execution, both plan files change in the same commit.

**Ordering.** K2-1 through K2-5 are marketplace and may be worked in parallel by separate agents once K1 has landed, except that K2-1 must precede K2-5 (seven of K2-5's pages currently read the orders stub). K2-7 must precede K2-8 and K2-9 — it fixes the hub pattern both inherit. K2-10 runs **after** the TAXI plan's D8, or takes only its Step 5 subset and stays open. K2-13 runs last, alone, and is the only task permitted to touch a file another task owns.

**Sequencing against MODULES.** A K2 task whose routes come from a MODULES task can start before it lands — the page calls the route and renders the 503 — but its _live workflow proof_ cannot be given until the handler exists. In that case the task commits the page, records "wired, awaiting M<n>" in its completion note, and the proof is taken when MODULES lands. What a task may **not** do is call the disposition "done" on the strength of a green jest run alone: the mandate's last sentence is explicit, and a 503 rendered correctly is evidence the page is honest, not evidence the workflow works.
