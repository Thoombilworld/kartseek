'use client';
import React, { useState, useEffect } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import { useRestaurantRegionFilter } from '@/hooks/useRestaurantRegionFilter';
import {
  Globe, Save, Eye, ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown,
  FileText, DollarSign, Users, Star, Shield, CheckCircle, AlertTriangle,
  Edit3, RotateCcw, X, UtensilsCrossed
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface CountryLandingContent {
  heroTitle: string;
  heroSub: string;
  earningRange: string;
  restaurantCount: string;
  payout: string;
  payoutFreq: string;
  requirements: string[];
  documents: string[];
  testimonialName: string;
  testimonialQuote: string;
  testimonialRestaurant: string;
  testimonialRating: number;
}

type CountryCode = 'QA' | 'AE' | 'SA' | 'BH' | 'KW' | 'OM' | 'IN' | 'IN' | 'GB' | 'US';

// ─── Mock Data (would come from API in production) ──────────────────────────
const COUNTRIES: Record<CountryCode, { name: string; flag: string }> = {
  QA: { name: 'Qatar', flag: '🇶🇦' },
  AE: { name: 'UAE', flag: '🇦🇪' },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  BH: { name: 'Bahrain', flag: '🇧🇭' },
  KW: { name: 'Kuwait', flag: '🇰🇼' },
  OM: { name: 'Oman', flag: '🇴🇲' },
  IN: { name: 'India', flag: '🇮🇳' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  US: { name: 'United States', flag: '🇺🇸' }
};

const DEFAULT_CONTENT: Record<CountryCode, CountryLandingContent> = {
  QA: {
    heroTitle: 'Launch Your Restaurant on KARTSEEK in Qatar',
    heroSub: 'Partner with KARTSEEK to serve Doha\'s booming food delivery market.',
    earningRange: 'QAR 25,000 – 120,000/month', restaurantCount: '800+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['Qatar Municipality Food License', 'Commercial Registration (CR)', 'Health Card (Food Handlers)', 'Civil Defence Certificate', 'Qatar Chamber Membership', 'Minimum 1 operating outlet'],
    documents: ['Municipality Food License', 'Commercial Registration', 'Health Cards (Staff)', 'Civil Defence Certificate', 'QID (Owner)', 'Trade License'],
    testimonialName: 'Ahmed Al-Thani', testimonialQuote: 'KARTSEEK helped us go from a single restaurant in Doha to serving all of Qatar.', testimonialRestaurant: 'Al Shami Kitchen, Doha', testimonialRating: 4.9
  },
  AE: {
    heroTitle: 'Launch Your Restaurant on KARTSEEK in the UAE',
    heroSub: 'Serve millions across Dubai, Abu Dhabi, Sharjah & more.',
    earningRange: 'AED 80,000 – 400,000/month', restaurantCount: '2,500+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['Dubai Municipality Food License', 'HACCP Certification', 'Trade License', 'Ejari / Tenancy Contract', 'Emirates ID (Owner)', 'Civil Defence Approval'],
    documents: ['DM Food License', 'HACCP Certificate', 'Trade License', 'Ejari Contract', 'Emirates ID', 'Civil Defence Certificate'],
    testimonialName: 'Fatima Al-Zahra', testimonialQuote: 'KARTSEEK\'s tech-first approach makes running a restaurant in Dubai so much easier.', testimonialRestaurant: 'Zafran House, Dubai', testimonialRating: 4.7
  },
  SA: {
    heroTitle: 'Grow Your Restaurant Business in Saudi Arabia',
    heroSub: 'Serve Vision 2030 food demand across Riyadh, Jeddah & beyond.',
    earningRange: 'SAR 60,000 – 350,000/month', restaurantCount: '1,800+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['Baladi / Municipality License', 'Health Permit (Weqaya)', 'Commercial Registration (CR)', 'VAT Certificate', 'Civil Defence Certificate', 'Saudization Compliance'],
    documents: ['Baladi License', 'Health Permit', 'CR Certificate', 'VAT Registration', 'National ID / Iqama', 'Civil Defence Certificate'],
    testimonialName: 'Abdullah Al-Rashid', testimonialQuote: 'KARTSEEK handles all the Saudi compliance. We focus on cooking.', testimonialRestaurant: 'Najd Kitchen, Riyadh', testimonialRating: 4.8
  },
  BH: {
    heroTitle: 'Start Your Restaurant Business Online in Bahrain',
    heroSub: 'Reach Manama and beyond with Bahrain\'s leading food delivery platform.',
    earningRange: 'BHD 4,000 – 20,000/month', restaurantCount: '350+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['Municipality Health Permit', 'Commercial Registration', 'Civil Defence Certificate', 'Health Cards (Staff)', 'BCCI Membership', 'Minimum 1 outlet'],
    documents: ['Health Permit', 'CR Certificate', 'Civil Defence Certificate', 'Health Cards', 'CPR (Owner)', 'Trade License'],
    testimonialName: 'Yusuf Al-Khalifa', testimonialQuote: 'Simple onboarding, great support, and our delivery orders tripled within months.', testimonialRestaurant: 'Bahrain Bites, Manama', testimonialRating: 4.6
  },
  KW: {
    heroTitle: 'Grow Your Restaurant Online in Kuwait',
    heroSub: 'Join Kuwait\'s digital food revolution with zero income tax.',
    earningRange: 'KWD 3,000 – 15,000/month', restaurantCount: '280+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['KFDA Food License', 'Municipality Health Certificate', 'Commercial License', 'Civil Defence Certificate', 'Health Cards (Staff)', 'KCCI Registration'],
    documents: ['KFDA License', 'Health Certificate', 'Commercial License', 'Civil Defence Certificate', 'Civil ID (Owner)', 'Health Cards'],
    testimonialName: 'Mariam Al-Sabah', testimonialQuote: 'KARTSEEK\'s scheduled delivery features are game changers for our catering.', testimonialRestaurant: 'Sufra Kuwait, Kuwait City', testimonialRating: 4.7
  },
  OM: {
    heroTitle: 'Launch Your Restaurant on KARTSEEK in Oman',
    heroSub: 'Serve Muscat and beyond with reliable delivery and compliance support.',
    earningRange: 'OMR 2,000 – 12,000/month', restaurantCount: '180+',
    payout: 'Bank Transfer', payoutFreq: 'Bi-weekly',
    requirements: ['Oman Municipality Food Permit', 'Commercial Registration', 'Health Cards (Staff)', 'Civil Defence Certificate', 'OCCI Membership', 'VAT Registration'],
    documents: ['Municipality Permit', 'CR Certificate', 'Health Cards', 'Civil Defence Certificate', 'National ID (Owner)', 'VAT Certificate'],
    testimonialName: 'Khalid Al-Balushi', testimonialQuote: 'The platform handles VAT, food safety, and delivery — we just focus on great food.', testimonialRestaurant: 'Muscat Grill, Muscat', testimonialRating: 4.5
  },
  IN: {
    heroTitle: 'Scale Your Restaurant in India',
    heroSub: 'Join 5,000+ restaurants earning with KARTSEEK across 100+ cities.',
    earningRange: '₹5,00,000 – ₹25,00,000/month', restaurantCount: '5,000+',
    payout: 'Bank Transfer + UPI', payoutFreq: 'Weekly (Mondays)',
    requirements: ['FSSAI Food License', 'GST Registration', 'Shop & Establishment License', 'Fire NOC', 'Eating House License', 'Minimum 1 operating outlet'],
    documents: ['FSSAI License', 'GST Certificate', 'PAN Card', 'Shop & Establishment License', 'Fire NOC', 'Health / Trade License'],
    testimonialName: 'Arjun Sharma', testimonialQuote: 'Started with one cloud kitchen. Now 8 outlets across 3 cities.', testimonialRestaurant: 'Spice Route Kitchen, Bangalore', testimonialRating: 4.8
  },
  GB: {
    heroTitle: 'Partner Your Restaurant with KARTSEEK in the UK',
    heroSub: 'Join the growing food delivery market across London, Manchester & 30+ cities.',
    earningRange: '£20,000 – £80,000/month', restaurantCount: '1,500+',
    payout: 'Bank Transfer', payoutFreq: 'Weekly',
    requirements: ['FSA Food Business Registration', 'Food Hygiene Rating (FHRS)', 'Alcohol License (if applicable)', 'Employer Liability Insurance', 'Allergen Documentation', 'EHO Inspection Compliance'],
    documents: ['FSA Registration', 'Food Hygiene Certificate', 'Premises License', 'Public Liability Insurance', 'Allergen Documentation', 'Gas Safety Certificate'],
    testimonialName: 'James Chen', testimonialQuote: 'KARTSEEK understands UK food regulations perfectly.', testimonialRestaurant: 'Dragon Palace, London', testimonialRating: 4.6
  },
  US: {
    heroTitle: 'Launch Your Restaurant on KARTSEEK in the USA',
    heroSub: 'Reach millions across New York, LA, Chicago & 100+ cities.',
    earningRange: '$15,000 – $80,000/month', restaurantCount: '2,200+',
    payout: 'ACH Transfer', payoutFreq: 'Weekly',
    requirements: ['FDA Food Facility Registration', 'State Health Department Permit', 'Business License', 'ServSafe Certification', 'Fire Department Permit', 'EIN'],
    documents: ['Health Permit', 'Business License', 'EIN Certificate', 'ServSafe Certificate', 'Fire Dept Permit', 'Liability Insurance'],
    testimonialName: 'Maria Santos', testimonialQuote: 'KARTSEEK handles state-by-state compliance which was our biggest headache.', testimonialRestaurant: 'Casa Santos, New York', testimonialRating: 4.7
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
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" placeholder={`Add new ${label.toLowerCase()}...`} />
        <button onClick={add} aria-label={`Add new ${label.toLowerCase()}`} title={`Add new ${label.toLowerCase()}`} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600"><Plus className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AdminRestaurantLandingEditorPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('QA');
  const [content, setContent] = useState<Record<CountryCode, CountryLandingContent>>({ ...DEFAULT_CONTENT });
  const [saved, setSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('hero');
  const { regionLabel, isFiltered, regionCode } = useRestaurantRegionFilter([]);

  // Auto-sync with global region selector
  useEffect(() => {
    if (isFiltered && regionCode in COUNTRIES) {
      setSelectedCountry(regionCode as CountryCode);
    }
  }, [isFiltered, regionCode]);

  const c = content[selectedCountry];
  const update = (field: keyof CountryLandingContent, value: string | string[] | number) => {
    setContent(prev => ({ ...prev, [selectedCountry]: { ...prev[selectedCountry], [field]: value } }));
    setSaved(false);
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };
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
            <UtensilsCrossed className="w-6 h-6 text-orange-500" /> Restaurant Landing Page Editor
          </h1>
          <p className="text-slate-500 text-sm mt-1">{isFiltered ? `${regionLabel} — ` : ''}Edit the public restaurant partner landing page content. Changes are applied per country.</p>
        </div>
        <div className="flex gap-2">
          <a href="/seller/restaurant/landing" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50" id="restaurant-preview-landing">
            <Eye className="w-3.5 h-3.5" /> Preview
          </a>
          <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50" id="restaurant-reset-landing">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-sm" id="restaurant-save-landing">
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${selectedCountry === code ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            data-country={code}>
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
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50" id={`restaurant-section-${sec.key}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center"><Icon className="w-4 h-4 text-orange-600" /></div>
                  <span className="font-bold text-slate-900 text-sm">{sec.label}</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                  {sec.key === 'hero' && (
                    <>
                      <div><label htmlFor="restaurant-edit-hero-title" className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Hero Title</label>
                        <input value={c.heroTitle} onChange={e => update('heroTitle', e.target.value)} title="Hero Title" placeholder="Enter hero title" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" id="restaurant-edit-hero-title" /></div>
                      <div><label htmlFor="restaurant-edit-hero-sub" className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Hero Subtitle</label>
                        <textarea value={c.heroSub} onChange={e => update('heroSub', e.target.value)} rows={2} title="Hero Subtitle" placeholder="Enter hero subtitle" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-orange-500" id="restaurant-edit-hero-sub" /></div>
                      <div><label htmlFor="restaurant-edit-count" className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Partner Restaurant Count</label>
                        <input value={c.restaurantCount} onChange={e => update('restaurantCount', e.target.value)} title="Partner Restaurant Count" placeholder="e.g. 800+" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" id="restaurant-edit-count" /></div>
                    </>
                  )}

                  {sec.key === 'earnings' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label htmlFor="restaurant-edit-earning-range" className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Monthly Earning Range</label>
                          <input value={c.earningRange} onChange={e => update('earningRange', e.target.value)} title="Monthly Earning Range" placeholder="e.g. QAR 25,000 – 120,000/month" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" id="restaurant-edit-earning-range" /></div>
                        <div><label htmlFor="restaurant-edit-payout" className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Payout Method</label>
                          <input value={c.payout} onChange={e => update('payout', e.target.value)} title="Payout Method" placeholder="e.g. Bank Transfer" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" id="restaurant-edit-payout" /></div>
                      </div>
                      <div><label htmlFor="restaurant-edit-payout-freq" className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Payout Frequency</label>
                        <input value={c.payoutFreq} onChange={e => update('payoutFreq', e.target.value)} title="Payout Frequency" placeholder="e.g. Bi-weekly" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" id="restaurant-edit-payout-freq" /></div>
                    </>
                  )}

                  {sec.key === 'requirements' && (
                    <>
                      <EditableList items={c.requirements} onChange={items => update('requirements', items)} label="Restaurant Requirements" />
                      <div className="border-t border-slate-100 pt-4" />
                      <EditableList items={c.documents} onChange={items => update('documents', items)} label="Required Documents" />
                    </>
                  )}

                  {sec.key === 'testimonial' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div><label htmlFor="restaurant-edit-testimonial-name" className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Name</label>
                        <input value={c.testimonialName} onChange={e => update('testimonialName', e.target.value)} title="Testimonial Name" placeholder="e.g. Ahmed Al-Thani" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" id="restaurant-edit-testimonial-name" /></div>
                      <div><label htmlFor="restaurant-edit-testimonial-restaurant" className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Restaurant Name</label>
                        <input value={c.testimonialRestaurant} onChange={e => update('testimonialRestaurant', e.target.value)} title="Testimonial Restaurant Name" placeholder="e.g. Al Shami Kitchen, Doha" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" id="restaurant-edit-testimonial-restaurant" /></div>
                      <div className="col-span-2"><label htmlFor="restaurant-edit-testimonial-quote" className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Quote</label>
                        <textarea value={c.testimonialQuote} onChange={e => update('testimonialQuote', e.target.value)} rows={2} title="Testimonial Quote" placeholder="Enter the testimonial quote..." className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-orange-500" id="restaurant-edit-testimonial-quote" /></div>
                      <div><label htmlFor="restaurant-edit-testimonial-rating" className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Rating (1–5)</label>
                        <input type="number" min={1} max={5} step={0.1} value={c.testimonialRating} onChange={e => update('testimonialRating', parseFloat(e.target.value) || 0)} title="Testimonial Rating" placeholder="4.9" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500" id="restaurant-edit-testimonial-rating" /></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview Notice */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-orange-800">Landing Page Preview</p>
          <p className="text-xs text-orange-700 mt-1">
            Click &ldquo;Preview&rdquo; above to see the public restaurant partner landing page at <code className="bg-orange-100 px-1 py-0.5 rounded text-[10px]">/seller/restaurant/landing</code>. 
            The page automatically detects the browsing country and shows the relevant content. Changes take effect immediately after publishing.
          </p>
        </div>
      </div>
    </div>
  );
}
