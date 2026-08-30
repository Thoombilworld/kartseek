'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import {
  Zap, MapPin, Clock, TrendingUp, Settings2, Plus, Edit, Trash2,
  Save, X, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight,
  ChevronDown, Sun, Moon, Sunrise, Sunset,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

// ── Types ────────────────────────────────────────────────────────────────────

interface SurgeZone {
  id: string;
  name: string;
  area: string;
  currentMultiplier: number;
  baseMultiplier: number;
  maxMultiplier: number;
  autoSurge: boolean;
  activeRides: number;
  availableDrivers: number;
  demandLevel: 'low' | 'normal' | 'moderate' | 'high' | 'extreme';
  peakRules: PeakRule[];
  region: string;
}

interface PeakRule {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
  multiplier: number;
  icon: typeof Sun;
  enabled: boolean;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const DEFAULT_PEAK_RULES: PeakRule[] = [
  { id: 'morning', label: 'Morning Rush', startHour: 7, endHour: 9, multiplier: 1.15, icon: Sunrise, enabled: true },
  { id: 'afternoon', label: 'Afternoon', startHour: 12, endHour: 14, multiplier: 1.05, icon: Sun, enabled: false },
  { id: 'evening', label: 'Evening Rush', startHour: 17, endHour: 20, multiplier: 1.25, icon: Sunset, enabled: true },
  { id: 'night', label: 'Late Night', startHour: 22, endHour: 5, multiplier: 1.1, icon: Moon, enabled: true },
];

const ZONES: SurgeZone[] = [
  { id: 'Z-001', name: 'Central Business District', area: 'CBD / Downtown Core', currentMultiplier: 1.8, baseMultiplier: 1.0, maxMultiplier: 3.0, autoSurge: true, activeRides: 142, availableDrivers: 38, demandLevel: 'high', peakRules: DEFAULT_PEAK_RULES, region: 'IN' },
  { id: 'Z-002', name: 'Airport Zone', area: 'International Airport + 5km radius', currentMultiplier: 1.3, baseMultiplier: 1.1, maxMultiplier: 2.5, autoSurge: true, activeRides: 89, availableDrivers: 52, demandLevel: 'moderate', peakRules: DEFAULT_PEAK_RULES, region: 'IN' },
  { id: 'Z-003', name: 'Business Bay', area: 'DIFC / Business Bay / Downtown', currentMultiplier: 2.1, baseMultiplier: 1.0, maxMultiplier: 2.5, autoSurge: true, activeRides: 203, availableDrivers: 25, demandLevel: 'extreme', peakRules: DEFAULT_PEAK_RULES, region: 'AE' },
  { id: 'Z-004', name: 'JBR & Marina', area: 'JBR Walk / Dubai Marina / Palm Jumeirah', currentMultiplier: 1.5, baseMultiplier: 1.0, maxMultiplier: 2.0, autoSurge: true, activeRides: 67, availableDrivers: 41, demandLevel: 'moderate', peakRules: DEFAULT_PEAK_RULES, region: 'AE' },
  { id: 'Z-005', name: 'Westlands & CBD', area: 'Westlands / Mumbai CBD / Upper Hill', currentMultiplier: 1.0, baseMultiplier: 1.0, maxMultiplier: 2.0, autoSurge: true, activeRides: 45, availableDrivers: 62, demandLevel: 'low', peakRules: DEFAULT_PEAK_RULES, region: 'IN' },
  { id: 'Z-006', name: 'Orchard & Marina', area: 'Orchard Road / Marina Bay / Raffles', currentMultiplier: 1.4, baseMultiplier: 1.0, maxMultiplier: 2.0, autoSurge: true, activeRides: 78, availableDrivers: 55, demandLevel: 'normal', peakRules: DEFAULT_PEAK_RULES, region: 'SG' },
  { id: 'Z-007', name: 'City of London', area: 'Bank / Liverpool St / Canary Wharf', currentMultiplier: 1.6, baseMultiplier: 1.0, maxMultiplier: 3.0, autoSurge: true, activeRides: 112, availableDrivers: 30, demandLevel: 'high', peakRules: DEFAULT_PEAK_RULES, region: 'GB' },
  { id: 'Z-008', name: 'Olaya District', area: 'Olaya / King Fahd Road / DQ', currentMultiplier: 1.2, baseMultiplier: 1.0, maxMultiplier: 2.0, autoSurge: true, activeRides: 34, availableDrivers: 48, demandLevel: 'normal', peakRules: DEFAULT_PEAK_RULES, region: 'SA' },
];

const DEMAND_STYLES: Record<string, { bg: string; text: string; bar: string }> = {
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-400 w-1/5' },
  normal: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-400 w-2/5' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-400 w-3/5' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500 w-4/5' },
  extreme: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500 w-full' },
};

export default function AdminSurgeZonesPage() {
  const { filtered: zones, formatPrice, regionLabel, isFiltered, countryFlag, surgeCapLabel } = useTaxiRegionFilter(ZONES);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const avgMultiplier = zones.length > 0 ? (zones.reduce((s, z) => s + z.currentMultiplier, 0) / zones.length).toFixed(2) : '1.00';
  const totalActive = zones.reduce((s, z) => s + z.activeRides, 0);
  const totalDrivers = zones.reduce((s, z) => s + z.availableDrivers, 0);
  const highDemandZones = zones.filter(z => z.demandLevel === 'high' || z.demandLevel === 'extreme').length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Surge Zone Manager</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dynamic pricing by zone — {surgeCapLabel} {isFiltered && <span className="text-amber-600 font-bold">· {countryFlag} {regionLabel}</span>}</p>
        </div>
        <button onClick={() => showToast('New zone creation coming soon')} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Zone
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg. Multiplier', value: `${avgMultiplier}×`, color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Zap },
          { label: 'Active Rides', value: totalActive, color: 'bg-violet-50 text-violet-700 border-violet-200', icon: TrendingUp },
          { label: 'Available Drivers', value: totalDrivers, color: 'bg-blue-50 text-blue-700 border-blue-200', icon: MapPin },
          { label: 'High Demand Zones', value: highDemandZones, color: highDemandZones > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: AlertTriangle },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-xl p-4 border ${kpi.color}`}>
            <kpi.icon className="w-5 h-5 mb-2" />
            <p className="text-xl font-black">{kpi.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Zone Cards */}
      <div className="grid gap-4">
        {zones.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">No surge zones configured for this region</div>
        ) : (
          zones.map(zone => {
            const demandStyle = DEMAND_STYLES[zone.demandLevel];
            const isExpanded = expandedZone === zone.id;
            return (
              <div key={zone.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${demandStyle.bg}`}>
                        <Zap className={`w-6 h-6 ${demandStyle.text}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{zone.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{zone.area}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-slate-900">{zone.currentMultiplier}×</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Current Surge</p>
                    </div>
                  </div>

                  {/* Demand Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-bold ${demandStyle.text} capitalize`}>{zone.demandLevel} demand</span>
                      <span className="text-slate-400">{zone.activeRides} rides / {zone.availableDrivers} drivers</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${demandStyle.bar}`} />
                    </div>
                  </div>

                  {/* Config Row */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">Base: <b className="text-slate-800">{zone.baseMultiplier}×</b></span>
                    <span className="flex items-center gap-1">Max: <b className="text-slate-800">{zone.maxMultiplier}×</b></span>
                    <span className={`flex items-center gap-1 ${zone.autoSurge ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {zone.autoSurge ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      Auto-surge {zone.autoSurge ? 'ON' : 'OFF'}
                    </span>
                    <button onClick={() => setExpandedZone(isExpanded ? null : zone.id)} className="ml-auto text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1">
                      <Settings2 className="w-3.5 h-3.5" />{isExpanded ? 'Hide' : 'Peak Hours'}
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded: Peak Hour Rules */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Peak Hour Rules</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {zone.peakRules.map(rule => {
                        const Icon = rule.icon;
                        return (
                          <div key={rule.id} className={`flex items-center justify-between p-3 rounded-lg border ${rule.enabled ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-100 opacity-60'}`}>
                            <div className="flex items-center gap-3">
                              <Icon className="w-4 h-4 text-amber-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-800">{rule.label}</p>
                                <p className="text-xs text-slate-400">{rule.startHour}:00 — {rule.endHour}:00</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-amber-600">{rule.multiplier}×</span>
                              <button onClick={() => showToast(`${rule.label} ${rule.enabled ? 'disabled' : 'enabled'}`)}
                                className={`text-xs font-bold px-2 py-1 rounded ${rule.enabled ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                                {rule.enabled ? 'ON' : 'OFF'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <button onClick={() => showToast(`${zone.name} settings saved`)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                        <Save className="w-3.5 h-3.5" /> Save Zone Config
                      </button>
                      <button onClick={() => showToast(`Surge reset to 1.0× for ${zone.name}`)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                        Reset to 1.0×
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
