'use client';
import React, { useState } from 'react';
import { Plus, Search, Edit2, Percent, X, Eye, Download, Upload, ChevronLeft, ChevronRight, Clock, FileText, AlertTriangle } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', Qatar: 'QA', 'Saudi Arabia': 'SA', All: '' };

type HsnCode = {
  id: string; code: string; description: string; category: string; country: string;
  taxType: string; cgst: number | null; sgst: number | null; igst: number | null; vat: number | null;
  effective: string; expiry: string | null; status: string;
  zeroRated: boolean; exempt: boolean;
  history: { date: string; field: string; oldValue: string; newValue: string; changedBy: string }[];
};

const HSN_DATA: HsnCode[] = [
  { id: 'H001', code: '8517', description: 'Smartphones / Mobile Phones', category: 'Mobiles', country: 'India', taxType: 'GST', cgst: 9, sgst: 9, igst: 18, vat: null, effective: '2024-01-01', expiry: null, status: 'Active', zeroRated: false, exempt: false, history: [{ date: '2024-01-01', field: 'IGST', oldValue: '12%', newValue: '18%', changedBy: 'Finance Admin' }, { date: '2017-07-01', field: 'Initial', oldValue: '—', newValue: '12%', changedBy: 'System' }] },
  { id: 'H002', code: '8528', description: 'Television Receivers / Smart TVs', category: 'Electronics', country: 'India', taxType: 'GST', cgst: 14, sgst: 14, igst: 28, vat: null, effective: '2024-01-01', expiry: null, status: 'Active', zeroRated: false, exempt: false, history: [] },
  { id: 'H003', code: '8517', description: 'Smartphones / Mobile Phones', category: 'Mobiles', country: 'UAE', taxType: 'VAT', cgst: null, sgst: null, igst: null, vat: 5, effective: '2018-01-01', expiry: null, status: 'Active', zeroRated: false, exempt: false, history: [{ date: '2018-01-01', field: 'VAT', oldValue: '0%', newValue: '5%', changedBy: 'UAE Tax Authority' }] },
  { id: 'H004', code: '6402', description: 'Sports Footwear', category: 'Footwear', country: 'India', taxType: 'GST', cgst: 9, sgst: 9, igst: 18, vat: null, effective: '2024-01-01', expiry: null, status: 'Active', zeroRated: false, exempt: false, history: [{ date: '2024-01-01', field: 'IGST', oldValue: '5%', newValue: '18%', changedBy: 'GST Council' }] },
  { id: 'H005', code: '6203', description: "Men's Suits, Jackets, Trousers, Jeans", category: 'Fashion', country: 'India', taxType: 'GST', cgst: 6, sgst: 6, igst: 12, vat: null, effective: '2024-01-01', expiry: null, status: 'Active', zeroRated: false, exempt: false, history: [] },
  { id: 'H006', code: '0401', description: 'Fresh Milk / Dairy Products', category: 'Grocery', country: 'India', taxType: 'GST', cgst: 0, sgst: 0, igst: 0, vat: null, effective: '2017-07-01', expiry: null, status: 'Active', zeroRated: true, exempt: false, history: [] },
  { id: 'H007', code: '8508', description: 'Vacuum Cleaners / Appliances', category: 'Appliances', country: 'India', taxType: 'GST', cgst: 14, sgst: 14, igst: 28, vat: null, effective: '2024-01-01', expiry: null, status: 'Active', zeroRated: false, exempt: false, history: [] },
  { id: 'H008', code: '9999', description: 'Services — Information Technology', category: 'Services', country: 'India', taxType: 'GST (SAC)', cgst: 9, sgst: 9, igst: 18, vat: null, effective: '2024-01-01', expiry: null, status: 'Active', zeroRated: false, exempt: false, history: [] },
];

// ── HSN Detail Drawer ────────────────────────────────────────────────────────
function HsnDrawer({ item: h, onClose }: { item: HsnCode; onClose: () => void }) {
  const totalRate = h.igst ?? h.vat ?? 0;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">HSN {h.code}</h2><p className="text-xs text-slate-500">{h.description}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${h.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{h.status}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${h.taxType.includes('GST') ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>{h.taxType}</span>
            {h.zeroRated && <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">0-RATED</span>}
            {h.exempt && <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">EXEMPT</span>}
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white text-center">
            <p className="text-sm font-bold opacity-80">Total Tax Rate</p>
            <p className="text-5xl font-black mt-1">{totalRate}%</p>
            <p className="text-xs opacity-60 mt-1">{h.taxType} · <CountryFlag code={COUNTRY_TO_CODE[h.country] || 'IN'} size="sm" /> {h.country}</p>
          </div>

          {/* Tax Components */}
          {h.taxType.includes('GST') && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-blue-700">{h.cgst}%</p><p className="text-[10px] text-blue-600">CGST</p></div>
              <div className="bg-purple-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-purple-700">{h.sgst}%</p><p className="text-[10px] text-purple-600">SGST</p></div>
              <div className="bg-indigo-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-indigo-700">{h.igst}%</p><p className="text-[10px] text-indigo-600">IGST</p></div>
            </div>
          )}
          {h.taxType === 'VAT' && (
            <div className="bg-emerald-50 rounded-xl p-4 text-center"><p className="text-2xl font-black text-emerald-700">{h.vat}%</p><p className="text-xs text-emerald-600">Value Added Tax</p></div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Category</p><p className="text-sm font-bold text-slate-900">{h.category}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Effective</p><p className="text-sm font-bold text-slate-900">{h.effective}</p></div>
          </div>

          {/* Rate History */}
          {h.history.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" />Rate History</h3>
              <div className="space-y-0 relative">
                <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200" />
                {h.history.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${i === 0 ? 'bg-indigo-600' : 'bg-slate-200'}`}><Clock className={`w-3 h-3 ${i === 0 ? 'text-white' : 'text-slate-500'}`} /></div>
                    <div><p className="text-xs text-slate-900"><span className="font-bold text-slate-500">{r.field}:</span> <span className="text-red-500 line-through">{r.oldValue}</span> → <span className="font-bold text-emerald-600">{r.newValue}</span></p><p className="text-[10px] text-slate-400">{r.changedBy} · {r.date}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bulk Import Modal ────────────────────────────────────────────────────────
function BulkImportModal({ onImport, onClose }: { onImport: (file: File) => void; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPreview(text.split('\n').slice(0, 6));
    };
    reader.readAsText(f);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <h3 className="text-lg font-black text-slate-900 mb-4">Bulk Import HSN Codes</h3>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800"><strong>📋 Format:</strong> CSV with columns: code, description, category, country, taxType, cgst, sgst, igst, vat, effective</div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 mb-1">Drop CSV file here or click to browse</p>
            <p className="text-xs text-slate-400 mb-3">Supports .csv files up to 5MB</p>
            <input type="file" accept=".csv" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" id="csv-input" />
            <label htmlFor="csv-input" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors">Browse Files</label>
          </div>

          {file && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-blue-600" /><span className="text-sm font-bold text-slate-900">{file.name}</span><span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span></div>
              {preview.length > 0 && (
                <div className="bg-white rounded-lg p-2 max-h-32 overflow-auto font-mono text-[10px] text-slate-600">{preview.map((line, i) => <p key={i} className={i === 0 ? 'font-bold text-slate-900' : ''}>{line}</p>)}</div>
              )}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800"><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Existing HSN codes with matching code+country will be updated. New codes will be created.</div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => file && onImport(file)} disabled={!file} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Upload className="w-4 h-4" /> Import</button>
        </div>
      </div>
    </div>
  );
}

// ── Add/Edit Modal ───────────────────────────────────────────────────────────
function HsnModal({ onSave, onClose }: { onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ code: '', description: '', category: '', country: 'India', taxType: 'GST', cgst: 0, sgst: 0, igst: 0, vat: 0, effective: '', expiry: '', zeroRated: false, exempt: false });
  const u = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-black text-slate-900 mb-4">Add HSN / SAC Code</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="hsn-sac-code">HSN / SAC Code</label><input id="hsn-sac-code" value={form.code} onChange={e => u('code', e.target.value)} placeholder="e.g. 8517" className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="country">Country</label><select id="country" value={form.country} onChange={e => u('country', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>India</option><option>UAE</option><option>Saudi Arabia</option><option>Qatar</option><option>UK</option></select></div>
          </div>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="description">Description</label><input id="description" value={form.description} onChange={e => u('description', e.target.value)} placeholder="Product description" className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="category">Category</label><input id="category" value={form.category} onChange={e => u('category', e.target.value)} placeholder="e.g. Mobiles" className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="tax-type">Tax Type</label><select id="tax-type" value={form.taxType} onChange={e => u('taxType', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"><option>GST</option><option>GST (SAC)</option><option>VAT</option><option>Sales Tax</option></select></div>
          </div>
          {form.taxType.includes('GST') ? (
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="cgst">CGST %</label><input id="cgst" type="number" value={form.cgst || ''} onChange={e => u('cgst', +e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="sgst">SGST %</label><input id="sgst" type="number" value={form.sgst || ''} onChange={e => u('sgst', +e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="igst">IGST %</label><input id="igst" type="number" value={form.igst || ''} onChange={e => u('igst', +e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
            </div>
          ) : (
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="vat">VAT %</label><input id="vat" type="number" value={form.vat || ''} onChange={e => u('vat', +e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="effective-date">Effective Date</label><input id="effective-date" type="date" value={form.effective} onChange={e => u('effective', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="expiry-date">Expiry Date</label><input id="expiry-date" type="date" value={form.expiry} onChange={e => u('expiry', e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none" /></div>
          </div>
          <div className="flex gap-4"><label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={form.zeroRated} onChange={e => u('zeroRated', e.target.checked)} className="w-4 h-4 rounded" />Zero-Rated</label><label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={form.exempt} onChange={e => u('exempt', e.target.checked)} className="w-4 h-4 rounded" />Exempt</label></div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.code || !form.effective} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function HsnTaxMasterPage() {
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [selected, setSelected] = useState<HsnCode | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getHsnCodes(), []);
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered } = useMarketplaceRegionFilter(HSN_DATA);
  const filtered = regionFiltered.filter(h => (countryFilter === 'All' || h.country === countryFilter) && (!search || h.code.includes(search) || h.description.toLowerCase().includes(search.toLowerCase()) || h.category.toLowerCase().includes(search.toLowerCase())));

  const handleSave = (data: any) => { execute(() => adminMarketplaceApi.createHsnCode(data), 'HSN code saved', () => refetch()); setShowAdd(false); };
  const handleImport = (file: File) => { showToast(`Importing ${file.name}...`, 'success'); setShowImport(false); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">HSN / SAC / Tax Master</h1><p className="text-sm text-slate-500 mt-0.5">Manage tax codes, GST rates, VAT rates by country and category</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Upload className="w-4 h-4" /> Bulk Import</button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> Add Code</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-slate-900">{HSN_DATA.length}</p><p className="text-xs text-slate-500 mt-1">Total Tax Codes</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-blue-600">{HSN_DATA.filter(h => h.country === 'India').length}</p><p className="text-xs text-slate-500 mt-1">India (GST)</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-emerald-600">{HSN_DATA.filter(h => h.zeroRated).length}</p><p className="text-xs text-slate-500 mt-1">Zero-Rated</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-amber-600">{HSN_DATA.filter(h => h.country !== 'India').length}</p><p className="text-xs text-slate-500 mt-1">GCC / VAT</p></div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search HSN code, description, or category..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-1 flex-wrap">{['All', 'India', 'UAE', 'Saudi Arabia', 'UK'].map(c => (<button key={c} onClick={() => setCountryFilter(c)} className={`flex items-center gap-1 px-3 py-2.5 text-xs font-bold rounded-xl border transition-colors ${countryFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><CountryFlag code={COUNTRY_TO_CODE[c] || ''} size="xs" />{c}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">HSN Code</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Description</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Country</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Tax Type</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">CGST</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">SGST</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">IGST/VAT</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Flags</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">History</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={10}><MarketplaceEmptyState title="No HSN codes found" icon={Percent} /></td></tr>
            ) : filtered.map(h => (
              <tr key={h.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setSelected(h)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(h))}>
                <td className="px-4 py-3.5"><span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-sm">{h.code}</span></td>
                <td className="px-4 py-3.5"><p className="font-medium text-slate-900 text-xs">{h.description}</p><p className="text-[10px] text-slate-400">{h.category} · Eff: {h.effective}</p></td>
                <td className="px-4 py-3.5 text-center"><CountryFlag code={COUNTRY_TO_CODE[h.country] || 'IN'} size="sm" /></td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${h.taxType.includes('GST') ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>{h.taxType}</span></td>
                <td className="px-4 py-3.5 text-center font-bold text-slate-700 text-xs">{h.cgst !== null ? `${h.cgst}%` : '—'}</td>
                <td className="px-4 py-3.5 text-center font-bold text-slate-700 text-xs">{h.sgst !== null ? `${h.sgst}%` : '—'}</td>
                <td className="px-4 py-3.5 text-center font-black text-lg text-blue-700">{h.igst !== null ? `${h.igst}%` : h.vat !== null ? `${h.vat}%` : '—'}</td>
                <td className="px-4 py-3.5 text-center">{h.zeroRated ? <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded">0-RATED</span> : h.exempt ? <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded">EXEMPT</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                <td className="px-4 py-3.5 text-center">{h.history.length > 0 ? <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md">{h.history.length} changes</span> : <span className="text-[10px] text-slate-400">—</span>}</td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setSelected(h)} className="p-1 hover:bg-slate-100 rounded-lg"><Eye className="w-3.5 h-3.5 text-slate-400" /></button>
                    <button className="p-1 hover:bg-slate-100 rounded-lg" aria-label="Edit"><Edit2 className="w-3.5 h-3.5 text-slate-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <HsnDrawer item={selected} onClose={() => setSelected(null)} />}
      {showAdd && <HsnModal onSave={handleSave} onClose={() => setShowAdd(false)} />}
      {showImport && <BulkImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
