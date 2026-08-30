'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Star, Pill, ShoppingCart, Heart, X, ChevronDown } from 'lucide-react';

const PRODUCTS = [
  { id:'p1', name:'Crocin Advance 500mg', brand:'GSK', category:'Pain Relief', price:45, mrp:65, rx:false, rating:4.7, reviews:1240, img:'💊' },
  { id:'p2', name:'Augmentin 625 Duo', brand:'GSK', category:'Antibiotics', price:320, mrp:420, rx:true, rating:4.8, reviews:890, img:'💊' },
  { id:'p3', name:'Vitamin D3 60K IU', brand:'Abbott', category:'Vitamins', price:120, mrp:180, rx:false, rating:4.6, reviews:2100, img:'☀️' },
  { id:'p4', name:'Cetirizine 10mg', brand:'Zyrtec', category:'Allergy', price:30, mrp:45, rx:false, rating:4.5, reviews:3200, img:'🌬️' },
  { id:'p5', name:'Metformin 500mg', brand:'Glycomet', category:'Diabetes', price:85, mrp:120, rx:true, rating:4.7, reviews:670, img:'💊' },
  { id:'p6', name:'Omron BP Monitor', brand:'Omron', category:'Devices', price:1890, mrp:2499, rx:false, rating:4.9, reviews:450, img:'🩺' },
  { id:'p7', name:'Dettol Hand Wash 750ml', brand:'Dettol', category:'Personal Care', price:129, mrp:189, rx:false, rating:4.4, reviews:5600, img:'🧴' },
  { id:'p8', name:'Revital H Capsules 30s', brand:'Revital', category:'Vitamins', price:210, mrp:295, rx:false, rating:4.6, reviews:1800, img:'💪' },
  { id:'p9', name:'Betadine 100ml', brand:'Win-Medicare', category:'First Aid', price:95, mrp:145, rx:false, rating:4.5, reviews:780, img:'🩹' },
  { id:'p10', name:'Pan-D Capsule', brand:'Alkem', category:'Digestive', price:115, mrp:162, rx:true, rating:4.6, reviews:920, img:'💊' },
  { id:'p11', name:'Volini Spray 55g', brand:'Ranbaxy', category:'Pain Relief', price:165, mrp:230, rx:false, rating:4.3, reviews:1100, img:'💨' },
  { id:'p12', name:'Himalaya Liv.52', brand:'Himalaya', category:'Ayurvedic', price:95, mrp:130, rx:false, rating:4.7, reviews:4200, img:'🌿' },
];

const SORT_OPTIONS = ['Relevance','Price: Low to High','Price: High to Low','Rating','Discount'];

export default function PharmacySearchPage() {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('Relevance');
  const [rxFilter, setRxFilter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const results = useMemo(() => {
    let r = PRODUCTS.filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.brand.toLowerCase().includes(query.toLowerCase()));
    if (rxFilter) r = r.filter(p => !p.rx);
    if (sortBy === 'Price: Low to High') r.sort((a,b) => a.price - b.price);
    else if (sortBy === 'Price: High to Low') r.sort((a,b) => b.price - a.price);
    else if (sortBy === 'Rating') r.sort((a,b) => b.rating - a.rating);
    else if (sortBy === 'Discount') r.sort((a,b) => ((b.mrp-b.price)/b.mrp) - ((a.mrp-a.price)/a.mrp));
    return r;
  }, [query, sortBy, rxFilter]);

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-4 py-8">
      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <input type="text" placeholder="Search medicines, brands, health products..." value={query} onChange={e=>setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm" />
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5" />
        </div>
        <button onClick={()=>setShowFilters(!showFilters)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 shadow-sm">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} title="Sort by" aria-label="Sort by"
            className="appearance-none pr-8 pl-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
            {SORT_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
        <button onClick={()=>setRxFilter(!rxFilter)}
          className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5
            ${rxFilter ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
          <Pill className="w-3.5 h-3.5" /> Non-Rx Only
        </button>
        <span className="text-sm text-slate-400">{results.length} results</span>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {results.map(p => (
          <Link key={p.id} href={`/product/${p.id}`}
            className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-teal-300 hover:shadow-lg transition-all duration-200">
            <div className="relative p-4 bg-slate-50 flex items-center justify-center h-32">
              <span className="text-5xl group-hover:scale-110 transition-transform duration-200">{p.img}</span>
              {p.rx && <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-extrabold rounded">Rx</span>}
              {Math.round((p.mrp-p.price)/p.mrp*100) >= 20 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded">{Math.round((p.mrp-p.price)/p.mrp*100)}% OFF</span>
              )}
              <button className="absolute bottom-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Add to wishlist" aria-label="Add to wishlist">
                <Heart className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            <div className="p-3">
              <p className="text-[10px] text-slate-400 font-medium mb-0.5">{p.brand}</p>
              <h3 className="text-xs font-bold text-slate-900 mb-1.5 line-clamp-2 group-hover:text-teal-700 transition-colors">{p.name}</h3>
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-bold text-slate-700">{p.rating}</span>
                <span className="text-[10px] text-slate-400">({p.reviews})</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-sm font-black text-slate-900">₹{p.price}</span>
                  <span className="text-[10px] text-slate-400 line-through ml-1">₹{p.mrp}</span>
                </div>
                <button className="w-7 h-7 bg-teal-50 hover:bg-teal-100 rounded-lg flex items-center justify-center transition-colors" title="Add to cart" aria-label="Add to cart">
                  <ShoppingCart className="w-3.5 h-3.5 text-teal-600" />
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
