'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Settings, Plus, Edit2, Trash2, Save, X, ChevronRight, ArrowUpRight, Search, AlertTriangle } from 'lucide-react';

type CategoryRule = {
  id: string;
  category: string;
  subCategory?: string;
  referralRate: number;
  closingFee: number;
  closingFeeThreshold: number;
  minCommission: number;
  effectiveDate: string;
  sellersAffected: number;
  monthlyEarnings: number;
};

const initialRules: CategoryRule[] = [
  { id: '1', category: 'Electronics', subCategory: 'Smartphones', referralRate: 6.5, closingFee: 25, closingFeeThreshold: 500, minCommission: 10, effectiveDate: '2026-01-01', sellersAffected: 145, monthlyEarnings: 2925000 },
  { id: '2', category: 'Electronics', subCategory: 'Laptops', referralRate: 5.0, closingFee: 25, closingFeeThreshold: 500, minCommission: 10, effectiveDate: '2026-01-01', sellersAffected: 82, monthlyEarnings: 1600000 },
  { id: '3', category: 'Electronics', subCategory: 'Accessories', referralRate: 12.0, closingFee: 15, closingFeeThreshold: 300, minCommission: 5, effectiveDate: '2026-01-01', sellersAffected: 210, monthlyEarnings: 890000 },
  { id: '4', category: 'Fashion', subCategory: 'Apparel', referralRate: 15.0, closingFee: 10, closingFeeThreshold: 300, minCommission: 5, effectiveDate: '2026-01-01', sellersAffected: 310, monthlyEarnings: 4200000 },
  { id: '5', category: 'Fashion', subCategory: 'Footwear', referralRate: 12.0, closingFee: 10, closingFeeThreshold: 300, minCommission: 5, effectiveDate: '2026-01-01', sellersAffected: 95, monthlyEarnings: 1440000 },
  { id: '6', category: 'Home & Kitchen', referralRate: 12.0, closingFee: 15, closingFeeThreshold: 500, minCommission: 5, effectiveDate: '2026-01-01', sellersAffected: 120, monthlyEarnings: 1800000 },
  { id: '7', category: 'Beauty', referralRate: 18.0, closingFee: 5, closingFeeThreshold: 200, minCommission: 3, effectiveDate: '2026-01-01', sellersAffected: 85, monthlyEarnings: 1710000 },
  { id: '8', category: 'Books', referralRate: 5.0, closingFee: 5, closingFeeThreshold: 200, minCommission: 1, effectiveDate: '2026-01-01', sellersAffected: 45, monthlyEarnings: 256000 },
  { id: '9', category: 'Sports', referralRate: 10.0, closingFee: 10, closingFeeThreshold: 300, minCommission: 5, effectiveDate: '2026-01-01', sellersAffected: 68, monthlyEarnings: 520000 },
  { id: '10', category: 'Grocery', referralRate: 5.5, closingFee: 5, closingFeeThreshold: 200, minCommission: 1, effectiveDate: '2026-01-01', sellersAffected: 60, monthlyEarnings: 770000 },
];

const formatInr = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

export default function CommissionConfigPage() {
  const [rules, setRules] = useState(initialRules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CategoryRule>>({});
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const filteredRules = rules.filter(r =>
    r.category.toLowerCase().includes(search.toLowerCase()) ||
    (r.subCategory?.toLowerCase() || '').includes(search.toLowerCase()),
  );

  const totalCategories = rules.length;
  const avgRate = (rules.reduce((s, r) => s + r.referralRate, 0) / rules.length).toFixed(1);
  const totalEarnings = rules.reduce((s, r) => s + r.monthlyEarnings, 0);

  const startEdit = (rule: CategoryRule) => {
    setEditingId(rule.id);
    setEditData({ ...rule });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setRules(prev => prev.map(r => r.id === editingId ? { ...r, ...editData } as CategoryRule : r));
    setEditingId(null);
    setSavedMsg('Rate updated successfully');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    setSavedMsg('Rule deleted');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/admin/marketplace" className="hover:text-emerald-600">Marketplace</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/admin/marketplace/commissions" className="hover:text-emerald-600">Commissions</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 font-medium">Category Rate Card</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600" /> Category Commission Configuration
          </h1>
          <p className="text-slate-500 text-sm">Set referral fees, closing fees, and minimum commission per product category — Amazon/Flipkart style.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Category Rule
        </button>
      </div>

      {savedMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-pulse">
          <Save className="w-4 h-4" /> {savedMsg}
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl shadow-md text-white">
          <p className="text-3xl font-black">{totalCategories}</p>
          <p className="text-sm font-medium opacity-80 mt-1">Category Rules</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-black text-slate-900">{avgRate}%</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Avg Referral Rate</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-black text-emerald-600">{formatInr(totalEarnings)}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Monthly Earnings</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-black text-slate-900">{rules.reduce((s, r) => s + r.sellersAffected, 0).toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Sellers Affected</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search categories..." aria-label="Search categories..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          title="Search categories" />
      </div>

      {/* Rate Card Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Category Rate Card</h2>
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-blue-200">
              Amazon/Flipkart Style: Referral % + Closing Fee
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Category</th>
                <th className="px-5 py-3.5 font-semibold text-center">Referral Rate</th>
                <th className="px-5 py-3.5 font-semibold text-center">Closing Fee</th>
                <th className="px-5 py-3.5 font-semibold text-center">Min Commission</th>
                <th className="px-5 py-3.5 font-semibold text-right">Sellers</th>
                <th className="px-5 py-3.5 font-semibold text-right">Monthly Earnings</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRules.map(rule => (
                <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{rule.category}</p>
                    {rule.subCategory && <p className="text-xs text-slate-400 mt-0.5">› {rule.subCategory}</p>}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {editingId === rule.id ? (
                      <input type="number" value={editData.referralRate || 0}
                        onChange={e => setEditData({ ...editData, referralRate: +e.target.value })}
                        className="w-16 px-2 py-1 rounded-lg border-2 border-emerald-500 text-sm font-black text-center focus:outline-none"
                        title="Referral rate" step={0.5} />
                    ) : (
                      <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-black">{rule.referralRate}%</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {editingId === rule.id ? (
                      <div className="inline-flex items-center gap-1">
                        <span className="text-xs text-slate-400">₹</span>
                        <input type="number" value={editData.closingFee || 0}
                          onChange={e => setEditData({ ...editData, closingFee: +e.target.value })}
                          className="w-14 px-2 py-1 rounded-lg border-2 border-emerald-500 text-sm font-bold text-center focus:outline-none"
                          title="Closing fee" />
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-slate-700">₹{rule.closingFee}</span>
                    )}
                    <p className="text-[10px] text-slate-400">{editingId !== rule.id && `below ₹${rule.closingFeeThreshold}`}</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-medium text-slate-700">₹{rule.minCommission}</span>
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-slate-700">{rule.sellersAffected}</td>
                  <td className="px-5 py-4 text-right font-black text-emerald-600">{formatInr(rule.monthlyEarnings)}</td>
                  <td className="px-5 py-4 text-center">
                    {editingId === rule.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={saveEdit} className="p-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-white" title="Save">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-600" title="Cancel">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEdit(rule)} className="p-1.5 hover:bg-blue-50 rounded-lg group" title="Edit">
                          <Edit2 className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                        </button>
                        <button onClick={() => deleteRule(rule.id)} className="p-1.5 hover:bg-red-50 rounded-lg group" title="Delete">
                          <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fee Structure Explanation */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-amber-900 text-sm">Commission Formula (Amazon/Flipkart Style)</p>
            <div className="mt-2 text-xs text-amber-800 space-y-1">
              <p><strong>Platform Commission</strong> = Referral Fee + Closing Fee</p>
              <p className="pl-4">Referral Fee = Order Subtotal × Category Rate (e.g., 6.5% for Smartphones)</p>
              <p className="pl-4">Closing Fee = Fixed ₹ amount per order (applies if order value {'<'} threshold)</p>
              <p className="pl-4">Minimum Commission = Floor amount (commission never goes below this)</p>
              <p className="mt-2"><strong>Seller Payout</strong> = Order Total − Commission − GST on Commission (18%) − TDS (1%)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
