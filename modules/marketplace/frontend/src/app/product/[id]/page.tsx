import React, { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
// `cache()` above is what makes this affordable: `generateMetadata` and the page
// body both resolve the product, and Next 15 leaves `fetch` uncached by default,
// so without it every product render hit the catalogue twice.
import { cookies, headers } from 'next/headers';
import { getCurrencyCode, isCountryCode, DEFAULT_COUNTRY } from '@/lib/localization';
import { productMeta } from '@/lib/seo/metadata';
import { productSchema, breadcrumbSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';
import { getProductById } from '@/lib/api/marketplace';
import { parseProductParam, productPath, isCanonicalProductParam } from '@/lib/marketplace/product-url';
import { buyBoxPrice } from '@/lib/api/map-catalog-product';
import { productImageList } from '@/lib/product-image';
import { ReportProductButton } from './report-product';
import { API_BASE_URL } from '@/lib/config/api-base';
import { ApiError } from '@/lib/api-endpoints';
import { Star, Truck, Shield, Info, BadgeCheck, CreditCard, Repeat, RefreshCw, ServerCrash } from 'lucide-react';
import { ProductPriceDisplay } from './product-price';
import { ProductActions } from './product-actions';
import { ProductRecommendations } from './product-recommendations';
import { ProductClientState } from './product-client-state';
import { PincodeChecker, EmiCalculator, ProductReviewSection, ProductQASection, FrequentlyBoughtTogether } from './product-enhancements';
import { VariantProvider } from './variant-context';
import { VariantPicker } from './variant-picker';
import { BrandFollowButton } from '@/components/shared/brand-follow-button';
import ProductGallery from './product-gallery';
import { OtherSellers } from './other-sellers';
// Allowlist sanitizer. This page is a server component, so whatever comes out
// of here is spliced into the SSR'd HTML and parsed as markup — an injected
// `<script>` really does run, and the CSP's `script-src 'unsafe-inline'` will
// not stop it. See the module for the bypasses that retired the denylist that
// used to live here.
import { sanitizeHtml } from '@/lib/sanitize-html';

// Bank offers and exchange offers will be fetched from API.

/**
 * Load the product, separating "this product does not exist" from "the catalogue
 * could not answer right now".
 *
 * Both used to land on notFound(), so a slow or restarting backend rendered
 * "Product Not Found" — indistinguishable from a deleted product, and wrong.
 * 400/404 are final answers about the id; everything else (5xx, a dead channel,
 * the API client's 8 s abort) is transient and worth one retry.
 */
const loadProduct = cache(async (id: string): Promise<{ product: any | null; unavailable: boolean }> => {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const apiProduct = await getProductById(id);
      const found = apiProduct && !apiProduct.statusCode && !apiProduct.error ? apiProduct : null;
      return { product: found, unavailable: false };
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 400 || status === 404) return { product: null, unavailable: false };
      if (attempt === 1) return { product: null, unavailable: true };
    }
  }
  return { product: null, unavailable: true };
});

/**
 * Per-product title, description, canonical and social card.
 *
 * This page had none. It inherited the root layout's defaults, so every product
 * in the catalogue shared one title ("KARTSEEK — The Ultimate Super App"), one
 * description, and — until the root canonical was removed — declared the
 * homepage as its canonical URL, which tells Google not to index it at all. A
 * product detail page is the single most valuable indexable surface a
 * storefront has.
 *
 * Next dedupes this fetch against the one the page body makes, so resolving the
 * product twice costs one request.
 */
/**
 * The currency this request's region prices in.
 *
 * Listings carry a `sellingPrice` and no currency column, so the currency is a
 * property of the market, not of the row. The literal `'QAR'` that stood in for
 * it published an Indian product's ₹115,900 as 115900.00 QAR in both the share
 * card and the Product markup — a Qatari price roughly forty times the real
 * one. The edge proxy has already resolved the region onto the request.
 */
async function requestCurrency(): Promise<string> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const raw = headerStore.get('X-Country-Code') ?? cookieStore.get('kartseek_country')?.value;
  return getCurrencyCode(isCountryCode(raw) ? raw!.toUpperCase() : DEFAULT_COUNTRY);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: segment } = await params;
  // The route segment is `<slug>-<uuid>`; only the uuid identifies the product.
  const { id } = parseProductParam(segment);
  const { product } = id ? await loadProduct(id) : { product: null };

  // A product that is missing or momentarily unreachable must not be described
  // as if it existed, and must not be indexed under a guessed title.
  if (!product) {
    return { title: 'Product not found', robots: { index: false, follow: true } };
  }

  const name = product.title ?? product.name ?? 'Product';
  const listings: any[] = Array.isArray(product.listings) ? product.listings : [];
  const listing = product.listing ?? listings.find((l: any) => l?.isBuyBoxWinner) ?? listings[0] ?? null;
  // The payable price, not the MRP — the number a shopper sees on the page has
  // to be the number in the snippet and in the Product markup.
  const price = Number(listing?.sellingPrice) || Number(product.mrp) || 0;

  return productMeta({
    name,
    description: product.shortDescription ?? product.short_description ?? product.description ?? '',
    // `productMeta` builds the canonical URL from this, so it must be the whole
    // canonical segment — `<slug>-<uuid>` — not the bare uuid. Passing the uuid
    // would have every product declare a canonical pointing at the legacy URL
    // it is being redirected away from.
    slug: productPath(product).replace('/marketplace/product/', ''),
    image: productImageList(product)[0],
    price: price || undefined,
    currency: await requestCurrency(),
    rating: Number(product.averageRating) || undefined,
    reviewCount: Number(product.reviewCount) || undefined,
    brand: product.brand?.name ?? undefined,
    category: product.category?.name ?? undefined,
  });
}

/** Shown when the catalogue is unreachable — a retry, not a dead end. */
function ProductUnavailable() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100 max-w-lg w-full text-center">
        <div className="w-24 h-24 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <ServerCrash className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">Couldn&apos;t load this product</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          The product catalogue isn&apos;t responding right now. This is temporary — the
          product is still there. Please try again in a moment.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/marketplace" className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5" /> Back to Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params is a Promise — must be awaited
  const { id: segment } = await params;

  /**
   * The canonical URL is `/marketplace/product/<slug>-<uuid>`; the uuid alone is
   * what resolves the product.
   *
   * A segment carrying no uuid was never one of our URLs, so it is a 404 rather
   * than a lookup that will fail anyway.
   */
  const { id } = parseProductParam(segment);
  if (!id) notFound();

  const { product: apiProduct, unavailable } = await loadProduct(id);
  if (unavailable) return <ProductUnavailable />;
  if (!apiProduct) notFound();

  /**
   * Send every non-canonical spelling to the canonical one.
   *
   * Two shapes reach here: the legacy bare uuid, which is what every existing
   * link and index entry uses, and a stale slug from before the product was
   * renamed. Both must keep working — but serving them would put one product on
   * several indexable URLs, which is the duplicate-content problem a canonical
   * tag mitigates and a redirect actually solves.
   *
   * 308 rather than 307: this is a permanent move, so search engines transfer
   * the existing ranking signals to the new URL instead of treating it as a
   * temporary detour.
   */
  if (!isCanonicalProductParam(segment, apiProduct)) {
    permanentRedirect(productPath(apiProduct));
  }

  let product = apiProduct;

  // Normalise the entity shape to the one this page and its child components
  // read. The Product entity exposes `name`, `short_description` and a
  // `listings` *array*; the UI (and ProductActions / ProductPriceDisplay) were
  // written against `title`, `shortDescription` and a single `listing`. Aliasing
  // once here keeps every downstream read working — without it the page renders
  // with a blank <h1> and a ₹0 price. The buy-box winner is the listing to show;
  // getProductById already orders it first, so `find` then first-active.
  const listings: any[] = Array.isArray(product.listings) ? product.listings : [];
  product = {
    ...product,
    title: product.title ?? product.name ?? '',
    shortDescription: product.shortDescription ?? product.short_description ?? '',
    listing: product.listing ?? listings.find((l: any) => l?.isBuyBoxWinner) ?? listings[0] ?? null,
  };

  // Prices, resolved once and as numbers.
  //
  // `mrp` and `listing.sellingPrice` are Postgres `decimal` columns, so they
  // arrive as strings ("134900.00"). Passed straight through they reached
  // `Number.isFinite` in formatMoney, failed it, and rendered every price on
  // this page as ₹0 — the "product has no price" report. `buyBoxPrice` is the
  // same helper the cards use: it coerces, prefers the buy-box listing, skips
  // inactive ones, and falls back to MRP for a product no seller has listed yet.
  const listPrice = Number(product.mrp) || 0;
  const payablePrice = buyBoxPrice(product) || listPrice;

  // Category routes are addressed by slug, never by uuid — see the breadcrumb
  // comment below. Resolved here so the links and the recommendations query
  // read the same value.
  const categorySlug: string | undefined = product.category?.slug || undefined;
  const subcategorySlug: string | undefined = product.subcategory?.slug || undefined;

  // The gallery, resolved with the same helper the card grids use: the
  // `images` relation is the catalogue's store and `metadata.imageGalleryUrls`
  // is the older hand-authored one, and the primary image is whichever row
  // carries `isPrimary` rather than whichever sorts first.
  const images = productImageList(product);
  const mainImage = images[0] || '';

  // A 360° capture is an ordered frame sequence the seller uploads. The
  // control is only rendered when one exists — a spin button over a single
  // photograph would promise a rotation the product does not have.
  const spinFrames: string[] = Array.isArray(product.metadata?.spin360Urls)
    ? product.metadata.spin360Urls.filter((u: unknown) => typeof u === 'string' && u.trim())
    : [];
  const specs = product.metadata?.specifications || [];

  // Fetch real offers from the API (server-side)
  let bankOffers: any[] = [];
  let exchangeOffers: any[] = [];
  try {
    const res = await fetch(`${API_BASE_URL}/marketplace/products/${id}/offers`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.bankOffers?.length) bankOffers = json.data.bankOffers;
      if (json?.data?.exchangeOffers?.length) exchangeOffers = json.data.exchangeOffers;
    }
  } catch {
    // API unavailable — show no offers
  }
  const hasExchangeOffers = exchangeOffers.length > 0;
  const exchangeHeadline = hasExchangeOffers ? exchangeOffers[0].title : '';

  // Structured data. Without it a product page is just prose to a crawler:
  // price, availability, brand and rating are all rendered as styled spans that
  // carry no machine meaning, so no rich result can be built from them.
  // Everything below is read from the same values the page renders — the markup
  // and the visible page must agree or Google treats it as cloaking.
  // Computed once: the metadata canonical, the Product schema's `url` and the
  // breadcrumb's last hop all have to agree, and a mismatch between them is
  // exactly the kind of thing that passes review and fails in Search Console.
  const canonicalSegment = productPath(product).replace('/marketplace/product/', '');

  const productJsonLd = productSchema({
    name: product.title,
    description: product.shortDescription || product.description || '',
    // Same reasoning as the canonical in `generateMetadata`: the schema's `url`
    // must be the canonical product URL, so this is the full segment.
    slug: canonicalSegment,
    image: images,
    price: payablePrice,
    currency: await requestCurrency(),
    brand: product.brand?.name,
    sku: product.sku ?? product.listing?.sku,
    rating: Number(product.averageRating) || undefined,
    reviewCount: Number(product.reviewCount) || undefined,
    inStock: (product.listing?.stockQuantity ?? 0) > 0 || product.listing?.isActive === true,
    category: product.category?.name,
    seller: product.listing?.seller?.businessName ?? product.listing?.seller?.name,
  });

  // Mirrors the visible trail below, one level at a time — the two must match,
  // and the category levels are addressed by slug because that is what the
  // category route resolves.
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Marketplace', url: '/marketplace' },
    ...(categorySlug ? [{ name: product.category?.name || 'Category', url: `/marketplace/category/${categorySlug}` }] : []),
    ...(subcategorySlug ? [{ name: product.subcategory?.name || 'Subcategory', url: `/marketplace/subcategory/${subcategorySlug}` }] : []),
    { name: product.title, url: productPath(product) },
  ]);

  return (
    <div className="bg-slate-50 min-h-screen pb-mobile-nav">
      <JsonLd data={[productJsonLd, breadcrumbJsonLd]} />
      <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-4 md:pt-6">

        {/* Breadcrumbs.
            The category link addressed the route by **UUID** — `category?.id` —
            but `/marketplace/category/[id]` forwards its segment straight to
            `getProducts({ category })`, and the catalogue filters on
            `category.slug`. A uuid matches no slug, so the query returned zero
            rows and the page rendered "No products found" for a category that
            demonstrably has products. Every other link into this route (the
            homepage grid, the header nav, /category-list) passes a slug — even
            `mapFeedCategory` normalises the API's rows with
            `id: c?.slug ?? c?.id` — so the slug is the convention and this was
            the one caller breaking it.

            The subcategory level was missing entirely, though the product
            detail response carries it, so there was no way back to
            "Smartphones" from a phone. */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/marketplace" className="hover:text-blue-600 transition-colors whitespace-nowrap">Home</Link>
          {categorySlug && (
            <>
              <span>/</span>
              <Link href={`/marketplace/category/${categorySlug}`} className="hover:text-blue-600 transition-colors hidden sm:inline">{product.category?.name || 'Category'}</Link>
            </>
          )}
          {subcategorySlug && (
            <>
              <span className="hidden sm:inline">/</span>
              <Link href={`/marketplace/subcategory/${subcategorySlug}`} className="hover:text-blue-600 transition-colors hidden md:inline">{product.subcategory?.name}</Link>
            </>
          )}
          <span className="hidden sm:inline">/</span>
          <span className="text-slate-900 font-medium truncate max-w-[160px] sm:max-w-none">{product.title}</span>

        </div>

        {/* One variant selection for the whole block: the gallery, the price
            and the buy buttons are all downstream of it. They each used to
            decide independently, so a colour picked in one was invisible to
            the other two. */}
        <VariantProvider
          rawVariants={product.variants}
          categorySlug={subcategorySlug ?? categorySlug}
          basePrice={payablePrice}
          baseMrp={listPrice}
          baseImages={images}
        >
        <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Image Gallery — interactive (swipe / thumbnails / arrows). The
                markup that used to live here was inert: thumbnails carried no
                click handler and the hero was pinned to images[0]. */}
            <ProductGallery
              images={images}
              title={product.title}
              brandInitial={(product.brand?.name || '?')[0]}
              spinFrames={spinFrames}
            />

            {/* Product Info */}
            <div className="flex flex-col">
              <div className="mb-6 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <Link href={`/marketplace/brand/${product.brand?.id || 'unknown'}`} className="text-blue-600 font-semibold text-sm hover:underline">
                    {product.brand?.name || 'Unknown Brand'}
                  </Link>
                  <BrandFollowButton
                    brandId={product.brand?.id || 'unknown'}
                    brandName={product.brand?.name || 'Unknown Brand'}
                    variant="compact"
                    showCount={false}
                  />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-3">{product.title}</h1>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-sm font-bold">
                    <span>{product.averageRating || '0.0'}</span>
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  {/* "Ratings" not "Ratings & Reviews". `reviewCount` on the
                      product is the aggregate rating tally; written reviews are
                      a subset of it and are counted separately below. Labelling
                      it as both put "12,400 Ratings & Reviews" directly above a
                      panel reading "No reviews yet". */}
                  <a href="#reviews" className="text-slate-500 text-sm hover:text-blue-600">
                    {Number(product.reviewCount || 0).toLocaleString()} rating{Number(product.reviewCount) === 1 ? '' : 's'}
                  </a>
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified Listing
                  </span>
                </div>

                <ProductPriceDisplay
                  sellingPrice={payablePrice}
                  mrp={listPrice}
                />
              </div>

              {/* Variant pickers (size / colour / configuration), rendered from
                  the variants the product response already carries. */}
              <VariantPicker />

              {/* Delivery & Trust */}
              <div className="bg-slate-50 rounded-sm p-4 mt-6 mb-6 space-y-4 border border-slate-200">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">Free Delivery Available</h4>
                    <p className="text-slate-500 text-xs">Enter pincode to check exact delivery dates.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">1 Year Brand Warranty</h4>
                    <p className="text-slate-500 text-xs">7 Days Replacement Policy</p>
                  </div>
                </div>

                {/* Bank Offers */}
                {bankOffers.length > 0 && (
                  <div className="border-t border-slate-200 pt-4 mt-2">
                    <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-green-600" /> Bank Offers</h4>
                    <div className="space-y-1.5">
                      {bankOffers.map((offer: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{offer.title} <span className="text-blue-600 font-bold cursor-pointer hover:underline">T&C</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exchange Offer */}
                {hasExchangeOffers && (
                  <div className="border-t border-slate-200 pt-4 mt-2">
                    <div className="flex items-start gap-3">
                      <Repeat className="w-5 h-5 text-violet-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">Exchange Offer Available</h4>
                        <p className="text-slate-500 text-xs">{exchangeHeadline}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pincode Checker */}
                <PincodeChecker />

                {/* EMI Calculator */}
                <EmiCalculator productId={product.id} price={payablePrice} />
              </div>

              {/* Interactive Variant Selection and Action Buttons */}
              <ProductActions product={product} />

              {/* Records the view for /marketplace/recently-viewed and offers the
                  compare toggle that /marketplace/compare reads. Neither store had
                  a writer before, so both pages were empty or faked. */}
              <ProductClientState
                product={{
                  id: product.id,
                  title: product.title,
                  brand: product.brand?.name || '',
                  price: payablePrice,
                  mrp: listPrice,
                  rating: Number(product.averageRating || 0),
                  imageUrl: mainImage || undefined,
                  viewedAt: 0,
                }}
              />
            </div>
          </div>
        </div>
        </VariantProvider>

        {/* Specifications & Description */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Product Description</h2>
              <div 
                className="prose prose-sm max-w-none prose-img:rounded-sm prose-a:text-blue-600"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.metadata?.richDescriptionHtml || product.shortDescription || 'No description provided.') }}
              />
            </div>

            {specs.length > 0 && (
              <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Specifications</h2>
                <div className="space-y-6">
                  {specs.map((group: any, idx: number) => (
                    <div key={idx}>
                      <h3 className="font-bold text-slate-800 mb-3 text-sm">{group.groupName}</h3>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {group.attributes.map((attr: any, i: number) => (
                          <div key={i} className="flex flex-col sm:flex-row sm:justify-between py-1.5 border-b border-slate-100 last:border-0">
                            <dt className="text-slate-500 text-sm w-full sm:w-1/3">{attr.key}</dt>
                            <dd className="text-slate-900 text-sm font-medium w-full sm:w-2/3">{attr.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <FrequentlyBoughtTogether productId={product.id} />
            <div id="reviews" className="scroll-mt-24">
              <ProductReviewSection
                productId={product.id}
                linkSegment={canonicalSegment}
                aggregateRating={Number(product.averageRating ?? 0)}
                aggregateCount={Number(product.reviewCount ?? 0)}
              />
            </div>
            <ProductQASection productId={product.id} />
            <ProductRecommendations categorySlug={categorySlug} excludeProductId={product.id} />
          </div>
          
          {/* Seller Info Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Info className="w-5 h-5 text-slate-400" /> Sold By
              </h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl uppercase">
                  {product.listing?.seller?.businessName?.[0] || 'S'}
                </div>
                <div>
                  <Link href={`/marketplace/seller/${product.listing?.seller?.id || 'unknown'}`} className="font-bold text-blue-600 hover:underline">
                    {product.listing?.seller?.businessName || 'Verified Seller'}
                  </Link>
                  <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{product.listing?.seller?.sellerRating || 'New'} Rating</span>
                  </div>
                </div>
              </div>
              {/* Was a <button> with no handler, sitting directly under a working
                  link to the same store. A link is what it always wanted to be. */}
              <Link
                href={`/marketplace/seller/${product.listing?.seller?.id || 'unknown'}`}
                className="block w-full text-center bg-white hover:bg-slate-50 text-blue-600 font-bold py-2 rounded-sm transition-colors text-sm border border-slate-200 shadow-sm mt-2"
              >
                Visit Store
              </Link>
            </div>

            {/* Competing offers. `getProductById` has always returned every
                approved listing with its seller — the page just never showed
                that anyone else stocked the item. Renders nothing below two
                offers, which is still the common case. */}
            <OtherSellers offers={listings} />

            {/* Report / Trust */}
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-3 text-sm border-b border-slate-200 pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" /> Product Assurance
              </h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                  <BadgeCheck className="w-4 h-4" />
                  <span className="font-bold">Authorized {product.brand?.name || 'Brand'} Seller</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                  <Shield className="w-4 h-4" />
                  <span className="font-bold">KARTSEEK Buyer Protection</span>
                </div>
              </div>
              {/* Was a handlerless button. There is no product-report endpoint
                  on the gateway, so this routes to the help centre — which does
                  have real contact paths — carrying the product it was raised
                  from, rather than appearing to file a report that went nowhere. */}
              {/* Was a handlerless button, then a link to the help centre as a
                  stopgap because no endpoint existed. It files a real report
                  now — see `POST /marketplace/products/:id/report`. */}
              <ReportProductButton productId={id} />
            </div>
          </div>
        </div>
      </div>

      {/* The sticky mobile CTA bar lives inside <ProductActions> so it shares
          the real add-to-cart / buy-now handlers. */}
    </div>

  );
}
