'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Star, Clock, Search, SlidersHorizontal, ChevronRight, Truck, Store as StoreIcon } from 'lucide-react';
// GROCERY_STORES and its helpers are gone with the demo merge that used them.
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';
import type { GroceryStoreApi } from '@/lib/grocery-api';
import { storePath } from '@/lib/grocery/urls';
import { railsFor, STORE_RAILS, isRailKey } from '@/lib/grocery/store-rails';
import { deliveryWindow, distanceKm, distanceLabel } from '@/lib/grocery/delivery-estimate';

// ── Filter options ──────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'delivery', label: 'Fastest Delivery' },
  { key: 'distance', label: 'Nearest' },
  { key: 'orders', label: 'Most Popular' },
];


export default function GroceryStoresPage() {
  const { formatPrice, tr, config } = useGroceryLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  // A rail's "View All" arrives as ?type=<railKey>; anything else means "all",
  // so a hand-edited or stale link shows the whole directory rather than nothing.
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const [activeType, setActiveType] = useState(isRailKey(typeParam) ? typeParam! : 'all');
  const [apiStores, setApiStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch stores from API
  useEffect(() => {
    let lat: number | undefined;
    let lng: number | undefined;

    const fetchStores = async () => {
      // Try geolocation
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch { /* fallback without coords */ }
      }

      try {
        const res = await groceryApi.getNearbyStores(lat, lng, 1, 50);
        if (res?.data?.length > 0) {
          const mapped = res.data.map((s: GroceryStoreApi) => {
            // Calculate distance from user's location using Haversine formula
            // The distance is kept as a number and formatted separately.
            //
            // The estimate below used to recover it with
            // `parseFloat(distStr)` — parsing the string it had just
            // formatted. Under a kilometre that string is "450 m", so
            // parseFloat returned 450 and the estimate treated it as 450 km:
            // a shop 300 m away advertised "910-920 min" and one at 900 m
            // "2710-2720 min". It hit only the nearest shops, which are
            // exactly the ones a grocery shopper picks.
            const distKm = distanceKm({ lat, lng }, { lat: s.latitude, lng: s.longitude });
            const distStr = distanceLabel(distKm);
            const deliveryTimeStr = deliveryWindow(distKm);

            return {
              id: s.id, name: s.name,
              logoUrl: typeof s.logoUrl === 'string' ? s.logoUrl : undefined,
              emoji: '🛒',
              description: s.address || '',
              category: s.storeTypes?.[0] || 'grocery',
              rating: Number(s.rating ?? 0), reviewCount: String(s.totalOrders ?? '0'),
              reviews: s.totalOrders ?? 0,
              deliveryTime: deliveryTimeStr,
              deliveryFee: Number(s.deliveryFee ?? 0), minOrder: Number(s.minOrderAmount ?? 0),
              // `status === 'active'` never matched: the column holds
              // PENDING_KYC / APPROVED / SUSPENDED, so every store from the API
              // rendered as closed. Whether a shop is taking orders right now is
              // `isOnline`; `status` is its lifecycle state.
              isOpen: !!s.isOnline && s.status === 'APPROVED', isPromoted: false,
              // Same derivation as the homepage's rails, so a "View All" arriving
              // here lands on exactly the shops the rail was showing. This was
              // `s.storeTypes`, whose values are display names like "Butchery" —
              // an exact match against a rail key such as `meat-fish` is never
              // true, so most of the filter chips selected nothing at all.
              tags: s.tags ?? [], section: railsFor(s),
              distance: distStr,
            };
          });
          setApiStores(mapped);
        }
      } catch (e) {
        // Surfaced instead of silently substituting the demo catalogue, which made
        // an outage look like a normal storefront listing shops that do not exist.
        setLoadError(e instanceof Error ? e.message : 'Could not load nearby stores');
      }
      finally { setIsLoading(false); }
    };
    fetchStores();
  }, []);

  /**
   * Real stores only.
   *
   * This used to append `GROCERY_STORES` — the demo catalogue — behind whatever
   * the API returned, and fall back to it entirely on failure. Every one of those
   * shops has an id nothing serves, so the listing was padded with entries that
   * 404 the moment a customer clicks one.
   */
  const allStores = apiStores;

  // Filter & sort
  const filteredStores = useMemo(() => {
    let stores = allStores.filter(s => s.isOpen);

    if (activeType !== 'all') {
      stores = stores.filter(s => s.section?.includes(activeType));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      stores = stores.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        s.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case 'rating': stores.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case 'delivery': stores.sort((a, b) => parseInt(a.deliveryTime || '99') - parseInt(b.deliveryTime || '99')); break;
      case 'distance': stores.sort((a, b) => parseFloat(a.distance || '99') - parseFloat(b.distance || '99')); break;
      case 'orders': stores.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0)); break;
    }

    return stores;
  }, [allStores, activeType, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-slate-200 rounded-xl" />
          <div className="flex-1 space-y-2"><div className="h-6 bg-slate-200 rounded w-40" /><div className="h-4 bg-slate-100 rounded w-32" /></div>
        </div>
        <div className="h-10 bg-slate-100 rounded-xl mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
              <div className="h-28 bg-gradient-to-br from-green-50 to-emerald-50" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="flex gap-2"><div className="h-3 bg-slate-100 rounded w-16" /><div className="h-3 bg-slate-100 rounded w-20" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/grocery" className="w-11 h-11 shrink-0 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm" aria-label={tr('Back')}>
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{tr('Grocery Stores')}</h1>
          <p className="text-sm text-slate-500">{filteredStores.length} {tr('stores near you')}</p>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tr('Search stores by name or type...')}
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 shadow-sm"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2.5 min-h-[44px] bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
          aria-label={tr('Sort stores')}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.key} value={o.key}>{tr(o.label)}</option>
          ))}
        </select>
      </div>

      {/* Type Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mb-5">
        {STORE_RAILS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveType(t.key)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-full text-sm font-bold transition-all ${
              activeType === t.key
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-green-50 hover:border-green-200'
            }`}
          >
            <span>{t.emoji}</span> {tr(t.label)}
          </button>
        ))}
      </div>

      {/* An outage and "nothing near you" are different answers, and the customer
          can act on only one of them. */}
      {loadError ? (
        <div role="alert" className="text-center py-16">
          <StoreIcon className="w-12 h-12 text-red-200 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">{tr('We could not load nearby stores')}</h3>
          <p className="text-sm text-slate-500">{loadError}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm font-bold text-green-600 hover:underline">{tr('Try again')}</button>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="text-center py-16">
          <StoreIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-600 mb-1">{tr('No stores found')}</h3>
          <p className="text-sm text-slate-400">
            {searchQuery || activeType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No grocery stores are delivering to your area yet.'}
          </p>
          {(searchQuery || activeType !== 'all') && (
            <button onClick={() => { setSearchQuery(''); setActiveType('all'); }} className="mt-3 text-sm font-bold text-green-600 hover:underline">{tr('Clear filters')}</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map(store => (
            <Link
              key={store.id}
              href={storePath(store)}
              className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-lg hover:border-green-200 transition-all duration-200"
            >
              {/* Store Banner */}
              <div className="h-28 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative flex items-center justify-center">
                <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{store.emoji}</span>
                {store.isPromoted && (
                  <span className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">{tr('SPONSORED')}</span>
                )}
                {store.offerBadge && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">{store.offerBadge}</span>
                )}
              </div>

              {/* Store Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-green-600 transition-colors line-clamp-1">{store.name}</h3>
                  {store.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{store.rating}
                    </span>
                  )}
                </div>

                {store.description && (
                  <p className="text-xs text-slate-400 line-clamp-1 mb-2">{store.description}</p>
                )}

                {/* Tags */}
                {store.tags && store.tags.length > 0 && (
                  <div className="flex gap-1 mb-2.5 flex-wrap">
                    {store.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}

                {/* Delivery Info */}
                <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3.5 h-3.5 text-green-500" />{store.deliveryTime}
                  </span>
                  {store.distance && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />{store.distance}
                    </span>
                  )}
                  <span className={`ml-auto text-xs font-semibold ${store.deliveryFee === 0 ? 'text-green-600' : 'text-slate-500'}`}>
                    {store.deliveryFee === 0 ? 'Free Delivery' : `${formatPrice(store.deliveryFee)} delivery`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
