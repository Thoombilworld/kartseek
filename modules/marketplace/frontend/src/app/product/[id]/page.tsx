import React, { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
// `cache()` is what makes this affordable: `generateMetadata` and the page body
// both resolve the product, and Next leaves `fetch` uncached by default, so
// without it every product render hit the catalogue twice.
import { cookies, headers } from 'next/headers';
import { getCurrencyCode, isCountryCode, DEFAULT_COUNTRY } from '@/lib/localization';
import { productMeta } from '@/lib/seo/metadata';
import { productSchema, breadcrumbSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';
import { getProductById } from '@/lib/api/marketplace';
import {
  parseProductParam,
  productPath,
  isCanonicalProductParam,
} from '@/lib/marketplace/product-url';
import {
  normaliseProductDetail,
  schemaAvailability,
  schemaCondition,
  type ProductDetail,
} from '@/lib/marketplace/product-detail';
import { zoneHref } from '@/lib/routes/zone-href';
import { ApiError } from '@/lib/api-endpoints';
import { Star, Info, BadgeCheck, Truck, RefreshCw, ServerCrash, LifeBuoy } from 'lucide-react';
import { ProductPriceDisplay } from './product-price';
import { ProductActions } from './product-actions';
import { ProductRecommendations } from './product-recommendations';
import { ProductClientState } from './product-client-state';
import {
  PincodeChecker,
  EmiCalculator,
  ProductReviewSection,
  ProductQASection,
  FrequentlyBoughtTogether,
} from './product-enhancements';
import { VariantProvider } from './variant-context';
import { VariantPicker } from './variant-picker';
import { QuantityPicker } from './quantity-picker';
import { ProductAvailabilityBadge } from './product-availability';
import { ProductHighlights } from './product-highlights';
import { ProductSpecifications } from './product-specifications';
import { ProductPolicies } from './product-policies';
import { ProductOffers } from './product-offers';
import { RecentlyViewedRail } from './recently-viewed-rail';
import { ReportProductButton } from './report-product';
import { BrandFollowButton } from '@/components/shared/brand-follow-button';
import ProductGallery from './product-gallery';
import { OtherSellers } from './other-sellers';
// Allowlist sanitizer. This page is a server component, so whatever comes out
// of here is spliced into the SSR'd HTML and parsed as markup — an injected
// `<script>` really does run, and the CSP's `script-src 'unsafe-inline'` will
// not stop it. See the module for the bypasses that retired the denylist.
import { sanitizeHtml } from '@/lib/sanitize-html';

/**
 * Load the product for one market, separating "this product does not exist"
 * from "the catalogue could not answer right now".
 *
 * 400/404 are final answers about the id; everything else (5xx, a dead
 * channel, the API client's 8 s abort) is transient and worth one retry. The
 * result is the page's typed model — every component below reads that, never
 * the raw entity, so the backend → frontend mapping lives in one file.
 */
const loadProduct = cache(
  async (
    id: string,
    market: string,
  ): Promise<{ product: ProductDetail | null; unavailable: boolean }> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await getProductById(id, market);
        if (!raw || raw.statusCode || raw.error) return { product: null, unavailable: false };
        const product = normaliseProductDetail(raw, market);
        // A non-public row (a seller preview leaking, a stale cache entry
        // from before a rejection) must not render on the storefront.
        return { product: product.isPublic ? product : null, unavailable: false };
      } catch (e) {
        const status = e instanceof ApiError ? e.status : 0;
        if (status === 400 || status === 404) return { product: null, unavailable: false };
        if (attempt === 1) return { product: null, unavailable: true };
      }
    }
    return { product: null, unavailable: true };
  },
);

/**
 * The market this request browses. It chooses the offer, the SKUs, the
 * currency and the delivery rule. The edge proxy has already resolved it onto
 * the request; the cookie is the fallback for a direct zone hit.
 */
async function requestCountry(): Promise<string> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const raw = headerStore.get('X-Country-Code') ?? cookieStore.get('kartseek_country')?.value;
  return isCountryCode(raw) ? raw!.toUpperCase() : DEFAULT_COUNTRY;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: segment } = await params;
  const { id } = parseProductParam(segment);
  const market = await requestCountry();
  const { product } = id ? await loadProduct(id, market) : { product: null };

  // A product that is missing or momentarily unreachable must not be described
  // as if it existed, and must not be indexed under a guessed title.
  if (!product) {
    return { title: 'Product not found', robots: { index: false, follow: true } };
  }

  return productMeta({
    name: product.name,
    description: product.shortDescription || product.longDescription || '',
    // The whole canonical segment — `<slug>-<uuid>` — not the bare uuid.
    slug: productPath({ id: product.id, slug: product.slug, name: product.name }).replace(
      '/marketplace/product/',
      '',
    ),
    image: product.images[0],
    // The payable price, never the list price: the number a shopper sees on
    // the page has to be the number in the snippet.
    price: product.price || undefined,
    currency: getCurrencyCode(market),
    rating: product.averageRating || undefined,
    reviewCount: product.reviewCount || undefined,
    brand: product.brand?.name,
    category: product.category?.name,
  });
}

/** Shown when the catalogue is unreachable — a retry, not a dead end. */
function ProductUnavailable() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100 max-w-lg w-full text-center">
        <div className="w-24 h-24 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <ServerCrash className="w-10 h-10" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">Couldn&apos;t load this product</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          The product catalogue isn&apos;t responding right now. This is temporary — the product is
          still there. Please try again in a moment.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" aria-hidden="true" /> Back to Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Paragraphs from plain text; `<p>` per blank-line-separated block, escaped by React. */
function Paragraphs({ text }: { text: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => (
        <p key={i} className="whitespace-pre-line">
          {block}
        </p>
      ))}
    </>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: segment } = await params;

  // The canonical URL is `/marketplace/product/<slug>-<uuid>`; the uuid alone
  // resolves the product. A segment carrying no uuid was never one of our
  // URLs, so it is a 404 rather than a lookup that will fail anyway.
  const { id } = parseProductParam(segment);
  if (!id) notFound();

  const market = await requestCountry();
  const { product, unavailable } = await loadProduct(id, market);
  if (unavailable) return <ProductUnavailable />;
  if (!product) notFound();

  // Send every non-canonical spelling (legacy bare uuid, stale slug) to the
  // canonical one with a 308, so one product never occupies two indexable
  // URLs. `zoneHref` strips the basePath that permanentRedirect re-adds.
  const urlInput = { id: product.id, slug: product.slug, name: product.name };
  if (!isCanonicalProductParam(segment, urlInput)) {
    permanentRedirect(zoneHref(productPath(urlInput)));
  }

  const canonicalSegment = productPath(urlInput).replace('/marketplace/product/', '');
  const categorySlug = product.category?.slug ?? undefined;
  const subcategorySlug = product.subcategory?.slug ?? undefined;
  const offered = product.availability.status !== 'unavailable' && product.price > 0;
  const currency = getCurrencyCode(market);
  const offer = product.offer;
  const sellerHref = offer?.sellerId ? `/seller/${offer.sellerId}` : null;

  // Structured data, read from the same values the page renders: price,
  // availability, condition, rating and the seller must match what a shopper
  // sees or Google treats it as cloaking.
  const productJsonLd = offered
    ? productSchema({
        name: product.name,
        description: product.shortDescription || product.longDescription || product.name,
        slug: canonicalSegment,
        image: product.images,
        price: product.price,
        currency,
        brand: product.brand?.name,
        sku: product.sku ?? undefined,
        gtin: product.gtin ?? undefined,
        rating: product.averageRating || undefined,
        reviewCount: product.reviewCount || undefined,
        availability: schemaAvailability(product.availability),
        condition: schemaCondition(offer?.condition),
        offerCount: product.offers.length > 1 ? product.offers.length : undefined,
        lowPrice:
          product.offers.length > 1
            ? Math.min(...product.offers.map((o) => o.sellingPrice))
            : undefined,
        highPrice:
          product.offers.length > 1
            ? Math.max(...product.offers.map((o) => o.sellingPrice))
            : undefined,
        category: product.category?.name,
        seller: offer?.sellerName,
      })
    : null;

  // Mirrors the visible trail, one level at a time; category levels are
  // addressed by slug because that is what the category route resolves.
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Marketplace', url: '/marketplace' },
    ...(categorySlug
      ? [
          {
            name: product.category?.name || 'Category',
            url: `/marketplace/category/${categorySlug}`,
          },
        ]
      : []),
    ...(subcategorySlug
      ? [
          {
            name: product.subcategory?.name || 'Subcategory',
            url: `/marketplace/subcategory/${subcategorySlug}`,
          },
        ]
      : []),
    { name: product.name, url: productPath(urlInput) },
  ]);

  const description: { html: string } | { text: string } | null = product.richDescriptionHtml
    ? { html: String(sanitizeHtml(product.richDescriptionHtml) ?? '') }
    : product.longDescription
      ? { text: product.longDescription }
      : product.shortDescription
        ? { text: product.shortDescription }
        : null;

  return (
    <div
      className="bg-slate-50 min-h-screen pb-mobile-nav"
      data-testid="product-page"
      data-product-id={product.id}
      data-market={market}
    >
      <JsonLd data={productJsonLd ? [productJsonLd, breadcrumbJsonLd] : [breadcrumbJsonLd]} />
      <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-4 md:pt-6">
        {/* Breadcrumbs — category levels are addressed by slug. */}
        <nav aria-label="Breadcrumb" className="mb-4 md:mb-6">
          <ol className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <li>
              <Link href="/" className="hover:text-blue-600 transition-colors whitespace-nowrap">
                Home
              </Link>
            </li>
            {categorySlug && (
              <li className="hidden sm:flex items-center gap-2 min-w-0">
                <span aria-hidden="true">/</span>
                <Link
                  href={`/category/${categorySlug}`}
                  className="hover:text-blue-600 transition-colors truncate"
                >
                  {product.category?.name || 'Category'}
                </Link>
              </li>
            )}
            {subcategorySlug && (
              <li className="hidden md:flex items-center gap-2 min-w-0">
                <span aria-hidden="true">/</span>
                <Link
                  href={`/subcategory/${subcategorySlug}`}
                  className="hover:text-blue-600 transition-colors truncate"
                >
                  {product.subcategory?.name}
                </Link>
              </li>
            )}
            <li className="flex items-center gap-2 min-w-0" aria-current="page">
              <span aria-hidden="true">/</span>
              <span className="text-slate-900 font-medium truncate max-w-[200px] sm:max-w-xs">
                {product.name}
              </span>
            </li>
          </ol>
        </nav>

        {/* One variant selection for the whole block: the gallery, the price,
            the availability badge, the quantity and the buy buttons are all
            downstream of it. Keyed on product + market so a different product
            (or the same one after a market switch) always mounts fresh. */}
        <VariantProvider
          key={`${product.id}:${market}`}
          rawVariants={product.variants}
          categorySlug={subcategorySlug ?? categorySlug}
          basePrice={product.price}
          baseMrp={product.listPrice}
          baseImages={product.images}
          baseStock={product.availability.stock}
          offered={offered}
        >
          <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-4 sm:p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
              <ProductGallery
                images={product.images}
                title={product.name}
                brandInitial={(product.brand?.name || product.name || '?')[0]}
                spinFrames={product.spinFrames}
              />

              <div className="flex flex-col min-w-0">
                <div className="border-b border-slate-100 pb-5">
                  {product.brand && (
                    <div className="flex items-center gap-3 mb-2">
                      {product.brand.id ? (
                        <Link
                          href={`/brand/${product.brand.slug || product.brand.id}`}
                          className="text-blue-600 font-semibold text-sm hover:underline"
                        >
                          {product.brand.name}
                        </Link>
                      ) : (
                        <span className="text-blue-600 font-semibold text-sm">
                          {product.brand.name}
                        </span>
                      )}
                      {product.brand.id && (
                        <BrandFollowButton
                          brandId={product.brand.id}
                          brandName={product.brand.name}
                          variant="compact"
                          showCount={false}
                        />
                      )}
                    </div>
                  )}
                  <h1
                    className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-3 leading-tight"
                    data-testid="product-title"
                  >
                    {product.name}
                  </h1>

                  <div className="flex items-center gap-x-4 gap-y-2 mb-3 flex-wrap">
                    {product.reviewCount > 0 ? (
                      <a
                        href="#reviews"
                        className="flex items-center gap-2 group"
                        aria-label={`Rated ${product.averageRating.toFixed(1)} out of 5 from ${product.reviewCount} ratings. Jump to reviews.`}
                      >
                        <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-sm font-bold">
                          <span>{product.averageRating.toFixed(1)}</span>
                          <Star className="w-4 h-4 fill-current" aria-hidden="true" />
                        </span>
                        <span className="text-slate-500 text-sm group-hover:text-blue-600">
                          {product.reviewCount.toLocaleString()} rating
                          {product.reviewCount === 1 ? '' : 's'}
                        </span>
                      </a>
                    ) : (
                      <Link
                        href={`/product/${canonicalSegment}/review`}
                        className="text-sm text-slate-500 hover:text-blue-600"
                      >
                        No ratings yet — be the first to review
                      </Link>
                    )}
                    {product.sku && (
                      <span className="text-xs text-slate-400">
                        SKU <span className="font-mono text-slate-500">{product.sku}</span>
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <ProductAvailabilityBadge initial={product.availability} />
                  </div>

                  <ProductPriceDisplay
                    sellingPrice={product.price}
                    mrp={product.listPrice}
                    offered={offered}
                  />
                  {offered && <ProductOffers productId={product.id} market={market} />}
                </div>

                <ProductHighlights highlights={product.highlights} />

                <div className="mt-5">
                  <VariantPicker />
                </div>

                {offered && <QuantityPicker />}

                <ProductPolicies product={product} />

                {offered && (
                  <div className="mt-2">
                    {/* PIN-code serviceability is an India Post concept; the Gulf
                        markets address by zone and have no such lookup. */}
                    {market === 'IN' && <PincodeChecker />}
                    <EmiCalculator
                      productId={product.id}
                      market={market}
                      linkSegment={canonicalSegment}
                    />
                  </div>
                )}

                <ProductActions product={product} />

                {/* Records the view for /recently-viewed and offers the compare
                    toggle that /compare reads. */}
                <ProductClientState
                  product={{
                    id: product.id,
                    title: product.name,
                    brand: product.brand?.name || '',
                    price: product.price,
                    mrp: product.listPrice,
                    rating: product.averageRating,
                    imageUrl: product.images[0],
                    viewedAt: 0,
                    market,
                  }}
                />
              </div>
            </div>
          </div>
        </VariantProvider>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-2 space-y-4 min-w-0">
            <ProductSpecifications groups={product.specificationGroups} />

            {description && (
              <section
                aria-labelledby="description-heading"
                className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 md:p-6"
              >
                <h2
                  id="description-heading"
                  className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2"
                >
                  Product description
                </h2>
                {'html' in description ? (
                  <div
                    className="prose prose-sm max-w-none prose-img:rounded-sm prose-a:text-blue-600 break-words"
                    dangerouslySetInnerHTML={{ __html: description.html }}
                  />
                ) : (
                  <div className="prose prose-sm max-w-none text-slate-700 break-words">
                    <Paragraphs text={description.text} />
                  </div>
                )}
              </section>
            )}

            {offered && <FrequentlyBoughtTogether productId={product.id} market={market} />}

            <div id="reviews" className="scroll-mt-24">
              <ProductReviewSection
                productId={product.id}
                linkSegment={canonicalSegment}
                aggregateRating={product.averageRating}
                aggregateCount={product.reviewCount}
              />
            </div>
            <ProductQASection productId={product.id} linkSegment={canonicalSegment} />
            <ProductRecommendations
              categorySlug={categorySlug}
              subcategorySlug={subcategorySlug}
              excludeProductId={product.id}
            />
            <RecentlyViewedRail excludeProductId={product.id} />
          </div>

          <aside className="space-y-4 min-w-0" aria-label="Seller and support">
            {offer && (
              <section
                aria-labelledby="sold-by-heading"
                className="bg-white rounded-sm shadow-sm border border-slate-200 p-5"
                data-testid="sold-by"
              >
                <h2
                  id="sold-by-heading"
                  className="font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2"
                >
                  <Info className="w-5 h-5 text-slate-400" aria-hidden="true" /> Sold by
                </h2>
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl uppercase shrink-0"
                    aria-hidden="true"
                  >
                    {offer.sellerName[0] || 'S'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sellerHref ? (
                        <Link
                          href={sellerHref}
                          className="font-bold text-blue-600 hover:underline truncate"
                        >
                          {offer.sellerName}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-800 truncate">
                          {offer.sellerName}
                        </span>
                      )}
                      {offer.verified && (
                        <BadgeCheck
                          className="w-4 h-4 text-emerald-500 shrink-0"
                          aria-label="Verified seller"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-1 flex-wrap">
                      {offer.sellerRating > 0 ? (
                        <>
                          <Star
                            className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400"
                            aria-hidden="true"
                          />
                          <span className="font-medium">{offer.sellerRating.toFixed(1)}</span>
                          {offer.sellerReviews > 0 && (
                            <span className="text-slate-400">
                              ({offer.sellerReviews.toLocaleString()} reviews)
                            </span>
                          )}
                        </>
                      ) : (
                        <span>New seller</span>
                      )}
                    </div>
                    {offer.isFulfilledByKartseek && (
                      <p className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" aria-hidden="true" /> Fulfilled by KartSeek
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Condition:{' '}
                      {offer.condition === 'NEW'
                        ? 'New'
                        : offer.condition === 'REFURBISHED'
                          ? 'Refurbished'
                          : offer.condition === 'USED'
                            ? 'Used'
                            : offer.condition}
                    </p>
                  </div>
                </div>
                {sellerHref && (
                  <Link
                    href={sellerHref}
                    className="block w-full text-center bg-white hover:bg-slate-50 text-blue-600 font-bold py-2 rounded-sm transition-colors text-sm border border-slate-200 shadow-sm"
                  >
                    Visit store
                  </Link>
                )}
              </section>
            )}

            <OtherSellers offers={product.offers} />

            <section
              aria-labelledby="help-heading"
              className="bg-white rounded-sm shadow-sm border border-slate-200 p-5"
            >
              <h2
                id="help-heading"
                className="font-bold text-slate-900 mb-3 text-sm border-b border-slate-200 pb-2 flex items-center gap-2"
              >
                <LifeBuoy className="w-4 h-4 text-slate-400" aria-hidden="true" /> Help with this
                product
              </h2>
              <Link href="/help" className="block text-sm text-blue-600 hover:underline mb-3">
                Ordering, delivery and returns help
              </Link>
              <ReportProductButton productId={product.id} />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
