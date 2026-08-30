'use client';
import React, { useState } from 'react';
import { Clock, MapPin, Phone, ChevronDown, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type TakeawayStatus = 'takeaway_created' | 'restaurant_pending' | 'restaurant_accepted' | 'preparing' | 'ready_for_pickup' | 'customer_arrived' | 'collected' | 'completed';

type StatusDef = { key: TakeawayStatus; customerLabel: string; sellerLabel: string; adminLabel: string; desc: string; color: string; bg: string; };

const STATUS_MAP: StatusDef[] = [
  { key: 'takeaway_created', customerLabel: 'Order Placed', sellerLabel: 'New Takeaway Order', adminLabel: 'Takeaway Order Placed', desc: 'Sent to restaurant', color: 'text-slate-700', bg: 'bg-slate-100' },
  { key: 'restaurant_pending', customerLabel: 'Waiting for Confirmation', sellerLabel: 'Accept / Reject', adminLabel: 'Awaiting Restaurant', desc: 'Restaurant is reviewing', color: 'text-amber-700', bg: 'bg-amber-100' },
  { key: 'restaurant_accepted', customerLabel: 'Restaurant Accepted', sellerLabel: 'Accepted', adminLabel: 'Accepted by Restaurant', desc: 'Order confirmed', color: 'text-blue-700', bg: 'bg-blue-100' },
  { key: 'preparing', customerLabel: 'Food is Being Prepared', sellerLabel: 'Preparing', adminLabel: 'Preparing', desc: 'Chef is cooking', color: 'text-orange-700', bg: 'bg-orange-100' },
  { key: 'ready_for_pickup', customerLabel: 'Ready for Pickup!', sellerLabel: 'Ready for Pickup', adminLabel: 'Ready for Pickup', desc: 'Notify customer to come', color: 'text-green-700', bg: 'bg-green-100' },
  { key: 'customer_arrived', customerLabel: 'Please Collect from Counter', sellerLabel: 'Customer Arrived', adminLabel: 'Customer Arrived', desc: 'Customer is at restaurant', color: 'text-teal-700', bg: 'bg-teal-100' },
  { key: 'collected', customerLabel: 'Order Collected', sellerLabel: 'Collected', adminLabel: 'Customer Collected', desc: 'Handed to customer', color: 'text-purple-700', bg: 'bg-purple-100' },
  { key: 'completed', customerLabel: 'Order Completed', sellerLabel: 'Completed', adminLabel: 'Completed', desc: 'Order finished', color: 'text-emerald-700', bg: 'bg-emerald-100' },
];

export default function TakeawayTrackPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = React.use(params);
  const [currentStatus, setCurrentStatus] = useState<TakeawayStatus>('restaurant_accepted');
  const currentIdx = STATUS_MAP.findIndex(s => s.key === currentStatus);
  const statusDef = STATUS_MAP[currentIdx];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Status Bar */}
      <div className="bg-gradient-to-b from-purple-700 to-purple-600 text-white px-4 py-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {currentStatus === 'ready_for_pickup' ? <AlertCircle className="w-9 h-9 text-yellow-300" /> :
             currentStatus === 'completed' ? <CheckCircle className="w-9 h-9 text-green-300" /> :
             <Loader2 className="w-9 h-9 animate-spin" />}
          </div>
          <h1 className="text-2xl font-black mb-2">{statusDef.customerLabel}</h1>
          <p className="text-white/70 text-sm">{statusDef.desc}</p>
          {/* Progress */}
          <div className="mt-5 bg-white/20 rounded-full h-2 overflow-hidden">
            <div className={`bg-white h-full rounded-full transition-all duration-700 ${
              ['w-[12.5%]','w-[25%]','w-[37.5%]','w-1/2','w-[62.5%]','w-3/4','w-[87.5%]','w-full'][currentIdx] || 'w-0'
            }`} />
          </div>
          <p className="text-white/60 text-xs mt-1.5">Step {currentIdx + 1} of {STATUS_MAP.length}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        {/* Order ID */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
          <span className="text-slate-500 text-sm">Order ID</span>
          <span className="font-black text-purple-700 text-sm">{orderId ?? 'TKW-98741'}</span>
        </div>

        {/* Restaurant card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🥘</div>
            <div className="flex-1">
              <p className="font-bold text-slate-900">The Grand Biryani House</p>
              <p className="text-slate-500 text-xs mt-0.5">Plot 24, Food Street, Al Olaya District</p>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl py-2 text-xs font-bold hover:bg-blue-100 transition-colors">
                  <MapPin className="w-3.5 h-3.5" /> Directions
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 border border-green-200 text-green-700 rounded-xl py-2 text-xs font-bold hover:bg-green-100 transition-colors">
                  <Phone className="w-3.5 h-3.5" /> Call Restaurant
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup Time */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <Clock className="w-6 h-6 text-orange-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-orange-700 font-semibold">Estimated Pickup</p>
            <p className="font-black text-orange-900 text-lg">ASAP (~20 min)</p>
          </div>
          <span className="bg-orange-200 text-orange-800 text-xs font-black rounded-lg px-3 py-1.5">~18 min left</span>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4 text-sm">Order Timeline</h2>
          <div className="space-y-0">
            {STATUS_MAP.map((s, i) => {
              const isDone = i < currentIdx;
              const isActive = i === currentIdx;
              const isFuture = i > currentIdx;
              return (
                <div key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${isDone ? 'bg-purple-600 border-purple-600' : isActive ? 'bg-purple-100 border-purple-500' : 'bg-white border-slate-200'}`}>
                      {isDone ? <CheckCircle className="w-4 h-4 text-white" /> :
                       isActive ? <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" /> :
                       <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                    </div>
                    {i < STATUS_MAP.length - 1 && <div className={`w-0.5 h-7 my-0.5 ${isDone ? 'bg-purple-200' : 'bg-slate-200'}`} />}
                  </div>
                  <div className={`pb-4 flex-1 ${i === STATUS_MAP.length - 1 ? 'pb-0' : ''}`}>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-sm ${isFuture ? 'text-slate-300' : 'text-slate-800'}`}>{s.customerLabel}</p>
                      {isActive && <span className="bg-purple-100 text-purple-700 text-[10px] font-black rounded px-1.5 py-0.5">NOW</span>}
                    </div>
                    <p className={`text-xs ${isFuture ? 'text-slate-200' : 'text-slate-400'}`}>{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 text-sm">Your Order</h2>
            <button className="text-purple-600 text-xs font-bold">View Details</button>
          </div>
          <div className="space-y-1.5">
            {['2× Chicken Biryani', '1× Paneer Butter Masala', '4× Butter Naan', '2× Gulab Jamun'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                <span className="text-slate-600 text-sm">{item}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between">
            <span className="text-slate-500 text-sm">Total Paid</span>
            <span className="font-black text-slate-900">₹1,180</span>
          </div>
        </div>

        {/* DEV: Status simulator */}
        <div className="bg-slate-100 rounded-xl p-3">
          <p className="text-xs text-slate-400 font-bold mb-2">⚙️ Dev — Simulate Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_MAP.map((s, i) => (
              <button key={s.key} onClick={() => setCurrentStatus(s.key)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${currentStatus === s.key ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-400'}`}>
                {i + 1}. {s.key.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="pb-8" />
      </div>
    </div>
  );
}
