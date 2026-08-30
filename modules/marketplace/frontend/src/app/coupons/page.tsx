'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Tag, Copy, Check, Clock, Search, Sparkles, Zap } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getCoupons } from '@/lib/api/marketplace';

/**
 * Coupons a shopper can apply at checkout.
 *
 * This page used to render a fixed ten-entry `COUPONS` array — SAVE5, FIRST500,
 * HDFC10, MOBILE5K and friends, with invented minimums, caps and expiry dates.
 * None of those codes existed in `marketplace.coupons`, so every one of them was
 * rejected by `POST /coupons/validate` the moment it was pasted into checkout:
 * the page's entire purpose was to hand out codes that could not be redeemed.
 * The amounts were also written with a literal `₹`, so a shopper in Doha was
 * quoted rupee savings.
 *
 * It now lists the real active coupons for the market being browsed.
 */

interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  validUntil: string | null;
  firstOrderOnly: boolean;
  usageLimitPerUser: number;
}

function normalise(row: any): Coupon {
  return {
    id: String(row?.id ?? row?.code ?? ''),
    code: String(row?.code ?? ''),
    description: row?.description || row?.title || '',
    discountType: String(row?.discountType ?? 'PERCENTAGE').toUpperCase(),
    discountValue: Number(row?.discountValue ?? 0) || 0,
    maxDiscount: row?.maxDiscount != null ? Number(row.maxDiscount) : null,
    minOrderValue: Number(row?.minOrderValue ?? 0) || 0,
    validUntil: row?.validUntil ?? null,
    firstOrderOnly: row?.firstOrderOnly === true,
    usageLimitPerUser: Number(row?.usageLimitPerUser ?? 0) || 0,
  };
}

export default function CouponsPage() {
  const { formatCurrencyValue: fmt } = useRegion();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    let cancelled = false;
    getCoupons({ isActive: true, limit: 100 })
      .then((res: any) => {
        if (cancelled) return;
        const rows = res?.data ?? res?.coupons ?? res;
        setCoupons(Array.isArray(rows) ? rows.map(normalise).filter(c => c.code) : []);
      })
      .catch(() => { if (!cancelled) setCoupons([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter(c =>
      c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [coupons, search]);

  const daysLeft = (date: string | null) =>
    date ? Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000) : null;

  const expiringSoon = filtered.filter(c => {
    const days = daysLeft(c.validUntil);
    return days !== null && days <= 7 && days > 0;
  });

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const formatExpiry = (date: string | null) => {
    const days = daysLeft(date);
    if (days === null) return 'No expiry';
    if (days <= 0) return 'Expired';
    if (days === 1) return 'Expires tomorrow';
    if (days <= 7) return `Expires in ${days} days`;
    return `Valid till ${new Date(date as string).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  // Currency amounts go through the region formatter; a percentage is a plain
  // number and must not be run through it.
  const discountLabel = (c: Coupon) =>
    c.discountType === 'PERCENTAGE'
      ? `${c.discountValue}% off${c.maxDiscount ? ` up to ${fmt(c.maxDiscount)}` : ''}`
      : `${fmt(c.discountValue)} off`;

  return (
    <div className="max-w-6xl mx-auto px-3 xs:px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">Coupons & Offers</span>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2"><Zap className="w-5 h-5" /><span className="text-sm font-bold uppercase tracking-wider">Save More</span></div>
          <h1 className="text-3xl font-black mb-2">Coupons & Offers</h1>
          <p className="text-orange-100">Browse available coupons and apply them at checkout to save more on your orders.</p>
        </div>
      </div>

      {/* Search */}
      {coupons.length > 0 && (
        <div className="relative mb-6 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search coupons..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-400 outline-none" />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Tag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">No coupons available right now</h3>
          <p className="text-sm text-slate-500">Check back soon — new offers are added regularly.</p>
          <Link href="/deals" className="inline-block mt-4 text-sm font-bold text-blue-600 hover:underline">
            Browse today&apos;s deals
          </Link>
        </div>
      ) : (
        <>
          {/* Expiring Soon */}
          {expiringSoon.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-black text-red-600 flex items-center gap-1.5 mb-3"><Clock className="w-4 h-4" /> Expiring Soon</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {expiringSoon.map(c => (
                  <div key={c.id} className="min-w-[280px] bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-mono font-bold text-red-700 text-sm">{c.code}</span>
                      <p className="text-xs text-red-600 mt-0.5">{c.description || discountLabel(c)}</p>
                      <p className="text-[10px] text-red-400 mt-0.5">{formatExpiry(c.validUntil)}</p>
                    </div>
                    <button onClick={() => handleCopy(c.code)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0">
                      {copiedCode === c.code ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Coupons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(c => {
              const days = daysLeft(c.validUntil);
              const isExpired = days !== null && days <= 0;
              return (
                <div key={c.id} className={`bg-white border rounded-2xl overflow-hidden flex ${isExpired ? 'opacity-50 border-slate-200' : 'border-slate-200 hover:shadow-md transition-shadow'}`}>
                  <div className="w-2 bg-gradient-to-b from-blue-500 to-violet-500 shrink-0" />
                  <div className="flex-1 p-5 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono font-black text-blue-700 text-base bg-blue-50 px-3 py-1 rounded-lg border border-dashed border-blue-300">{c.code}</span>
                        {c.firstOrderOnly && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> First order</span>}
                      </div>
                      <p className="text-sm text-slate-700 font-medium mt-2">{c.description || discountLabel(c)}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-500">
                        {c.minOrderValue > 0 && <span>Min: {fmt(c.minOrderValue)}</span>}
                        {c.discountType === 'PERCENTAGE' && c.maxDiscount != null && <span>Max: {fmt(c.maxDiscount)}</span>}
                        {c.usageLimitPerUser > 0 && <span>{c.usageLimitPerUser} per user</span>}
                      </div>
                      <p className={`text-[11px] font-bold mt-1.5 ${days !== null && days <= 7 ? 'text-red-500' : 'text-slate-400'}`}>
                        {formatExpiry(c.validUntil)}
                      </p>
                    </div>
                    <button onClick={() => handleCopy(c.code)} disabled={isExpired}
                      className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors shrink-0 ${copiedCode === c.code ? 'bg-green-100 text-green-700' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-40`}>
                      {copiedCode === c.code ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Code</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Tag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">No coupons found</h3>
              <p className="text-sm text-slate-500">Try a different search.</p>
            </div>
          )}
        </>
      )}

      {/* How to use */}
      <div className="mt-12 bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <h2 className="font-black text-slate-900 mb-4">How to Use Coupons</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Copy the Code', desc: 'Click "Copy Code" on any coupon above' },
            { step: '2', title: 'Add to Cart', desc: 'Shop and add items to your cart' },
            { step: '3', title: 'Apply at Checkout', desc: 'Paste the code in the coupon field and enjoy savings!' },
          ].map(s => (
            <div key={s.step} className="flex gap-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-sm shrink-0">{s.step}</div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{s.title}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
