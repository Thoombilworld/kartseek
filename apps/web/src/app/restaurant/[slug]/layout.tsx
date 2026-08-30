import type { Metadata } from 'next';
import { cache } from 'react';
import { restaurantApi } from '@/lib/api/restaurant';
import { restaurantMeta } from '@/lib/seo/metadata';
import { restaurantSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';

/**
 * Per-restaurant metadata and Restaurant markup.
 *
 * A layout rather than a `generateMetadata` on the page, because the page is a
 * client component and a client component cannot export metadata. The layout is
 * a server component and receives the same `params`.
 *
 * The restaurant is resolved here, from the API, and **not** from the page's
 * data. The page renders `MOCK_RESTAURANTS.find(r => r.id === slug) ||
 * MOCK_RESTAURANTS[0]`, so every slug in existence — including nonsense ones —
 * renders the first fixture. Publishing a title, a description and Restaurant
 * structured data off that would tell Google that a named restaurant, with an
 * address and a rating, exists at every URL under this route. This resolves the
 * slug against the catalogue instead: a real row gets full markup, and anything
 * else is withheld from the index rather than described.
 *
 * Once the page itself is wired to `restaurantApi.getBySlug`, nothing here has
 * to change — these pages start being indexed the moment the catalogue answers.
 */
const loadRestaurant = cache(async (slug: string) => {
  try {
    const res: any = await restaurantApi.getBySlug(slug);
    return res?.data ?? res ?? null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await loadRestaurant(slug);

  if (!restaurant?.name) {
    return {
      title: 'Restaurant',
      description: 'Browse restaurants and order food delivery or dine-in on KARTSEEK.',
      robots: { index: false, follow: true },
    };
  }

  return restaurantMeta({
    name: restaurant.name,
    description: restaurant.description ?? '',
    slug: restaurant.slug ?? slug,
    city: restaurant.city ?? restaurant.address?.city ?? '',
    cuisine: Array.isArray(restaurant.cuisines) ? restaurant.cuisines.join(', ') : restaurant.cuisine,
    image: restaurant.imageUrl ?? restaurant.coverImageUrl,
    rating: Number(restaurant.rating) || undefined,
    reviewCount: Number(restaurant.reviewCount) || undefined,
  });
}

export default async function RestaurantDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await loadRestaurant(slug);

  return (
    <>
      {/* Emitted only for a restaurant the catalogue confirms. Structured data
          about a fixture is worse than none — Google treats markup that does
          not describe a real, visible entity as spam. */}
      {restaurant?.name && (
        <JsonLd
          data={restaurantSchema({
            name: restaurant.name,
            description: restaurant.description ?? '',
            slug: restaurant.slug ?? slug,
            image: restaurant.imageUrl ?? restaurant.coverImageUrl,
            cuisine: Array.isArray(restaurant.cuisines) ? restaurant.cuisines.join(', ') : restaurant.cuisine,
            city: restaurant.city ?? restaurant.address?.city ?? '',
            address: restaurant.address?.line1 ?? restaurant.addressLine1,
            phone: restaurant.phone ?? restaurant.contactNumber,
            rating: Number(restaurant.rating) || undefined,
            reviewCount: Number(restaurant.reviewCount) || undefined,
            priceRange: restaurant.priceRange,
          })}
        />
      )}
      {children}
    </>
  );
}
