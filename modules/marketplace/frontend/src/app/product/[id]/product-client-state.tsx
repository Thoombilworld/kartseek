'use client';

import React, { useEffect, useState } from 'react';
import { GitCompare, Check } from 'lucide-react';

/**
 * Client-side product state that lives in the browser, not the API: the
 * recently-viewed trail and the compare tray.
 *
 * Both pages read these keys and neither was ever written — `/marketplace/recently-viewed`
 * was permanently empty, and `/marketplace/compare` shipped three hardcoded sample
 * products whose ids ('p1', 'p2', 'p3') are not in the catalogue, so every link
 * on it led to a 404. Recording the view here is what makes them real.
 */
export const RECENTLY_VIEWED_KEY = 'kartseek_recently_viewed';
export const COMPARE_KEY = 'kartseek_compare';

const MAX_RECENT = 20;
const MAX_COMPARE = 4;

export interface ViewedProduct {
  id: string; title: string; brand: string;
  price: number; mrp: number; rating: number;
  imageUrl?: string; viewedAt: number;
}

function readList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];   // corrupt or unavailable storage must not break the page
  }
}

function writeList(key: string, value: unknown[]) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota or private mode */ }
}

export function ProductClientState({ product }: { product: ViewedProduct }) {
  const [compared, setCompared] = useState(false);

  useEffect(() => {
    if (!product.id) return;

    // Most recent first, one entry per product, capped so storage cannot grow
    // without bound.
    const next = [
      { ...product, viewedAt: Date.now() },
      ...readList<ViewedProduct>(RECENTLY_VIEWED_KEY).filter(p => p?.id !== product.id),
    ].slice(0, MAX_RECENT);
    writeList(RECENTLY_VIEWED_KEY, next);

    setCompared(readList<ViewedProduct>(COMPARE_KEY).some(p => p?.id === product.id));
  }, [product]);

  const toggleCompare = () => {
    const current = readList<ViewedProduct>(COMPARE_KEY).filter(p => p?.id);
    if (current.some(p => p.id === product.id)) {
      writeList(COMPARE_KEY, current.filter(p => p.id !== product.id));
      setCompared(false);
      return;
    }
    // Comparison tables stop being readable past a handful of columns; drop the
    // oldest rather than refusing the click.
    writeList(COMPARE_KEY, [...current, product].slice(-MAX_COMPARE));
    setCompared(true);
  };

  if (!product.id) return null;

  return (
    <button
      onClick={toggleCompare}
      aria-pressed={compared}
      className={`mt-3 w-full flex items-center justify-center gap-2 rounded-sm py-2.5 text-sm font-bold border transition-colors ${
        compared
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600'
      }`}
    >
      {compared
        ? <><Check className="w-4 h-4" /> Added to Compare</>
        : <><GitCompare className="w-4 h-4" /> Add to Compare</>}
    </button>
  );
}
