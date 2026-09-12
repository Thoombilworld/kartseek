'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminCoreApi } from '@/lib/api/admin-core';
import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Settings,
  ArrowUpRight,
  ShoppingCart,
  UtensilsCrossed,
  Pill,
  Stethoscope,
  Car,
  Store,
  Truck,
  Edit,
  Check,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  AlertTriangle,
  Percent,
  Eye,
} from 'lucide-react';

type ModuleRate = {
  id: string;
  module: string;
  rate: number;
  minRate: number;
  maxRate: number;
  orders: number;
  grossSales: string;
  earned: string;
  bg: string;
  tiers: { label: string; min: string; max: string; rate: number }[];
  lastUpdated: string;
  updatedBy: string;
};

const initialRates: ModuleRate[] = [
  {
    id: 'MOD-1',
    module: 'Marketplace',
    rate: 12,
    minRate: 5,
    maxRate: 25,
    orders: 8420,
    grossSales: '₹20.5L',
    earned: '₹2.46L',
    bg: 'bg-blue-100 text-blue-700',
    tiers: [
      { label: 'Standard Seller', min: '₹0', max: '₹5L/mo', rate: 12 },
      { label: 'Premium Seller', min: '₹5L', max: '₹50L/mo', rate: 10 },
      { label: 'Enterprise', min: '₹50L+', max: '∞', rate: 8 },
    ],
    lastUpdated: '15 May 2026',
    updatedBy: 'Super Admin',
  },
  {
    id: 'MOD-2',
    module: 'Grocery',
    rate: 15,
    minRate: 8,
    maxRate: 25,
    orders: 5100,
    grossSales: '₹12.0L',
    earned: '₹1.80L',
    bg: 'bg-green-100 text-green-700',
    tiers: [
      { label: 'Local Store', min: '₹0', max: '₹2L/mo', rate: 15 },
      { label: 'Chain Store', min: '₹2L', max: '₹20L/mo', rate: 12 },
      { label: 'Supermarket', min: '₹20L+', max: '∞', rate: 10 },
    ],
    lastUpdated: '10 May 2026',
    updatedBy: 'Super Admin',
  },
  {
    id: 'MOD-3',
    module: 'Restaurant',
    rate: 20,
    minRate: 10,
    maxRate: 30,
    orders: 3800,
    grossSales: '₹9.0L',
    earned: '₹1.80L',
    bg: 'bg-orange-100 text-orange-700',
    tiers: [
      { label: 'Single Outlet', min: '₹0', max: '₹3L/mo', rate: 20 },
      { label: 'Multi-Outlet', min: '₹3L', max: '₹15L/mo', rate: 18 },
      { label: 'Chain Brand', min: '₹15L+', max: '∞', rate: 15 },
    ],
    lastUpdated: '12 May 2026',
    updatedBy: 'Finance Manager',
  },
  {
    id: 'MOD-4',
    module: 'Pharmacy',
    rate: 15,
    minRate: 8,
    maxRate: 20,
    orders: 1200,
    grossSales: '₹4.0L',
    earned: '₹0.60L',
    bg: 'bg-cyan-100 text-cyan-700',
    tiers: [
      { label: 'Independent', min: '₹0', max: '₹2L/mo', rate: 15 },
      { label: 'Chain Pharmacy', min: '₹2L+', max: '∞', rate: 12 },
    ],
    lastUpdated: '8 May 2026',
    updatedBy: 'Super Admin',
  },
  {
    id: 'MOD-5',
    module: 'Doctor',
    rate: 15,
    minRate: 10,
    maxRate: 25,
    orders: 480,
    grossSales: '₹2.0L',
    earned: '₹0.30L',
    bg: 'bg-purple-100 text-purple-700',
    tiers: [
      { label: 'Individual Doctor', min: '₹0', max: '₹1L/mo', rate: 15 },
      { label: 'Hospital/Clinic', min: '₹1L+', max: '∞', rate: 12 },
    ],
    lastUpdated: '5 May 2026',
    updatedBy: 'Super Admin',
  },
  {
    id: 'MOD-6',
    module: 'Taxi',
    rate: 10,
    minRate: 5,
    maxRate: 20,
    orders: 3200,
    grossSales: '₹6.4L',
    earned: '₹0.64L',
    bg: 'bg-amber-100 text-amber-700',
    tiers: [
      { label: 'Individual Driver', min: '₹0', max: '₹50K/mo', rate: 10 },
      { label: 'Fleet Vendor', min: '₹50K', max: '₹5L/mo', rate: 8 },
      { label: 'Enterprise Fleet', min: '₹5L+', max: '∞', rate: 6 },
    ],
    lastUpdated: '1 May 2026',
    updatedBy: 'Finance Manager',
  },
  {
    id: 'MOD-7',
    module: 'Delivery Fee',
    rate: 100,
    minRate: 100,
    maxRate: 100,
    orders: 12500,
    grossSales: '₹5.2L',
    earned: '₹5.20L',
    bg: 'bg-violet-100 text-violet-700',
    tiers: [{ label: 'Platform Collected', min: '—', max: '—', rate: 100 }],
    lastUpdated: '1 Jan 2026',
    updatedBy: 'System',
  },
];

const moduleIcons: Record<string, React.ReactNode> = {
  Marketplace: <ShoppingCart className="w-4 h-4" />,
  Grocery: <Store className="w-4 h-4" />,
  Restaurant: <UtensilsCrossed className="w-4 h-4" />,
  Pharmacy: <Pill className="w-4 h-4" />,
  Doctor: <Stethoscope className="w-4 h-4" />,
  Taxi: <Car className="w-4 h-4" />,
  'Delivery Fee': <Truck className="w-4 h-4" />,
};

const topEarners = [
  {
    partner: 'Apple India Store',
    module: 'Marketplace',
    gross: '₹8.2Cr',
    commission: '₹98.4L',
    rate: '12%',
    customRate: false,
  },
  {
    partner: 'Biryani House',
    module: 'Restaurant',
    gross: '₹42L',
    commission: '₹8.4L',
    rate: '20%',
    customRate: false,
  },
  {
    partner: 'City Supermart',
    module: 'Grocery',
    gross: '₹42L',
    commission: '₹6.3L',
    rate: '15%',
    customRate: false,
  },
  {
    partner: 'Samsung Store',
    module: 'Marketplace',
    gross: '₹12.1Cr',
    commission: '₹96.8L',
    rate: '8%',
    customRate: true,
  },
  {
    partner: 'MedPlus Pharmacy',
    module: 'Pharmacy',
    gross: '₹18L',
    commission: '₹2.7L',
    rate: '15%',
    customRate: false,
  },
  {
    partner: 'QuickRide Fleet',
    module: 'Taxi',
    gross: '₹8.2L',
    commission: '₹0.66L',
    rate: '8%',
    customRate: true,
  },
  {
    partner: 'Dr. Anjali Mehta',
    module: 'Doctor',
    gross: '₹6.3L',
    commission: '₹0.95L',
    rate: '15%',
    customRate: false,
  },
  {
    partner: 'Burger King India',
    module: 'Restaurant',
    gross: '₹31L',
    commission: '₹4.65L',
    rate: '15%',
    customRate: true,
  },
];

const modC: Record<string, string> = {
  Marketplace: 'bg-blue-100 text-blue-700',
  Grocery: 'bg-green-100 text-green-700',
  Restaurant: 'bg-orange-100 text-orange-700',
  Pharmacy: 'bg-cyan-100 text-cyan-700',
  Doctor: 'bg-purple-100 text-purple-700',
  Taxi: 'bg-amber-100 text-amber-700',
};

export default function CommissionsPage() {
  const { regionLabel, isFiltered, regionCode } = useMarketplaceRegionFilter([]);
  const country = isFiltered ? regionCode : undefined;
  const [rates, setRates] = useState(initialRates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const adminId =
    typeof window !== 'undefined' ? localStorage.getItem('adminUserId') || 'admin' : 'admin';

  // Fetch commission data from backend on mount
  useEffect(() => {
    (async () => {
      const res = await adminCoreApi.getCommissions({ country });
      if (res.success && Array.isArray((res.data as any)?.data)) {
        const apiRates = (res.data as any).data;
        if (apiRates.length > 0) setRates(apiRates);
      }
    })();
  }, [country]);

  const startEdit = (id: string, currentRate: number) => {
    setEditingId(id);
    setEditValue(currentRate);
  };

  const saveEdit = async (id: string) => {
    // Optimistic update
    setRates((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, rate: editValue, lastUpdated: 'Just now', updatedBy: 'Super Admin' }
          : r,
      ),
    );
    setEditingId(null);
    setSavedMsg(`${rates.find((r) => r.id === id)?.module} rate updated to ${editValue}%`);
    setTimeout(() => setSavedMsg(''), 3000);

    // Persist to backend
    await adminCoreApi.updateCommission(id, editValue, adminId);
    await adminCoreApi.addAuditLog({
      action: 'commission.updated',
      adminId,
      entityType: 'commission',
      entityId: id,
      details: { rate: editValue },
    });
  };

  const cancelEdit = () => setEditingId(null);

  const totalEarned = '₹12.80L';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commission Management</h1>
          <p className="text-slate-500 text-sm">
            Configure and monitor platform commission rates across all modules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
            Total Earned: {totalEarned} (7 Days)
          </span>
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Configure
          </button>
        </div>
      </div>

      {/* Success message */}
      {savedMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-pulse">
          <Check className="w-4 h-4" /> {savedMsg}
        </div>
      )}

      {/* Global Config Panel */}
      {configOpen && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" /> Global Commission Configuration
            </h2>
            <button
              onClick={() => setConfigOpen(false)}
              className="p-1.5 hover:bg-slate-100 rounded-lg"
              title="Close configuration panel"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 font-medium mb-2">Settlement Cycle</p>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                title="Settlement Cycle"
              >
                <option>Weekly (Every Monday)</option>
                <option>Bi-Weekly</option>
                <option>Daily</option>
              </select>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 font-medium mb-2">Minimum Payout Threshold</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={500}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                  title="Minimum payout threshold"
                  placeholder="500"
                />
                <span className="text-xs text-slate-500 font-bold whitespace-nowrap">INR</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 font-medium mb-2">Tax Deduction (TDS)</p>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                title="Tax Deduction (TDS)"
              >
                <option>1% TDS (Section 194-O)</option>
                <option>2% TDS</option>
                <option>No TDS</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 font-medium mb-2">Auto-Approve Payouts Below</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={50000}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                  title="Auto-approve payout limit"
                  placeholder="50000"
                />
                <span className="text-xs text-slate-500 font-bold whitespace-nowrap">INR</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 font-medium mb-2">
                Refund Deduction from Commission
              </p>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                title="Refund deduction policy"
              >
                <option>Yes — Deduct from next payout</option>
                <option>No — Platform absorbs</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => {
              setConfigOpen(false);
              setSavedMsg('Global configuration saved successfully');
              setTimeout(() => setSavedMsg(''), 3000);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl shadow-md text-white">
          <DollarSign className="w-5 h-5 opacity-80" />
          <p className="text-3xl font-black mt-3">{totalEarned}</p>
          <p className="text-sm font-medium opacity-80 mt-1">Commission (7d)</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Percent className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">14.3%</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Avg Rate</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-3 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            8.4%
          </p>
          <p className="text-sm text-slate-500 font-medium mt-1">Growth vs Last Week</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">3</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Custom Rate Overrides</p>
        </div>
      </div>

      {/* Module Commission Rates */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Module Commission Rates</h2>
          <p className="text-xs text-slate-400">
            Click edit to change • Expand rows for tier details
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Module</th>
                <th className="px-5 py-3.5 font-semibold text-center">Base Rate</th>
                <th className="px-5 py-3.5 font-semibold text-right">Gross Sales (7d)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Orders (7d)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Earned (7d)</th>
                <th className="px-5 py-3.5 font-semibold text-center">Last Updated</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.map((c) => (
                <React.Fragment key={c.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <span
                        className={`${c.bg} px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5`}
                      >
                        {moduleIcons[c.module]} {c.module}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {editingId === c.id ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            min={c.minRate}
                            max={c.maxRate}
                            step={1}
                            title={`Commission rate for ${c.module}`}
                            className="w-16 px-2 py-1.5 rounded-lg border-2 border-emerald-500 text-sm font-black text-center focus:outline-none"
                            autoFocus
                          />
                          <span className="text-xs font-bold text-slate-500">%</span>
                          <button
                            onClick={() => saveEdit(c.id)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-700 rounded text-white"
                            title="Save rate"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-600"
                            title="Cancel edit"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-black">
                          {c.rate}%
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-700">
                      {c.grossSales}
                    </td>
                    <td className="px-5 py-4 text-right font-bold">{c.orders.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right font-black text-emerald-600">{c.earned}</td>
                    <td className="px-5 py-4 text-center">
                      <p className="text-xs text-slate-500">{c.lastUpdated}</p>
                      <p className="text-[10px] text-slate-400">by {c.updatedBy}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {editingId !== c.id && c.module !== 'Delivery Fee' && (
                          <button
                            onClick={() => startEdit(c.id, c.rate)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg group"
                            title="Edit Rate"
                          >
                            <Edit className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg"
                          title="View Tiers"
                        >
                          {expanded === c.id ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === c.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={7} className="px-5 py-5">
                        <div className="mb-3">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            Commission Tiers — {c.module}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {c.tiers.map((t, idx) => (
                              <div
                                key={idx}
                                className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-700">
                                    {t.label}
                                  </span>
                                  <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-xs font-black">
                                    {t.rate}%
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                  Sales Volume: {t.min} — {t.max}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 pt-3 border-t border-slate-200">
                          <span>
                            Rate Range:{' '}
                            <strong className="text-slate-600">
                              {c.minRate}% – {c.maxRate}%
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Updated: <strong className="text-slate-600">{c.lastUpdated}</strong> by{' '}
                            {c.updatedBy}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Commission Earners */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Top Commission-Generating Partners</h2>
          <span className="text-xs text-slate-400">
            {topEarners.filter((t) => t.customRate).length} partners have custom rates
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">#</th>
                <th className="px-5 py-3.5 font-semibold">Partner</th>
                <th className="px-5 py-3.5 font-semibold">Module</th>
                <th className="px-5 py-3.5 font-semibold text-right">Gross Sales</th>
                <th className="px-5 py-3.5 font-semibold text-center">Rate</th>
                <th className="px-5 py-3.5 font-semibold text-right">Commission Earned</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topEarners.map((t, i) => (
                <tr key={t.partner} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'}`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{t.partner}</p>
                    {t.customRate && (
                      <span className="bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        CUSTOM RATE
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`${modC[t.module] || 'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-md text-xs font-bold`}
                    >
                      {t.module}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{t.gross}</td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${t.customRate ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {t.rate}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-emerald-600">
                    {t.commission}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-slate-100 rounded-lg" title="Edit Rate">
                        <Edit className="w-4 h-4 text-slate-400" />
                      </button>
                      <button className="p-1.5 hover:bg-slate-100 rounded-lg" title="View Partner">
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
