'use client';

import React, { useState } from 'react';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, GripVertical, ChevronDown, ChevronUp,
  Image as ImageIcon, ArrowRight, Globe, Calendar, Save, X, Copy,
  ToggleLeft, ToggleRight, Megaphone, MapPin, Monitor,
} from 'lucide-react';
import { useMarketplace, type HeroBanner, type ExtendedCampaignBanner, type ExtendedCountryBanner } from '@/lib/contexts/marketplace-context';
import { CountryFlag } from '@/components/shared/country-flag';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type BannerTab = 'hero' | 'campaign' | 'country';

const GRADIENT_PRESETS = [
  { label: 'Blue Dark', value: 'from-slate-900 via-blue-950 to-blue-900' },
  { label: 'Rose Pink', value: 'from-rose-900 via-pink-900 to-fuchsia-900' },
  { label: 'Amber Orange', value: 'from-amber-900 via-orange-900 to-yellow-900' },
  { label: 'Fuchsia Rose', value: 'from-fuchsia-900 via-pink-800 to-rose-900' },
  { label: 'Emerald Teal', value: 'from-emerald-600 to-teal-600' },
  { label: 'Indigo Purple', value: 'from-indigo-600 to-purple-600' },
  { label: 'Orange Yellow', value: 'from-orange-500 via-amber-500 to-yellow-400' },
  { label: 'Blue Violet', value: 'from-blue-600 via-indigo-600 to-violet-600' },
  { label: 'Slate Dark', value: 'from-slate-800 to-slate-600' },
  { label: 'Red Warm', value: 'from-red-700 to-red-500' },
];

const COUNTRIES = ['India', 'UAE', 'Saudi Arabia', 'Qatar', 'UK', 'Kuwait', 'Oman', 'USA'];

// â”€â”€ Hero Banner Editor Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function HeroBannerModal({ banner, onSave, onClose }: {
  banner?: HeroBanner;
  onSave: (data: Omit<HeroBanner, 'id'>) => void;
  onClose: () => void;
}) {
  const [tag, setTag] = useState(banner?.tag || '');
  const [headline, setHeadline] = useState(banner?.headline || '');
  const [cta, setCta] = useState(banner?.cta || 'Shop Now');
  const [ctaHref, setCtaHref] = useState(banner?.ctaHref || '/marketplace/category-list');
  const [gradient, setGradient] = useState(banner?.gradient || GRADIENT_PRESETS[0].value);
  const [status, setStatus] = useState<'active' | 'inactive'>(banner?.status || 'active');
  const [sortOrder, setSortOrder] = useState(banner?.sortOrder || 1);
  const [startDate, setStartDate] = useState(banner?.startDate || '');
  const [endDate, setEndDate] = useState(banner?.endDate || '');
  const [countries, setCountries] = useState<string[]>(banner?.countries || COUNTRIES);

  const toggleCountry = (c: string) =>
    setCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-black text-slate-900">{banner ? 'Edit Hero Banner' : 'Add Hero Banner'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {/* Live Preview */}
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Live Preview</p>
          <div className={`bg-linear-to-r ${gradient} rounded-xl h-48 flex items-center p-8 relative overflow-hidden`}>
            <div className="relative z-10 max-w-md">
              {tag && <span className="bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 mb-3 inline-block uppercase tracking-widest rounded-full">{tag}</span>}
              <h2 className="text-white text-2xl font-bold mb-3 leading-tight whitespace-pre-line">{headline || 'Banner Headline'}</h2>
              <span className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-5 py-2 text-sm rounded-lg">
                {cta || 'Shop Now'} <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="tag-badge">Tag / Badge *</label>
              <input id="tag-badge" value={tag} onChange={e => setTag(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. BIG TECH SALE" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="cta-button-text">CTA Button Text *</label>
              <input id="cta-button-text" value={cta} onChange={e => setCta(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Shop Now" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="headline">Headline *</label>
            <textarea id="headline" value={headline} onChange={e => setHeadline(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Up to 40% Off\non Laptops & Phones" />
            <p className="text-[10px] text-slate-400 mt-1">Use \n for line breaks</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="cta-link">CTA Link</label>
            <input id="cta-link" value={ctaHref} onChange={e => setCtaHref(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-mono" placeholder="/marketplace/category/electronics" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Background Gradient</label>
            <div className="grid grid-cols-5 gap-2">
              {GRADIENT_PRESETS.map(g => (
                <button key={g.value} onClick={() => setGradient(g.value)}
                  className={`h-10 rounded-lg bg-linear-to-r ${g.value} border-2 transition-all ${gradient === g.value ? 'border-blue-500 ring-2 ring-blue-200 scale-105' : 'border-transparent hover:border-slate-300'}`}
                  title={g.label}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="sort-order">Sort Order</label>
              <input id="sort-order" type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Sort order" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="start-date">Start Date</label>
              <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Start date" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="end-date">End Date</label>
              <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="End date" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Country Targeting</label>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map(c => (
                <label key={c} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={countries.includes(c)} onChange={() => toggleCountry(c)} className="rounded" />{c}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <button onClick={() => setStatus(s => s === 'active' ? 'inactive' : 'active')} className="flex items-center gap-1.5">
              {status === 'active' ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
              <span className={`text-xs font-bold ${status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>
            </button>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-200">
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
          <button onClick={() => {
            onSave({ tag, headline, cta, ctaHref, gradient, status, sortOrder, startDate, endDate, countries });
            onClose();
          }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {banner ? 'Update Banner' : 'Create Banner'}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Main Banner Management Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function BannersPage() {
  const {
    heroBanners, campaignBanners, countryBanners,
    setHeroBanners, updateHeroBanner, addHeroBanner, deleteHeroBanner,
    setCampaignBanners, setCountryBanners,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<BannerTab>('hero');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editBanner, setEditBanner] = useState<HeroBanner | undefined>(undefined);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getBanners(),
    []
  );
  const { execute } = useAdminAction(showToast);

  const tabs: { key: BannerTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'hero', label: 'Hero Banners', icon: Monitor, count: heroBanners.length },
    { key: 'campaign', label: 'Campaign Banners', icon: Megaphone, count: campaignBanners.length },
    { key: 'country', label: 'Country Banners', icon: MapPin, count: countryBanners.length },
  ];

  const moveHeroBanner = (id: string, direction: 'up' | 'down') => {
    const sorted = [...heroBanners].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(b => b.id === id);
    if (direction === 'up' && idx > 0) {
      const temp = sorted[idx].sortOrder;
      sorted[idx].sortOrder = sorted[idx - 1].sortOrder;
      sorted[idx - 1].sortOrder = temp;
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const temp = sorted[idx].sortOrder;
      sorted[idx].sortOrder = sorted[idx + 1].sortOrder;
      sorted[idx + 1].sortOrder = temp;
    }
    setHeroBanners([...sorted]);
  };

  const toggleCampaignStatus = (id: string) =>
    setCampaignBanners(campaignBanners.map(b => b.id === id ? { ...b, status: b.status === 'active' ? 'inactive' : 'active' } : b));

  const toggleCountryStatus = (id: string) =>
    setCountryBanners(countryBanners.map(b => b.id === id ? { ...b, status: b.status === 'active' ? 'inactive' : 'active' } : b));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Banner Management</h1>
          <p className="text-slate-500 text-sm mt-1">Control homepage hero banners, campaign banners, and country-specific banners. Changes reflect on the website immediately.</p>
        </div>
        {activeTab === 'hero' && (
          <button onClick={() => { setEditBanner(undefined); setShowAddModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Add Hero Banner
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <div key={t.key} className={`bg-white border rounded-xl p-4 shadow-sm cursor-pointer transition-all ${activeTab === t.key ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => setActiveTab(t.key)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setActiveTab(t.key))}>
              <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4 text-blue-600" /><span className="text-xs font-bold text-slate-500 uppercase">{t.label}</span></div>
              <p className="text-2xl font-black text-slate-900">{t.count}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Total banners</p>
            </div>
          );
        })}
      </div>

      {/* â”€â”€ Hero Banners Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'hero' && (
        <div className="space-y-3">
          {heroBanners.sort((a, b) => a.sortOrder - b.sortOrder).map((b, idx) => (
            <div key={b.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${b.status === 'inactive' ? 'opacity-60' : ''}`}>
              <div className="flex items-stretch">
                {/* Preview */}
                <div className={`w-72 bg-linear-to-r ${b.gradient} p-5 shrink-0 flex flex-col justify-center relative overflow-hidden`}>
                  {b.tag && <span className="bg-white/20 text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest rounded-full self-start mb-2">{b.tag}</span>}
                  <h3 className="text-white font-bold text-sm leading-tight whitespace-pre-line line-clamp-2">{b.headline}</h3>
                  <span className="bg-white text-slate-900 text-[9px] font-bold px-3 py-1 rounded mt-2 self-start">{b.cta} â†’</span>
                </div>

                {/* Details */}
                <div className="flex-1 p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-900">#{b.sortOrder}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${b.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{b.status.toUpperCase()}</span>
                      {b.startDate && <span className="text-[9px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{b.startDate}{b.endDate ? ` â†’ ${b.endDate}` : ''}</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">CTA: <span className="font-mono text-blue-600">{b.ctaHref}</span></p>
                    {b.countries && <div className="flex gap-1 mt-1.5">{b.countries.slice(0, 5).map(c => <span key={c} className="text-[8px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">{c}</span>)}{b.countries.length > 5 && <span className="text-[8px] text-slate-400">+{b.countries.length - 5}</span>}</div>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveHeroBanner(b.id, 'up')} disabled={idx === 0} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30" title="Move up"><ChevronUp className="w-4 h-4 text-slate-400" /></button>
                    <button onClick={() => moveHeroBanner(b.id, 'down')} disabled={idx === heroBanners.length - 1} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30" title="Move down"><ChevronDown className="w-4 h-4 text-slate-400" /></button>
                    <button onClick={() => updateHeroBanner(b.id, { status: b.status === 'active' ? 'inactive' : 'active' })} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Toggle status">
                      {b.status === 'active' ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
                    </button>
                    <button onClick={() => { setEditBanner(b); setShowAddModal(true); }} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Edit"><Edit2 className="w-4 h-4 text-blue-600" /></button>
                    <button onClick={() => { if (confirm('Delete this banner?')) deleteHeroBanner(b.id); }} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {heroBanners.length === 0 && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No hero banners yet</p>
              <button onClick={() => { setEditBanner(undefined); setShowAddModal(true); }} className="mt-3 text-blue-600 text-sm font-bold">+ Add First Banner</button>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Campaign Banners Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'campaign' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs">
              <tr>
                <th className="px-5 py-3.5 text-left font-semibold">#</th>
                <th className="px-4 py-3.5 text-left font-semibold">Preview</th>
                <th className="px-4 py-3.5 text-left font-semibold">Tag</th>
                <th className="px-4 py-3.5 text-left font-semibold">Headline</th>
                <th className="px-4 py-3.5 text-left font-semibold">CTA</th>
                <th className="px-4 py-3.5 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaignBanners.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{b.sortOrder}</td>
                  <td className="px-4 py-3.5">
                    <div className={`w-32 h-16 rounded-lg bg-linear-to-r ${b.gradient} flex items-center justify-center`}>
                      <span className="text-white text-[8px] font-bold">{b.tag}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{b.tag}</td>
                  <td className="px-4 py-3.5 text-slate-600">{b.headline}<br /><span className="text-xs text-slate-400">{b.subheadline}</span></td>
                  <td className="px-4 py-3.5"><span className="text-xs font-mono text-blue-600">{b.ctaHref}</span></td>
                  <td className="px-4 py-3.5 text-center">
                    <button onClick={() => toggleCampaignStatus(b.id)} className="flex items-center gap-1.5 mx-auto">
                      {b.status === 'active' ? <ToggleRight className="w-6 h-6 text-emerald-600" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                      <span className={`text-[10px] font-bold ${b.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>{b.status === 'active' ? 'ON' : 'OFF'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* â”€â”€ Country Banners Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'country' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {countryBanners.map(b => (
            <div key={b.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${b.status === 'inactive' ? 'opacity-60' : ''}`}>
              <div className="p-5 text-center">
                <span className="text-3xl">{b.flag}</span>
                <h3 className="font-bold text-slate-900">{b.country}</h3>
                <p className="text-xs text-slate-500 mt-1">{b.headline}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{b.subtitle}</p>
                <p className="text-[9px] font-mono text-blue-600 mt-2">{b.href}</p>
              </div>
              <div className="flex border-t border-slate-100">
                <button onClick={() => toggleCountryStatus(b.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors">
                  {b.status === 'active' ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-300" />}
                  <span className={b.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}>{b.status === 'active' ? 'Active' : 'Inactive'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <HeroBannerModal
          banner={editBanner}
          onSave={(data) => {
            if (editBanner) {
              updateHeroBanner(editBanner.id, data);
            } else {
              addHeroBanner(data);
            }
          }}
          onClose={() => { setShowAddModal(false); setEditBanner(undefined); }}
        />
      )}
    </div>
  );
}