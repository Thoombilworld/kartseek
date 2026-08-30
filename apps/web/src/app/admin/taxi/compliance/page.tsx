'use client';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import React, { useState, useEffect } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  Shield, Globe, Save, Plus, Trash2, Scale, AlertTriangle,
  Clock, FileText, ChevronDown, ChevronRight, CheckCircle,
  Settings2,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';
import { API_BASE_URL } from '@/lib/config/api-base';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
// ─── Types & Data ─────────────────────────────────────────────────────────────

interface ComplianceRule {
  id: string;
  countryCode: string;
  category: string;
  rule: string;
  penalty: string;
  autoAction: string | null;
  autoThreshold: number | null;
  slaHours: number;
  legalReference: string;
  active: boolean;
}

const countries = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
];

const rules: ComplianceRule[] = [
  { id: 'R1', countryCode: 'IN', category: 'safety_incident', rule: 'Phone use while driving', penalty: 'Immediate temporary suspension (7 days)', autoAction: 'temporary_suspension', autoThreshold: 1, slaHours: 4, legalReference: 'India Traffic Act §56(2)', active: true },
  { id: 'R2', countryCode: 'IN', category: 'harassment', rule: 'Verbal or physical harassment', penalty: 'Permanent suspension + police report', autoAction: 'permanent_suspension', autoThreshold: 1, slaHours: 2, legalReference: 'India Penal Code §251, RTO Reg 2024/17', active: true },
  { id: 'R3', countryCode: 'IN', category: 'overcharging', rule: 'Fare manipulation / overcharging', penalty: 'Written warning → Fine → Suspension', autoAction: 'written_warning', autoThreshold: 1, slaHours: 24, legalReference: 'Competition Act §23', active: true },
  { id: 'R4', countryCode: 'IN', category: 'driver_behavior', rule: 'Repeated poor driving behavior (3+ complaints)', penalty: 'Mandatory retraining + probation', autoAction: 'retraining_required', autoThreshold: 3, slaHours: 72, legalReference: 'RTO Driver Conduct Guidelines', active: true },
  { id: 'R5', countryCode: 'IN', category: 'vehicle_condition', rule: 'Vehicle safety non-compliance (seatbelts, etc.)', penalty: 'Vehicle removed until inspection passed', autoAction: 'temporary_suspension', autoThreshold: 1, slaHours: 24, legalReference: 'India Traffic Act §33', active: true },
  { id: 'R6', countryCode: 'IN', category: 'safety_incident', rule: 'Reckless driving / phone use', penalty: 'Suspension (5 days) + Challan', autoAction: 'temporary_suspension', autoThreshold: 1, slaHours: 4, legalReference: 'MV Act §184, §196', active: true },
  { id: 'R7', countryCode: 'IN', category: 'harassment', rule: 'Harassment or discrimination', penalty: 'Permanent ban + FIR filing assistance', autoAction: 'platform_ban', autoThreshold: 1, slaHours: 2, legalReference: 'IPC §354, §509; SC/ST Prevention of Atrocities Act', active: true },
  { id: 'R8', countryCode: 'IN', category: 'overcharging', rule: 'Demanding extra fare / refusing meter', penalty: 'Fine ₹2,000 → Suspension', autoAction: 'fine', autoThreshold: 1, slaHours: 24, legalReference: 'MV Act §178', active: true },
  { id: 'R9', countryCode: 'IN', category: 'cancellation_abuse', rule: 'Frequent cancellations (>20% rate)', penalty: 'Probation → Temporary suspension', autoAction: 'probation', autoThreshold: null, slaHours: 168, legalReference: 'State Transport Authority Guidelines', active: true },
  { id: 'R10', countryCode: 'IN', category: 'vehicle_condition', rule: 'Vehicle fitness certificate expired', penalty: 'Immediate removal from platform', autoAction: 'temporary_suspension', autoThreshold: 1, slaHours: 4, legalReference: 'MV Act §56', active: true },
];

const catLabels: Record<string, string> = {
  safety_incident: '🛑 Safety', driver_behavior: '👤 Behavior', harassment: '⚠️ Harassment',
  overcharging: '💸 Overcharging', vehicle_condition: '🚗 Vehicle', route_deviation: '🗺️ Route',
  cancellation_abuse: '❌ Cancellation', fare_dispute: '💰 Fare',
};

const actionLabels: Record<string, string> = {
  verbal_warning: 'Verbal Warning', written_warning: 'Written Warning', fine: 'Fine',
  temporary_suspension: 'Temp Suspension', permanent_suspension: 'Perm Suspension',
  platform_ban: 'Platform Ban', retraining_required: 'Retraining', probation: 'Probation',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const { regionLabel, isFiltered, formatPrice } = useTaxiRegionFilter([]);
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const [expandedRules, setExpandedRules] = useState<string[]>([]);
  const [liveRules, setLiveRules] = useState<typeof rules | null>(null);

  // Fetch compliance data from API
  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/taxi/compliance?country=${selectedCountry}`, {
      signal: AbortSignal.timeout(5000),
    }).then(res => res.ok ? res.json() : null).then(data => {
      if (data?.compliance?.length) setLiveRules(data.compliance);
    }).catch(() => { /* Keep static data */ });
  }, [selectedCountry]);

  const countryRules = (liveRules || rules).filter(r => r.countryCode === selectedCountry);
  const country = countries.find(c => c.code === selectedCountry)!;

  const toggleRule = (id: string) => {
    setExpandedRules(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <Scale className="w-6 h-6 text-white" />
          </div>
          Compliance Framework
        </h1>
        <p className="text-slate-500 text-sm mt-2">
          Define country-specific compliance rules, SLA targets, and automatic disciplinary triggers. Rules are enforced per local legal standards.
        </p>
      </div>

      {/* Country Tabs */}
      <div className="flex gap-2">
        {countries.map(c => (
          <button key={c.code} onClick={() => setSelectedCountry(c.code)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${selectedCountry === c.code ? 'bg-purple-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            <CountryFlag code={c.code} size="sm" /> {c.name}
          </button>
        ))}
        <button className="px-4 py-2.5 rounded-xl text-sm font-bold text-purple-500 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors ml-auto" id="add-country-rules">
          <Plus className="w-3.5 h-3.5 inline mr-1" />Add Country
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-xl font-black text-slate-900">{countryRules.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Active Rules</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-xl font-black text-purple-600">{new Set(countryRules.map(r => r.category)).size}</p>
          <p className="text-[10px] text-slate-500 font-medium">Categories Covered</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-xl font-black text-amber-600">{countryRules.filter(r => r.autoAction).length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Auto-Triggers</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-xl font-black text-emerald-600">{Math.min(...countryRules.map(r => r.slaHours))}h</p>
          <p className="text-[10px] text-slate-500 font-medium">Tightest SLA</p>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {countryRules.map(rule => {
          const isExpanded = expandedRules.includes(rule.id);
          return (
            <div key={rule.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50" onClick={() => toggleRule(rule.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => toggleRule(rule.id))}>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{catLabels[rule.category] || rule.category}</span>
                    <h4 className="text-sm font-bold text-slate-900">{rule.rule}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{rule.penalty}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {rule.slaHours}h SLA
                  </span>
                  {rule.autoAction && (
                    <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] font-bold">
                      ⚡ Auto: {actionLabels[rule.autoAction]}
                    </span>
                  )}
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              {isExpanded && (
                <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium">Legal Reference</p>
                      <p className="font-bold text-slate-700 mt-1">{rule.legalReference}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Auto-Trigger After</p>
                      <p className="font-bold text-slate-700 mt-1">{rule.autoThreshold ? `${rule.autoThreshold} complaint(s)` : 'Manual only'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Auto Action</p>
                      <p className="font-bold text-slate-700 mt-1">{rule.autoAction ? actionLabels[rule.autoAction] : 'None'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Status</p>
                      <p className="font-bold text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-[10px] font-bold">Edit Rule</button>
                    <button className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-500 rounded-lg text-[10px] font-bold border border-red-200">Disable</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Rule */}
      <button className="w-full py-4 border-2 border-dashed border-purple-200 rounded-xl text-sm font-bold text-purple-500 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2" id="add-compliance-rule">
        <Plus className="w-4 h-4" /> Add Compliance Rule for <CountryFlag code={country.code} size="sm" /> {country.name}
      </button>
    </div>
  );
}
