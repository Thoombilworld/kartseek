'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, ChevronRight, Search, Star, MapPin, ShieldCheck, Package } from 'lucide-react';
import { unwrapCatalogList } from '@/lib/api/map-catalog-product';
import { apiFetch } from '@/lib/api-fetch';

interface Seller { id: string; name: string; rating: number; reviews: number; location: string; products: number; verified: boolean; logoUrl?: string; }

export default function SellersPage() {
  // Starts empty rather than seeded with demo sellers: those had slug ids, so
  // every tile linked to a seller page that does not resolve.
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rows sit at `d.data.data` behind the gateway envelope — `d.data?.length`
    // measured the page object, so it was always falsy and the directory showed
    // the demo list forever. Those demo rows carry slug ids (`techworld`), so
    // every card also linked to `/marketplace/seller/techworld`, which no lookup
    // resolves.
    //
    // The API row is a `Seller` entity (`businessName`, `sellerRating`, …), not
    // this page's view model, so it has to be mapped: rendering it raw left
    // `seller.name` undefined and `seller.name[0]` threw.
    apiFetch('/marketplace/sellers')
      .then(r => r.json())
      .then(d => {
        const rows = unwrapCatalogList(d);
        if (!rows.length) return;
        setSellers(rows.map((s: any): Seller => ({
          id: String(s.id ?? ''),
          name: s.businessName ?? s.name ?? 'Seller',
          rating: Number(s.sellerRating ?? 0) || 0,
          reviews: Number(s.totalReviews ?? 0) || 0,
          location: s.regionCode ?? '',
          products: Number(s.totalProducts ?? 0) || 0,
          verified: (s.verificationStatus ?? '') === 'VERIFIED',
          logoUrl: s.logoUrl ?? undefined,
        })).filter((s) => s.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? sellers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : sellers;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <section className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 text-white py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-8 h-8" />
            <h1 className="text-3xl font-extrabold">Seller Directory</h1>
          </div>
          <p className="text-white/80">{sellers.length} verified sellers offering quality products.</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Sellers</span>
        </nav>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search sellers..."
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>

        {/* Seller Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="flex gap-4"><div className="w-14 h-14 bg-slate-100 rounded-xl" /><div className="flex-1"><div className="h-4 bg-slate-100 rounded w-3/4 mb-2" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(seller => (
              <Link key={seller.id} href={`/seller/${seller.id}`}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-2xl font-black text-blue-600 shrink-0">
                    {seller.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{seller.name}</h3>
                      {seller.verified && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {seller.rating}
                        <span className="text-slate-400 font-normal">({seller.reviews.toLocaleString()})</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {seller.location}</span>
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {seller.products} products</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 mt-2" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
