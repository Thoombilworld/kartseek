/**
 * The canonical product URL: `/marketplace/product/<slug>-<uuid>`.
 *
 * Product pages were addressed by bare uuid —
 * `/marketplace/product/d104fae6-e7f3-4a15-9154-fa365c78e4d0`. That is a URL
 * with no information in it: nothing for a search engine to match a query
 * against, nothing for a person to recognise in a shared link or a browser
 * history, and no clue what was lost when the link rots.
 *
 * Both halves earn their place:
 *
 *   • The **slug** carries the product's name into the URL, where Google reads
 *     it and a human can see what they are about to open.
 *   • The **uuid** keeps the URL resolvable forever. A slug is derived from the
 *     product name and names get edited; if the slug were the only key, every
 *     rename would break every existing link and index entry. With the uuid
 *     trailing, a stale slug still resolves — and the page redirects to the
 *     current spelling rather than serving two URLs for one product.
 *
 * Parsing is anchored on the uuid's fixed shape rather than on a separator,
 * because a slug legitimately contains dashes: `samsung-s24-ultra-256gb` plus a
 * uuid is not splittable on "the last dash".
 */

/** RFC-4122-shaped identifier, anchored to the end of the segment. */
const TRAILING_UUID =
  /^(?:(.+)-)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const BARE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Trim a name down to something safe and readable in a path segment.
 *
 * `NFKD` splits accented characters into a base letter plus a combining mark,
 * and the character class below then drops the marks — so "Crème Brûlée"
 * becomes `creme-brulee` rather than a percent-encoded mess.
 */
export function toProductSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    // Long enough to carry the product name, short enough to stay readable and
    // well inside any practical URL limit once the uuid is appended.
    .slice(0, 80)
    .replace(/-$/, '');
}

export interface ProductUrlInput {
  id: string;
  slug?: string | null;
  /** Used only when the catalogue has no slug stored. */
  name?: string | null;
  title?: string | null;
}

/**
 * The canonical path for a product.
 *
 * Falls back to the bare uuid when there is no slug and no name to derive one
 * from — a URL that resolves beats a URL that reads well, and a segment like
 * `-<uuid>` with an empty slug would be worse than either.
 */
export function productPath(product: ProductUrlInput | string | null | undefined): string {
  if (!product) return '/marketplace';
  if (typeof product === 'string') {
    // Already-built segment, or a bare id from a caller that has nothing else.
    return `/marketplace/product/${product}`;
  }

  const id = String(product.id ?? '').trim();
  if (!id) return '/marketplace';

  const stored = typeof product.slug === 'string' ? product.slug.trim() : '';
  const slug = stored
    ? toProductSlug(stored)
    : toProductSlug(String(product.name ?? product.title ?? ''));

  return slug ? `/marketplace/product/${slug}-${id}` : `/marketplace/product/${id}`;
}

/**
 * Split a `[id]` route parameter into the product id and the slug it carried.
 *
 * Returns `id: null` when the segment holds no uuid at all, which is how the
 * page distinguishes "look this up" from "this was never one of our URLs".
 */
export function parseProductParam(param: string | undefined | null): {
  id: string | null;
  slug: string | null;
} {
  const raw = decodeURIComponent(String(param ?? '')).trim();
  if (!raw) return { id: null, slug: null };

  if (BARE_UUID.test(raw)) return { id: raw, slug: null };

  const match = TRAILING_UUID.exec(raw);
  if (!match) return { id: null, slug: null };

  return { id: match[2], slug: match[1] ? match[1] : null };
}

/**
 * Whether the URL a visitor used is already the canonical one.
 *
 * False for a bare uuid (the legacy shape) and for a stale slug after a rename.
 * The page redirects in both cases so one product never occupies two indexable
 * URLs — the duplicate-content problem the canonical tag exists to prevent, and
 * which is better solved by not serving the duplicate at all.
 */
export function isCanonicalProductParam(param: string, product: ProductUrlInput): boolean {
  const canonical = productPath(product);
  return canonical === `/marketplace/product/${String(param ?? '').trim()}`;
}
