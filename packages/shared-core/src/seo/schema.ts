/// KARTSEEK — JSON-LD Schema Markup Generator
/// Generates structured data for Google, Bing, AI engines, and voice assistants.
/// Covers all entity types: Organization, Product, Restaurant, Doctor, Pharmacy, Taxi, etc.

import { SOCIAL_URLS } from '@/lib/config/social-links';
import { SITE_URL } from './metadata';

// ─── Base Schema Types ──────────────────────────────────────────────────────

function wrapSchema(schema: Record<string, any>) {
  return { '@context': 'https://schema.org', ...schema };
}

// ─── Organization Schema (Global) ───────────────────────────────────────────

export function organizationSchema() {
  return wrapSchema({
    '@type': 'Organization',
    name: 'KARTSEEK',
    url: SITE_URL,
    // `/logo.png` was declared here and is not in `public/`. Google reports an
    // unfetchable Organization logo as a rich-result error and drops the
    // knowledge-panel image, so this points at an asset that is actually built.
    logo: `${SITE_URL}/apple-touch-icon.png`,
    description:
      'KARTSEEK is the ultimate super app for marketplace shopping, grocery delivery, food ordering, pharmacy, doctor appointments, and taxi booking.',
    // Shared with the footer's clickable icons — see lib/config/social-links.ts.
    sameAs: SOCIAL_URLS,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+974-4000-0000',
        contactType: 'customer service',
        availableLanguage: ['English', 'Arabic', 'Hindi'],
      },
    ],
    address: { '@type': 'PostalAddress', addressCountry: 'QA', addressLocality: 'Doha' },
    // One entry per market in COUNTRY_SUBDOMAINS. "India" appeared twice here;
    // a duplicate in areaServed is not merged, it is published as a repeated
    // claim about the same country.
    areaServed: [
      { '@type': 'Country', name: 'Qatar' },
      { '@type': 'Country', name: 'India' },
      { '@type': 'Country', name: 'United Arab Emirates' },
      { '@type': 'Country', name: 'Saudi Arabia' },
      { '@type': 'Country', name: 'Bahrain' },
      { '@type': 'Country', name: 'Kuwait' },
      { '@type': 'Country', name: 'Oman' },
      { '@type': 'Country', name: 'United Kingdom' },
      { '@type': 'Country', name: 'United States' },
    ],
  });
}

// ─── WebSite + SearchAction Schema ──────────────────────────────────────────

export function websiteSchema() {
  return wrapSchema({
    '@type': 'WebSite',
    name: 'KARTSEEK',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  });
}

// ─── Product Schema ─────────────────────────────────────────────────────────

interface ProductSchemaInput {
  name: string;
  description: string;
  slug: string;
  /** Every image the catalogue holds, primary first. A single URL also works. */
  image?: string | string[];
  price: number;
  currency: string;
  brand?: string;
  sku?: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  /**
   * Precise availability, when the caller knows it. Wins over `inStock`.
   * `LimitedAvailability` is what a "only 3 left" badge means to a crawler.
   */
  availability?: 'InStock' | 'OutOfStock' | 'LimitedAvailability' | 'PreOrder';
  /** The offer's condition; defaults to new, which is what unmarked offers are. */
  condition?: 'NewCondition' | 'RefurbishedCondition' | 'UsedCondition';
  /** How many sellers offer it — `offers` becomes an AggregateOffer when > 1. */
  offerCount?: number;
  /** The cheapest and dearest offer prices when several sellers compete. */
  lowPrice?: number;
  highPrice?: number;
  /** Product identifier for the merchant feed: a GTIN/EAN/UPC when the catalogue has one. */
  gtin?: string;
  category?: string;
  seller?: string;
  /**
   * Canonical URL for this product, when it does not live under
   * `/marketplace/product`. Grocery items are sold on their own route, and a
   * `Product` block whose `url` and `offers.url` point at a page that does not
   * exist is dropped by Google along with the rest of the markup.
   */
  url?: string;
}

export function productSchema(p: ProductSchemaInput) {
  const url = p.url || `${SITE_URL}/marketplace/product/${p.slug}`;
  // `/placeholder.jpg` was the fallback and is not in `public/`. Google drops a
  // Product result whose `image` cannot be fetched, so an absent image is
  // better stated as absent — the rest of the markup still qualifies.
  const images = (Array.isArray(p.image) ? p.image : [p.image]).filter(Boolean) as string[];

  return wrapSchema({
    '@type': 'Product',
    name: p.name,
    description: p.description,
    ...(images.length > 0 && { image: images }),
    url,
    // Only a real identifier. The slug used to stand in for a missing SKU,
    // which published a URL fragment as a merchant SKU.
    ...(p.sku && { sku: p.sku }),
    ...(p.gtin && { gtin: p.gtin }),
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    category: p.category,
    offers: (() => {
      const availability = p.availability ?? (p.inStock !== false ? 'InStock' : 'OutOfStock');
      const base = {
        priceCurrency: p.currency,
        availability: `https://schema.org/${availability}`,
        itemCondition: `https://schema.org/${p.condition ?? 'NewCondition'}`,
        seller: p.seller ? { '@type': 'Organization', name: p.seller } : undefined,
        url,
      };
      // Several sellers: the markup states the range, the page states the buy box.
      if ((p.offerCount ?? 0) > 1) {
        return {
          '@type': 'AggregateOffer',
          offerCount: p.offerCount,
          lowPrice: (p.lowPrice ?? p.price).toFixed(2),
          highPrice: (p.highPrice ?? p.price).toFixed(2),
          ...base,
        };
      }
      return {
        '@type': 'Offer',
        // A string with two decimals is what the Merchant feed spec asks for;
        // a float renders as "1299" and is read as a different price.
        price: p.price.toFixed(2),
        ...base,
      };
    })(),
    // Only when there is a real review behind it. `reviewCount: 0` alongside a
    // rating is rejected outright — Google reports "aggregateRating is missing
    // reviewCount" and discards the whole Product block with it.
    ...(p.rating &&
      p.rating > 0 &&
      (p.reviewCount ?? 0) > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: p.rating,
          reviewCount: p.reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
  });
}

// ─── Restaurant Schema ──────────────────────────────────────────────────────

interface RestaurantSchemaInput {
  name: string;
  description: string;
  slug: string;
  image?: string;
  cuisine?: string;
  city: string;
  address?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  openingHours?: string;
  lat?: number;
  lng?: number;
  menuItems?: { name: string; price: number; currency: string }[];
}

export function restaurantSchema(r: RestaurantSchemaInput) {
  return wrapSchema({
    '@type': 'Restaurant',
    name: r.name,
    description: r.description,
    image: r.image,
    url: `${SITE_URL}/restaurant/${r.slug}`,
    servesCuisine: r.cuisine,
    priceRange: r.priceRange || '$$',
    address: { '@type': 'PostalAddress', addressLocality: r.city, addressCountry: r.city },
    telephone: r.phone,
    openingHours: r.openingHours || 'Mo-Su 08:00-23:00',
    ...(r.lat &&
      r.lng && { geo: { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng } }),
    ...(r.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: r.rating,
        reviewCount: r.reviewCount || 0,
        bestRating: 5,
      },
    }),
    ...(r.menuItems && {
      hasMenu: {
        '@type': 'Menu',
        hasMenuSection: {
          '@type': 'MenuSection',
          name: 'Popular Items',
          hasMenuItem: r.menuItems.map((m) => ({
            '@type': 'MenuItem',
            name: m.name,
            offers: { '@type': 'Offer', price: m.price, priceCurrency: m.currency },
          })),
        },
      },
    }),
  });
}

// ─── Doctor / Physician Schema ──────────────────────────────────────────────

interface DoctorSchemaInput {
  name: string;
  speciality: string;
  slug: string;
  image?: string;
  city: string;
  hospital?: string;
  phone?: string;
  qualifications?: string[];
  rating?: number;
  reviewCount?: number;
  consultationFee?: number;
  currency?: string;
  availableOnline?: boolean;
}

export function doctorSchema(d: DoctorSchemaInput) {
  return wrapSchema({
    '@type': 'Physician',
    name: d.name,
    description: `${d.name} is a ${d.speciality} in ${d.city}${d.hospital ? ` at ${d.hospital}` : ''}. Book appointment online.`,
    image: d.image,
    url: `${SITE_URL}/doctor/${d.slug}`,
    medicalSpecialty: d.speciality,
    telephone: d.phone,
    address: { '@type': 'PostalAddress', addressLocality: d.city },
    ...(d.qualifications && {
      hasCredential: d.qualifications.map((q) => ({
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: q,
      })),
    }),
    ...(d.hospital && {
      worksFor: { '@type': 'MedicalOrganization', name: d.hospital, '@additionalType': 'Hospital' },
    }),
    ...(d.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: d.rating,
        reviewCount: d.reviewCount || 0,
        bestRating: 5,
      },
    }),
    ...(d.availableOnline && {
      availableService: { '@type': 'MedicalProcedure', name: 'Online Consultation' },
    }),
  });
}

// ─── Hospital / Medical Organization ────────────────────────────────────────

interface HospitalSchemaInput {
  name: string;
  slug: string;
  city: string;
  address?: string;
  phone?: string;
  image?: string;
  specialities?: string[];
  rating?: number;
  reviewCount?: number;
  lat?: number;
  lng?: number;
}

export function hospitalSchema(h: HospitalSchemaInput) {
  return wrapSchema({
    '@type': 'Hospital',
    name: h.name,
    url: `${SITE_URL}/doctor/hospital/${h.slug}`,
    image: h.image,
    address: { '@type': 'PostalAddress', addressLocality: h.city, streetAddress: h.address },
    telephone: h.phone,
    medicalSpecialty: h.specialities,
    ...(h.lat &&
      h.lng && { geo: { '@type': 'GeoCoordinates', latitude: h.lat, longitude: h.lng } }),
    ...(h.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: h.rating,
        reviewCount: h.reviewCount || 0,
        bestRating: 5,
      },
    }),
  });
}

// ─── Pharmacy Schema ────────────────────────────────────────────────────────

interface PharmacySchemaInput {
  name: string;
  slug: string;
  city: string;
  address?: string;
  phone?: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  deliveryAvailable?: boolean;
  lat?: number;
  lng?: number;
}

export function pharmacySchema(p: PharmacySchemaInput) {
  return wrapSchema({
    '@type': 'Pharmacy',
    name: p.name,
    url: `${SITE_URL}/pharmacy/store/${p.slug}`,
    image: p.image,
    address: { '@type': 'PostalAddress', addressLocality: p.city, streetAddress: p.address },
    telephone: p.phone,
    ...(p.lat &&
      p.lng && { geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng } }),
    ...(p.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: p.rating,
        reviewCount: p.reviewCount || 0,
        bestRating: 5,
      },
    }),
    ...(p.deliveryAvailable && {
      availableChannel: {
        '@type': 'ServiceChannel',
        serviceType: 'Home Delivery',
        name: 'Medicine Delivery',
      },
    }),
  });
}

// ─── Taxi / Transport Service Schema ────────────────────────────────────────

interface TaxiSchemaInput {
  city: string;
  countryName: string;
  baseFare?: number;
  currency?: string;
  vehicleTypes?: string[];
}

export function taxiServiceSchema(t: TaxiSchemaInput) {
  return wrapSchema({
    '@type': 'TaxiService',
    name: `KARTSEEK Taxi - ${t.city}`,
    description: `Book a taxi in ${t.city}, ${t.countryName}. Economy, premium, and SUV rides available.`,
    url: `${SITE_URL}/taxi`,
    provider: { '@type': 'Organization', name: 'KARTSEEK' },
    areaServed: { '@type': 'City', name: t.city },
    ...(t.baseFare && {
      offers: {
        '@type': 'Offer',
        price: t.baseFare,
        priceCurrency: t.currency || 'QAR',
        description: 'Starting fare',
      },
    }),
  });
}

// ─── Local Business (Grocery Store) ─────────────────────────────────────────

interface GroceryStoreSchemaInput {
  name: string;
  url: string;
  image?: string;
  logo?: string;
  telephone?: string;
  streetAddress?: string;
  city?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
}

/**
 * A `GroceryStore` — schema.org's own subtype of LocalBusiness.
 *
 * Every field is emitted only when the catalogue actually holds it. A local
 * business block that states an address, a phone number or a rating the page
 * cannot show is the kind of markup Google treats as spam, and the caller is
 * expected to skip this entirely for a store it could not resolve.
 */
export function groceryStoreSchema(s: GroceryStoreSchemaInput) {
  const hasGeo = Number.isFinite(s.latitude) && Number.isFinite(s.longitude);
  return wrapSchema({
    '@type': 'GroceryStore',
    name: s.name,
    url: s.url,
    ...(s.image && { image: s.image }),
    ...(s.logo && { logo: s.logo }),
    ...(s.telephone && { telephone: s.telephone }),
    ...(s.streetAddress && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: s.streetAddress,
        ...(s.city && { addressLocality: s.city }),
        ...(s.countryCode && { addressCountry: s.countryCode }),
      },
    }),
    ...(hasGeo && {
      geo: { '@type': 'GeoCoordinates', latitude: s.latitude, longitude: s.longitude },
    }),
    // Only with real orders behind it: a rating alongside `reviewCount: 0` makes
    // Google discard the whole block, not just the rating.
    ...((s.rating ?? 0) > 0 &&
      (s.reviewCount ?? 0) > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: s.rating,
          reviewCount: s.reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
  });
}

// ─── Breadcrumb Schema ──────────────────────────────────────────────────────

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return wrapSchema({
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  });
}

// ─── ItemList Schema (category, brand and landing listings) ─────────────────

export interface ItemListEntry {
  /** Product name as shown on the card. */
  name: string;
  /** Site-relative path, e.g. `/marketplace/product/abc`. */
  url: string;
  /** Absolute image URL. Omitted rather than guessed when the row has none. */
  image?: string;
  /** Payable price — the buy-box price, not the MRP. */
  price?: number;
  currency?: string;
  inStock?: boolean;
}

/**
 * `ItemList` for a page that lists products.
 *
 * Product-level JSON-LD reached only the product detail page, so every listing
 * — category, subcategory, brand, and the six landing pages — went to crawlers
 * as an untyped page of links. `ItemList` is what lets a listing be read as a
 * set of offers rather than prose, and it is the schema Google's merchant
 * listing guidance asks for on exactly these pages.
 *
 * Each entry carries a nested `Product` rather than a bare URL: a URL-only list
 * makes the crawler fetch every item to learn anything, and the price shown here
 * is already the one on the card.
 */
export function itemListSchema(items: ItemListEntry[], listName?: string) {
  return wrapSchema({
    '@type': 'ItemList',
    ...(listName ? { name: listName } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: item.name,
        url: `${SITE_URL}${item.url}`,
        ...(item.image ? { image: item.image } : {}),
        ...(item.price != null
          ? {
              offers: {
                '@type': 'Offer',
                price: item.price,
                priceCurrency: item.currency || 'INR',
                availability:
                  item.inStock === false
                    ? 'https://schema.org/OutOfStock'
                    : 'https://schema.org/InStock',
              },
            }
          : {}),
      },
    })),
  });
}

// ─── FAQ Schema (AEO / Featured Snippets) ───────────────────────────────────

export function faqSchema(questions: { question: string; answer: string }[]) {
  return wrapSchema({
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  });
}

// ─── Review Schema ──────────────────────────────────────────────────────────

export function reviewSchema(
  reviews: { author: string; rating: number; body: string; date: string }[],
) {
  return reviews.map((r) =>
    wrapSchema({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.body,
      datePublished: r.date,
    }),
  );
}

// ─── Script Tag Renderer ────────────────────────────────────────────────────

export function schemaToScript(schema: Record<string, any> | Record<string, any>[]): string {
  const schemas = Array.isArray(schema) ? schema : [schema];
  return schemas
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');
}

// ─── Medical Clinic Schema ──────────────────────────────────────────────────

interface MedicalClinicSchemaInput {
  name: string;
  slug: string;
  city: string;
  address?: string;
  phone?: string;
  image?: string;
  specialities?: string[];
  rating?: number;
  reviewCount?: number;
  lat?: number;
  lng?: number;
  doctors?: { name: string; speciality: string }[];
}

export function medicalClinicSchema(c: MedicalClinicSchemaInput) {
  return wrapSchema({
    '@type': 'MedicalClinic',
    name: c.name,
    url: `${SITE_URL}/doctor/clinic/${c.slug}`,
    image: c.image,
    address: { '@type': 'PostalAddress', addressLocality: c.city, streetAddress: c.address },
    telephone: c.phone,
    medicalSpecialty: c.specialities,
    ...(c.lat &&
      c.lng && { geo: { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } }),
    ...(c.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: c.rating,
        reviewCount: c.reviewCount || 0,
        bestRating: 5,
      },
    }),
    ...(c.doctors && {
      employee: c.doctors.map((d) => ({
        '@type': 'Physician',
        name: d.name,
        medicalSpecialty: d.speciality,
      })),
    }),
  });
}

// ─── Food Establishment Schema ──────────────────────────────────────────────

interface FoodEstablishmentSchemaInput {
  name: string;
  slug: string;
  city: string;
  address?: string;
  servesCuisine?: string[];
  image?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  acceptsReservations?: boolean;
  deliveryAvailable?: boolean;
}

export function foodEstablishmentSchema(f: FoodEstablishmentSchemaInput) {
  return wrapSchema({
    '@type': 'FoodEstablishment',
    name: f.name,
    url: `${SITE_URL}/restaurant/${f.slug}`,
    image: f.image,
    address: { '@type': 'PostalAddress', addressLocality: f.city, streetAddress: f.address },
    telephone: f.phone,
    servesCuisine: f.servesCuisine,
    priceRange: f.priceRange || '$$',
    acceptsReservations: f.acceptsReservations ?? true,
    ...(f.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: f.rating,
        reviewCount: f.reviewCount || 0,
        bestRating: 5,
      },
    }),
    ...(f.deliveryAvailable && {
      potentialAction: {
        '@type': 'OrderAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/restaurant/${f.slug}/order` },
      },
    }),
  });
}

// ─── Medical Business (Pharmacy) Schema ─────────────────────────────────────

interface MedicalBusinessSchemaInput {
  name: string;
  slug: string;
  city: string;
  address?: string;
  phone?: string;
  image?: string;
  services?: string[];
  rating?: number;
  reviewCount?: number;
  openingHours?: string;
  lat?: number;
  lng?: number;
}

export function medicalBusinessSchema(m: MedicalBusinessSchemaInput) {
  return wrapSchema({
    '@type': 'MedicalBusiness',
    name: m.name,
    url: `${SITE_URL}/pharmacy/store/${m.slug}`,
    image: m.image,
    address: { '@type': 'PostalAddress', addressLocality: m.city, streetAddress: m.address },
    telephone: m.phone,
    openingHours: m.openingHours,
    ...(m.lat &&
      m.lng && { geo: { '@type': 'GeoCoordinates', latitude: m.lat, longitude: m.lng } }),
    ...(m.services && {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Services',
        itemListElement: m.services.map((s) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: s },
        })),
      },
    }),
    ...(m.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: m.rating,
        reviewCount: m.reviewCount || 0,
        bestRating: 5,
      },
    }),
  });
}

// ─── Local Business (General Store) Schema ──────────────────────────────────

interface LocalBusinessSchemaInput {
  name: string;
  slug: string;
  city: string;
  address?: string;
  phone?: string;
  image?: string;
  type?: string;
  rating?: number;
  reviewCount?: number;
  lat?: number;
  lng?: number;
  priceRange?: string;
  /**
   * Site-relative path of the page this describes, e.g.
   * `/hotel-booking/hotel/abc`. Required in practice for anything that is not
   * literally at `/store/<slug>` — see the fallback below.
   */
  path?: string;
}

export function localBusinessSchema(b: LocalBusinessSchemaInput) {
  return wrapSchema({
    '@type': b.type || 'LocalBusiness',
    name: b.name,
    // `/store/<slug>` is not a route this app serves. It was the only URL this
    // helper could produce, so any caller would have published a `url` pointing
    // at a 404 — and a LocalBusiness whose `url` does not resolve is dropped
    // from rich results. `path` is the way to say where the page actually is.
    url: `${SITE_URL}${b.path ?? `/store/${b.slug}`}`,
    image: b.image,
    address: { '@type': 'PostalAddress', addressLocality: b.city, streetAddress: b.address },
    telephone: b.phone,
    priceRange: b.priceRange || '$$',
    ...(b.lat &&
      b.lng && { geo: { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lng } }),
    ...(b.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: b.rating,
        reviewCount: b.reviewCount || 0,
        bestRating: 5,
      },
    }),
  });
}

// ─── Service Schema (Taxi) ──────────────────────────────────────────────────

interface ServiceSchemaInput {
  name: string;
  description: string;
  city: string;
  provider?: string;
  serviceType?: string;
  areaServed?: string[];
}

export function serviceSchema(s: ServiceSchemaInput) {
  return wrapSchema({
    '@type': 'Service',
    name: s.name,
    description: s.description,
    serviceType: s.serviceType || 'Transportation',
    provider: { '@type': 'Organization', name: s.provider || 'KARTSEEK' },
    areaServed: s.areaServed?.map((a) => ({ '@type': 'City', name: a })) || [
      { '@type': 'City', name: s.city },
    ],
  });
}
