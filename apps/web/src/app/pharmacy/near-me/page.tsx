'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Star, Clock, Shield, ChevronRight, Search, Navigation, Phone, Filter } from 'lucide-react';

const PHARMACIES = [
  { id:'ph-1', name:'HealthPlus Pharmacy', distance:'0.5 km', delivery:'20 min', rating:4.7, reviews:380, verified:true, open:true, offer:'15% OFF', lat:-1.264, lng:36.810, address:'123 Main Ave, Westlands' },
  { id:'ph-2', name:'Apollo Pharmacy', distance:'1.2 km', delivery:'30 min', rating:4.8, reviews:520, verified:true, open:true, offer:'Flat ₹100 OFF', lat:-1.270, lng:36.815, address:'45 Ring Rd, Kilimani' },
  { id:'ph-3', name:'MedPlus Pharmacy', distance:'0.8 km', delivery:'18 min', rating:4.6, reviews:240, verified:true, open:true, offer:'25% OFF', lat:-1.267, lng:36.808, address:'78 FC Road' },
  { id:'ph-4', name:'QuickMeds 24/7', distance:'0.3 km', delivery:'12 min', rating:4.2, reviews:150, verified:true, open:true, offer:null, lat:-1.263, lng:36.812, address:'12 Indiatta Ave' },
  { id:'ph-5', name:'DiaCare Hub', distance:'2.5 km', delivery:'45 min', rating:4.6, reviews:98, verified:true, open:false, offer:null, lat:-1.280, lng:36.822, address:'55 Ngong Rd' },
  { id:'ph-6', name:'WellBeing Pharmacy', distance:'1.5 km', delivery:'35 min', rating:4.5, reviews:180, verified:true, open:true, offer:'Buy 2 Get 1', lat:-1.272, lng:36.818, address:'33 Waiyaki Way' },
  { id:'ph-7', name:'CityMed Pharmacy', distance:'0.7 km', delivery:'15 min', rating:4.8, reviews:420, verified:true, open:true, offer:'Free Delivery', lat:-1.265, lng:36.813, address:'88 Western Express Highway' },
  { id:'ph-8', name:'FamilyCare Pharmacy', distance:'1.9 km', delivery:'32 min', rating:4.5, reviews:280, verified:true, open:true, offer:'15% on Generics', lat:-1.275, lng:36.805, address:'10 Thika Road' },
];

export default function PharmacyNearMePage() {
  const [search, setSearch] = useState('');
  const [openOnly, setOpenOnly] = useState(false);

  const filtered = PHARMACIES
    .filter(p => (!search || p.name.toLowerCase().includes(search.toLowerCase())) && (!openOnly || p.open))
    .sort((a,b) => parseFloat(a.distance) - parseFloat(b.distance));

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pharmacies Near You</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Showing pharmacies around Westlands, Mumbai</p>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 md:w-64">
            <input type="text" placeholder="Search pharmacies..." value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
          <button onClick={()=>setOpenOnly(!openOnly)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${openOnly ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            Open Now
          </button>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="h-64 bg-slate-100 rounded-2xl mb-6 flex items-center justify-center border border-slate-200">
        <div className="text-center">
          <Navigation className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Interactive map will display pharmacy locations</p>
        </div>
      </div>

      {/* Pharmacy list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(ph => (
          <Link key={ph.id} href={`/pharmacy/stores/${ph.id}`}
            className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-300 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-2xl">🏥</div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{ph.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5 text-xs"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><span className="font-bold text-slate-700">{ph.rating}</span></span>
                    <span className="text-[10px] text-slate-400">({ph.reviews})</span>
                    {ph.verified && <Shield className="w-3 h-3 text-green-500" />}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${ph.open ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {ph.open ? 'OPEN' : 'CLOSED'}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3"><MapPin className="w-3 h-3 inline" /> {ph.address}</p>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Navigation className="w-3 h-3 text-teal-500" /> {ph.distance}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ph.delivery}</span>
              {ph.offer && <span className="px-2 py-0.5 bg-green-50 text-green-700 font-bold rounded-full">{ph.offer}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
