'use client';

import {
  useState, useEffect, useCallback, useRef,
  useMemo, useReducer, type RefObject,
} from 'react';

// ─── useLocalStorage ─────────────────────────────────────────────────────────

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const next = value instanceof Function ? value(stored) : value;
      setStored(next);
      localStorage.setItem(key, JSON.stringify(next));
    } catch (e) { console.warn('[useLocalStorage] set failed:', e); }
  }, [key, stored]);

  const remove = useCallback(() => {
    setStored(initialValue);
    localStorage.removeItem(key);
  }, [key, initialValue]);

  return [stored, setValue, remove] as const;
}

// ─── useSessionStorage ────────────────────────────────────────────────────────

export function useSessionStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const next = value instanceof Function ? value(stored) : value;
      setStored(next);
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch (e) { console.warn('[useSessionStorage] set failed:', e); }
  }, [key, stored]);

  return [stored, setValue] as const;
}

// ─── useDebounce ──────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── useThrottle ──────────────────────────────────────────────────────────────

export function useThrottle<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  const lastRef = useRef(0);
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRef.current >= ms) {
      lastRef.current = now;
      return fn(...args);
    }
  }, [fn, ms]) as T;
}

// ─── useClickOutside ─────────────────────────────────────────────────────────

export function useClickOutside<T extends HTMLElement>(
  callback: () => void,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [callback]);
  return ref;
}

// ─── useEscapeKey ────────────────────────────────────────────────────────────

export function useEscapeKey(callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') callback();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [callback, enabled]);
}

// ─── useMediaQuery ────────────────────────────────────────────────────────────

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Convenience breakpoint hooks (Tailwind defaults)
export const useIsMobile  = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet  = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

// ─── usePrevious ──────────────────────────────────────────────────────────────

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}

// ─── useToggle ────────────────────────────────────────────────────────────────

export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [state, setState] = useState(initial);
  const toggle = useCallback(() => setState(v => !v), []);
  return [state, toggle, setState];
}

// ─── useCountdown ─────────────────────────────────────────────────────────────

export function useCountdown(targetDate: Date | number) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const ms = new Date(targetDate).getTime() - Date.now();
    return Math.max(0, ms);
  });

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      const ms = new Date(targetDate).getTime() - Date.now();
      setTimeLeft(Math.max(0, ms));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate, timeLeft]);

  const hours   = Math.floor(timeLeft / 3_600_000);
  const minutes = Math.floor((timeLeft % 3_600_000) / 60_000);
  const seconds = Math.floor((timeLeft % 60_000) / 1_000);

  return {
    timeLeft, isDone: timeLeft === 0,
    hours, minutes, seconds,
    formatted: `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`,
  };
}

// ─── useScrollPosition ───────────────────────────────────────────────────────

export function useScrollPosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = () => setPos({ x: window.scrollX, y: window.scrollY });
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return pos;
}

// ─── useIntersectionObserver ─────────────────────────────────────────────────

export function useIntersectionObserver(
  options?: IntersectionObserverInit,
): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1, ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);

  return [ref, isVisible];
}

// ─── useCopyToClipboard ──────────────────────────────────────────────────────

export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetMs);
      return true;
    } catch {
      return false;
    }
  }, [resetMs]);
  return { copy, copied };
}

// ─── useAsync ────────────────────────────────────────────────────────────────

type AsyncState<T> =
  | { status: 'idle';    data: null;  error: null }
  | { status: 'loading'; data: null;  error: null }
  | { status: 'success'; data: T;     error: null }
  | { status: 'error';   data: null;  error: Error };

type AsyncAction<T> =
  | { type: 'RESET' }
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; data: T }
  | { type: 'ERROR';   error: Error };

function asyncReducer<T>(state: AsyncState<T>, action: AsyncAction<T>): AsyncState<T> {
  switch (action.type) {
    case 'RESET':   return { status: 'idle',    data: null,        error: null };
    case 'LOADING': return { status: 'loading', data: null,        error: null };
    case 'SUCCESS': return { status: 'success', data: action.data, error: null };
    case 'ERROR':   return { status: 'error',   data: null,        error: action.error };
  }
}

export function useAsync<T>() {
  const [state, dispatch] = useReducer(asyncReducer<T>, {
    status: 'idle', data: null, error: null,
  } as AsyncState<T>);

  const run = useCallback(async (promise: Promise<T>) => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await promise;
      dispatch({ type: 'SUCCESS', data });
      return data;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      dispatch({ type: 'ERROR', error });
      throw error;
    }
  }, []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    ...state,
    run, reset,
    isIdle:    state.status === 'idle',
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError:   state.status === 'error',
  };
}

// ─── useWindowSize ────────────────────────────────────────────────────────────

export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}

// ─── usePageVisibility ───────────────────────────────────────────────────────

export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );
  useEffect(() => {
    const handler = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
  return visible;
}

// ─── useCart (lightweight cart state) ────────────────────────────────────────

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  variantId?: string;
}

type CartAction =
  | { type: 'ADD';      item: CartItem }
  | { type: 'REMOVE';   id: string }
  | { type: 'UPDATE';   id: string; quantity: number }
  | { type: 'CLEAR' };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const existing = items.find(i => i.id === action.item.id && i.variantId === action.item.variantId);
      if (existing) {
        return items.map(i => i.id === action.item.id
          ? { ...i, quantity: i.quantity + action.item.quantity }
          : i
        );
      }
      return [...items, action.item];
    }
    case 'REMOVE':
      return items.filter(i => i.id !== action.id);
    case 'UPDATE':
      return action.quantity <= 0
        ? items.filter(i => i.id !== action.id)
        : items.map(i => i.id === action.id ? { ...i, quantity: action.quantity } : i);
    case 'CLEAR':
      return [];
    default:
      return items;
  }
}

export function useCart() {
  const [items, dispatch] = useReducer(cartReducer, []);

  const totals = useMemo(() => ({
    count:    items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
  }), [items]);

  const add    = (item: CartItem) => dispatch({ type: 'ADD', item });
  const remove = (id: string)     => dispatch({ type: 'REMOVE', id });
  const update = (id: string, quantity: number) => dispatch({ type: 'UPDATE', id, quantity });
  const clear  = ()               => dispatch({ type: 'CLEAR' });

  return { items, ...totals, add, remove, update, clear };
}
