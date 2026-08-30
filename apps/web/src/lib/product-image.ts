/**
 * Responsive sources for a product photo.
 *
 * Catalogue images are stored as a single URL at one fixed width (the seeded
 * ones are 600×600). Rendering that one file into every slot means a 600px JPEG
 * downloaded for a 150px phone card — slow — and the same 600px file stretched
 * across a 2× desktop card — soft. Both are why the grids never looked like
 * Amazon's, whose cards ship a width-matched file per breakpoint.
 *
 * Image CDNs take the width in the query string, so a `srcSet` can be derived
 * from the stored URL without a build step or an image service. URLs we don't
 * recognise are returned unchanged and simply render at their natural size —
 * never guess a transform a host doesn't implement, or every image 404s.
 */

/** Widths worth generating: the card is ~150–320 CSS px, so 1× and 2× of each. */
const CANDIDATE_WIDTHS = [200, 320, 480, 640, 800] as const;

/** Hosts whose `w`/`h`/`q` query parameters resize the returned image. */
const QUERY_RESIZE_HOSTS = [
  'images.unsplash.com',
  'plus.unsplash.com',
  'images.pexels.com',
  'cdn.shopify.com',
  'ik.imagekit.io',
];

function canResize(url: URL): boolean {
  if (QUERY_RESIZE_HOSTS.includes(url.hostname)) return true;
  // Any URL that already carries an explicit width is being served by something
  // that understands one.
  return url.searchParams.has('w') || url.searchParams.has('width');
}

function atWidth(url: URL, width: number): string {
  const next = new URL(url.toString());
  const key = next.searchParams.has('width') ? 'width' : 'w';
  next.searchParams.set(key, String(width));
  // Square crops are the catalogue convention; keep the aspect the stored URL
  // asked for rather than letting height drift out of proportion.
  if (next.searchParams.has('h')) next.searchParams.set('h', String(width));
  if (next.searchParams.has('height')) next.searchParams.set('height', String(width));
  if (!next.searchParams.has('q')) next.searchParams.set('q', '85');
  return next.toString();
}

export interface ProductImageSources {
  src: string;
  srcSet?: string;
}

/**
 * `src` + `srcSet` for a stored product image URL.
 *
 * `src` is a mid-sized candidate rather than the original: it is what browsers
 * without `srcSet` support and any crawler will fetch.
 */
export function productImageSources(imageUrl?: string): ProductImageSources | null {
  if (!imageUrl) return null;

  let url: URL;
  try {
    url = new URL(imageUrl, 'https://placeholder.invalid');
  } catch {
    return { src: imageUrl };
  }
  // Relative path — no host to negotiate a transform with.
  if (url.hostname === 'placeholder.invalid') return { src: imageUrl };
  if (!canResize(url)) return { src: imageUrl };

  return {
    src: atWidth(url, 480),
    srcSet: CANDIDATE_WIDTHS.map((w) => `${atWidth(url, w)} ${w}w`).join(', '),
  };
}

// The `sizes` presets moved to `THUMB_SIZES` in
// `components/marketplace/product-thumb.tsx`, next to the frame they describe —
// there is now one per grid density rather than a single 4-column assumption
// applied to 5-column grids and 144px list rows alike.

/**
 * Every image URL a catalogue row carries, primary first.
 *
 * The same product arrives in three shapes depending on which backend answered:
 * `images` is an array of `{ url, isPrimary, sortOrder }` rows over TCP, an
 * array of plain strings over gRPC, and older feed rows carry only
 * `metadata.imageGalleryUrls`. Every card grid had its own one-line version of
 * this that read `images[0].url` and stopped — which is why a product with six
 * photographs showed one, and why the one it showed was whichever row happened
 * to sort first rather than the one marked primary.
 */
export function productImageList(product: any): string[] {
  const rows: any[] = Array.isArray(product?.images) ? product.images : [];

  const ordered = [...rows].sort((a, b) => {
    // `isPrimary` outranks `sortOrder`: the seeded catalogue has primary images
    // sitting at sortOrder 0 alongside non-primary ones.
    const primary = Number(!!b?.isPrimary) - Number(!!a?.isPrimary);
    if (primary !== 0) return primary;
    return (Number(a?.sortOrder ?? 0) - Number(b?.sortOrder ?? 0));
  });

  const urls = [
    ...ordered.map((row) => (typeof row === 'string' ? row : row?.url ?? row?.imageUrl)),
    ...(Array.isArray(product?.metadata?.imageGalleryUrls) ? product.metadata.imageGalleryUrls : []),
    product?.imageUrl,
  ]
    .map((url) => (typeof url === 'string' ? url.trim() : ''))
    .filter(Boolean);

  return [...new Set(urls)];
}

/** `12400` → `12.4k`, the compact review count shoppers expect next to a rating. */
export function formatReviewCount(reviews: string | number | undefined): string {
  const n = typeof reviews === 'number' ? reviews : Number(String(reviews ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(Math.round(n));
}
