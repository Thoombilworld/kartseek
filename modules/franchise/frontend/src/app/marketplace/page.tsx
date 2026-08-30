'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, TrendingUp, Users, Package, Search, CheckCircle, Clock, XCircle, Eye, Edit, Ban, Star, MapPin, Tag } from 'lucide-react';
import { franchiseMarketplaceApi, FranchiseKpis, FranchiseSeller } from '@/lib/modules/franchise-marketplace-api';
import { useFranchiseMarketplaceEvents } from '@/lib/hooks/use-franchise-socket';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const categoryColors: Record<string, string> = {
  Electronics: 'bg-blue-100 text-blue-700',
  Fashion: 'bg-pink-100 text-pink-700',
  'Home & Living': 'bg-amber-100 text-amber-700',
  Books: 'bg-indigo-100 text-indigo-700',
  Sports: 'bg-emerald-100 text-emerald-700',
  Toys: 'bg-purple-100 text-purple-700',
  Beauty: 'bg-rose-100 text-rose-700',
};

const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' },
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
  suspended: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Suspended' },
};

export default function FranchiseMarketplacePage() {
  const franchiseId = 'FRAN-123'; // Temporary hardcoded franchise ID

  // Filters state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null);

  // Data state
  const [kpis, setKpis] = useState<FranchiseKpis | null>(null);
  const [sellers, setSellers] = useState<FranchiseSeller[]>([]);
  const [totalSellers, setTotalSellers] = useState(0);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [categories, setCategories] = useState<string[]>(['All']);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [kpisRes, sellersRes] = await Promise.all([
        franchiseMarketplaceApi.getKpis(franchiseId),
        franchiseMarketplaceApi.getSellers(franchiseId, {
          search: search || undefined,
          category: categoryFilter !== 'All' ? categoryFilter : undefined,
          status: statusFilter !== 'All' ? statusFilter : undefined,
        })
      ]);
      setKpis(kpisRes);
      setSellers(sellersRes.sellers);
      setTotalSellers(sellersRes.total);

      // Extract unique categories from KPI distribution for the dropdown
      if (kpisRes.categoryDistribution) {
        setCategories(['All', ...Object.keys(kpisRes.categoryDistribution)]);
      }
    } catch (err) {
      console.error('Failed to fetch marketplace data', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [franchiseId, search, categoryFilter, statusFilter]);

  // Initial load and filter change trigger
  useEffect(() => {
    // Basic debounce for search input
    const timer = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Real-time socket updates
  useFranchiseMarketplaceEvents(franchiseId, useCallback((event) => {
    setSellers(prev => prev.map(s => 
      s.id === event.sellerId ? { ...s, status: event.status as any } : s
    ));
  }, []));

  const handleUpdateStatus = async (sellerId: string, newStatus: string) => {
    try {
      await franchiseMarketplaceApi.updateSellerStatus(franchiseId, sellerId, newStatus);
      // We rely on the WebSocket event to update the UI (or we can optimistically update here).
      // For now, optimistic update:
      setSellers(prev => prev.map(s => s.id === sellerId ? { ...s, status: newStatus as any } : s));
    } catch (err) {
      console.error('Failed to update seller status', err);
      alert('Failed to update seller status. Please try again.');
    }
  };

  if (isError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h2 className="font-bold text-lg mb-2">Failed to load marketplace data</h2>
        <p>Please check your connection or try refreshing the page.</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-medium transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Marketplace Operations</h1>
        <p className="text-slate-500">Manage e-commerce sellers and retail orders in your franchise region.</p>
      </div>

      {isLoading && !kpis ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
          </div>
          <div className="h-96 bg-slate-200 rounded-xl"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          {kpis && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { title: 'Active Sellers', value: String(kpis.activeSellers), icon: Users, trend: '+15%', color: 'bg-purple-50 text-purple-600' },
                { title: 'Total Products', value: kpis.totalProducts.toLocaleString(), icon: Package, trend: '+4%', color: 'bg-blue-50 text-blue-600' },
                { title: 'Total Orders (MTD)', value: kpis.totalOrders.toLocaleString(), icon: ShoppingCart, trend: '+22%', color: 'bg-indigo-50 text-indigo-600' },
                { title: 'Retail Revenue', value: kpis.retailRevenue, icon: TrendingUp, trend: '+14.5%', color: 'bg-emerald-50 text-emerald-600' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-green-600">{stat.trend}</span>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                </div>
              ))}
            </div>
          )}

          {/* Category Distribution */}
          {kpis && kpis.categoryDistribution && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-4">Category Distribution</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(kpis.categoryDistribution).map(([cat, count]) => (
                  <div key={cat} className={`${categoryColors[cat] || 'bg-slate-100 text-slate-700'} px-4 py-2 rounded-xl flex items-center gap-2`}>
                    <Tag className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{cat}</span>
                    <span className="text-xs font-black bg-white/50 px-1.5 py-0.5 rounded-md">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search sellers by name or location..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white" />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="All">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Seller Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-900">Marketplace Sellers</h2>
              <span className="text-xs text-slate-400 font-medium">{sellers.length} sellers</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Seller</th>
                    <th className="px-5 py-3.5 font-semibold">Category</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Rating</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Products</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Orders</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Revenue</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellers.map((s) => (
                    <React.Fragment key={s.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedSeller(expandedSeller === s.id ? null : s.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedSeller(expandedSeller === s.id ? null : s.id))}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                              <ShoppingCart className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{s.name}</p>
                              <p className="text-xs text-slate-400">{s.id} • <MapPin className="w-3 h-3 inline" /> {s.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4"><span className={`${categoryColors[s.category] || 'bg-slate-100 text-slate-700'} px-2.5 py-1 rounded-md text-xs font-bold`}>{s.category}</span></td>
                        <td className="px-5 py-4 text-center"><span className="flex items-center gap-1 justify-center"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-bold">{s.rating}</span></span></td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">{s.products.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900">{s.orders}</td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-600">{s.revenue}</td>
                        <td className="px-5 py-4 text-center">
                          {statusConfig[s.status] ? (
                            <span className={`${statusConfig[s.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                              {statusConfig[s.status].icon} {statusConfig[s.status].label}
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">{s.status}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4 text-slate-400" /></button>
                            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4 text-slate-400" /></button>
                          </div>
                        </td>
                      </tr>
                      {expandedSeller === s.id && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={8} className="px-5 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                              <div><p className="text-slate-400 text-xs font-medium mb-1">Joined</p><p className="font-bold text-slate-700">{s.joined}</p></div>
                              <div><p className="text-slate-400 text-xs font-medium mb-1">Return Rate</p><p className={`font-bold ${parseFloat(s.returns) > 5 ? 'text-red-600' : 'text-emerald-600'}`}>{s.returns}</p></div>
                              <div><p className="text-slate-400 text-xs font-medium mb-1">Commission Rate</p><p className="font-bold text-teal-600 text-lg">15%</p></div>
                              <div><p className="text-slate-400 text-xs font-medium mb-1">Location</p><p className="font-bold text-slate-700">{s.location}</p></div>
                              <div className="flex items-end gap-2">
                                {s.status === 'pending' && (
                                  <button onClick={() => handleUpdateStatus(s.id, 'active')} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                                )}
                                {s.status === 'active' && (
                                  <button onClick={() => handleUpdateStatus(s.id, 'suspended')} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-200"><Ban className="w-3.5 h-3.5" /> Suspend</button>
                                )}
                                {s.status === 'suspended' && (
                                  <button onClick={() => handleUpdateStatus(s.id, 'active')} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Reactivate</button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {sellers.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                        No sellers found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">
              Showing {sellers.length} of {totalSellers} sellers
            </div>
          </div>
        </>
      )}
    </div>
  );
}
