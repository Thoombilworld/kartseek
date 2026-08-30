'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, Pill, Filter } from 'lucide-react';

const CATEGORIES = [
  { id:'c01', name:'OTC Medicines', emoji:'💊', count:340, rx:false, sub:['Pain Relief','Cold & Flu','Digestive','Allergy'] },
  { id:'c02', name:'Prescription Drugs', emoji:'📋', count:120, rx:true, sub:['Antibiotics','Diabetes','Heart','Thyroid'] },
  { id:'c03', name:'Vitamins & Supplements', emoji:'🧪', count:94, rx:false, sub:['Multivitamins','Omega-3','Iron','Calcium'] },
  { id:'c04', name:'Baby Care', emoji:'🍼', count:64, rx:false, sub:['Diapers','Formula','Baby Skin','Teething'] },
  { id:'c05', name:'Personal Care', emoji:'🧴', count:210, rx:false, sub:['Oral Care','Skin Care','Hair Care','Hygiene'] },
  { id:'c06', name:'Health Devices', emoji:'🩺', count:42, rx:false, sub:['BP Monitors','Glucometers','Thermometers','Nebulizers'] },
  { id:'c07', name:'First Aid', emoji:'🩹', count:45, rx:false, sub:['Bandages','Antiseptics','Creams','Kits'] },
  { id:'c08', name:'Women\'s Health', emoji:'♀️', count:55, rx:false, sub:['Pregnancy','Menstrual','Intimate','Supplements'] },
  { id:'c09', name:'Diabetic Care', emoji:'🩸', count:78, rx:true, sub:['Insulin','Test Strips','Meters','Syringes'] },
  { id:'c10', name:'Skin Care', emoji:'🧖', count:156, rx:false, sub:['Sunscreen','Moisturizer','Acne','Anti-aging'] },
  { id:'c11', name:'Elderly Care', emoji:'👴', count:29, rx:false, sub:['Joint','Vision','Mobility','Nutrition'] },
  { id:'c12', name:'Wellness', emoji:'🧘', count:67, rx:false, sub:['Immunity','Sleep','Stress','Energy'] },
  { id:'c13', name:'Ayurvedic', emoji:'🌿', count:88, rx:false, sub:['Herbs','Oils','Powders','Tablets'] },
  { id:'c14', name:'Orthopedic', emoji:'🦴', count:34, rx:false, sub:['Supports','Braces','Creams','Supplements'] },
  { id:'c15', name:'Hair Care', emoji:'💇', count:72, rx:false, sub:['Shampoo','Oil','Serum','Supplements'] },
  { id:'c16', name:'Home Health', emoji:'🏥', count:22, rx:false, sub:['Sanitizers','Air Purifiers','Masks','Gloves'] },
];

export default function PharmacyCategoriesPage() {
  const [search, setSearch] = useState('');
  const [showRx, setShowRx] = useState(false);

  const filtered = CATEGORIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) &&
    (!showRx || c.rx)
  );

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">All Categories</h1>
          <p className="text-sm text-slate-500">{CATEGORIES.length} categories • {CATEGORIES.reduce((s,c)=>s+c.count,0)} products</p>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 md:w-72">
            <input type="text" placeholder="Search categories..." value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
          <button onClick={()=>setShowRx(!showRx)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors flex items-center gap-2
              ${showRx ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Pill className="w-4 h-4" /> Rx Only
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(cat => (
          <Link key={cat.id} href={`/pharmacy?category=${cat.id}`}
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-50 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{cat.emoji}</span>
              {cat.rx && (
                <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[10px] font-extrabold rounded-md">Rx</span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-teal-700 transition-colors">{cat.name}</h3>
            <p className="text-xs text-slate-400 mb-3">{cat.count} products</p>
            <div className="flex flex-wrap gap-1.5">
              {cat.sub.slice(0,3).map(s => (
                <span key={s} className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-medium rounded-full">{s}</span>
              ))}
              {cat.sub.length > 3 && <span className="text-[10px] text-slate-400 self-center">+{cat.sub.length-3}</span>}
            </div>
            <div className="mt-3 flex items-center text-teal-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Browse <ChevronRight className="w-3 h-3 ml-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
