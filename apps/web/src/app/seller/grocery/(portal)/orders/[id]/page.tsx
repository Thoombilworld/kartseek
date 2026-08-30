'use client';

import React from 'react';
import { ShoppingCart, Package, DollarSign, Clock, Truck } from 'lucide-react';

export default function OrderDetailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShoppingCart className="w-7 h-7 text-blue-600" />Order Details
        </h1>
        <p className="text-sm text-slate-500 mt-1">View grocery order details</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Package className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-slate-500">Items</p><p className="text-xl font-black text-slate-900">8</p></div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-slate-500">Total</p><p className="text-xl font-black text-slate-900">3,450</p></div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-slate-500">Status</p><p className="text-xl font-black text-slate-900">Preparing</p></div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center"><Truck className="w-5 h-5 text-violet-600" /></div><div><p className="text-xs text-slate-500">Delivery</p><p className="text-xl font-black text-slate-900">Express</p></div></div>
        </div>
      </div>

      
    </div>
  );
}
