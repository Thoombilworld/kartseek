import React, { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { brandMeta } from '@/lib/seo/metadata';
import {
  Star,
  Heart,
  Truck,
  ShieldCheck,
  ArrowRight,
  Store,
  Sparkles,
  Megaphone,
  Tag,
  Package,
} from 'lucide-react';
import { discountPercent } from '@/lib/marketplace/pricing';
import { getBrandById, getProducts } from '@/lib/api/marketplace';
import { getBrandUpdates } from '@/lib/api/brand-follow';
import { buyBoxPrice, buyBoxMrp } from '@/lib/api/map-catalog-product';
import { itemListSchema, breadcrumbSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';
import { PriceTag } from '../../components/price-tag';
import { BrandFollowButton } from '@/components/shared/brand-follow-button';
import { WishlistButton } from '@/components/shared/wishlist-button';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { ShareButton } from '@/components/shared/share-button';
import { productPath } from '@/lib/marketplace/product-url';
import { requestCurrency, requestCountry } from '@/lib/localization/request-region';
import { zoneHref } from '@/lib/routes/zone-href';

/**
 * The brand store, from the catalogue.
 *
 * Everything on this page used to come from two hard-coded maps keyed by slug —
 * `BRAND_CATALOG` and `BRAND_UPDATES_DATA` — and the API was never called. Four
 * separate symptoms came out of that single fact:
 *
 *  - The heading was `id.split('-').map(capitalise).join(' ')`. Product pages
 *    link here with `brand.id`, so the heading read
 *    "80918dda 9b8f 4233 B32d 1a80d5d5c0e0".
 *  - An unrecognised key fell through to a generator that invented eight
 *    products named "<the same uuid> Signature Edition", "… Pro Edition", …
 *  - Those generated rows carried ids like `prod-<uuid>-0`, which exist in no
 *    catalogue, so every card opened "Product Not Found".
 *  - Even the three recognised slugs listed hand-written ids that had drifted
 *    from the seed: `/brand/apple` showed an "Apple Pencil" card that opened a
 *    Dell Inspiron, and a "MacBook Air" card that opened a Nike t-shirt. That
 *    one is quieter than a 404 and worse — nothing looks wrong.
 *
 * The page now resolves the brand by uuid *or* slug and lists what the seller
 * actually offers.
 */
interface BrandProduct {
  id: string;
  title: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: string;
  badge?: string;
  imageUrl?: string;
}

const updateTypeIcons: Record<string, typeof Sparkles> = {
  LAUNCH: Sparkles,
  OFFER: Tag,
  NEW_PRODUCT: Package,
  ANNOUNCEMENT: Megaphone,
};

/** Memoised so `generateMetadata` and the page body share one lookup. */
const loadBrand = cache((id: string) => getBrandById(id).catch(() => null));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const brand = await loadBrand(id);
  if (!brand) return { title: 'Brand not found', robots: { index: false, follow: true } };

  const meta = brandMeta({
    name: brand.name,
    // The route accepts a uuid or a slug, so the same store has two URLs. The
    // canonical always names the slug, which is the readable one and the one
    // the homepage links — otherwise the two split each other's ranking.
    slug: brand.slug ?? id,
    description: brand.description || undefined,
    logo: brand.logoUrl || undefined,
  });
  return meta;
}

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Accepts a uuid or a slug — product pages link with `brand.id`, the homepage
  // promo cards with the slug, and both have to land on the same store.
  // Memoised above — `generateMetadata` already resolved this for the request.
  const brand = await loadBrand(id);
  if (!brand) notFound();

  const brandName = brand.name;
  // The follow button and the updates feed key off the uuid, never the slug the
  // visitor may have arrived with.
  const brandId = brand.id;

  // Products the brand actually sells, filtered by slug — the catalogue filters
  // brands on `brand.slug`, the same convention the category routes use.
  let products: BrandProduct[] = [];
  try {
    // Server component: the market must travel explicitly (see category page).
    const res: any = await getProducts({
      brand: brand.slug,
      limit: '48',
      country: await requestCountry(),
    });
    const rows: any[] = res?.data ?? res?.products ?? [];
    products = (Array.isArray(rows) ? rows : []).map(
      (p: any): BrandProduct => ({
        id: p.id,
        title: p.name ?? p.title ?? 'Product',
        price: buyBoxPrice(p),
        // `mrp` is a decimal column, so it arrives as a string.
        mrp: buyBoxMrp(p) || buyBoxPrice(p),
        rating: Number(p.averageRating ?? 0),
        reviews: String(p.reviewCount ?? 0),
        badge: p.badge || undefined,
        imageUrl: p.images?.[0]?.url ?? undefined,
      }),
    );
  } catch {
    /* leave empty — the grid renders its own empty state */
  }

  // Real updates only. The three hand-written announcements this replaces were
  // shown for apple/samsung/nike and a "Welcome to <uuid>" card for everyone
  // else; an empty feed now hides the section instead of inventing news.
  let brandUpdates: { type: string; title: string; message: string; date: string }[] = [];
  try {
    const res: any = await getBrandUpdates(brandId, 1, 3);
    const rows: any[] = res?.data ?? [];
    brandUpdates = (Array.isArray(rows) ? rows : []).map((u: any) => ({
      type: u.type ?? 'ANNOUNCEMENT',
      title: u.title ?? '',
      message: u.message ?? u.body ?? '',
      date: u.createdAt ?? '',
    }));
  } catch {
    /* no updates to show */
  }

  // See `category/[id]/page.tsx` — a brand page is a product listing and was
  // going to crawlers without any structured data describing it as one.
  const listCurrency = await requestCurrency();
  const listJsonLd = itemListSchema(
    products.map((p) => ({
      name: p.title,
      url: productPath(p),
      image: p.imageUrl,
      price: p.price,
      currency: listCurrency,
    })),
    brandName,
  );
  const trail = [
    { name: 'Home', url: '/marketplace' },
    { name: 'Brands', url: '/marketplace/category-list' },
    { name: brandName, url: `/marketplace/brand/${brand.slug ?? brandId}` },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {products.length > 0 && <JsonLd data={[listJsonLd, breadcrumbSchema(trail)]} />}
      {/* Brand Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 relative overflow-hidden">
        {/* Brand banner background */}
        {/*
          Decorative only — 20% opacity behind the header, alt="" so it is not
          announced. The demo image stays as a fallback here precisely because
          it claims nothing: unlike the logo above, nobody reads this as "this
          is the brand's photograph". A real banner still wins when set.
        */}
        {/* Only the brand's own banner. The bundled stock photograph that
            stood in for it was the last demo asset on a storefront page; the
            gradient behind this is the designed state when none is set. */}
        {brand.bannerUrl && (
          <img
            src={brand.bannerUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(59,130,246,0.15),transparent_60%)]"></div>
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 relative z-10">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            {/* Labelled for where it actually goes. There is no brands index
                route — only /brands/feed and /brands/following — and this has
                always pointed at the category list, so "Brands" promised a page
                that does not exist. */}
            <Link href="/category-list" className="hover:text-white transition-colors">
              Categories
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{brandName}</span>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden">
              {/*
                The brand's own logo, or its initial — never a stock photo.

                This read `getBrandImage(brand.slug, 'logo')` from the bundled
                demo map and ignored `brand.logoUrl` entirely, so a real logo
                could not have displayed even once uploaded. Worse, the demo map
                answers with an unrelated Unsplash photograph captioned
                "<brand> logo": Apple's was a desk shot. A monogram says "no
                logo yet"; a photograph of someone else's product asserts
                something untrue about the brand.
              */}
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={`${brandName} logo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-blue-700 font-black text-3xl">{brandName[0]}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                {brandName}
              </h1>
              {brand.description && (
                <p className="text-blue-200 mt-1 text-lg">{brand.description}</p>
              )}
              {brand.isVerified && (
                <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified brand on
                  KARTSEEK
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <BrandFollowButton
                brandId={brandId}
                brandName={brandName}
                variant="full"
                showCount={true}
              />
              <ShareButton
                title={brandName}
                text={`${brandName} on KARTSEEK`}
                className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-xl transition-colors backdrop-blur-sm text-sm border border-white/20"
              />
            </div>
          </div>
          {/* Trust badges */}
          <div className="flex flex-wrap gap-4 mt-6">
            {[
              // "Authorized Store" is a claim about this brand, so it follows
              // the same flag as the verified line above rather than being
              // asserted for every brand that happens to have a page.
              ...(brand.isVerified ? [{ icon: ShieldCheck, text: 'Authorized Store' }] : []),
              { icon: Truck, text: 'Free Delivery' },
              { icon: Store, text: `${products.length} Products` },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-1.5 text-sm text-slate-300">
                <b.icon className="w-4 h-4 text-blue-400" />
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brand Updates. Rendered only when the brand has actually posted
          something — the header and "View all updates" link used to show above
          a fabricated announcement even for brands with no news at all. */}
      {brandUpdates.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-600" />
              Brand Updates
            </h2>
            <Link
              href="/brands/feed"
              className="text-sm text-blue-600 hover:underline font-semibold flex items-center gap-1"
            >
              View all updates <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {brandUpdates.map((update, i) => {
              const Icon = updateTypeIcons[update.type] || Megaphone;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        update.type === 'LAUNCH'
                          ? 'bg-purple-100 text-purple-600'
                          : update.type === 'OFFER'
                            ? 'bg-amber-100 text-amber-600'
                            : update.type === 'NEW_PRODUCT'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        update.type === 'LAUNCH'
                          ? 'bg-purple-50 text-purple-600'
                          : update.type === 'OFFER'
                            ? 'bg-amber-50 text-amber-600'
                            : update.type === 'NEW_PRODUCT'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {update.type.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1.5 text-sm leading-snug">
                    {update.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-2">{update.message}</p>
                  <p className="text-slate-400 text-[10px]">{update.date}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-slate-900">All Products from {brandName}</h2>
          <span className="text-sm text-slate-500">{products.length} items</span>
        </div>

        {products.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="font-bold text-slate-800 mb-1">No products from {brandName} yet</h3>
            <p className="text-sm text-slate-500 mb-6">
              Follow this brand to hear when they list something.
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors"
            >
              Browse the marketplace
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => {
            const discount = discountPercent(product.mrp, product.price);
            return (
              <Link
                href={zoneHref(productPath(product))}
                key={product.id}
                className="bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group relative flex flex-col"
              >
                {product.badge && (
                  <div
                    className={`absolute top-3 left-3 ${product.badge.includes('OFF') ? 'bg-red-500' : product.badge === 'BESTSELLER' ? 'bg-amber-500' : product.badge === 'NEW' ? 'bg-blue-600' : 'bg-emerald-600'} text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 uppercase tracking-wide`}
                  >
                    {product.badge}
                  </div>
                )}
                {discount > 0 && !product.badge && (
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10">
                    {discount}% OFF
                  </div>
                )}
                {/* This page is a server component, so the heart had no handler
                    at all — eight per grid, none of them clickable. */}
                <WishlistButton
                  productId={product.id}
                  size="sm"
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-red-50 transition-colors z-10 shadow-sm border border-slate-100"
                />

                <ProductThumb
                  src={product.imageUrl}
                  alt={product.title}
                  brand={brandName}
                  sizes={THUMB_SIZES.grid4}
                  className="mb-3 rounded-xl border border-slate-100"
                />

                <div className="flex-1">
                  <p className="text-[10px] text-blue-600 font-semibold mb-1 uppercase tracking-wider">
                    {brandName}
                  </p>
                  <h3 className="font-semibold text-slate-800 text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                    {product.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      {product.rating} <Star className="w-2.5 h-2.5 fill-white" />
                    </span>
                    <span className="text-xs text-slate-500">({product.reviews})</span>
                  </div>
                </div>

                <div className="mt-auto pt-2 border-t border-slate-100">
                  <PriceTag price={product.price} mrp={product.mrp} discount={discount} />
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">✓ Free Delivery</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
