'use client';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';
import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Eye,
  Pause,
  Play,
  Trash2,
  Star,
  Smartphone,
  Laptop,
  Clock,
  TrendingUp,
  Package,
  Truck,
} from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';

const EXCHANGE_OFFERS = [
  {
    id: 'EX-2001',
    title: 'Exchange your old phone — get up to ₹15,000 off',
    description: 'Trade in your old smartphone and get instant discount on a new one',
    exchangeCategory: 'Smartphones',
    targetCategory: 'Smartphones',
    maxExchangeValue: 15000,
    minExchangeValue: 1000,
    bonusAmount: 2000,
    eligibilityCriteria: {
      conditions: ['Screen must be intact', 'Device must power on', 'No water damage'],
      brands: ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Vivo'],
    },
    applicableBrandIds: ['Apple', 'Samsung', 'OnePlus', 'Google'],
    applicableCountries: ['India'],
    fulfillmentMode: 'PICKUP',
    startsAt: '01 Jun 2026',
    expiresAt: '31 Jul 2026',
    priority: 1,
    status: 'Active',
    isFeatured: true,
    totalExchanges: 4820,
    country: 'India',
  },
  {
    id: 'EX-2002',
    title: 'Laptop Exchange — up to ₹25,000 off on new laptops',
    description: 'Exchange your old laptop and upgrade to the latest models',
    exchangeCategory: 'Laptops',
    targetCategory: 'Laptops',
    maxExchangeValue: 25000,
    minExchangeValue: 3000,
    bonusAmount: 3000,
    eligibilityCriteria: {
      conditions: ['Must power on', 'Screen intact', 'Keyboard functional'],
      brands: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus'],
    },
    applicableBrandIds: ['Apple', 'Dell', 'HP', 'Lenovo'],
    applicableCountries: ['India'],
    fulfillmentMode: 'PICKUP',
    startsAt: '15 Jun 2026',
    expiresAt: '15 Aug 2026',
    priority: 2,
    status: 'Active',
    isFeatured: true,
    totalExchanges: 1240,
    country: 'India',
  },
  {
    id: 'EX-2003',
    title: 'TV Exchange — get ₹10,000 off on Smart TVs',
    description: 'Exchange your old TV regardless of brand or condition',
    exchangeCategory: 'Televisions',
    targetCategory: 'Smart TVs',
    maxExchangeValue: 10000,
    minExchangeValue: 2000,
    bonusAmount: 1500,
    eligibilityCriteria: {
      conditions: ['Any working condition accepted', 'Minimum 24 inch screen'],
      brands: ['Any'],
    },
    applicableBrandIds: ['Samsung', 'LG', 'Sony', 'TCL'],
    applicableCountries: ['India'],
    fulfillmentMode: 'PICKUP',
    startsAt: '01 Jul 2026',
    expiresAt: '31 Aug 2026',
    priority: 3,
    status: 'Draft',
    isFeatured: false,
    totalExchanges: 0,
    country: 'India',
  },
  {
    id: 'EX-2004',
    title: 'Old Washing Machine Exchange — ₹5,000 off',
    description: 'Upgrade to a new washing machine with exchange discount',
    exchangeCategory: 'Washing Machines',
    targetCategory: 'Washing Machines',
    maxExchangeValue: 5000,
    minExchangeValue: 500,
    bonusAmount: 500,
    eligibilityCriteria: {
      conditions: ['Must be complete unit', 'Any condition accepted'],
      brands: ['Any'],
    },
    applicableBrandIds: ['LG', 'Samsung', 'Bosch', 'IFB'],
    applicableCountries: ['India'],
    fulfillmentMode: 'PICKUP',
    startsAt: '01 Apr 2026',
    expiresAt: '31 May 2026',
    priority: 4,
    status: 'Expired',
    isFeatured: false,
    totalExchanges: 2100,
    country: 'India',
  },
  {
    id: 'EX-2005',
    title: 'Tablet Exchange — up to ₹8,000 off on iPads',
    description: 'Trade in your old tablet for a new iPad',
    exchangeCategory: 'Tablets',
    targetCategory: 'Tablets',
    maxExchangeValue: 8000,
    minExchangeValue: 1000,
    bonusAmount: 1000,
    eligibilityCriteria: {
      conditions: ['Screen must be intact', 'Device must power on'],
      brands: ['Apple', 'Samsung', 'Lenovo'],
    },
    applicableBrandIds: ['Apple'],
    applicableCountries: ['India', 'UAE'],
    fulfillmentMode: 'DROP_OFF',
    startsAt: '10 Jun 2026',
    expiresAt: '10 Aug 2026',
    priority: 5,
    status: 'Active',
    isFeatured: false,
    totalExchanges: 680,
    country: 'India',
  },
];

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Paused: 'bg-amber-100 text-amber-700',
  Draft: 'bg-slate-100 text-slate-600',
  Expired: 'bg-red-100 text-red-600',
  Archived: 'bg-gray-100 text-gray-500',
};

const FULFILLMENT_STYLES: Record<string, { label: string; color: string }> = {
  PICKUP: { label: 'Home Pickup', color: 'bg-emerald-100 text-emerald-700' },
  DROP_OFF: { label: 'Drop Off', color: 'bg-blue-100 text-blue-700' },
  COURIER: { label: 'Courier', color: 'bg-purple-100 text-purple-700' },
};

export default function ExchangeOffersPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
    showToast,
  } = useAdminData(() => adminMarketplaceApi.getExchangeOffers(country), [country]);
  const { execute } = useAdminAction(showToast);

  const {
    filtered: regionFiltered,
    regionLabel,
    isFiltered: isRegionFiltered,
  } = useMarketplaceRegionFilter(EXCHANGE_OFFERS);
  const filtered = regionFiltered.filter(
    (o) => statusFilter === 'All' || o.status === statusFilter,
  );

  const totalExchanges = regionFiltered.reduce((sum, o) => sum + o.totalExchanges, 0);
  const activeOffers = regionFiltered.filter((o) => o.status === 'Active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-teal-600" />
            Exchange & Trade-in Offers
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRegionFiltered ? `${regionLabel} — ` : ''}Manage product exchange programs. Customers
            trade in old products for discount on new purchases.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Exchange Offer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Active Offers',
            count: activeOffers,
            color: 'bg-emerald-100 text-emerald-600',
            Icon: Play,
          },
          {
            label: 'Total Exchanges',
            count: totalExchanges.toLocaleString('en-IN'),
            color: 'bg-teal-100 text-teal-600',
            Icon: TrendingUp,
          },
          {
            label: 'Categories',
            count: new Set(regionFiltered.map((o) => o.targetCategory)).size,
            color: 'bg-purple-100 text-purple-600',
            Icon: Package,
          },
          {
            label: 'Expired / Archived',
            count: regionFiltered.filter((o) => o.status === 'Expired' || o.status === 'Archived')
              .length,
            color: 'bg-slate-100 text-slate-500',
            Icon: Clock,
          },
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
        {['All', 'Active', 'Paused', 'Draft', 'Expired', 'Archived'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${statusFilter === s ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Offers Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-5 py-3.5 text-left font-semibold">Offer</th>
                <th className="px-5 py-3.5 text-left font-semibold">Exchange → Target</th>
                <th className="px-5 py-3.5 text-center font-semibold">Max Value</th>
                <th className="px-5 py-3.5 text-center font-semibold">Bonus</th>
                <th className="px-5 py-3.5 text-center font-semibold">Fulfillment</th>
                <th className="px-5 py-3.5 text-left font-semibold">Eligible Brands</th>
                <th className="px-5 py-3.5 text-left font-semibold">Validity</th>
                <th className="px-5 py-3.5 text-center font-semibold">Exchanges</th>
                <th className="px-5 py-3.5 text-center font-semibold">Status</th>
                <th className="px-5 py-3.5 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => {
                const fulfillment = FULFILLMENT_STYLES[o.fulfillmentMode] || {
                  label: o.fulfillmentMode,
                  color: 'bg-slate-100 text-slate-600',
                };
                return (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 max-w-[260px]">
                      <div className="flex items-start gap-2">
                        {o.isFeatured && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">{o.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{o.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-lg">
                          {o.exchangeCategory}
                        </span>
                        <ArrowLeftRight className="w-3 h-3 text-slate-400" />
                        <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg">
                          {o.targetCategory}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-lg font-black text-emerald-700">
                        ₹{o.maxExchangeValue.toLocaleString('en-IN')}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        min ₹{o.minExchangeValue.toLocaleString('en-IN')}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {o.bonusAmount > 0 ? (
                        <span className="text-sm font-black text-blue-700">
                          +₹{o.bonusAmount.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-lg ${fulfillment.color}`}
                      >
                        {fulfillment.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 flex-wrap max-w-[140px]">
                        {o.applicableBrandIds.slice(0, 3).map((b) => (
                          <span
                            key={b}
                            className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold"
                          >
                            {b}
                          </span>
                        ))}
                        {o.applicableBrandIds.length > 3 && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                            +{o.applicableBrandIds.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <p>{o.startsAt}</p>
                      <p>to {o.expiresAt}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <p className="text-lg font-black text-slate-800">
                        {o.totalExchanges.toLocaleString('en-IN')}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[o.status]}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {o.status === 'Active' && (
                          <button
                            className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"
                            title="Pause"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {o.status === 'Paused' && (
                          <button
                            className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                            title="Resume"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {o.status === 'Draft' && (
                          <button
                            className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                            title="Activate"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                          title="View / Edit"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                          title={o.isFeatured ? 'Unfeature' : 'Feature'}
                        >
                          <Star className={`w-4 h-4 ${o.isFeatured ? 'fill-amber-500' : ''}`} />
                        </button>
                        {(o.status === 'Draft' || o.status === 'Expired') && (
                          <button
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                            title="Delete"
                          >
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
            <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-bold">No exchange offers found</p>
            <p className="text-xs mt-1">Try changing the filter or create a new exchange offer.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-teal-600" /> New Exchange Offer
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  className="text-xs font-bold text-slate-600 mb-1 block"
                  htmlFor="offer-title"
                >
                  Offer Title *
                </label>
                <input
                  id="offer-title"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., Exchange your old phone — get up to ₹15,000 off"
                />
              </div>
              <div>
                <label
                  className="text-xs font-bold text-slate-600 mb-1 block"
                  htmlFor="description"
                >
                  Description *
                </label>
                <textarea
                  id="description"
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Short description for product pages..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs font-bold text-slate-600 mb-1 block"
                    htmlFor="exchange-category"
                  >
                    Exchange Category *
                  </label>
                  <input
                    id="exchange-category"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Smartphones"
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-bold text-slate-600 mb-1 block"
                    htmlFor="target-category"
                  >
                    Target Category *
                  </label>
                  <input
                    id="target-category"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Smartphones"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    className="text-xs font-bold text-slate-600 mb-1 block"
                    htmlFor="max-value"
                  >
                    Max Value *
                  </label>
                  <input
                    id="max-value"
                    type="number"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="15000"
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-bold text-slate-600 mb-1 block"
                    htmlFor="min-value"
                  >
                    Min Value
                  </label>
                  <input
                    id="min-value"
                    type="number"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="bonus">
                    Bonus ₹
                  </label>
                  <input
                    id="bonus"
                    type="number"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="2000"
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-xs font-bold text-slate-600 mb-1 block"
                  htmlFor="fulfillment-mode"
                >
                  Fulfillment Mode
                </label>
                <select
                  id="fulfillment-mode"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="PICKUP">Home Pickup</option>
                  <option value="DROP_OFF">Drop Off</option>
                  <option value="COURIER">Courier</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs font-bold text-slate-600 mb-1 block"
                    htmlFor="start-date"
                  >
                    Start Date *
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    aria-label="date"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="end-date">
                    End Date *
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    aria-label="date"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                Create Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
