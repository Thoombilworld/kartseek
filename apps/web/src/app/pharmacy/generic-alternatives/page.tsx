'use client';
import React, { useState } from 'react';
import { Search, ArrowRight, Pill, DollarSign, Info, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const MEDICINES = [
  { brand:'Crocin Advance 500mg', generic:'Paracetamol 500mg', brandPrice:65, genericPrice:12, savings:82, manufacturer:'Cipla', bioequivalent:true },
  { brand:'Augmentin 625 Duo', generic:'Amoxicillin + Clavulanic Acid', brandPrice:420, genericPrice:85, savings:80, manufacturer:'Alkem', bioequivalent:true },
  { brand:'Thyronorm 50mcg', generic:'Levothyroxine 50mcg', brandPrice:145, genericPrice:38, savings:74, manufacturer:'Micro Labs', bioequivalent:true },
  { brand:'Metformin (Glycomet) 500mg', generic:'Metformin HCl 500mg', brandPrice:120, genericPrice:22, savings:82, manufacturer:'USV', bioequivalent:true },
  { brand:'Pantoprazole (Pan-D)', generic:'Pantoprazole 40mg + Domperidone', brandPrice:162, genericPrice:45, savings:72, manufacturer:'Mankind', bioequivalent:true },
  { brand:'Atorvastatin (Lipitor) 10mg', generic:'Atorvastatin 10mg', brandPrice:280, genericPrice:55, savings:80, manufacturer:'Sun Pharma', bioequivalent:true },
  { brand:'Cetirizine (Zyrtec) 10mg', generic:'Cetirizine HCl 10mg', brandPrice:45, genericPrice:8, savings:82, manufacturer:'Cipla', bioequivalent:true },
  { brand:'Omeprazole (Omez) 20mg', generic:'Omeprazole 20mg', brandPrice:95, genericPrice:18, savings:81, manufacturer:'Dr. Reddy\'s', bioequivalent:true },
];

export default function GenericAlternativesPage() {
  const [search, setSearch] = useState('');

  const filtered = MEDICINES.filter(m =>
    m.brand.toLowerCase().includes(search.toLowerCase()) ||
    m.generic.toLowerCase().includes(search.toLowerCase())
  );

  const totalSavings = filtered.reduce((s,m) => s + (m.brandPrice - m.genericPrice), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Generic Alternatives</h1>
        <p className="text-sm text-slate-500">Save up to 80% with FDA/CDSCO-approved generic medicines</p>
      </div>

      {/* Savings banner */}
      <div className="bg-linear-to-r from-green-600 to-emerald-500 rounded-2xl p-6 mb-8 text-white flex flex-col md:flex-row items-center gap-4">
        <DollarSign className="w-12 h-12" />
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-xl font-black">Save â‚¹{totalSavings} on your medicines!</h2>
          <p className="text-sm text-white/80">Same composition, same efficacy â€” certified bioequivalent</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
          <ShieldCheck className="w-5 h-5" /> <span className="text-sm font-bold">All CDSCO Approved</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input type="text" placeholder="Search brand or generic name..." value={search} onChange={e=>setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm" />
        <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5" />
      </div>

      {/* Results */}
      <div className="space-y-4">
        {filtered.map((m, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-green-300 hover:shadow-md transition-all">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Brand */}
              <div className="bg-red-50/50 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-red-500 uppercase">Brand</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{m.brand}</p>
                <p className="text-lg font-black text-slate-900 mt-1">â‚¹{m.brandPrice}</p>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                  <ArrowRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-extrabold text-green-700">Save {m.savings}%</span>
                </div>
              </div>

              {/* Generic */}
              <div className="bg-green-50/50 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-green-600 uppercase">Generic</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{m.generic}</p>
                <p className="text-lg font-black text-green-700 mt-1">â‚¹{m.genericPrice}</p>
                <p className="text-[10px] text-slate-400 mt-1">by {m.manufacturer}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {m.bioequivalent && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Bioequivalent
                  </span>
                )}
              </div>
              <Link href={`/pharmacy/search?q=${encodeURIComponent(m.generic)}`}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                <Pill className="w-3 h-3" /> Buy Generic
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="mt-8 p-5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-blue-900 mb-1">What are Generic Medicines?</h3>
          <p className="text-xs text-blue-800 leading-relaxed">Generic medicines contain the same active ingredients, dosage, and form as branded equivalents. They are approved by regulatory bodies (CDSCO/FDA) and are clinically bioequivalent â€” meaning they work identically in the body. The price difference exists because generic manufacturers don&apos;t bear the original R&D costs.</p>
        </div>
      </div>
    </div>
  );
}
