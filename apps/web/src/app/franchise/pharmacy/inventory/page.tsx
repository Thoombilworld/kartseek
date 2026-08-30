'use client';
import React, { useState } from 'react';
import { Search, AlertTriangle, Package, ArrowUpDown, Eye, BarChart3, Boxes } from 'lucide-react';

const INVENTORY = [
  { store:'MedPlus Pharmacy', totalSKUs:3200, lowStock:12, outOfStock:3, expiringSoon:5, lastAudit:'Jul 4, 2026', health:'good' },
  { store:'Apollo Pharmacy', totalSKUs:4500, lowStock:8, outOfStock:1, expiringSoon:3, lastAudit:'Jul 5, 2026', health:'good' },
  { store:'HealthFirst', totalSKUs:1800, lowStock:25, outOfStock:8, expiringSoon:12, lastAudit:'Jun 28, 2026', health:'critical' },
  { store:'NetMeds Express', totalSKUs:2800, lowStock:15, outOfStock:4, expiringSoon:6, lastAudit:'Jul 3, 2026', health:'warning' },
  { store:'PharmEasy Store', totalSKUs:2100, lowStock:10, outOfStock:2, expiringSoon:4, lastAudit:'Jul 4, 2026', health:'good' },
  { store:'Wellness Forever', totalSKUs:3800, lowStock:6, outOfStock:0, expiringSoon:2, lastAudit:'Jul 5, 2026', health:'good' },
  { store:'Care Chemist', totalSKUs:900, lowStock:20, outOfStock:7, expiringSoon:9, lastAudit:'Jun 25, 2026', health:'critical' },
];

const HEALTH_CFG: Record<string,{label:string,color:string,bg:string}> = {
  good: { label:'Good', color:'text-green-700', bg:'bg-green-50 border-green-200' },
  warning: { label:'Warning', color:'text-amber-700', bg:'bg-amber-50 border-amber-200' },
  critical: { label:'Critical', color:'text-red-700', bg:'bg-red-50 border-red-200' },
};

export default function FranchisePharmacyInventoryPage() {
  const [search, setSearch] = useState('');
  const filtered = INVENTORY.filter(i => !search || i.store.toLowerCase().includes(search.toLowerCase()));

  const totalLow = INVENTORY.reduce((s,i) => s+i.lowStock, 0);
  const totalOut = INVENTORY.reduce((s,i) => s+i.outOfStock, 0);
  const totalExp = INVENTORY.reduce((s,i) => s+i.expiringSoon, 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory Overview</h1>
          <p className="text-sm text-slate-500">Monitor stock levels and expiry alerts across all pharmacy stores.</p>
        </div>
        <div className="relative">
          <input type="text" placeholder="Search stores..." value={search} onChange={e=>setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* Alert cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <div><p className="text-xs text-amber-600">Low Stock Items</p><p className="text-2xl font-black text-amber-800">{totalLow}</p></div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Package className="w-8 h-8 text-red-500" />
          <div><p className="text-xs text-red-600">Out of Stock</p><p className="text-2xl font-black text-red-800">{totalOut}</p></div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <Boxes className="w-8 h-8 text-orange-500" />
          <div><p className="text-xs text-orange-600">Expiring Soon</p><p className="text-2xl font-black text-orange-800">{totalExp}</p></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 font-bold text-slate-600">Store</th>
              <th className="text-center px-5 py-3 font-bold text-slate-600">Total SKUs</th>
              <th className="text-center px-5 py-3 font-bold text-slate-600">Low Stock</th>
              <th className="text-center px-5 py-3 font-bold text-slate-600">Out of Stock</th>
              <th className="text-center px-5 py-3 font-bold text-slate-600">Expiring</th>
              <th className="text-center px-5 py-3 font-bold text-slate-600">Health</th>
              <th className="text-left px-5 py-3 font-bold text-slate-600">Last Audit</th>
              <th className="text-center px-5 py-3 font-bold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(row => {
              const cfg = HEALTH_CFG[row.health];
              return (
                <tr key={row.store} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-bold text-slate-900">{row.store}</td>
                  <td className="px-5 py-3 text-center text-slate-600">{row.totalSKUs.toLocaleString()}</td>
                  <td className="px-5 py-3 text-center"><span className={row.lowStock > 15 ? 'font-bold text-amber-600' : 'text-slate-500'}>{row.lowStock}</span></td>
                  <td className="px-5 py-3 text-center"><span className={row.outOfStock > 0 ? 'font-bold text-red-600' : 'text-slate-500'}>{row.outOfStock}</span></td>
                  <td className="px-5 py-3 text-center"><span className={row.expiringSoon > 5 ? 'font-bold text-orange-600' : 'text-slate-500'}>{row.expiringSoon}</span></td>
                  <td className="px-5 py-3 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span></td>
                  <td className="px-5 py-3 text-slate-500">{row.lastAudit}</td>
                  <td className="px-5 py-3 text-center"><button className="p-1.5 hover:bg-slate-100 rounded-lg" title="View details" aria-label="View details"><Eye className="w-4 h-4 text-slate-400" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
