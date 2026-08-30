import type { Metadata } from 'next';
import { cache } from 'react';
import { groceryMeta, generateMetadata as buildMeta, SITE_URL } from '@/lib/seo/metadata';
import { breadcrumbSchema, groceryStoreSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';
import { API_BASE_URL } from '@/lib/config/api-base';
import { parseIdParam } from '@/lib/grocery/urls';

/**
 * Grocery store pages are indexable again.
 *
 * They were withheld for two reasons, both now resolved. `GET
 * /grocery/stores/:id` used to answer 200 for *every* id, echoing it back with a
 * hardcoded name, so there was no id it said no to and no way to tell a real
 * shop from a fabricated one — it now returns 404. And the page itself seeded
 * from an invented store built out of the URL slug (rating 4.5, "500+" reviews,
 * minimum order 199) and merely overlaid whatever came back — it now renders a
 * "Store not found" state instead.
 *
 * Resolution still decides indexing per request: a slug this loader cannot
 * resolve keeps `noindex` and emits no markup, so an outage never publishes a
 * local business — name, delivery area, rating — at a URL that has none.
 */

interface GroceryStore {
  id: string;
  name: string;
  slug?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  rating?: number | null;
  totalOrders?: number | null;
  storeTypes?: string[] | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  regionCode?: string | null;
  minOrderAmount?: string | number | null;
  deliveryFee?: string | number | null;
}

/** De-duplicated across `generateMetadata` and the layout body in one render. */
const loadStore = cache(async (id: string): Promise<GroceryStore | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/grocery/stores/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? json;
    return data?.id ? (data as GroceryStore) : null;
  } catch {
    // An unreachable catalogue and a missing shop both mean "do not index".
    return null;
  }
});

/** The city, from the address's last comma-separated part. */
function cityOf(store: GroceryStore): string {
  const parts = (store.address ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || '';
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: segment } = await params;
  const { id } = parseIdParam(segment);
  const store = id ? await loadStore(id) : null;

  if (!store) {
    return buildMeta({
      title: 'Grocery store',
      description: 'Order groceries from stores near you on KARTSEEK.',
      path: `/grocery/store/${segment}`,
      noIndex: true,
    });
  }

  return groceryMeta({
    name: store.name,
    slug: segment,
    city: cityOf(store),
    description: store.storeTypes?.length ? `${store.storeTypes.join(', ')}.` : undefined,
    image: store.bannerUrl ? `${SITE_URL}${store.bannerUrl}` : undefined,
  });
}

export default async function GroceryStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: segment } = await params;
  const { id } = parseIdParam(segment);
  const store = id ? await loadStore(id) : null;

  if (!store) return <>{children}</>;

  const url = `${SITE_URL}/grocery/store/${segment}`;
  const lat = Number(store.latitude);
  const lng = Number(store.longitude);
  const rating = Number(store.rating ?? 0);
  const orders = Number(store.totalOrders ?? 0);

  return (
    <>
      <JsonLd
        data={groceryStoreSchema({
          name: store.name,
          url,
          image: store.bannerUrl ? `${SITE_URL}${store.bannerUrl}` : undefined,
          logo: store.logoUrl ? `${SITE_URL}${store.logoUrl}` : undefined,
          telephone: store.phone ?? undefined,
          streetAddress: store.address ?? undefined,
          city: cityOf(store),
          countryCode: store.regionCode ?? undefined,
          latitude: Number.isFinite(lat) ? lat : undefined,
          longitude: Number.isFinite(lng) ? lng : undefined,
          rating,
          reviewCount: orders,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Grocery', url: `${SITE_URL}/grocery` },
          { name: 'Stores', url: `${SITE_URL}/grocery/stores` },
          { name: store.name, url },
        ])}
      />
      {children}
    </>
  );
}
