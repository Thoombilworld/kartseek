/**
 * KartseekClient — Shared HTTP client for KARTSEEK API Gateway.
 *
 * All MCP tools delegate HTTP calls to this single client, which handles:
 *  - Base URL resolution (from KARTSEEK_API_URL env var)
 *  - JWT Authorization header injection
 *  - Consistent JSON request/response handling
 *  - Error wrapping into human-readable MCP tool responses
 */

export interface RequestOptions {
  /** HTTP method — defaults to GET */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** URL path relative to the API base (e.g. "/marketplace/home") */
  path: string;
  /** JSON body for POST/PUT/PATCH */
  body?: Record<string, unknown>;
  /** Query string parameters */
  query?: Record<string, string | number | boolean | undefined>;
  /** Override the auth token for this single request */
  authToken?: string;
}

export class KartseekClient {
  private readonly baseUrl: string;
  private readonly defaultToken: string;

  constructor() {
    this.baseUrl = (
      process.env.KARTSEEK_API_URL || 'http://localhost:3001/api/v1'
    ).replace(/\/+$/, '');
    this.defaultToken = process.env.KARTSEEK_AUTH_TOKEN || '';
  }

  async request<T = unknown>(opts: RequestOptions): Promise<T> {
    const { method = 'GET', path, body, query, authToken } = opts;

    // Build URL with query params
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const token = authToken || this.defaultToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOpts: RequestInit = { method, headers };
    if (body && method !== 'GET') {
      fetchOpts.body = JSON.stringify(body);
    }

    const res = await fetch(url.toString(), fetchOpts);
    const text = await res.text();

    // Attempt JSON parse — some endpoints may return non-JSON
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as unknown as T;
    }

    if (!res.ok) {
      const msg =
        typeof data === 'object' && data !== null && 'message' in data
          ? (data as Record<string, unknown>).message
          : text;
      throw new Error(`API ${res.status}: ${msg}`);
    }

    return data;
  }
}
