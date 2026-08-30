'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Edit, Save, ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';

export default function EditProductPage() {
  const { seller } = useSeller();
  const params = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id || !seller.sellerId) return;
    sellerApi.getProductById(seller.sellerId, params.id as string)
      .then(res => { if (res?.data) { /* merge API data */ } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [seller.sellerId, params.id]);

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
            <Edit className="w-7 h-7 text-blue-600" />Edit Product
          </h1>
          <p className="text-sm text-slate-500 mt-1">Update product details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="product-name">Product Name</label>
          <input id="product-name" type="text" placeholder="Product name"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="price">Price </label>
          <input id="price" type="number" placeholder="0"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="stock">Stock</label>
          <input id="stock" type="number" placeholder="0"  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="description">Description</label>
          <textarea id="description" rows={3} placeholder="Product description..." className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" />
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
