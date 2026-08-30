'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useEffect } from 'react';
import {
  BarChart3, FileCheck, Package, Pill, AlertTriangle, TrendingUp, Clock,
  Star, ShoppingBag, Truck, Users, Heart, Boxes, ArrowRight,
  Activity, Stethoscope, Shield,
} from 'lucide-react';
import Link from 'next/link';
import RevenueChart from '@/components/seller/pharmacy/revenue-chart';
import { vendorPharmacyApi } from '@/lib/api/vendor-pharmacy';

const DAILY_REVENUE = [
  { label: 'Mon', value: 14200 }, { label: 'Tue', value: 11800 },
  { label: 'Wed', value: 18400 }, { label: 'Thu', value: 15600 },
  { label: 'Fri', value: 22100 }, { label: 'Sat', value: 28400 },
  { label: 'Sun', value: 19200 },
];

const RX_QUEUE = [
  { id: 'RX-88219', customer: 'John Doe', items: 'Augmentin 625 Duo, Dolo 650', time: '10m ago', fileType: 'PDF', schedule: 'H1' },
  { id: 'RX-88218', customer: 'Sarah Smith', items: 'Thyronorm 50mcg (120 tabs)', time: '25m ago', fileType: 'JPG', schedule: 'H' },
  { id: 'RX-88217', customer: 'Peter K.', items: 'Metformin 500mg, Glimepiride 2mg', time: '42m ago', fileType: 'PDF', schedule: 'H' },
];

const EXPIRING = [
  { name: 'Benadryl Cough Syrup', batch: 'BCS-2024-A1', expiry: '28 days', qty: 5, urgency: 'critical' },
  { name: 'Crocin Advance 500mg', batch: 'CA-2024-B3', expiry: '45 days', qty: 12, urgency: 'warning' },
  { name: 'Vicks VapoRub 50ml', batch: 'VVR-2024-C1', expiry: '60 days', qty: 8, urgency: 'info' },
];

const LOW_STOCK = [
  { name: 'Amoxicillin 250mg', brand: 'Amoxil', stock: 2, threshold: 10 },
  { name: 'Paracetamol 500mg', brand: 'Dolo', stock: 4, threshold: 20 },
  { name: 'Metformin 500mg', brand: 'Glycomet', stock: 0, threshold: 15 },
];

export default function PharmacyDashboardPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pharmacy Dashboard</h1>
          <p className="text-sm text-slate-500">Manage prescriptions, inventory, and active medical orders.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/seller/pharmacy/prescriptions"
            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded-xl text-sm flex items-center gap-2 transition-colors">
            <FileCheck className="w-4 h-4" /> 4 Pending Rx
          </Link>
          <Link href="/seller/pharmacy/products/add"
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-sm flex items-center gap-2 transition-colors">
            <Pill className="w-4 h-4" /> Add Medicine
          </Link>
        </div>
      </div>

      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-linear-to-br from-teal-600 to-emerald-500 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 opacity-80" />
              <span className="text-sm font-bold opacity-80">Pharmacy Rating</span>
            </div>
            <p className="text-4xl font-black">4.8 <span className="text-lg opacity-60">/ 5.0</span></p>
            <p className="text-sm opacity-70 mt-2">Based on 1,248 customer reviews</p>
          </div>
        </div>
        <div className="bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 opacity-80" />
              <span className="text-sm font-bold opacity-80">Compliance Score</span>
            </div>
            <p className="text-4xl font-black">92%</p>
            <p className="text-sm opacity-70 mt-2">All licenses verified • FSSAI renewal in 30 days</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Today's Revenue", value: '₹28.4K', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active Orders', value: '18', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Rx', value: '4', icon: FileCheck, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Verified Rx', value: '23', icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Low Stock', value: '12', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Expiring', value: '3', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Out of Stock', value: '2', icon: Boxes, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Reviews', value: '4.8★', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi) => (
          <div key={kpi.label} className={`${kpi.bg} rounded-2xl p-3 border border-slate-100 shadow-sm`}>
            <kpi.icon className={`w-4 h-4 ${kpi.color} mb-1.5`} />
            <p className={`text-lg font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart + Order Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-900">Weekly Revenue</h2>
            <span className="text-xs text-slate-500">This Week</span>
          </div>
          <RevenueChart data={DAILY_REVENUE} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-black text-slate-900 mb-4">Order Channels</h2>
          <div className="space-y-3">
            {[
              { label: 'Delivery', pct: 55, value: '₹15.6K', icon: Truck, color: 'bg-teal-500' },
              { label: 'Pickup', pct: 30, value: '₹8.5K', icon: ShoppingBag, color: 'bg-purple-500' },
              { label: 'Walk-in', pct: 15, value: '₹4.3K', icon: Users, color: 'bg-amber-500' },
            ].map((ch) => (
              <div key={ch.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ch.icon className="w-3.5 h-3.5 text-slate-400" /> {ch.label}
                  </span>
                  <span className="text-xs font-black text-slate-900">{ch.value}</span>
                </div>
                <div className="bg-slate-100 rounded-full h-2">
                  <ProgressBar percent={ch.pct} className={`${ch.color} rounded-full h-2 transition-all`} />
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">{ch.pct}% of orders</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prescription Queue + Expiring Medicines + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rx Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-black text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-red-500" /> Prescription Queue
            </h2>
            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">{RX_QUEUE.length} Urgent</span>
          </div>
          <div className="divide-y divide-slate-100">
            {RX_QUEUE.map((rx) => (
              <div key={rx.id} className="p-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-sm">{rx.id}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Sch-{rx.schedule}</span>
                    <span className="text-[10px] text-slate-400">{rx.time}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600">{rx.customer}</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Pill className="w-3 h-3" /> {rx.items}
                </p>
              </div>
            ))}
          </div>
          <Link href="/seller/pharmacy/prescriptions" className="block p-3 text-center text-xs font-bold text-teal-600 hover:bg-teal-50 border-t border-slate-100">
            View All Prescriptions <ArrowRight className="w-3 h-3 inline" />
          </Link>
        </div>

        {/* Expiring Medicines */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" /> Expiring Soon
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {EXPIRING.map((med) => (
              <div key={med.batch} className="p-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-slate-900 text-sm">{med.name}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    med.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                    med.urgency === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>{med.expiry}</span>
                </div>
                <p className="text-[10px] text-slate-400">Batch: {med.batch} • {med.qty} units</p>
              </div>
            ))}
          </div>
          <Link href="/seller/pharmacy/inventory" className="block p-3 text-center text-xs font-bold text-teal-600 hover:bg-teal-50 border-t border-slate-100">
            View Full Inventory <ArrowRight className="w-3 h-3 inline" />
          </Link>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {LOW_STOCK.map((med) => (
              <div key={med.name} className={`p-3 hover:bg-slate-50/50 transition-colors ${med.stock === 0 ? 'bg-red-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-slate-900 text-sm">{med.name}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    med.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{med.stock === 0 ? 'Out of Stock' : `${med.stock} left`}</span>
                </div>
                <p className="text-[10px] text-slate-400">{med.brand} • Threshold: {med.threshold}</p>
              </div>
            ))}
          </div>
          <Link href="/seller/pharmacy/products" className="block p-3 text-center text-xs font-bold text-teal-600 hover:bg-teal-50 border-t border-slate-100">
            Manage Stock <ArrowRight className="w-3 h-3 inline" />
          </Link>
        </div>
      </div>

      {/* Top Sellers & Beauty */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Top Selling Products
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { name: 'Dolo 650', cat: 'Medicine', orders: 89, revenue: '₹2,492', color: 'bg-blue-100 text-blue-700' },
              { name: 'CeraVe Moisturizer', cat: 'Beauty', orders: 62, revenue: '₹18,600', color: 'bg-pink-100 text-pink-700' },
              { name: 'Ensure Nutrition', cat: 'Wellness', orders: 48, revenue: '₹14,400', color: 'bg-emerald-100 text-emerald-700' },
              { name: 'Augmentin 625', cat: 'Medicine', orders: 42, revenue: '₹9,156', color: 'bg-blue-100 text-blue-700' },
              { name: 'Omron BP Monitor', cat: 'Device', orders: 18, revenue: '₹32,400', color: 'bg-purple-100 text-purple-700' },
            ].map((p, i) => (
              <div key={p.name} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/50">
                <span className="text-sm font-black text-slate-300 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`${p.color} text-[8px] font-black px-1.5 py-0.5 rounded`}>{p.cat}</span>
                    <span className="text-[10px] text-slate-400">{p.orders} orders</span>
                  </div>
                </div>
                <span className="font-black text-sm text-emerald-600">{p.revenue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Beauty & Personal Care */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-black text-slate-900 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" /> Top Beauty & Personal Care
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { name: 'CeraVe Moisturizing Cream', cat: 'Skin Care', orders: 62, revenue: '₹18,600' },
              { name: 'The Ordinary Niacinamide', cat: 'Facial Care', orders: 45, revenue: '₹8,550' },
              { name: "L'Oréal Shampoo 400ml", cat: 'Hair Care', orders: 38, revenue: '₹11,400' },
              { name: 'Neutrogena Sunscreen SPF50', cat: 'Skin Care', orders: 34, revenue: '₹10,200' },
              { name: 'Himalaya Face Wash', cat: 'Personal Care', orders: 29, revenue: '₹2,900' },
            ].map((p, i) => (
              <div key={p.name} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/50">
                <span className="text-sm font-black text-pink-300 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
                  <span className="text-[9px] text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded font-bold">{p.cat}</span>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-emerald-600">{p.revenue}</p>
                  <p className="text-[9px] text-slate-400">{p.orders} sold</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/seller/pharmacy/products" className="block p-3 text-center text-xs font-bold text-pink-600 hover:bg-pink-50 border-t border-slate-100">
            View All Beauty Products <ArrowRight className="w-3 h-3 inline" />
          </Link>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" /> Pending Approvals
          </h2>
          <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">3 Awaiting</span>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { name: 'Garnier Vitamin C Serum', cat: 'Beauty', submitted: '2 hrs ago', reason: 'New beauty product listing' },
            { name: 'Accu-Chek Active Strips', cat: 'Device', submitted: '5 hrs ago', reason: 'Medical device — requires verification' },
            { name: 'MuscleBlaze Protein', cat: 'Fitness', submitted: '1 day ago', reason: 'New fitness category product' },
          ].map((item) => (
            <div key={item.name} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50">
              <div>
                <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                <p className="text-[10px] text-slate-400">{item.reason}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{item.cat}</span>
                <span className="text-[10px] text-slate-400">{item.submitted}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Review Prescriptions', href: '/seller/pharmacy/prescriptions', icon: FileCheck, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
          { label: 'Update Inventory', href: '/seller/pharmacy/inventory', icon: Boxes, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Add Medicine', href: '/seller/pharmacy/products/add', icon: Pill, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
          { label: 'View Reports', href: '/seller/pharmacy/reports', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
        ].map((action) => (
          <Link key={action.label} href={action.href}
            className={`${action.bg} border ${action.border} rounded-2xl p-4 hover:shadow-md transition-all flex items-center gap-3 group`}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <action.icon className={`w-5 h-5 ${action.color}`} />
            </div>
            <span className={`text-sm font-bold ${action.color}`}>{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
