import React from 'react';
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle, ChevronRight, Search, Paperclip } from 'lucide-react';
import Link from 'next/link';

export default function SupportTicketsPage() {
  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
               <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                 <MessageSquare className="w-6 h-6 text-indigo-600" /> Help & Support
               </h1>
               <p className="text-sm text-slate-500">View your active support tickets and chat history.</p>
             </div>
             
             <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-sm w-full md:w-auto">
               <Plus className="w-4 h-4" /> Create New Ticket
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Ticket List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          
          {/* List Header/Search */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
             <div className="flex gap-2">
               <button className="text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">Active (2)</button>
               <button className="text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">Closed (14)</button>
             </div>
             <div className="relative">
               <input 
                 type="text" 
                 placeholder="Search tickets..." 
                 className="w-full md:w-64 pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
               />
               <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
             </div>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
             
             {/* Ticket 1: Active - Waiting on Support */}
             <div className="p-4 md:p-5 hover:bg-slate-50 transition-colors cursor-pointer group">
               <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                 
                 <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                     <Clock className="w-6 h-6" />
                   </div>
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Taxi Booking</span>
                       <span className="text-xs text-slate-400 font-medium">#TK-8824</span>
                     </div>
                     <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-indigo-600 transition-colors">Driver charged extra for waiting</h3>
                     <p className="text-sm text-slate-500 line-clamp-1 mb-2">I was charged ₹50 extra for waiting, but the driver arrived late to the pickup location...</p>
                     <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Updated 2 hours ago</p>
                   </div>
                 </div>

                 <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start shrink-0">
                   <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 shadow-sm">
                     <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div> In Review
                   </span>
                   <ChevronRight className="w-5 h-5 text-slate-300 mt-2 hidden md:block group-hover:text-indigo-400 transition-colors" />
                 </div>

               </div>
             </div>

             {/* Ticket 2: Active - Action Required */}
             <div className="p-4 md:p-5 hover:bg-slate-50 transition-colors cursor-pointer group bg-indigo-50/30">
               <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                 
                 <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                     <AlertCircle className="w-6 h-6" />
                   </div>
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Marketplace</span>
                       <span className="text-xs text-slate-400 font-medium">#TK-8821</span>
                     </div>
                     <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-indigo-600 transition-colors">Received damaged iPhone case</h3>
                     <p className="text-sm line-clamp-1 mb-2 font-medium text-slate-700">Admin: Hi Sarah, could you please upload photos of the damaged item?</p>
                     <p className="text-xs text-indigo-600 font-bold flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Action Required • Updated yesterday</p>
                   </div>
                 </div>

                 <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start shrink-0">
                   <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full border border-red-200 flex items-center gap-1.5 shadow-sm">
                     Waiting for You
                   </span>
                   <ChevronRight className="w-5 h-5 text-slate-300 mt-2 hidden md:block group-hover:text-indigo-400 transition-colors" />
                 </div>

               </div>
             </div>

             {/* Ticket 3: Closed */}
             <div className="p-4 md:p-5 hover:bg-slate-50 transition-colors cursor-pointer group opacity-75 hover:opacity-100">
               <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                 
                 <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                     <CheckCircle2 className="w-6 h-6" />
                   </div>
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Grocery</span>
                       <span className="text-xs text-slate-400 font-medium">#TK-8790</span>
                     </div>
                     <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-indigo-600 transition-colors line-through decoration-slate-300">Missing items in grocery delivery</h3>
                     <p className="text-sm text-slate-500 line-clamp-1 mb-2">Admin: The refund for the missing items has been credited to your wallet.</p>
                     <p className="text-xs text-slate-400 flex items-center gap-1">Closed on May 15, 2025</p>
                   </div>
                 </div>

                 <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start shrink-0">
                   <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                     Resolved
                   </span>
                   <ChevronRight className="w-5 h-5 text-slate-300 mt-2 hidden md:block group-hover:text-indigo-400 transition-colors" />
                 </div>

               </div>
             </div>

          </div>

        </div>

      </div>
    </div>
  );
}
