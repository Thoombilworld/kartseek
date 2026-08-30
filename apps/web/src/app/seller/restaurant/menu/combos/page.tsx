'use client';
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Package, Star, ArrowLeft, Eye, EyeOff, GripVertical } from 'lucide-react';
import Link from 'next/link';

interface ComboItem { name: string; originalPrice: number; }
interface Combo {
  id: string; name: string; description: string; price: number; originalTotal: number;
  items: ComboItem[]; status: 'active' | 'draft' | 'expired'; orders: number; rating: number;
}

const MOCK_COMBOS: Combo[] = [
  {
    id: 'CMB-1', name: 'Biryani Feast', description: '1 Chicken Biryani + 1 Raita + 1 Gulab Jamun', price: 399, originalTotal: 500,
    items: [{ name: 'Chicken Biryani', originalPrice: 320 }, { name: 'Raita', originalPrice: 60 }, { name: 'Gulab Jamun', originalPrice: 90 }, { name: 'Soft Drink', originalPrice: 30 }],
    status: 'active', orders: 142, rating: 4.7,
  },
  {
    id: 'CMB-2', name: 'Family Pack', description: '2 Biryani + 4 Naan + 1 Dal + Dessert', price: 999, originalTotal: 1340,
    items: [{ name: '2x Chicken Biryani', originalPrice: 640 }, { name: '4x Butter Naan', originalPrice: 160 }, { name: 'Dal Makhani', originalPrice: 220 }, { name: '2x Gulab Jamun', originalPrice: 180 }, { name: '4x Soft Drink', originalPrice: 140 }],
    status: 'active', orders: 86, rating: 4.9,
  },
  {
    id: 'CMB-3', name: 'Lunch Special', description: '1 Main + 1 Bread + 1 Beverage', price: 249, originalTotal: 310,
    items: [{ name: 'Veg Pulao', originalPrice: 180 }, { name: 'Butter Naan', originalPrice: 40 }, { name: 'Masala Chai', originalPrice: 40 }, { name: 'Raita', originalPrice: 50 }],
    status: 'draft', orders: 0, rating: 0,
  },
];

export default function CombosPage() {
  const [combos, setCombos] = useState(MOCK_COMBOS);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/seller/restaurant/menu" className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Combos & Meal Bundles</h1>
            <p className="text-sm text-slate-500">Create meal deals by bundling menu items at a discounted price.</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Combo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Combos', value: combos.filter((c) => c.status === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Orders', value: combos.reduce((s, c) => s + c.orders, 0), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Avg Savings', value: `${Math.round(combos.filter((c) => c.status === 'active').reduce((s, c) => s + ((c.originalTotal - c.price) / c.originalTotal * 100), 0) / Math.max(combos.filter((c) => c.status === 'active').length, 1))}%`, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center border border-slate-100`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Combos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {combos.map((combo) => {
          const savings = combo.originalTotal - combo.price;
          const savingsPct = Math.round((savings / combo.originalTotal) * 100);
          return (
            <div key={combo.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="bg-linear-to-r from-orange-500 to-amber-500 p-4 text-white relative">
                <div className="absolute top-2 right-2 bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black backdrop-blur-sm">
                  SAVE {savingsPct}%
                </div>
                <h3 className="font-black text-lg">{combo.name}</h3>
                <p className="text-xs opacity-80 mt-0.5">{combo.description}</p>
              </div>

              {/* Items */}
              <div className="p-4">
                <div className="space-y-1.5 mb-3">
                  {combo.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="text-orange-500 font-bold">•</span> {item.name}
                      </span>
                      <span className="text-xs text-slate-400 line-through">₹{item.originalPrice}</span>
                    </div>
                  ))}
                </div>

                {/* Price */}
                <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs text-slate-400 line-through">₹{combo.originalTotal}</span>
                    <span className="text-xl font-black text-orange-600 ml-2">₹{combo.price}</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">Save ₹{savings}</span>
                </div>

                {/* Stats + Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {combo.rating > 0 && (
                      <span className="flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {combo.rating}
                      </span>
                    )}
                    <span className="font-medium">{combo.orders} orders</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      combo.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      combo.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>{combo.status}</span>
                    <button title="Edit combo" className="p-1.5 rounded-lg hover:bg-slate-100"><Edit2 className="w-3.5 h-3.5 text-slate-400" /></button>
                    <button title="Delete combo" className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {combos.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-500 font-bold">No combos created yet</h3>
          <p className="text-sm text-slate-400 mt-1">Bundle your menu items to create attractive meal deals.</p>
        </div>
      )}
    </div>
  );
}
