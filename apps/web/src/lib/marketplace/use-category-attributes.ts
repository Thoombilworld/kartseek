'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import type { CategoryAttribute, CategoryAttributeSchema } from './variant-display';

/**
 * The attribute schema for one category, as authored in the Super Admin panel.
 *
 * Deliberately the *same* endpoint the storefront reads, and deliberately
 * public: the seller portal, the customer site and the admin preview must
 * render one definition, or a colour an admin adds is a colour a seller cannot
 * list against. Before this, each surface carried its own bundled copy of the
 * category → attribute map, and the three had already drifted.
 *
 * A category with nothing configured is not an error — the caller falls back to
 * free-text axes, which is what a seller had before any of this existed.
 */
export function useCategoryAttributes(idOrSlug?: string | null) {
  const [schema, setSchema] = useState<CategoryAttributeSchema | null>(null);
  const [loading, setLoading] = useState(!!idOrSlug);

  useEffect(() => {
    if (!idOrSlug) { setSchema(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    apiFetch(`/marketplace/categories/${encodeURIComponent(idOrSlug)}/attributes`, {
      signal: AbortSignal.timeout(8000),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (!cancelled) setSchema(json ? (json.data ?? json) : null); })
      .catch(() => { if (!cancelled) setSchema(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [idOrSlug]);

  const axes: CategoryAttribute[] = (schema?.data ?? []).filter((a) => a.isVariantAxis);
  return { schema, axes, loading };
}
