'use client';
import React, { useState } from 'react';
import {
  RotateCcw, Plus, Edit2, Trash2, CheckCircle, Search, X, Clock,
  Shield, AlertCircle, Package,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type Policy = {
  id: string; category: string; returnWindow: number; refundMethod: string;
  conditions: string[]; active: boolean; restockingFee: number;
  exchangeAllowed: boolean; pickupRequired: boolean;
};

const MOCK_POLICIES: Policy[] = [
  { id: 'RP-001', category: 'Electronics', returnWindow: 7, refundMethod: 'Original Payment + Bank Transfer', conditions: ['Product must be in original packaging', 'All accessories must be included', 'No physical damage allowed'], active: true, restockingFee: 0, exchangeAllowed: true, pickupRequired: true },
  { id: 'RP-002', category: 'Fashion & Apparel', returnWindow: 15, refundMethod: 'Original Payment', conditions: ['Tags must be attached', 'Unworn condition', 'No alterations made'], active: true, restockingFee: 0, exchangeAllowed: true, pickupRequired: true },
  { id: 'RP-003', category: 'Home & Kitchen', returnWindow: 10, refundMethod: 'Original Payment + Store Credit', conditions: ['Unopened packaging preferred', 'No installation damage', 'Original invoice required'], active: true, restockingFee: 5, exchangeAllowed: true, pickupRequired: true },
  { id: 'RP-004', category: 'Beauty & Personal Care', returnWindow: 7, refundMethod: 'Store Credit Only', conditions: ['Sealed/unopened products only', 'Manufacturing defect claims within 48h'], active: true, restockingFee: 0, exchangeAllowed: false, pickupRequired: false },
  { id: 'RP-005', category: 'Books & Media', returnWindow: 30, refundMethod: 'Original Payment', conditions: ['Unused condition', 'No highlighting or writing'], active: true, restockingFee: 0, exchangeAllowed: true, pickupRequired: false },
  { id: 'RP-006', category: 'Grocery & Perishables', returnWindow: 0, refundMethod: 'N/A', conditions: ['Non-returnable category', 'Quality issues: contact within 24h'], active: true, restockingFee: 0, exchangeAllowed: false, pickupRequired: false },
];

export default function ReturnPoliciesPage() {
  const [policies] = useState(MOCK_POLICIES);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = policies.filter(p => !search || p.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-black text-slate-900">Return Policies</h1><p className="text-sm text-slate-500">Configure return windows and conditions by category</p></div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Add Policy</button>
      </div>

      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none" /></div>

      <div className="space-y-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">{p.category}</h3>
                {p.returnWindow > 0 ? (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Clock className="w-3 h-3" />{p.returnWindow} days</span>
                ) : (
                  <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Non-Returnable</span>
                )}
              </div>
              <div className="flex gap-1"><button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600" aria-label="Edit"><Edit2 className="w-4 h-4" /></button><button className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500" aria-label="Delete"><Trash2 className="w-4 h-4" /></button></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-[10px] text-slate-400">Refund Method</p><p className="text-xs font-bold text-slate-900">{p.refundMethod}</p></div>
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-[10px] text-slate-400">Restocking Fee</p><p className="text-xs font-bold text-slate-900">{p.restockingFee > 0 ? `${p.restockingFee}%` : 'None'}</p></div>
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-[10px] text-slate-400">Exchange</p><p className={`text-xs font-bold ${p.exchangeAllowed ? 'text-emerald-600' : 'text-slate-400'}`}>{p.exchangeAllowed ? '✓ Allowed' : '✗ Not Allowed'}</p></div>
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><p className="text-[10px] text-slate-400">Pickup</p><p className={`text-xs font-bold ${p.pickupRequired ? 'text-blue-600' : 'text-slate-400'}`}>{p.pickupRequired ? '✓ Scheduled' : 'Self-Ship'}</p></div>
            </div>
            {p.conditions.length > 0 && (
              <div className="mt-2"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Conditions</p><ul className="space-y-0.5">{p.conditions.map((c, i) => <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">•</span>{c}</li>)}</ul></div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)} ><DismissOnEscape onDismiss={() => setShowAdd(false)} /></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4 p-5 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Add Return Policy</h3>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="category">Category *</label><select id="category" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Category"><option>Electronics</option><option>Fashion & Apparel</option><option>Home & Kitchen</option><option>Beauty & Personal Care</option><option>Books & Media</option><option>Grocery & Perishables</option><option>Sports & Fitness</option><option>Toys & Baby</option></select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="return-window-days">Return Window (days) *</label><input id="return-window-days" type="number" placeholder="7" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="restocking-fee">Restocking Fee (%)</label><input id="restocking-fee" type="number" placeholder="0" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div>
            </div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="refund-method">Refund Method</label><select id="refund-method" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Refund method"><option>Original Payment Method</option><option>Store Credit Only</option><option>Original Payment + Bank Transfer</option><option>Original Payment + Store Credit</option></select></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block" htmlFor="conditions">Conditions</label><textarea id="conditions" rows={3} placeholder="One condition per line..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none" /></div>
            <div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-blue-600"  aria-label="checkbox"/><span className="text-slate-600">Exchange Allowed</span></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-blue-600"  aria-label="checkbox"/><span className="text-slate-600">Pickup Required</span></label></div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm">Create Policy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
