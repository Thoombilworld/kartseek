'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Save, ArrowLeft } from 'lucide-react';

export default function AddMedicinePage() {
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
            <PlusCircle className="w-7 h-7 text-blue-600" />Add Medicine
          </h1>
          <p className="text-sm text-slate-500 mt-1">Add a new medicine to your catalog</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="medicine-name">Medicine Name</label>
          <input id="medicine-name" type="text" placeholder="e.g. Paracetamol 500mg"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="generic-name">Generic Name</label>
          <input id="generic-name" type="text" placeholder="e.g. Acetaminophen"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="category">Category</label>
          <select id="category" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Category...</option>
            <option>Pain Relief</option>
            <option>Antibiotics</option>
            <option>Vitamins</option>
            <option>Digestive</option>
            <option>Skin Care</option>
            <option>First Aid</option>
            <option>Medical Devices</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="price">Price </label>
          <input id="price" type="number" placeholder="0"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="stock-quantity">Stock Quantity</label>
          <input id="stock-quantity" type="number" placeholder="0"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-semibold text-slate-700">Prescription Required</span>
          <button type="button" className="w-11 h-6 bg-slate-200 rounded-full relative transition-colors focus:outline-none" onClick={e => { const btn = e.currentTarget; btn.classList.toggle('bg-blue-600'); btn.classList.toggle('bg-slate-200'); }}>
            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
          </button>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="dosage-instructions">Dosage Instructions</label>
          <textarea id="dosage-instructions" rows={3} placeholder="Dosage information..." className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="side-effects">Side Effects</label>
          <textarea id="side-effects" rows={3} placeholder="Known side effects..." className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" />
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
