# Admin Console Platform Foundation Implementation Plan (Plan K1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Super Admin and Regional Admin console one API client, one error contract, one navigation registry, one application frame and one set of design-system components — including a single `DataTable` and a shared dashboard architecture — so that the 250 pages migrated in Plan K2 have somewhere honest to land. Nothing in this plan renders a fixture, and every state a page can be in (loading, 400, 401, 403, 404, 409, 422, 429, 500, 503, network, timeout, empty) has exactly one component that draws it and names the route that failed.

**Architecture:** `packages/shared-core/src/api/client.ts` becomes the only fetch wrapper in the console: it is `api-endpoints.ts`'s proven `request()` (8 s `AbortController`, single-flight 401 refresh, `regionHeaders()`, envelope unwrapping) re-exported as `apiCall` with a widened `ApiError`. The ten other client layers — `api/admin-marketplace.ts`, the six copy-pasted `api/admin-{taxi,grocery,hotel,pharmacy,doctor,restaurant}.ts` `apiCall`s, `api/admin-core.ts`'s duplicate methods, `api-fetch.ts` and `api-client.ts` — become thin wrappers over it or are deleted. `useAdminData` stops treating 401/403 as success and hands pages a typed `ApiError`; `components/admin/api-states.tsx` grows into one `<AdminState>` that renders the right panel for every status. The sidebar stops being a literal array in `layout.tsx` and becomes `apps/web/src/lib/admin/navigation.ts`, which the shell, the breadcrumbs, the permission gate and the census script all read. `packages/shared-ui/src/admin/` holds the components (`AdminPage`, `DataTable`, `FilterBar`, `StatusBadge`, `StatCard`, `Money`, dialogs, drawers, tabs, toasts); the console imports them through the existing `@/components/*` path aliases.

**Tech Stack:** Next 16 (App Router, `apps/web`), React 19, Tailwind v4 with `packages/shared-ui/tailwind.config.ts` screens and `packages/shared-ui/src/styles/globals.css` (`@layer components` only), `packages/shared-core` (clients, hooks, contexts, localization registry), jest 30 + `react-dom/server` in `apps/web` (no Testing Library), Playwright with system Chrome, NestJS 11 + vitest for the two gateway-side steps.

---

## Global Constraints

Verbatim, from the programme mandate — every task in this plan and in Plan K2 is measured against these six sentences:

> Do not use mock data. Do not leave fake buttons. Do not leave placeholder APIs. Do not rely on frontend-only permissions. Do not allow regional data leakage. Do not mark functionality complete without testing the real workflow.

And, specific to the console:

- **Never hard-code `₹` or any currency symbol, and never a currency code.** Money is rendered by `<Money>` (Task 9), which reads the row's own market through `packages/shared-core/src/localization/currency.ts`. 107 admin files break this rule today; the lint rule added in Task 9 makes a new one impossible.
- **Navigation and page controls gate on `hasPermission(key)` with keys the API enforces.** A nav item or a button whose key no gateway route checks is a lie about authorisation; Task 5 closes that gap on the API side and Task 4 makes an ungated item a test failure.
- **`npx next build`, `npx tsc --noEmit -p apps/web` and `npx jest` (baseline: 610 passing) stay green after every task.** A task that cannot keep them green is not finished.
- **Every task ends with the census script and reports its counts.** The script is the acceptance gate:
  ```bash
  node apps/api/scripts/verification/admin-console-census.mjs \
    --json .superpowers/sdd/2026-09-12-admin-platform-review/console-census-after-K1-<n>.json \
    --md  .superpowers/sdd/2026-09-12-admin-platform-review/console-census-after-K1-<n>.md
  ```
  Read `summary.flagCounts` from the JSON. The audit's editorial label **MOCK-HARDCODED maps to the script's `FIXTURE` flag** and **MISSING maps to `NO-API`** — the script has no label called "MOCK-HARDCODED", so quote `FIXTURE` and `NO-API` when reporting.
- **Commits:** lower-case subject, ≤ 100 characters. `apps/web` and `packages/shared-core` / `packages/shared-ui` changes may share one commit (they are one workspace change); `apps/api` changes commit separately (lint-staged). Every commit ends with:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  ```
- **Browser verification** uses Playwright driving **system Chrome** (`channel: 'chrome'` — Playwright's own browsers are not installed, see `project_marketplace_mobile_verification`), against the console dev server pointed at a live gateway:
  ```bash
  # terminal 1 — the API fleet, gateway on 3099
  cd apps/api && npm run dev:all
  # terminal 2 — the console
  cd apps/web && NEXT_PUBLIC_API_URL=http://127.0.0.1:3099/api/v1 \
    NEXT_PUBLIC_WS_URL=http://127.0.0.1:3099 npm run dev
  # terminal 3 — the harness
  cd apps/web && npx playwright test e2e/admin-console.spec.ts --project=admin-chrome
  ```
  Drive `localhost`, never `127.0.0.1`, in the browser URL (`project_web_verification_gotchas`). Screenshots are captured at **375, 768, 1024 and 1440** for every route the harness visits.
- `DEV_AUTH_BYPASS` makes an anonymous request a SUPER_ADMIN locally (`project_dev_auth_bypass_masks_probes`). Every authorisation check in this plan is run **with** an `Authorization` header for a known role, and the bypass is off (`DEV_AUTH_BYPASS=false`) for the permission task.
- The main DB does not synchronize. No task here writes a migration; Task 5 changes only decorators.

---

## File structure

| File                                                                                                    | Responsibility                                                                                   |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `packages/shared-core/src/api/client.ts` (new)                                                          | `apiCall`, `ApiError`, `classifyApiError`, `errorMessages` — the one client                      |
| `packages/shared-core/src/api-endpoints.ts`                                                             | `request()` widened to build the new `ApiError`; `api.*` unchanged for callers                   |
| `packages/shared-core/src/api/admin-marketplace.ts` (deleted), `api/admin-core.ts`                      | duplicates removed; `admin-core` keeps only what is unique to it                                 |
| `packages/shared-core/src/api/admin-{taxi,grocery,hotel,pharmacy,doctor,restaurant}.ts`                 | own `apiCall` deleted; each becomes a thin wrapper over `apiCall`                                |
| `packages/shared-core/src/api/admin-seo.ts`, `api/admin-static-pages.ts` (new)                          | clients for the two finished, uncalled gateway controllers (K2 consumes)                         |
| `packages/shared-core/src/hooks/useAdminData.tsx`                                                       | 401/403 are failures; `failure: ApiError \| null` added                                          |
| `apps/web/src/components/admin/api-states.tsx`                                                          | `<AdminState>` — one panel per status; existing exports kept                                     |
| `apps/web/src/lib/admin/navigation.ts` (new)                                                            | `ADMIN_NAV`, `navGroupsFor`, `breadcrumbsFor`, `ADMIN_MODULES`                                   |
| `apps/web/src/app/admin/layout.tsx`                                                                     | reads the registry; frame dimensions; collapsed state; CSP nonce                                 |
| `apps/web/src/app/layout.tsx`, `apps/web/config/csp.cjs`                                                | inline `<style>`/`<script>` move onto a nonce; `'unsafe-inline'` dropped                         |
| `packages/shared-ui/src/admin/` (new: 14 files + `index.ts`)                                            | `AdminPage`, `DataTable`, `FilterBar`, `StatusBadge`, `StatCard`, `Money`, dialogs, tabs, toasts |
| `packages/shared-ui/src/styles/globals.css`                                                             | admin frame custom properties, in `@layer components`                                            |
| `apps/web/tsconfig.json`, `packages/shared-ui/package.json`                                             | `@/components/admin-ui/*` path alias                                                             |
| `apps/api/apps/api-gateway/src/controllers/admin-core.controller.ts`, `admin-marketplace.controller.ts` | `perm:` keys the nav already claims                                                              |
| `apps/api/libs/security/src/pci-security.service.ts`                                                    | a `Date` stops serialising as `{}`                                                               |
| `apps/api/scripts/verification/admin-console-census.mjs`                                                | nav index reads the registry file                                                                |
| `apps/web/e2e/admin-console.spec.ts`, `apps/web/playwright.config.ts`                                   | the responsive / a11y harness and its `admin-chrome` project                                     |
| `apps/web/eslint.config.mjs`, `apps/web/scripts/no-hardcoded-currency.cjs` (new)                        | the currency lint rule                                                                           |

---

## Interfaces — what Plan K2 consumes from this plan

Plan K2's page tasks import exactly these. Names and prop shapes here are the contract; K2 restates them and must not drift.

```ts
// @/lib/api/client  (packages/shared-core/src/api/client.ts)
export class ApiError extends Error {
  readonly status: number; // 0 for network, -1 for timeout
  readonly messages: string[]; // every sentence the server sent; never empty
  readonly requestId?: string; // the X-Request-ID the gateway echoed
  readonly route: string; // 'GET /admin/marketplace/orders'
  readonly body?: unknown;
  // `message` (Error's own field) is `messages.join('; ')`.
}
export type ApiFailureKind =
  | 'validation'
  | 'reauth'
  | 'forbidden'
  | 'notfound'
  | 'conflict'
  | 'rate-limited'
  | 'server'
  | 'unavailable'
  | 'network'
  | 'timeout';
export function classifyApiError(err: unknown): ApiFailureKind;
export function errorMessages(err: unknown): string[];
export function apiCall<T>(route: string, init?: ApiCallInit): Promise<T>; // throws ApiError

// @/hooks/useAdminData
export function useAdminData<T>(
  fetcher: () => Promise<T>,
  deps?: unknown[],
): {
  data: T | null;
  loading: boolean;
  error: string | null; // kept: 53 pages read it as a string
  failure: ApiError | null; // new: the typed failure, null on success
  refetch: () => Promise<void>;
  toast: Toast | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
};
export function useAdminAction(showToast): { execute; actionLoading };

// @/components/admin/api-states
export function AdminState(props: {
  failure: ApiError | null;
  loading: boolean;
  route: string;
  what?: string;
  needs?: string;
  onRetry?: () => void;
  empty?: { title: string; hint?: string; action?: React.ReactNode };
  isEmpty?: boolean;
  children?: React.ReactNode;
}): JSX.Element | null;

// @/components/admin-ui  (packages/shared-ui/src/admin/index.ts)
export { AdminPage, PageActions } from './admin-page';
export {
  DataTable,
  type Column,
  type DataTableProps,
  type BulkAction,
  type RowAction,
} from './data-table';
export { FilterBar, type FilterSpec } from './filter-bar';
export { StatusBadge, registerStatusMap } from './status-badge';
export {
  StatCard,
  StatGrid,
  DashboardGrid,
  ActivityFeed,
  PendingApprovals,
  AlertList,
  QuickActions,
  OperationalStatus,
} from './dashboard';
export { Money, useMoney } from './money';
export {
  Button,
  IconButton,
  Input,
  Select,
  MultiSelect,
  DateRangePicker,
  Checkbox,
  Textarea,
  Card,
  CardHeader,
  Tabs,
  Modal,
  ConfirmDialog,
  ReasonDialog,
  Drawer,
  Dropdown,
  Badge,
  Alert,
  Toaster,
  useToast,
  Skeleton,
  EmptyState,
  ErrorState,
  NotBuiltState,
} from './primitives';
export { useTableParams } from './use-table-params';

// @/lib/admin/navigation
export const ADMIN_NAV: readonly AdminNavGroup[];
export function navGroupsFor(has: (key: string) => boolean): AdminNavGroup[];
export function breadcrumbsFor(pathname: string): { label: string; href?: string }[];
```

Two of those exist for the sibling plans specifically:

- **`ErrorState`** — the standalone panel `AdminState` renders internally, exported so a page that is not a list can draw a failure without a table. Same props as `AdminState`'s failure branch (`failure`, `route`, `what`, `needs`, `onRetry`).
- **`NotBuiltState`** — `<NotBuiltState feature="Intercity rides" route="GET /admin/taxi/intercity" />`: a title, one sentence saying the feature is not built, the route it would call, **and no controls**. It is the only component in the console permitted to render a page with no data and no failure, and a page using it renders no table, no filters and no buttons. The TAXI plan's D8 consumes it for four pages.

**`DataTable` shorthand.** The failure contract is the `state` object, but the component also accepts `loading`, `error` and `empty` as top-level props and normalises them into `state` — the TAXI plan (Plan D, T8) declares its consumption in those terms, and both spellings must compile:

```ts
// accepted, and normalised to the same internal shape
<DataTable … state={{ loading, failure, route, onRetry }} />
<DataTable … loading={loading} error={failure} empty="No rides in this market" route="GET /admin/taxi/rides" />
```

`error` accepts an `ApiError`, a `string` or `null`; a string is wrapped into an `ApiError` with `status: 0` so the panel still renders.

### Sibling plans

Three other plans consume this one. Their stated needs are met by the exports above and must not drift:

| Plan                                             | Consumes                                                                                                           | Where it says so                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **TAXI** `2026-09-12-taxi-ops-plan.md` (D8)      | `apiCall`, `DataTable<T>`, `EmptyState`, `ErrorState`, `Skeleton`, `StatusBadge`, `Money`, `NotBuiltState`         | its "Dependencies on the sibling plans" table and T8's Interfaces |
| **MODULES** `2026-09-12-module-backends-plan.md` | nothing from here; it **produces** routes this plan's K2 consumes, and **removes** eleven literal-returning routes | its "Interfaces (cross-plan)" table                               |
| **EVENTS**                                       | `AdminState` for a socket that will not connect                                                                    | —                                                                 |

**Plan K2 does not own the taxi console pages.** Plan D's T8 does, page by page, including `landing-editor` (kept and wired, not removed) and the four not-built pages. K2's taxi task is a handoff and a verification, not a rebuild.

---

### Task 1 (K1-1): One `apiCall`, one `ApiError`, and a `Date` that survives the gateway

**Closes:** AUD2-048

**Files:**

- Create: `packages/shared-core/src/api/client.ts`, `packages/shared-core/src/api/__tests__/client.test.ts`
- Modify: `packages/shared-core/src/api-endpoints.ts` (the `ApiError` class and the throw site in `request()`), `packages/shared-core/src/api/index.ts` (re-export)
- Modify: `apps/api/libs/security/src/pci-security.service.ts:86,91-93` (+ its spec)
- Modify: `apps/web/tsconfig.json` is unchanged — `@/lib/api/*` already maps to `packages/shared-core/src/api/*`

**Interfaces:** as declared above. `ApiCallInit = Omit<RequestInit,'body'> & { body?: unknown; params?: Record<string, string|number|boolean|undefined>; timeoutMs?: number }`. `route` is the path **after** `/api/v1` (`'/admin/marketplace/orders'`), never a full URL — the base comes from `API_BASE_URL` in `packages/shared-core/src/config/api-base.ts`, which already carries `/api/v1` and fails loud in production.

- [ ] **Step 1: Failing test**

`packages/shared-core/src/api/__tests__/client.test.ts`:

```ts
/**
 * The console has one client and one error. Before this, ten fetch wrappers
 * disagreed about every one of these: six never threw at all, four had no
 * timeout, eight sent no market header, and a class-validator 400 (`message`
 * is an array) was assigned raw to a string field and rendered as one
 * unseparated run of words.
 */
import { ApiError, apiCall, classifyApiError, errorMessages } from '../client';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

describe('ApiError', () => {
  it('keeps every sentence the server sent and still prints as one line', () => {
    const e = new ApiError({
      status: 400,
      messages: ['name must be a string', 'limit must not be greater than 100'],
      route: 'POST /admin/roles',
      requestId: 'req-1',
    });
    expect(e.messages).toHaveLength(2);
    expect(e.message).toBe('name must be a string; limit must not be greater than 100');
    expect(e.requestId).toBe('req-1');
    expect(e).toBeInstanceOf(Error);
  });

  it('never carries an empty message list', () => {
    expect(new ApiError({ status: 500, messages: [], route: 'GET /x' }).messages).toEqual([
      'Request failed (500)',
    ]);
  });
});

describe('classifyApiError', () => {
  it.each([
    [400, 'validation'],
    [422, 'validation'],
    [401, 'reauth'],
    [403, 'forbidden'],
    [404, 'notfound'],
    [409, 'conflict'],
    [429, 'rate-limited'],
    [500, 'server'],
    [502, 'server'],
    [503, 'unavailable'],
    [0, 'network'],
    [-1, 'timeout'],
  ])('reads %i as %s', (status, kind) => {
    expect(classifyApiError(new ApiError({ status, messages: ['x'], route: 'GET /x' }))).toBe(kind);
  });

  it('treats anything that is not an ApiError as a network failure', () => {
    expect(classifyApiError(new TypeError('Failed to fetch'))).toBe('network');
    expect(classifyApiError(undefined)).toBe('network');
  });
});

describe('apiCall', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('unwraps the gateway envelope and returns the payload', async () => {
    fetchMock.mockResolvedValue(json(200, { success: true, data: { total: 3 } }));
    await expect(apiCall<{ total: number }>('/admin/marketplace/orders')).resolves.toEqual({
      total: 3,
    });
  });

  it('sends the market header and the bearer token', async () => {
    fetchMock.mockResolvedValue(json(200, { success: true, data: [] }));
    await apiCall('/admin/grocery/stores');
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers).toHaveProperty('X-Region-Code');
    expect(headers).toHaveProperty('X-Request-ID');
  });

  it('throws an ApiError carrying the array a class-validator 400 sends', async () => {
    fetchMock.mockResolvedValue(
      json(
        400,
        { message: ['ip should not exist', 'reason should not exist'] },
        {
          'X-Request-ID': 'req-9',
        },
      ),
    );
    const err = await apiCall('/admin/security/bans', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.messages).toEqual(['ip should not exist', 'reason should not exist']);
    expect(err.requestId).toBe('req-9');
    expect(err.route).toBe('POST /admin/security/bans');
  });

  it('gives a 503 its own status rather than collapsing it into 500', async () => {
    fetchMock.mockResolvedValue(json(503, { message: 'taxi-service did not answer' }));
    const err = await apiCall('/admin/taxi/dashboard').catch((e) => e);
    expect(err.status).toBe(503);
    expect(classifyApiError(err)).toBe('unavailable');
  });

  it('reports a 429 retry-after so the page can say when to come back', async () => {
    fetchMock.mockResolvedValue(
      json(429, { message: 'Too many requests' }, { 'Retry-After': '30' }),
    );
    const err = await apiCall('/admin/dashboard').catch((e) => e);
    expect(err.status).toBe(429);
    expect(err.retryAfterSeconds).toBe(30);
  });

  it('aborts rather than hanging, and reports the timeout as its own kind', async () => {
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) =>
          init.signal?.addEventListener('abort', () =>
            rej(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          ),
        ),
    );
    const err = await apiCall('/admin/dashboard', { timeoutMs: 10 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(classifyApiError(err)).toBe('timeout');
  });

  it('turns a network rejection into an ApiError, not a raw TypeError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await apiCall('/admin/dashboard').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.messages[0]).toMatch(/could not be reached/i);
  });
});

describe('errorMessages', () => {
  it('reads an ApiError, a plain Error and a bare string the same way', () => {
    expect(
      errorMessages(new ApiError({ status: 404, messages: ['Not found'], route: 'GET /x' })),
    ).toEqual(['Not found']);
    expect(errorMessages(new Error('boom'))).toEqual(['boom']);
    expect(errorMessages('boom')).toEqual(['boom']);
    expect(errorMessages(null)).toEqual(['Something went wrong.']);
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
cd apps/web && npx jest packages/shared-core/src/api/__tests__/client.test.ts
# → Cannot find module '../client'
```

- [ ] **Step 3: Implement the client**

`packages/shared-core/src/api/client.ts`:

```ts
/**
 * The admin console's one HTTP client.
 *
 * The console shipped ten fetch wrappers. `api-endpoints.ts`'s `request()` was
 * the only one with a timeout, a single-flight 401 refresh, the `X-Region-Code`
 * header and envelope unwrapping; the other nine had some subset of none of
 * them, and six never threw at all — they resolved `{ success: false }`, which
 * a page had to remember to check and, in a hundred places, did not. A stalled
 * gateway therefore left a module page spinning forever, and a 403 left it
 * showing the fixture array it had been seeded with.
 *
 * This module is that one good wrapper, with the error widened so a page can
 * tell 403 from 503 from a timeout without matching on English prose.
 */
import { regionHeaders } from '@/lib/region-headers';
import { getAuthToken } from '@/lib/auth-token';
import { API_BASE_URL } from '../config/api-base';
import { refreshAccessTokenOnce } from '../api-endpoints';

/** 0 and -1 are not HTTP: they are the two failures that never reach a server. */
export const NETWORK_STATUS = 0;
export const TIMEOUT_STATUS = -1;

export interface ApiErrorInit {
  status: number;
  messages: string[];
  route: string;
  requestId?: string;
  retryAfterSeconds?: number;
  body?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  /**
   * Every sentence the server sent. Always an array with at least one entry:
   * a class-validator 400 sends several, and `Error.message` (below) cannot
   * hold them without losing the separators — which is exactly how
   * `property ip should not existproperty reason should not exist` reached an
   * administrator.
   */
  readonly messages: string[];
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
  /** `'GET /admin/marketplace/orders'` — what to curl, shown in every panel. */
  readonly route: string;
  readonly body?: unknown;

  constructor(init: ApiErrorInit) {
    const messages =
      init.messages.filter((m) => typeof m === 'string' && m.trim()).length > 0
        ? init.messages.filter((m) => typeof m === 'string' && m.trim())
        : [`Request failed (${init.status})`];
    super(messages.join('; '));
    this.name = 'ApiError';
    this.status = init.status;
    this.messages = messages;
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.route = init.route;
    this.body = init.body;
  }
}

export type ApiFailureKind =
  | 'validation'
  | 'reauth'
  | 'forbidden'
  | 'notfound'
  | 'conflict'
  | 'rate-limited'
  | 'server'
  | 'unavailable'
  | 'network'
  | 'timeout';

/**
 * The status, not the prose. `classifyAuditFailure` matched on phrases like
 * "Missing required permissions" because the client that produced them had
 * thrown the status away; with one client that keeps it, the heuristic is
 * unnecessary and it is kept only for the two pages pinned by
 * `audit-logs-render.spec.ts`.
 */
export function classifyApiError(err: unknown): ApiFailureKind {
  if (!(err instanceof ApiError)) return 'network';
  const s = err.status;
  if (s === TIMEOUT_STATUS) return 'timeout';
  if (s === NETWORK_STATUS) return 'network';
  if (s === 400 || s === 422) return 'validation';
  if (s === 401) return 'reauth';
  if (s === 403) return 'forbidden';
  if (s === 404) return 'notfound';
  if (s === 409) return 'conflict';
  if (s === 429) return 'rate-limited';
  if (s === 503) return 'unavailable';
  return 'server';
}

export function errorMessages(err: unknown): string[] {
  if (err instanceof ApiError) return err.messages;
  if (err instanceof Error && err.message) return [err.message];
  if (typeof err === 'string' && err) return [err];
  if (Array.isArray(err)) {
    const out = err.filter((m) => typeof m === 'string' && m).map(String);
    if (out.length) return out;
  }
  return ['Something went wrong.'];
}

/** The server's `message` may be a string, an array of strings, or absent. */
function readMessages(body: unknown, status: number): string[] {
  const raw = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(raw)) return raw.filter((m) => typeof m === 'string').map(String);
  if (typeof raw === 'string' && raw) return [raw];
  return [`Request failed (${status})`];
}

export interface ApiCallInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Default 8000. A report or an export may ask for more; nothing may ask for none. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;

function newRequestId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * @param route path after `/api/v1`, e.g. `/admin/marketplace/orders`
 */
export async function apiCall<T>(
  route: string,
  init: ApiCallInit = {},
  isRetry = false,
): Promise<T> {
  const { params, body, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const method = (rest.method ?? 'GET').toUpperCase();
  const label = `${method} ${route}`;

  let url = `${API_BASE_URL}${route}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    if (qs) url += `${route.includes('?') ? '&' : '?'}${qs}`;
  }

  const isMultipart = body instanceof FormData;
  const token = getAuthToken();
  const requestId = newRequestId();
  const headers: Record<string, string> = {
    ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
    'X-Client-Platform': 'web',
    'X-Request-ID': requestId,
    // Without this the gateway scopes the read by egress IP, which in a cloud
    // deploy is the datacentre's country — `project_region_detection_chain`.
    ...regionHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((rest.headers as Record<string, string>) ?? {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      method,
      headers,
      credentials: 'include',
      signal: controller.signal,
      body: isMultipart
        ? (body as FormData)
        : body === undefined
          ? undefined
          : JSON.stringify(body),
    });
  } catch (err) {
    const aborted = (err as { name?: string })?.name === 'AbortError';
    throw new ApiError({
      status: aborted ? TIMEOUT_STATUS : NETWORK_STATUS,
      messages: [
        aborted
          ? `The gateway did not answer within ${Math.round(timeoutMs / 1000)}s.`
          : 'The API gateway could not be reached.',
      ],
      route: label,
      requestId,
    });
  } finally {
    clearTimeout(timer);
  }

  // One refresh, shared with `api-endpoints.ts` so a page firing eleven calls
  // at once does not spend eleven rotating refresh tokens.
  if (res.status === 401 && !isRetry && !route.startsWith('/auth/')) {
    const renewed = await refreshAccessTokenOnce();
    if (renewed) return apiCall<T>(route, init, true);
  }

  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      parsed = await res.text().catch(() => null);
    }
    const retryAfter = Number(res.headers.get('Retry-After'));
    throw new ApiError({
      status: res.status,
      messages: readMessages(parsed, res.status),
      route: label,
      requestId: res.headers.get('X-Request-ID') ?? requestId,
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      body: parsed,
    });
  }

  if (res.status === 204) return undefined as T;
  const parsed = await res.json();
  // The gateway's TransformInterceptor wraps every success in
  // `{ success, data, timestamp }`. Both keys are required so a handler that
  // legitimately returns `{ success: true, id }` is not stripped to `true`.
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    'success' in parsed &&
    'data' in parsed
  ) {
    return (parsed as { data: T }).data;
  }
  return parsed as T;
}
```

`api-endpoints.ts`: export the refresh as `refreshAccessTokenOnce` (rename of the existing `refreshAccessToken`, same body — it already guards with `refreshInFlight`), re-export the new `ApiError` in place of the old two-field class, and change `request()`'s throw site to:

```ts
throw new ApiError({
  status: res.status,
  messages: readMessages(body, res.status),
  route: `${method} ${path}`,
  requestId: res.headers.get('X-Request-ID') ?? requestId,
  body,
});
```

so the 54 pages already on `modules/admin-marketplace-api.ts` get the widened error without changing a line.

- [ ] **Step 4: The gateway stops turning every `Date` into `{}`**

`apps/api/libs/security/src/pci-security.service.ts:86` — `redactSensitiveData` spreads any object into `{}` and recurses, so `new Date()` (which has no own enumerable properties) reaches the console as `{}`. Every `createdAt` in the console is blank because of it.

Failing vitest first, in the existing `pci-security.service.spec.ts`:

```ts
it('returns a Date as a Date, not as an empty object', () => {
  const at = new Date('2026-09-12T10:00:00.000Z');
  const out = service.redactSensitiveData({ id: 'x', createdAt: at, nested: { at } }) as any;
  expect(out.createdAt).toBeInstanceOf(Date);
  expect(out.nested.at.toISOString()).toBe(at.toISOString());
});
it('leaves other non-plain values alone', () => {
  const out = service.redactSensitiveData({ n: 1, b: Buffer.from('x'), r: /a/ }) as any;
  expect(Buffer.isBuffer(out.b)).toBe(true);
  expect(out.r).toBeInstanceOf(RegExp);
});
```

Fix, immediately before the `{ ...value }` spread:

```ts
// A Date has no own enumerable properties, so `{ ...date }` is `{}` — and the
// recursion then walks that empty object and returns it. Every timestamp on
// every admin route reached the console blank because of these three lines.
// `admin-access.controller.ts:197` worked around it locally by pre-stringifying;
// that workaround can be removed once this lands.
if (
  value instanceof Date ||
  value instanceof RegExp ||
  Buffer.isBuffer(value) ||
  value instanceof Map ||
  value instanceof Set
) {
  return value;
}
```

- [ ] **Step 5: Verify and commit**

```bash
cd apps/web && npx jest packages/shared-core/src/api/__tests__/client.test.ts   # 14 passed
cd apps/web && npx jest                                                         # 610+14 passed, 0 failed
cd apps/web && npx tsc --noEmit -p .                                            # 0 errors
cd apps/web && npx next build                                                   # compiled successfully
cd apps/api && npx vitest run libs/security/src/pci-security.service.spec.ts    # passed
cd apps/api && npx nest build --all                                             # 0 errors
node apps/api/scripts/verification/admin-console-census.mjs \
  --json .superpowers/sdd/2026-09-12-admin-platform-review/console-census-after-K1-1.json \
  --md  .superpowers/sdd/2026-09-12-admin-platform-review/console-census-after-K1-1.md
# Expected (unchanged — no page was touched): FIXTURE 147, NO-API 159, pages 250.
```

```bash
git add packages/shared-core/src/api/client.ts packages/shared-core/src/api/__tests__ \
        packages/shared-core/src/api-endpoints.ts packages/shared-core/src/api/index.ts
git commit -m "feat(web): one admin api client with a typed error that keeps status, request id and every message" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add apps/api/libs/security/src/pci-security.service.ts apps/api/libs/security/src/pci-security.service.spec.ts
git commit -m "fix(api): a date survives response redaction instead of serialising as an empty object" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2 (K1-2): `useAdminData` stops calling a refusal a success, and one panel per status

**Closes:** AUD2-043

**Files:**

- Modify: `packages/shared-core/src/hooks/useAdminData.tsx`
- Modify: `apps/web/src/components/admin/api-states.tsx`
- Create: `apps/web/src/__tests__/admin-state.spec.ts`, `packages/shared-core/src/hooks/__tests__/use-admin-data.test.ts`

**Interfaces:** `useAdminData` gains `failure: ApiError | null`; `error: string | null` is **kept** (it is read as a string by 53 pages, and changing its type would break `tsc` across the console in a task that is supposed to be safe). `AdminState` is added to `api-states.tsx`; `AdminNotConnected`, `AdminForbidden`, `AdminLoading` and `classifyApiFailure` keep their current signatures, because `audit-logs-render.spec.ts` and `security-page.spec.ts` pin them.

- [ ] **Step 1: Failing tests**

`packages/shared-core/src/hooks/__tests__/use-admin-data.test.ts` — the hook's reducer is extracted so it can be tested without a renderer (this workspace has no Testing Library):

```ts
/**
 * A 401 or a 403 is not data.
 *
 * The hook's own comment said "auth errors → degrade gracefully (page will use
 * inline mock data)". 53 pages take that advice: an administrator whose role
 * does not hold `finance.payouts` saw a full payouts table of invented partner
 * rows and had no way to know the server had refused them.
 */
import { ApiError } from '@/lib/api/client';
import { reduceFetch } from '../useAdminData';

const err = (status: number) => new ApiError({ status, messages: ['nope'], route: 'GET /admin/x' });

describe('reduceFetch', () => {
  it('reports a 401 as a failure instead of as empty data', () => {
    const s = reduceFetch({ kind: 'error', error: err(401) });
    expect(s.data).toBeNull();
    expect(s.failure?.status).toBe(401);
    expect(s.error).toBe('nope');
  });

  it('reports a 403 the same way', () => {
    expect(reduceFetch({ kind: 'error', error: err(403) }).failure?.status).toBe(403);
  });

  it('clears the failure on the next success', () => {
    expect(reduceFetch({ kind: 'success', data: [1] })).toEqual({
      data: [1],
      error: null,
      failure: null,
    });
  });

  it('wraps a non-ApiError rejection so `failure` is never a bare Error', () => {
    const s = reduceFetch({ kind: 'error', error: new TypeError('Failed to fetch') });
    expect(s.failure).toBeInstanceOf(ApiError);
    expect(s.failure?.status).toBe(0);
  });
});
```

`apps/web/src/__tests__/admin-state.spec.ts`:

```ts
/**
 * Every status an admin request can end in has exactly one panel, and the
 * panel names the route. "Failed to load data" sent the reader to guess which
 * of a page's six calls died.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiError } from '@/lib/api/client';
import { AdminState } from '../components/admin/api-states';

const render = (status: number, messages = ['nope'], extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    React.createElement(AdminState, {
      loading: false,
      route: 'GET /admin/marketplace/orders',
      what: 'The order list',
      failure: new ApiError({ status, messages, route: 'GET /admin/marketplace/orders', ...extra }),
    }),
  );

describe('AdminState', () => {
  it('shows a validation list for a 400, one line per message', () => {
    const html = render(400, ['limit must not be greater than 100', 'status must be a string']);
    expect(html).toContain('limit must not be greater than 100');
    expect(html).toContain('status must be a string');
  });

  it('asks for a new sign-in on a 401 and does not call it an outage', () => {
    const html = render(401, ['Unauthorized']);
    expect(html).toMatch(/sign in again/i);
    expect(html).not.toMatch(/is not connected/i);
  });

  it('names the permission on a 403', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminState, {
        loading: false,
        route: 'GET /admin/payouts',
        needs: 'finance.payouts',
        failure: new ApiError({
          status: 403,
          messages: ['Missing required permissions: finance.payouts'],
          route: 'GET /admin/payouts',
        }),
      }),
    );
    expect(html).toContain('finance.payouts');
  });

  it('says "not found" for a 404 and "conflict" for a 409, not "not connected"', () => {
    expect(render(404)).toMatch(/could not be found/i);
    expect(render(409)).toMatch(/changed since you loaded it|conflict/i);
  });

  it('names the retry window on a 429', () => {
    expect(render(429, ['Too many requests'], { retryAfterSeconds: 30 })).toContain('30');
  });

  it('names the route the service did not answer on a 503', () => {
    const html = render(503, ['taxi-service did not answer']);
    expect(html).toContain('GET /admin/marketplace/orders');
    expect(html).toMatch(/is not connected|did not answer/i);
  });

  it('distinguishes a timeout from a network failure', () => {
    expect(render(-1, ['The gateway did not answer within 8s.'])).toMatch(/did not answer within/i);
    expect(render(0, ['The API gateway could not be reached.'])).toMatch(/could not be reached/i);
  });

  it('shows the request id whenever the gateway sent one', () => {
    expect(render(500, ['boom'], { requestId: 'req-77' })).toContain('req-77');
  });

  it('renders its children when there is no failure and rows exist', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        AdminState,
        { loading: false, failure: null, route: 'GET /x', isEmpty: false },
        React.createElement('table', null, 'rows'),
      ),
    );
    expect(html).toContain('rows');
  });

  it('renders the empty state — not an error — when the server answered with nothing', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminState, {
        loading: false,
        failure: null,
        route: 'GET /x',
        isEmpty: true,
        empty: { title: 'No orders match these filters', hint: 'status=CANCELLED, market=QA' },
      }),
    );
    expect(html).toContain('No orders match these filters');
    expect(html).toContain('status=CANCELLED, market=QA');
  });
});
```

- [ ] **Step 2: Run — FAIL** (`reduceFetch` and `AdminState` do not exist).

- [ ] **Step 3: Implement**

`useAdminData.tsx` — replace `isAuthError`, `AUTH_ERROR_CODES` and `AUTH_ERROR_PATTERNS` entirely (they are dead once the client throws a typed error) with:

```ts
import { ApiError, NETWORK_STATUS, errorMessages } from '@/lib/api/client';

export interface AdminDataState<T> {
  data: T | null;
  error: string | null;
  failure: ApiError | null;
}

/**
 * Extracted so the decision — not the effect — is what the spec asserts.
 *
 * The rule it encodes: there is no such thing as a successful refusal. The old
 * hook set `data = null` and `error = null` for 401 and 403, which every page
 * reads as "the server has no rows for you" and answers with its fixture array.
 */
export function reduceFetch<T>(
  action: { kind: 'success'; data: T } | { kind: 'error'; error: unknown },
): AdminDataState<T> {
  if (action.kind === 'success') return { data: action.data, error: null, failure: null };
  const failure =
    action.error instanceof ApiError
      ? action.error
      : new ApiError({
          status: NETWORK_STATUS,
          messages: errorMessages(action.error),
          route: 'unknown',
        });
  return { data: null, error: failure.messages.join('; '), failure };
}
```

and in `fetchData`:

```ts
try {
  setState(reduceFetch<T>({ kind: 'success', data: await fetcher() }));
} catch (err) {
  setState(reduceFetch<T>({ kind: 'error', error: err }));
} finally {
  setLoading(false);
}
```

`useAdminAction.execute` gains a guard so a non-throwing client can never report a fake success:

```ts
const result = await action();
// A client that resolves `{ success: false }` instead of throwing used to reach
// the success toast. Six of them did exactly that until Task 3.
if (
  result &&
  typeof result === 'object' &&
  'success' in result &&
  (result as any).success === false
) {
  throw new ApiError({
    status: 0,
    messages: errorMessages((result as any).error),
    route: 'unknown',
  });
}
showToast(successMsg, 'success');
```

`api-states.tsx` — add `AdminState`, which owns the whole matrix:

```tsx
const COPY: Record<
  ApiFailureKind,
  { title: (what: string) => string; body: (e: ApiError) => string }
> = {
  validation: {
    title: () => 'That request was rejected',
    body: () => 'The server would not accept it:',
  },
  reauth: {
    title: () => 'Your session has ended',
    body: () => 'Sign in again to continue. Nothing was changed.',
  },
  forbidden: {
    title: (w) => `You cannot open ${w}`,
    body: () => 'The server answered and refused.',
  },
  notfound: {
    title: (w) => `${w} could not be found`,
    body: () => 'The route answered, and has nothing under that identifier.',
  },
  conflict: {
    title: () => 'This record changed since you loaded it',
    body: () => 'Reload and try again; your change was not applied.',
  },
  'rate-limited': {
    title: () => 'Too many requests',
    body: (e) =>
      e.retryAfterSeconds ? `Try again in ${e.retryAfterSeconds} seconds.` : 'Try again shortly.',
  },
  server: {
    title: (w) => `${w} failed on the server`,
    body: () => 'The gateway answered with an error. Nothing was changed.',
  },
  unavailable: {
    title: (w) => `${w} is not connected`,
    body: () =>
      'The service behind this route did not answer, so nothing is shown rather than something invented.',
  },
  network: {
    title: (w) => `${w} is not connected`,
    body: () => 'The API gateway could not be reached from this browser.',
  },
  timeout: {
    title: (w) => `${w} is not connected`,
    body: () => 'The gateway accepted the request and did not answer in time.',
  },
};

export function AdminState({
  failure,
  loading,
  route,
  what = 'This page',
  needs,
  onRetry,
  empty,
  isEmpty,
  children,
}: AdminStateProps) {
  if (loading) return <AdminLoading />;
  if (failure) {
    const kind = classifyApiError(failure);
    const copy = COPY[kind];
    const tone =
      kind === 'forbidden' || kind === 'reauth' || kind === 'validation' ? 'amber' : 'red';
    return (
      <div
        role="alert"
        data-state={kind}
        className={`bg-white border rounded-2xl p-8 text-center ${tone === 'amber' ? 'border-amber-200' : 'border-red-200'}`}
      >
        <p className="font-bold text-slate-900">{copy.title(what)}.</p>
        <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
          <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{route}</code>{' '}
          {copy.body(failure)}
          {needs && kind === 'forbidden' && (
            <>
              {' '}
              It needs the <span className="font-mono text-xs">{needs}</span> permission.
            </>
          )}
        </p>
        <ul className="text-xs mt-3 font-medium space-y-1 text-left inline-block">
          {failure.messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
        {failure.requestId && (
          <p className="text-[11px] text-slate-400 mt-2 font-mono">request {failure.requestId}</p>
        )}
        {onRetry && kind !== 'forbidden' && kind !== 'reauth' && (
          <button
            onClick={onRetry}
            className="mt-4 bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-slate-800"
          >
            Try again
          </button>
        )}
        {kind === 'reauth' && (
          <a
            href="/admin/login"
            className="mt-4 inline-block bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            Sign in
          </a>
        )}
      </div>
    );
  }
  if (isEmpty && empty) return <EmptyPanel {...empty} />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Verify and commit**

```bash
cd apps/web && npx jest admin-state use-admin-data    # 14 passed
cd apps/web && npx jest                               # 610 + 24, 0 failed
cd apps/web && npx tsc --noEmit -p . && npx next build
node apps/api/scripts/verification/admin-console-census.mjs --json …after-K1-2.json --md …after-K1-2.md
# Expected: unchanged page counts (FIXTURE 147, NO-API 159) — this task changes
# only what a page is told, not what it renders. NOT-CONNECTED-STATE stays 10
# until K2 migrates pages onto AdminState.
```

```bash
git add packages/shared-core/src/hooks apps/web/src/components/admin/api-states.tsx apps/web/src/__tests__/admin-state.spec.ts
git commit -m "fix(web): a 401 or 403 is a failure with its own panel, not an empty result pages paper over" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3 (K1-3): Ten client layers become one

**Closes:** AUD2-101, AUD2-102, AUD2-046, AUD2-108

**Files:**

- Delete: `packages/shared-core/src/api/admin-marketplace.ts`
- Modify: `packages/shared-core/src/api/admin-core.ts` (delete the 11 methods that duplicate `/admin/marketplace/*`; rewrite its `apiCall` as a re-export of the new one)
- Modify: `packages/shared-core/src/api/admin-{taxi,grocery,hotel,pharmacy,doctor,restaurant}.ts` (delete six `apiCall`s and six `getHeaders`; each method becomes one `apiCall` line)
- Modify: `packages/shared-core/src/modules/admin-marketplace-api.ts:173,312,474` (verb drift)
- Modify: `apps/web/src/app/admin/layout.tsx:60-61`, `apps/web/src/app/admin/marketplace/sellers/page.tsx:11`, `apps/web/src/app/admin/payouts/page.tsx:39`
- Create: `packages/shared-core/src/api/admin-seo.ts`, `packages/shared-core/src/api/admin-static-pages.ts` (K2-11 consumes them)
- Delete: `packages/shared-core/src/api-fetch.ts` once its last admin caller is gone; leave `api-client.ts` (`@deprecated`, restaurant customer app) alone and out of scope
- Create: `apps/web/src/__tests__/admin-client-surface.spec.ts`

**Interfaces:** every `adminXApi` method keeps its **name and arguments** and changes only its return type — from `Promise<AdminApiResponse<T>>` (never throws) to `Promise<T>` (throws `ApiError`). This is the breaking half of the task; it is done in one commit per client so `tsc` names every call site that needs the `useAdminData` / `useAdminAction` treatment.

- [ ] **Step 1: Failing test — the surface is single and the verbs are real**

`apps/web/src/__tests__/admin-client-surface.spec.ts` (a source-level test, so it cannot be satisfied by a comment):

```ts
/**
 * There is one `adminMarketplaceApi`, and no client declares a verb the
 * gateway does not.
 *
 * Two modules exported that name with genuinely different behaviour: one with
 * an 8 s timeout, a 401 refresh, region headers and a thrown `ApiError`, the
 * other with none of those and a resolved `{ success: false }`. Which one a
 * page got depended only on whether it wrote `@/lib/api/...` or
 * `@/lib/modules/...` in its import.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const CORE = path.resolve(__dirname, '../../../../packages/shared-core/src');
const read = (p: string) => fs.readFileSync(path.join(CORE, p), 'utf8');
const MODULE_CLIENTS = [
  'api/admin-core.ts',
  'api/admin-taxi.ts',
  'api/admin-grocery.ts',
  'api/admin-hotel.ts',
  'api/admin-pharmacy.ts',
  'api/admin-doctor.ts',
  'api/admin-restaurant.ts',
];

it('has deleted the duplicate marketplace client', () => {
  expect(fs.existsSync(path.join(CORE, 'api/admin-marketplace.ts'))).toBe(false);
});

it('leaves exactly one declaration of `apiCall` in the whole client layer', () => {
  const declarations = MODULE_CLIENTS.concat(['api/client.ts']).filter((f) =>
    /(?:async\s+)?function\s+apiCall|const\s+apiCall\s*=\s*(?:async)?\s*[<(]/.test(read(f)),
  );
  expect(declarations).toEqual(['api/client.ts']);
});

it('gives every module client the shared timeout, region header and refresh', () => {
  for (const f of MODULE_CLIENTS) {
    const src = read(f);
    expect(src).toMatch(/from '\.\/client'/);
    expect(src).not.toMatch(/fetch\(/); // no raw fetch survives
    expect(src).not.toMatch(/getHeaders\s*\(/); // no per-file header builder
  }
});

it('no client method names a verb the gateway does not declare', () => {
  const src = read('modules/admin-marketplace-api.ts');
  expect(src).not.toMatch(/'POST',\s*['`]\/admin\/marketplace\/campaigns/);
  expect(src).not.toMatch(/put<[^>]*>\(\s*[`']\/admin\/marketplace\/products\/\$\{/);
  expect(src).not.toMatch(/put<[^>]*>\(\s*[`']\/admin\/marketplace\/sellers\/\$\{/);
});

it('keeps `adminCoreApi` out of the marketplace surface', () => {
  const src = read('api/admin-core.ts');
  for (const gone of [
    'getSellers',
    'approveSeller',
    'suspendSeller',
    'reactivateSeller',
    'blockSeller',
    'getOrders',
    'getPayouts',
    'approvePayout',
    'retryPayout',
    'getCommissions',
    'updateCommission',
  ]) {
    expect(src).not.toContain(`${gone}:`);
  }
});
```

- [ ] **Step 2: Run — FAIL** (five assertions).

- [ ] **Step 3: Rewrite the six module clients**

Mechanical, one file at a time. The shape, using `admin-taxi.ts` as the worked example:

```ts
// before — 40 lines of duplicated transport, no timeout, no market header
const BASE_URL = API_BASE_URL;
function getHeaders() { … }
async function apiCall<T>(url: string, options?: RequestInit): Promise<AdminApiResponse<T>> { … }
export const adminTaxiApi = {
  getDrivers: (p: AdminListParams = {}) =>
    apiCall<PaginatedResponse<TaxiDriver>>(`${BASE_URL}/admin/taxi/drivers${buildQuery(p)}`),
  approveDriver: (id: string) =>
    apiCall<TaxiDriver>(`${BASE_URL}/admin/taxi/drivers/${id}/approve`, { method: 'PATCH' }),
};

// after — the transport is gone; the routes are the file's only content
import { apiCall } from './client';
export const adminTaxiApi = {
  getDrivers: (params: AdminListParams = {}) =>
    apiCall<PaginatedResponse<TaxiDriver>>('/admin/taxi/drivers', { params }),
  approveDriver: (id: string) =>
    apiCall<TaxiDriver>(`/admin/taxi/drivers/${encodeURIComponent(id)}/approve`, { method: 'PATCH' }),
  /** `GET /admin/taxi/documents/pending` and `POST …/:id/approve` exist on the
   *  gateway and had no client method at all, so the whole driver-document
   *  workflow was unreachable from the console (AUD2-105 family). K2-10 builds
   *  the page; the methods live here. */
  getPendingDocuments: (params: AdminListParams = {}) =>
    apiCall<PaginatedResponse<TaxiDocument>>('/admin/taxi/documents/pending', { params }),
  approveDocument: (id: string) =>
    apiCall<TaxiDocument>(`/admin/taxi/documents/${encodeURIComponent(id)}/approve`, { method: 'POST' }),
  getPayoutSummary: (params: { country?: string } = {}) =>
    apiCall<TaxiPayoutSummary>('/admin/taxi/payouts/summary', { params }),
};
```

Every id interpolated into a path is `encodeURIComponent`'d; `buildQuery` is deleted in favour of `params`.

- [ ] **Step 4: Delete `api/admin-marketplace.ts` and repoint its two importers**

`apps/web/src/app/admin/layout.tsx`:

```ts
- import { adminMarketplaceApi, type AdminNotificationPage } from '@/lib/api/admin-marketplace';
+ import { adminMarketplaceApi, type AdminNotificationPage } from '@/lib/modules/admin-marketplace-api';
```

This alone fixes the notification bell (AUD2-108): the old client had no `AbortController`, so a hung gateway left the bell on "loading" on **every** admin page forever. The bell's load path becomes:

```ts
const [bellFailure, setBellFailure] = useState<ApiError | null>(null);
useEffect(() => {
  if (!hasPermission('dashboard.view')) return;
  let cancelled = false;
  adminMarketplaceApi
    .getNotifications({ limit: 10 })
    .then((page) => {
      if (!cancelled) {
        setNotifications(page.data);
        setBellFailure(null);
      }
    })
    .catch((err) => {
      if (!cancelled) setBellFailure(err as ApiError);
    });
  return () => {
    cancelled = true;
  };
}, [hasPermission]);
```

and the panel renders `bellFailure` through `AdminState` rather than spinning.

`apps/web/src/app/admin/marketplace/sellers/page.tsx:11` — same specifier swap; the page already checks results, so only the import changes.

- [ ] **Step 5: Delete the 11 duplicate methods from `admin-core.ts`, repoint `payouts/page.tsx`**

`admin-core.ts` keeps what only it has: dashboard, platform health, the 11 security/DDoS routes, KYC, users, audit logs, roles and staff. The seller / order / payout / commission methods are deleted; `apps/web/src/app/admin/payouts/page.tsx:39` moves to `adminMarketplaceApi.getPayouts` (its fixtures are removed in K2-3, not here — this step only changes which client it calls).

- [ ] **Step 6: Fix the three verbs that 404 every time**

`packages/shared-core/src/modules/admin-marketplace-api.ts`:

```ts
// :173  PUT /admin/marketplace/products/:id  → the gateway declares only PATCH
- updateProduct: (id: string, body: UpdateProductBody) => api.put(`/admin/marketplace/products/${id}`, body),
+ updateProduct: (id: string, body: UpdateProductBody) =>
+   apiCall<AdminProduct>(`/admin/marketplace/products/${encodeURIComponent(id)}`, { method: 'PATCH', body }),

// :312  POST /admin/marketplace/campaigns — no such route anywhere.
// There is no `campaigns` table either (design §5.2, programme C1). The method
// is deleted rather than repointed, and K2-5 makes the page say so.
- createCampaign: …

// :474  PUT /admin/marketplace/sellers/:id → PATCH
+ updateSeller: (id: string, body: UpdateSellerBody) =>
+   apiCall<AdminSeller>(`/admin/marketplace/sellers/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
```

Also repoint coupon writes off the seller-facing routes onto `/admin/marketplace/coupons` **only if** the MODULES plan has declared them; otherwise leave them and record the dependency in the self-review. (The MODULES plan owns adding `POST/PUT/DELETE /admin/marketplace/coupons` with `this.scopeOf(`.)

- [ ] **Step 7: Add the two missing clients**

`packages/shared-core/src/api/admin-seo.ts` and `admin-static-pages.ts` — thin, one line per declared gateway route (6 and 5 respectively, read from `apps/api/apps/api-gateway/src/controllers/admin-seo.controller.ts` and `static-pages.controller.ts`). These are consumed by Plan K2 Task 11; declaring them here keeps all client work in one task.

- [ ] **Step 8: Chase the compiler**

```bash
cd apps/web && npx tsc --noEmit -p .
```

Every error is a call site that read `res.success` on a client that now throws. Fix each by moving the call into `useAdminData` (reads) or `useAdminAction.execute` (mutations). Do **not** reintroduce a `try/catch` that swallows — an unhandled failure must reach the hook. Expect roughly 60–90 sites; they are Plan K2's pages, so fix only what is needed to compile and leave the fixture removal to K2.

- [ ] **Step 9: Verify and commit**

```bash
cd apps/web && npx jest admin-client-surface       # 5 passed
cd apps/web && npx jest && npx tsc --noEmit -p . && npx next build
node apps/api/scripts/verification/admin-console-census.mjs --json …after-K1-3.json --md …after-K1-3.md
# Expected: duplicateClientRoutes 70 → ≤ 45 (the 25 admin duplicates are gone),
# callsNoGatewayRoute 4 → 2 (the two remaining are the raw fetches K2-1/K2-4 fix),
# clientMethods drops by ~53 (the deleted api/admin-marketplace.ts),
# FIXTURE 147 and NO-API 159 unchanged.
```

```bash
git add packages/shared-core/src/api packages/shared-core/src/modules/admin-marketplace-api.ts \
        apps/web/src/app/admin apps/web/src/__tests__/admin-client-surface.spec.ts
git commit -m "refactor(web): one admin client layer; the six module copies become wrappers and three dead verbs go" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4 (K1-4): The sidebar becomes a registry

**Closes:** AUD2-107, AUD2-112

**Files:**

- Create: `apps/web/src/lib/admin/navigation.ts`, `apps/web/src/__tests__/admin-navigation.spec.ts`
- Modify: `apps/web/src/app/admin/layout.tsx` (delete the 190-line `navSections` literal; read the registry)
- Modify: `apps/api/scripts/verification/admin-console-census.mjs:449-453` (the nav index)

**Interfaces:**

```ts
export type AdminModuleKey =
  | 'core'
  | 'marketplace'
  | 'grocery'
  | 'restaurant'
  | 'pharmacy'
  | 'doctor'
  | 'hotel'
  | 'taxi'
  | 'franchise'
  | 'finance'
  | 'system';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** A key the API enforces. Mandatory. Validated by the spec below. */
  perm: string;
  exact?: boolean;
  module: AdminModuleKey;
  /** Live count in the sidebar; the shell supplies the value. */
  badge?: 'pendingApprovals' | 'unreadNotifications' | 'openDisputes';
  /** Sub-pages that belong to this item for breadcrumbs and active state. */
  children?: { href: string; label: string }[];
}

export interface AdminNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
}

export const ADMIN_NAV: readonly AdminNavGroup[];
/** The groups a signed-in account may see; a group with no visible item is dropped. */
export function navGroupsFor(has: (key: string) => boolean): AdminNavGroup[];
/** `/admin/marketplace/orders/abc` → [Dashboard, Marketplace, Orders, abc] */
export function breadcrumbsFor(pathname: string): { label: string; href?: string }[];
/** Every href the registry knows, for the census and the route test. */
export function allNavHrefs(): string[];
```

- [ ] **Step 1: Failing spec**

`apps/web/src/__tests__/admin-navigation.spec.ts`:

```ts
/**
 * The sidebar is data, and every entry in it is true.
 *
 * As a literal inside `layout.tsx` the nav had grown two items for the same
 * label going to different pages, one item pointing at a route that did not
 * exist, and two items (`/admin/loyalty`, `/admin/wallet-audit`) gated on
 * permission keys the gateway declares no route for — granting the key granted
 * nothing.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ADMIN_NAV, navGroupsFor, breadcrumbsFor, allNavHrefs } from '@/lib/admin/navigation';

const APP = path.resolve(__dirname, '../app');
const pageExists = (href: string) =>
  fs.existsSync(path.join(APP, href.replace(/^\//, ''), 'page.tsx'));

/** Permission keys the API actually enforces, read from the API's own registry. */
const ENFORCED = new Set(
  fs
    .readFileSync(
      path.resolve(__dirname, '../../../../apps/api/libs/common/src/admin/permissions.ts'),
      'utf8',
    )
    .match(/key:\s*'([a-z0-9.]+)'/g)!
    .map((m) => m.slice(m.indexOf("'") + 1, -1)),
);

describe('ADMIN_NAV', () => {
  const items = ADMIN_NAV.flatMap((g) => g.items);

  it('points every item at a page that exists', () => {
    expect(items.filter((i) => !pageExists(i.href)).map((i) => i.href)).toEqual([]);
  });

  it('gives every item a permission key the API enforces', () => {
    expect(items.filter((i) => !ENFORCED.has(i.perm)).map((i) => `${i.href} → ${i.perm}`)).toEqual(
      [],
    );
  });

  it('never lists one href twice or one label twice inside a group', () => {
    expect(new Set(items.map((i) => i.href)).size).toBe(items.length);
    for (const g of ADMIN_NAV) {
      expect(new Set(g.items.map((i) => i.label)).size).toBe(g.items.length);
    }
  });

  it('does not link a page that is a bare redirect', () => {
    // `/admin/dashboard` is `redirect('/admin')` — a nav entry for it is a
    // second door onto the same room.
    expect(allNavHrefs()).not.toContain('/admin/dashboard');
  });

  it('hides a group entirely when the account holds none of its keys', () => {
    const financeOnly = navGroupsFor((k) => k.startsWith('finance.'));
    expect(financeOnly.map((g) => g.id)).toEqual(['finance']);
  });

  it('shows everything to a wildcard holder', () => {
    expect(navGroupsFor(() => true).flatMap((g) => g.items)).toHaveLength(items.length);
  });
});

describe('breadcrumbsFor', () => {
  it('builds a trail from the registry, not from the URL segments alone', () => {
    expect(breadcrumbsFor('/admin/marketplace/orders')).toEqual([
      { label: 'Dashboard', href: '/admin' },
      { label: 'Marketplace', href: '/admin/marketplace' },
      { label: 'Orders' },
    ]);
  });

  it('keeps a dynamic segment readable', () => {
    const trail = breadcrumbsFor('/admin/marketplace/orders/ORD-991');
    expect(trail[trail.length - 1]).toEqual({ label: 'ORD-991' });
  });

  it('returns the root alone for /admin', () => {
    expect(breadcrumbsFor('/admin')).toEqual([{ label: 'Dashboard' }]);
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Write the registry**

Move all 44 items out of `layout.tsx` verbatim, then apply the three corrections the spec demands:

1. `/admin/loyalty` (`loyalty.view`) and `/admin/wallet-audit` (`wallet.audit`) — the gateway declares no admin loyalty or wallet route. **Keep both items and both keys**, and let Plan K2-12 give them a real surface over the routes that do exist (`/admin/marketplace/wallet/*`, `/admin/marketplace/loyalty/*`); until then their pages render `AdminState` naming the missing route. Add the two keys to `apps/api/libs/common/src/admin/permissions.ts` if they are absent, so the spec above passes for the right reason.
2. `/admin/dashboard` is removed from any nav consideration (it is a redirect).
3. `/admin/delivery-zones` — a second page over `/admin/marketplace/delivery-zones`. It is not in the nav today and stays out; K2-4 deletes the duplicate page.

Sketch (full file restates all 44 items):

```ts
export const ADMIN_NAV = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      {
        href: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
        exact: true,
        perm: 'dashboard.view',
        module: 'core',
      },
      {
        href: '/admin/orders',
        label: 'All Orders',
        icon: Package,
        perm: 'orders.view',
        module: 'core',
        children: [{ href: '/admin/marketplace/orders', label: 'Marketplace orders' }],
      },
      {
        href: '/admin/regions',
        label: 'Countries & Markets',
        icon: Globe,
        perm: 'system.settings',
        module: 'system',
      },
    ],
  },
  // … People, Modules, Operations, Finance, System — the existing five groups
] as const satisfies readonly AdminNavGroup[];

export function navGroupsFor(has: (key: string) => boolean): AdminNavGroup[] {
  return ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => has(i.perm)) })).filter(
    (g) => g.items.length > 0,
  );
}
```

- [ ] **Step 4: The shell reads the registry**

`layout.tsx` deletes `navSections`, `NavItem` and `NavSection` and renders:

```tsx
const groups = useMemo(() => navGroupsFor((k) => hasPermission(k)), [hasPermission]);
```

Collapsed state is the shell's, persisted per viewer:

```tsx
const [collapsed, setCollapsed] = useState(false);
useEffect(() => {
  try {
    setCollapsed(localStorage.getItem('kartseek_admin_nav_collapsed') === '1');
  } catch {
    /* private window */
  }
}, []);
const toggleCollapsed = () =>
  setCollapsed((c) => {
    try {
      localStorage.setItem('kartseek_admin_nav_collapsed', c ? '0' : '1');
    } catch {
      /* ignore */
    }
    return !c;
  });
```

Active state: `item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')`. Group headings stay visible when collapsed as a 1px rule with the group icon; every collapsed item keeps an `aria-label` and a `title`.

- [ ] **Step 5: Point the census script at the registry**

`apps/api/scripts/verification/admin-console-census.mjs`, replacing the `layout.tsx` scrape:

```js
// ── 5. Nav index (the registry, not the shell) ───────────────────────────────
// The sidebar used to be a literal in layout.tsx and this regex read it there.
// It is now data in apps/web/src/lib/admin/navigation.ts; reading the shell
// would report 0 nav items and flag all 250 pages NOT-IN-NAV.
const NAV = new Map();
for (const m of read(P('apps/web/src/lib/admin/navigation.ts')).matchAll(
  /href:\s*'([^']+)'[\s\S]{0,240}?perm:\s*'([^']+)'/g,
))
  NAV.set(m[1], m[2]);
```

- [ ] **Step 6: Verify and commit**

```bash
cd apps/web && npx jest admin-navigation    # 9 passed
cd apps/web && npx jest && npx tsc --noEmit -p . && npx next build
node apps/api/scripts/verification/admin-console-census.mjs --json …after-K1-4.json --md …after-K1-4.md
# Expected: navItems 44 (unchanged — the same destinations, now read from the
# registry), navOrphans 0, pagesNotInNav 206 unchanged (K2 reduces it).
```

```bash
git add apps/web/src/lib/admin/navigation.ts apps/web/src/app/admin/layout.tsx apps/web/src/__tests__/admin-navigation.spec.ts
git commit -m "refactor(web): admin navigation is a registry every item of which has a page and an enforced key" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git add apps/api/scripts/verification/admin-console-census.mjs
git commit -m "chore(api): the console census reads the navigation registry" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5 (K1-5): The API enforces the keys the sidebar claims

**Closes:** AUD2-045

**Files:**

- Modify: `apps/api/apps/api-gateway/src/controllers/admin-core.controller.ts` (KYC and user routes), `admin-marketplace.controller.ts` (seller, payout, commission, refund, report routes), `admin-{grocery,taxi,hotel,pharmacy,doctor,restaurant}.controller.ts` (the `modules.<name>` key per class)
- Modify: `apps/api/apps/api-gateway/src/controllers/__tests__/admin-permission.regression.spec.ts` (new)

**Interfaces:** no new route. `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:kyc.view')` — `RolesGuard` already reads `perm:` keys and the `'*'` wildcard (Plan B, Task B4); this task only adds the keys.

- [ ] **Step 1: Failing regression spec (vitest, `apps/api`)**

```ts
/**
 * A nav permission that no route checks is a lie about authorisation.
 *
 * 73 console pages were gated only by the sidebar's `perm` key: the nav hid
 * `/admin/kyc-verification` behind `kyc.view`, but the KYC routes inherited
 * only the class `@Roles(ADMIN, SUPER_ADMIN)` — so any ADMIN reached them by
 * typing the URL, and a role built to exclude KYC did not exclude it.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ADMIN_NAV_KEYS } from './nav-keys.fixture'; // the 44 keys, copied from the console registry by the check below

const CTRL = path.resolve(__dirname, '..');
// route path → the permission key the console claims gates it
const CLAIMED: Record<string, string> = {
  'admin/kyc/pending': 'kyc.view',
  'admin/kyc/:id/approve': 'kyc.approve',
  'admin/kyc/:id/reject': 'kyc.approve',
  'admin/marketplace/sellers': 'sellers.view',
  'admin/marketplace/sellers/:id/approve': 'sellers.approve',
  'admin/marketplace/sellers/:id/reject': 'sellers.approve',
  'admin/marketplace/sellers/:id/suspend': 'sellers.manage',
  // …one row per claimed page, 31 in all
};

it('declares every claimed permission key on the route that serves it', () => {
  const missing: string[] = [];
  for (const [route, key] of Object.entries(CLAIMED)) {
    const src = allControllerSources();
    const handler = handlerFor(src, route);
    if (!handler || !handler.includes(`'perm:${key}'`)) missing.push(`${route} → perm:${key}`);
  }
  expect(missing).toEqual([]);
});

it('leaves no console nav key unenforced anywhere in the gateway', () => {
  const all = allControllerSources().join('\n');
  const unenforced = ADMIN_NAV_KEYS.filter((k) => !all.includes(`'perm:${k}'`));
  expect(unenforced).toEqual([]);
});
```

- [ ] **Step 2: Run — FAIL** (31 rows missing).

- [ ] **Step 3: Add the keys**

```ts
  @Get('kyc/pending')
- @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
+ // The console hides this page behind `kyc.view`; until this key was here that
+ // was a rendering preference, not an authorisation — any ADMIN reached the
+ // route by URL.
+ @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:kyc.view')
  async pendingKyc(@Req() req: any, @Query() q: PendingKycQueryDto) {
```

Repeat for the 31 claimed routes. Two rules while doing it:

- A **read** takes the `.view` key, a **write** takes the `.manage` / `.approve` key. Never give a write only the read key.
- `SUPER_ADMIN` holds `'*'`, so adding a key never locks out a super admin; verify with the live check in Step 4 rather than assuming.

- [ ] **Step 4: Live proof, bypass off**

```bash
cd apps/api && DEV_AUTH_BYPASS=false npm run dev:all
# a SUPPORT_AGENT token (holds kyc.view, not kyc.approve)
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $SUPPORT" localhost:3099/api/v1/admin/kyc/pending          # 200
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $SUPPORT" localhost:3099/api/v1/admin/kyc/u1/approve # 403
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $SUPER"   localhost:3099/api/v1/admin/kyc/pending          # 200
# anonymous, bypass OFF
curl -s -o /dev/null -w '%{http_code}\n' localhost:3099/api/v1/admin/kyc/pending                                              # 401
cd apps/api && npm run verify:admin-scope    # still all passed
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/apps/api-gateway/src/controllers
git commit -m "fix(gateway): the routes behind a permission-gated page check that permission" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6 (K1-6): The application frame

**Closes:** AUD2-109

**Files:**

- Create: `packages/shared-ui/src/admin/admin-page.tsx`, `packages/shared-ui/src/admin/frame.css.ts` (token constants), `apps/web/src/__tests__/admin-frame.spec.ts`
- Modify: `apps/web/src/app/admin/layout.tsx`, `packages/shared-ui/src/styles/globals.css` (`@layer components` only)
- Modify: `apps/web/src/app/layout.tsx:167,199`, `apps/web/config/csp.cjs:77`
- Modify: `apps/web/tsconfig.json` (add `"@/components/admin-ui": ["../../packages/shared-ui/src/admin"]` and `"@/components/admin-ui/*"`)

**Interfaces:**

```tsx
export function AdminPage(props: {
  title: string;
  description?: string;
  /** Omit to derive from the navigation registry. */
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode; // primary + secondary buttons, right-aligned
  filters?: React.ReactNode; // sticky under the title on scroll
  market?: React.ReactNode; // <MarketSelect/> or the locked badge
  children: React.ReactNode;
}): JSX.Element;
```

Frame constants, declared once and used by the shell, `AdminPage` and the Playwright harness:

| Token                         | Value                                                  | Where                           |
| ----------------------------- | ------------------------------------------------------ | ------------------------------- |
| `--admin-sidebar-w`           | `15rem` (240px), `16rem` at `3xl`                      | sidebar, and the content offset |
| `--admin-sidebar-w-collapsed` | `4.5rem` (72px)                                        | collapsed rail                  |
| `--admin-header-h`            | `3.5rem` (56px)                                        | header, and every sticky `top`  |
| `--admin-content-max`         | `110rem` (1760px)                                      | content container, centred      |
| `--admin-gutter`              | `0.75rem` / `1rem` `md` / `1.5rem` `lg` / `2rem` `3xl` | page padding                    |
| `--admin-page-gap`            | `1.5rem`                                               | between page sections           |

Breakpoints are the project's own (`packages/shared-ui/tailwind.config.ts`): `xs 375`, `md 768`, `lg 1024`, `3xl 1440`. The sidebar is a **drawer below `md`**, a **collapsible rail from `md`**, and expanded from `lg`.

- [ ] **Step 1: Failing spec**

`apps/web/src/__tests__/admin-frame.spec.ts` asserts the frame is declared once and consumed, not retyped:

```ts
it('declares the frame dimensions in one place', () => {
  const css = read('packages/shared-ui/src/styles/globals.css');
  for (const v of [
    '--admin-sidebar-w',
    '--admin-header-h',
    '--admin-content-max',
    '--admin-gutter',
  ]) {
    expect(css).toContain(v);
  }
  // and inside the components layer, per the file's house rule
  expect(css.indexOf('--admin-sidebar-w')).toBeGreaterThan(css.indexOf('@layer components'));
});

it('offsets the content by the sidebar variable, not by a repeated literal', () => {
  const layout = read('apps/web/src/app/admin/layout.tsx');
  expect(layout).not.toMatch(/md:ml-60|3xl:ml-64/);
  expect(layout).toContain('var(--admin-sidebar-w');
});

it('renders a title, a breadcrumb trail and an actions slot', () => {
  const html = renderToStaticMarkup(
    React.createElement(AdminPage, {
      title: 'Orders',
      breadcrumbs: [{ label: 'Dashboard', href: '/admin' }, { label: 'Orders' }],
      actions: React.createElement('button', null, 'Export'),
      children: React.createElement('div', null, 'body'),
    }),
  );
  expect(html).toContain('<h1');
  expect(html).toContain('Orders');
  expect(html).toContain('aria-label="Breadcrumb"');
  expect(html).toContain('Export');
});

it('drops `unsafe-inline` from the console script policy', () => {
  const csp = read('apps/web/config/csp.cjs');
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(csp).toMatch(/script-src[^;]*'nonce-/);
});
```

`content-security-policy.spec.ts` already exists and will need its expectations updated in the same step — read it first and change it deliberately, not to make it pass.

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement**

`globals.css`, inside `@layer components` (the file's house rule; a custom class outside that layer loses to every Tailwind utility — `project_globals_css_cascade_gotcha`):

```css
@layer components {
  /* The admin frame, in one place. These were literals repeated across the
     shell (`md:ml-60 3xl:ml-64`, `h-14`, `w-60 3xl:w-64`), so a sidebar width
     change moved the sidebar and left the content offset behind it. */
  .admin-shell {
    --admin-sidebar-w: 15rem;
    --admin-sidebar-w-collapsed: 4.5rem;
    --admin-header-h: 3.5rem;
    --admin-content-max: 110rem;
    --admin-gutter: 0.75rem;
    --admin-page-gap: 1.5rem;
  }
  @media (min-width: 768px) {
    .admin-shell {
      --admin-gutter: 1rem;
    }
  }
  @media (min-width: 1024px) {
    .admin-shell {
      --admin-gutter: 1.5rem;
    }
  }
  @media (min-width: 1440px) {
    .admin-shell {
      --admin-sidebar-w: 16rem;
      --admin-gutter: 2rem;
    }
  }
  .admin-shell[data-nav='collapsed'] {
    --admin-sidebar-w: var(--admin-sidebar-w-collapsed);
  }

  .admin-content {
    margin-left: 0;
  }
  @media (min-width: 768px) {
    .admin-content {
      margin-left: var(--admin-sidebar-w);
    }
  }
  .admin-main {
    max-width: var(--admin-content-max);
    padding: var(--admin-gutter);
    margin: 0 auto;
  }
  /* Nothing in the console scrolls the page sideways: a wide table scrolls
     inside its own container (DataTable, Task 8). */
  .admin-main {
    overflow-x: clip;
  }
}
```

`AdminPage`:

```tsx
export function AdminPage({
  title,
  description,
  breadcrumbs,
  actions,
  filters,
  market,
  children,
}: AdminPageProps) {
  const pathname = usePathname();
  const trail = breadcrumbs ?? breadcrumbsFor(pathname);
  return (
    <div className="flex flex-col gap-[var(--admin-page-gap)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-1">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {trail.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" aria-hidden />}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-slate-900">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-slate-900 font-medium">
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{title}</h1>
          {description && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {market}
          {actions}
        </div>
      </div>
      {filters && (
        <div
          className="sticky z-10 bg-slate-50/95 backdrop-blur py-2 -my-2"
          style={{ top: 'var(--admin-header-h)' }}
        >
          {filters}
        </div>
      )}
      {children}
    </div>
  );
}
```

CSP: generate a nonce per request in `apps/web/src/proxy.ts` (`crypto.randomUUID()` → `x-nonce` request header), read it in `apps/web/src/app/layout.tsx` via `headers()`, put it on the two inline blocks at `:167` and `:199`, and change `apps/web/config/csp.cjs:77` from `'unsafe-inline'` to `'nonce-${nonce}' 'strict-dynamic'`. Keep `style-src 'unsafe-inline'` — Tailwind's runtime style injection needs it and it is not the XSS vector the row names.

- [ ] **Step 4: Verify at four widths**

Run the harness from Task 11 once it exists; for this task, verify by hand with Chrome DevTools at 375 / 768 / 1024 / 1440 on `/admin`, `/admin/staff` and `/admin/marketplace/sellers`:

- no horizontal document scrollbar at any width (`document.documentElement.scrollWidth === window.innerWidth`)
- the sidebar is a drawer at 375 and 768, a rail at 1024 with the collapse toggle, expanded at 1440
- the header stays 56px and the page title is never under it

- [ ] **Step 5: Commit**

```bash
git add packages/shared-ui/src/admin packages/shared-ui/src/styles/globals.css \
        apps/web/src/app/admin/layout.tsx apps/web/src/app/layout.tsx apps/web/src/proxy.ts \
        apps/web/config/csp.cjs apps/web/tsconfig.json apps/web/src/__tests__
git commit -m "feat(web): one admin frame with declared sidebar, header and gutter tokens and a nonce csp" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7 (K1-7): The design-system primitives

**Closes:** — (foundation for K2; no AUD2 row is closed by this task alone)

**Files:**

- Create: `packages/shared-ui/src/admin/primitives.tsx` (Button, IconButton, Input, Select, MultiSelect, Checkbox, Textarea, Card, Tabs, Badge, Alert, Skeleton, EmptyState, **ErrorState**, **NotBuiltState**), `dialogs.tsx` (Modal, ConfirmDialog, ReasonDialog, Drawer, Dropdown), `date-range.tsx` (DateRangePicker), `status-badge.tsx`, `toast.tsx` (Toaster + `useToast`), `index.ts`
- Create: `apps/web/src/__tests__/admin-primitives.spec.ts`

**Interfaces:** every control takes `size?: 'sm' | 'md'` (default `md`; the console is dense — `sm` is 28px, `md` 36px), `tone?: 'primary' | 'neutral' | 'danger'`, and forwards `aria-*`. Typography and spacing come from the shared scale, not from per-page classes:

| Scale          | Values                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| Type           | `page 20/24px` · `section 16px` · `body 14px` · `meta 12px` · `micro 11px` |
| Space          | `1 = 0.25rem` … page gap `1.5rem`, card padding `1rem`/`1.25rem` at `lg`   |
| Radius         | control `0.75rem`, card `1rem`, panel `1.5rem`                             |
| Status colours | one map, `registerStatusMap(module, map)` — 30+ local badge maps collapse  |

- [ ] **Step 1: Failing spec** — accessibility and behaviour, not appearance:

```ts
describe('admin primitives', () => {
  it('gives every input a label element tied by id', () => {
    const html = renderToStaticMarkup(
      React.createElement(Input, { id: 'q', label: 'Search', value: '', onChange: () => {} }),
    );
    expect(html).toMatch(/<label[^>]*for="q"/);
  });

  it('marks a destructive button as such for assistive tech', () => {
    expect(
      renderToStaticMarkup(React.createElement(Button, { tone: 'danger', children: 'Delete' })),
    ).toMatch(/data-tone="danger"/);
  });

  it('renders a modal with a role, a label and an initial focus target', () => {
    const html = renderToStaticMarkup(
      React.createElement(Modal, {
        open: true,
        onClose: () => {},
        title: 'Suspend seller',
        children: 'body',
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toMatch(/aria-labelledby="[^"]+"/);
  });

  it('requires a reason before a ReasonDialog can confirm', () => {
    const html = renderToStaticMarkup(
      React.createElement(ReasonDialog, {
        open: true,
        title: 'Reject',
        onClose: () => {},
        onConfirm: () => {},
      }),
    );
    expect(html).toMatch(/<button[^>]*disabled/); // confirm starts disabled
  });

  it('announces a toast politely without stealing focus', () => {
    expect(
      renderToStaticMarkup(
        React.createElement(Toaster, { toasts: [{ id: 1, type: 'success', message: 'Saved' }] }),
      ),
    ).toMatch(/role="status"[^>]*aria-live="polite"/);
  });

  it('renders an unknown status as itself rather than crashing', () => {
    expect(
      renderToStaticMarkup(
        React.createElement(StatusBadge, { module: 'marketplace', status: 'WHAT' }),
      ),
    ).toContain('WHAT');
  });

  it('NotBuiltState names the route and renders no control at all', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotBuiltState, {
        feature: 'Intercity rides',
        route: 'GET /admin/taxi/intercity',
      }),
    );
    expect(html).toContain('Intercity rides');
    expect(html).toContain('GET /admin/taxi/intercity');
    expect(html).not.toMatch(/<button|<input|<select/); // a page saying "not built" offers nothing to press
  });
});
```

The last case is not hypothetical: `payouts/page.tsx` blanked the whole page on one unexpected status before its fallback map was added.

- [ ] **Step 2: Run — FAIL. Step 3: implement.** Notes that matter:

- `Modal`/`Drawer` trap focus, restore it on close, and close on Escape through the existing `DismissOnEscape` (`@/components/shared/dismiss-on-escape`) so behaviour stays identical to the rest of the app.
- `Drawer` is the detail view for `DataTable`; at `< md` it is full-screen, at `≥ md` a 30rem right panel.
- `Dropdown` renders into the flow, not a portal, and closes on outside click and on route change.
- `DateRangePicker` is two native `<input type="date">` plus presets (Today / 7d / 30d / This month / Custom) — no dependency, and native pickers are keyboard-accessible on every target browser.
- The `fixed bottom-0` toast must not eat clicks on a fixed control: reuse the `--consent-banner-height` pattern (`project_consent_banner_blocks_fixed_ui`) and give `Toaster` `pointer-events-none` with `pointer-events-auto` on the toast itself.

- [ ] **Step 4: Verify and commit**

```bash
cd apps/web && npx jest admin-primitives && npx jest && npx tsc --noEmit -p . && npx next build
node apps/api/scripts/verification/admin-console-census.mjs --json …after-K1-7.json --md …after-K1-7.md   # counts unchanged
git add packages/shared-ui/src/admin apps/web/src/__tests__/admin-primitives.spec.ts
git commit -m "feat(web): admin design-system primitives with labelled controls, trapped dialogs and one status map" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8 (K1-8): One `DataTable`

**Closes:** — (foundation; K2 counts the 144 hand-rolled tables it replaces)

**Files:**

- Create: `packages/shared-ui/src/admin/data-table.tsx`, `filter-bar.tsx`, `use-table-params.ts`
- Create: `apps/web/src/__tests__/admin-data-table.spec.ts`

**Interfaces:**

```ts
export interface Column<T> {
  key: string; // also the server sort key
  header: string;
  render?: (row: T) => React.ReactNode;
  value?: (row: T) => string | number | null; // used by CSV export
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** Hidden below this breakpoint; its value moves into the row's expando. */
  hideBelow?: 'ms' | 'sm' | 'md' | 'lg' | 'xl';
}
export interface RowAction {
  label: string;
  onSelect: () => void;
  tone?: 'neutral' | 'danger';
  disabled?: boolean;
  perm?: string;
}
export interface BulkAction<T> {
  label: string;
  tone?: 'neutral' | 'danger';
  perm?: string;
  /** Must return the server's per-id result; the bar reports it row by row. */
  run: (ids: string[]) => Promise<{ id: string; ok: boolean; message?: string }[]>;
}
export interface FilterSpec {
  key: string;
  label: string;
  kind: 'select' | 'multiselect' | 'date-range' | 'text';
  options?: { value: string; label: string }[];
}
export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Server paging. `total` is the server's count, never `rows.length`. */
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  sort?: { key: string; dir: 'asc' | 'desc' };
  onSortChange?: (s: { key: string; dir: 'asc' | 'desc' }) => void;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  filters?: FilterSpec[];
  filterValues?: Record<string, string | string[]>;
  onFilterChange?: (key: string, value: string | string[]) => void;
  selection?: { selected: string[]; onChange: (ids: string[]) => void };
  bulkActions?: BulkAction<T>[];
  rowActions?: (row: T) => RowAction[];
  onRowClick?: (row: T) => void;
  exportCsv?: { filename: string };
  /** The only way this table renders a failure: no page draws its own. */
  state: { loading: boolean; failure: ApiError | null; route: string; onRetry: () => void };
  emptyTitle?: string;
  emptyHint?: string;
}
```

`useTableParams` binds `page`, `limit`, `sort`, `q` and every filter key to the URL search params (design §5.3, "the URL is the state"), so a filtered table is a shareable link and the back button works.

- [ ] **Step 1: Failing spec**

```ts
describe('DataTable', () => {
  const rows = [
    { id: 'a', name: 'Alpha', total: 10 },
    { id: 'b', name: 'Beta', total: 20 },
  ];
  const cols: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'total', header: 'Total', align: 'right', value: (r) => r.total },
  ];
  const base = {
    rows,
    columns: cols,
    rowKey: (r: any) => r.id,
    total: 57,
    page: 1,
    limit: 25,
    onPageChange: () => {},
    state: { loading: false, failure: null, route: 'GET /x', onRetry: () => {} },
  };

  it('reports the server total, not the number of rows on screen', () => {
    expect(renderToStaticMarkup(React.createElement(DataTable, base as any))).toContain('57');
  });

  it('puts the failure panel in place of the table, and no rows behind it', () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable, {
        ...base,
        state: {
          ...base.state,
          failure: new ApiError({ status: 403, messages: ['no'], route: 'GET /x' }),
        },
      } as any),
    );
    expect(html).not.toContain('Alpha');
    expect(html).toContain('GET /x');
  });

  it('names the active filters in the empty state', () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable, {
        ...base,
        rows: [],
        total: 0,
        filterValues: { status: 'CANCELLED' },
        filters: [{ key: 'status', label: 'Status', kind: 'select' }],
        emptyTitle: 'No orders match these filters',
      } as any),
    );
    expect(html).toContain('No orders match these filters');
    expect(html).toContain('Status: CANCELLED');
  });

  it('scrolls sideways inside its own container, never the page', () => {
    expect(renderToStaticMarkup(React.createElement(DataTable, base as any))).toMatch(
      /overflow-x-auto/,
    );
  });

  it('gives the header a scope and the sort control an aria-sort', () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable, { ...base, sort: { key: 'name', dir: 'asc' } } as any),
    );
    expect(html).toMatch(/<th[^>]*scope="col"/);
    expect(html).toMatch(/aria-sort="ascending"/);
  });

  it('hides a bulk action the viewer has no permission for', () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable, {
        ...base,
        selection: { selected: ['a'], onChange: () => {} },
        bulkActions: [{ label: 'Delete', perm: 'orders.manage', run: async () => [] }],
        hasPermission: () => false,
      } as any),
    );
    expect(html).not.toContain('Delete');
  });
});
```

- [ ] **Step 2–3: implement.** The rules the component enforces so pages cannot break them:

- The table never renders rows while `state.failure` is set — that is what kept fixtures on screen behind a 403.
- `total` drives the pager; a page that passes `rows.length` shows one page and hides 32 rows.
- Bulk actions report **per id**: the bar shows `12 succeeded, 2 refused` with the refusals named, because a bulk endpoint that partially fails is the normal case.
- `exportCsv` builds the file from `column.value(row)` for the **rows the server returned**, and the button is disabled when `total > rows.length` with the title "Export applies to the current page; narrow the filters to export everything" — an export that silently exports 25 of 4,000 rows is a lie.
- Selection is by id across pages and survives paging.
- At `< md`, `hideBelow` columns collapse into a per-row expando; the table itself is inside `overflow-x-auto` with a sticky first column.

- [ ] **Step 4: Verify and commit**

```bash
cd apps/web && npx jest admin-data-table && npx jest && npx tsc --noEmit -p . && npx next build
git add packages/shared-ui/src/admin apps/web/src/__tests__/admin-data-table.spec.ts
git commit -m "feat(web): one admin data table with server paging, url-bound filters and per-id bulk results" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9 (K1-9): `Money`, and a lint rule that keeps `₹` out

**Closes:** AUD2-110

**Files:**

- Create: `packages/shared-ui/src/admin/money.tsx`, `apps/web/scripts/eslint-rules/no-hardcoded-currency.cjs`
- Modify: `apps/web/eslint.config.mjs`
- Create: `apps/web/src/__tests__/admin-money.spec.ts`

**Interfaces:**

```tsx
export function Money(props: {
  amount: number | string | null | undefined;
  /** The market the ROW belongs to — not the viewer's. A Qatari payout is QAR
   *  on an Indian admin's screen. */
  country?: string;
  currency?: string; // when the row carries its own code
  compact?: boolean;
  showCode?: boolean;
  fallback?: string; // default '—'
}): JSX.Element;
export function useMoney(country?: string): (amount: number, opts?) => string;
```

Both delegate to `formatMoney` in `packages/shared-core/src/localization/currency.ts`, which already knows the three-minor-unit currencies (BHD/KWD/OMR — `project_franchise_multi_region`).

- [ ] **Step 1: Failing spec**

```ts
it('formats in the row’s market, not the viewer’s', () => {
  expect(text(<Money amount={1234.5} country="QA" />)).toBe('QR 1,234.50');
  expect(text(<Money amount={1234.5} country="IN" />)).toBe('₹ 1,234.50');
});
it('keeps three minor units for KWD', () => {
  expect(text(<Money amount={1.2345} country="KW" />)).toBe('KD 1.235');
});
it('renders a dash for a missing amount instead of ₹0', () => {
  expect(text(<Money amount={null} country="QA" />)).toBe('—');
});
it('never emits a symbol when it has no market and no currency', () => {
  expect(text(<Money amount={10} />)).not.toContain('₹');
});

describe('no-hardcoded-currency', () => {
  it('reports a ₹ in JSX text and in a template literal', () => {
    expect(lint(`const a = <span>₹{x}</span>;`)).toHaveLength(1);
    expect(lint('const a = `₹${x}`;')).toHaveLength(1);
  });
  it('allows the localization registry itself', () => {
    expect(lint(`const SYMBOLS = { IN: '₹' };`, 'packages/shared-core/src/localization/currency.ts')).toHaveLength(0);
  });
});
```

- [ ] **Step 2–3: implement.** The rule flags `₹ $ € £ ¥ ﷼ ر.س ر.ق د.إ` and the bare codes `INR|QAR|AED|SAR|KWD|BHD|OMR|USD|GBP|EUR` in JSX text, string literals and template literals under `apps/web/src/app/admin/**` and `packages/shared-ui/src/admin/**`, with an allowlist for `packages/shared-core/src/localization/**` and the test files. Register it as **`warn`** in `eslint.config.mjs` for this task (107 files still violate it) and flip it to `error` in Plan K2's final task, when the count is zero. Say so in the rule's own doc comment so nobody flips it early and blocks the build.

- [ ] **Step 4: Verify and commit**

```bash
cd apps/web && npx jest admin-money
cd apps/web && npx eslint "src/app/admin/**/*.tsx" --rule '{"local/no-hardcoded-currency":"warn"}' 2>&1 | tail -3
# Expected: ~107 files warned — the K2 work list. 0 errors.
cd apps/web && npx jest && npx tsc --noEmit -p . && npx next build
git add packages/shared-ui/src/admin/money.tsx apps/web/scripts/eslint-rules apps/web/eslint.config.mjs apps/web/src/__tests__/admin-money.spec.ts
git commit -m "feat(web): a money component that formats in the row's market, and a lint rule that keeps symbols out" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10 (K1-10): One dashboard architecture for both admins

**Closes:** AUD2-103

**Files:**

- Create: `packages/shared-ui/src/admin/dashboard.tsx`
- Modify: `apps/web/src/app/admin/page.tsx` (the console dashboard — already one of the nine correct pages; it moves onto the shared architecture and loses its `recentActivity`/`hourlyData`/`modules` fixtures)
- Modify: `apps/web/src/app/admin/marketplace/page.tsx:201-209` (the zero-fallback)
- Create: `apps/web/src/__tests__/admin-dashboard.spec.ts`

**Interfaces:**

```tsx
export function DashboardGrid(props: { children: React.ReactNode }): JSX.Element;   // 1 / 2 / 4 columns at 375 / 768 / 1440
export function StatCard(props: {
  label: string; value: React.ReactNode; delta?: { pct: number; window: string };
  icon?: LucideIcon; href?: string; perm?: string;
  /** When the source call failed, the card says so instead of showing 0. */
  failure?: ApiError | null; loading?: boolean;
}): JSX.Element;
export function ActivityFeed(props: { items: AuditLogRow[]; loading: boolean; failure: ApiError | null; route: string }): JSX.Element;
export function PendingApprovals(props: { groups: { label: string; count: number; href: string; perm: string }[]; … }): JSX.Element;
export function AlertList(props: { alerts: { level: 'info'|'warn'|'critical'; message: string; href?: string }[]; … }): JSX.Element;
export function QuickActions(props: { actions: { label: string; href: string; perm: string; icon: LucideIcon }[] }): JSX.Element;
export function OperationalStatus(props: { services: { name: string; state: 'up'|'degraded'|'down'|'unknown'; detail?: string }[]; … }): JSX.Element;
```

The Super Admin and Regional Admin dashboards are **the same page**. The difference is only what the API returns: a locked admin's `GET /admin/dashboard` is scoped by the token, so the market selector is a badge and the market column disappears. No component branches on role; every one branches on `hasPermission` and on what the response contains.

- [ ] **Step 1: Failing spec**

```ts
it('a failed KPI call says so; it does not render zero', () => {
  const html = renderToStaticMarkup(React.createElement(StatCard, {
    label: 'Refunds', value: 0,
    failure: new ApiError({ status: 503, messages: ['refund-service did not answer'], route: 'GET /admin/dashboard' }),
  }));
  expect(html).not.toMatch(/>0</);
  expect(html).toMatch(/not connected|did not answer/i);
});

it('does not spread an empty object over a failed dashboard response', () => {
  const src = read('apps/web/src/app/admin/marketplace/page.tsx');
  expect(src).not.toMatch(/\.\.\.\s*\(\s*apiDashboard\?\.\w+\s*\|\|\s*\{\}\s*\)/);
});

it('hides a quick action and a KPI the viewer has no permission for', () => { … });

it('renders the activity feed from audit rows and nothing when there are none', () => {
  expect(renderToStaticMarkup(React.createElement(ActivityFeed, { items: [], loading: false, failure: null, route: 'GET /admin/audit-logs' })))
    .toMatch(/no recorded activity/i);
});

it('shows an unknown service state as unknown, not as up', () => {
  expect(renderToStaticMarkup(React.createElement(OperationalStatus, { services: [{ name: 'taxi', state: 'unknown' }], loading: false, failure: null, route: 'GET /admin/platform/health' })))
    .toMatch(/unknown/i);
});
```

- [ ] **Step 2–3: implement.** `apps/web/src/app/admin/page.tsx` becomes:

```tsx
const { data: dash, loading, failure, refetch } = useAdminData(
  () => adminCoreApi.getDashboard(country), [country]);
const { data: activity, loading: actLoading, failure: actFailure } = useAdminData(
  () => adminCoreApi.getAuditLogs({ limit: 10, country }), [country]);
const { data: health, loading: healthLoading, failure: healthFailure } = useAdminData(
  () => adminCoreApi.getPlatformHealth(), []);

<AdminPage title="Platform overview" market={<MarketSelect />}>
  <DashboardGrid>
    <StatCard label="Orders today"  value={dash?.ordersToday}  failure={failure} loading={loading} perm="orders.view"    href="/admin/orders" />
    <StatCard label="Gross revenue" value={<Money amount={dash?.revenueToday} country={dash?.country} />} failure={failure} loading={loading} perm="finance.view" />
    <StatCard label="Pending approvals" value={dash?.pendingApprovals} failure={failure} loading={loading} perm="sellers.approve" href="/admin/marketplace/seller-approvals" />
    <StatCard label="Open disputes" value={dash?.openDisputes} failure={failure} loading={loading} perm="support.view" />
  </DashboardGrid>
  <div className="grid gap-[var(--admin-page-gap)] lg:grid-cols-3">
    <ActivityFeed items={activity?.data ?? []} loading={actLoading} failure={actFailure} route="GET /admin/audit-logs" />
    <PendingApprovals … />
    <OperationalStatus services={health?.services ?? []} loading={healthLoading} failure={healthFailure} route="GET /admin/platform/health" />
  </div>
</AdminPage>
```

`marketplace/page.tsx:201-209` — delete the `... (apiDashboard?.X || {})` spreads and pass `failure` into every card, so a failed dashboard reads as a failure and not as a quiet day.

- [ ] **Step 4: Verify and commit**

```bash
cd apps/web && npx jest admin-dashboard && npx jest && npx tsc --noEmit -p . && npx next build
node apps/api/scripts/verification/admin-console-census.mjs --json …after-K1-10.json --md …after-K1-10.md
# Expected: FIXTURE 147 → 145 (admin/page.tsx and marketplace/page.tsx lose theirs),
# NOT-CONNECTED-STATE 10 → 12.
git add packages/shared-ui/src/admin/dashboard.tsx apps/web/src/app/admin/page.tsx \
        apps/web/src/app/admin/marketplace/page.tsx apps/web/src/__tests__/admin-dashboard.spec.ts
git commit -m "feat(web): one dashboard architecture; a failed kpi says so instead of rendering a quiet day" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11 (K1-11): The responsive, accessibility and census harness

**Closes:** — (the acceptance gate every K2 task runs)

**Files:**

- Create: `apps/web/e2e/admin-console.spec.ts`, `apps/web/e2e/admin-routes.ts`, `apps/web/e2e/fixtures/admin-login.ts`
- Modify: `apps/web/playwright.config.ts` (an `admin-chrome` project on system Chrome)
- Create: `apps/api/scripts/verification/console-census-gate.mjs`

**Interfaces:** `apps/web/e2e/admin-routes.ts` exports `ADMIN_ROUTES: { href: string; module: string; needs: string }[]`, generated from `ADMIN_NAV` plus the per-module page lists K2 fills in as it migrates. The harness is the same file across both plans; K2 tasks add routes to it, never a second harness.

- [ ] **Step 1: The Playwright project**

```ts
// playwright.config.ts — added project
{
  name: 'admin-chrome',
  testMatch: /admin-.*\.spec\.ts/,
  use: {
    // Playwright's own browsers are not installed in this environment; system
    // Chrome is (project_marketplace_mobile_verification). Drive `localhost`,
    // not 127.0.0.1 — the dev server's cookies are host-scoped
    // (project_web_verification_gotchas).
    channel: 'chrome',
    baseURL: 'http://localhost:3000',
    storageState: 'e2e/.auth/admin.json',
  },
  dependencies: ['admin-setup'],
},
{ name: 'admin-setup', testMatch: /admin-login\.setup\.ts/, use: { channel: 'chrome' } },
```

The setup project signs in through the real MFA flow (`DEV_MFA_ECHO=true` gives the code in the challenge response) and saves `storageState`, so the harness never uses `DEV_AUTH_BYPASS`.

- [ ] **Step 2: The harness**

```ts
const WIDTHS = [375, 768, 1024, 1440] as const;

for (const route of ADMIN_ROUTES) {
  for (const width of WIDTHS) {
    test(`${route.href} @ ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route.href);
      // Settle on the network, not on a timer: a timer reports a slow page as
      // a broken one and a broken one as fine (project_marketplace_audit_harness).
      await page.waitForLoadState('networkidle');

      // 1. No page-level horizontal scroll at any width.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route.href} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1);

      // 2. Nothing overlaps the header or the sidebar.
      const collisions = await page.evaluate(() => {
        /* rect intersection of
        [data-admin-header], [data-admin-sidebar] and every element in <main> */
      });
      expect(collisions).toEqual([]);

      // 3. No fixture reached the screen. These strings only ever came from a
      //    seeded array; a real market never contains all of them at once.
      const body = await page.locator('body').innerText();
      for (const tell of [
        'Sample Product',
        'John Doe',
        'Rahul Kapoor',
        'Lorem ipsum',
        'MOCK',
        'CUS-001',
      ]) {
        expect(body, `${route.href} shows the fixture "${tell}"`).not.toContain(tell);
      }

      // 4. No console error, and no request that 404'd or 503'd unreported.
      expect(consoleErrors).toEqual([]);

      // 5. A page that could not load says so, in words, naming its route.
      if (failedRequests.length) {
        await expect(page.getByRole('alert')).toBeVisible();
      }

      await page.screenshot({
        path: `e2e/screenshots/${route.href.replace(/\//g, '_')}@${width}.png`,
        fullPage: true,
      });
    });
  }
}
```

Screenshots to capture for every K2 task: the module landing page, one list page and one detail page per module, at all four widths — that is the evidence a task attaches to its completion note.

An accessibility pass runs once per route at 1440 using `@axe-core/playwright` if it is already a dependency; if it is not, assert the four things that matter most without it: every `<img>` has `alt`, every form control has an accessible name, there is exactly one `<h1>`, and `document.activeElement` is inside a dialog while one is open.

- [ ] **Step 3: The census gate**

`apps/api/scripts/verification/console-census-gate.mjs` runs the census and exits non-zero when a flag exceeds its budget:

```js
// Usage: node console-census-gate.mjs --fixture 0 --no-api 0 --fetch-no-auth 0
// The budgets are the plan's, passed per task; the gate exists so a task cannot
// report "done" against a count it did not read.
```

- [ ] **Step 4: Run it on today's console and record the baseline**

```bash
cd apps/web && npx playwright test --project=admin-chrome --reporter=list
# Expected on the K1 branch: the 44 nav routes pass the overflow and overlap
# checks at all four widths; the fixture check FAILS on the pages Plan K2 has
# not reached yet. Record the failing list — it is K2's work order, and it must
# be empty when K2 finishes.
node apps/api/scripts/verification/console-census-gate.mjs --fixture 145 --no-api 159
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e apps/web/playwright.config.ts apps/api/scripts/verification/console-census-gate.mjs
git commit -m "test(web): an admin harness that checks overflow, overlap and fixtures at 375/768/1024/1440" \
           -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Deferred (P3)

| id       | Row              | Why it is not in a task here                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUD2-150 | Edge role cookie | The audit's own ruling is "acceptable as designed" — the cookie gates rendering, every API call is token-authorised. The one thing to confirm is that no admin page server-renders data before the token check; Task 11's harness asserts it (a signed-out request to any `/admin` route must redirect, not stream HTML). Changing the gate itself belongs with the auth workstream that owns `proxy.ts`. |
| AUD2-151 | Token storage    | The mitigation named in the row is the CSP nonce, which **Task 6 lands**. Moving the access token to an `httpOnly` cookie changes sign-in for the customer, seller and partner clients too, not only the console, so it is a platform-auth change and not a console one.                                                                                                                                  |

---

## Self-review

**AUD2 coverage — every CONSOLE row this plan owns, in exactly one task:**

| id       | Task                        | id       | Task                        |
| -------- | --------------------------- | -------- | --------------------------- |
| AUD2-043 | K1-2                        | AUD2-102 | K1-3                        |
| AUD2-045 | K1-5                        | AUD2-103 | K1-10                       |
| AUD2-046 | K1-3                        | AUD2-107 | K1-4                        |
| AUD2-048 | K1-1                        | AUD2-108 | K1-3                        |
| AUD2-101 | K1-3                        | AUD2-109 | K1-6                        |
| AUD2-110 | K1-9                        | AUD2-112 | K1-4                        |
| AUD2-150 | Deferred (P3), reason above | AUD2-151 | Deferred (P3), reason above |

The other twelve CONSOLE rows — 037, 038, 039, 040, 041, 042, 044, 047, 104, 105, 106, 111 — are Plan K2's, one task each; K2's own self-review lists them. No row appears in both plans.

**Placeholder scan.** No task in this file leaves a `TODO`, a `Coming soon`, a fixture array or a button with an empty handler. The two components that render "nothing here" — `AdminState` and `DataTable`'s empty state — both require a `route` string, so a page cannot say "not connected" without naming what did not answer. `no-hardcoded-currency` is registered as `warn` in Task 9 and is flipped to `error` by Plan K2's final task; that is the only deliberately temporary setting in this plan, and it is stated in the rule's own comment.

**Name and prop consistency with Plan K2.** The names K2 imports are fixed here and nowhere else: `apiCall`, `ApiError` (`status`, `messages`, `requestId`, `route`, `retryAfterSeconds`, `body`), `classifyApiError`, `errorMessages`, `useAdminData` (`data`, `loading`, `error`, `failure`, `refetch`, `toast`, `showToast`), `useAdminAction` (`execute`, `actionLoading`), `AdminState` (`failure`, `loading`, `route`, `what`, `needs`, `onRetry`, `empty`, `isEmpty`), `AdminPage` (`title`, `description`, `breadcrumbs`, `actions`, `filters`, `market`), `DataTable` (`rows`, `columns`, `rowKey`, `total`, `page`, `limit`, `onPageChange`, `onLimitChange`, `sort`, `onSortChange`, `search`, `filters`, `filterValues`, `onFilterChange`, `selection`, `bulkActions`, `rowActions`, `onRowClick`, `exportCsv`, `state`, `emptyTitle`, `emptyHint`), `Column` (`key`, `header`, `render`, `value`, `sortable`, `align`, `width`, `hideBelow`), `FilterSpec` (`key`, `label`, `kind`, `options`), `Money` (`amount`, `country`, `currency`, `compact`, `showCode`, `fallback`), `StatCard` (`label`, `value`, `delta`, `icon`, `href`, `perm`, `failure`, `loading`), `ADMIN_NAV` / `navGroupsFor` / `breadcrumbsFor`. Plan K2 restates this list verbatim in its own Interfaces section; if a name changes during execution, both files change in the same commit.

**Ordering.** Tasks 1 → 2 → 3 are strictly sequential (the error type, then the hook that reads it, then the clients that throw it). Tasks 4–11 can be worked in parallel by separate agents once Task 3 has landed, except that Task 10 needs Task 7's primitives and Task 11 needs Task 4's registry.
