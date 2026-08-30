'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2, GripVertical, Eye, EyeOff, Search } from 'lucide-react';
import { adminPharmacyApi } from '@/lib/api/admin-pharmacy';

const initCats = [
  { id:'pc01',name:'Medicines',emoji:'💊',stores:8,products:45,enabled:true },
  { id:'pc02',name:'Baby Care',emoji:'🍼',stores:5,products:18,enabled:true },
  { id:'pc03',name:'Personal Care',emoji:'🧴',stores:6,products:22,enabled:true },
  { id:'pc04',name:'Health Devices',emoji:'🩺',stores:4,products:14,enabled:true },
  { id:'pc05',name:'Vitamins & Supplements',emoji:'🧪',stores:7,products:20,enabled:true },
  { id:'pc06',name:'First Aid',emoji:'🩹',stores:5,products:12,enabled:true },
  { id:'pc07',name:'Skin Care',emoji:'🧖',stores:5,products:16,enabled:true },
  { id:'pc08',name:'Hair Care',emoji:'💇',stores:4,products:10,enabled:true },
  { id:'pc09',name:'Women\'s Health',emoji:'♀️',stores:4,products:14,enabled:true },
  { id:'pc10',name:'Diabetic Care',emoji:'🩸',stores:3,products:11,enabled:true },
  { id:'pc11',name:'Orthopedic Support',emoji:'🦴',stores:4,products:9,enabled:true },
  { id:'pc12',name:'Elderly Care',emoji:'👴',stores:3,products:13,enabled:true },
  { id:'pc13',name:'Wellness Products',emoji:'🧘',stores:5,products:15,enabled:true },
  { id:'pc14',name:'Medical Equipment',emoji:'🏥',stores:3,products:8,enabled:true },
  { id:'pc15',name:'Prescription Medicines',emoji:'📋',stores:5,products:30,enabled:true },
];

export default function PharmacyCategoriesPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [cats,setCats]=useState(initCats);
  const [search,setSearch]=useState('');
  const [showAdd,setShowAdd]=useState(false);
  const [newName,setNewName]=useState('');
  const [newEmoji,setNewEmoji]=useState('');

  const filtered=cats.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));
  const toggle=(id:string)=>setCats(p=>p.map(c=>c.id===id?{...c,enabled:!c.enabled}:c));
  const remove=(id:string)=>setCats(p=>p.filter(c=>c.id!==id));
  const addCat=()=>{
    if(!newName.trim())return;
    setCats(p=>[...p,{id:`pc${p.length+1}`,name:newName,emoji:newEmoji||'📦',stores:0,products:0,enabled:true}]);
    setNewName('');setNewEmoji('');setShowAdd(false);
  };

  return(<div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Pharmacy Categories</h1><p className="text-slate-500 text-sm">Manage product categories visible to customers.</p></div>
      <button onClick={()=>setShowAdd(!showAdd)} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>Add Category</button>
    </div>

    {showAdd&&<div className="bg-white border border-slate-200 rounded-xl p-5 flex gap-3 items-end">
      <div className="flex-1"><label className="text-xs font-semibold text-slate-500 mb-1 block" htmlFor="category-name">Category Name</label><input id="category-name" value={newName} onChange={e =>setNewName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="e.g. Ayurvedic Medicines"/></div>
      <div className="w-24"><label className="text-xs font-semibold text-slate-500 mb-1 block" htmlFor="emoji">Emoji</label><input id="emoji" value={newEmoji} onChange={e =>setNewEmoji(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="🌿"/></div>
      <button onClick={addCat} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold">Save</button>
      <button onClick={()=>setShowAdd(false)} className="text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg text-sm font-bold border border-slate-200">Cancel</button>
    </div>}

    <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search categories..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full md:w-80 pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"/></div>

    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold w-10"></th><th className="px-5 py-3.5 font-semibold">Category</th><th className="px-5 py-3.5 font-semibold text-center">Stores</th><th className="px-5 py-3.5 font-semibold text-center">Products</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.map(c=>(
          <tr key={c.id} className={`hover:bg-slate-50/50 ${!c.enabled?'opacity-50':''}`}>
            <td className="px-5 py-4 text-center"><GripVertical className="w-4 h-4 text-slate-300 cursor-grab"/></td>
            <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="text-2xl">{c.emoji}</span><div><p className="font-bold text-slate-900">{c.name}</p><p className="text-xs text-slate-400">{c.id}</p></div></div></td>
            <td className="px-5 py-4 text-center font-bold text-slate-700">{c.stores}</td>
            <td className="px-5 py-4 text-center text-slate-600">{c.products}</td>
            <td className="px-5 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.enabled?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{c.enabled?'Active':'Disabled'}</span></td>
            <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-2">
              <button onClick={()=>toggle(c.id)} className="p-1.5 rounded-lg hover:bg-slate-100" title={c.enabled?'Disable':'Enable'}>{c.enabled?<EyeOff className="w-4 h-4 text-slate-400"/>:<Eye className="w-4 h-4 text-emerald-500"/>}</button>
              <button className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Edit"><Edit className="w-4 h-4 text-slate-400"/></button>
              <button onClick={()=>remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400"/></button>
            </div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </div>);
}
