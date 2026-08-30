/**
 * apiFetch — thin `fetch` wrapper that targets the API Gateway.
 *
 * Exists so pages that were written against the old Next.js `/api/marketplace/*`
 * routes (backed by an in-memory demo store) can move to the real backend without
 * being rewritten around the typed `api` client in `api-endpoints.ts`: it keeps the
 * `Response` shape those pages already destructure with `await res.json()`.
 *
 * Prefer the typed `api` helper for new code. Use this when you need the raw
 * `Response` — streaming, non-JSON bodies, or manual status handling.
 */

import { regionHeaders } from './region-headers';
import { getAuthToken } from './auth-token';
import { API_BASE_URL } from './config/api-base';

const API_BASE = API_BASE_URL;

// Token access goes through the shared accessor — see `lib/auth-token.ts` for
// why the key must not be re-spelled here.
const getToken = getAuthToken;

/**
 * @param path Gateway path WITHOUT the `/api/v1` prefix, e.g. `/admin/marketplace/products`.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'X-Client-Platform': 'web',
      // Scopes the query to the region the customer is shopping in. Without it
      // the gateway falls back to IP geolocation of the egress address.
      ...regionHeaders(),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    credentials: 'include',
  });
}
