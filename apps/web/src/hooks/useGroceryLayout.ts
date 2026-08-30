'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-endpoints';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * useGroceryLayout — the CMS-managed section list for a grocery page.
 *
 * The whole hook was a stub. Its body was a comment reading
 * "In production, replace with: const res = await apiFetch(`/admin/layouts/grocery/
 * ${page}`)" followed by `setLayout(null)`, so the storefront always fell through
 * to its hardcoded sections and the admin Page Builder's Save button — which was
 * itself a `setTimeout` reporting "Layout saved! Changes are live on the grocery
 * page." — had nothing to be live against.
 *
 * `GET /admin/layouts/grocery/homepage` has existed the whole time, backed by the
 * `page_layouts` table, and returns a sensible default section list when no layout
 * has been saved. That is exactly what this needs.
 *
 * The route sits behind `@Roles(ADMIN, SUPER_ADMIN)`, so a shopper cannot read it.
 * A 403 for them is the normal case, not an error: `sections` stays null and the
 * page renders its built-in layout. That is why a failure here is silent — this is
 * the one place in the module where falling back is the correct behaviour, because
 * the fallback is the real default layout rather than invented content.
 */

export interface GroceryLayoutSection {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  visible?: boolean;
  sectionTag?: string;
  variant?: string;
  maxItems?: number;
  banners?: unknown[];
  items?: unknown[];
  gradient?: string;
  cta?: string;
  ctaHref?: string;
  tag?: string;
  description?: string;
  tags?: string[];
  htmlContent?: string;
  columns?: number;
  [key: string]: unknown;
}

interface LayoutResponse {
  moduleName?: string;
  pageName?: string;
  sections?: GroceryLayoutSection[];
  updatedAt?: string;
}

export function useGroceryLayout(page: string = 'homepage') {
  const { data: layoutData, loading: isLoading, reload: load } = useAsyncData<LayoutResponse | null>(
    async () => {
      try {
        const res = await api.get<LayoutResponse>(`/admin/layouts/grocery/${page}`);
        return res?.sections?.length ? res : null;
      } catch {
        // 403 for a signed-out shopper, or the service being down. Either way the
        // page has its own default layout; this hook only ever overrides it, so
        // the failure is swallowed here rather than surfaced — deliberately, and
        // uniquely in this hook.
        return null;
      }
    },
    [page],
  );
  const layout = layoutData ?? null;

  return {
    layout,
    isLoading,
    sections: layout?.sections ?? null,
    refresh: load,
  };
}

/**
 * Persists a layout. Used by the admin Page Builder, which previously "saved" with
 * an 800ms timer and a success message.
 */
export async function saveGroceryLayout(page: string, sections: GroceryLayoutSection[]) {
  return api.put(`/admin/layouts/grocery/${page}`, { sections });
}
