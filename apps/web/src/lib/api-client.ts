import type { ApiResponse } from '@/lib/types/restaurant';
import type { Restaurant, MenuCategory, MenuItem, CartItem, Order, Booking } from '@/lib/types/restaurant';
import { getAuthToken } from '@/lib/auth-token';
import { API_BASE_URL } from '@/lib/config/api-base';

/**
 * @deprecated Prefer `api-endpoints.ts` for new code.
 * This client is kept for backward compatibility.
 * BASE_URL now correctly points to the NestJS API Gateway (port 3001).
 */
const BASE_URL = API_BASE_URL;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Was `localStorage.getItem('authToken')` — a key nothing has ever written,
  // so every call through this client went out unauthenticated. It stayed
  // invisible because the gateway runs `DEV_AUTH_BYPASS=true` in development.
  // `getAuthToken()` is the single accessor for the real key; see lib/auth-token.ts.
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    signal: options?.signal ?? AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ---------- Restaurant ----------
export const fetchRestaurants = () =>
  apiFetch<ApiResponse<Restaurant[]>>('/restaurants');

export const fetchRestaurantDetail = (slug: string) =>
  apiFetch<ApiResponse<Restaurant>>(`/restaurants/${slug}`);

// ---------- Menu ----------
export const fetchMenu = (slug: string) =>
  apiFetch<ApiResponse<{categories: MenuCategory[]; items: MenuItem[]}>>(`/restaurants/${slug}/menu`);

// ---------- Cart ----------
export const getCart = () =>
  apiFetch<ApiResponse<CartItem[]>>('/cart');

export const addToCart = (payload: { restaurantId: string; itemId: string; quantity: number }) =>
  apiFetch<ApiResponse<CartItem>>('/cart', { method: 'POST', body: JSON.stringify(payload) });

export const updateCartItem = (itemId: string, quantity: number) =>
  apiFetch<ApiResponse<CartItem>>(`/cart/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) });

export const removeCartItem = (itemId: string) =>
  apiFetch<ApiResponse<null>>(`/cart/${itemId}`, { method: 'DELETE' });

// ---------- Checkout ----------
export const checkout = (payload: { serviceMode: 'delivery' | 'takeaway' | 'dinein'; extra?: unknown }) =>
  apiFetch<ApiResponse<Order>>('/checkout', { method: 'POST', body: JSON.stringify(payload) });

// ---------- Booking ----------
export const createBooking = (payload: Omit<Booking, 'id' | 'status' | 'createdAt'>) =>
  apiFetch<ApiResponse<Booking>>('/bookings', { method: 'POST', body: JSON.stringify(payload) });

export default apiFetch;
