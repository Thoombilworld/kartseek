'use client';

import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useRef, ReactNode } from 'react';
import { getCart, addToCart, updateCartItem, removeFromCart } from '@/lib/api/marketplace';
import { useAuth } from '@/lib/contexts/auth-context';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  variantId?: string;
  brand?: string;
}

type CartAction =
  | { type: 'ADD';      item: CartItem }
  | { type: 'REMOVE';   id: string; variantId?: string }
  | { type: 'UPDATE';   id: string; variantId?: string; quantity: number }
  | { type: 'REPLACE';  items: CartItem[] }
  | { type: 'CLEAR' };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    // The server cart is authoritative: every mutation reconciles against what
    // came back, so an optimistic update that the API rejected cannot linger.
    case 'REPLACE':
      return action.items;
    case 'ADD': {
      const existing = items.find(i => i.id === action.item.id && i.variantId === action.item.variantId);
      if (existing) {
        return items.map(i => (i.id === action.item.id && i.variantId === action.item.variantId)
          ? { ...i, quantity: i.quantity + action.item.quantity }
          : i
        );
      }
      return [...items, action.item];
    }
    case 'REMOVE':
      return items.filter(i => !(i.id === action.id && i.variantId === action.variantId));
    case 'UPDATE':
      return action.quantity <= 0
        ? items.filter(i => !(i.id === action.id && i.variantId === action.variantId))
        : items.map(i => (i.id === action.id && i.variantId === action.variantId) ? { ...i, quantity: action.quantity } : i);
    case 'CLEAR':
      return [];
    default:
      return items;
  }
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: CartItem) => void;
  remove: (id: string, variantId?: string) => void;
  update: (id: string, quantity: number, variantId?: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Map a server cart line onto the shape the UI reads. Items are keyed by product id. */
function toCartItem(i: any): CartItem {
  return {
    id: String(i?.productId ?? i?.id ?? ''),
    name: i?.name ?? 'Product',
    price: Number(i?.price ?? 0) || 0,
    quantity: Number(i?.quantity ?? 1) || 1,
    imageUrl: i?.imageUrl,
    variantId: i?.variantId,
    brand: i?.brand,
  };
}

/**
 * Pull the cart out of an API response.
 *
 * GET returns `{ success, data: { items } }`, which the api client unwraps to the
 * cart itself; the mutations return `{ success, cart: { items } }`, which it does
 * not unwrap (no `data` key). Handle both rather than assuming one.
 */
function readServerCart(payload: any): CartItem[] | null {
  const cart = payload?.cart ?? payload?.data ?? payload;
  if (!Array.isArray(cart?.items)) return null;
  return cart.items.map(toCartItem).filter((i: CartItem) => i.id);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  // Every cart route on the gateway is behind JwtAuthGuard and takes its identity
  // from the token, never from the client — there is no guest cart to read or
  // write. Firing these calls without a session is not a soft failure: the
  // request is rejected, and the gateway logs an ERROR for it. Signed out, the
  // cart stays purely in memory and touches the network not at all.
  const { isAuthenticated } = useAuth();

  const totals = useMemo(() => ({
    count:    items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
  }), [items]);

  const applyServerCart = useCallback((payload: any) => {
    const next = readServerCart(payload);
    if (next) dispatch({ type: 'REPLACE', items: next });
  }, []);

  /** Server is the source of truth — used to undo an optimistic write that failed. */
  const resync = useCallback(async () => {
    if (!isAuthenticated) return;
    try { applyServerCart(await getCart()); } catch { /* offline — keep local state */ }
  }, [applyServerCart, isAuthenticated]);

  // ── Guest cart persistence ──────────────────────────────────────────────────
  // A signed-out cart lives only in this provider, so before this it did not
  // survive a refresh, a new tab, or a deep link: a shopper added three items,
  // reloaded, and the cart was empty with no explanation. There is no guest cart
  // on the server to fall back on — every gateway cart route is behind
  // JwtAuthGuard — so the browser has to be the store.
  //
  // Written under a versioned key so a future change to `CartItem` cannot
  // resurrect rows the reducer can no longer read.
  const GUEST_CART_KEY = 'kartseek_guest_cart_v1';
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || isAuthenticated) return;
    hydrated.current = true;
    try {
      const saved = localStorage.getItem(GUEST_CART_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      // Trust nothing from storage: a hand-edited entry must not be able to put
      // a NaN price or a missing id into the cart and on to checkout.
      const clean = Array.isArray(parsed)
        ? parsed.filter((i: any) => i && typeof i.id === 'string' && i.id
            && Number.isFinite(Number(i.price)) && Number(i.quantity) > 0)
            .map((i: any) => ({ ...i, price: Number(i.price), quantity: Number(i.quantity) }))
        : [];
      if (clean.length) dispatch({ type: 'REPLACE', items: clean });
    } catch { /* unreadable or disabled storage — start empty */ }
  }, [isAuthenticated]);

  // Mirror guest changes back to storage. Signed in, the server is the record
  // and this key would only go stale, so it is cleared.
  useEffect(() => {
    try {
      if (isAuthenticated) localStorage.removeItem(GUEST_CART_KEY);
      else if (hydrated.current) localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    } catch { /* quota or private mode — the in-memory cart still works */ }
  }, [items, isAuthenticated]);

  // Hydrate on sign-in. Without this the cart emptied on every navigation: this
  // provider used to be pure in-memory state, so the product page's Add to Cart
  // and Buy Now wrote to a store that nothing persisted and no other cart view
  // could see, while /marketplace/cart read the real server cart.
  //
  // Signing out drops the lines rather than leaving them on screen — they belong
  // to the account that just left, and the next person on this browser must not
  // inherit them. Anything a guest added is local-only and is replaced by the
  // server cart on sign-in; the gateway has no merge route to hand it to.
  const wasAuthenticated = useRef<boolean | null>(null);
  useEffect(() => {
    const previously = wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    if (isAuthenticated) { resync(); return; }
    // Clear only on a real sign-out (true → false). Clearing whenever
    // `isAuthenticated` is merely false would fire on first mount too — the
    // AuthProvider hydrates in an effect, so every page starts signed-out for a
    // tick — and would wipe the guest cart restored just above.
    if (previously === true) dispatch({ type: 'CLEAR' });
  }, [isAuthenticated, resync]);

  const add = useCallback((item: CartItem) => {
    dispatch({ type: 'ADD', item });                     // optimistic
    if (!isAuthenticated) return;
    addToCart(item.id, item.quantity, item.variantId)
      .then(applyServerCart)
      .catch(resync);
  }, [applyServerCart, resync, isAuthenticated]);

  const remove = useCallback((id: string, variantId?: string) => {
    dispatch({ type: 'REMOVE', id, variantId });
    if (!isAuthenticated) return;
    removeFromCart(id, variantId).then(applyServerCart).catch(resync);
  }, [applyServerCart, resync, isAuthenticated]);

  const update = useCallback((id: string, quantity: number, variantId?: string) => {
    dispatch({ type: 'UPDATE', id, quantity, variantId });
    if (!isAuthenticated) return;
    // The service treats a non-positive quantity as a removal, matching the reducer.
    updateCartItem(id, quantity, variantId).then(applyServerCart).catch(resync);
  }, [applyServerCart, resync, isAuthenticated]);

  const clear = useCallback(() => {
    const snapshot = items;
    dispatch({ type: 'CLEAR' });
    if (!isAuthenticated) return;
    // No clear-cart route exists on the gateway, so drop the lines individually.
    Promise.all(snapshot.map(i => removeFromCart(i.id, i.variantId).catch(() => null)))
      .then(resync)
      .catch(resync);
  }, [items, resync, isAuthenticated]);

  return (
    <CartContext.Provider value={{ items, ...totals, add, remove, update, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartContext must be used within CartProvider');
  return ctx;
}
