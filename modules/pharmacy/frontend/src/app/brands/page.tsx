'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Star, Package, ChevronRight, ArrowUpDown } from 'lucide-react';

const BRANDS = [
  { id:'b1', name:'Cipla', emoji:'ðŸ’Š', tag:'India\'s #1', products:340, discount:'Up to 20% OFF', color:'from-blue-500 to-blue-700' },
  { id:'b2', name:'Dr. Reddy\'s', emoji:'ðŸ§ª', tag:'Since 1984', products:280, discount:'Up to 15% OFF', color:'from-red-500 to-red-700' },
  { id:'b3', name:'Sun Pharma', emoji:'â˜€ï¸', tag:'Global Leader', products:420, discount:'Up to 18% OFF', color:'from-amber-500 to-orange-600' },
  { id:'b4', name:'Dabur', emoji:'ðŸŒ¿', tag:'Ayurvedic', products:210, discount:'Up to 25% OFF', color:'from-green-500 to-emerald-700' },
  { id:'b5', name:'Himalaya', emoji:'ðŸ”ï¸', tag:'Natural Wellness', products:185, discount:'Up to 22% OFF', color:'from-teal-500 to-cyan-700' },
  { id:'b6', name:'Abbott', emoji:'âš—ï¸', tag:'Science of Care', products:155, discount:'Up to 12% OFF', color:'from-purple-500 to-violet-700' },
  { id:'b7', name:'Pfizer', emoji:'ðŸ”¬', tag:'Trusted Globally', products:120, discount:'Up to 10% OFF', color:'from-sky-500 to-blue-600' },
  { id:'b8', name:'Mankind', emoji:'ðŸ’‰', tag:'Affordable Healthcare', products:190, discount:'Up to 20% OFF', color:'from-rose-500 to-pink-700' },
  { id:'b9', name:'GSK', emoji:'ðŸ§¬', tag:'Health Science', products:165, discount:'Up to 14% OFF', color:'from-emerald-500 to-green-700' },
  { id:'b10', name:'Lupin', emoji:'ðŸ§«', tag:'Quality First', products:145, discount:'Up to 16% OFF', color:'from-indigo-500 to-violet-600' },
  { id:'b11', name:'Biocon', emoji:'ðŸ”­', tag:'Biopharmaceuticals', products:88, discount:'Up to 11% OFF', color:'from-cyan-500 to-blue-600' },
  { id:'b12', name:'Zydus', emoji:'âš•ï¸', tag:'Innovation', products:112, discount:'Up to 18% OFF', color:'from-fuchsia-500 to-purple-700' },
];

export default function PharmacyBrandsPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'name'|'products'>('products');

  const filtered = BRANDS
    .filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name) : b.products - a.products);

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Trusted Brands</h1>
          <p className="text-sm text-slate-500">{BRANDS.length} pharmaceutical brands</p>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1 md:w-64">
            <input type="text" placeholder="Search brands..." value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
          <button onClick={()=>setSort(sort==='name'?'products':'name')}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" /> {sort === 'name' ? 'Aâ€“Z' : 'Popular'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map(brand => (
          <Link key={brand.id} href={`/?brand=${brand.id}`}
            className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-teal-300 hover:shadow-xl hover:shadow-teal-50/50 transition-all duration-300">
            <div className={`bg-linear-to-br ${brand.color} p-6 flex items-center justify-between`}>
              <div>
                <span className="text-4xl">{brand.emoji}</span>
              </div>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">{brand.discount}</span>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{brand.name}</h3>
              <p className="text-xs text-slate-400 mb-3">{brand.tag}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Package className="w-3.5 h-3.5" /> {brand.products} products
                </div>
                <span className="text-teal-600 text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Shop Now <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
