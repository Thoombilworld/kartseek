import type { Metadata } from 'next';
import { cache } from 'react';
import { productMeta, generateMetadata as buildMeta, SITE_URL } from '@/lib/seo/metadata';
import { productSchema, breadcrumbSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';
import { API_BASE_URL } from '@/lib/config/api-base';
import { parseIdParam } from '@/lib/grocery/urls';

/**
 * Grocery product pages are indexable again.
 *
 * They were withheld because the page synthesised a product from the URL — the
 * name came from the slug, the price defaulted to 199 — so any id at all
 * rendered a priced, in-stock item, and it set `document.title` from a client
 * effect, which bypasses the metadata system entirely. Both are gone: the route
 * resolves a real product by id and renders a "Product not found" state when the
 * catalogue does not have one.
 *
 * Indexing is still decided per request, not assumed. A product this loader
 * cannot resolve keeps `noindex`, so a 404 or an outage never publishes a title,
 * a price or `Product` markup for something that may not exist.
 */

interface GroceryProduct {
  id: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  isAvailable?: boolean;
  storeName?: string | null;
  weightVariants?: Array<{ weight?: string; price?: number; mrp?: number; stock?: number }>;
}

/**
 * `cache()` de-duplicates within a render: `generateMetadata` and the layout body
 * both need the product, and Next leaves `fetch` uncached by default, so without
 * it every product render hits the catalogue twice.
 */
const loadProduct = cache(async (id: string): Promise<GroceryProduct | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/grocery/products/${id}`, {
      // Prices and stock move; a stale card in a search result is worse than a
      // slightly slower render.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? json;
    return data?.id ? (data as GroceryProduct) : null;
  } catch {
    // Unreachable catalogue is indistinguishable from a missing product here,
    // and both must resolve to "do not index".
    return null;
  }
});

/** The variant a shopper lands on, which is the one the metadata should price. */
function firstVariant(p: GroceryProduct) {
  const v = Array.isArray(p.weightVariants) ? p.weightVariants[0] : undefined;
  return {
    weight: v?.weight ?? '',
    price: Number(v?.price ?? 0),
    stock: Number(v?.stock ?? 0),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: segment } = await params;
  // The route segment is `<store>-<product>-<uuid>`; only the uuid identifies it.
  const { id } = parseIdParam(segment);
  const product = id ? await loadProduct(id) : null;

  if (!product) {
    return buildMeta({
      title: 'Grocery product',
      description: 'Order groceries and daily essentials on KARTSEEK.',
      path: `/grocery/product/${segment}`,
      noIndex: true,
    });
  }

  const { price } = firstVariant(product);
  return productMeta({
    name: product.name,
    description: product.description?.trim() || '',
    slug: segment,
    // Grocery products live on their own route, not under /marketplace.
    path: `/grocery/product/${segment}`,
    image: product.imageUrl ? `${SITE_URL}${product.imageUrl}` : undefined,
    price: price || undefined,
    rating: product.rating ?? undefined,
    reviewCount: product.reviewCount ?? undefined,
    brand: product.brand ?? undefined,
    category: product.category ?? undefined,
  });
}

export default async function GroceryProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: segment } = await params;
  const { id } = parseIdParam(segment);
  const product = id ? await loadProduct(id) : null;

  // No product, no markup. Structured data naming an item Google cannot verify
  // on the page is treated as spam, and this is the case where it would be
  // describing something that does not exist.
  if (!product) return <>{children}</>;

  const { weight, price, stock } = firstVariant(product);
  const url = `${SITE_URL}/grocery/product/${segment}`;
  const categoryLabel = (product.category ?? '').replace(/-/g, ' ');

  return (
    <>
      <JsonLd
        data={productSchema({
          name: weight ? `${product.name} (${weight})` : product.name,
          description: product.description?.trim()
            || `${product.name}${product.brand ? ` by ${product.brand}` : ''}, sold by ${product.storeName ?? 'a KARTSEEK store'}.`,
          slug: segment,
          url,
          image: product.imageUrl ? `${SITE_URL}${product.imageUrl}` : undefined,
          price,
          // The catalogue is priced per market; QAR is the home market's code.
          currency: 'QAR',
          brand: product.brand ?? undefined,
          sku: product.id,
          rating: product.rating ?? undefined,
          reviewCount: product.reviewCount ?? undefined,
          inStock: (product.isAvailable ?? true) && stock > 0,
          category: categoryLabel || undefined,
          seller: product.storeName ?? undefined,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Grocery', url: `${SITE_URL}/grocery` },
          ...(product.category
            ? [{ name: categoryLabel, url: `${SITE_URL}/grocery/category/${product.category}` }]
            : []),
          { name: product.name, url },
        ])}
      />
      {children}
    </>
  );
}
