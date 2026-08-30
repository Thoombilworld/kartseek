import type { Metadata } from 'next';
import { cache } from 'react';
import { hotelApi } from '@/lib/api/hotel';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';
import { localBusinessSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';

/**
 * Per-hotel metadata and LocalBusiness markup.
 *
 * A layout, because the page is a client component and cannot export metadata.
 *
 * The hotel is resolved from the API here rather than reused from the page,
 * which renders a single hardcoded `HOTEL` object regardless of the id — so
 * every hotel id in existence currently resolves to the same property, with the
 * same rooms and the same rates. Indexing that would publish one fabricated
 * hotel at an unbounded number of URLs.
 *
 * `GET /hotels/:id` answers `data: null` for an unknown id, so it is a usable
 * existence check. A hotel the API confirms gets full markup; anything else is
 * withheld, and the route starts being indexed on its own once the inventory
 * has rows.
 */
const loadHotel = cache(async (hotelId: string) => {
  try {
    const res: any = await hotelApi.getHotel(hotelId);
    const hotel = res?.data ?? res ?? null;
    return hotel?.name ? hotel : null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ hotelId: string }> }): Promise<Metadata> {
  const { hotelId } = await params;
  const hotel = await loadHotel(hotelId);

  if (!hotel) {
    return {
      title: 'Hotel',
      description: 'Compare and book hotels at the best available rates on KARTSEEK.',
      robots: { index: false, follow: true },
    };
  }

  const city = hotel.city ?? hotel.address?.city ?? '';

  return buildMeta({
    title: `${hotel.name}${city ? ` - ${city}` : ''} | Book Online`,
    description:
      hotel.description?.trim() ||
      `Book ${hotel.name}${city ? ` in ${city}` : ''} on KARTSEEK. Compare rooms and rates, read verified reviews and reserve in a few taps.`,
    path: `/hotel-booking/hotel/${hotelId}`,
    image: hotel.imageUrl ?? hotel.coverImageUrl,
    imageAlt: `${hotel.name}${city ? ` — ${city}` : ''}`,
    type: 'place',
    keywords: [hotel.name, city, 'hotel booking', 'book hotel', 'KARTSEEK'].filter(Boolean),
    rating: Number(hotel.rating) ? { value: Number(hotel.rating), count: Number(hotel.reviewCount) || 0 } : undefined,
  });
}

export default async function HotelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;
  const hotel = await loadHotel(hotelId);

  return (
    <>
      {hotel && (
        <JsonLd
          data={localBusinessSchema({
            name: hotel.name,
            type: 'Hotel',
            slug: hotelId,
            path: `/hotel-booking/hotel/${hotelId}`,
            city: hotel.city ?? hotel.address?.city ?? '',
            address: hotel.address?.line1 ?? hotel.addressLine1,
            phone: hotel.phone ?? hotel.contactNumber,
            image: hotel.imageUrl ?? hotel.coverImageUrl,
            rating: Number(hotel.rating) || undefined,
            reviewCount: Number(hotel.reviewCount) || undefined,
          })}
        />
      )}
      {children}
    </>
  );
}
