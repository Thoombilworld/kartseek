'use client';
import React, { useState } from 'react';
import {
  ArrowLeft, Building2, Star, Users, Car, DollarSign, MapPin, Phone,
  Mail, FileText, CheckCircle, Clock, XCircle, Ban, Eye, AlertTriangle,
  TrendingUp, Calendar, Shield, Globe, Edit3, Truck,
} from 'lucide-react';
import Link from 'next/link';

// ─── Mock Data ──────────────────────────────────────────────────────────────

const vendor = {
  id: 'VND-001', name: 'QuickRide Fleet', countryCode: 'IN', city: 'Bangalore',
  ownerName: 'Suresh Rajan', email: 'suresh@quickride.in', phone: '+91 98765 43210',
  status: 'active' as const, driverCount: 120, vehicleCount: 45, totalTrips: 12400,
  revenue: '₹8.2L', rating: 4.6, complaints: 8, maxDrivers: 200,
  commissionRate: 5, businessLicenseNo: 'BLR-2025-FL-4567',
  approvedBy: 'Admin: Kartseek SA', approvedAt: '2025-03-20',
  createdAt: '2025-03-15', address: 'No. 42, MG Road, Bangalore 560001, Karnataka, India',
  bankDetails: { bankName: 'HDFC Bank', accountNumber: '****4567', accountHolder: 'QuickRide Fleet Pvt Ltd' },
};

const drivers = [
  { id: 'DRV-101', name: 'Ravi Kumar', status: 'active', vehicle: 'Swift Dzire (KA01-1234)', vehicleType: 'comfort', rating: 4.8, trips: 1240, earnings: '₹42K', onboarding: 100 },
  { id: 'DRV-102', name: 'Amit Singh', status: 'active', vehicle: 'Innova (KA01-5678)', vehicleType: 'suv', rating: 4.5, trips: 890, earnings: '₹28K', onboarding: 100 },
  { id: 'DRV-106', name: 'Priya Devi', status: 'active', vehicle: 'Honda City (KA01-9012)', vehicleType: 'premium', rating: 4.9, trips: 2100, earnings: '₹68K', onboarding: 100 },
  { id: 'DRV-107', name: 'Karthik M.', status: 'onboarding', vehicle: 'WagonR (KA02-3456)', vehicleType: 'economy', rating: 0, trips: 0, earnings: '₹0', onboarding: 60 },
  { id: 'DRV-108', name: 'Deepa L.', status: 'pending', vehicle: 'Pending', vehicleType: 'economy', rating: 0, trips: 0, earnings: '₹0', onboarding: 25 },
  { id: 'DRV-109', name: 'Venkat R.', status: 'suspended', vehicle: 'Etios (KA03-7890)', vehicleType: 'economy', rating: 3.1, trips: 210, earnings: '₹8K', onboarding: 100 },
];

const documents = [
  { id: 'DOC-001', type: 'business_license', name: 'Business License', status: 'approved', reviewedAt: '2025-03-18', expiresAt: '2027-03-18' },
  { id: 'DOC-002', type: 'tax_certificate', name: 'GST Certificate', status: 'approved', reviewedAt: '2025-03-18', expiresAt: '2026-12-31' },
  { id: 'DOC-003', type: 'insurance_certificate', name: 'Fleet Insurance', status: 'approved', reviewedAt: '2025-03-19', expiresAt: '2026-08-15' },
  { id: 'DOC-004', type: 'address_proof', name: 'Office Address Proof', status: 'pending', reviewedAt: null, expiresAt: null },
];

const dsCfg: Record<string, { bg: string; l: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', l: 'Active' },
  onboarding: { bg: 'bg-indigo-100 text-indigo-700', l: 'Onboarding' },
  pending: { bg: 'bg-blue-100 text-blue-700', l: 'Pending' },
  suspended: { bg: 'bg-amber-100 text-amber-700', l: 'Suspended' },
  blocked: { bg: 'bg-red-100 text-red-700', l: 'Blocked' },
  approved: { bg: 'bg-emerald-100 text-emerald-700', l: 'Approved' },
  rejected: { bg: 'bg-red-100 text-red-700', l: 'Rejected' },
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const [tab, setTab] = useState<'overview' | 'drivers' | 'documents' | 'financial'>('overview');

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: Eye },
    { key: 'drivers' as const, label: `Drivers (${drivers.length})`, icon: Users },
    { key: 'documents' as const, label: `Documents (${documents.length})`, icon: FileText },
    { key: 'financial' as const, label: 'Financial', icon: DollarSign },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <Link href="/admin/taxi/vendors" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 font-medium" id="back-to-vendors">
          <ArrowLeft className="w-4 h-4" /> Back to Vendors
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">QR</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{vendor.name}</h1>
                <span className={`${dsCfg[vendor.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{dsCfg[vendor.status].l}</span>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                <MapPin className="w-3.5 h-3.5" /> {vendor.city}, India 🇮🇳
                <span className="text-slate-300">•</span>
                <span className="font-mono text-xs">{vendor.id}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1.5" id="suspend-vendor-btn">
              <Clock className="w-3.5 h-3.5" /> Suspend
            </button>
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5" id="block-vendor-btn">
              <Ban className="w-3.5 h-3.5" /> Block
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{vendor.driverCount}</p>
          <p className="text-xs text-slate-500">Active Drivers</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Max: {vendor.maxDrivers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Car className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{vendor.vehicleCount}</p>
          <p className="text-xs text-slate-500">Vehicles</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{vendor.totalTrips.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Total Trips</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{vendor.revenue}</p>
          <p className="text-xs text-slate-500">Total Revenue</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <p className="text-2xl font-black text-slate-900 mt-2">{vendor.rating}</p>
          <p className="text-xs text-slate-500">Avg Rating</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex-1 justify-center ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`} id={`tab-${t.key}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-500" /> Vendor Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Owner</span><span className="font-bold">{vendor.ownerName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-bold">{vendor.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-bold">{vendor.phone}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-bold text-right max-w-[200px]">{vendor.address}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">License No.</span><span className="font-bold font-mono text-xs">{vendor.businessLicenseNo}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Commission Rate</span><span className="font-bold text-emerald-600">{vendor.commissionRate}%</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Registered</span><span className="font-bold">{vendor.createdAt}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Approved By</span><span className="font-bold">{vendor.approvedBy}</span></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-500" /> Bank Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Bank</span><span className="font-bold">{vendor.bankDetails.bankName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Account</span><span className="font-bold font-mono">{vendor.bankDetails.accountNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Holder</span><span className="font-bold">{vendor.bankDetails.accountHolder}</span></div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 mb-2">Driver Status Breakdown</h4>
              <div className="grid grid-cols-3 gap-2">
                {(['active', 'onboarding', 'pending', 'suspended'] as const).map(s => {
                  const count = drivers.filter(d => d.status === s).length;
                  return count > 0 ? (
                    <div key={s} className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-lg font-black text-slate-900">{count}</p>
                      <span className={`${dsCfg[s].bg} px-2 py-0.5 rounded-full text-[10px] font-bold`}>{dsCfg[s].l}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'drivers' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">Driver</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold text-center">Rating</th>
                  <th className="px-4 py-3 font-semibold text-right">Trips</th>
                  <th className="px-4 py-3 font-semibold text-right">Earnings</th>
                  <th className="px-4 py-3 font-semibold text-center">Onboarding</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <p className="font-bold text-slate-900">{d.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{d.id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{d.vehicle}</td>
                    <td className="px-4 py-3 text-center">
                      {d.rating > 0 ? <span className="inline-flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><span className="font-bold">{d.rating}</span></span> : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{d.trips.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold">{d.earnings}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[60px] mx-auto">
                        <div className={`h-1.5 rounded-full ${d.onboarding === 100 ? 'bg-emerald-500' : d.onboarding >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${d.onboarding}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{d.onboarding}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${dsCfg[d.status]?.bg || 'bg-slate-100 text-slate-500'} px-2.5 py-1 rounded-full text-[10px] font-bold`}>
                        {dsCfg[d.status]?.l || d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">Document</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold">Reviewed</th>
                  <th className="px-4 py-3 font-semibold">Expires</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-bold text-slate-900">{doc.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{doc.type}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${dsCfg[doc.status]?.bg || 'bg-slate-100 text-slate-500'} px-2.5 py-1 rounded-full text-[10px] font-bold`}>
                        {dsCfg[doc.status]?.l || doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{doc.reviewedAt || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{doc.expiresAt || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {doc.status === 'pending' && (
                        <div className="flex gap-1.5 justify-center">
                          <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold" id={`approve-doc-${doc.id}`}>Approve</button>
                          <button className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-[10px] font-bold" id={`reject-doc-${doc.id}`}>Reject</button>
                        </div>
                      )}
                      {doc.status === 'approved' && <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold" id={`view-doc-${doc.id}`}>View</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'financial' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl text-white shadow-md">
            <p className="text-xs font-medium opacity-80">Total Revenue</p>
            <p className="text-3xl font-black mt-1">{vendor.revenue}</p>
            <p className="text-xs opacity-70 mt-1">Across {vendor.totalTrips.toLocaleString()} rides</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Platform Commission (15%)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₹1.23L</p>
            <p className="text-xs text-slate-400 mt-1">Deducted from gross fares</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
            <p className="text-xs text-slate-500 font-medium">Vendor Commission ({vendor.commissionRate}%)</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">₹41K</p>
            <p className="text-xs text-slate-400 mt-1">Vendor earnings from fleet rides</p>
          </div>
        </div>
      )}
    </div>
  );
}
