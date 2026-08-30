'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminCoreApi } from '@/lib/api/admin-core';
import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, Eye, Clock, CheckCircle, XCircle, Truck, ArrowUpRight, RefreshCcw, DollarSign, ShoppingCart, UtensilsCrossed, Pill, Stethoscope, Car, Hotel } from 'lucide-react';

type Order = {
  id: string; customer: string; module: string; vendor: string; items: number;
  total: string; status: string; payment: string; time: string; city: string;
};

const orders: Order[] = [
  { id: 'KS-78432', customer: 'Rahul K.', module: 'Grocery', vendor: 'City Supermart', items: 8, total: '₹1,487', status: 'delivered', payment: 'UPI', time: '12 min ago', city: 'Mumbai' },
  { id: 'KS-78431', customer: 'Priya S.', module: 'Restaurant', vendor: 'Burger King', items: 3, total: '₹650', status: 'in-transit', payment: 'Card', time: '18 min ago', city: 'Mumbai' },
  { id: 'KS-78430', customer: 'Anil M.', module: 'Pharmacy', vendor: 'MedPlus', items: 2, total: '₹245', status: 'preparing', payment: 'COD', time: '25 min ago', city: 'Bangalore' },
  { id: 'KS-78429', customer: 'Sneha R.', module: 'Marketplace', vendor: 'Nike Store', items: 1, total: '₹12,495', status: 'shipped', payment: 'Card', time: '1 hr ago', city: 'Delhi' },
  { id: 'KS-78428', customer: 'Vikram T.', module: 'Taxi', vendor: 'QuickRide', items: 1, total: '₹380', status: 'completed', payment: 'UPI', time: '2 hr ago', city: 'Pune' },
  { id: 'KS-78427', customer: 'Deepa N.', module: 'Doctor', vendor: 'Dr. Anjali Mehta', items: 1, total: '₹800', status: 'confirmed', payment: 'UPI', time: '3 hr ago', city: 'Chennai' },
  { id: 'KS-78426', customer: 'Rajesh K.', module: 'Grocery', vendor: 'Fresh Farm', items: 12, total: '₹2,340', status: 'cancelled', payment: 'Wallet', time: '3 hr ago', city: 'Mumbai' },
  { id: 'KS-78425', customer: 'Meera P.', module: 'Restaurant', vendor: 'Pizza Palace', items: 4, total: '₹890', status: 'delivered', payment: 'UPI', time: '4 hr ago', city: 'Hyderabad' },
  { id: 'KS-78424', customer: 'Sunil D.', module: 'Marketplace', vendor: 'Samsung Store', items: 1, total: '₹79,999', status: 'processing', payment: 'EMI', time: '5 hr ago', city: 'Delhi' },
  { id: 'KS-78423', customer: 'Mohan K.', module: 'Pharmacy', vendor: 'Apollo Pharmacy', items: 5, total: '₹1,650', status: 'delivered', payment: 'Card', time: '5 hr ago', city: 'Chennai' },
  { id: 'KS-78422', customer: 'Ahmed A.', module: 'Hotel', vendor: 'Marriott Downtown', items: 1, total: 'AED 2,400', status: 'confirmed', payment: 'Card', time: '6 hr ago', city: 'Dubai' },
];

const statusConfig: Record<string, { bg: string; icon: React.ReactNode }> = {
  delivered: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  completed: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  confirmed: { bg: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  'in-transit': { bg: 'bg-indigo-100 text-indigo-700', icon: <Truck className="w-3.5 h-3.5" /> },
  shipped: { bg: 'bg-indigo-100 text-indigo-700', icon: <Truck className="w-3.5 h-3.5" /> },
  preparing: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  processing: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  cancelled: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const moduleIcons: Record<string, React.ReactNode> = {
  Marketplace: <ShoppingCart className="w-3.5 h-3.5" />,
  Grocery: <ShoppingCart className="w-3.5 h-3.5" />,
  Restaurant: <UtensilsCrossed className="w-3.5 h-3.5" />,
  Pharmacy: <Pill className="w-3.5 h-3.5" />,
  Doctor: <Stethoscope className="w-3.5 h-3.5" />,
  Taxi: <Car className="w-3.5 h-3.5" />,
  Hotel: <Hotel className="w-3.5 h-3.5" />,
};

const moduleColors: Record<string, string> = {
  Marketplace: 'bg-blue-100 text-blue-700',
  Grocery: 'bg-green-100 text-green-700',
  Restaurant: 'bg-orange-100 text-orange-700',
  Pharmacy: 'bg-cyan-100 text-cyan-700',
  Doctor: 'bg-purple-100 text-purple-700',
  Taxi: 'bg-yellow-100 text-yellow-700',
  Hotel: 'bg-indigo-100 text-indigo-700',
};

export default function OrdersPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [data, setData] = useState(orders);

  // Fetch orders from backend on mount
  useEffect(() => {
    (async () => {
      const res = await adminCoreApi.getOrders();
      if (res.success && Array.isArray((res.data as any)?.data)) {
        const apiOrders = (res.data as any).data;
        if (apiOrders.length > 0) setData(apiOrders);
      }
    })();
  }, []);

  const filtered = data.filter(o => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase()) || o.vendor.toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === 'All' || o.module === moduleFilter;
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchSearch && matchModule && matchStatus;
  });

  const todayTotal = orders.reduce((a, o) => a + parseInt(o.total.replace(/[₹,]/g, '')), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Orders — All Modules</h1><p className="text-slate-500 text-sm">Centralized order management across Marketplace, Grocery, Restaurant, Pharmacy, Doctor & Taxi.</p></div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live</span>
          <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"><RefreshCcw className="w-3 h-3" /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {['Marketplace', 'Grocery', 'Restaurant', 'Pharmacy', 'Doctor', 'Taxi', 'Hotel'].map(m => {
          const count = orders.filter(o => o.module === m).length;
          return (
            <button key={m} onClick={() => setModuleFilter(moduleFilter === m ? 'All' : m)}
              className={`p-3 rounded-xl border text-center transition-all ${moduleFilter === m ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1 ${moduleColors[m]}`}>{moduleIcons[m]}</div>
              <p className="text-xs font-bold text-slate-900">{m}</p>
              <p className="text-[10px] text-slate-500">{count} orders</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by order ID, customer, or vendor..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} title="Filter by status"
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="All">All Status</option><option value="delivered">Delivered</option><option value="in-transit">In Transit</option><option value="preparing">Preparing</option><option value="shipped">Shipped</option><option value="processing">Processing</option><option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Order</th>
                <th className="px-5 py-3.5 font-semibold">Module</th>
                <th className="px-5 py-3.5 font-semibold">Vendor</th>
                <th className="px-5 py-3.5 font-semibold">City</th>
                <th className="px-5 py-3.5 font-semibold text-center">Items</th>
                <th className="px-5 py-3.5 font-semibold text-right">Total</th>
                <th className="px-5 py-3.5 font-semibold text-center">Payment</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4"><p className="font-bold text-slate-900">{o.id}</p><p className="text-xs text-slate-400">{o.customer} • {o.time}</p></td>
                  <td className="px-5 py-4"><span className={`${moduleColors[o.module]} px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1`}>{moduleIcons[o.module]} {o.module}</span></td>
                  <td className="px-5 py-4 text-slate-700 text-xs">{o.vendor}</td>
                  <td className="px-5 py-4 text-slate-600 text-xs">{o.city}</td>
                  <td className="px-5 py-4 text-center font-medium">{o.items}</td>
                  <td className="px-5 py-4 text-right font-bold text-slate-900">{o.total}</td>
                  <td className="px-5 py-4 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{o.payment}</span></td>
                  <td className="px-5 py-4 text-center"><span className={`${statusConfig[o.status]?.bg} px-2.5 py-1 rounded-full text-xs font-bold capitalize inline-flex items-center gap-1`}>{statusConfig[o.status]?.icon} {o.status.replace('-', ' ')}</span></td>
                  <td className="px-5 py-4 text-center"><button title="View order details" className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-between text-sm text-slate-500">
          <span>Showing {filtered.length} of {orders.length} orders</span>
          <span>Total Value: <strong className="text-slate-900">₹{todayTotal.toLocaleString()}</strong></span>
        </div>
      </div>
    </div>
  );
}
