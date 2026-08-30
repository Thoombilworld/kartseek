import React from 'react';
import { ArrowLeft, CircleDot, Info, Plus, Minus, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function FoodItemCustomizationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Hero Image */}
      <div className="w-full h-64 md:h-80 bg-slate-200 relative">
        <img src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80" alt="Food" className="w-full h-full object-cover" />
        <Link href={`/restaurant/rest-2`} className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-900 shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>

      <main id="main-content" className="max-w-2xl mx-auto px-4 -mt-6 relative z-10">
        
        {/* Item Info Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md mb-6">
          <div className="flex items-center gap-2 mb-2">
             <div className="w-4 h-4 border border-red-500 rounded-sm flex items-center justify-center p-0.5">
               <CircleDot className="w-full h-full text-red-500" />
             </div>
             <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Bestseller</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Chicken Dum Biryani</h1>
          <div className="text-xl font-bold text-slate-800 mb-3">₹320</div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Signature chicken biryani cooked with fragrant basmati rice, tender chicken pieces, and secret Mughlai spices. Slow cooked in dum style.
          </p>
        </div>

        {/* Customization Options */}
        <div className="space-y-6">
          
          {/* Radio Group - Required */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Portion Size</h3>
                <p className="text-xs text-slate-500">Choose any 1 option</p>
              </div>
              <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Required</span>
            </div>
            <div className="p-2">
              <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-[6px] border-orange-600 bg-white"></div>
                  <span className="font-medium text-slate-900">Regular (Serves 1)</span>
                </div>
                <span className="font-medium text-slate-500">Free</span>
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white"></div>
                  <span className="font-medium text-slate-900">Large (Serves 2)</span>
                </div>
                <span className="font-medium text-slate-900">+₹150</span>
              </label>
            </div>
          </div>

          {/* Checkbox Group - Optional */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Add-ons</h3>
                <p className="text-xs text-slate-500">Choose up to 3 options</p>
              </div>
              <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Optional</span>
            </div>
            <div className="p-2">
              <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-[4px] border-2 border-slate-300 bg-white flex items-center justify-center"></div>
                  <span className="font-medium text-slate-900">Extra Raita</span>
                </div>
                <span className="font-medium text-slate-900">+₹30</span>
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-[4px] bg-orange-600 flex items-center justify-center text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-slate-900">Extra Salan</span>
                </div>
                <span className="font-medium text-slate-900">+₹40</span>
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-[4px] border-2 border-slate-300 bg-white flex items-center justify-center"></div>
                  <span className="font-medium text-slate-900">Boiled Egg</span>
                </div>
                <span className="font-medium text-slate-900">+₹25</span>
              </label>
            </div>
          </div>
          
        </div>
      </main>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          
          <div className="flex items-center bg-slate-100 rounded-xl h-12 px-2 shrink-0">
            <button title="Decrease quantity" className="w-10 h-full flex items-center justify-center text-slate-600 hover:text-orange-600 font-bold transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-slate-900 text-lg">1</span>
            <button title="Increase quantity" className="w-10 h-full flex items-center justify-center text-slate-600 hover:text-orange-600 font-bold transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white h-12 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2">
            Add to Cart - ₹360
          </button>
          
        </div>
      </div>
    </div>
  );
}
