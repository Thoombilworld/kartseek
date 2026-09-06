'use client';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import React, { useState } from 'react';
import { Landmark, Plus, Eye, Pause, Play, Trash2, Star, CreditCard, Banknote, TrendingUp, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

const BANK_OFFERS = [
  {
    id: 'BO-1001', title: '10% Instant Discount with HDFC Credit Card', bankName: 'HDFC Bank',
    cardType: 'CREDIT', cardNetwork: 'ALL', discountType: 'PERCENTAGE', discountValue: 10,
    maxDiscount: 1500, minOrderValue: 5000, logoUrl: '', applicableCategories: ['Electronics', 'Fashion'],
    applicableCountries: ['India'], totalUsageLimit: 50000, perUserLimit: 3, usageCount: 12480,
    startsAt: '01 Jun 2026', expiresAt: '30 Jun 2026', priority: 1, status: 'Active', isFeatured: true, country: 'India',
  },
  {
    id: 'BO-1002', title: '₹500 Cashback on SBI Debit Card', bankName: 'SBI',
    cardType: 'DEBIT', cardNetwork: 'RUPAY', discountType: 'FLAT', discountValue: 500,
    maxDiscount: 500, minOrderValue: 3000, logoUrl: '', applicableCategories: ['All'],
    applicableCountries: ['India'], totalUsageLimit: 20000, perUserLimit: 1, usageCount: 8720,
    startsAt: '15 Jun 2026', expiresAt: '15 Jul 2026', priority: 2, status: 'Active', isFeatured: false, country: 'India',
  },
  {
    id: 'BO-1003', title: '15% Off with ICICI EMI on Electronics', bankName: 'ICICI Bank',
    cardType: 'EMI', cardNetwork: 'VISA', discountType: 'PERCENTAGE', discountValue: 15,
    maxDiscount: 3000, minOrderValue: 10000, logoUrl: '', applicableCategories: ['Electronics'],
    applicableCountries: ['India'], totalUsageLimit: 10000, perUserLimit: 2, usageCount: 3200,
    startsAt: '01 Jun 2026', expiresAt: '31 Jul 2026', priority: 3, status: 'Active', isFeatured: true, country: 'India',
  },
  {
    id: 'BO-1004', title: 'Flat ₹200 Off on Paytm Wallet', bankName: 'Paytm',
    cardType: 'WALLET', cardNetwork: 'ALL', discountType: 'FLAT', discountValue: 200,
    maxDiscount: 200, minOrderValue: 1000, logoUrl: '', applicableCategories: ['Grocery', 'Pharmacy'],
    applicableCountries: ['India'], totalUsageLimit: 100000, perUserLimit: 5, usageCount: 45000,
    startsAt: '01 May 2026', expiresAt: '31 May 2026', priority: 4, status: 'Expired', isFeatured: false, country: 'India',
  },
  {
    id: 'BO-1005', title: '5% Off with Barclays Credit Card', bankName: 'Barclays',
    cardType: 'CREDIT', cardNetwork: 'MASTERCARD', discountType: 'PERCENTAGE', discountValue: 5,
    maxDiscount: 750, minOrderValue: 2000, logoUrl: '', applicableCategories: ['All'],
    applicableCountries: ['UK', 'UAE'], totalUsageLimit: 30000, perUserLimit: 2, usageCount: 0,
    startsAt: '01 Jul 2026', expiresAt: '31 Jul 2026', priority: 5, status: 'Draft', isFeatured: false, country: 'India',
  },
  {
    id: 'BO-1006', title: '₹1000 Off on Axis Bank Credit Card', bankName: 'Axis Bank',
    cardType: 'CREDIT', cardNetwork: 'VISA', discountType: 'FLAT', discountValue: 1000,
    maxDiscount: 1000, minOrderValue: 8000, logoUrl: '', applicableCategories: ['Electronics', 'Home & Kitchen'],
    applicableCountries: ['India'], totalUsageLimit: 15000, perUserLimit: 1, usageCount: 7500,
    startsAt: '10 Jun 2026', expiresAt: '10 Jul 2026', priority: 6, status: 'Paused', isFeatured: false, country: 'India',
  },
];

const STATUS_STYLES: Record<string, string> = {
  'Active': 'bg-emerald-100 text-emerald-700',
  'Paused': 'bg-amber-100 text-amber-700',
  'Draft': 'bg-slate-100 text-slate-600',
  'Expired': 'bg-red-100 text-red-600',
  'Archived': 'bg-gray-100 text-gray-500',
};

const CARD_TYPE_STYLES: Record<string, string> = {
  'CREDIT': 'bg-blue-100 text-blue-700',
  'DEBIT': 'bg-purple-100 text-purple-700',
  'EMI': 'bg-indigo-100 text-indigo-700',
  'WALLET': 'bg-emerald-100 text-emerald-700',
  'UPI': 'bg-orange-100 text-orange-700',
  'ALL': 'bg-slate-100 text-slate-600',
};

const DISCOUNT_TYPE_ICON: Record<string, string> = {
  'PERCENTAGE': '%',
  'FLAT': '₹',
};

export default function BankOffersPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
      () => adminMarketplaceApi.getBankOffers(),
      []
    );
    const { execute } = useAdminAction(showToast);


  const { filtered: regionFiltered, regionLabel, isFiltered: isRegionFiltered } = useMarketplaceRegionFilter(BANK_OFFERS);
  const filtered = regionFiltered.filter(o => statusFilter === 'All' || o.status === statusFilter);

  const totalRedemptions = regionFiltered.reduce((sum, o) => sum + o.usageCount, 0);
  const activeOffers = regionFiltered.filter(o => o.status === 'Active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-blue-600" />
            Bank & Card Offers
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRegionFiltered ? `${regionLabel} — ` : ''}Manage bank partnerships, card discounts, EMI offers, and wallet cashback displayed across the customer app & website.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Bank Offer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Offers', count: activeOffers, color: 'bg-emerald-100 text-emerald-600', Icon: Play },
          { label: 'Total Redemptions', count: totalRedemptions.toLocaleString('en-IN'), color: 'bg-blue-100 text-blue-600', Icon: TrendingUp },
          { label: 'Partner Banks', count: new Set(regionFiltered.map(o => o.bankName)).size, color: 'bg-purple-100 text-purple-600', Icon: Landmark },
          { label: 'Expired / Archived', count: regionFiltered.filter(o => o.status === 'Expired' || o.status === 'Archived').length, color: 'bg-slate-100 text-slate-500', Icon: Clock },
        ].map(({ label, count, color, Icon }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900">{count}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 flex-wrap">
        {['All', 'Active', 'Paused', 'Draft', 'Expired', 'Archived'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{s}</button>
        ))}
      </div>

      {/* Offers Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-5 py-3.5 text-left font-semibold">Offer</th>
                <th className="px-5 py-3.5 text-left font-semibold">Bank</th>
                <th className="px-5 py-3.5 text-center font-semibold">Card Type</th>
                <th className="px-5 py-3.5 text-center font-semibold">Discount</th>
                <th className="px-5 py-3.5 text-center font-semibold">Min Order</th>
                <th className="px-5 py-3.5 text-center font-semibold">Max Off</th>
                <th className="px-5 py-3.5 text-left font-semibold">Validity</th>
                <th className="px-5 py-3.5 text-center font-semibold">Usage</th>
                <th className="px-5 py-3.5 text-center font-semibold">Status</th>
                <th className="px-5 py-3.5 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(o => {
                const usagePercent = o.totalUsageLimit ? Math.round((o.usageCount / o.totalUsageLimit) * 100) : 0;
                return (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 max-w-[280px]">
                      <div className="flex items-start gap-2">
                        {o.isFeatured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />}
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">{o.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{o.id}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {o.applicableCategories.map(c => (
                              <span key={c} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{c}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{o.bankName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{o.cardNetwork}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${CARD_TYPE_STYLES[o.cardType] || 'bg-slate-100 text-slate-600'}`}>{o.cardType}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-lg font-black text-emerald-700">
                        {o.discountType === 'PERCENTAGE' ? `${o.discountValue}%` : `₹${o.discountValue.toLocaleString('en-IN')}`}
                      </span>
                      <p className="text-[10px] text-slate-400">{o.discountType === 'PERCENTAGE' ? 'Percentage' : 'Flat'}</p>
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-700">₹{o.minOrderValue.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-center font-bold text-slate-700">₹{o.maxDiscount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <p>{o.startsAt}</p>
                      <p>to {o.expiresAt}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <p className="font-bold text-slate-800">{o.usageCount.toLocaleString('en-IN')}</p>
                      <div className="w-16 mx-auto mt-1 bg-slate-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${usagePercent >= 80 ? 'bg-red-500' : usagePercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{usagePercent}% used</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {o.status === 'Active' && (
                          <button className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors" title="Pause">
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {o.status === 'Paused' && (
                          <button className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors" title="Resume">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {o.status === 'Draft' && (
                          <button className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors" title="Activate">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors" title="View / Edit">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors" title={o.isFeatured ? 'Unfeature' : 'Feature'}>
                          <Star className={`w-4 h-4 ${o.isFeatured ? 'fill-amber-500' : ''}`} />
                        </button>
                        {(o.status === 'Draft' || o.status === 'Expired') && (
                          <button className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Landmark className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-bold">No bank offers found</p>
            <p className="text-xs mt-1">Try changing the filter or create a new bank offer.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-600" /> New Bank Offer
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="offer-title">Offer Title *</label>
                <input id="offer-title" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 10% Instant Discount with HDFC Credit Card" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="description">Description *</label>
                <textarea id="description" rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Short description for product pages..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="bank-name">Bank Name *</label>
                  <input id="bank-name" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="HDFC Bank" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="card-type">Card Type</label>
                  <select id="card-type" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>CREDIT</option><option>DEBIT</option><option>ALL</option><option>EMI</option><option>UPI</option><option>WALLET</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="discount-type">Discount Type</label>
                  <select id="discount-type" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>PERCENTAGE</option><option>FLAT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="value">Value *</label>
                  <input id="value" type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="10" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="max-discount">Max Discount</label>
                  <input id="max-discount" type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="min-order-value">Min Order Value</label>
                  <input id="min-order-value" type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="5000" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="card-network">Card Network</label>
                  <select id="card-network" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>ALL</option><option>VISA</option><option>MASTERCARD</option><option>RUPAY</option><option>AMEX</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="start-date">Start Date *</label>
                  <input id="start-date" type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"  aria-label="date"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="end-date">End Date *</label>
                  <input id="end-date" type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"  aria-label="date"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="total-usage-limit">Total Usage Limit</label>
                  <input id="total-usage-limit" type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="50000" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="per-user-limit">Per User Limit</label>
                  <input id="per-user-limit" type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="3" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-200 transition-colors">Cancel</button>
              <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Create Offer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
