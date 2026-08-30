'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search, Star, MapPin, Clock, ChevronRight, Truck, ChevronLeft,
  AlertCircle, Loader2, Store as StoreIcon,
} from 'lucide-react';
import { pharmacyApi } from '@/lib/api/pharmacy';
import { useRegion } from '@/lib/contexts/region-context';

/**
 * All pharmacies.
 *
 * This page used to render a twelve-entry `ALL_STORES` array declared in the
 * file — HealthPlus, Apollo, MedPlus and friends, each with a literal
 * `minOrder: '₹299'` — while pharmacy-service held six real stores and answered
 * /api/v1/pharmacy/stores correctly. Two things followed from that: seeding the
 * module changed nothing on screen, and the page looked identical whether the
 * service was healthy or down.
 *
 * It now reads the API. Loading, failure and genuinely-empty are three distinct
 * states with three distinct messages, because collapsing them is how an outage
 * ends up reading as "no pharmacies near you".
 *
 * Currency comes from the region context rather than a hardcoded rupee sign, so
 * a shopper in Doha sees QAR.
 */

/** Store categories are a fixed taxonomy, not records — safe to hold here. */
const CATEGORIES = [
  { id: 'c01', name: 'Medicines', emoji: '💊' },
  { id: 'c02', name: 'Baby Care', emoji: '🍼' },
  { id: 'c03', name: 'Personal Care', emoji: '🧴' },
  { id: 'c04', name: 'Health Devices', emoji: '🩺' },
  { id: 'c05', name: 'Vitamins & Supplements', emoji: '🧪' },
  { id: 'c06', name: 'First Aid', emoji: '🩹' },
  { id: 'c07', name: 'Skin Care', emoji: '🧖' },
  { id: 'c08', name: 'Hair Care', emoji: '💇' },
  { id: 'c09', name: "Women's Health", emoji: '♀️' },
  { id: 'c10', name: 'Diabetic Care', emoji: '🩸' },
  { id: 'c11', name: 'Orthopedic Support', emoji: '🦴' },
  { id: 'c12', name: 'Elderly Care', emoji: '👴' },
  { id: 'c13', name: 'Wellness Products', emoji: '🧘' },
  { id: 'c14', name: 'Mother & Baby', emoji: '🤱' },
  { id: 'c15', name: 'Home Healthcare', emoji: '🏥' },
  { id: 'c16', name: 'Prescription Medicines', emoji: '📋' },
];

/** The fields this page reads. The API returns considerably more. */
interface PharmacyStore {
  id: string;
  slug?: string | null;
  name: string;
  city?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  rating?: string | number | null;
  deliveryFee?: string | number | null;
  minOrderAmount?: string | number | null;
  avgDeliveryMinutes?: number | null;
  isOpen?: boolean | null;
  categories?: string[] | null;
}

/** The API returns numerics as strings; `null` means "not set", not zero. */
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function PharmacyStoresListPage() {
  const searchParams = useSearchParams();
  const { formatCurrencyValue } = useRegion();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');

  const [stores, setStores] = useState<PharmacyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await pharmacyApi.getStores({ page: 1, limit: 50 });
        if (cancelled) return;
        // The gateway wraps list responses, so the rows sit one level in.
        const rows = (res as any)?.data ?? (Array.isArray(res) ? res : []);
        setStores(Array.isArray(rows) ? rows : []);
      } catch {
        if (cancelled) return;
        // Deliberately not falling back to placeholder stores: a shopper being
        // shown pharmacies that do not exist is worse than being told we could
        // not load them.
        setError('We could not load pharmacies just now. Please try again.');
        setStores([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const list = stores.filter((s) => {
      const matchesSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase());
      const matchesCat = !catFilter || (s.categories ?? []).includes(catFilter);
      return matchesSearch && matchesCat;
    });

    const sorted = [...list];
    if (sort === 'rating') {
      sorted.sort((a, b) => (num(b.rating) ?? 0) - (num(a.rating) ?? 0));
    } else if (sort === 'delivery') {
      // Stores with no stated delivery time sort last rather than first, which
      // is what a plain numeric compare on null would have done.
      sorted.sort((a, b) => (a.avgDeliveryMinutes ?? Infinity) - (b.avgDeliveryMinutes ?? Infinity));
    }
    return sorted;
  }, [stores, search, catFilter, sort]);

  const heading = catFilter ? `${catFilter} Pharmacies` : 'All Pharmacies';

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 3xl:px-8 py-6 space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors font-medium">
        <ChevronLeft className="w-4 h-4" /> Pharmacy Home
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
          <p className="text-sm text-slate-500">
            {loading
              ? 'Loading pharmacies…'
              : `${filtered.length} pharmacy store${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search stores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort pharmacies"
            title="Sort pharmacies"
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white"
          >
            <option value="">Default</option>
            <option value="rating">Top Rated</option>
            <option value="delivery">Fastest Delivery</option>
          </select>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        <button
          onClick={() => setCatFilter('')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${!catFilter ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'}`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCatFilter(catFilter === cat.name ? '' : cat.name)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${catFilter === cat.name ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'}`}
          >
            <span>{cat.emoji}</span> {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="h-32 bg-slate-100 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="bg-white rounded-2xl border border-red-200 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="font-bold text-slate-900 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Try again
          </button>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((store) => {
            const rating = num(store.rating);
            const fee = num(store.deliveryFee);
            const minOrder = num(store.minOrderAmount);
            return (
              <Link
                key={store.id}
                href={`/stores/${store.slug ?? store.id}`}
                className="bg-white rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-xl transition-all group overflow-hidden"
              >
                <div className="h-32 bg-linear-to-br from-teal-50 via-cyan-50 to-blue-50 relative flex items-center justify-center overflow-hidden">
                  {store.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.logoUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <StoreIcon className="w-12 h-12 text-teal-400 group-hover:scale-110 transition-transform" />
                  )}
                  {store.isOpen === false && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                      ● Closed
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 truncate">{store.name}</h3>
                    {rating !== null && (
                      <div className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                        <span className="text-xs font-black">{rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
                    {store.city && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{store.city}</span>
                    )}
                    {store.avgDeliveryMinutes != null && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{store.avgDeliveryMinutes} min</span>
                    )}
                    {fee !== null && (
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {fee === 0 ? 'Free' : formatCurrencyValue(fee)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {minOrder !== null ? `Min: ${formatCurrencyValue(minOrder)}` : ''}
                    </span>
                    <span className="text-xs font-bold text-teal-600 group-hover:text-teal-700 flex items-center gap-1">
                      View Pharmacy <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <span className="text-5xl mb-4 block">🔍</span>
          <p className="font-bold text-slate-900 text-xl">No pharmacies found</p>
          <p className="text-sm text-slate-500 mt-2">
            {search || catFilter
              ? 'Try a different category or search term'
              : 'No pharmacies are listed in your area yet'}
          </p>
          {(search || catFilter) && (
            <button
              onClick={() => { setCatFilter(''); setSearch(''); }}
              className="mt-4 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Browse All
            </button>
          )}
        </div>
      )}
    </div>
  );
}
