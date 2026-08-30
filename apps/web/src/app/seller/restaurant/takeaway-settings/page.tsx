'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Save, ArrowLeft } from 'lucide-react';

export default function TakeawaySettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="./" className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-blue-600" />Takeaway Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure takeaway and pickup options</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold text-slate-700">Enable Takeaway</span>
          <button type="button" className="w-11 h-6 bg-slate-200 rounded-full relative transition-colors focus:outline-none" onClick={e => { const btn = e.currentTarget; btn.classList.toggle('bg-blue-600'); btn.classList.toggle('bg-slate-200'); }}>
            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
          </button>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="average-prep-time-min">Average Prep Time (min)</label>
          <input id="average-prep-time-min" type="number" placeholder="15"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="max-concurrent-orders">Max Concurrent Orders</label>
          <input id="max-concurrent-orders" type="number" placeholder="20"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="packaging-fee">Packaging Fee </label>
          <input id="packaging-fee" type="number" placeholder="50"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="pickup-instructions">Pickup Instructions</label>
          <textarea id="pickup-instructions" rows={3} placeholder="Where to pick up..." className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
          </button>
          <Link href="./" className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
