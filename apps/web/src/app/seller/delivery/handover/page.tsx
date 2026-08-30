import React from 'react';
import { Package, CheckCircle2, Clock, MapPin, Search, QrCode } from 'lucide-react';
import Link from 'next/link';

export default function SellerDeliveryHandoverPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery Handover</h1>
          <p className="text-slate-500 text-sm">Manage packed orders waiting for logistics partners to pick them up.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search Order ID..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button className="pb-3 text-sm font-bold text-blue-600 border-b-2 border-blue-600">Ready for Pickup (4)</button>
        <button className="pb-3 text-sm font-medium text-slate-500 hover:text-slate-900">In Transit (12)</button>
        <button className="pb-3 text-sm font-medium text-slate-500 hover:text-slate-900">Completed (142)</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Handover Card 1 */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-amber-50">
             <div className="flex items-center gap-2">
               <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded border border-amber-200">Waiting for Rider</span>
             </div>
             <p className="font-bold text-slate-900 text-sm">ORD-MKT-8812</p>
          </div>
          <div className="p-5 flex-1">
             <p className="text-sm font-bold text-slate-900 mb-1">Customer: Sarah Jenkins</p>
             <p className="text-xs text-slate-500 mb-4 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Drop: Andheri West, Mumbai</p>
             
             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
               <p className="text-xs font-bold text-slate-700 mb-1">Items to Handover:</p>
               <ul className="text-sm text-slate-600 list-disc list-inside">
                 <li>1x Sony WH-1000XM5 Headphones</li>
                 <li>1x Premium Hard Case</li>
               </ul>
             </div>

             <div className="flex items-center justify-between mt-auto">
               <div className="flex items-center gap-2 text-sm">
                 <Clock className="w-4 h-4 text-slate-400" />
                 <span className="text-slate-600">Rider Assigning...</span>
               </div>
               <button disabled className="bg-slate-100 text-slate-400 font-bold px-4 py-2 rounded-lg text-sm cursor-not-allowed">
                 Confirm Handover
               </button>
             </div>
          </div>
        </div>

        {/* Handover Card 2 */}
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden flex flex-col ring-1 ring-blue-500/10">
          <div className="p-4 border-b border-blue-100 flex justify-between items-center bg-blue-50">
             <div className="flex items-center gap-2">
               <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded border border-blue-200">Rider Arrived</span>
             </div>
             <p className="font-bold text-slate-900 text-sm">ORD-MKT-8810</p>
          </div>
          <div className="p-5 flex-1">
             <p className="text-sm font-bold text-slate-900 mb-1">Customer: Raj Patel</p>
             <p className="text-xs text-slate-500 mb-4 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Drop: Bandra Kurla Complex</p>
             
             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 flex justify-between items-center">
               <div>
                 <p className="text-xs font-bold text-slate-700 mb-0.5">Assigned Rider:</p>
                 <p className="text-sm font-bold text-slate-900">Vikram Singh</p>
                 <p className="text-xs text-slate-500">+91 98765 43210</p>
               </div>
               <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&q=80" alt="Rider" className="w-full h-full object-cover" />
               </div>
             </div>

             <div className="flex flex-col gap-2 mt-auto">
               <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
                 <QrCode className="w-4 h-4" /> Scan QR to Handover
               </button>
               <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Manual Handover Confirm
               </button>
             </div>
          </div>
        </div>

      </div>

    </div>
  );
}
