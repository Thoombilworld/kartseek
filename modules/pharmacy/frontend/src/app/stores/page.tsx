'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search, Star, MapPin, Clock, Shield, ChevronRight, Truck, Tag, ChevronLeft,
  SlidersHorizontal
} from 'lucide-react';

const CATEGORIES = [
  { id:'c01',name:'Medicines',emoji:'💊' },
  { id:'c02',name:'Baby Care',emoji:'🍼' },
  { id:'c03',name:'Personal Care',emoji:'🧴' },
  { id:'c04',name:'Health Devices',emoji:'🩺' },
  { id:'c05',name:'Vitamins & Supplements',emoji:'🧪' },
  { id:'c06',name:'First Aid',emoji:'🩹' },
  { id:'c07',name:'Skin Care',emoji:'🧖' },
  { id:'c08',name:'Hair Care',emoji:'💇' },
  { id:'c09',name:'Women\'s Health',emoji:'♀️' },
  { id:'c10',name:'Diabetic Care',emoji:'🩸' },
  { id:'c11',name:'Orthopedic Support',emoji:'🦴' },
  { id:'c12',name:'Elderly Care',emoji:'👴' },
  { id:'c13',name:'Wellness Products',emoji:'🧘' },
  { id:'c14',name:'Mother & Baby',emoji:'🤱' },
  { id:'c15',name:'Home Healthcare',emoji:'🏥' },
  { id:'c16',name:'Prescription Medicines',emoji:'📋' },
];

const ALL_STORES = [
  { id:'ph-1',name:'HealthPlus Pharmacy',img:'🏥',rating:4.7,distance:'0.5 km',delivery:'20 min',open:true,verified:true,offer:'15% OFF',deliveryFee:'Free',minOrder:'₹299',cats:['c01','c02','c06','c05'] },
  { id:'ph-2',name:'Apollo Pharmacy',img:'🏪',rating:4.8,distance:'1.2 km',delivery:'30 min',open:true,verified:true,offer:'Flat ₹100 OFF',deliveryFee:'₹25',minOrder:'₹399',cats:['c01','c03','c05','c07','c16'] },
  { id:'ph-3',name:'MedPlus Pharmacy',img:'💊',rating:4.6,distance:'0.8 km',delivery:'18 min',open:true,verified:true,offer:'25% OFF',deliveryFee:'Free',minOrder:'₹199',cats:['c01','c03','c06'] },
  { id:'ph-4',name:'WellBeing Pharmacy',img:'🌿',rating:4.5,distance:'1.5 km',delivery:'35 min',open:true,verified:true,offer:'Buy 2 Get 1',deliveryFee:'₹30',minOrder:'₹349',cats:['c13','c05','c09','c07'] },
  { id:'ph-5',name:'LifeCare Pharmacy',img:'❤️',rating:4.9,distance:'2.0 km',delivery:'40 min',open:true,verified:true,offer:null,deliveryFee:'₹40',minOrder:'₹499',cats:['c01','c04','c10','c11','c12'] },
  { id:'ph-6',name:'PharmEasy Store',img:'⚡',rating:4.5,distance:'1.8 km',delivery:'22 min',open:true,verified:true,offer:'20% OFF',deliveryFee:'Free',minOrder:'₹249',cats:['c01','c02','c03','c08'] },
  { id:'ph-7',name:'BabyMed Pharmacy',img:'🍼',rating:4.4,distance:'1.0 km',delivery:'25 min',open:true,verified:true,offer:'30% OFF Baby',deliveryFee:'₹20',minOrder:'₹299',cats:['c02','c14','c09'] },
  { id:'ph-8',name:'DiaCare Hub',img:'🩸',rating:4.6,distance:'2.5 km',delivery:'45 min',open:false,verified:true,offer:null,deliveryFee:'₹50',minOrder:'₹499',cats:['c10','c04','c12'] },
  { id:'ph-9',name:'Netmeds Express',img:'🚀',rating:4.4,distance:'3.0 km',delivery:'50 min',open:true,verified:true,offer:'₹75 OFF',deliveryFee:'₹35',minOrder:'₹399',cats:['c01','c05','c13','c08'] },
  { id:'ph-10',name:'VitaMax Wellness',img:'💪',rating:4.3,distance:'2.2 km',delivery:'38 min',open:true,verified:true,offer:'BOGO Vitamins',deliveryFee:'₹25',minOrder:'₹349',cats:['c05','c13','c04'] },
  { id:'ph-11',name:'SkinFirst Pharmacy',img:'✨',rating:4.7,distance:'1.6 km',delivery:'28 min',open:true,verified:true,offer:'20% Skin Care',deliveryFee:'Free',minOrder:'₹299',cats:['c07','c08','c03','c09'] },
  { id:'ph-12',name:'QuickMeds',img:'⏱️',rating:4.2,distance:'0.3 km',delivery:'12 min',open:true,verified:true,offer:null,deliveryFee:'Free',minOrder:'₹149',cats:['c01','c06','c15'] },
];

export default function PharmacyStoresListPage() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get('category') || '';
  const initialSort = searchParams.get('sort') || '';

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(initialCat);
  const [sort, setSort] = useState(initialSort);

  const filtered = useMemo(() => {
    let list = ALL_STORES.filter(s => {
      const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
      const matchesCat = !catFilter || s.cats.some(cid => {
        const cat = CATEGORIES.find(c => c.id === cid);
        return cat?.name === catFilter;
      });
      return matchesSearch && matchesCat;
    });

    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'delivery') list.sort((a, b) => parseInt(a.delivery) - parseInt(b.delivery));
    else if (sort === 'distance') list.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    else if (sort === 'featured') list.sort((a, b) => (b.offer ? 1 : 0) - (a.offer ? 1 : 0));

    return list;
  }, [search, catFilter, sort]);

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide 4xl:max-w-app-full mx-auto px-3 xs:px-4 3xl:px-8 py-6 space-y-6">
      <Link href="/pharmacy" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors font-medium">
        <ChevronLeft className="w-4 h-4" /> Pharmacy Home
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {catFilter ? `${catFilter} Pharmacies` : 'All Pharmacies'}
          </h1>
          <p className="text-sm text-slate-500">{filtered.length} pharmacy store{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search stores..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort pharmacies" title="Sort pharmacies" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white">
            <option value="">Default</option>
            <option value="rating">Top Rated</option>
            <option value="delivery">Fastest Delivery</option>
            <option value="distance">Nearest</option>
            <option value="featured">Has Offers</option>
          </select>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        <button onClick={() => setCatFilter('')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${!catFilter ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'}`}>
          All
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setCatFilter(catFilter === cat.name ? '' : cat.name)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${catFilter === cat.name ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'}`}>
            <span>{cat.emoji}</span> {cat.name}
          </button>
        ))}
      </div>

      {/* Stores Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(store => (
            <Link key={store.id} href={`/pharmacy/stores/${store.id}`} className="bg-white rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-xl transition-all group overflow-hidden">
              <div className="h-32 bg-linear-to-br from-teal-50 via-cyan-50 to-blue-50 relative flex items-center justify-center">
                <span className="text-5xl group-hover:scale-110 transition-transform">{store.img}</span>
                {store.offer && (
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                    <Tag className="w-3 h-3" />{store.offer}
                  </div>
                )}
                <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold ${store.open ? 'bg-emerald-500 text-white' : 'bg-red-100 text-red-700'}`}>
                  {store.open ? '● Open' : '● Closed'}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 truncate">{store.name}</h3>
                  <div className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" /><span className="text-xs font-black">{store.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{store.distance}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{store.delivery}</span>
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{store.deliveryFee}</span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium">Min: {store.minOrder}</span>
                  <span className="text-xs font-bold text-teal-600 group-hover:text-teal-700 flex items-center gap-1">View Pharmacy <ChevronRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <span className="text-5xl mb-4 block">🔍</span>
          <p className="font-bold text-slate-900 text-xl">No pharmacies found</p>
          <p className="text-sm text-slate-500 mt-2">Try a different category or search term</p>
          <button onClick={() => { setCatFilter(''); setSearch(''); }} className="mt-4 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors">
            Browse All
          </button>
        </div>
      )}
    </div>
  );
}
