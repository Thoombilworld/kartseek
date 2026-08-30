/// KARTSEEK — SEO Infrastructure
/// Centralized metadata generation, schema markup, and search optimization utilities.
/// Used across all 10+ web portals for consistent, dynamic SEO.
///
/// Features:
/// - Complete Open Graph tags (og:image:secure_url, og:image:width/height/alt, og:locale:alternate)
/// - Twitter/X cards (summary_large_image)
/// - hreflang alternates for 10 countries
/// - Dynamic OG image URL via /api/og route
/// - Facebook/WhatsApp/Instagram/Telegram/LinkedIn share compatibility
/// - Canonical URLs with country subdomains

import type { Metadata } from 'next';

// ─── Constants ───────────────────────────────────────────────────────────────

const SITE_NAME = 'KARTSEEK';

/**
 * Canonical origin. Overridable per deploy so a staging build does not publish
 * production URLs in its canonical, OG and hreflang tags — which is how a
 * staging host ends up competing with the real site in the index.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kartseek.com').replace(/\/$/, '');

const TWITTER_HANDLE = '@kartseekapp';
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export const COUNTRY_SUBDOMAINS: Record<string, string> = {
  QA: 'qa.kartseek.com', IN: 'in.kartseek.com', AE: 'ae.kartseek.com',
  SA: 'sa.kartseek.com', BH: 'bh.kartseek.com', KW: 'kw.kartseek.com',
  OM: 'om.kartseek.com', GB: 'uk.kartseek.com', US: 'us.kartseek.com'
};

/**
 * Locales the storefront actually serves. Kept in step with
 * `COUNTRY_SUBDOMAINS` above — `en_KE`/`sw_KE` used to sit in this list with no
 * matching subdomain, advertising a Kenyan storefront that does not exist.
 */
const LOCALE_ALTERNATES = [
  'en_QA', 'ar_QA', 'en_IN', 'hi_IN', 'en_AE', 'ar_AE',
  'ar_SA', 'en_SA', 'en_BH', 'ar_BH', 'en_KW', 'ar_KW',
  'en_OM', 'ar_OM', 'en_GB', 'en_US',
];

/** Trim to a clean sentence boundary; never append an ellipsis to a full one. */
export function clampDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

// ─── Dynamic OG Image URL Builder ───────────────────────────────────────────

export function ogImageUrl(params: {
  title: string;
  subtitle?: string;
  badge?: string;
  type?: string;
  price?: string;
  rating?: string;
  image?: string;
}): string {
  const query = new URLSearchParams({
    title: params.title.substring(0, 80),
    ...(params.subtitle && { subtitle: params.subtitle.substring(0, 60) }),
    ...(params.badge && { badge: params.badge }),
    ...(params.type && { type: params.type }),
    ...(params.price && { price: params.price }),
    ...(params.rating && { rating: params.rating }),
    ...(params.image && { image: params.image })
  });
  return `${SITE_URL}/api/og?${query.toString()}`;
}

// ─── Dynamic Meta Generator ─────────────────────────────────────────────────

interface SeoMetaOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article' | 'product' | 'profile' | 'place' | 'restaurant.restaurant';
  locale?: string;
  countryCode?: string;
  noIndex?: boolean;
  keywords?: string[];
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  price?: { amount: number; currency: string };
  rating?: { value: number; count: number };
}

/**
 * Next validates `openGraph.type` against the Open Graph object types it knows
 * how to render, and throws `Invalid OpenGraph type: <x>` for anything else —
 * at render time, aborting the whole metadata tree, so the page ships with no
 * title, no canonical and no card at all. `product`, `place` and
 * `restaurant.restaurant` are all in that rejected set, and the `as any` cast
 * this file used to carry meant TypeScript never said so.
 *
 * Those three degrade to `website`, which is what the type means to a social
 * scraper anyway. The precise entity — Product, Restaurant, Pharmacy — is
 * carried by the JSON-LD on each page, which is what Google actually reads.
 */
const OG_SUPPORTED_TYPES = new Set(['website', 'article', 'profile', 'book']);

function toOpenGraphType(type?: SeoMetaOptions['type']): 'website' | 'article' | 'profile' | 'book' {
  return type && OG_SUPPORTED_TYPES.has(type) ? (type as any) : 'website';
}

export function generateMetadata(opts: SeoMetaOptions): Metadata {
  const url = `${SITE_URL}${opts.path || ''}`;
  // `/og-image.jpg` used to be the fallback and has never existed in `public/`,
  // so every page without its own image advertised a 404 to Facebook, WhatsApp,
  // X and LinkedIn — which render a blank card rather than falling back. The
  // generator at /api/og always answers.
  const imageUrl = opts.image || ogImageUrl({ title: opts.title, subtitle: SITE_NAME, type: opts.type });
  const secureImageUrl = imageUrl.startsWith('http://') ? imageUrl.replace('http://', 'https://') : imageUrl;
  const imageAlt = opts.imageAlt || opts.title;

  // Build hreflang alternates
  const alternates: Record<string, string> = {};
  if (opts.path) {
    Object.entries(COUNTRY_SUBDOMAINS).forEach(([code, domain]) => {
      const locale = ['SA', 'QA', 'KW', 'OM', 'BH'].includes(code) ? 'ar' : 'en';
      alternates[`${locale}-${code}`] = `https://${domain}${opts.path}`;
    });
  }

  return {
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords,
    // `nofollow` alongside `noindex` also strips the page's outbound links from
    // discovery. A private page still sits on top of a public catalogue, so only
    // the page itself is withheld.
    robots: opts.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    alternates: {
      canonical: url,
      // `languages` needs at least one entry to be worth emitting; an empty
      // object renders nothing but is easy to mistake for configured hreflang.
      ...(Object.keys(alternates).length > 0 && { languages: alternates }),
    },
    // ── Complete Open Graph Tags ──────────────────────────────────────────
    // Compatible with: Facebook, WhatsApp, Instagram DM, Telegram, LinkedIn
    openGraph: {
      type: toOpenGraphType(opts.type),
      locale: opts.locale || 'en_US',
      url,
      siteName: SITE_NAME,
      title: opts.title,
      description: opts.description,
      images: [{
        url: secureImageUrl,
        secureUrl: secureImageUrl,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: imageAlt,
        type: 'image/jpeg'
      }],
      ...(opts.publishedTime && { publishedTime: opts.publishedTime }),
      ...(opts.modifiedTime && { modifiedTime: opts.modifiedTime })
    },
    // ── Twitter/X Card Tags ──────────────────────────────────────────────
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title: opts.title,
      description: opts.description,
      images: {
        url: secureImageUrl,
        alt: imageAlt
      }
    },
    // ── Additional Meta Tags ─────────────────────────────────────────────
    //
    // Deliberately thin. `og:image:secure_url`, `og:image:width`, `:height` and
    // `:alt` used to be repeated here on top of `openGraph.images`, which Next
    // already renders them from — so every page shipped each of those four tags
    // twice, and scrapers that read the first occurrence and scrapers that read
    // the last could disagree about the same page.
    other: {
      'telegram:channel': '@kartseek',
      // Price and availability for the platforms that read them off a share —
      // `price` and `rating` were accepted by this function and then dropped on
      // the floor, so a shared product link carried no price anywhere.
      ...(opts.price && {
        'product:price:amount': opts.price.amount.toFixed(2),
        'product:price:currency': opts.price.currency,
      }),
      // One repeated `og:locale:alternate`, which is what the protocol defines.
      // These were emitted as `og:locale:alternate:en_QA`, `…:ar_QA` and so on —
      // seventeen property names Open Graph has no concept of, which every
      // consumer discarded.
      'og:locale:alternate': LOCALE_ALTERNATES,
      // An empty `fb:app_id` is not the same as no `fb:app_id`: the Sharing
      // Debugger reports the blank value as a misconfiguration.
      ...(process.env.NEXT_PUBLIC_FB_APP_ID && { 'fb:app_id': process.env.NEXT_PUBLIC_FB_APP_ID }),
    }
  };
}

// ─── Page-Specific Meta Generators ──────────────────────────────────────────

export function productMeta(product: {
  name: string; description: string; slug: string; image?: string;
  price?: number; currency?: string; rating?: number; reviewCount?: number;
  brand?: string; category?: string;
  /**
   * Canonical path, when the product is not sold under `/marketplace/product`.
   * Grocery items have their own route, and pointing their canonical at a
   * marketplace URL that 404s de-indexes the page it was meant to consolidate.
   */
  path?: string;
}) {
  const ogImage = ogImageUrl({
    title: product.name,
    subtitle: product.brand ? `by ${product.brand}` : 'KARTSEEK Marketplace',
    badge: product.category || 'Product',
    type: 'product',
    price: product.price ? `${product.currency || 'QAR'} ${product.price}` : undefined,
    rating: product.rating ? `${product.rating}` : undefined
  });

  // Falls back to something specific rather than to nothing: a product row with
  // an empty description is common in a young catalogue, and an empty
  // `<meta name="description">` is treated as a missing one.
  const description = product.description?.trim()
    ? clampDescription(product.description)
    : clampDescription(
        `Buy ${product.name}${product.brand ? ` from ${product.brand}` : ''} on KARTSEEK. ` +
        `${product.price ? `${product.currency || 'QAR'} ${product.price}. ` : ''}Genuine products, secure payment and fast delivery.`,
      );

  return generateMetadata({
    title: `${product.name}${product.brand ? ` by ${product.brand}` : ''} - Buy Online`,
    description,
    // The detail route resolves a product id, not a name-slug. Building the
    // canonical from a slug pointed every product's canonical at a URL that
    // 404s, which drops the page from the index outright.
    path: product.path || `/marketplace/product/${product.slug}`,
    // The product's own photograph outranks the generated card: a real shopper
    // sharing a link expects to see the product, not a title on a gradient.
    image: product.image || ogImage,
    imageAlt: `${product.name} - Buy on KARTSEEK`,
    type: 'product',
    keywords: [product.name, product.brand || '', product.category || '', 'buy online', 'best price', 'KARTSEEK'].filter(Boolean),
    price: product.price ? { amount: product.price, currency: product.currency || 'QAR' } : undefined,
    rating: product.rating ? { value: product.rating, count: product.reviewCount || 0 } : undefined
  });
}

export function restaurantMeta(restaurant: {
  name: string; description: string; slug: string; city: string;
  cuisine?: string; image?: string; rating?: number; reviewCount?: number;
}) {
  const ogImage = ogImageUrl({
    title: restaurant.name,
    subtitle: `${restaurant.cuisine || 'Multi-cuisine'} · ${restaurant.city}`,
    badge: 'Restaurant',
    type: 'restaurant',
    rating: restaurant.rating ? `${restaurant.rating}` : undefined
  });

  return generateMetadata({
    title: `${restaurant.name} - ${restaurant.city} | Order Food Online`,
    description: `Order from ${restaurant.name} in ${restaurant.city}. ${restaurant.cuisine || 'Multi-cuisine'} restaurant. ${restaurant.description.substring(0, 100)}`,
    path: `/restaurant/${restaurant.slug}`,
    image: restaurant.image || ogImage,
    imageAlt: `${restaurant.name} - ${restaurant.city} - Order on KARTSEEK`,
    type: 'restaurant.restaurant',
    keywords: [restaurant.name, restaurant.city, restaurant.cuisine || '', 'food delivery', 'order online', 'dine-in', 'table booking'].filter(Boolean),
    rating: restaurant.rating ? { value: restaurant.rating, count: restaurant.reviewCount || 0 } : undefined
  });
}

export function doctorMeta(doctor: {
  name: string; speciality: string; slug: string; city: string;
  hospital?: string; image?: string; rating?: number; reviewCount?: number;
}) {
  const ogImage = ogImageUrl({
    title: doctor.name,
    subtitle: `${doctor.speciality} · ${doctor.city}`,
    badge: doctor.hospital || 'Doctor',
    type: 'doctor',
    rating: doctor.rating ? `${doctor.rating}` : undefined
  });

  return generateMetadata({
    title: `${doctor.name} - ${doctor.speciality} in ${doctor.city} | Book Appointment`,
    description: `Book an appointment with ${doctor.name}, ${doctor.speciality} at ${doctor.hospital || doctor.city}. Online consultation available. Verified reviews.`,
    path: `/doctor/profile/${doctor.slug}`,
    image: doctor.image || ogImage,
    imageAlt: `Dr. ${doctor.name} - ${doctor.speciality}`,
    type: 'profile',
    keywords: [doctor.name, doctor.speciality, doctor.city, 'doctor appointment', 'book online', 'consultation'].filter(Boolean),
    rating: doctor.rating ? { value: doctor.rating, count: doctor.reviewCount || 0 } : undefined
  });
}

export function pharmacyMeta(pharmacy: {
  name: string; slug: string; city: string; description?: string; image?: string;
}) {
  const ogImage = ogImageUrl({
    title: pharmacy.name,
    subtitle: `Pharmacy · ${pharmacy.city}`,
    badge: 'Medicine Delivery',
    type: 'pharmacy'
  });

  return generateMetadata({
    title: `${pharmacy.name} - ${pharmacy.city} | Medicine Delivery`,
    description: `Order medicines from ${pharmacy.name} in ${pharmacy.city}. ${pharmacy.description || 'Fast delivery, verified medicines, prescription upload.'}`,
    path: `/pharmacy/store/${pharmacy.slug}`,
    image: pharmacy.image || ogImage,
    imageAlt: `${pharmacy.name} - Pharmacy in ${pharmacy.city}`,
    type: 'place',
    keywords: [pharmacy.name, pharmacy.city, 'pharmacy', 'medicine delivery', 'prescription upload', 'online pharmacy']
  });
}

export function groceryMeta(store: {
  name: string; slug: string; city: string; description?: string; image?: string;
}) {
  const ogImage = ogImageUrl({
    title: store.name,
    subtitle: `Grocery Store · ${store.city}`,
    badge: 'Grocery Delivery',
    type: 'grocery'
  });

  return generateMetadata({
    title: `${store.name} - ${store.city} | Grocery Delivery`,
    description: `Shop groceries from ${store.name} in ${store.city}. ${store.description || 'Fresh produce, daily essentials, and more delivered to your door.'}`,
    path: `/grocery/store/${store.slug}`,
    image: store.image || ogImage,
    imageAlt: `${store.name} - Grocery Store in ${store.city}`,
    type: 'place',
    keywords: [store.name, store.city, 'grocery delivery', 'online grocery', 'fresh produce', 'supermarket']
  });
}

export function categoryMeta(category: {
  name: string; slug: string; count?: number; description?: string;
}) {
  const ogImage = ogImageUrl({
    title: category.name,
    subtitle: category.count ? `${category.count} products` : 'KARTSEEK Marketplace',
    badge: 'Category',
    type: 'category'
  });

  // `Browse ${count || ''} products` rendered as "Browse  products" — two
  // spaces and a missing number — for every category whose count is unknown,
  // which is the common case. State the count only when there is one.
  const count = category.count && category.count > 0 ? `${category.count} ` : '';

  return generateMetadata({
    title: `${category.name} - Shop Online`,
    description: category.description?.trim()
      ? clampDescription(category.description)
      : `Browse ${count}products in ${category.name}. Best prices, fast delivery and genuine products on KARTSEEK.`,
    path: `/marketplace/category/${category.slug}`,
    image: ogImage,
    keywords: [category.name, 'buy online', 'best price', 'KARTSEEK', 'shop']
  });
}

export function brandMeta(brand: {
  name: string; slug: string; productCount?: number; description?: string; logo?: string;
}) {
  const count = brand.productCount && brand.productCount > 0 ? `${brand.productCount} ` : '';

  return generateMetadata({
    title: `${brand.name} Products - Shop Online`,
    description: brand.description?.trim()
      ? clampDescription(brand.description)
      : `Browse ${count}${brand.name} products. Genuine products, best prices and fast delivery on KARTSEEK.`,
    path: `/marketplace/brand/${brand.slug}`,
    image: brand.logo,
    keywords: [brand.name, 'brand', 'buy online', 'genuine products', 'KARTSEEK']
  });
}

export function taxiMeta(city: string, type?: 'airport' | 'intercity') {
  const titleMap: Record<string, string> = {
    airport: `Airport Transfer in ${city} - Book Taxi`,
    intercity: `Intercity Taxi from ${city} - Book Ride`
  };

  return generateMetadata({
    title: titleMap[type || ''] || `Taxi Booking in ${city}`,
    description: `Book a taxi in ${city}. Economy, premium, SUV rides available. Transparent pricing, verified drivers, real-time tracking on KARTSEEK.`,
    path: type === 'airport' ? `/taxi/airport-transfer/${toSlug(city)}` : `/taxi/${toSlug(city)}`,
    keywords: [city, 'taxi', 'ride booking', type === 'airport' ? 'airport transfer' : 'city ride', 'KARTSEEK'].filter(Boolean)
  });
}

export function cityMeta(city: string, service: string, countryCode?: string) {
  const serviceMap: Record<string, { title: string; desc: string }> = {
    restaurants: { title: `Best Restaurants in ${city}`, desc: `Discover top-rated restaurants in ${city}. Order food delivery or dine-in. Browse menus, reviews, and offers.` },
    pharmacies: { title: `Pharmacies in ${city}`, desc: `Find pharmacies near you in ${city}. Order medicines online with home delivery. Upload prescriptions easily.` },
    doctors: { title: `Doctors in ${city}`, desc: `Book doctor appointments in ${city}. Find specialists, view profiles, read reviews. Online consultation available.` },
    taxi: { title: `Taxi Booking in ${city}`, desc: `Book a taxi in ${city}. Economy, premium, SUV rides available. Transparent pricing, verified drivers.` },
    'grocery-stores': { title: `Grocery Stores in ${city}`, desc: `Order groceries in ${city}. Fresh produce, daily essentials, household items delivered fast.` }
  };

  const s = serviceMap[service] || { title: `${service} in ${city}`, desc: `Find ${service} services in ${city} on KARTSEEK.` };
  const ogImage = ogImageUrl({ title: s.title, subtitle: 'KARTSEEK', badge: city, type: 'city' });

  return generateMetadata({
    title: s.title,
    description: s.desc,
    path: `/${city.toLowerCase().replace(/\s+/g, '-')}/${service}`,
    image: ogImage,
    keywords: [city, service, 'near me', 'KARTSEEK', countryCode || ''].filter(Boolean),
    countryCode
  });
}

// ─── Module Landing Page Metadata ───────────────────────────────────────────

export function moduleMeta(module: string) {
  const modules: Record<string, { title: string; description: string; keywords: string[] }> = {
    marketplace: { title: 'Online Marketplace - Shop Electronics, Fashion, Home & More', description: 'Shop from thousands of verified sellers on KARTSEEK Marketplace. Electronics, fashion, home & kitchen, beauty, and more with fast delivery and secure payments.', keywords: ['online shopping', 'marketplace', 'buy online', 'best prices'] },
    grocery: { title: 'Grocery Delivery - Fresh Produce & Daily Essentials', description: 'Order groceries online from local stores. Fresh produce, dairy, meat, snacks, and household essentials delivered to your door in under 60 minutes.', keywords: ['grocery delivery', 'online grocery', 'fresh produce', 'supermarket'] },
    restaurant: { title: 'Food Delivery & Restaurant Ordering', description: 'Order food from the best restaurants near you. Delivery, takeaway, and dine-in options. Browse menus, read reviews, and track your order in real-time.', keywords: ['food delivery', 'restaurant', 'order food', 'dine-in', 'takeaway'] },
    pharmacy: { title: 'Online Pharmacy - Medicine Delivery & Prescriptions', description: 'Order medicines online with prescription upload. Verified pharmacies, fast delivery, OTC medicines, health products, and wellness essentials.', keywords: ['online pharmacy', 'medicine delivery', 'prescription upload', 'health products'] },
    doctor: { title: 'Doctor Appointments - Book Online Consultations', description: 'Book doctor appointments online. Browse specialists, read patient reviews, and schedule in-person or video consultations across 30+ specialities.', keywords: ['doctor appointment', 'online consultation', 'specialist', 'book doctor'] },
    taxi: { title: 'Taxi Booking - Book a Ride', description: 'Book a taxi with transparent pricing, verified drivers, and real-time tracking. Economy, premium, SUV, and bike rides available.', keywords: ['taxi booking', 'ride booking', 'cab', 'airport transfer'] },
    'hotel-booking': { title: 'Hotel Booking - Find & Book the Best Stays', description: 'Discover and book hotels, resorts, and vacation stays at the best prices. Compare rooms, read reviews, and enjoy exclusive deals on KARTSEEK.', keywords: ['hotel booking', 'book hotel', 'resort', 'vacation stay', 'best hotel deals'] }
  };

  const m = modules[module] || { title: module, description: '', keywords: [] };
  const ogImage = ogImageUrl({ title: m.title.split(' - ')[0], subtitle: 'KARTSEEK', type: module });

  return generateMetadata({
    title: m.title,
    description: m.description,
    path: `/${module}`,
    image: ogImage,
    keywords: [...m.keywords, 'KARTSEEK']
  });
}

// ─── URL Slug Generator ─────────────────────────────────────────────────────

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ─── Breadcrumb Helper ──────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbs(items: BreadcrumbItem[]): BreadcrumbItem[] {
  return [{ name: 'Home', url: '/' }, ...items];
}
