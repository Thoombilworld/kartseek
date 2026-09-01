/**
 * Marketplace — live-stack smoke test.
 *
 * Checks that the marketplace routes exist and are reachable through the API
 * gateway. It is a smoke test against a running system, not a unit test: every
 * case here performs a real HTTP request, so it needs `npm run dev` up before
 * it means anything.
 *
 * It lives in `test/` and is excluded from the default run for that reason —
 * the same treatment `schema.integration.spec.ts` and
 * `marketplace.integration.spec.ts` already get. Previously these cases sat in
 * `src/__tests__/verification.spec.ts` alongside static checks that need no
 * infrastructure, so a developer with no gateway running saw 13 failures on
 * every unit run and learned to ignore a red suite.
 *
 * Run it deliberately, against a live stack:
 *
 *   npm run test:integration
 *
 * A failure here means a route is missing (404) or crashing (500). A
 * connection refused means the gateway is not running, which is a fact about
 * the machine rather than about the code.
 */

const BASE_URL = 'http://localhost:3001/api/v1/marketplace';

const PUBLIC_API_ENDPOINTS = [
  // ── Home & Discovery ───────────────────────────────────────────────────
  { method: 'GET', path: '/home',                    name: 'Marketplace Home Feed' },
  // ── Categories ─────────────────────────────────────────────────────────
  { method: 'GET', path: '/categories',              name: 'List Categories' },
  { method: 'GET', path: '/category-list',           name: 'List Categories (alias)' },
  // ── Products ───────────────────────────────────────────────────────────
  { method: 'GET', path: '/products',                name: 'List Products' },
  { method: 'GET', path: '/products?category=electronics', name: 'Products filtered by category' },
  { method: 'GET', path: '/products?page=1&limit=5', name: 'Products with pagination' },
  // ── Search ─────────────────────────────────────────────────────────────
  { method: 'GET', path: '/search?q=test',           name: 'Search Marketplace' },
  // ── Coupons (public list) ──────────────────────────────────────────────
  { method: 'GET', path: '/coupons',                 name: 'List Coupons' },
  // ── Bank & Exchange Offers ─────────────────────────────────────────────
  { method: 'GET', path: '/offers/bank',             name: 'Bank Offers' },
  { method: 'GET', path: '/offers/exchange',         name: 'Exchange Offers' },
];

const AUTHENTICATED_ENDPOINTS = [
  { method: 'GET',  path: '/cart',            name: 'Get Cart' },
  { method: 'GET',  path: '/returns',         name: 'List Returns' },
  { method: 'POST', path: '/orders/checkout', name: 'Create Checkout' },
];

describe('Marketplace live-stack smoke test', () => {

  describe('Public API endpoint connectivity', () => {
    for (const endpoint of PUBLIC_API_ENDPOINTS) {
      it(`${endpoint.method} ${endpoint.path} — ${endpoint.name}`, async () => {
        const url = `${BASE_URL}${endpoint.path}`;
        try {
          const response = await fetch(url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
          });

          // Accepted as "the route exists and is reachable":
          //   200 = success
          //   401 = route exists but requires auth (expected for guarded endpoints)
          //   403 = route exists, auth is valid, but role is wrong
          //   503 = route exists, gateway reached, downstream microservice is down
          // Rejected: 404 (route doesn't exist) and 500 (unhandled crash).
          const acceptableStatuses = [200, 201, 401, 403, 503];

          if (!acceptableStatuses.includes(response.status)) {
            const body = await response.text().catch(() => '(no body)');
            throw new Error(
              `Unexpected status ${response.status} for ${endpoint.method} ${endpoint.path}.\n` +
              `Body: ${body.substring(0, 300)}`
            );
          }

          expect(acceptableStatuses).toContain(response.status);
        } catch (error: any) {
          if (error.name === 'TimeoutError' || error.cause?.code === 'ECONNREFUSED') {
            throw new Error(
              `API gateway not reachable at ${url}. ` +
              `Ensure 'npm run dev' is running. Error: ${error.message}`
            );
          }
          throw error;
        }
      // Each request already carries its own 10s AbortSignal, but the default
      // per-test timeout is 5s — so a slow gateway failed the test before the
      // fetch could time out and report the useful error. The two must not
      // disagree; this one is the outer bound.
      }, 15_000);
    }
  });

  describe('Authenticated route patterns', () => {
    for (const endpoint of AUTHENTICATED_ENDPOINTS) {
      it(`${endpoint.method} ${endpoint.path} — ${endpoint.name} (should require auth, not 404)`, async () => {
        const url = `${BASE_URL}${endpoint.path}`;
        try {
          const response = await fetch(url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            body: endpoint.method !== 'GET' ? '{}' : undefined,
            signal: AbortSignal.timeout(10000),
          });

          // 401 = route exists but requires a JWT (correct)
          // 403 = route exists, role check failed (correct)
          // 200 = works without auth (unexpected but not a routing fault)
          // 503 = downstream service down (route exists in the gateway)
          // 404 = the route is missing, which is the fault this looks for
          expect(response.status).not.toBe(404);
        } catch (error: any) {
          if (error.cause?.code === 'ECONNREFUSED') {
            throw new Error(`API gateway not reachable at ${url}`);
          }
          throw error;
        }
      }, 15_000);
    }
  });
});
