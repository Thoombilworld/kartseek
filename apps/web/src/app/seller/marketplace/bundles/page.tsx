'use client';
import React, { useState, useEffect } from 'react';
import { Package, Plus } from 'lucide-react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

export default function SellerBundlesPage() {
  const { format: fmt } = useSellerMoney();
  const { seller } = useSeller();
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getBundles(seller.sellerId)
      .then(res => { setBundles(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setBundles([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Product Bundles</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and manage product bundle offers</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Create Bundle
        </button>
      </div>

      {bundles.map((b, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-slate-800">{b.name}</h3>
            </div>
            {/* `products` is the array of listings in the bundle, not a count —
                rendering it directly threw "Objects are not valid as a React
                child" and took the whole page down with it. */}
            <p className="text-sm text-slate-400">
              {Array.isArray(b.products) ? b.products.length : (b.products ?? 0)} products · {b.sold ?? 0} sold
            </p>
          </div>
          <div className="text-right">
            <div>
              <span className="line-through text-slate-400 mr-2 text-sm">{fmt(b.originalTotal)}</span>
              <span className="font-black text-emerald-600 text-lg">{fmt(b.bundlePrice)}</span>
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">{b.discount}% OFF</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                b.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
              }`}>{b.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
