'use client';

import React, { Suspense } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, Phone, ChefHat, Bike, MoreVertical, ShoppingBag, Utensils, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function OrderTrackingContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') || 'delivery') as 'delivery' | 'takeaway' | 'dine-in';

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Top Banner based on Type */}
      {type === 'delivery' && (
        <div className="h-64 md:h-96 w-full bg-slate-200 relative">
          <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80" alt="Map" className="w-full h-full object-cover opacity-50" />
          
          <Link href="/restaurant" className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-md">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <button className="absolute top-4 right-4 h-10 px-4 bg-white rounded-full flex items-center justify-center text-sm font-bold text-slate-700 shadow-md">
            Help
          </button>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-4 rounded-2xl shadow-xl text-center border border-slate-100">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Arriving In</p>
            <h2 className="text-3xl font-black text-orange-600">24 <span className="text-lg">mins</span></h2>
          </div>
        </div>
      )}

      {type === 'takeaway' && (
        <div className="pt-8 pb-12 bg-purple-600 text-white relative">
          <Link href="/restaurant" className="absolute top-4 left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-center mt-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black mb-1">Takeaway Order</h1>
            <p className="text-purple-200 font-medium text-sm">Pickup in ~15 mins</p>
          </div>
        </div>
      )}

      {type === 'dine-in' && (
        <div className="pt-8 pb-12 bg-emerald-600 text-white relative">
          <Link href="/restaurant" className="absolute top-4 left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-center mt-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black mb-1">Dine-in Order</h1>
            <p className="text-emerald-200 font-medium text-sm">Being served to your table</p>
          </div>
        </div>
      )}

      <main id="main-content" className={`max-w-2xl mx-auto px-4 ${type === 'delivery' ? '-mt-6' : '-mt-8'} relative z-10 space-y-4 pb-12`}>
        
        {/* Delivery Partner Details (Only for delivery) */}
        {type === 'delivery' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full border-2 border-orange-500 overflow-hidden">
                <img src="https://ui-avatars.com/api/?name=Rahul+Kumar&background=f1f5f9&color=f97316" alt="Driver" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Rahul Kumar</h3>
                <p className="text-xs text-slate-500 font-medium">Delivery Partner • 4.8★</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button title="Call driver" className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Order Status Stepper */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-6">Order Status</h2>
          <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-orange-500 before:via-slate-200 before:to-slate-200">
            
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-orange-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute -left-[31px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="w-full">
                <h4 className="font-bold text-slate-900 text-sm">Order Confirmed</h4>
                <p className="text-xs text-slate-500 mt-1">Just now</p>
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-orange-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute -left-[31px]">
                <ChefHat className="w-3 h-3 text-white" />
              </div>
              <div className="w-full bg-orange-50 p-3 rounded-xl border border-orange-100">
                <h4 className="font-bold text-orange-800 text-sm">Preparing your food</h4>
                <p className="text-xs text-orange-600 mt-1">The kitchen is working on your order.</p>
              </div>
            </div>

            {type === 'delivery' && (
              <>
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-200 bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute -left-[31px]">
                    <Bike className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="w-full opacity-50">
                    <h4 className="font-bold text-slate-700 text-sm">On the way</h4>
                  </div>
                </div>
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-200 bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute -left-[31px]">
                    <MapPin className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="w-full opacity-50">
                    <h4 className="font-bold text-slate-700 text-sm">Delivered</h4>
                  </div>
                </div>
              </>
            )}

            {type === 'takeaway' && (
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-200 bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute -left-[31px]">
                  <ShoppingBag className="w-3 h-3 text-slate-400" />
                </div>
                <div className="w-full opacity-50">
                  <h4 className="font-bold text-slate-700 text-sm">Ready for Pickup</h4>
                </div>
              </div>
            )}

            {type === 'dine-in' && (
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-200 bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute -left-[31px]">
                  <Utensils className="w-3 h-3 text-slate-400" />
                </div>
                <div className="w-full opacity-50">
                  <h4 className="font-bold text-slate-700 text-sm">Served to Table</h4>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Order Details Snippet */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Order Details</h2>
            <button className="text-orange-600 text-sm font-bold">View Receipt</button>
          </div>
          <p className="text-sm text-slate-600 font-medium mb-1">The Grand Biryani House</p>
          <p className="text-xs text-slate-500 mb-3">Order {id}</p>
          <div className="h-px bg-slate-100 w-full mb-3"></div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-slate-700">Payment Status</span>
            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs uppercase tracking-wide">Paid</span>
          </div>
        </div>

        {/* Loyalty Points Earned */}
        <div className="bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_-20%,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🏆</span>
                </div>
                <h3 className="font-black text-white text-base">Loyalty Points Earned</h3>
              </div>
              <span className="text-white font-black text-2xl">+47</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-md">Base: +25</span>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-md">Completion: +10</span>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-md">Seller ★: +5</span>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-md">1.5x Tier: +7</span>
            </div>
            <Link href="/profile" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold text-xs px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors shadow-sm">
              View Loyalty Dashboard <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading order...</p>
        </div>
      </div>
    }>
      <OrderTrackingContent id={id} />
    </Suspense>
  );
}
