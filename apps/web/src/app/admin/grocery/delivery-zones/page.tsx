'use client';

import React, { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Search, Truck, ToggleLeft, ToggleRight, AlertTriangle, RefreshCw, X, Clock } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { adminGroceryApi } from '@/lib/api/admin-grocery';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Grocery delivery zones.
 *
 * Four Bengaluru zones were written into the file; "Add Zone" and the edit and
 * delete buttons had no handlers at all, and the active toggle flipped a local
 * boolean. The `adminGroceryApi` import was unused. Nothing could persist because
 * `admin.grocery.deliveryZones` had no handler and no table — there is now a
 * `grocery_delivery_zones` table behind all four operations.
 *
 * Fees are shown through the country registry rather than the `₹` this page
 * hardcoded into every card.
 */

interface Zone {
  id: string;
  name: string;
  regionCode?: string;
  city?: string;
  pincodes?: string[];
  radiusKm: number;
  deliveryFee: number;
  minOrderAmount: number;
  etaMinutes: number;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: '', regionCode: '', city: '', pincodes: '',
  radiusKm: '10', deliveryFee: '0', minOrderAmount: '0', etaMinutes: '45',
};

export default function AdminDeliveryZonesPage() {
  const { formatPrice, config } = useGroceryLocale();
  const [search, setSearch] = useState('');
  // Kept apart from the loader's `error`: a failed toggle must not read as "the
  // zone list could not be loaded", and dismissing one must not hide the other.
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: zonesData, loading, error, reload } = useAsyncData<Zone[]>(
    async () => {
      const res = await adminGroceryApi.getDeliveryZones();
      if (!res.success || !res.data) throw new Error(res.error ?? 'Could not load delivery zones');
      return (res.data.data ?? []) as unknown as Zone[];
    },
    [],
  );
  const zones = error ? [] : (zonesData ?? []);

  const openCreate = () => { setForm({ ...EMPTY_FORM, regionCode: config.code }); setEditId(null); setFormError(null); setShowForm(true); };

  const openEdit = (z: Zone) => {
    setForm({
      name: z.name,
      regionCode: z.regionCode ?? '',
      city: z.city ?? '',
      pincodes: (z.pincodes ?? []).join(', '),
      radiusKm: String(z.radiusKm ?? 10),
      deliveryFee: String(z.deliveryFee ?? 0),
      minOrderAmount: String(z.minOrderAmount ?? 0),
      etaMinutes: String(z.etaMinutes ?? 45),
    });
    setEditId(z.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Zone name is required.'); return; }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      regionCode: form.regionCode.trim() || undefined,
      city: form.city.trim() || undefined,
      pincodes: form.pincodes.split(',').map((p) => p.trim()).filter(Boolean),
      radiusKm: Number(form.radiusKm) || 10,
      deliveryFee: Number(form.deliveryFee) || 0,
      minOrderAmount: Number(form.minOrderAmount) || 0,
      etaMinutes: Number(form.etaMinutes) || 45,
    };
    const res = editId
      ? await adminGroceryApi.updateDeliveryZone(editId, payload)
      : await adminGroceryApi.createDeliveryZone(payload);
    setSaving(false);
    if (!res.success) { setFormError(res.error ?? 'Could not save this zone'); return; }
    setShowForm(false);
    setEditId(null);
    await reload();
  };

  const toggleActive = async (z: Zone) => {
    setBusyId(z.id);
    const res = await adminGroceryApi.updateDeliveryZone(z.id, { isActive: !z.isActive });
    setBusyId(null);
    if (!res.success) { setActionError(res.error ?? 'Could not update this zone'); return; }
    await reload();
  };

  const remove = async (z: Zone) => {
    setBusyId(z.id);
    const res = await adminGroceryApi.deleteDeliveryZone(z.id);
    setBusyId(null);
    if (!res.success) { setActionError(res.error ?? 'Could not delete this zone'); return; }
    await reload();
  };

  const filtered = zones.filter((z) =>
    !search || z.name.toLowerCase().includes(search.toLowerCase()) || (z.city ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Delivery Zones</h1>
            <p className="text-sm text-slate-500 mt-0.5">Serviceable areas, delivery fees and order minimums</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => reload()} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
              <Plus className="w-4 h-4" /> Add Zone
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
            <button onClick={reload} className="font-bold shrink-0">Retry</button>
          </div>
        )}
        {actionError && (
          <div role="alert" className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{actionError}</span>
            <button onClick={() => setActionError(null)} className="font-bold shrink-0">Dismiss</button>
          </div>
        )}

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Search zones…" value={search} onChange={(e) => setSearch(e.target.value)}
            aria-label="Search delivery zones"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-slate-400"
          />
        </div>

        {loading && zones.length === 0 && (
          <div className="grid md:grid-cols-2 gap-4" aria-busy="true">
            <div className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <h2 className="font-bold text-slate-800 mb-1">No delivery zones yet</h2>
            <p className="text-sm text-slate-500 mb-4">Add one to define where grocery orders can be delivered.</p>
            <button onClick={openCreate} className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Add Zone
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((z) => (
            <div key={z.id} className={`bg-white rounded-xl border-2 p-5 transition-all ${z.isActive ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-70'} ${busyId === z.id ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full mt-1 shrink-0 ${z.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm font-bold text-slate-900 truncate">{z.name}</h2>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${z.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                      {z.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {[z.city, z.regionCode].filter(Boolean).join(', ') || 'No city set'}
                    {z.pincodes?.length ? ` • ${z.pincodes.length} ${config.address.postalLabel.toLowerCase()}s` : ''}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-400" /><span className="text-slate-600">{z.radiusKm} km radius</span></div>
                    <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-slate-400" /><span className="text-slate-600">{z.etaMinutes} min ETA</span></div>
                    <div className="flex items-center gap-1.5"><Truck className="w-3 h-3 text-slate-400" /><span className="text-slate-600">{formatPrice(Number(z.deliveryFee))} fee</span></div>
                    <div className="flex items-center gap-1.5"><span className="text-slate-600">Min {formatPrice(Number(z.minOrderAmount))}</span></div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => void toggleActive(z)} disabled={busyId === z.id}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-50 ${z.isActive ? 'bg-green-50 hover:bg-green-100' : 'bg-slate-100 hover:bg-slate-200'}`}
                    aria-label={z.isActive ? `Disable ${z.name}` : `Enable ${z.name}`}
                  >
                    {z.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                  </button>
                  <button onClick={() => openEdit(z)} disabled={busyId === z.id} className="w-8 h-8 bg-slate-100 hover:bg-blue-100 rounded-lg flex items-center justify-center disabled:opacity-50" aria-label={`Edit ${z.name}`}>
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button onClick={() => void remove(z)} disabled={busyId === z.id} className="w-8 h-8 bg-slate-100 hover:bg-red-100 rounded-lg flex items-center justify-center disabled:opacity-50" aria-label={`Delete ${z.name}`}>
                    <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={editId ? 'Edit zone' : 'Add zone'}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-black text-slate-900">{editId ? 'Edit Zone' : 'Add Delivery Zone'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-slate-200" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'name', label: 'Zone name *', placeholder: 'e.g. Central Bengaluru', type: 'text' },
                { key: 'city', label: 'City', placeholder: 'e.g. Bengaluru', type: 'text' },
                { key: 'regionCode', label: 'Region code', placeholder: 'e.g. IN', type: 'text' },
                { key: 'pincodes', label: `${config.address.postalLabel}s (comma separated)`, placeholder: '560001, 560008', type: 'text' },
                { key: 'radiusKm', label: 'Radius (km)', placeholder: '10', type: 'number' },
                { key: 'deliveryFee', label: 'Delivery fee', placeholder: '25', type: 'number' },
                { key: 'minOrderAmount', label: 'Minimum order', placeholder: '199', type: 'number' },
                { key: 'etaMinutes', label: 'Promised ETA (minutes)', placeholder: '45', type: 'number' },
              ].map((f) => (
                <div key={f.key}>
                  <label htmlFor={`zone-${f.key}`} className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">{f.label}</label>
                  <input
                    id={`zone-${f.key}`} type={f.type} placeholder={f.placeholder}
                    value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-400"
                  />
                </div>
              ))}
              {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
              <button onClick={() => void handleSave()} disabled={saving} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 disabled:bg-slate-400 transition-colors">
                {saving ? 'Saving…' : editId ? 'Update Zone' : 'Create Zone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
