'use client';
import React, { useState } from 'react';
import { Tag, Clock, Copy, Check, Gift, Truck, Percent, Flame } from 'lucide-react';

const OFFERS = [
  { id:'o1', title:'25% OFF on First Order', code:'FIRST25', type:'percentage', value:25, minOrder:299, maxDiscount:200, expiresIn:'3 days', uses:1245, gradient:'from-violet-600 to-purple-500', icon:'🎉' },
  { id:'o2', title:'Free Delivery on ₹500+', code:'FREEDEL', type:'free_delivery', value:0, minOrder:500, maxDiscount:null, expiresIn:'5 days', uses:3200, gradient:'from-blue-600 to-cyan-500', icon:'🚚' },
  { id:'o3', title:'Flat ₹100 OFF on Rx Orders', code:'RX100', type:'flat', value:100, minOrder:499, maxDiscount:100, expiresIn:'7 days', uses:890, gradient:'from-emerald-600 to-green-500', icon:'💊' },
  { id:'o4', title:'Buy 2 Get 1 FREE — Vitamins', code:'VIT321', type:'bogo', value:0, minOrder:0, maxDiscount:null, expiresIn:'2 days', uses:456, gradient:'from-amber-500 to-orange-500', icon:'🧪' },
  { id:'o5', title:'30% OFF Baby Care Products', code:'BABY30', type:'percentage', value:30, minOrder:399, maxDiscount:300, expiresIn:'10 days', uses:678, gradient:'from-pink-500 to-rose-500', icon:'🍼' },
  { id:'o6', title:'₹75 OFF on Health Devices', code:'DEVICE75', type:'flat', value:75, minOrder:999, maxDiscount:75, expiresIn:'14 days', uses:234, gradient:'from-teal-600 to-emerald-500', icon:'🩺' },
  { id:'o7', title:'20% OFF Skin Care Range', code:'SKIN20', type:'percentage', value:20, minOrder:349, maxDiscount:250, expiresIn:'6 days', uses:567, gradient:'from-fuchsia-500 to-purple-500', icon:'🧖' },
  { id:'o8', title:'Flash Deal: Extra 15% OFF', code:'FLASH15', type:'percentage', value:15, minOrder:199, maxDiscount:150, expiresIn:'1 day', uses:2100, gradient:'from-red-500 to-orange-500', icon:'⚡' },
];

export default function PharmacyOffersPage() {
  const [copied, setCopied] = useState<string|null>(null);

  const handleCopy = (code:string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(()=>setCopied(null), 2000);
  };

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Offers & Coupons</h1>
        <p className="text-sm text-slate-500">{OFFERS.length} active offers for pharmacy products</p>
      </div>

      {/* Flash banner */}
      <div className="bg-linear-to-r from-red-600 to-orange-500 rounded-2xl p-6 mb-8 text-white flex flex-col md:flex-row items-center gap-4">
        <Flame className="w-10 h-10 animate-pulse" />
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-xl font-black">Flash Sale Live! ⚡</h2>
          <p className="text-sm text-white/80">Extra 15% OFF on all medicines — Ends in 23:45:12</p>
        </div>
        <button onClick={()=>handleCopy('FLASH15')}
          className="px-6 py-3 bg-white text-red-600 font-bold rounded-xl hover:bg-white/90 transition-colors">
          Use Code: FLASH15
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {OFFERS.map(offer => (
          <div key={offer.id}
            className={`bg-linear-to-br ${offer.gradient} rounded-2xl p-6 text-white relative overflow-hidden group hover:shadow-xl transition-shadow duration-300`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{offer.icon}</span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {offer.expiresIn}
                </span>
              </div>
              <h3 className="text-lg font-black mb-1">{offer.title}</h3>
              {offer.minOrder > 0 && <p className="text-sm text-white/70">Min. order: ₹{offer.minOrder}</p>}
              {offer.maxDiscount && <p className="text-sm text-white/70">Max discount: ₹{offer.maxDiscount}</p>}
              <div className="flex items-center justify-between mt-5">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/30 rounded-xl">
                  <span className="font-black tracking-widest">{offer.code}</span>
                  <button onClick={()=>handleCopy(offer.code)} className="hover:scale-110 transition-transform">
                    {copied === offer.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-xs text-white/60">{offer.uses.toLocaleString()} uses</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
