'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import React from 'react';
import { MapPin, Navigation, Package, Search, PackageCheck, AlertCircle, Clock, Truck } from 'lucide-react';
import Link from 'next/link';

export default function AdminLiveDeliveryDashboard() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Logistics Command Center</h1>
          <p className="text-slate-500 text-sm">Monitor active fleet, unassigned orders, and live order tracking across all modules.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search Order ID or Rider..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0"><Navigation className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Online Fleet</p>
            <p className="text-xl font-black text-slate-900">1,204</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0"><Clock className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Unassigned</p>
            <p className="text-xl font-black text-slate-900">42</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 border-b-4 border-b-indigo-500">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><Truck className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Out for Delivery</p>
            <p className="text-xl font-black text-slate-900">386</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0"><PackageCheck className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Completed</p>
            <p className="text-xl font-black text-slate-900">4,192</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0"><AlertCircle className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Failed/Returns</p>
            <p className="text-xl font-black text-slate-900">18</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Map Area (Left 2/3) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative min-h-[500px]">
          {/* Mock Map Background */}
          <div className="absolute inset-0 opacity-50 mix-blend-screen pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
          
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-sm border border-slate-700 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Riders Online</span>
            <span className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-sm border border-slate-700 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending Pickup</span>
          </div>

          {/* Mock Map Pins */}
          <div className="absolute top-[30%] left-[40%]">
             <div className="relative flex items-center justify-center">
               <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg z-10 relative"></div>
               <div className="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping"></div>
             </div>
          </div>
          
          <div className="absolute top-[60%] left-[60%]">
             <div className="relative flex items-center justify-center">
               <div className="w-4 h-4 bg-amber-500 rounded-full border-2 border-white shadow-lg z-10 relative"></div>
             </div>
          </div>

          <div className="absolute top-[45%] left-[25%]">
             <div className="relative flex items-center justify-center">
               <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg z-10 relative"></div>
               <div className="absolute bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap -top-5">Delivered</div>
             </div>
          </div>
        </div>

        {/* Action Feed (Right 1/3) */}
        <div className="flex flex-col gap-4">
          
          {/* Unassigned Urgent Panel */}
          <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-1/2">
            <div className="p-3 border-b border-red-100 bg-red-50 flex justify-between items-center">
              <h2 className="font-bold text-red-800 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Unassigned Critical (SLA Warning)
              </h2>
            </div>
            <div className="overflow-auto p-2">
              <div className="bg-white border border-slate-100 p-3 rounded-lg mb-2 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="bg-orange-100 text-orange-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Food Delivery</span>
                  <span className="text-[10px] text-red-500 font-bold">12m waiting</span>
                </div>
                <p className="font-bold text-slate-900 text-sm mb-1">ORD-8921-REST</p>
                <p className="text-xs text-slate-500 mb-2 truncate">Pickup: The Grand Biryani House</p>
                <button className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 rounded transition-colors">Force Assign Nearest</button>
              </div>
            </div>
          </div>

          {/* Active Status Feed */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-1/2">
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-900 text-sm">Live Activity Feed</h2>
            </div>
            <div className="overflow-auto p-2 space-y-2">
              <div className="flex gap-3 items-start p-2 hover:bg-slate-50 rounded transition-colors">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Just now</p>
                  <p className="text-sm font-medium text-slate-900">Rider <span className="font-bold">Rahul M.</span> delivered <span className="font-bold text-blue-600">GROC-4122</span></p>
                </div>
              </div>
              
              <div className="flex gap-3 items-start p-2 hover:bg-slate-50 rounded transition-colors">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">2 mins ago</p>
                  <p className="text-sm font-medium text-slate-900">Rider <span className="font-bold">Amit K.</span> picked up <span className="font-bold text-blue-600">PHARM-9912</span></p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
