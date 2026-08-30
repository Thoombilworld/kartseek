import type { Metadata } from 'next';
import { cache } from 'react';
import { pharmacyApi } from '@/lib/api/pharmacy';
import { pharmacyMeta } from '@/lib/seo/metadata';
import { pharmacySchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';

/**
 * Per-pharmacy metadata and Pharmacy markup.
 *
 * A layout, because the page is a client component and cannot export metadata.
 *
 * The store is resolved from the API here and deliberately not reused from the
 * page, which reads a hardcoded `STORE_DATA` record and therefore renders a
 * complete licensed pharmacy — address, hours, licence number — for any id in
 * the URL. Publishing that as a title, a description and LocalBusiness markup
 * would put a fabricated pharmacy licence in Google's index, which is the most
 * consequential thing on this route to get wrong.
 *
 * `GET /pharmacy/stores/:id` answers `data: null` for an unknown id, so it is a
 * usable existence check — unlike the doctor and grocery-store endpoints, which
 * echo the id back with a fixture. A store the API confirms gets full markup;
 * anything else is withheld from the index rather than described, and starts
 * being indexed on its own once the directory has rows.
 */
const loadStore = cache(async (id: string) => {
  try {
    const res: any = await pharmacyApi.getStore(id);
    const store = res?.data ?? res ?? null;
    return store?.name ? store : null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const store = await loadStore(id);

  if (!store) {
    return {
      title: 'Pharmacy',
      description: 'Order medicines from verified pharmacies on KARTSEEK.',
      robots: { index: false, follow: true },
    };
  }

  return pharmacyMeta({
    name: store.name,
    slug: store.slug ?? id,
    city: store.city ?? store.address?.city ?? '',
    description: store.description ?? undefined,
    image: store.imageUrl ?? store.logoUrl ?? undefined,
  });
}

export default async function PharmacyStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await loadStore(id);

  return (
    <>
      {store && (
        <JsonLd
          data={pharmacySchema({
            name: store.name,
            slug: store.slug ?? id,
            city: store.city ?? store.address?.city ?? '',
            address: store.address?.line1 ?? store.addressLine1,
            phone: store.phone ?? store.contactNumber,
            image: store.imageUrl ?? store.logoUrl,
            rating: Number(store.rating) || undefined,
            reviewCount: Number(store.reviewCount) || undefined,
          })}
        />
      )}
      {children}
    </>
  );
}
