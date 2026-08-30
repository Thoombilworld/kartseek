import { getBrands, type MarketplaceBrand } from '@/lib/api/marketplace';

/**
 * Turn a promo card into a link that actually resolves.
 *
 * Homepage brand cards come from two places and **neither supplies a usable
 * brand identifier**:
 *
 *  - The live `/marketplace/home` feed sets `brandPromos[*].id` to `bp-e1`,
 *    `bp-e2`, … — presentation ids that exist in no catalogue table. Since the
 *    homepage prefers the feed over the bundled data
 *    (`feed?.brandPromos?.electronics ?? BRAND_PROMOS.electronics`), this is the
 *    path most visitors hit.
 *  - The bundled `BRAND_PROMOS` fallback uses slugs, but 12 of its 27 entries
 *    name brands the catalogue does not carry (`loreal`, `zara`, `oneplus`,
 *    `whirlpool`, `fitbit`, `daikin`, `decathlon`, `hasbro`, `mac`,
 *    `forest-essentials`) or spell an existing one differently
 *    (`dyson-beauty` → `dyson`, `nike-sport` → `nike`).
 *
 * Both were previously masked: the brand page rendered fabricated content for
 * any unrecognised key, so a card that pointed nowhere still showed *a* store.
 * Now that the page 404s on an unknown brand — which is the correct behaviour —
 * these cards surface as "404 Page Not Found".
 *
 * The promos do carry a human `name` ("Apple", "Sony"), and that is resolvable.
 * So: match on name, fall back to a slugified name, fall back to the id if it
 * happens to be a real slug. A card that resolves to nothing is dropped by the
 * caller rather than rendered as a dead link.
 */

function slugify(value: string): string {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export interface BrandLookup {
  /** Slug to link to, or null when the catalogue has no such brand. */
  resolve: (promo: { id?: string; name?: string; slug?: string }) => string | null;
  /** False when the brand list could not be loaded at all. */
  isReady: boolean;
}

/** Build a lookup from the catalogue's brand list. */
export function buildBrandLookup(brands: MarketplaceBrand[] | null | undefined): BrandLookup {
  const rows = Array.isArray(brands) ? brands : [];
  const byName = new Map<string, string>();
  const slugs = new Set<string>();

  for (const b of rows) {
    if (!b?.slug) continue;
    slugs.add(String(b.slug).toLowerCase());
    if (b.name) byName.set(String(b.name).toLowerCase(), b.slug);
  }

  return {
    isReady: rows.length > 0,
    resolve(promo) {
      if (!promo) return null;

      // The feed now resolves promos server-side and ships a real `slug`, so
      // trust it when present — name matching stays as the path for the bundled
      // fallback and for any feed built before that change.
      const explicit = promo.slug ? String(promo.slug).toLowerCase() : '';
      if (explicit && slugs.has(explicit)) return explicit;

      const name = promo.name ? String(promo.name).toLowerCase() : '';

      // Name first: it is the only field the live feed supplies that maps onto
      // a real row.
      const byExactName = byName.get(name);
      if (byExactName) return byExactName;

      const slugFromName = name ? slugify(name) : '';
      if (slugFromName && slugs.has(slugFromName)) return slugFromName;

      // The bundled fallback's ids are slugs, so accept one that really exists.
      const id = promo.id ? String(promo.id).toLowerCase() : '';
      if (id && slugs.has(id)) return id;

      return null;
    },
  };
}

/** Fetch the brand list and build a lookup. Never throws. */
export async function loadBrandLookup(): Promise<BrandLookup> {
  try {
    const res: any = await getBrands();
    const rows: MarketplaceBrand[] = Array.isArray(res) ? res : (res?.data ?? res?.brands ?? []);
    return buildBrandLookup(rows);
  } catch {
    // Offline: `isReady` false tells callers to leave the cards alone rather
    // than hide every brand on the homepage because one request failed.
    return buildBrandLookup([]);
  }
}
