'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Store, ChevronRight, Star, ShieldCheck, Package, Clock } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { ProductCard, ProductCardSkeleton } from '../../components/product-card';
import { BrandFollowButton } from '@/components/shared/brand-follow-button';
import { getSellerById, getProducts } from '@/lib/api/marketplace';
import { mapCatalogList } from '@/lib/api/map-catalog-product';
import type { HomeProduct } from '@/lib/marketplace/types';

/**
 * A seller's storefront.
 *
 * Everything on this page used to be manufactured from the URL. A `DEMO_SELLERS`
 * map held one hand-written entry ("TechWorld Electronics", 4.6★, 12,400 reviews,
 * four invented products with invented prices) and *every other id* fell through
 * to a generator that title-cased the slug into a business name and attached a
 * fixed 4.3 rating, 2,500 reviews, "India", "Est. 2020" and the boilerplate
 * "Quality products with fast delivery". The stat row below it reported 98%
 * response rate and 96% ship-on-time for all of them. So `/marketplace/seller/x`
 * rendered a merchant that did not exist, with a trust record nobody had earned.
 *
 * It now reads `GET /marketplace/sellers/:id` and lists that seller's real
 * catalogue. Metrics the backend does not publish are not shown at all.
 */

interface SellerProfile {
  id: string;
  businessName: string;
  storeSlug: string;
  description: string | null;
  logoUrl: string | null;
  sellerRating: number;
  totalReviews: number;
  productCount: number;
  verified: boolean;
  createdAt: string | null;
}

export default function SellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { formatCurrencyValue } = useRegion();

  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    getSellerById(id)
      .then((res: any) => {
        if (cancelled) return;
        const row = res?.data ?? res;
        if (!row?.id) { setNotFound(true); return; }
        setSeller({
          id: String(row.id),
          businessName: row.businessName ?? 'Seller',
          storeSlug: row.storeSlug ?? '',
          description: row.description ?? null,
          logoUrl: row.logoUrl ?? null,
          sellerRating: Number(row.sellerRating ?? 0) || 0,
          totalReviews: Number(row.totalReviews ?? 0) || 0,
          productCount: Number(row.productCount ?? row.totalProducts ?? 0) || 0,
          verified: row.verified === true || row.verificationStatus === 'VERIFIED',
          createdAt: row.createdAt ?? null,
        });
        // The catalogue filter keys on the seller's uuid, which is what the
        // profile returns even when the page was reached by slug.
        return getProducts({ seller: String(row.id), limit: '30' })
          .then((list) => { if (!cancelled) setProducts(mapCatalogList(list)); })
          .catch(() => { /* profile still renders without the grid */ });
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-slate-200 h-40 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !seller) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Store className="w-14 h-14 text-slate-200 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-1">Seller not found</h1>
          <p className="text-sm text-slate-500 mb-5">This store may have closed or the link is incorrect.</p>
          <Link href="/marketplace/sellers" className="text-sm font-bold text-blue-600 hover:underline">
            Browse all sellers
          </Link>
        </div>
      </div>
    );
  }

  const memberSince = seller.createdAt ? new Date(seller.createdAt).getFullYear() : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Hero */}
      <section className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-lg shrink-0 overflow-hidden">
            {seller.logoUrl
              ? <img src={seller.logoUrl} alt="" className="w-full h-full object-cover" />
              : seller.businessName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-extrabold">{seller.businessName}</h1>
              {/* Shown only when the seller has actually passed verification. */}
              {seller.verified && (
                <span className="bg-blue-500/20 text-blue-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Seller
                </span>
              )}
            </div>
            {seller.description && <p className="text-white/70 text-sm mb-3">{seller.description}</p>}
            <div className="flex items-center gap-5 text-sm flex-wrap">
              {/* A rating is printed only once someone has left one — a seller
                  with no reviews reads "No ratings yet", not "0.0 ★". */}
              {seller.totalReviews > 0 ? (
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <Star className="w-4 h-4 fill-amber-400" /> {seller.sellerRating.toFixed(1)}
                  <span className="text-white/50">({seller.totalReviews.toLocaleString()} reviews)</span>
                </span>
              ) : (
                <span className="text-white/50">No ratings yet</span>
              )}
              {memberSince && <span className="flex items-center gap-1 text-white/50"><Clock className="w-3.5 h-3.5" /> Since {memberSince}</span>}
              <span className="flex items-center gap-1 text-white/50"><Package className="w-3.5 h-3.5" /> {seller.productCount} products</span>
            </div>
          </div>
          <div className="shrink-0">
            <BrandFollowButton brandId={seller.id} brandName={seller.businessName} variant="full" showCount={true} />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <Link href="/marketplace/sellers" className="hover:text-blue-600">Sellers</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">{seller.businessName}</span>
        </nav>

        <h2 className="text-xl font-bold text-slate-800 mb-4">Products from {seller.businessName}</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} formatCurrencyValue={formatCurrencyValue} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
            <Package className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500">No products listed yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
