'use client';

import React, { useState } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  DollarSign,
  Save,
  Car,
  Edit3,
  CheckCircle,
  Calculator,
  Moon,
  Plane,
  MapPin,
  Key,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';
import type { TaxiRateCard, TaxiRateCardInput } from '@/lib/api/admin-taxi';
import { useAdminData } from '@/hooks/useAdminData';
import {
  AdminForbidden,
  AdminLoading,
  AdminNotConnected,
  classifyApiFailure,
  type ApiFailureKind,
} from '@/components/admin/api-states';

/**
 * Fare rate cards — the `taxi_rate_cards` rows for one market.
 *
 * What was here before: `defaultRateCards`, five invented cards seeded into
 * state; a GET to `/admin/taxi/rates?country=IN` (the route's parameter is
 * `countryCode`, so the market was missing and the call 400'd) with no
 * `Authorization` header and no envelope unwrap; and a save that posted
 * `{ country, rates: [...] }` — a *batch* — to a route that upserts one card
 * and reads `dto.countryCode`, so it had never once succeeded. The page showed
 * "Saved!" for all of it.
 *
 * A card is now posted per vehicle type, as `RateCardUpsertDto`, and the screen
 * reports what the server accepted.
 *
 * The rental and intercity tabs used to render invented price matrices —
 * hourly/daily/weekly rates, eight add-on prices, and five named intercity
 * routes — multiplied by a country factor from a local config file. No route
 * serves any of it, so it is not drawn. `GET/POST /admin/taxi/routes` exists on
 * the gateway but `admin.taxi.routes` has no handler in taxi-service and
 * answers 503, which is stated rather than papered over.
 */

// ─── Data ─────────────────────────────────────────────────────────────────────

export const RATES_ROUTE = 'GET /admin/taxi/rates';

/** One row per market, and only one — a duplicate `IN` entry used to win with a `₹` currency. */
export const COUNTRY_OPTIONS = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AE', label: 'UAE' },
  { code: 'QA', label: 'Qatar' },
] as const;

const VEHICLE_ICONS: Record<string, string> = {
  economy: '🚗',
  comfort: '🚙',
  premium: '🏎️',
  bike: '🏍️',
  suv: '🚐',
  delivery: '📦',
  rickshaw: '🛺',
  luxury: '🚘',
};

const EDITABLE_RATES = [
  'baseFare',
  'distanceRate',
  'timeRate',
  'minimumFare',
  'waitingRate',
  'nightSurcharge',
  'airportSurcharge',
  'cancellationFee',
] as const;

type RateField = (typeof EDITABLE_RATES)[number];

/** Postgres returns `decimal` columns as strings. */
const nz = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};

/**
 * A fetched card reduced to the body `POST /admin/taxi/rates` accepts.
 *
 * `id`, `createdAt` and `updatedAt` are dropped because `RateCardUpsertDto`
 * declares none of them and the pipe runs `forbidNonWhitelisted` — posting the
 * row straight back is `property id should not exist`. The card is keyed on
 * (countryCode, vehicleType), which is why both are always sent.
 */
export function toRateCardInput(card: TaxiRateCard, countryCode: string): TaxiRateCardInput {
  return {
    countryCode,
    vehicleType: card.vehicleType,
    displayName: card.displayName || card.vehicleType,
    baseFare: nz(card.baseFare),
    distanceRate: nz(card.distanceRate),
    timeRate: nz(card.timeRate),
    minimumFare: nz(card.minimumFare),
    waitingRate: nz(card.waitingRate),
    nightSurcharge: nz(card.nightSurcharge),
    airportSurcharge: nz(card.airportSurcharge),
    cancellationFee: nz(card.cancellationFee),
    maxPassengers: nz(card.maxPassengers, 1),
    maxLuggage: nz(card.maxLuggage, 0),
    sortOrder: nz(card.sortOrder, 0),
    isActive: !!card.isActive,
  };
}

export type PricingResult =
  | { ok: true; cards: TaxiRateCard[]; currency: string | null }
  | { ok: false; kind: ApiFailureKind; message: string };

/**
 * The cards, plus the market's currency.
 *
 * The currency is not on a rate card — it is one column of the country
 * configuration — and the fare figures are meaningless without it, so the two
 * are read together. A configuration that will not load costs the symbol, not
 * the rates.
 */
export async function loadPricing(countryCode: string): Promise<PricingResult> {
  const [rates, config] = await Promise.all([
    adminTaxiApi.getRateCards(countryCode),
    adminTaxiApi.getConfig(countryCode),
  ]);
  if (!rates.success) {
    const message = rates.error || 'The rate cards did not answer';
    return { ok: false, kind: classifyApiFailure(message), message };
  }
  return {
    ok: true,
    cards: Array.isArray(rates.data) ? rates.data : [],
    currency: config.success ? (config.data?.currency ?? null) : null,
  };
}

// ─── Fare calculator ──────────────────────────────────────────────────────────

function FareCalculator({ cards, currency }: { cards: TaxiRateCard[]; currency: string }) {
  const [dist, setDist] = useState(10);
  const [time, setTime] = useState(20);
  const [vt, setVt] = useState('');

  const card = cards.find((c) => c.vehicleType === vt) || cards[0];
  if (!card) return null;

  const fare = Math.max(
    nz(card.baseFare) + nz(card.distanceRate) * dist + nz(card.timeRate) * time,
    nz(card.minimumFare),
  );

  return (
    <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-4 h-4 text-emerald-400" />
        <h4 className="text-sm font-bold">Fare preview calculator</h4>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label
            className="text-[10px] text-slate-400 font-medium block mb-1"
            htmlFor="calc-vehicle-select"
          >
            Vehicle
          </label>
          <select
            title="Select vehicle type"
            value={card.vehicleType}
            onChange={(e) => setVt(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            id="calc-vehicle-select"
          >
            {cards
              .filter((c) => c.isActive)
              .map((c) => (
                <option key={c.vehicleType} value={c.vehicleType}>
                  {VEHICLE_ICONS[c.vehicleType]} {c.displayName || c.vehicleType}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label
            className="text-[10px] text-slate-400 font-medium block mb-1"
            htmlFor="calc-distance"
          >
            Distance (km)
          </label>
          <input
            title="Distance"
            type="number"
            value={dist}
            onChange={(e) => setDist(+e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-xs font-bold text-white text-center"
            id="calc-distance"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1" htmlFor="calc-time">
            Time (min)
          </label>
          <input
            title="Time"
            type="number"
            value={time}
            onChange={(e) => setTime(+e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-xs font-bold text-white text-center"
            id="calc-time"
          />
        </div>
      </div>
      <div className="flex items-end justify-between border-t border-slate-700 pt-3">
        <div className="text-xs text-slate-400 space-y-0.5">
          <p>
            Base: {currency} {nz(card.baseFare)} + {currency} {nz(card.distanceRate)}/km × {dist} +{' '}
            {currency} {nz(card.timeRate)}/min × {time}
          </p>
          <p>
            Min fare: {currency} {nz(card.minimumFare)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-medium">Estimated fare</p>
          <p className="text-2xl font-black text-emerald-400">
            {currency} {fare.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TaxiPricingPage() {
  const [country, setCountry] = useState('IN');
  const [draft, setDraft] = useState<TaxiRateCard[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [pricingTab, setPricingTab] = useState<'ride_hailing' | 'rentals' | 'intercity'>(
    'ride_hailing',
  );

  const { data, loading, error, refetch } = useAdminData<PricingResult>(
    () => loadPricing(country),
    [country],
  );

  const result = data ?? null;
  // The fetched cards until somebody edits one, their edits after that. There
  // is no seeded default set: a market with no rate cards says so.
  const loaded = result?.ok ? result.cards : null;
  const cards = draft ?? loaded;
  const failure = result?.ok
    ? null
    : result
      ? { kind: result.kind, message: result.message }
      : error
        ? { kind: classifyApiFailure(error), message: error }
        : null;

  const currency = (result?.ok ? result.currency : null) ?? '';

  const updateCard = (
    id: string,
    field: RateField | 'displayName' | 'isActive',
    value: unknown,
  ) => {
    setDraft(
      (draft ?? loaded ?? []).map((c) =>
        c.id === id ? ({ ...c, [field]: value } as TaxiRateCard) : c,
      ),
    );
    setSaveNote(null);
  };

  /** One POST per vehicle type — the route upserts a single card, never a batch. */
  const handleSave = async () => {
    if (!cards || cards.length === 0) return;
    setSaving(true);
    setSaveError(null);
    setSaveNote(null);
    const results = await Promise.all(
      cards.map((card) => adminTaxiApi.upsertRateCard(toRateCardInput(card, country))),
    );
    setSaving(false);
    setEditing(null);
    const accepted = results.filter((r) => r.success).length;
    const refused = results.find((r) => !r.success);
    if (refused) setSaveError(refused.error || 'A rate card was not saved');
    if (accepted > 0) setSaveNote(`${accepted} of ${cards.length} rate card(s) saved.`);
    setDraft(null);
    await refetch();
  };

  const currentCountry = COUNTRY_OPTIONS.find((c) => c.code === country);

  const header = (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-600" />
          Dynamic pricing &amp; rate cards
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Fare rates per vehicle type for one market, as `taxi_rate_cards` records them.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => void handleSave()}
          disabled={saving || !cards || cards.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md disabled:opacity-50"
          id="save-rates-btn"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save rate cards'}
        </button>
      </div>
    </div>
  );

  const countryPicker = (
    <div className="flex flex-wrap gap-2">
      {COUNTRY_OPTIONS.map((c) => (
        <button
          key={c.code}
          onClick={() => {
            setCountry(c.code);
            setDraft(null);
            setEditing(null);
            setSaveNote(null);
            setSaveError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
            country === c.code
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <CountryFlag code={c.code} size="md" /> {c.label}
        </button>
      ))}
    </div>
  );

  const tabs = (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
      {(
        [
          ['ride_hailing', '🚕 Ride-hailing'],
          ['rentals', '🚗 Rentals'],
          ['intercity', '🚌 Intercity'],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          onClick={() => setPricingTab(key)}
          className={`flex-1 px-4 py-2 rounded-md text-xs font-bold transition-colors ${
            pricingTab === key
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (loading && !cards) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {header}
        {tabs}
        {countryPicker}
        <AdminLoading rows={5} />
      </div>
    );
  }

  if (failure) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {header}
        {tabs}
        {countryPicker}
        {failure.kind === 'forbidden' ? (
          <AdminForbidden
            what="the fare rate cards"
            route={`${RATES_ROUTE}?countryCode=${country}`}
            message={failure.message}
          />
        ) : (
          <AdminNotConnected
            what="The fare rate cards"
            route={`${RATES_ROUTE}?countryCode=${country}`}
            error={failure.message}
            onRetry={() => void refetch()}
          />
        )}
      </div>
    );
  }

  const rows = cards ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {header}
      {saveError && (
        <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {saveError}
        </p>
      )}
      {saveNote && (
        <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          {saveNote}
        </p>
      )}
      {tabs}
      {countryPicker}

      {pricingTab === 'ride_hailing' && (
        <>
          <FareCalculator cards={rows} currency={currency} />

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Car className="w-4 h-4 text-indigo-500" />
                Rate cards — <CountryFlag code={currentCountry?.code ?? ''} size="sm" />{' '}
                {currentCountry?.label}
                {currency && (
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {currency}
                  </span>
                )}
              </h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-bold">
                {rows.filter((c) => c.isActive).length} active vehicle types
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Vehicle</th>
                    <th className="px-3 py-3 font-semibold text-right">Base</th>
                    <th className="px-3 py-3 font-semibold text-right">/km</th>
                    <th className="px-3 py-3 font-semibold text-right">/min</th>
                    <th className="px-3 py-3 font-semibold text-right">Min fare</th>
                    <th className="px-3 py-3 font-semibold text-right">Wait/min</th>
                    <th className="px-3 py-3 font-semibold text-right">
                      <Moon className="w-3.5 h-3.5 inline" />
                    </th>
                    <th className="px-3 py-3 font-semibold text-right">
                      <Plane className="w-3.5 h-3.5 inline" />
                    </th>
                    <th className="px-3 py-3 font-semibold text-right">Cancel</th>
                    <th className="px-3 py-3 font-semibold text-center">Pax</th>
                    <th className="px-3 py-3 font-semibold text-center">Status</th>
                    <th className="px-3 py-3 font-semibold text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((card) => {
                    const isEditing = editing === card.id;
                    return (
                      <tr
                        key={card.id}
                        className={`transition-colors ${isEditing ? 'bg-emerald-50/50' : 'hover:bg-slate-50/50'} ${!card.isActive ? 'opacity-50' : ''}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {VEHICLE_ICONS[card.vehicleType] || '🚗'}
                            </span>
                            <div>
                              {isEditing ? (
                                <input
                                  title="Display name"
                                  value={card.displayName ?? ''}
                                  onChange={(e) =>
                                    updateCard(card.id, 'displayName', e.target.value)
                                  }
                                  className="px-2 py-1 rounded border border-emerald-300 text-xs font-bold w-24"
                                />
                              ) : (
                                <p className="font-bold text-slate-900 text-xs">
                                  {card.displayName || card.vehicleType}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 font-mono">
                                {card.vehicleType}
                              </p>
                            </div>
                          </div>
                        </td>
                        {EDITABLE_RATES.map((field) => (
                          <td key={field} className="px-3 py-3 text-right">
                            {isEditing ? (
                              <input
                                title={`Edit ${field}`}
                                type="number"
                                value={nz(card[field])}
                                onChange={(e) =>
                                  updateCard(card.id, field, parseFloat(e.target.value) || 0)
                                }
                                className="w-16 px-1.5 py-1 rounded border border-emerald-300 text-xs font-bold text-right"
                              />
                            ) : (
                              <span className="font-bold text-slate-700 text-xs">
                                {nz(card[field])}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs font-bold text-slate-600">
                            {card.maxPassengers}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => updateCard(card.id, 'isActive', !card.isActive)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${card.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {card.isActive ? 'Active' : 'Off'}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => setEditing(isEditing ? null : card.id)}
                            className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-emerald-500 text-white' : 'hover:bg-slate-100 text-slate-400'}`}
                          >
                            {isEditing ? (
                              <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                              <Edit3 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <Car className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">
                  No rate cards are configured for {currentCountry?.label ?? country}.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {pricingTab === 'rentals' && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Key className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Rental pricing has no API yet.</p>
          <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
            This tab used to show hourly, daily and weekly rates, six vehicle classes, eight add-on
            prices and a deposit policy, all multiplied by a country factor held in a file in this
            console. Nothing served any of it, so nothing is shown. Ride-hailing rate cards are the
            only fares the platform actually stores.
          </p>
        </div>
      )}

      {pricingTab === 'intercity' && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">
            Intercity route pricing has no API yet.
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
            The five routes and three fare tiers shown here were written into this file.{' '}
            <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
              GET /admin/taxi/routes
            </code>{' '}
            exists on the gateway, but `admin.taxi.routes` has no handler in taxi-service and
            answers 503, so there is nothing to list.
          </p>
        </div>
      )}
    </div>
  );
}
