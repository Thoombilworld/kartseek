'use client';

import React, { useState } from 'react';
import { useRegion, REGIONS } from '@/components/admin/region-context';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import {
  MapPin, TrendingUp, ShoppingBag, IndianRupee, Users, Store,
  Package, Truck, Shield, BarChart3, Activity, ArrowUpRight,
  CheckCircle2, AlertCircle, Zap, Search, ChevronDown, ChevronRight,
  CreditCard, Smartphone, Globe, Star, Clock, Award,
  Building2, Wifi, PiggyBank, FileText, Hash, Filter,
} from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
// ─── India States Data (for admin dashboard) ──────────────────────────────────

const INDIA_STATES_STATS = [
  { state: 'Maharashtra', code: 'MH', capital: 'Mumbai', orders: 48200, gmv: 2840000, sellers: 8920, gst: 510120, tier: 1, growth: 18 },
  { state: 'Delhi', code: 'DL', capital: 'New Delhi', orders: 41800, gmv: 2610000, sellers: 7640, gst: 469800, tier: 1, growth: 22 },
  { state: 'Karnataka', code: 'KA', capital: 'Bengaluru', orders: 35600, gmv: 2240000, sellers: 6280, gst: 403200, tier: 1, growth: 25 },
  { state: 'Tamil Nadu', code: 'TN', capital: 'Chennai', orders: 29400, gmv: 1860000, sellers: 5140, gst: 334800, tier: 1, growth: 16 },
  { state: 'Telangana', code: 'TG', capital: 'Hyderabad', orders: 26800, gmv: 1720000, sellers: 4890, gst: 309600, tier: 1, growth: 28 },
  { state: 'Gujarat', code: 'GJ', capital: 'Gandhinagar', orders: 22100, gmv: 1430000, sellers: 4210, gst: 257400, tier: 1, growth: 14 },
  { state: 'Uttar Pradesh', code: 'UP', capital: 'Lucknow', orders: 19800, gmv: 1180000, sellers: 3870, gst: 212400, tier: 2, growth: 31 },
  { state: 'West Bengal', code: 'WB', capital: 'Kolkata', orders: 17200, gmv: 1020000, sellers: 3240, gst: 183600, tier: 1, growth: 12 },
  { state: 'Rajasthan', code: 'RJ', capital: 'Jaipur', orders: 14600, gmv: 860000, sellers: 2980, gst: 154800, tier: 2, growth: 19 },
  { state: 'Punjab', code: 'PB', capital: 'Chandigarh', orders: 12400, gmv: 740000, sellers: 2340, gst: 133200, tier: 1, growth: 11 },
  { state: 'Haryana', code: 'HR', capital: 'Chandigarh', orders: 11800, gmv: 700000, sellers: 2180, gst: 126000, tier: 1, growth: 17 },
  { state: 'Madhya Pradesh', code: 'MP', capital: 'Bhopal', orders: 9600, gmv: 568000, sellers: 1840, gst: 102240, tier: 2, growth: 24 },
  { state: 'Bihar', code: 'BR', capital: 'Patna', orders: 7800, gmv: 440000, sellers: 1320, gst: 79200, tier: 2, growth: 38 },
  { state: 'Odisha', code: 'OD', capital: 'Bhubaneswar', orders: 6200, gmv: 352000, sellers: 980, gst: 63360, tier: 2, growth: 29 },
  { state: 'Kerala', code: 'KL', capital: 'Thiruvananthapuram', orders: 8900, gmv: 524000, sellers: 1680, gst: 94320, tier: 1, growth: 15 },
];

const TOP_PIN_ZONES = [
  { pin: '400001-400099', zone: 'Mumbai Central', orders: 12400, sellers: 2840, growth: 21 },
  { pin: '110001-110099', zone: 'Delhi NCR', orders: 11200, sellers: 2620, growth: 18 },
  { pin: '560001-560100', zone: 'Bengaluru Tech Corridor', orders: 9800, sellers: 2180, growth: 29 },
  { pin: '500001-500097', zone: 'Hyderabad HITEC City', orders: 8600, sellers: 1940, growth: 34 },
  { pin: '600001-600050', zone: 'Chennai Metro', orders: 7800, sellers: 1720, growth: 16 },
  { pin: '201301-201309', zone: 'Noida / Greater Noida', orders: 7200, sellers: 1580, growth: 22 },
  { pin: '122001-122108', zone: 'Gurugram', orders: 6800, sellers: 1480, growth: 26 },
  { pin: '411001-411057', zone: 'Pune Metro', orders: 6200, sellers: 1380, growth: 19 },
  { pin: '380001-380058', zone: 'Ahmedabad', orders: 5600, sellers: 1240, growth: 14 },
  { pin: '700001-700157', zone: 'Kolkata', orders: 4800, sellers: 1080, growth: 11 },
];

const GST_DISTRIBUTION = [
  { rate: '0%', label: 'Exempt', value: 8.2, color: 'bg-slate-400', items: 'Fresh produce, Books, Healthcare' },
  { rate: '5%', label: 'Essential', value: 22.4, color: 'bg-emerald-400', items: 'Packed foods, Medicines, Tea, Coffee' },
  { rate: '12%', label: 'Standard', value: 28.6, color: 'bg-blue-400', items: 'Mobile phones, Computers, Textile' },
  { rate: '18%', label: 'Regular', value: 31.8, color: 'bg-amber-400', items: 'FMCG, Electronics, Restaurant food' },
  { rate: '28%', label: 'Luxury', value: 9.0, color: 'bg-red-400', items: 'Luxury cars, Tobacco, Aerated drinks' },
];

const PAYMENT_METHODS = [
  { name: 'UPI', icon: '📱', share: 42.8, apps: ['PhonePe', 'Google Pay', 'Paytm', 'BHIM'], color: 'bg-purple-500' },
  { name: 'Net Banking', icon: '🏦', share: 18.4, apps: ['HDFC', 'SBI', 'ICICI', 'Axis'], color: 'bg-blue-500' },
  { name: 'Credit Card', icon: '💳', share: 16.2, apps: ['Visa', 'Mastercard', 'RuPay'], color: 'bg-indigo-500' },
  { name: 'COD', icon: '💵', share: 14.6, apps: ['Cash on Delivery'], color: 'bg-amber-500' },
  { name: 'Debit Card', icon: '🃏', share: 5.8, apps: ['RuPay', 'Visa Debit', 'Maestro'], color: 'bg-green-500' },
  { name: 'EMI', icon: '📅', share: 2.2, apps: ['No-Cost EMI', '3/6/12 months'], color: 'bg-pink-500' },
];

const INDIA_LANGUAGES = [
  { code: 'hi', name: 'Hindi', speakers: '600M', flag: '🗣️', enabled: true },
  { code: 'en', name: 'English', speakers: '270M', flag: '🗣️', enabled: true },
  { code: 'ta', name: 'Tamil', speakers: '80M', flag: '🗣️', enabled: true },
  { code: 'te', name: 'Telugu', speakers: '82M', flag: '🗣️', enabled: true },
  { code: 'kn', name: 'Kannada', speakers: '58M', flag: '🗣️', enabled: true },
  { code: 'ml', name: 'Malayalam', speakers: '35M', flag: '🗣️', enabled: true },
  { code: 'mr', name: 'Marathi', speakers: '84M', flag: '🗣️', enabled: false },
  { code: 'bn', name: 'Bengali', speakers: '100M', flag: '🗣️', enabled: false },
  { code: 'gu', name: 'Gujarati', speakers: '56M', flag: '🗣️', enabled: false },
  { code: 'pa', name: 'Punjabi', speakers: '33M', flag: '🗣️', enabled: false },
];

const CITY_TIERS = [
  { tier: 'Metro (Tier 1)', cities: 'Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad', orders: 64, delivery: 'Same day / Next day', color: 'bg-blue-500' },
  { tier: 'Tier 2', cities: 'Jaipur, Lucknow, Kanpur, Nagpur, Indore, Bhopal, Coimbatore, Kochi, Surat', orders: 27, delivery: '2–3 days', color: 'bg-emerald-500' },
  { tier: 'Tier 3 & Rural', cities: 'All remaining districts and towns', orders: 9, delivery: '5–7 days', color: 'bg-amber-500' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function IndiaOpsPage() {
  const { selectedRegion } = useRegion();
  const isRegionFiltered = selectedRegion !== 'ALL';
  const regionLabel = isRegionFiltered ? REGIONS[selectedRegion]?.name ?? selectedRegion : 'All Regions';

  const [pinSearch, setPinSearch] = useState('');
  const [pinResult, setPinResult] = useState<{ state: string; district: string; city: string; tier: number; deliverable: boolean } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [stateFilter, setStateFilter] = useState<'all' | 'metro' | 'tier2'>('all');
  const [langToggles, setLangToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(INDIA_LANGUAGES.map(l => [l.code, l.enabled]))
  );

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getIndiaOpsConfig(),
    []
  );
  const { execute } = useAdminAction(showToast);

  const totalOrders = INDIA_STATES_STATS.reduce((s, r) => s + r.orders, 0);
  const totalGMV = INDIA_STATES_STATS.reduce((s, r) => s + r.gmv, 0);
  const totalSellers = INDIA_STATES_STATS.reduce((s, r) => s + r.sellers, 0);
  const totalGST = INDIA_STATES_STATS.reduce((s, r) => s + r.gst, 0);

  const handlePinSearch = async () => {
    if (pinSearch.length !== 6) return;
    setPinLoading(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 400));
    const knownPins: Record<string, { state: string; district: string; city: string; tier: number; deliverable: boolean }> = {
      '400001': { state: 'Maharashtra', district: 'Mumbai', city: 'Mumbai GPO', tier: 1, deliverable: true },
      '110001': { state: 'Delhi', district: 'New Delhi', city: 'Connaught Place', tier: 1, deliverable: true },
      '560001': { state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru GPO', tier: 1, deliverable: true },
      '500001': { state: 'Telangana', district: 'Hyderabad', city: 'Hyderabad GPO', tier: 1, deliverable: true },
      '600001': { state: 'Tamil Nadu', district: 'Chennai', city: 'Chennai GPO', tier: 1, deliverable: true },
      '201301': { state: 'Uttar Pradesh', district: 'Noida', city: 'Noida Sector 18', tier: 1, deliverable: true },
      '122001': { state: 'Haryana', district: 'Gurgaon', city: 'Gurugram', tier: 1, deliverable: true },
    };
    const numPin = parseInt(pinSearch, 10);
    const result = knownPins[pinSearch] ||
      (numPin >= 100000 && numPin <= 999999
        ? { state: 'India', district: 'Unknown District', city: 'Unknown City', tier: 3, deliverable: true }
        : null);
    setPinResult(result);
    setPinLoading(false);
  };

  const filteredStates = INDIA_STATES_STATS.filter(s => {
    if (stateFilter === 'metro') return s.tier === 1;
    if (stateFilter === 'tier2') return s.tier === 2;
    return true;
  });

  return (
    <div className="space-y-6">

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-linear-to-r from-orange-600 via-orange-500 to-amber-500 rounded-2xl p-6 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">🇮🇳</span>
              <div>
                <h1 className="text-2xl font-black text-white" id="india-ops-title">India Operations Hub</h1>
                <p className="text-orange-100 text-sm">Marketplace performance across 28 States + 8 Union Territories</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-white/20 backdrop-blur text-white border border-white/30 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
              Live · IST {new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="bg-white/20 backdrop-blur text-white border border-white/30 px-3 py-1.5 rounded-full text-xs font-bold">
              GST Compliant ✓
            </span>
          </div>
        </div>

        {/* India KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 relative">
          {[
            { label: 'Total Orders (India)', value: totalOrders.toLocaleString('en-IN'), icon: ShoppingBag, color: 'text-orange-100' },
            { label: 'Gross Merchandise Value', value: `₹${(totalGMV / 100000).toFixed(1)}L`, icon: IndianRupee, color: 'text-yellow-200' },
            { label: 'Active Sellers', value: totalSellers.toLocaleString('en-IN'), icon: Store, color: 'text-orange-100' },
            { label: 'GST Collected', value: `₹${(totalGST / 100000).toFixed(1)}L`, icon: FileText, color: 'text-green-200' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <p className="text-[11px] text-orange-100 font-medium">{kpi.label}</p>
              </div>
              <p className="text-2xl font-black text-white">{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── PIN Code Admin Checker ──────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5" id="pin-admin-checker">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-500" />
          PIN Code Serviceability Check
          <span className="text-xs font-normal text-slate-400 ml-2">— Test any 6-digit Indian PIN code</span>
        </h2>
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="pin-search-input"
              type="text"
              maxLength={6}
              value={pinSearch}
              onChange={e => { setPinSearch(e.target.value.replace(/\D/g, '')); setPinResult(null); }}
              placeholder="Enter 6-digit PIN (e.g. 400001)"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
            />
          </div>
          <button
            id="pin-search-btn"
            onClick={handlePinSearch}
            disabled={pinSearch.length !== 6 || pinLoading}
            className="px-5 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {pinLoading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            Check
          </button>
        </div>
        {pinResult && (
          <div className={`rounded-xl p-4 border flex items-start gap-3 ${pinResult.deliverable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            {pinResult.deliverable
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
            <div>
              <p className={`font-bold text-sm ${pinResult.deliverable ? 'text-emerald-700' : 'text-red-700'}`}>
                {pinResult.deliverable ? '✓ Serviceable' : '✗ Not Serviceable'}
                <span className="font-normal text-xs ml-2">{pinSearch}</span>
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                📍 {pinResult.city}, {pinResult.district} — {pinResult.state}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tier {pinResult.tier} · {pinResult.tier === 1 ? 'Same/Next Day' : pinResult.tier === 2 ? '2–3 Days' : '5–7 Days'} delivery
              </p>
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <p className="text-[11px] text-slate-400 font-medium self-center">Try:</p>
          {['400001', '110001', '560001', '500001', '600001', '122001'].map(p => (
            <button
              key={p}
              onClick={() => { setPinSearch(p); setPinResult(null); }}
              className="text-[11px] px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-mono hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ─── State-wise Revenue Table ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="state-revenue-table">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            State-wise Performance
          </h2>
          <div className="flex gap-1.5">
            {(['all', 'metro', 'tier2'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStateFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${stateFilter === f ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {f === 'all' ? 'All States' : f === 'metro' ? 'Metro' : 'Tier 2'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">State</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Orders</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">GMV</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Sellers</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">GST Collected</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStates.map((s, i) => (
                <tr key={s.code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-5 bg-orange-100 text-orange-700 text-[10px] font-black rounded flex items-center justify-center">{s.code}</span>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{s.state}</p>
                        <p className="text-[10px] text-slate-400">{s.capital}</p>
                      </div>
                      {s.tier === 1 && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold border border-blue-100">Metro</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800 text-xs">{s.orders.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 text-xs">₹{(s.gmv / 100000).toFixed(1)}L</td>
                  <td className="px-4 py-3 text-right text-slate-600 text-xs">{s.sellers.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-orange-600 font-bold text-xs">₹{(s.gst / 100000).toFixed(1)}L</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                      <ArrowUpRight className="w-3 h-3" />
                      +{s.growth}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-xs font-black text-slate-700">Total ({filteredStates.length} states)</td>
                <td className="px-4 py-3 text-right font-black text-slate-800 text-xs">{filteredStates.reduce((s,r)=>s+r.orders,0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right font-black text-emerald-700 text-xs">₹{(filteredStates.reduce((s,r)=>s+r.gmv,0)/100000).toFixed(1)}L</td>
                <td className="px-4 py-3 text-right font-black text-slate-700 text-xs">{filteredStates.reduce((s,r)=>s+r.sellers,0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right font-black text-orange-700 text-xs">₹{(filteredStates.reduce((s,r)=>s+r.gst,0)/100000).toFixed(1)}L</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── Two-column: PIN Zones + GST Distribution ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top PIN Code Zones */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5" id="pin-zones-panel">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            Top PIN Code Zones by Orders
          </h2>
          <div className="space-y-2.5">
            {TOP_PIN_ZONES.map((zone, i) => {
              const pct = (zone.orders / TOP_PIN_ZONES[0].orders) * 100;
              return (
                <div key={zone.pin} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-slate-400 w-4">{i + 1}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{zone.zone}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{zone.pin}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800">{zone.orders.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">+{zone.growth}%</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-linear-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GST Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5" id="gst-distribution-panel">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            GST Slab Distribution
            <span className="text-xs font-normal text-slate-400 ml-auto">% of catalog by value</span>
          </h2>
          {/* Stacked bar */}
          <div className="flex rounded-xl overflow-hidden h-8 mb-4 shadow-inner">
            {GST_DISTRIBUTION.map(slab => (
              <div
                key={slab.rate}
                className={`${slab.color} relative group cursor-pointer transition-all hover:brightness-110`}
                style={{ width: `${slab.value}%` }}
                title={`${slab.rate}: ${slab.value}%`}
              >
                {slab.value > 10 && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-black drop-shadow">
                    {slab.rate}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-2.5">
            {GST_DISTRIBUTION.map(slab => (
              <div key={slab.rate} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-sm ${slab.color}`} />
                <span className="text-xs font-bold text-slate-700 w-8">{slab.rate}</span>
                <span className="text-[11px] text-slate-500 flex-1">{slab.items}</span>
                <span className="text-xs font-black text-slate-700">{slab.value}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Compliance Status
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['GST Registered', 'DPIIT Startup', 'RBI Nodal', 'FSSAI Licensed', 'DPDP Act 2023'].map(badge => (
                <span key={badge} className="inline-flex items-center gap-1 text-[10px] bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Two-column: Payment Methods + City Tiers ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Payment Methods */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5" id="payment-methods-panel">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-500" />
            India Payment Methods
          </h2>
          <div className="space-y-3">
            {PAYMENT_METHODS.map(method => (
              <div key={method.name} className="flex items-center gap-3">
                <span className="text-xl w-8">{method.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-700">{method.name}</p>
                    <p className="text-xs font-black text-slate-800">{method.share}%</p>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${method.color} rounded-full`} style={{ width: `${method.share}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{method.apps.join(' · ')}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-700 flex items-center gap-2">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span><strong>UPI</strong> is the #1 payment method in India (42.8% share). Ensure PhonePe, Google Pay, Paytm, and BHIM integrations remain active.</span>
          </div>
        </div>

        {/* City Tier Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5" id="city-tier-panel">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Metro vs Tier-2 vs Tier-3 Orders
          </h2>
          {/* Donut-style representation */}
          <div className="flex gap-3 mb-5">
            {CITY_TIERS.map(tier => (
              <div key={tier.tier} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <div className={`w-10 h-10 ${tier.color} rounded-full flex items-center justify-center text-white font-black text-sm mx-auto mb-2`}>
                  {tier.orders}%
                </div>
                <p className="text-[11px] font-bold text-slate-700">{tier.tier.split(' (')[0]}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{tier.delivery}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2.5">
            {CITY_TIERS.map(tier => (
              <div key={tier.tier} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${tier.color}`} />
                  <p className="text-xs font-bold text-slate-700">{tier.tier}</p>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{tier.cities}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Language Coverage ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5" id="language-coverage-panel">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-500" />
          India Language Coverage
          <span className="ml-auto text-[11px] text-slate-400 font-normal">{Object.values(langToggles).filter(Boolean).length} / {INDIA_LANGUAGES.length} languages active</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {INDIA_LANGUAGES.map(lang => (
            <div
              key={lang.code}
              className={`relative rounded-xl p-3 border transition-all cursor-pointer ${langToggles[lang.code] ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
              onClick={() => setLangToggles(prev => ({ ...prev, [lang.code]: !prev[lang.code] }))} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setLangToggles(prev => ({ ...prev, [lang.code]: !prev[lang.code] })))}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-slate-700">{lang.name}</span>
                <div className={`w-8 h-4 rounded-full transition-colors ${langToggles[lang.code] ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                  <span className={`block w-3 h-3 bg-white rounded-full shadow transition-transform mt-0.5 ${langToggles[lang.code] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">{lang.speakers} speakers</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${langToggles[lang.code] ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                {lang.code.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── India Compliance & Regulatory Panel ─────────────────────────────── */}
      <div className="bg-linear-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5" id="india-compliance-panel">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-600" />
          India Regulatory Compliance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { title: 'GST', desc: 'GSTIN registered. GST slabs (0%/5%/12%/18%/28%) applied on all taxable goods & services.', status: 'Compliant', icon: '🧾', color: 'text-emerald-700' },
            { title: 'RBI — Payments', desc: 'Payment Aggregator licensed through RBI-compliant PSP. UPI, Net Banking, Cards regulated.', status: 'Compliant', icon: '🏦', color: 'text-emerald-700' },
            { title: 'DPIIT Startup', desc: 'Recognized under DPIIT Startup India program. Eligible for government incentives.', status: 'Active', icon: '🚀', color: 'text-emerald-700' },
            { title: 'FSSAI', desc: 'Food Safety and Standards Authority license for grocery and restaurant modules.', status: 'Active', icon: '🍎', color: 'text-emerald-700' },
            { title: 'DPDP Act 2023', desc: 'Digital Personal Data Protection Act compliant. Data localization within India enforced.', status: 'Compliant', icon: '🔒', color: 'text-emerald-700' },
            { title: 'MCA — Company', desc: 'Ministry of Corporate Affairs registered entity. Annual filing up to date.', status: 'Filed', icon: '🏢', color: 'text-emerald-700' },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                  <p className={`text-[10px] font-bold ${item.color}`}>{item.status} ✓</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
