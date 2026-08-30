'use client';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import React, { useState, useEffect } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  DollarSign, Save, Car, Plus, Trash2, Edit3, CheckCircle,
  Calculator, Moon, Plane, Clock, Settings2, Globe, Key, MapPin,
  Fuel, Shield, ArrowRight,
} from 'lucide-react';
import { getCountryConfig } from '@/lib/config/rental-policies';
import { adminTaxiApi } from '@/lib/api/admin-taxi';
import { API_BASE_URL } from '@/lib/config/api-base';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RateCard {
  id: string;
  countryCode: string;
  vehicleType: string;
  displayName: string;
  baseFare: number;
  distanceRate: number;
  timeRate: number;
  minimumFare: number;
  waitingRate: number;
  nightSurcharge: number;
  airportSurcharge: number;
  cancellationFee: number;
  maxPassengers: number;
  maxLuggage: number;
  isActive: boolean;
  sortOrder: number;
}

const COUNTRY_OPTIONS = [
  { code: 'IN', label: 'India', currency: '₹', flag: '🇮🇳' },
  { code: 'IN', label: 'India', currency: 'INR', flag: '🇮🇳' },
  { code: 'US', label: 'United States', currency: 'USD', flag: '🇺🇸' },
  { code: 'NG', label: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'GB', label: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  { code: 'AE', label: 'UAE', currency: 'AED', flag: '🇦🇪' },
];

const VEHICLE_ICONS: Record<string, string> = {
  economy: '🚗', comfort: '🚙', premium: '🏎️', bike: '🏍️',
  suv: '🚐', delivery: '📦', rickshaw: '🛺', luxury: '🚘',
};

const defaultRateCards = (cc: string): RateCard[] => [
  { id: `${cc}-economy`,  countryCode: cc, vehicleType: 'economy',  displayName: 'Economy',  baseFare: 50,  distanceRate: 35, timeRate: 5,  minimumFare: 100, waitingRate: 2, nightSurcharge: 0,  airportSurcharge: 0,  cancellationFee: 50,  maxPassengers: 4, maxLuggage: 2, isActive: true, sortOrder: 0 },
  { id: `${cc}-comfort`,  countryCode: cc, vehicleType: 'comfort',  displayName: 'Comfort',  baseFare: 80,  distanceRate: 50, timeRate: 7,  minimumFare: 150, waitingRate: 3, nightSurcharge: 0,  airportSurcharge: 0,  cancellationFee: 80,  maxPassengers: 4, maxLuggage: 3, isActive: true, sortOrder: 1 },
  { id: `${cc}-premium`,  countryCode: cc, vehicleType: 'premium',  displayName: 'Premium',  baseFare: 120, distanceRate: 75, timeRate: 10, minimumFare: 250, waitingRate: 5, nightSurcharge: 30, airportSurcharge: 50, cancellationFee: 100, maxPassengers: 4, maxLuggage: 3, isActive: true, sortOrder: 2 },
  { id: `${cc}-bike`,     countryCode: cc, vehicleType: 'bike',     displayName: 'Bike',     baseFare: 30,  distanceRate: 18, timeRate: 3,  minimumFare: 50,  waitingRate: 1, nightSurcharge: 0,  airportSurcharge: 0,  cancellationFee: 20,  maxPassengers: 1, maxLuggage: 0, isActive: true, sortOrder: 3 },
  { id: `${cc}-suv`,      countryCode: cc, vehicleType: 'suv',      displayName: 'SUV',      baseFare: 100, distanceRate: 60, timeRate: 8,  minimumFare: 200, waitingRate: 4, nightSurcharge: 20, airportSurcharge: 30, cancellationFee: 80,  maxPassengers: 6, maxLuggage: 4, isActive: true, sortOrder: 4 },
];

// ─── Fare Calculator ────────────────────────────────────────────────────────

function FareCalculator({ cards, currency }: { cards: RateCard[]; currency: string }) {
  const [dist, setDist] = useState(10);
  const [time, setTime] = useState(20);
  const [vt, setVt] = useState(cards[0]?.vehicleType || 'economy');

  const card = cards.find(c => c.vehicleType === vt) || cards[0];
  if (!card) return null;

  const fare = Math.max(card.baseFare + card.distanceRate * dist + card.timeRate * time, card.minimumFare);

  return (
    <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-4 h-4 text-emerald-400" />
        <h4 className="text-sm font-bold">Fare Preview Calculator</h4>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1" htmlFor="calc-vehicle-select">Vehicle</label>
          <select title="Select vehicle type" value={vt} onChange={e => setVt(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-xs font-bold text-white" id="calc-vehicle-select">
            {cards.filter(c => c.isActive).map(c => (
              <option key={c.vehicleType} value={c.vehicleType}>{VEHICLE_ICONS[c.vehicleType]} {c.displayName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1" htmlFor="calc-distance">Distance (km)</label>
          <input title="Distance" placeholder="Distance in km" type="number" value={dist} onChange={e => setDist(+e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-xs font-bold text-white text-center" id="calc-distance" />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-medium block mb-1" htmlFor="calc-time">Time (min)</label>
          <input title="Time" placeholder="Time in min" type="number" value={time} onChange={e => setTime(+e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-xs font-bold text-white text-center" id="calc-time" />
        </div>
      </div>
      <div className="flex items-end justify-between border-t border-slate-700 pt-3">
        <div className="text-xs text-slate-400 space-y-0.5">
          <p>Base: {currency} {card.baseFare} + {currency} {card.distanceRate}/km × {dist} + {currency} {card.timeRate}/min × {time}</p>
          <p>Min fare: {currency} {card.minimumFare}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-medium">Estimated Fare</p>
          <p className="text-2xl font-black text-emerald-400">{currency} {fare.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TaxiPricingPage() {
  const { regionLabel, isFiltered, formatPrice } = useTaxiRegionFilter([]);
  const [country, setCountry] = useState('IN');
  const [cards, setCards] = useState<RateCard[]>(defaultRateCards('IN'));
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pricingTab, setPricingTab] = useState<'ride_hailing' | 'rentals' | 'intercity'>('ride_hailing');

  const currency = COUNTRY_OPTIONS.find(c => c.code === country)?.currency || '';
  const currentCountry = COUNTRY_OPTIONS.find(c => c.code === country);

  // Fetch rates from API
  const fetchRates = (code: string) => {
    fetch(`${API_BASE_URL}/taxi/admin/rates?country=${code}`, {
      signal: AbortSignal.timeout(5000),
    }).then(res => res.ok ? res.json() : null).then(data => {
      if (data?.rates?.length) setCards(data.rates);
    }).catch(() => { /* Keep default */ });
  };

  useEffect(() => { fetchRates(country); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCountry = (code: string) => {
    setCountry(code);
    setCards(defaultRateCards(code));
    setEditing(null);
    fetchRates(code);
  };

  const updateCard = (id: string, field: keyof RateCard, value: any) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    try {
      await fetch(`${API_BASE_URL}/taxi/admin/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, rates: cards }),
        signal: AbortSignal.timeout(5000),
      });
    } catch { /* Save failed silently */ }
    setSaved(true);
    setEditing(null);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Dynamic Pricing & Rate Cards
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure fare rates per vehicle type for each country. Changes take effect after save.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold"><CheckCircle className="w-4 h-4" /> Saved!</span>}
          <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md" id="save-rates-btn">
            <Save className="w-4 h-4" /> Save Rate Cards
          </button>
        </div>
      </div>

      {/* Pricing Mode Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {([['ride_hailing', '🚕 Ride-Hailing'], ['rentals', '🚗 Rentals'], ['intercity', '🚌 Intercity']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setPricingTab(key)} className={`flex-1 px-4 py-2 rounded-md text-xs font-bold transition-colors ${pricingTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {/* ═══ RIDE-HAILING TAB ═══ */}
      {pricingTab === 'ride_hailing' && (
        <>
      {/* Country Selector */}
      <div className="flex flex-wrap gap-2">
        {COUNTRY_OPTIONS.map(c => (
          <button key={c.code} onClick={() => selectCountry(c.code)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
              country === c.code ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <CountryFlag code={c.code} size="md" /> {c.label}
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">{c.currency}</span>
          </button>
        ))}
      </div>

      {/* Fare Calculator */}
      <FareCalculator cards={cards} currency={currency} />

      {/* Rate Cards Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Car className="w-4 h-4 text-indigo-500" />
            Rate Cards — <CountryFlag code={currentCountry?.code ?? ""} size="sm" /> {currentCountry?.label}
          </h3>
          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-bold">
            {cards.filter(c => c.isActive).length} active vehicle types
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
                <th className="px-3 py-3 font-semibold text-right">Min Fare</th>
                <th className="px-3 py-3 font-semibold text-right">Wait/min</th>
                <th className="px-3 py-3 font-semibold text-right"><Moon className="w-3.5 h-3.5 inline" /></th>
                <th className="px-3 py-3 font-semibold text-right"><Plane className="w-3.5 h-3.5 inline" /></th>
                <th className="px-3 py-3 font-semibold text-right">Cancel</th>
                <th className="px-3 py-3 font-semibold text-center">Pax</th>
                <th className="px-3 py-3 font-semibold text-center">Status</th>
                <th className="px-3 py-3 font-semibold text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cards.map(card => {
                const isEditing = editing === card.id;
                return (
                  <tr key={card.id} className={`transition-colors ${isEditing ? 'bg-emerald-50/50' : 'hover:bg-slate-50/50'} ${!card.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{VEHICLE_ICONS[card.vehicleType] || '🚗'}</span>
                        <div>
                          {isEditing ? (
                            <input title="Display Name" placeholder="Display Name" value={card.displayName} onChange={e => updateCard(card.id, 'displayName', e.target.value)} className="px-2 py-1 rounded border border-emerald-300 text-xs font-bold w-24" />
                          ) : (
                            <p className="font-bold text-slate-900 text-xs">{card.displayName}</p>
                          )}
                          <p className="text-[10px] text-slate-400 font-mono">{card.vehicleType}</p>
                        </div>
                      </div>
                    </td>
                    {(['baseFare', 'distanceRate', 'timeRate', 'minimumFare', 'waitingRate', 'nightSurcharge', 'airportSurcharge', 'cancellationFee'] as const).map(field => (
                      <td key={field} className="px-3 py-3 text-right">
                        {isEditing ? (
                          <input title={`Edit ${field}`} placeholder="Value" type="number" value={card[field]} onChange={e => updateCard(card.id, field, parseFloat(e.target.value) || 0)} className="w-16 px-1.5 py-1 rounded border border-emerald-300 text-xs font-bold text-right" />
                        ) : (
                          <span className="font-bold text-slate-700 text-xs">{card[field]}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-bold text-slate-600">{card.maxPassengers}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => updateCard(card.id, 'isActive', !card.isActive)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${card.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {card.isActive ? 'Active' : 'Off'}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => setEditing(isEditing ? null : card.id)} className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-emerald-500 text-white' : 'hover:bg-slate-100 text-slate-400'}`}>
                        {isEditing ? <CheckCircle className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* ═══ RENTAL PRICING TAB ═══ */}
      {pricingTab === 'rentals' && (() => {
        const rentalConfig = getCountryConfig(country);
        const cs = rentalConfig.pricing.currencySymbol;
        return (
          <div className="space-y-6">
            {/* Country Selector */}
            <div className="flex flex-wrap gap-2">
              {COUNTRY_OPTIONS.map(c => (
                <button key={c.code} onClick={() => selectCountry(c.code)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${country === c.code ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                  <CountryFlag code={c.code} size="md" /> {c.label}
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">{c.currency}</span>
                </button>
              ))}
            </div>

            {/* Rental Rate Matrix */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-500" />
                  Rental Rates — {rentalConfig.flag} {rentalConfig.countryName}
                </h3>
                <button onClick={handleSave} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold"><Save className="w-3 h-3" /> Save</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Vehicle Class</th>
                      <th className="px-3 py-3 font-semibold text-right">⏱️ Hourly</th>
                      <th className="px-3 py-3 font-semibold text-right">📅 Daily</th>
                      <th className="px-3 py-3 font-semibold text-right">📆 Weekly</th>
                      <th className="px-3 py-3 font-semibold text-right">👨‍✈️ Chauffeur/day</th>
                      <th className="px-3 py-3 font-semibold text-right">🛡️ Insurance/day</th>
                      <th className="px-3 py-3 font-semibold text-right">⛽ Extra KM</th>
                      <th className="px-3 py-3 font-semibold text-right">⏰ Overtime/hr</th>
                      <th className="px-3 py-3 font-semibold text-center">Pax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { cls: 'Economy', icon: '🚗', hourly: 800, daily: 3500, weekly: 17500, chauffeur: 1500, insurance: 200, extraKm: rentalConfig.pricing.extraKmRate, overtime: rentalConfig.pricing.overtimeHourlyRate, pax: 4 },
                      { cls: 'Comfort', icon: '🚙', hourly: 1200, daily: 5000, weekly: 27500, chauffeur: 2000, insurance: 350, extraKm: rentalConfig.pricing.extraKmRate, overtime: rentalConfig.pricing.overtimeHourlyRate, pax: 4 },
                      { cls: 'SUV', icon: '🚐', hourly: 2000, daily: 7500, weekly: 42000, chauffeur: 3000, insurance: 500, extraKm: Math.round(rentalConfig.pricing.extraKmRate * 1.5), overtime: Math.round(rentalConfig.pricing.overtimeHourlyRate * 1.3), pax: 6 },
                      { cls: 'Premium', icon: '🏎️', hourly: 3000, daily: 12000, weekly: 72000, chauffeur: 4000, insurance: 800, extraKm: Math.round(rentalConfig.pricing.extraKmRate * 2), overtime: Math.round(rentalConfig.pricing.overtimeHourlyRate * 1.5), pax: 4 },
                      { cls: 'Luxury', icon: '🚘', hourly: 5000, daily: 20000, weekly: 120000, chauffeur: 6000, insurance: 1500, extraKm: Math.round(rentalConfig.pricing.extraKmRate * 3), overtime: Math.round(rentalConfig.pricing.overtimeHourlyRate * 2), pax: 4 },
                      { cls: 'Van', icon: '🚐', hourly: 2500, daily: 9000, weekly: 50000, chauffeur: 2500, insurance: 600, extraKm: Math.round(rentalConfig.pricing.extraKmRate * 1.8), overtime: Math.round(rentalConfig.pricing.overtimeHourlyRate * 1.4), pax: 10 },
                    ].map(v => (
                      <tr key={v.cls} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3"><span className="text-lg mr-2">{v.icon}</span><span className="font-bold text-xs text-slate-900">{v.cls}</span></td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-xs">{cs}{(v.hourly * rentalConfig.pricing.baseMultiplier).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-xs">{cs}{(v.daily * rentalConfig.pricing.baseMultiplier).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-xs">{cs}{(v.weekly * rentalConfig.pricing.baseMultiplier).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-xs text-violet-600">{cs}{(v.chauffeur * rentalConfig.pricing.baseMultiplier).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-slate-500">{cs}{(v.insurance * rentalConfig.pricing.baseMultiplier).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-amber-600">{cs}{v.extraKm}/km</td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-red-600">{cs}{v.overtime}/hr</td>
                        <td className="px-3 py-3 text-center text-xs font-bold">{v.pax}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add-ons & Extras Pricing */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Plus className="w-4 h-4 text-yellow-500" /> Add-ons & Extras</h3>
              </div>
              <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: 'Child Seat', price: 500, icon: '👶', per: '/booking' },
                  { name: 'GPS Navigation', price: 300, icon: '📍', per: '/day' },
                  { name: 'Additional Driver', price: 1000, icon: '👤', per: '/day' },
                  { name: 'Premium Insurance', price: 800, icon: '🛡️', per: '/day' },
                  { name: 'WiFi Hotspot', price: 400, icon: '📶', per: '/day' },
                  { name: 'Roof Rack', price: 600, icon: '📦', per: '/booking' },
                  { name: 'Snow Chains', price: 400, icon: '❄️', per: '/booking' },
                  { name: 'Dashcam', price: 200, icon: '📹', per: '/day' },
                ].map(addon => (
                  <div key={addon.name} className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                    <p className="text-lg mb-1">{addon.icon}</p>
                    <p className="text-xs font-bold text-slate-800">{addon.name}</p>
                    <p className="text-sm font-black text-yellow-700">{cs}{(addon.price * rentalConfig.pricing.baseMultiplier).toLocaleString()} <span className="text-[10px] font-normal text-yellow-600">{addon.per}</span></p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancellation Fees & Deposit Policy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Cancellation Fees</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-emerald-50 rounded-lg"><span className="text-emerald-700">Free cancellation</span><span className="font-bold text-emerald-700">Up to {rentalConfig.rentalCancellation.freeCancellationHours}h before</span></div>
                  <div className="flex justify-between p-2 bg-amber-50 rounded-lg"><span className="text-amber-700">Partial refund</span><span className="font-bold text-amber-700">{rentalConfig.rentalCancellation.partialRefundPercent}% within {rentalConfig.rentalCancellation.partialRefundWindowHours}h</span></div>
                  <div className="flex justify-between p-2 bg-red-50 rounded-lg"><span className="text-red-700">No-show fee</span><span className="font-bold text-red-700">{rentalConfig.rentalCancellation.noShowFeePercent}% of total</span></div>
                  <div className="flex justify-between p-2 bg-orange-50 rounded-lg"><span className="text-orange-700">Late return</span><span className="font-bold text-orange-700">{cs}{rentalConfig.rentalCancellation.lateReturnFeePerHour}/hour</span></div>
                  <div className="flex justify-between p-2 bg-blue-50 rounded-lg"><span className="text-blue-700">Refund processing</span><span className="font-bold text-blue-700">{rentalConfig.rentalCancellation.processingDays} business days</span></div>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /> Deposit & Insurance</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg"><span>Security deposit (self-drive)</span><span className="font-bold">{cs}{rentalConfig.selfDrive.securityDepositAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg"><span>Insurance</span><span className={`font-bold ${rentalConfig.selfDrive.insuranceMandatory ? 'text-red-600' : 'text-emerald-600'}`}>{rentalConfig.selfDrive.insuranceMandatory ? 'MANDATORY' : 'Optional'}</span></div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg"><span>Fuel policy</span><span className="font-bold">{rentalConfig.selfDrive.fuelPolicy.replace(/_/g, ' ')}</span></div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg"><span>Different return location fee</span><span className="font-bold">{cs}{rentalConfig.selfDrive.differentReturnFee.toLocaleString()}</span></div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg"><span>{rentalConfig.pricing.taxLabel}</span><span className="font-bold">{(rentalConfig.pricing.taxRate * 100).toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            {/* Rental Fare Calculator */}
            <div className="bg-linear-to-br from-blue-900 to-blue-800 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4"><Calculator className="w-4 h-4 text-blue-300" /><h4 className="text-sm font-bold">Rental Fare Calculator</h4></div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div><label className="text-[10px] text-blue-300 block mb-1" htmlFor="duration-type">Duration Type</label><select id="duration-type" title="Duration" className="w-full px-2 py-1.5 rounded-lg bg-blue-700 border border-blue-600 text-xs font-bold text-white"><option>Daily</option><option>Hourly (8h pkg)</option><option>Weekly</option></select></div>
                <div><label className="text-[10px] text-blue-300 block mb-1" htmlFor="days">Days</label><input id="days" title="Days" type="number" defaultValue={3} className="w-full px-2 py-1.5 rounded-lg bg-blue-700 border border-blue-600 text-xs font-bold text-white text-center" /></div>
                <div><label className="text-[10px] text-blue-300 block mb-1" htmlFor="vehicle-2">Vehicle</label><select id="vehicle-2" title="Vehicle" className="w-full px-2 py-1.5 rounded-lg bg-blue-700 border border-blue-600 text-xs font-bold text-white"><option>Economy</option><option>Comfort</option><option>SUV</option><option>Premium</option><option>Luxury</option></select></div>
                <div><label className="text-[10px] text-blue-300 block mb-1" htmlFor="mode">Mode</label><select id="mode" title="Mode" className="w-full px-2 py-1.5 rounded-lg bg-blue-700 border border-blue-600 text-xs font-bold text-white"><option>🔑 Self-Drive</option><option>👨‍✈️ Chauffeur</option></select></div>
              </div>
              <div className="flex items-end justify-between border-t border-blue-700 pt-3">
                <div className="text-xs text-blue-300 space-y-0.5">
                  <p>Base: {cs}{(3500 * rentalConfig.pricing.baseMultiplier).toLocaleString()} × 3 days = {cs}{(10500 * rentalConfig.pricing.baseMultiplier).toLocaleString()}</p>
                  <p>{rentalConfig.pricing.taxLabel} ({(rentalConfig.pricing.taxRate * 100).toFixed(0)}%): {cs}{Math.round(10500 * rentalConfig.pricing.baseMultiplier * rentalConfig.pricing.taxRate).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-blue-300">Estimated Total</p>
                  <p className="text-2xl font-black text-blue-300">{cs}{Math.round(10500 * rentalConfig.pricing.baseMultiplier * (1 + rentalConfig.pricing.taxRate)).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ INTERCITY PRICING TAB ═══ */}
      {pricingTab === 'intercity' && (() => {
        const icConfig = getCountryConfig(country);
        const cs = icConfig.pricing.currencySymbol;
        return (
          <div className="space-y-6">
            {/* Country Selector */}
            <div className="flex flex-wrap gap-2">
              {COUNTRY_OPTIONS.map(c => (
                <button key={c.code} onClick={() => selectCountry(c.code)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${country === c.code ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                  <CountryFlag code={c.code} size="md" /> {c.label}
                </button>
              ))}
            </div>

            {!icConfig.intercity.enabled ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
                <MapPin className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-amber-700">Intercity not available for {icConfig.countryName}</p>
                <p className="text-xs text-amber-600 mt-1">This country does not have intercity routes configured</p>
              </div>
            ) : (
              <>
            {/* Route Pricing Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-violet-500" /> Route Pricing — {icConfig.flag} {icConfig.countryName}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Route</th>
                      <th className="px-3 py-3 font-semibold text-right">Distance</th>
                      <th className="px-3 py-3 font-semibold text-right">Duration</th>
                      <th className="px-3 py-3 font-semibold text-right">Shuttle</th>
                      <th className="px-3 py-3 font-semibold text-right">Comfort</th>
                      <th className="px-3 py-3 font-semibold text-right">VIP</th>
                      <th className="px-3 py-3 font-semibold text-center">Round Trip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { from: 'Mumbai', to: 'Delhi', dist: '485 km', dur: '8h', shuttle: 1800, comfort: 2500, vip: 4500 },
                      { from: 'Mumbai', to: 'Chennai', dist: '340 km', dur: '6h', shuttle: 1500, comfort: 2000, vip: 3800 },
                      { from: 'Mumbai', to: 'Pune', dist: '160 km', dur: '2.5h', shuttle: 700, comfort: 1000, vip: 1800 },
                      { from: 'Mumbai', to: 'Bangalore', dist: '310 km', dur: '5h', shuttle: 1400, comfort: 1900, vip: 3500 },
                      { from: 'Delhi', to: 'Malindi', dist: '120 km', dur: '2h', shuttle: 600, comfort: 900, vip: 1500 },
                    ].map(r => (
                      <tr key={`${r.from}-${r.to}`} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3"><div className="flex items-center gap-1 font-bold text-xs">{r.from} <ArrowRight className="w-3 h-3 text-violet-400" /> {r.to}</div></td>
                        <td className="px-3 py-3 text-right text-xs text-slate-500">{r.dist}</td>
                        <td className="px-3 py-3 text-right text-xs text-slate-500">{r.dur}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-xs">{cs}{(r.shuttle * icConfig.pricing.baseMultiplier).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-xs">{cs}{(r.comfort * icConfig.pricing.baseMultiplier).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-xs text-violet-600">{cs}{(r.vip * icConfig.pricing.baseMultiplier).toLocaleString()}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[10px] font-bold text-emerald-600">{icConfig.intercity.roundTripDiscountPercent}% off</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Intercity Settings Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Round Trip', value: icConfig.intercity.roundTripEnabled ? '✅ Enabled' : '❌ Off', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                { label: 'Max Seats/Booking', value: String(icConfig.intercity.maxSeatsPerBooking), bg: 'bg-violet-50 text-violet-700 border-violet-200' },
                { label: 'Luggage/Person', value: String(icConfig.intercity.maxLuggagePerPerson), bg: 'bg-amber-50 text-amber-700 border-amber-200' },
                { label: 'Boarding Window', value: `${icConfig.intercity.boardingWindowMinutes} min`, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-3 border ${s.bg}`}>
                  <p className="text-[10px] font-medium opacity-70">{s.label}</p>
                  <p className="text-sm font-black mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
