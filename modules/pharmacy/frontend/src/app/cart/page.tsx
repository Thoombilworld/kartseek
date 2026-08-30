'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Trash2, Plus, Minus, Pill, ShoppingBag, ArrowRight, Tag, Truck, Shield, Clock } from 'lucide-react';

const CART_ITEMS = [
  { id:'ci1', name:'Crocin Advance 500mg (Strip of 15)', brand:'GSK', price:45, mrp:65, qty:2, rx:false, img:'💊' },
  { id:'ci2', name:'Vitamin D3 60K IU Capsules (4s)', brand:'Abbott', price:120, mrp:180, qty:1, rx:false, img:'☀️' },
  { id:'ci3', name:'Augmentin 625 Duo Tablet (10s)', brand:'GSK', price:320, mrp:420, qty:1, rx:true, img:'💊' },
  { id:'ci4', name:'Dettol Hand Wash 750ml', brand:'Dettol', price:129, mrp:189, qty:1, rx:false, img:'🧴' },
];

export default function PharmacyCartPage() {
  const [items, setItems] = useState(CART_ITEMS);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState(false);

  const subtotal = items.reduce((s,i) => s + i.price*i.qty, 0);
  const mrpTotal = items.reduce((s,i) => s + i.mrp*i.qty, 0);
  const discount = applied ? Math.min(subtotal * 0.15, 200) : 0;
  const deliveryFee = subtotal >= 499 ? 0 : 49;
  const total = subtotal - discount + deliveryFee;
  const hasRx = items.some(i => i.rx);

  const updateQty = (id:string, delta:number) => setItems(items.map(i => i.id===id ? {...i, qty:Math.max(1,i.qty+delta)} : i));
  const remove = (id:string) => setItems(items.filter(i => i.id !== id));

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-700 mb-2">Your cart is empty</h2>
          <Link href="/" className="text-teal-600 font-semibold hover:underline">Browse pharmacy →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {hasRx && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Pill className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">Your cart contains Rx medicines. A valid prescription is required and will be verified before dispatch.</p>
              </div>
            )}
            {items.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 items-start">
                <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-3xl">{item.img}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">{item.brand}</p>
                      <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                      {item.rx && <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[9px] font-extrabold rounded">Rx Required</span>}
                    </div>
                    <button onClick={()=>remove(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Remove item" aria-label="Remove item">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-end justify-between mt-3">
                    <div>
                      <span className="text-lg font-black text-slate-900">₹{item.price * item.qty}</span>
                      <span className="text-xs text-slate-400 line-through ml-2">₹{item.mrp * item.qty}</span>
                      <span className="text-xs text-green-600 font-bold ml-2">{Math.round((item.mrp-item.price)/item.mrp*100)}% off</span>
                    </div>
                    <div className="flex items-center gap-0 bg-slate-100 rounded-lg">
                      <button onClick={()=>updateQty(item.id,-1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-l-lg transition-colors" title="Decrease quantity" aria-label="Decrease quantity">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                      <button onClick={()=>updateQty(item.id,1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-r-lg transition-colors" title="Increase quantity" aria-label="Increase quantity">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Apply Coupon</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter code" value={coupon} onChange={e=>setCoupon(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <button onClick={()=>{ if(coupon) setApplied(true); }}
                  className="px-4 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 transition-colors">Apply</button>
              </div>
              {applied && <div className="flex items-center gap-2 text-green-600 text-sm font-semibold"><Tag className="w-3.5 h-3.5" /> Coupon applied! Saving ₹{discount.toFixed(0)}</div>}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Item Total ({items.length} items)</span><span className="font-semibold">₹{subtotal}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">MRP Savings</span><span className="font-semibold text-green-600">-₹{mrpTotal - subtotal}</span></div>
                {discount > 0 && <div className="flex justify-between"><span className="text-slate-500">Coupon Discount</span><span className="font-semibold text-green-600">-₹{discount.toFixed(0)}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span className={`font-semibold ${deliveryFee===0?'text-green-600':''}`}>{deliveryFee===0?'FREE':`₹${deliveryFee}`}</span></div>
                <hr className="border-slate-100" />
                <div className="flex justify-between text-base"><span className="font-bold">Grand Total</span><span className="font-black">₹{total.toFixed(0)}</span></div>
              </div>
            </div>

            <Link href="/checkout"
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-center rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-lg"><Truck className="w-4 h-4 text-teal-600 mx-auto mb-1" /><span className="text-[10px] text-slate-500">Free delivery 499+</span></div>
              <div className="p-2 bg-slate-50 rounded-lg"><Shield className="w-4 h-4 text-teal-600 mx-auto mb-1" /><span className="text-[10px] text-slate-500">Genuine meds</span></div>
              <div className="p-2 bg-slate-50 rounded-lg"><Clock className="w-4 h-4 text-teal-600 mx-auto mb-1" /><span className="text-[10px] text-slate-500">25 min delivery</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
