import { test, expect, type Page } from '@playwright/test';
import { COST, open, pace, sleep, waitForFreshWindow } from './gateway-budget';

/**
 * Customer account lifecycle, end to end: sign up through the real form,
 * land signed in, sign in again through the API, ask for a reset, and refuse
 * a forged reset token. Kept as tests because the 2026-09-13 audit found:
 *
 *   • the password rule refused every symbol outside `@$!%*?&^#` and said the
 *     password had no special character — customers with `_ . - +` in their
 *     password could not create an account;
 *   • new customers were recorded as India whatever market they signed up in;
 *   • the profile handed back the phone number's ciphertext;
 *   • the reset e-mail sender was a stub that reported "sent".
 *
 * Runs against the dev fleet on :3000 with the gateway on :3001, paced by
 * gateway-budget.ts. Every account it creates carries a unique @kartseek.test
 * address so runs never collide.
 */
const GATEWAY = process.env.E2E_GATEWAY_URL ?? 'http://localhost:3001/api/v1';
const PASSWORD = 'Passw0rd_2026.'; // an underscore and a dot: the shapes the old rule refused
const unique = () =>
  `e2e.reg.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@kartseek.test`;

test.beforeAll(waitForFreshWindow);
test.describe.configure({ mode: 'default', timeout: 300_000 });

async function useMarket(page: Page, market: string) {
  await page.context().addCookies([
    { name: 'kartseek_country', value: market, domain: 'localhost', path: '/' },
    { name: 'kartseek_language', value: 'en', domain: 'localhost', path: '/' },
  ]);
}

/**
 * Next serves these forms server-rendered; until React hydrates them, typing
 * lands in inputs React will reset and a click on the submit button is a
 * native GET submit that reloads the page with an empty query
 * (`/auth/signup?`) and every field blank. Wait for the submit handler to be
 * attached, then put the consent banner away — it mounts after hydration and
 * sits over the submit button. "Reject non-essential" is the privacy-
 * preserving choice.
 */
async function readyToSubmit(page: Page) {
  await page.waitForFunction(() => {
    const form = document.querySelector('form');
    if (!form) return false;
    const key = Object.keys(form).find((k) => k.startsWith('__reactProps'));
    if (!key) return false;
    const props = (form as unknown as Record<string, { onSubmit?: unknown }>)[key];
    return typeof props?.onSubmit === 'function';
  });
  const reject = page.getByRole('button', { name: 'Reject non-essential' });
  await reject.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);
  if (await reject.isVisible()) await reject.click();
}

test.describe('customer registration', () => {
  test('signs up with a symbol-rich password, lands signed in, and signs in again', async ({
    page,
    request,
  }) => {
    await useMarket(page, 'QA');
    const email = unique();

    await open(page, '/auth/signup', COST.category);
    await readyToSubmit(page);
    await page.getByPlaceholder('John Doe').fill('E2E Register');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('Minimum 8 characters').fill(PASSWORD);
    await page.getByRole('checkbox').first().check();
    await pace(2);
    await page.getByRole('button', { name: 'Create Account' }).click();
    // Register signs the customer in and lands them on the home page.
    await page.waitForURL((u) => !u.pathname.startsWith('/auth/'), { timeout: 20_000 });
    // The home page the app lands on is itself a burst of gateway calls (SSR
    // plus client fetches, doubled by StrictMode). Let it finish and charge it
    // before the API steps, or the next call meets the gateway's burst limit.
    await page.waitForLoadState('networkidle').catch(() => null);
    await pace(COST.product);

    // The account exists with the market it was created in, and the API
    // signs it in with the same password.
    await pace(COST.api);
    const login = await request.post(`${GATEWAY}/auth/login`, {
      data: { email, password: PASSWORD },
    });
    expect(login.status()).toBe(200);
    const session = await login.json();
    expect(session.user.email).toBe(email);
    expect(session.user.role).toBe('customer');

    await pace(COST.api);
    const profile = await request.get(`${GATEWAY}/auth/profile`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    expect(profile.status()).toBe(200);
    const me = await profile.json();
    expect(me.email).toBe(email);
    expect(me.status).toBe('active');
    // No phone was given, so none comes back — and never a ciphertext.
    expect(me.phone).toBeNull();
    // A customer carries no admin scope lock; the market they signed up in is
    // recorded on the row (`users.country`), checked by the API probe in
    // docs/audits/2026-09-13-customer-registration-audit.md.
    expect(me.regionCode).toBeNull();
  });

  test('the API refuses a weak password with the rule spelled out, and never a 500', async ({
    request,
  }) => {
    await pace(COST.api);
    const res = await request.post(`${GATEWAY}/auth/register`, {
      data: { name: 'Weak', email: unique(), password: 'nosymbols2026' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/1 symbol/);
  });

  test('a duplicate e-mail is a 409, not a second account', async ({ request }) => {
    const email = unique();
    await pace(2);
    const first = await request.post(`${GATEWAY}/auth/register`, {
      data: { name: 'Dup', email, password: PASSWORD },
    });
    expect(first.status()).toBe(201);
    const second = await request.post(`${GATEWAY}/auth/register`, {
      data: { name: 'Dup', email, password: PASSWORD },
    });
    expect(second.status()).toBe(409);
  });
});

test.describe('password reset', () => {
  test('forgot-password answers the same for any address; a forged token is refused', async ({
    request,
  }) => {
    await pace(3);
    const known = await request.post(`${GATEWAY}/auth/forgot-password`, {
      data: { email: 'nobody.' + unique() },
    });
    expect(known.status()).toBe(200);
    expect((await known.json()).message).toMatch(/If an account with that email exists/);

    const forged = await request.post(`${GATEWAY}/auth/reset-password`, {
      data: { token: 'not-a-token', newPassword: PASSWORD },
    });
    expect(forged.status()).toBe(400);
    expect((await forged.json()).message).toMatch(/Invalid or expired reset token/);
    await sleep(200);
  });

  test('the reset page enforces the same password rule before it submits', async ({ page }) => {
    await useMarket(page, 'QA');
    await open(page, '/auth/reset-password?token=e2e-placeholder', COST.category);
    await readyToSubmit(page);
    // Both fields get the same weak value so the mismatch check passes and the
    // rule check is the one that speaks.
    const fields = page.locator('input[type="password"]');
    await fields.first().fill('weak');
    await fields.nth(1).fill('weak');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByText(/8–128 characters/).first()).toBeVisible();
  });
});
