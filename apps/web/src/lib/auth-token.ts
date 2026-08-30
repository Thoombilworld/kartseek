/**
 * The one place the session token's storage key is defined.
 *
 * This module exists because the key was previously written in one place and
 * read, by literal, in ten others — and two of those literals were wrong:
 *
 *   - `api-fetch.ts`      read `accessToken` / `token`
 *   - `api/admin-*.ts` ×8 read `adminToken`
 *
 * Nothing has ever written either name, so every call through those clients
 * went out with no `Authorization` header. It was invisible in development
 * because the gateway runs with `DEV_AUTH_BYPASS=true`, which admits requests
 * that carry no credentials; the failure only appears where the bypass is off,
 * which is production.
 *
 * Import `getAuthToken()` rather than reaching for `localStorage` directly, so
 * a future rename is one edit instead of eleven.
 */

/** Canonical localStorage key. `AuthProvider` is the only writer. */
export const AUTH_TOKEN_KEY = 'kartseek_token';

/** The current bearer token, or `null` when signed out or on the server. */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    // Storage can throw in private-browsing / blocked-cookie modes; treat an
    // unreadable store as signed out rather than breaking the caller.
    return null;
  }
}
