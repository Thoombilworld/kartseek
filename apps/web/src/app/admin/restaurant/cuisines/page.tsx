'use client';
import { useRestaurantRegionFilter } from '@/hooks/useRestaurantRegionFilter';
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, GripVertical, Image as ImageIcon } from 'lucide-react';
import { adminRestaurantApi } from '@/lib/api/admin-restaurant';

type CuisineCategory = {
  id: string; name: string; emoji: string; restaurants: number;
  active: boolean; featured: boolean; sortOrder: number;
};

const INIT: CuisineCategory[] = [
  { id: 'c01', name: 'Biryani', emoji: '🥘', restaurants: 842, active: true, featured: true, sortOrder: 1 },
  { id: 'c02', name: 'Pizza', emoji: '🍕', restaurants: 618, active: true, featured: true, sortOrder: 2 },
  { id: 'c03', name: 'Burger', emoji: '🍔', restaurants: 534, active: true, featured: true, sortOrder: 3 },
  { id: 'c04', name: 'Chinese', emoji: '🍜', restaurants: 490, active: true, featured: true, sortOrder: 4 },
  { id: 'c05', name: 'South Indian', emoji: '🍛', restaurants: 412, active: true, featured: false, sortOrder: 5 },
  { id: 'c06', name: 'North Indian', emoji: '🫔', restaurants: 380, active: true, featured: false, sortOrder: 6 },
  { id: 'c07', name: 'Shawarma', emoji: '🌯', restaurants: 298, active: true, featured: true, sortOrder: 7 },
  { id: 'c08', name: 'Seafood', emoji: '🦐', restaurants: 214, active: true, featured: false, sortOrder: 8 },
  { id: 'c09', name: 'Arabic / Mandi', emoji: '🍖', restaurants: 186, active: true, featured: false, sortOrder: 9 },
  { id: 'c10', name: 'Grills & BBQ', emoji: '🔥', restaurants: 162, active: true, featured: true, sortOrder: 10 },
  { id: 'c11', name: 'Healthy Food', emoji: '🥗', restaurants: 134, active: true, featured: false, sortOrder: 11 },
  { id: 'c12', name: 'Desserts', emoji: '🍦', restaurants: 112, active: true, featured: false, sortOrder: 12 },
  { id: 'c13', name: 'Bakery', emoji: '🥐', restaurants: 98, active: false, featured: false, sortOrder: 13 },
  { id: 'c14', name: 'Juices & Drinks', emoji: '🍹', restaurants: 78, active: true, featured: false, sortOrder: 14 },
  { id: 'c15', name: 'Fast Food', emoji: '🍟', restaurants: 224, active: true, featured: true, sortOrder: 15 },
  { id: 'c16', name: 'Mandi', emoji: '🍗', restaurants: 142, active: true, featured: false, sortOrder: 16 },
];

export default function AdminCuisinesPage() {
  const { regionLabel, isFiltered, formatPrice } = useRestaurantRegionFilter([]);
  const [cuisines, setCuisines] = useState(INIT);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🍽️');

  const filtered = cuisines.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: string, field: 'active' | 'featured') => setCuisines(p => p.map(c => c.id === id ? { ...c, [field]: !c[field] } : c));
  const remove = (id: string) => setCuisines(p => p.filter(c => c.id !== id));

  const addCuisine = () => {
    if (!newName.trim()) return;
    setCuisines(p => [...p, { id: 'c' + Date.now(), name: newName.trim(), emoji: newEmoji, restaurants: 0, active: true, featured: false, sortOrder: p.length + 1 }]);
    setNewName(''); setNewEmoji('🍽️'); setShowAdd(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cuisine Categories</h1>
          <p className="text-slate-500 text-sm">Manage cuisine categories visible to customers on the homepage and listing pages.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-colors">
          <Plus className="w-4 h-4" /> Add Cuisine
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Cuisines', value: cuisines.length, color: 'text-slate-900' },
          { label: 'Active', value: cuisines.filter(c => c.active).length, color: 'text-emerald-600' },
          { label: 'Featured', value: cuisines.filter(c => c.featured).length, color: 'text-orange-600' },
          { label: 'Total Restaurants', value: cuisines.reduce((s, c) => s + c.restaurants, 0).toLocaleString(), color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
          <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
            className="w-14 text-center text-2xl border border-slate-200 rounded-xl py-2 focus:ring-2 focus:ring-orange-400 outline-none bg-white" />
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Cuisine name (e.g. Korean)"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-orange-400 outline-none" />
          <button onClick={addCuisine} className="bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">Add</button>
          <button onClick={() => setShowAdd(false)} className="bg-white text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm border border-slate-200">Cancel</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cuisines..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white" />
      </div>

      {/* Featured Cuisines Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Featured on Homepage ({cuisines.filter(c => c.featured && c.active).length})</h3>
        <div className="flex flex-wrap gap-3">
          {cuisines.filter(c => c.featured && c.active).map(c => (
            <div key={c.id} className="flex items-center gap-2 bg-linear-to-br from-orange-500 to-red-500 text-white px-3 py-2 rounded-xl text-sm font-bold shadow-sm">
              <span>{c.emoji}</span> <span>{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 grid grid-cols-12 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <div className="col-span-1"></div>
          <div className="col-span-4">Cuisine</div>
          <div className="col-span-2 text-center">Restaurants</div>
          <div className="col-span-2 text-center">Active</div>
          <div className="col-span-2 text-center">Featured</div>
          <div className="col-span-1 text-center">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map(c => (
            <div key={c.id} className={`px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-50/50 transition-colors ${!c.active ? 'opacity-50' : ''}`}>
              <div className="col-span-1 text-slate-300 cursor-grab"><GripVertical className="w-4 h-4" /></div>
              <div className="col-span-4 flex items-center gap-3">
                <span className="text-2xl">{c.emoji}</span>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                  <p className="text-xs text-slate-400">Sort #{c.sortOrder}</p>
                </div>
              </div>
              <div className="col-span-2 text-center font-bold text-slate-700 text-sm">{c.restaurants.toLocaleString()}</div>
              <div className="col-span-2 text-center">
                <button onClick={() => toggle(c.id, 'active')}
                  className={`relative w-10 h-5 rounded-full transition-colors ${c.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 shadow transition-transform ${c.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="col-span-2 text-center">
                <button onClick={() => toggle(c.id, 'featured')}
                  className={`relative w-10 h-5 rounded-full transition-colors ${c.featured ? 'bg-orange-500' : 'bg-slate-300'}`}>
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 shadow transition-transform ${c.featured ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="col-span-1 flex items-center justify-center gap-1.5">
                <button className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg" aria-label="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(c.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
