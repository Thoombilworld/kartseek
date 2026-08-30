'use client';

import React, { useState } from 'react';
import { PackageOpen, Clock, CheckCircle, XCircle, Search, TrendingUp, Truck, Eye, ArrowUpRight } from 'lucide-react';

type OrderEntry = {
  id: string;
  customer: string;
  vendor: string;
  module: string;
  items: number;
  amount: string;
  status: 'delivered' | 'in-transit' | 'preparing' | 'cancelled' | 'pending';
  time: string;
  paymentMethod: string;
  deliveryPartner: string;
};

const orders: OrderEntry[] = [
  { id: 'KS-78432', customer: 'Rahul Khanna', vendor: 'City Supermart', module: 'Grocery', items: 8, amount: '₹487', status: 'delivered', time: '12 min ago', paymentMethod: 'UPI', deliveryPartner: 'Suresh K.' },
  { id: 'KS-78431', customer: 'Priya Sharma', vendor: 'Burger King', module: 'Restaurant', items: 3, amount: '₹650', status: 'in-transit', time: '18 min ago', paymentMethod: 'Card', deliveryPartner: 'Mohammed A.' },
  { id: 'KS-78430', customer: 'Anil Mehta', vendor: 'MedPlus', module: 'Pharmacy', items: 2, amount: '₹245', status: 'preparing', time: '25 min ago', paymentMethod: 'UPI', deliveryPartner: 'Pending' },
  { id: 'KS-78429', customer: 'Sneha Rao', vendor: 'Pizza Palace', module: 'Restaurant', items: 4, amount: '₹890', status: 'delivered', time: '32 min ago', paymentMethod: 'Cash', deliveryPartner: 'Rajesh P.' },
  { id: 'KS-78428', customer: 'Vikram Taneja', vendor: 'Fresh Farm', module: 'Grocery', items: 12, amount: '₹1,120', status: 'delivered', time: '45 min ago', paymentMethod: 'Card', deliveryPartner: 'Deepak S.' },
  { id: 'KS-78427', customer: 'Neha Gupta', vendor: 'Apollo Pharmacy', module: 'Pharmacy', items: 1, amount: '₹340', status: 'in-transit', time: '52 min ago', paymentMethod: 'UPI', deliveryPartner: 'Amit D.' },
  { id: 'KS-78426', customer: 'Karan Chopra', vendor: 'Sushi Kingdom', module: 'Restaurant', items: 6, amount: '₹1,450', status: 'delivered', time: '1 hr ago', paymentMethod: 'Card', deliveryPartner: 'Vikram S.' },
  { id: 'KS-78425', customer: 'Divya Pillai', vendor: 'TechZone', module: 'Marketplace', items: 1, amount: '₹12,990', status: 'pending', time: '1 hr ago', paymentMethod: 'Card', deliveryPartner: 'Pending' },
  { id: 'KS-78424', customer: 'Arjun Nair', vendor: 'Green Valley Mart', module: 'Grocery', items: 5, amount: '₹820', status: 'cancelled', time: '2 hrs ago', paymentMethod: 'UPI', deliveryPartner: 'N/A' },
  { id: 'KS-78423', customer: 'Maya Iyer', vendor: 'FashionHub', module: 'Marketplace', items: 2, amount: '₹3,450', status: 'in-transit', time: '2 hrs ago', paymentMethod: 'Card', deliveryPartner: 'Anil V.' },
  { id: 'KS-78422', customer: 'Rohan Shah', vendor: 'Daily Needs Store', module: 'Grocery', items: 15, amount: '₹2,180', status: 'delivered', time: '3 hrs ago', paymentMethod: 'Cash', deliveryPartner: 'Prakash J.' },
  { id: 'KS-78421', customer: 'Pooja Desai', vendor: 'Wellness Forever', module: 'Pharmacy', items: 4, amount: '₹780', status: 'delivered', time: '3 hrs ago', paymentMethod: 'UPI', deliveryPartner: 'Suresh K.' },
];

const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  delivered: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Delivered' },
  'in-transit': { bg: 'bg-blue-100 text-blue-700', icon: <Truck className="w-3.5 h-3.5" />, label: 'In Transit' },
  preparing: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Preparing' },
  pending: { bg: 'bg-slate-100 text-slate-600', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
  cancelled: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Cancelled' },
};

const moduleColors: Record<string, string> = {
  Grocery: 'bg-green-100 text-green-700 border-green-200',
  Restaurant: 'bg-orange-100 text-orange-700 border-orange-200',
  Pharmacy: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Marketplace: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function FranchiseOrdersPage() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = orders.filter(o => {
    const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase()) || o.vendor.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === 'All' || o.module === moduleFilter;
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchSearch && matchModule && matchStatus;
  });

  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const activeCount = orders.filter(o => o.status === 'in-transit' || o.status === 'preparing').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Global Orders Overview</h1>
        <p className="text-slate-500">Monitor all multi-module orders across your franchise region in real-time.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Active Orders', value: String(activeCount), icon: Clock, trend: '+15%', color: 'bg-blue-50 text-blue-600' },
          { title: 'Delivered Today', value: String(deliveredCount), icon: CheckCircle, trend: '+4%', color: 'bg-emerald-50 text-emerald-600' },
          { title: 'Cancelled', value: String(cancelledCount), icon: XCircle, trend: String(cancelledCount), color: 'bg-red-50 text-red-600' },
          { title: 'Total GMV', value: '₹24,402', icon: TrendingUp, trend: '+14.5%', color: 'bg-teal-50 text-teal-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-bold ${i === 2 ? 'text-red-500' : 'text-green-600'}`}>{stat.trend}</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by customer, vendor, or order ID..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white" />
        </div>
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Modules</option>
          <option value="Grocery">Grocery</option>
          <option value="Restaurant">Restaurant</option>
          <option value="Pharmacy">Pharmacy</option>
          <option value="Marketplace">Marketplace</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Status</option>
          <option value="delivered">Delivered</option>
          <option value="in-transit">In Transit</option>
          <option value="preparing">Preparing</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Cross-Module Order Feed</h2>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} orders</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Order ID</th>
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Vendor</th>
                <th className="px-5 py-3.5 font-semibold text-center">Module</th>
                <th className="px-5 py-3.5 font-semibold text-center">Items</th>
                <th className="px-5 py-3.5 font-semibold text-right">Amount</th>
                <th className="px-5 py-3.5 font-semibold text-center">Payment</th>
                <th className="px-5 py-3.5 font-semibold">Delivery</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-bold text-slate-900 flex items-center gap-1 cursor-pointer hover:text-teal-600">
                      {o.id} <Eye className="w-3 h-3 text-slate-400" />
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">{o.customer}</td>
                  <td className="px-5 py-4 font-medium text-slate-700">{o.vendor}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`${moduleColors[o.module]} border px-2.5 py-1 rounded-md text-[10px] font-bold`}>{o.module}</span>
                  </td>
                  <td className="px-5 py-4 text-center text-slate-600">{o.items}</td>
                  <td className="px-5 py-4 text-right font-bold text-slate-900">{o.amount}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{o.paymentMethod}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-xs">
                    <span className={o.deliveryPartner === 'Pending' || o.deliveryPartner === 'N/A' ? 'text-slate-400 italic' : 'font-medium'}>
                      {o.deliveryPartner}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`${statusConfig[o.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                      {statusConfig[o.status].icon} {statusConfig[o.status].label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">{o.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
          <span>Showing {filtered.length} of {orders.length} orders</span>
          <div className="flex items-center gap-4">
            <span>Total Value:</span>
            <span className="font-black text-teal-600 text-lg">₹24,402</span>
          </div>
        </div>
      </div>
    </div>
  );
}
