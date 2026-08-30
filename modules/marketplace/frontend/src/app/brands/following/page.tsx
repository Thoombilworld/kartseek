'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Heart, Users, ShieldCheck, ArrowLeft, Store, ArrowRight } from 'lucide-react';
import { BrandFollowButton } from '@/components/shared/brand-follow-button';
import { unwrapCatalogList } from '@/lib/api/map-catalog-product';
import { apiFetch } from '@/lib/api-fetch';

interface FollowedBrand {
  followId: string;
  followedAt: string;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    isVerified: boolean;
    followerCount: number;
    description?: string;
  };
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
}

export default function FollowingBrandsPage() {
  const [brands, setBrands] = useState<FollowedBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowed() {
      try {
        // Rows are at `data.data.data` behind the gateway envelope. The old
        // `data?.data?.length` measured the *page object*, so it was always
        // `undefined`, the guard never passed, and the page fell back to demo
        // brands even when the customer genuinely followed some. This is also
        // what produced the 500s: the demo entries carry `id: 'apple'`, and the
        // follower endpoints take a brand UUID, so every card fired
        // `/brands/apple/followers/count` and the query blew up on the cast.
        // The list is scoped to the caller's token, not a `userId` query param.
        const res = await apiFetch('/marketplace/brands/followed?page=1&limit=50');
        setBrands(unwrapCatalogList(await res.json()) as FollowedBrand[]);
      } catch {
        // An unreachable API is an empty shelf, not a fake one. Seeding demo
        // brands here meant a signed-in customer saw five brands they had never
        // followed, with working-looking Unfollow buttons.
        setBrands([]);
      } finally {
        setLoading(false);
      }
    }
    fetchFollowed();
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_50%,rgba(59,130,246,0.15),transparent_60%)]" />
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 relative z-10">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Brands You Follow</h1>
              <p className="text-blue-200 text-sm">{brands.length} brand{brands.length !== 1 ? 's' : ''} followed</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Link href="/marketplace/brands/feed" className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 px-5 rounded-xl text-sm border border-white/20 backdrop-blur-sm transition-colors flex items-center gap-2">
              View Brand Feed <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-sm">Loading your brands...</p>
          </div>
        ) : brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">No brands followed yet</h3>
            <p className="text-slate-400 text-sm mb-4 text-center max-w-sm">
              Follow your favorite brands to get exclusive updates, new product launches, and special offers.
            </p>
            <Link href="/marketplace" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
              Explore Brands
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map(item => (
              <div key={item.followId} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
                {/* Brand Card Header */}
                <div className="flex items-start gap-3 mb-4">
                  <Link href={`/marketplace/brand/${item.brand.slug || item.brand.id}`} className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center text-blue-700 font-black text-2xl shadow-sm border border-slate-100 shrink-0 hover:shadow-md transition-shadow">
                    {item.brand.name[0]}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Link href={`/marketplace/brand/${item.brand.slug || item.brand.id}`} className="font-bold text-slate-900 text-base hover:text-blue-600 transition-colors truncate">
                        {item.brand.name}
                      </Link>
                      {item.brand.isVerified && (
                        <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users className="w-3 h-3" />
                      <span>{formatCount(item.brand.followerCount)} followers</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {item.brand.description && (
                  <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">{item.brand.description}</p>
                )}

                {/* Actions */}
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                  <Link href={`/marketplace/brand/${item.brand.slug || item.brand.id}`} className="text-sm text-blue-600 font-semibold hover:text-blue-800 transition-colors flex items-center gap-1">
                    View Store <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <BrandFollowButton
                    brandId={item.brand.id}
                    brandName={item.brand.name}
                    variant="compact"
                    showCount={false}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
