'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, Package, Clock, CreditCard } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';

export default function OrderDetailsPage() {
  const { seller } = useSeller();
  const params = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id || !seller.sellerId) return;
    sellerApi.getOrderById(seller.sellerId, params.id as string)
      .then(res => { if (res?.data) { /* merge API data */ } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [seller.sellerId, params.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-blue-600" />Order Details
        </h1>
        <p className="text-sm text-slate-500 mt-1">View and manage order</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><DollarSign className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-slate-500">Order Total</p><p className="text-xl font-black text-slate-900">2,500</p></div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Package className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-slate-500">Items</p><p className="text-xl font-black text-slate-900">1</p></div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-slate-500">Status</p><p className="text-xl font-black text-slate-900">New</p></div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center"><CreditCard className="w-5 h-5 text-violet-600" /></div><div><p className="text-xs text-slate-500">Payment</p><p className="text-xl font-black text-slate-900">UPI</p></div></div>
        </div>
      </div>

      
    </div>
  );
}
