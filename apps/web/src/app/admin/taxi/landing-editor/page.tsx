'use client';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import React, { useState, useEffect } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import { API_BASE_URL } from '@/lib/config/api-base';
import {
  Globe, Save, Eye, ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown,
  FileText, DollarSign, Users, Star, Shield, CheckCircle, AlertTriangle,
  Edit3, RotateCcw, X
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface CountryLandingContent {
  heroTitle: string;
  heroSub: string;
  earningRange: string;
  driverCount: string;
  payout: string;
  payoutFreq: string;
  requirements: string[];
  documents: string[];
  testimonialName: string;
  testimonialQuote: string;
  testimonialFleet: string;
  testimonialRating: number;
}

type CountryCode = 'IN' | 'AE' | 'SA' | 'GB';

// ─── Mock Data (would come from API in production) ──────────────────────────
const COUNTRIES: Record<CountryCode, { name: string; flag: string }> = {
  IN: { name: 'India', flag: '🇮🇳' },
  AE: { name: 'UAE', flag: '🇦🇪' },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' }
};

const DEFAULT_CONTENT: Record<CountryCode, CountryLandingContent> = {
  IN: {
    heroTitle: 'Launch Your Fleet Business in India',
    heroSub: 'Join 1,200+ fleet vendors earning with KARTSEEK across 50+ cities.',
    earningRange: '₹3,00,000 – ₹12,00,000/month', driverCount: '8,000+',
    payout: 'Bank Transfer + UPI', payoutFreq: 'Weekly (Mondays)',
    requirements: ['GST Registration', 'PAN Card', 'Business Registration Certificate', 'Vehicle Insurance Policy', 'Fleet Registration (RC Book)', 'Minimum 1 vehicle less than 8 years old'],
    documents: ['GST Certificate', 'PAN Card', 'Business Registration', 'Fleet RC Books', 'Vehicle Insurance', 'Address Proof'],
    testimonialName: 'Rajesh Patel', testimonialQuote: 'Started with 5 autos. Now I manage 40 cabs and 12 autos.', testimonialFleet: 'SpeedCab India', testimonialRating: 4.8
  },
  AE: {
    heroTitle: 'Start Your Fleet Business in the UAE',
    heroSub: 'Serve millions across Dubai, Abu Dhabi, Sharjah & more.',
    earningRange: 'AED 50,000 – 200,000/month', driverCount: '1,500+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['RTA Fleet Operator Permit', 'Trade License', 'TRN Certificate', 'Fleet Insurance Policy', 'Emirates ID (Owner)', 'Vehicles under 5 years old'],
    documents: ['RTA Fleet Permit', 'Trade License', 'TRN Certificate', 'Emirates ID', 'Fleet Insurance', 'MOHRE Labor Card'],
    testimonialName: 'Ahmed Al-Fahim', testimonialQuote: 'Managing a fleet in Dubai was challenging until KARTSEEK.', testimonialFleet: 'SafeRide UAE', testimonialRating: 4.7
  },
  SA: {
    heroTitle: 'Launch Your Fleet Business in Saudi Arabia',
    heroSub: 'Serve Vision 2030 transportation demand across Riyadh, Jeddah & beyond.',
    earningRange: 'SAR 40,000 – 180,000/month', driverCount: '1,200+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['TGA Transport License', 'Commercial Registration (CR)', 'VAT Certificate', 'Fleet Insurance', 'Municipality License', 'Vehicles under 5 years'],
    documents: ['TGA License', 'CR Certificate', 'VAT Registration', 'National ID / Iqama', 'Fleet Insurance', 'Municipality License'],
    testimonialName: 'Fahad Al-Otaibi', testimonialQuote: 'KARTSEEK handles all our Saudi compliance needs.', testimonialFleet: 'Riyadh Express', testimonialRating: 4.8
  },
  GB: {
    heroTitle: 'Start Your Fleet Business in the UK',
    heroSub: 'Join the growing private hire market across London, Manchester & 30+ cities.',
    earningRange: '£15,000 – £60,000/month', driverCount: '800+',
    payout: 'Bank Transfer', payoutFreq: 'Weekly',
    requirements: ['Private Hire Operator License', 'Companies House Registration', 'VAT Registration (if applicable)', 'Public Liability Insurance', 'Fleet Insurance', 'DBS Check (Director)'],
    documents: ['PHV Operator License', 'Companies House Certificate', 'VAT Registration', 'Public Liability Insurance', 'Fleet Insurance', 'DBS Check'],
    testimonialName: 'David Thompson', testimonialQuote: 'KARTSEEK understands UK transport regulations.', testimonialFleet: 'GreenCab London', testimonialRating: 4.6
  }
};

// ─── Editable List Component ────────────────────────────────────────────────
function EditableList({ items, onChange, label }: { items: string[]; onChange: (items: string[]) => void; label: string }) {
  const [newItem, setNewItem] = useState('');
  const add = () => { if (newItem.trim()) { onChange([...items, newItem.trim()]); setNewItem(''); } };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const n = [...items]; const t = n[i]; n[i] = n[i + dir]; n[i + dir] = t; onChange(n);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase block">{label}</label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <span className="flex-1 text-sm text-slate-700">{item}</span>
            <div className="flex gap-1">
              {i > 0 && <button onClick={() => move(i, -1)} className="p-1 text-slate-400 hover:text-slate-600" title="Move up"><ArrowUp className="w-3 h-3" /></button>}
              {i < items.length - 1 && <button onClick={() => move(i, 1)} className="p-1 text-slate-400 hover:text-slate-600" title="Move down"><ArrowDown className="w-3 h-3" /></button>}
              <button onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600" title="Remove"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500" placeholder={`Add new ${label.toLowerCase()}...`} />
        <button onClick={add} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600" aria-label="Add"><Plus className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AdminLandingEditorPage() {
  const { regionLabel, isFiltered, formatPrice } = useTaxiRegionFilter([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('IN');
  const [content, setContent] = useState<Record<CountryCode, CountryLandingContent>>({ ...DEFAULT_CONTENT });
  const [saved, setSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('hero');

  // Fetch saved layout from API on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/layouts/taxi/homepage`, {
      signal: AbortSignal.timeout(5000)
    }).then(res => res.ok ? res.json() : null).then(data => {
      if (data?.data) setContent(prev => ({ ...prev, ...data.data }));
    }).catch(() => { /* Keep defaults */ });
  }, []);

  const c = content[selectedCountry];
  const update = (field: keyof CountryLandingContent, value: string | string[] | number) => {
    setContent(prev => ({ ...prev, [selectedCountry]: { ...prev[selectedCountry], [field]: value } }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await fetch(`${API_BASE_URL}/admin/layouts/taxi/homepage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: content }),
        signal: AbortSignal.timeout(5000)
      });
    } catch { /* Save failed silently */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };
  const handleReset = () => { setContent(prev => ({ ...prev, [selectedCountry]: DEFAULT_CONTENT[selectedCountry] })); setSaved(false); };

  const sections = [
    { key: 'hero', label: 'Hero Section', icon: Edit3 },
    { key: 'earnings', label: 'Earnings & Payouts', icon: DollarSign },
    { key: 'requirements', label: 'Requirements & Documents', icon: FileText },
    { key: 'testimonial', label: 'Testimonial', icon: Star },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-amber-500" /> Vendor Landing Page Editor
          </h1>
          <p className="text-slate-500 text-sm mt-1">Edit the public vendor landing page content. Changes are applied per country.</p>
        </div>
        <div className="flex gap-2">
          <a href="/seller/taxi/landing" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50" id="preview-landing">
            <Eye className="w-3.5 h-3.5" /> Preview
          </a>
          <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50" id="reset-landing">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm" id="save-landing">
            <Save className="w-3.5 h-3.5" /> Publish Changes
          </button>
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4" /> Changes saved and published for <CountryFlag code={selectedCountry} size="sm" /> {COUNTRIES[selectedCountry].name}.
        </div>
      )}

      {/* Country Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {(Object.keys(COUNTRIES) as CountryCode[]).map(code => (
          <button key={code} onClick={() => setSelectedCountry(code)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${selectedCountry === code ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <CountryFlag code={code} size="sm" /> {COUNTRIES[code].name}
          </button>
        ))}
      </div>

      {/* Editable Sections */}
      <div className="space-y-3">
        {sections.map(sec => {
          const Icon = sec.icon;
          const isOpen = expandedSection === sec.key;
          return (
            <div key={sec.key} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <button onClick={() => setExpandedSection(isOpen ? null : sec.key)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50" id={`section-${sec.key}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><Icon className="w-4 h-4 text-amber-600" /></div>
                  <span className="font-bold text-slate-900 text-sm">{sec.label}</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                  {sec.key === 'hero' && (
                    <>
                      <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="edit-hero-title">Hero Title</label>
                        <input title="Hero Title" placeholder="Hero Title" value={c.heroTitle} onChange={e => update('heroTitle', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500" id="edit-hero-title" /></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="edit-hero-sub">Hero Subtitle</label>
                        <textarea title="Hero Subtitle" placeholder="Hero Subtitle" value={c.heroSub} onChange={e => update('heroSub', e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-amber-500" id="edit-hero-sub" /></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="edit-driver-count">Active Driver Count</label>
                        <input title="Active Driver Count" placeholder="e.g. 5,000+" value={c.driverCount} onChange={e => update('driverCount', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500" id="edit-driver-count" /></div>
                    </>
                  )}

                  {sec.key === 'earnings' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="edit-earning-range">Monthly Earning Range</label>
                          <input title="Monthly Earning Range" placeholder="e.g. 40,000" value={c.earningRange} onChange={e => update('earningRange', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500" id="edit-earning-range" /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="edit-payout">Payout Method</label>
                          <input title="Payout Method" placeholder="e.g. UPI" value={c.payout} onChange={e => update('payout', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500" id="edit-payout" /></div>
                      </div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="edit-payout-freq">Payout Frequency</label>
                        <input title="Payout Frequency" placeholder="e.g. Daily" value={c.payoutFreq} onChange={e => update('payoutFreq', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500" id="edit-payout-freq" /></div>
                    </>
                  )}

                  {sec.key === 'requirements' && (
                    <>
                      <EditableList items={c.requirements} onChange={items => update('requirements', items)} label="Fleet Requirements" />
                      <div className="border-t border-slate-100 pt-4" />
                      <EditableList items={c.documents} onChange={items => update('documents', items)} label="Required Documents" />
                    </>
                  )}

                  {sec.key === 'testimonial' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="edit-testimonial-name">Name</label>
                        <input title="Name" placeholder="Name" value={c.testimonialName} onChange={e => update('testimonialName', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500" id="edit-testimonial-name" /></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="edit-testimonial-fleet">Fleet Name</label>
                        <input title="Fleet Name" placeholder="Fleet Name" value={c.testimonialFleet} onChange={e => update('testimonialFleet', e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500" id="edit-testimonial-fleet" /></div>
                      <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="edit-testimonial-quote">Quote</label>
                        <textarea title="Quote" placeholder="Quote" value={c.testimonialQuote} onChange={e => update('testimonialQuote', e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-amber-500" id="edit-testimonial-quote" /></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="edit-testimonial-rating">Rating (1–5)</label>
                        <input title="Rating" placeholder="Rating" type="number" min={1} max={5} step={0.1} value={c.testimonialRating} onChange={e => update('testimonialRating', parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500" id="edit-testimonial-rating" /></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Landing Page Preview</p>
          <p className="text-xs text-amber-700 mt-1">
            Click &ldquo;Preview&rdquo; above to see the public vendor landing page at <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">/seller/taxi/landing</code>. 
            The page automatically detects the browsing country and shows the relevant content. Changes take effect immediately after publishing.
          </p>
        </div>
      </div>
    </div>
  );
}
