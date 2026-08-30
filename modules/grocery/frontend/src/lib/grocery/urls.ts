/**
 * Readable URLs for grocery stores and products.
 *
 * Both routes took a bare uuid — `/grocery/store/126e8f9a-…`,
 * `/grocery/product/dea052b6-…`. That is unreadable to a shopper, carries no
 * keyword for a search engine, and tells you nothing when it turns up in a
 * shared link or an analytics report.
 *
 * The shape here puts the names in front of the id:
 *
 *   /grocery/store/lulu-hypermarket-126e8f9a-7b6f-4cb0-b5fd-13a6c96f2789
 *   /grocery/product/lulu-hypermarket-atlantic-salmon-fillet-dea052b6-…
 *
 * The id stays in the path on purpose. Names are not unique — two shops can
 * both stock "Atlantic Salmon Fillet" — and they change, while a uuid does not.
 * Resolving by name would need a unique index the schema does not have and
 * would break every shared link on the first rename. So the slug is decorative
 * and the uuid is the key: the backend looks up by uuid only, and never sees
 * the slug at all.
 *
 * Parsing anchors on the *trailing* uuid rather than splitting on hyphens,
 * because slugs contain hyphens too. A uuid is a fixed 36-character shape, so
 * matching it at the end is unambiguous no matter how many hyphens precede it.
 */

/** A uuid occupying the whole segment — the legacy shape, still resolvable. */
const BARE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `<slug>-<uuid>`, with the slug captured separately. */
const TRAILING_UUID =
  /^(.*?)-?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Trim a name down to something safe and readable in a path segment.
 *
 * `NFKD` splits accented characters into a base letter plus a combining mark,
 * and the character class then drops the marks — so "Crème Fraîche" becomes
 * `creme-fraiche` rather than a percent-encoded mess. Arabic product names
 * reduce to empty, which is why every caller falls back to the bare uuid rather
 * than emitting a dangling `-<uuid>`.
 */
export function toSlug(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-$/, '');
}

export interface StoreUrlInput {
  id: string;
  slug?: string | null;
  name?: string | null;
}

export interface ProductUrlInput {
  id: string;
  name?: string | null;
  /** The shop selling it, when the caller knows it. */
  storeName?: string | null;
  storeSlug?: string | null;
}

/** Canonical path for a store. */
export function storePath(store: StoreUrlInput | string | null | undefined): string {
  if (!store) return '/grocery/stores';
  if (typeof store === 'string') return `/grocery/store/${store}`;

  const id = String(store.id ?? '').trim();
  if (!id) return '/grocery/stores';

  const stored = typeof store.slug === 'string' ? store.slug.trim() : '';
  const slug = toSlug(stored || String(store.name ?? ''));
  return slug ? `/grocery/store/${slug}-${id}` : `/grocery/store/${id}`;
}

/**
 * Canonical path for a product, carrying the shop name where it is known.
 *
 * A caller that only has the product — a search result, a wishlist row — emits
 * `<product>-<uuid>`, which resolves identically. The product page redirects to
 * the fuller form once it has loaded the store, so the canonical URL converges
 * without every call site needing to join the two.
 */
export function productPath(product: ProductUrlInput | string | null | undefined): string {
  if (!product) return '/grocery';
  if (typeof product === 'string') return `/grocery/product/${product}`;

  const id = String(product.id ?? '').trim();
  if (!id) return '/grocery';

  const store = toSlug(String(product.storeSlug ?? product.storeName ?? ''));
  const name = toSlug(String(product.name ?? ''));
  const slug = [store, name].filter(Boolean).join('-');

  return slug ? `/grocery/product/${slug}-${id}` : `/grocery/product/${id}`;
}

/**
 * Split a route parameter into the uuid it carries and the slug in front of it.
 *
 * `id: null` means the segment held no uuid at all — the page treats that as
 * "this was never one of our URLs" and 404s rather than querying with garbage.
 */
export function parseIdParam(param: string | undefined | null): {
  id: string | null;
  slug: string | null;
} {
  let raw: string;
  try {
    raw = decodeURIComponent(String(param ?? '')).trim();
  } catch {
    // A malformed percent-escape throws; treat it as no match rather than
    // letting the exception reach the page.
    return { id: null, slug: null };
  }
  if (!raw) return { id: null, slug: null };

  if (BARE_UUID.test(raw)) return { id: raw, slug: null };

  const match = TRAILING_UUID.exec(raw);
  if (!match) return { id: null, slug: null };

  return { id: match[2], slug: match[1] || null };
}

/**
 * Whether the URL a visitor used is already the canonical one.
 *
 * False for a bare uuid and for a stale slug after a rename. The pages redirect
 * in both cases, so one product never occupies two indexable URLs — the
 * duplicate-content problem a canonical tag papers over and a redirect actually
 * solves.
 */
export function isCanonicalStoreParam(param: string, store: StoreUrlInput): boolean {
  return storePath(store) === `/grocery/store/${String(param ?? '').trim()}`;
}

export function isCanonicalProductParam(param: string, product: ProductUrlInput): boolean {
  return productPath(product) === `/grocery/product/${String(param ?? '').trim()}`;
}
