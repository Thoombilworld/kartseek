import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ─── Class Merging ────────────────────────────────────────────────────────────

/** Merge Tailwind CSS class names without conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Number Formatting ────────────────────────────────────────────────────────

/** Format a number as compact (e.g. 1,420 → 1.4K, 2,300,000 → 2.3M). */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** Format currency with symbol and compact notation. */
export function formatCurrency(amount: number, symbol = ''): string {
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `${symbol}${(amount / 1_000).toFixed(0)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

/** Calculate discount percentage. */
export function discountPct(mrp: number, price: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** Clamp a number between min and max. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// ─── String Utilities ─────────────────────────────────────────────────────────

/** Truncate a string to maxLen characters. */
export function truncate(str: string, maxLen: number, suffix = '…'): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - suffix.length) + suffix;
}

/** Convert a string to a URL-safe slug. */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Capitalise the first letter of each word. */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/** Mask a phone number: +91 712 *** 789 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return phone.slice(0, -6) + '***' + phone.slice(-3);
}

/** Mask an email: us***@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return local.slice(0, 2) + '***@' + domain;
}

// ─── Date / Time Utilities ────────────────────────────────────────────────────

/** Relative time: "2 minutes ago", "in 3 hours" */
export function relativeTime(date: Date | string | number): string {
  const ms  = new Date(date).getTime() - Date.now();
  const abs = Math.abs(ms);
  const past = ms < 0;

  const units: [number, string][] = [
    [60_000,       'minute'],
    [3_600_000,    'hour'],
    [86_400_000,   'day'],
    [604_800_000,  'week'],
    [2_592_000_000,'month'],
    [31_536_000_000,'year'],
  ];

  for (let i = 0; i < units.length; i++) {
    const [threshold, unit] = units[i];
    const next = units[i + 1]?.[0] ?? Infinity;
    if (abs < next) {
      const n = Math.round(abs / threshold);
      const label = `${n} ${unit}${n !== 1 ? 's' : ''}`;
      return past ? `${label} ago` : `in ${label}`;
    }
  }
  return 'just now';
}

/**
 * Coerce anything the API might hand us into a `Date`, or `null`.
 *
 * Every date on this site arrives as JSON, so a missing or renamed field yields
 * `undefined` and `new Date(undefined)` is an Invalid Date — which `Intl`
 * renders, quite happily, as the literal string "Invalid Date". That string was
 * printed on the order list, order detail and invoice pages because the API
 * calls the field `placedAt` and the pages read `createdAt`. Parsing through
 * one guard turns a renamed field into a visible dash instead of a visible bug.
 */
function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a date as "9 Jun 2026, 14:35". Returns `fallback` if unparseable. */
export function formatDateTime(
  date: Date | string | number | null | undefined,
  locale = 'en-IN',
  fallback = '—',
): string {
  const d = toDate(date);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

/** Format a date as "9 Jun 2026". Returns `fallback` if unparseable. */
export function formatDate(
  date: Date | string | number | null | undefined,
  locale = 'en-IN',
  fallback = '—',
): string {
  const d = toDate(date);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(d);
}

/** True when the value parses to a real calendar date. */
export function isValidDate(value: Date | string | number | null | undefined): boolean {
  return toDate(value) !== null;
}

// ─── Array / Object Utilities ─────────────────────────────────────────────────

/** Group an array by a key function. */
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    acc[k] = [...(acc[k] ?? []), item];
    return acc;
  }, {});
}

/** Pick specific keys from an object. */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc, k) => ({ ...acc, [k]: obj[k] }), {} as Pick<T, K>);
}

/** Omit specific keys from an object. */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(k => delete result[k]);
  return result as Omit<T, K>;
}

/** Deduplicate array by key. */
export function uniqueBy<T>(arr: T[], key: (item: T) => unknown): T[] {
  const seen = new Set();
  return arr.filter(item => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Chunk array into pages. */
export function chunk<T>(arr: T[], size: number): T[][] {
  return arr.reduce<T[][]>((chunks, item, i) => {
    const idx = Math.floor(i / size);
    chunks[idx] = [...(chunks[idx] ?? []), item];
    return chunks;
  }, []);
}

// ─── ID Utilities ─────────────────────────────────────────────────────────────

/** Generate a short unique ID (not cryptographic). */
export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── URL Utilities ────────────────────────────────────────────────────────────

/** Build a query string from an object, skipping undefined/null values. */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

/** Parse query string into a plain object. */
export function parseQueryString(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search));
}

// ─── DOM Utilities ────────────────────────────────────────────────────────────

/** Lock body scroll (for modals/drawers). */
export function lockScroll()   { document.body.style.overflow = 'hidden'; }
export function unlockScroll() { document.body.style.overflow = '';       }

/** Smooth scroll to element by ID. */
export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Validation Utilities ─────────────────────────────────────────────────────

export const validate = {
  email:   (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone:   (v: string) => /^\+?[\d\s\-().]{7,20}$/.test(v),
  url:     (v: string) => { try { new URL(v); return true; } catch { return false; } },
  notEmpty:(v: string) => v.trim().length > 0,
  minLen:  (v: string, n: number) => v.length >= n,
  maxLen:  (v: string, n: number) => v.length <= n,
  numeric: (v: string) => /^\d+(\.\d+)?$/.test(v),
};
