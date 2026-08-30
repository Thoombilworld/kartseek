'use client';
import React, { useState } from 'react';
import { Languages, Search, Plus, Eye, X, Download, Upload, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Edit2, Globe } from 'lucide-react';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type Language = { code: string; name: string; nativeName: string; flag: string; completion: number; totalKeys: number; translatedKeys: number; reviewedKeys: number; lastUpdated: string; isDefault: boolean; isActive: boolean };

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: 'GB', completion: 100, totalKeys: 2450, translatedKeys: 2450, reviewedKeys: 2450, lastUpdated: '2026-06-06', isDefault: true, isActive: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: 'IN', completion: 92, totalKeys: 2450, translatedKeys: 2254, reviewedKeys: 2100, lastUpdated: '2026-06-05', isDefault: false, isActive: true },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: 'IN', completion: 78, totalKeys: 2450, translatedKeys: 1911, reviewedKeys: 1600, lastUpdated: '2026-06-03', isDefault: false, isActive: true },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: 'IN', completion: 72, totalKeys: 2450, translatedKeys: 1764, reviewedKeys: 1400, lastUpdated: '2026-06-02', isDefault: false, isActive: true },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: 'IN', completion: 65, totalKeys: 2450, translatedKeys: 1592, reviewedKeys: 1200, lastUpdated: '2026-05-30', isDefault: false, isActive: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: 'AE', completion: 85, totalKeys: 2450, translatedKeys: 2082, reviewedKeys: 1900, lastUpdated: '2026-06-04', isDefault: false, isActive: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: 'IN', completion: 55, totalKeys: 2450, translatedKeys: 1347, reviewedKeys: 900, lastUpdated: '2026-05-28', isDefault: false, isActive: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: 'IN', completion: 48, totalKeys: 2450, translatedKeys: 1176, reviewedKeys: 800, lastUpdated: '2026-05-25', isDefault: false, isActive: false },
];

type TranslationKey = { key: string; namespace: string; en: string; translations: Record<string, string>; status: 'translated' | 'missing' | 'needs-review' };

const SAMPLE_KEYS: TranslationKey[] = [
  { key: 'cart.add_to_cart', namespace: 'shopping', en: 'Add to Cart', translations: { hi: 'कार्ट में जोड़ें', ta: 'கூடையில் சேர்', ar: 'أضف إلى السلة' }, status: 'translated' },
  { key: 'cart.checkout', namespace: 'shopping', en: 'Proceed to Checkout', translations: { hi: 'चेकआउट करें', ar: 'متابعة الدفع' }, status: 'translated' },
  { key: 'product.out_of_stock', namespace: 'catalog', en: 'Out of Stock', translations: { hi: 'स्टॉक में नहीं', ta: 'கையிருப்பில் இல்லை', ar: 'غير متوفر' }, status: 'translated' },
  { key: 'order.track_order', namespace: 'orders', en: 'Track Your Order', translations: { hi: 'ऑर्डर ट्रैक करें' }, status: 'needs-review' },
  { key: 'seller.apply_now', namespace: 'seller', en: 'Apply to Sell on KartSeek', translations: {}, status: 'missing' },
  { key: 'payment.pay_now', namespace: 'payments', en: 'Pay Now', translations: { hi: 'अभी भुगतान करें', ar: 'ادفع الآن' }, status: 'translated' },
  { key: 'return.initiate_return', namespace: 'returns', en: 'Initiate Return', translations: { hi: '' }, status: 'missing' },
];

const STATUS_STYLES: Record<string, string> = { translated: 'bg-emerald-50 text-emerald-700', missing: 'bg-red-50 text-red-700', 'needs-review': 'bg-amber-50 text-amber-700' };

function LanguageDrawer({ lang: l, keys, onClose }: { lang: Language; keys: TranslationKey[]; onClose: () => void }) {
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3"><CountryFlag code={l.flag} size="lg" /><div><h2 className="text-lg font-black text-slate-900">{l.name}</h2><p className="text-xs text-slate-500">{l.nativeName} · {l.code}</p></div></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2">{l.isDefault && <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md">Default</span>}<span className={`text-[10px] font-bold px-2 py-1 rounded-md ${l.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{l.isActive ? 'Active' : 'Inactive'}</span></div>

          <div className={`bg-gradient-to-br ${l.completion >= 90 ? 'from-emerald-600 to-teal-700' : l.completion >= 70 ? 'from-amber-500 to-orange-600' : 'from-red-500 to-red-700'} rounded-xl p-5 text-white text-center`}>
            <p className="text-sm font-bold opacity-80">Translation Completion</p>
            <p className="text-5xl font-black mt-1">{l.completion}%</p>
            <p className="text-xs opacity-60 mt-1">{l.translatedKeys}/{l.totalKeys} keys</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-blue-700">{l.totalKeys}</p><p className="text-[10px] text-slate-500">Total</p></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-emerald-700">{l.translatedKeys}</p><p className="text-[10px] text-slate-500">Translated</p></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-purple-700">{l.reviewedKeys}</p><p className="text-[10px] text-slate-500">Reviewed</p></div>
          </div>

          <div><h3 className="text-sm font-bold text-slate-900 mb-2">Translation Keys</h3>
            <div className="space-y-2">{keys.map(k => {
              const val = k.translations[l.code] || '';
              const st = val ? (k.status === 'needs-review' ? 'needs-review' : 'translated') : 'missing';
              return (
                <div key={k.key} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-blue-700 font-bold">{k.key}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLES[st]}`}>{st}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">EN: {k.en}</p>
                  {editKey === k.key ? (
                    <div className="flex gap-2"><input value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-200" /><button onClick={() => setEditKey(null)} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 rounded-lg">Save</button></div>
                  ) : (
                    <div className="flex items-center justify-between"><p className={`text-xs font-bold ${val ? 'text-slate-900' : 'text-red-400 italic'}`}>{val || 'Missing translation'}</p><button onClick={() => { setEditKey(k.key); setEditValue(val); }} className="p-1 hover:bg-slate-200 rounded-lg"><Edit2 className="w-3 h-3 text-slate-400" /></button></div>
                  )}
                </div>
              );
            })}</div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Export JSON</button>
            <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Upload className="w-4 h-4" /> Import</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TranslationsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Language | null>(null);

  const { data: apiData, loading, error, refetch, toast } = useAdminData(() => adminMarketplaceApi.getOrders(), []);

  const filtered = LANGUAGES.filter(l => {
    if (filter === 'active' && !l.isActive) return false;
    if (filter === 'incomplete' && l.completion >= 100) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.nativeName.includes(search)) return false;
    return true;
  });

  const avgCompletion = Math.round(LANGUAGES.filter(l => !l.isDefault).reduce((a, l) => a + l.completion, 0) / (LANGUAGES.length - 1));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Translations</h1><p className="text-sm text-slate-500 mt-0.5">Multi-language content management — Hindi, Tamil, Telugu, Arabic, and more</p></div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export All</button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Upload className="w-4 h-4" /> Import</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white"><p className="text-sm font-bold opacity-80">Languages</p><p className="text-2xl font-black mt-1">{LANGUAGES.length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Avg Completion</p><p className="text-xl font-black text-blue-600">{avgCompletion}%</p></div>
        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-emerald-600 font-bold">Active</p><p className="text-xl font-black text-emerald-600">{LANGUAGES.filter(l => l.isActive).length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Total Keys</p><p className="text-xl font-black text-slate-900">{LANGUAGES[0].totalKeys.toLocaleString()}</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search language..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2">{['all', 'active', 'incomplete'].map(s => (<button key={s} onClick={() => setFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors capitalize ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? <MarketplaceEmptyState title="No languages found" icon={Languages} /> : filtered.map(l => (
          <div key={l.code} onClick={() => setSelected(l)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelected(l))} className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3"><CountryFlag code={l.flag} size="md" /><div><p className="font-bold text-slate-900 text-sm">{l.name}</p><p className="text-xs text-slate-400">{l.nativeName}</p></div></div>
              <div className="flex gap-1">{l.isDefault && <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">Default</span>}{!l.isActive && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">Inactive</span>}</div>
            </div>
            <div className="mb-2"><div className="flex justify-between mb-1"><span className="text-xs text-slate-500">Completion</span><span className={`text-xs font-black ${l.completion >= 90 ? 'text-emerald-600' : l.completion >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{l.completion}%</span></div><div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${l.completion >= 90 ? 'bg-emerald-500' : l.completion >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${l.completion}%` }} /></div></div>
            <div className="flex justify-between text-[10px] text-slate-400"><span>{l.translatedKeys}/{l.totalKeys} keys</span><span>{l.reviewedKeys} reviewed</span></div>
          </div>
        ))}
      </div>

      {selected && <LanguageDrawer lang={selected} keys={SAMPLE_KEYS} onClose={() => setSelected(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
