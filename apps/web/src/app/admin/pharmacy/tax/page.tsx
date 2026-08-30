'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState } from 'react';
import { Receipt, Save, Globe, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface TaxRule { id: string; country: string; state: string; category: string; rate: number; gstType: string; enabled: boolean }

const INIT_RULES: TaxRule[] = [
  { id:'t1',country:'India',state:'All States',category:'OTC Medicines',rate:5,gstType:'GST',enabled:true },
  { id:'t2',country:'India',state:'All States',category:'Prescription Medicines',rate:5,gstType:'GST',enabled:true },
  { id:'t3',country:'India',state:'All States',category:'Medical Devices',rate:12,gstType:'GST',enabled:true },
  { id:'t4',country:'India',state:'All States',category:'Health Supplements',rate:18,gstType:'GST',enabled:true },
  { id:'t5',country:'India',state:'All States',category:'Personal Care',rate:18,gstType:'GST',enabled:true },
  { id:'t6',country:'India',state:'All States',category:'Baby Care',rate:12,gstType:'GST',enabled:true },
  { id:'t7',country:'India',state:'All Counties',category:'All Pharmacy Products',rate:16,gstType:'VAT',enabled:true },
  { id:'t8',country:'Nigeria',state:'All States',category:'All Pharmacy Products',rate:7.5,gstType:'VAT',enabled:true },
  { id:'t9',country:'UAE',state:'All Emirates',category:'All Pharmacy Products',rate:5,gstType:'VAT',enabled:true },
];

export default function PharmacyTaxPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [rules, setRules] = useState(INIT_RULES);
  const [saved, setSaved] = useState(false);

  const toggleRule = (id: string) => setRules(p => p.map(r => r.id === id ? {...r, enabled: !r.enabled} : r));
  const updateRate = (id: string, rate: number) => setRules(p => p.map(r => r.id === id ? {...r, rate} : r));
  const deleteRule = (id: string) => setRules(p => p.filter(r => r.id !== id));

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Tax Settings</h1><p className="text-slate-500 text-sm">Configure country-wise and category-wise tax rates for pharmacy products.</p></div>
        <button onClick={handleSave} className={`px-5 py-2.5 font-bold rounded-xl text-sm flex items-center gap-2 transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-cyan-600 hover:bg-cyan-700 text-white'}`} aria-label="Save">
          <Save className="w-4 h-4" /> {saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/>
        <div><p className="text-sm font-bold text-amber-800">Tax Compliance</p><p className="text-xs text-amber-700 mt-0.5">Tax rates must comply with local government regulations. Essential medicines may have reduced or zero tax rates in some jurisdictions.</p></div>
      </div>

      {/* Group by country */}
      {['India','India','Nigeria','UAE'].map(country => {
        const countryRules = rules.filter(r => r.country === country);
        if (countryRules.length === 0) return null;
        return (
          <div key={country} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-600" />
              <h2 className="font-bold text-slate-900">{country}</h2>
              <span className="text-xs text-slate-400 ml-2">{countryRules.length} rule{countryRules.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="text-slate-500 border-b border-slate-100"><tr>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Region</th>
                <th className="px-5 py-3 font-semibold">Tax Type</th>
                <th className="px-5 py-3 font-semibold text-center">Rate (%)</th>
                <th className="px-5 py-3 font-semibold text-center">Enabled</th>
                <th className="px-5 py-3 font-semibold text-center">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">{countryRules.map(r => (
                <tr key={r.id} className={`hover:bg-slate-50/50 ${!r.enabled ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-slate-700">{r.category}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{r.state}</td>
                  <td className="px-5 py-3.5"><span className="bg-cyan-50 text-cyan-700 text-xs font-bold px-2 py-0.5 rounded">{r.gstType}</span></td>
                  <td className="px-5 py-3.5 text-center">
                    <input type="number" value={r.rate} onChange={e => updateRate(r.id, Number(e.target.value))} className="w-20 text-center px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-cyan-500 outline-none" min={0} max={100} step={0.5} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => toggleRule(r.id)} className={`w-10 h-5 rounded-full transition-colors relative ${r.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${r.enabled ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => deleteRule(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          </div>
        );
      })}
    </div>
  );
}
