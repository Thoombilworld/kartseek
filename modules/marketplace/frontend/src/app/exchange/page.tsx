'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw, ChevronRight, Smartphone, Laptop, Tablet, Watch, Headphones, Camera,
  CheckCircle, ArrowRight, ArrowLeft, PackageX, Loader2, AlertCircle, Info,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getExchangeOffers, type ExchangeOffer } from '@/lib/api/marketplace';

/**
 * Trade-in quoting.
 *
 * This page used to be entirely client-side fiction. `BASE_VALUES` hardcoded a
 * price per category (`Smartphones: 5500`), `CATEGORIES` hardcoded four device
 * types with brand lists, and the quote was `baseValue * multiplier` — so it
 * showed every visitor the same figure, in a currency the region context
 * formatted but nothing had priced, for programmes that may not have been
 * running at all. `GET /marketplace/offers/exchange` has existed and been
 * repository-backed the whole time; nothing called it.
 *
 * It also told the customer "This value will be deducted from your next
 * purchase at checkout", which the checkout has no code to honour — there is no
 * exchange field in `placeOrder` and no line for it in the order summary. That
 * sentence was a promise the system could not keep, so it is gone; the page now
 * says what actually happens next.
 */

/** Category icons, matched by name. Presentation only — the list is server-driven. */
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  smartphone: Smartphone, phone: Smartphone, mobile: Smartphone,
  laptop: Laptop, computer: Laptop,
  tablet: Tablet, ipad: Tablet,
  watch: Watch, wearable: Watch,
  headphone: Headphones, audio: Headphones,
  camera: Camera,
};

function iconFor(category: string): React.ElementType {
  const key = category.toLowerCase();
  return Object.entries(CATEGORY_ICONS).find(([k]) => key.includes(k))?.[1] ?? RefreshCw;
}

/**
 * Grading schedule used when an offer does not carry its own.
 *
 * These are fractions of the offer's own ceiling, not currency amounts — the
 * money always comes from `maxExchangeValue`. An operator can override the
 * whole schedule per offer via `eligibilityCriteria.conditionMultipliers`.
 */
const DEFAULT_CONDITION_MULTIPLIERS: Record<string, number> = {
  Excellent: 1.0,
  Good: 0.7,
  Fair: 0.4,
  Poor: 0.18,
};

const CONDITION_COPY: Record<string, { desc: string; color: string; bg: string; border: string }> = {
  Excellent: { desc: 'Like new — no scratches, fully functional, original box', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  Good: { desc: 'Minor scratches, fully functional, all buttons work', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  Fair: { desc: 'Visible wear, functional with minor issues', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  Poor: { desc: 'Heavy wear, screen damage, partially functional', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

const FULFILLMENT_COPY: Record<string, string> = {
  PICKUP: 'A courier collects the device from your address when your new order is delivered.',
  DROP_OFF: 'Drop the device at a partner collection point after your order is confirmed.',
  COURIER: 'We send a prepaid courier label once the exchange is approved.',
};

export default function ExchangeOfferPage() {
  const { formatCurrencyValue } = useRegion();
  const [offers, setOffers] = useState<ExchangeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');

  useEffect(() => {
    let cancelled = false;
    getExchangeOffers()
      .then(res => {
        if (cancelled) return;
        // Only offers that can actually quote a number are usable here; one
        // with no ceiling would render "up to undefined".
        setOffers((res?.data ?? []).filter(o => Number(o.maxExchangeValue ?? 0) > 0));
      })
      .catch(() => {
        if (cancelled) return;
        // No invented fallback: an unreachable offers service means we do not
        // know what any device is worth, and saying so beats guessing.
        //
        // The raw `err.message` is not shown — a network failure surfaces as the
        // literal string "Failed to fetch", which tells a shopper nothing and
        // reads as a broken page rather than a temporary one.
        setError('We couldn’t reach the trade-in service. Please try again in a moment.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedOffer = useMemo(
    () => offers.find(o => o.id === selectedOfferId) ?? null,
    [offers, selectedOfferId],
  );

  /** The offer's own schedule if it has one, otherwise the documented default. */
  const conditionMultipliers = useMemo(() => {
    const custom = selectedOffer?.eligibilityCriteria?.conditionMultipliers;
    return custom && Object.keys(custom).length > 0 ? custom : DEFAULT_CONDITION_MULTIPLIERS;
  }, [selectedOffer]);

  /** Quote for a grade, clamped to the bounds the offer itself declares. */
  const quoteFor = React.useCallback((condition: string): number => {
    if (!selectedOffer) return 0;
    const ceiling = Number(selectedOffer.maxExchangeValue ?? 0);
    const floor = Number(selectedOffer.minExchangeValue ?? 0);
    const raw = ceiling * (conditionMultipliers[condition] ?? 0);
    return Math.round(Math.min(ceiling, Math.max(floor, raw)));
  }, [selectedOffer, conditionMultipliers]);

  const conditions = useMemo(
    () => Object.keys(conditionMultipliers)
      .filter(level => CONDITION_COPY[level])
      .sort((a, b) => (conditionMultipliers[b] ?? 0) - (conditionMultipliers[a] ?? 0)),
    [conditionMultipliers],
  );

  const bonus = Number(selectedOffer?.bonusAmount ?? 0);
  const quote = selectedCondition ? quoteFor(selectedCondition) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30">
      <section className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-8 h-8" />
            <h1 className="text-3xl font-extrabold">Exchange Offer</h1>
          </div>
          <p className="text-white/80 text-lg">Trade in your old device towards a new one.</p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Exchange</span>
        </nav>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading current exchange offers…
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="font-semibold text-red-800">Exchange offers are unavailable right now</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && offers.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <PackageX className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="font-semibold text-slate-800">No exchange programmes are running right now</p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Trade-in offers run for limited periods. Check back, or browse the marketplace in the meantime.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Browse products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {!loading && !error && offers.length > 0 && (
          <>
            <div className="flex items-center justify-center gap-2 mb-8">
              {['Select Device', 'Condition', 'Value'].map((label, i) => (
                <React.Fragment key={label}>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${step > i + 1 ? 'bg-green-100 text-green-700' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {step > i + 1 ? <CheckCircle className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{i + 1}</span>}
                    {label}
                  </div>
                  {i < 2 && <div className={`w-8 h-0.5 ${step > i + 1 ? 'bg-green-300' : 'bg-slate-200'}`} />}
                </React.Fragment>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 mb-4">What device do you want to exchange?</h2>
                <div className="grid grid-cols-2 gap-4">
                  {offers.map(offer => {
                    const label = offer.exchangeCategory || offer.title || 'Device';
                    const Icon = iconFor(label);
                    return (
                      <button
                        key={offer.id}
                        onClick={() => { setSelectedOfferId(offer.id); setSelectedCondition(''); setStep(2); }}
                        className="bg-white border-2 border-slate-200 hover:border-blue-400 rounded-xl p-6 text-center transition-all hover:shadow-lg group"
                      >
                        <Icon className="w-10 h-10 mx-auto mb-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <div className="font-semibold text-slate-800">{label}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          up to {formatCurrencyValue(Number(offer.maxExchangeValue ?? 0))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && selectedOffer && (
              <div className="space-y-4">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2">
                  <ArrowLeft className="w-4 h-4" /> Change device
                </button>
                <h2 className="text-lg font-bold text-slate-800">
                  What condition is your{' '}
                  <span className="text-blue-600">{selectedOffer.exchangeCategory || 'device'}</span> in?
                </h2>
                <div className="space-y-3">
                  {conditions.map(level => {
                    const copy = CONDITION_COPY[level];
                    return (
                      <button
                        key={level}
                        onClick={() => { setSelectedCondition(level); setStep(3); }}
                        className={`w-full ${copy.bg} border ${copy.border} rounded-xl p-5 text-left transition-all hover:shadow-md flex items-center justify-between`}
                      >
                        <div>
                          <div className={`font-bold ${copy.color}`}>{level}</div>
                          <div className="text-sm text-slate-500 mt-0.5">{copy.desc}</div>
                        </div>
                        <div className={`font-bold text-lg ${copy.color}`}>
                          Up to {formatCurrencyValue(quoteFor(level))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && selectedOffer && (
              <div className="text-center space-y-6">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                  <ArrowLeft className="w-4 h-4" /> Re-evaluate
                </button>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8">
                  <div className="text-sm text-slate-500 mb-1">Indicative exchange value</div>
                  <div className="text-5xl font-black text-green-600 mb-2">{formatCurrencyValue(quote)}</div>
                  {bonus > 0 && (
                    <div className="text-sm font-semibold text-emerald-700 mb-2">
                      + {formatCurrencyValue(bonus)} exchange bonus on this offer
                    </div>
                  )}
                  <div className="text-slate-500">
                    {selectedOffer.exchangeCategory} • {selectedCondition} condition
                  </div>
                </div>

                {/* What the customer is actually being told, rather than a
                    checkout deduction the order flow cannot apply. */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-left flex gap-3">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">This is an estimate, not a final price.</p>
                    <p className="mt-1 text-blue-700">
                      {FULFILLMENT_COPY[selectedOffer.fulfillmentMode] ?? FULFILLMENT_COPY.PICKUP}{' '}
                      The final value is confirmed after the device is inspected, and the offer runs until{' '}
                      {new Date(selectedOffer.expiresAt).toLocaleDateString()}.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
                    Shop Now <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
