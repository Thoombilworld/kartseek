'use client';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import React, { useState, useEffect } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  Globe, Save, ToggleLeft, ToggleRight, Plus, Trash2,
  Car, CreditCard, FileText, Clock, Shield, AlertTriangle,
  CheckCircle, Settings2, Smartphone, Zap,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';
import { API_BASE_URL } from '@/lib/config/api-base';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CountryConfig {
  countryCode: string;
  currency: string;
  distanceUnit: string;
  otpRequired: boolean;
  scheduledRidesEnabled: boolean;
  cashEnabled: boolean;
  tipsEnabled: boolean;
  maxStops: number;
  rideShareEnabled: boolean;
  vendorsEnabled: boolean;
  enabledPaymentGateways: string[];
  enabledVehicleTypes: string[];
  requiredVendorDocuments: string[];
  requiredDriverDocuments: string[];
  platformCommissionRate: number;
  defaultVendorCommissionRate: number;
  taxRate: number;
  surgeLimits: { minMultiplier: number; maxMultiplier: number; autoEnabled: boolean };
  peakHourConfig: Array<{ start: number; end: number; multiplier: number; label: string }>;
  emergencyNumber: string;
  freeWaitingMinutes: number;
  autoCancelTimeoutSeconds: number;
  minimumDriverRating: number;
}

const ALL_PAYMENT_GATEWAYS = ['cash', 'card', 'wallet', 'upi', 'bank_transfer', 'paypal', 'apple_pay', 'google_pay'];
const ALL_VEHICLE_TYPES = ['economy', 'comfort', 'premium', 'bike', 'suv', 'delivery', 'rickshaw', 'luxury'];
const ALL_VENDOR_DOCS = ['business_license', 'tax_certificate', 'insurance_certificate', 'fleet_registration', 'address_proof'];
const ALL_DRIVER_DOCS = ['driving_license', 'vehicle_registration', 'vehicle_insurance', 'identity_proof', 'background_check', 'profile_photo', 'vehicle_photo', 'medical_certificate'];

const COUNTRY_OPTIONS = [
  { code: 'IN', label: 'India', currency: '₹', flag: '🇮🇳' },
  { code: 'IN', label: 'India', currency: 'INR', flag: '🇮🇳' },
  { code: 'US', label: 'United States', currency: 'USD', flag: '🇺🇸' },
  { code: 'NG', label: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'GB', label: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  { code: 'AE', label: 'UAE', currency: 'AED', flag: '🇦🇪' },
];

const defaultConfig = (countryCode: string): CountryConfig => ({
  countryCode,
  currency: COUNTRY_OPTIONS.find(c => c.code === countryCode)?.currency || 'USD',
  distanceUnit: 'km',
  otpRequired: true,
  scheduledRidesEnabled: true,
  cashEnabled: true,
  tipsEnabled: true,
  maxStops: 3,
  rideShareEnabled: false,
  vendorsEnabled: true,
  enabledPaymentGateways: ['cash', 'card', 'wallet'],
  enabledVehicleTypes: ['economy', 'comfort', 'premium', 'bike'],
  requiredVendorDocuments: ['business_license', 'tax_certificate', 'insurance_certificate'],
  requiredDriverDocuments: ['driving_license', 'vehicle_registration', 'vehicle_insurance', 'identity_proof'],
  platformCommissionRate: 0.15,
  defaultVendorCommissionRate: 0.05,
  taxRate: 0,
  surgeLimits: { minMultiplier: 1.0, maxMultiplier: 3.0, autoEnabled: true },
  peakHourConfig: [
    { start: 7, end: 9, multiplier: 1.15, label: 'Morning Rush' },
    { start: 17, end: 20, multiplier: 1.2, label: 'Evening Rush' },
  ],
  emergencyNumber: '911',
  freeWaitingMinutes: 5,
  autoCancelTimeoutSeconds: 120,
  minimumDriverRating: 3.0,
});

// ─── Sub-Components ─────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }) {
  return (
    <button title={`Toggle ${label}`} onClick={onToggle} className="flex items-center gap-3 group w-full" aria-label={`Toggle ${label}`}>
      {enabled
        ? <ToggleRight className="w-6 h-6 text-emerald-500 shrink-0" />
        : <ToggleLeft className="w-6 h-6 text-slate-300 shrink-0" />
      }
      <span className={`text-sm font-medium ${enabled ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
    </button>
  );
}

function CheckboxGroup({ title, options, selected, onChange, icon: Icon }: {
  title: string; options: string[]; selected: string[];
  onChange: (v: string[]) => void;
  icon: React.ElementType;
}) {
  const toggle = (item: string) => {
    onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  };
  const format = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-500" />
        <h4 className="text-sm font-bold text-slate-700">{title}</h4>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{selected.length}/{options.length}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`text-left px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
              selected.includes(opt)
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                selected.includes(opt) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
              }`}>
                {selected.includes(opt) && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              {format(opt)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TaxiSettingsPage() {
  const { regionLabel, isFiltered, formatPrice } = useTaxiRegionFilter([]);
  const [country, setCountry] = useState('IN');
  const [config, setConfig] = useState<CountryConfig>(defaultConfig('IN'));
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selectCountry = (code: string) => {
    setCountry(code);
    setConfig(defaultConfig(code));
    setDirty(false);
    setSaved(false);
    // Fetch config from API
    fetch(`${API_BASE_URL}/taxi/admin/config/${code}`, {
      signal: AbortSignal.timeout(5000),
    }).then(res => res.ok ? res.json() : null).then(data => {
      if (data) setConfig(prev => ({ ...prev, ...data }));
    }).catch(() => { /* Keep default */ });
  };

  // Fetch initial config from API
  useEffect(() => {
    fetch(`${API_BASE_URL}/taxi/admin/config/${country}`, {
      signal: AbortSignal.timeout(5000),
    }).then(res => res.ok ? res.json() : null).then(data => {
      if (data) setConfig(prev => ({ ...prev, ...data }));
    }).catch(() => { /* Keep default */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = <K extends keyof CountryConfig>(key: K, value: CountryConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await fetch(`${API_BASE_URL}/taxi/admin/config/${country}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(5000),
      });
    } catch { /* Save failed silently */ }
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const addPeakHour = () => {
    update('peakHourConfig', [...config.peakHourConfig, { start: 12, end: 14, multiplier: 1.1, label: 'Custom Peak' }]);
  };

  const removePeakHour = (idx: number) => {
    update('peakHourConfig', config.peakHourConfig.filter((_, i) => i !== idx));
  };

  const updatePeakHour = (idx: number, field: string, value: any) => {
    const updated = [...config.peakHourConfig];
    (updated[idx] as any)[field] = value;
    update('peakHourConfig', updated);
  };

  const currentCountry = COUNTRY_OPTIONS.find(c => c.code === country);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-emerald-600" />
            Taxi Settings — Per-Country Configuration
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure taxi module features, payment gateways, documentation requirements, and commission rates per country.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold animate-in fade-in duration-200">
              <CheckCircle className="w-4 h-4" /> Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md ${
              dirty
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            id="save-config-btn"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </div>

      {/* Country Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-700">Select Country</h3>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {COUNTRY_OPTIONS.map(c => (
            <button
              key={c.code}
              onClick={() => selectCountry(c.code)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                country === c.code
                  ? 'border-emerald-500 bg-emerald-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <CountryFlag code={c.code} size="xl" />
              <span className={`text-xs font-bold ${country === c.code ? 'text-emerald-700' : 'text-slate-600'}`}>{c.label}</span>
              <span className="text-[10px] text-slate-400 font-mono">{c.currency}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Feature Toggles — <CountryFlag code={currentCountry?.code ?? ""} size="sm" /> {currentCountry?.label}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Toggle enabled={config.otpRequired} onToggle={() => update('otpRequired', !config.otpRequired)} label="OTP Required" />
          <Toggle enabled={config.scheduledRidesEnabled} onToggle={() => update('scheduledRidesEnabled', !config.scheduledRidesEnabled)} label="Scheduled Rides" />
          <Toggle enabled={config.cashEnabled} onToggle={() => update('cashEnabled', !config.cashEnabled)} label="Cash Payments" />
          <Toggle enabled={config.tipsEnabled} onToggle={() => update('tipsEnabled', !config.tipsEnabled)} label="Tips Enabled" />
          <Toggle enabled={config.rideShareEnabled} onToggle={() => update('rideShareEnabled', !config.rideShareEnabled)} label="Ride Sharing" />
          <Toggle enabled={config.vendorsEnabled} onToggle={() => update('vendorsEnabled', !config.vendorsEnabled)} label="Vendor System" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block" htmlFor="input-max-stops">Max Stops</label>
            <input title="Max Stops" placeholder="Max Stops" type="number" value={config.maxStops} onChange={e => update('maxStops', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" id="input-max-stops" />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block" htmlFor="input-emergency">Emergency Number</label>
            <input title="Emergency Number" placeholder="Emergency Number" type="text" value={config.emergencyNumber} onChange={e => update('emergencyNumber', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" id="input-emergency" />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block" htmlFor="input-free-waiting">Free Waiting (min)</label>
            <input title="Free Waiting" placeholder="Free Waiting Minutes" type="number" value={config.freeWaitingMinutes} onChange={e => update('freeWaitingMinutes', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" id="input-free-waiting" />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block" htmlFor="input-auto-cancel">Auto-Cancel (sec)</label>
            <input title="Auto Cancel" placeholder="Auto Cancel Seconds" type="number" value={config.autoCancelTimeoutSeconds} onChange={e => update('autoCancelTimeoutSeconds', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" id="input-auto-cancel" />
          </div>
        </div>
      </div>

      {/* Payment Gateways & Vehicle Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <CheckboxGroup title="Payment Gateways" icon={CreditCard} options={ALL_PAYMENT_GATEWAYS} selected={config.enabledPaymentGateways} onChange={v => update('enabledPaymentGateways', v)} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <CheckboxGroup title="Vehicle Types" icon={Car} options={ALL_VEHICLE_TYPES} selected={config.enabledVehicleTypes} onChange={v => update('enabledVehicleTypes', v)} />
        </div>
      </div>

      {/* Documentation Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <CheckboxGroup title="Required Vendor Documents" icon={FileText} options={ALL_VENDOR_DOCS} selected={config.requiredVendorDocuments} onChange={v => update('requiredVendorDocuments', v)} />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <CheckboxGroup title="Required Driver Documents" icon={FileText} options={ALL_DRIVER_DOCS} selected={config.requiredDriverDocuments} onChange={v => update('requiredDriverDocuments', v)} />
        </div>
      </div>

      {/* Financial Configuration */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-500" /> Financial Configuration
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block" htmlFor="input-platform-commission">Platform Commission (%)</label>
            <input title="Platform Commission" placeholder="Platform Commission" type="number" step="0.01" value={(config.platformCommissionRate * 100).toFixed(1)} onChange={e => update('platformCommissionRate', parseFloat(e.target.value) / 100 || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" id="input-platform-commission" />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block" htmlFor="input-vendor-commission">Default Vendor Commission (%)</label>
            <input title="Vendor Commission" placeholder="Vendor Commission" type="number" step="0.01" value={(config.defaultVendorCommissionRate * 100).toFixed(1)} onChange={e => update('defaultVendorCommissionRate', parseFloat(e.target.value) / 100 || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" id="input-vendor-commission" />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block" htmlFor="input-tax-rate">Tax Rate (%)</label>
            <input title="Tax Rate" placeholder="Tax Rate" type="number" step="0.01" value={(config.taxRate * 100).toFixed(1)} onChange={e => update('taxRate', parseFloat(e.target.value) / 100 || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" id="input-tax-rate" />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block" htmlFor="input-min-rating">Min Driver Rating</label>
            <input title="Min Rating" placeholder="Min Rating" type="number" step="0.1" min="1" max="5" value={config.minimumDriverRating} onChange={e => update('minimumDriverRating', parseFloat(e.target.value) || 3.0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" id="input-min-rating" />
          </div>
        </div>
      </div>

      {/* Surge & Peak Hours */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Surge Pricing & Peak Hours
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block" htmlFor="input-surge-min">Min Surge Multiplier</label>
            <input title="Min Surge" placeholder="Min Surge" type="number" step="0.1" value={config.surgeLimits.minMultiplier} onChange={e => update('surgeLimits', { ...config.surgeLimits, minMultiplier: parseFloat(e.target.value) || 1.0 })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" id="input-surge-min" />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block" htmlFor="input-surge-max">Max Surge Multiplier</label>
            <input title="Max Surge" placeholder="Max Surge" type="number" step="0.1" value={config.surgeLimits.maxMultiplier} onChange={e => update('surgeLimits', { ...config.surgeLimits, maxMultiplier: parseFloat(e.target.value) || 3.0 })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" id="input-surge-max" />
          </div>
          <div className="flex items-end">
            <Toggle enabled={config.surgeLimits.autoEnabled} onToggle={() => update('surgeLimits', { ...config.surgeLimits, autoEnabled: !config.surgeLimits.autoEnabled })} label="Auto Surge" />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Peak Hour Windows
            </h4>
            <button onClick={addPeakHour} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors" id="add-peak-hour-btn">
              <Plus className="w-3.5 h-3.5" /> Add Window
            </button>
          </div>
          <div className="space-y-2">
            {config.peakHourConfig.map((peak, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 items-center bg-slate-50 p-3 rounded-lg">
                <input title="Peak Label" type="text" value={peak.label} onChange={e => updatePeakHour(idx, 'label', e.target.value)} className="px-2 py-1.5 rounded border border-slate-200 text-xs font-medium" placeholder="Label" />
                <div className="flex items-center gap-1">
                  <input title="Start Hour" placeholder="Start Hour" type="number" min="0" max="23" value={peak.start} onChange={e => updatePeakHour(idx, 'start', parseInt(e.target.value))} className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-bold text-center" />
                  <span className="text-xs text-slate-400">to</span>
                  <input title="End Hour" placeholder="End Hour" type="number" min="0" max="23" value={peak.end} onChange={e => updatePeakHour(idx, 'end', parseInt(e.target.value))} className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-bold text-center" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">×</span>
                  <input title="Multiplier" placeholder="Multiplier" type="number" step="0.05" value={peak.multiplier} onChange={e => updatePeakHour(idx, 'multiplier', parseFloat(e.target.value))} className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-bold text-center" />
                </div>
                <div className="text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${peak.multiplier >= 1.2 ? 'bg-red-100 text-red-700' : peak.multiplier >= 1.1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    +{((peak.multiplier - 1) * 100).toFixed(0)}% surge
                  </span>
                </div>
                <div className="text-right">
                  <button title="Remove peak hour" onClick={() => removePeakHour(idx)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors" id={`remove-peak-${idx}`}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
            {config.peakHourConfig.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No peak hour windows configured. Click "Add Window" to create one.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
