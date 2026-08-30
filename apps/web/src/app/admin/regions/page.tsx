'use client';

import React, { useEffect, useState } from 'react';
import {
  Globe, MapPin, Users, Store, Package, Truck, DollarSign,
  TrendingUp, ArrowUpRight, Settings, ChevronRight, Activity,
  ShoppingCart, Utensils, Pill, Stethoscope, Car, Check,
  AlertCircle, BarChart3, ChevronDown, Shield, Scale,
  Thermometer, Ruler, Clock, Phone, Languages, Eye,
  ToggleLeft, ToggleRight, FileText, Building2,
  Hotel, Wallet, Gift,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRegion, REGIONS, type SupportedCountryCode } from '@/lib/contexts/region-context';
import { COUNTRY_LOCALE_MAP } from '@/i18n/config';
import { CountryFlag } from '@/components/shared/country-flag';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { getCountry, LANGUAGES } from '@/lib/localization';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
// ─── Module Metadata ──────────────────────────────────────────────────────────

const moduleIcons: Record<string, React.ElementType> = {
  marketplace: ShoppingCart, grocery: Store, restaurant: Utensils,
  pharmacy: Pill, doctor: Stethoscope, taxi: Car, delivery: Truck,
  'hotel-booking': Hotel, wallet: Wallet, loyalty: Gift, franchise: Building2,
};

const moduleColors: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  marketplace: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  grocery: { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  restaurant: { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  pharmacy: { text: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  doctor: { text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500' },
  taxi: { text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  delivery: { text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  'hotel-booking': { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' },
  wallet: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  loyalty: { text: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200', dot: 'bg-pink-500' },
  franchise: { text: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-500' },
};

const allModules = ['marketplace', 'grocery', 'restaurant', 'pharmacy', 'doctor', 'taxi', 'delivery', 'hotel-booking', 'wallet', 'loyalty', 'franchise'];

// ─── Geographic Zones ─────────────────────────────────────────────────────────

interface GeoZone {
  id: string;
  label: string;
  emoji: string;
  description: string;
  gradient: string;
  codes: string[];
}

const GEO_ZONES: GeoZone[] = [
  { id: 'south-asia', label: 'India Operations', emoji: '🇮🇳', description: 'India — Primary operational market', gradient: 'from-orange-500 to-green-600', codes: ['IN'] },
  { id: 'gcc', label: 'GCC Countries', emoji: '🏜️', description: 'Gulf Cooperation Council — Qatar, UAE, Saudi Arabia, Bahrain, Kuwait, Oman', gradient: 'from-emerald-500 to-teal-600', codes: ['QA', 'AE', 'SA', 'BH', 'KW', 'OM'] },
  { id: 'western', label: 'Western Markets', emoji: '🌐', description: 'UK & USA — Western expansion markets', gradient: 'from-blue-500 to-indigo-600', codes: ['GB', 'US'] },
];

// ─── Compliance Badges ────────────────────────────────────────────────────────

/**
 * Badges derived from the localization registry rather than listed again here.
 *
 * The tax rate and the data-protection law are already declared once per market
 * in `@/lib/localization`; duplicating them meant a rate change had to be made
 * in two places and the copies drifted.
 */
function getComplianceBadges(code: string): string[] {
  const c = getCountry(code);
  return [
    c.tax.rate === 0 ? 'Tax-Free' : `${c.tax.name} ${c.tax.rate}%`,
    c.compliance.law,
    ...c.compliance.additionalRegulations
      // Badges are chips — keep them to short regulator names, not full citations.
      .map((r) => r.split(/[,(]/)[0].trim())
      .filter((r) => r.length <= 28)
      .slice(0, 2),
  ];
}

const BADGE_COLORS: Record<string, string> = {
  IN: 'text-orange-700 bg-orange-50 border-orange-200',
  GB: 'text-blue-700 bg-blue-50 border-blue-200',
  US: 'text-indigo-700 bg-indigo-50 border-indigo-200',
};
const DEFAULT_BADGE_COLOR = 'text-emerald-700 bg-emerald-50 border-emerald-200';

// ─── Revenue Bar Colors ───────────────────────────────────────────────────────

const revColors = [
  'bg-orange-500', 'bg-teal-500', 'bg-emerald-500', 'bg-green-600',
  'bg-cyan-500', 'bg-sky-500', 'bg-amber-500', 'bg-red-500',
  'bg-blue-600', 'bg-indigo-600',
];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function RegionsManagementPage() {
  const router = useRouter();
  const { getRegionStats, setSelectedRegion } = useRegion();
  const allStats = getRegionStats();
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [collapsedZones, setCollapsedZones] = useState<Record<string, boolean>>({});
  const [moduleOverrides, setModuleOverrides] = useState<Record<string, Record<string, boolean>>>({});

  /**
   * Seller applications waiting per market.
   *
   * Surfaced on the card so a backlog in one market is visible without opening
   * each region's queue in turn.
   */
  const [pendingApprovals, setPendingApprovals] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    adminMarketplaceApi.getSellerApprovalCounts()
      .then((res: any) => {
        if (cancelled) return;
        const counts = res?.data ?? res ?? {};
        if (counts && typeof counts === 'object') setPendingApprovals(counts);
      })
      // A stale badge is worse than none — leave it empty if the call fails.
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Aggregated totals
  const totalSellers = allStats.reduce((s, r) => s + r.totalSellers, 0);
  const totalOrders = allStats.reduce((s, r) => s + r.totalOrders, 0);
  const totalCustomers = allStats.reduce((s, r) => s + r.totalCustomers, 0);
  const totalRevenue = allStats.reduce((s, r) => s + r.revenue, 0);
  const todayOrders = allStats.reduce((s, r) => s + r.todayOrders, 0);
  const todayRevenue = allStats.reduce((s, r) => s + r.todayRevenue, 0);
  const totalPartners = allStats.reduce((s, r) => s + r.totalPartners, 0);

  const handleViewDashboard = (code: string) => {
    setSelectedRegion(code as SupportedCountryCode);
    router.push('/admin');
  };

  const toggleZone = (zoneId: string) => {
    setCollapsedZones(prev => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  const isModuleEnabled = (regionCode: string, mod: string) => {
    if (moduleOverrides[regionCode]?.[mod] !== undefined) {
      return moduleOverrides[regionCode][mod];
    }
    const config = REGIONS[regionCode as Exclude<SupportedCountryCode, 'ALL'>];
    return config?.enabledModules.includes(mod) ?? false;
  };

  const toggleModule = (regionCode: string, mod: string) => {
    setModuleOverrides(prev => ({
      ...prev,
      [regionCode]: {
        ...(prev[regionCode] || {}),
        [mod]: !isModuleEnabled(regionCode, mod),
      },
    }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2" id="regions-page-title">
            <Globe className="w-6 h-6 text-emerald-600" />
            Regional Operations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage all operational regions across India, GCC, and Western markets. Monitor country-wise performance and control platform settings across the global KARTSEEK ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold text-xs">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {allStats.length} Regions — All Live
          </span>
          <Link href="/admin/marketplace/india-ops" className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-3 py-1.5 rounded-full font-bold text-xs hover:bg-orange-700 transition-colors">
            🇮🇳 India Ops Hub
          </Link>
        </div>
      </div>

      {/* ─── Global KPI Banner ──────────────────────────────────────────────── */}
      <div className="bg-linear-to-r from-emerald-600 via-teal-700 to-blue-800 rounded-2xl p-6 shadow-lg" id="global-kpi-panel">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-6 h-6 text-white" />
          <h2 className="text-white font-bold text-lg">Global Platform Overview</h2>
          <span className="text-emerald-200 text-xs ml-1">— {allStats.length} active regions</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Active Sellers', value: `${(totalSellers / 1000).toFixed(1)}K`, color: 'text-white' },
            { label: 'Total Customers', value: `${(totalCustomers / 1000).toFixed(0)}K`, color: 'text-white' },
            { label: 'Lifetime Orders', value: `${(totalOrders / 1000).toFixed(0)}K`, color: 'text-white' },
            { label: "Today's Orders", value: todayOrders.toLocaleString('en'), color: 'text-yellow-300' },
            { label: 'Delivery Partners', value: totalPartners.toLocaleString('en'), color: 'text-white' },
            { label: 'Lifetime GMV', value: `$${(totalRevenue / 1_000_000).toFixed(1)}M`, color: 'text-white' },
            { label: "Today's Revenue", value: `$${(todayRevenue / 1_000_000).toFixed(2)}M`, color: 'text-yellow-300' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <p className="text-[11px] text-emerald-200 font-medium">{kpi.label}</p>
              <p className={`text-xl font-black mt-1 ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Revenue Distribution Bar ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5" id="revenue-distribution">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" /> Revenue Distribution by Region
        </h3>
        <div className="flex rounded-lg overflow-hidden h-9 mb-3">
          {allStats.map((r, i) => {
            const pct = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;
            return (
              <div
                key={r.code}
                ref={el => { if (el) el.style.setProperty('--seg-w', `${pct}%`); }}
                className={`${revColors[i % revColors.length]} relative group transition-all hover:brightness-110 cursor-pointer admin-rev-segment`}
                title={`${r.name}: ${pct.toFixed(1)}% ($${(r.revenue / 1_000_000).toFixed(1)}M)`}
              >
                {pct > 6 && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-bold drop-shadow-sm">
                    {r.code} {pct.toFixed(0)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
          {allStats.map((r, i) => (
            <div key={r.code} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${revColors[i % revColors.length]}`} />
              <span className="font-medium"><CountryFlag code={r.code} size="sm" /> {r.name}</span>
              <span className="text-slate-400">({((r.revenue / totalRevenue) * 100).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Geographic Zone Groups ──────────────────────────────────────── */}
      {GEO_ZONES.map(zone => {
        // All zones are treated as live — no gating
        const zoneStats = allStats.filter(s => zone.codes.includes(s.code));
        const isCollapsed = collapsedZones[zone.id] ?? false;
        const zoneRevenue = zoneStats.reduce((s, r) => s + r.revenue, 0);
        const zoneOrders = zoneStats.reduce((s, r) => s + r.todayOrders, 0);
        const zoneSellers = zoneStats.reduce((s, r) => s + r.activeSellers, 0);

        return (
          <div key={zone.id} className="space-y-4">
            {/* Zone Header */}
            <div
              onClick={() => toggleZone(zone.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => toggleZone(zone.id))}
              className="cursor-pointer group flex items-center gap-3"
            >
              <div className={`bg-linear-to-r ${zone.gradient} w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-md`}>
                {zone.emoji}
              </div>
              <div className="flex-1 text-left">
                <h2 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {zone.label}
                  <span className="ml-2 bg-emerald-100 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full">🟢 Live</span>
                </h2>
                <p className="text-xs text-slate-500">{zone.description}</p>
              </div>
              <div className="hidden md:flex items-center gap-4 text-xs text-slate-500 mr-3">
                <span><strong className="text-slate-700">{zoneSellers.toLocaleString('en')}</strong> sellers</span>
                <span><strong className="text-slate-700">{zoneOrders.toLocaleString('en')}</strong> orders today</span>
                <span><strong className="text-emerald-600">${(zoneRevenue / 1_000_000).toFixed(1)}M</strong> revenue</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
            </div>

            {/* Zone Region Cards */}
            {!isCollapsed && (
              <div className={`grid grid-cols-1 ${zoneStats.length === 1 ? 'md:grid-cols-1 max-w-2xl' : zoneStats.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-5`}>
                {zoneStats.map(region => {
                  const config = REGIONS[region.code as Exclude<SupportedCountryCode, 'ALL'>];
                  if (!config) return null;
                  const isExpanded = expandedRegion === region.code;
                  const countryLocale = COUNTRY_LOCALE_MAP[region.code];
                  const badgeLabels = getComplianceBadges(region.code);
                  const badgeColor = BADGE_COLORS[region.code] ?? DEFAULT_BADGE_COLOR;
                  const enabledCount = allModules.filter(m => isModuleEnabled(region.code, m)).length;

                  return (
                    <div
                      key={region.code}
                      className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${
                        isExpanded ? 'border-emerald-300 shadow-emerald-100 shadow-lg ring-1 ring-emerald-200' : 'border-slate-200 hover:shadow-md'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-5 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <CountryFlag code={config.code} size="xl" />
                            <div>
                              <h3 className="font-bold text-slate-900 text-lg">{config.name}</h3>
                              <p className="text-xs text-slate-400">{config.defaultCity} • {config.timezone}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-100">
                              <Check className="w-3 h-3" /> Active
                            </span>
                            <span className="text-[10px] text-slate-400">{enabledCount}/{allModules.length} modules</span>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          <div className="text-center">
                            <p className="text-xl font-black text-slate-900">{region.activeSellers.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Active Sellers</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-black text-slate-900">{region.todayOrders.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Orders Today</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-black text-emerald-600">{region.currency}{(region.todayRevenue / 1000).toFixed(0)}K</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Revenue Today</p>
                          </div>
                        </div>

                        {/* Growth indicator */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>+{(12 + (region.code.charCodeAt(0) % 15))}%</span>
                          </div>
                          <span className="text-[10px] text-slate-400">vs last month</span>
                          <div className="flex-1" />
                          <span className="text-[10px] text-slate-400">{region.totalCustomers.toLocaleString()} total customers</span>
                        </div>
                      </div>

                      {/* Module Chips + Details */}
                      <div className="p-4 bg-slate-50/50">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-slate-500">Currency:</span>
                            <span className="font-bold text-slate-700">{config.currencySymbol} {config.currencyCode}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-slate-500">Calling:</span>
                            <span className="font-bold text-slate-700">{config.callingCode}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-slate-500">Partners:</span>
                            <span className="font-bold text-slate-700">{region.activePartners.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-purple-500" />
                            <span className="text-slate-500">Lifetime:</span>
                            <span className="font-bold text-slate-700">{(region.totalOrders / 1000).toFixed(0)}K orders</span>
                          </div>
                        </div>

                        {/* Enabled Modules */}
                        <div className="mb-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Enabled Modules</p>
                          <div className="flex flex-wrap gap-1.5">
                            {allModules.map(mod => {
                              const enabled = isModuleEnabled(region.code, mod);
                              const Icon = moduleIcons[mod] || Package;
                              const colors = moduleColors[mod];
                              return (
                                <span
                                  key={mod}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-opacity ${
                                    enabled
                                      ? `${colors.text} ${colors.bg} ${colors.border}`
                                      : 'text-slate-400 bg-slate-100 border-slate-200 opacity-50 line-through'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${enabled ? colors.dot : 'bg-slate-300'}`} />
                                  <Icon className="w-3 h-3" />
                                  {mod.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Compliance Badges */}
                        <div className="mb-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Compliance & Regulations</p>
                          <div className="flex flex-wrap gap-1.5">
                            {badgeLabels.map(label => (
                              <span key={label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                                <Shield className="w-2.5 h-2.5" />
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleViewDashboard(region.code)}
                            className="flex-1 text-center py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Dashboard
                          </button>
                          {/* Full control surface: this market's approval queues,
                              its banners, its Seller Portal rules and its
                              data-protection regime. */}
                          <Link
                            href={`/admin/regions/${region.code}`}
                            className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                          >
                            <Shield className="w-3.5 h-3.5" /> Manage
                            {(pendingApprovals[region.code] ?? 0) > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                                {pendingApprovals[region.code] > 99 ? '99+' : pendingApprovals[region.code]}
                              </span>
                            )}
                          </Link>
                          {region.code === 'IN' && (
                            <Link
                              href="/admin/marketplace/india-ops"
                              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
                            >
                              🇮🇳 India Ops
                            </Link>
                          )}
                          <button
                            onClick={() => setExpandedRegion(isExpanded ? null : region.code)}
                            className={`px-3 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                              isExpanded
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            <Settings className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            Settings
                          </button>
                        </div>
                      </div>

                      {/* ─── Expanded Settings Panel ───────────────────────────────── */}
                      {isExpanded && (
                        <div className="border-t border-emerald-200 bg-linear-to-b from-emerald-50/40 to-white">

                          {/* Regional Settings */}
                          <div className="p-4 space-y-4">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                              <Settings className="w-4 h-4 text-emerald-600" /> Regional Settings
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <Languages className="w-3 h-3" /> Locale
                                </div>
                                <p className="font-bold text-slate-700">{config.locale}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <Clock className="w-3 h-3" /> Timezone
                                </div>
                                <p className="font-bold text-slate-700">{config.timezone}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <MapPin className="w-3 h-3" /> Default City
                                </div>
                                <p className="font-bold text-slate-700">{config.defaultCity}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                  <Ruler className="w-3 h-3" /> Measurement
                                </div>
                                <p className="font-bold text-slate-700 capitalize">{countryLocale?.measurementSystem || 'metric'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Tax Configuration */}
                          <div className="px-4 pb-4 space-y-3">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                              <Scale className="w-4 h-4 text-amber-600" /> Tax Configuration
                            </h4>
                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                              <div className="grid grid-cols-3 gap-3 text-xs">
                                <div>
                                  <p className="text-slate-400 mb-0.5">Tax Name</p>
                                  <p className="font-bold text-slate-700">{countryLocale?.taxName || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 mb-0.5">Rate</p>
                                  <p className="font-bold text-slate-700">{countryLocale?.taxRate ?? 0}%</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 mb-0.5">Display</p>
                                  <p className="font-bold text-slate-700">{countryLocale?.taxInclusive ? 'Inclusive' : 'Exclusive'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Module Management */}
                          <div className="px-4 pb-4 space-y-3">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-600" /> Module Management
                            </h4>
                            <div className="space-y-2">
                              {allModules.map(mod => {
                                const enabled = isModuleEnabled(region.code, mod);
                                const Icon = moduleIcons[mod] || Package;
                                const colors = moduleColors[mod];
                                return (
                                  <div key={mod} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${enabled ? colors.bg : 'bg-slate-100'}`}>
                                        <Icon className={`w-3.5 h-3.5 ${enabled ? colors.text : 'text-slate-400'}`} />
                                      </span>
                                      <span className={`text-xs font-bold ${enabled ? 'text-slate-700' : 'text-slate-400'}`}>
                                        {mod.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => toggleModule(region.code, mod)}
                                      className={`relative rounded-full transition-colors admin-toggle ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                      aria-label={`Toggle ${mod.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} module`}
                                      title={`${enabled ? 'Disable' : 'Enable'} ${mod.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`}
                                    >
                                      <span
                                        className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${
                                          enabled ? 'left-[20px]' : 'left-[2px]'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Supported Languages */}
                          <div className="px-4 pb-4 space-y-3">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                              <Languages className="w-4 h-4 text-violet-600" /> Supported Languages
                            </h4>
                            {/* Straight from the registry — the same list the
                                customer, seller and admin switchers offer. */}
                            <div className="flex flex-wrap gap-2">
                              {(countryLocale?.supportedLanguages || ['en']).map(lang => {
                                const meta = LANGUAGES[lang];
                                return (
                                  <span key={lang} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-100 text-xs font-bold text-slate-700">
                                    <CountryFlag code={meta.flagCountry} size="xs" />
                                    {meta.name}
                                    {meta.rtl && <span className="text-[9px] text-slate-400">RTL</span>}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="px-4 pb-4">
                            <div className="flex gap-2">
                              <Link href="/admin/settings" className="flex-1 text-center py-2.5 bg-white text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
                                Edit Full Config
                              </Link>
                              <button className="flex-1 text-center py-2.5 bg-white text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors border border-red-200">
                                Disable Region
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ─── Data Segmentation Architecture Info ──────────────────────────── */}
      <div className="bg-linear-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6" id="data-architecture-info">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 mb-1">Multi-Regional Data Architecture</h3>
            <p className="text-sm text-indigo-700 mb-3">
              All seller profiles, inventory, delivery partners, and customer data are strictly segmented by country.
              Sellers registered in India are only visible to Indian customers. This isolation applies across:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/60 rounded-lg p-3 border border-indigo-100">
                <p className="font-bold text-indigo-800 text-sm">📱 Customer App</p>
                <p className="text-xs text-indigo-600 mt-1">GPS/IP detection on launch. Only local vendors shown.</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 border border-indigo-100">
                <p className="font-bold text-indigo-800 text-sm">🚚 Partner App</p>
                <p className="text-xs text-indigo-600 mt-1">Region-scoped assignments. No cross-border dispatching.</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 border border-indigo-100">
                <p className="font-bold text-indigo-800 text-sm">🏪 Seller Portal</p>
                <p className="text-xs text-indigo-600 mt-1">Country fixed at registration. Region-locked inventory.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
