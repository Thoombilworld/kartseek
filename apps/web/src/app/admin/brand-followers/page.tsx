'use client';

import React, { useState, useMemo } from 'react';
import {
  Users, TrendingUp, BarChart3, Store, UserPlus, UserMinus,
  Eye, ShoppingCart, Search, Star, Award, ShieldCheck,
  ArrowUpRight, ArrowDownRight, ChevronRight, Bell, Filter,
} from 'lucide-react';

// ── Demo Data ────────────────────────────────────────────────────────────────
interface BrandFollowStats {
  brandId: string;
  brandName: string;
  isVerified: boolean;
  totalFollowers: number;
  newThisWeek: number;
  lostThisWeek: number;
  growthRate: number;
  engagementRate: number;
  avgOrderValue: number;
  topCategory: string;
}

const BRAND_STATS: BrandFollowStats[] = [
  { brandId: 'apple', brandName: 'Apple', isVerified: true, totalFollowers: 45200, newThisWeek: 1240, lostThisWeek: 86, growthRate: 12.4, engagementRate: 38.2, avgOrderValue: 78400, topCategory: 'Electronics' },
  { brandId: 'samsung', brandName: 'Samsung', isVerified: true, totalFollowers: 32800, newThisWeek: 890, lostThisWeek: 120, growthRate: 8.7, engagementRate: 31.5, avgOrderValue: 45600, topCategory: 'Electronics' },
  { brandId: 'nike', brandName: 'Nike', isVerified: true, totalFollowers: 28900, newThisWeek: 1560, lostThisWeek: 95, growthRate: 15.2, engagementRate: 42.1, avgOrderValue: 8900, topCategory: 'Fashion' },
  { brandId: 'sony', brandName: 'Sony', isVerified: true, totalFollowers: 18400, newThisWeek: 420, lostThisWeek: 65, growthRate: 6.3, engagementRate: 27.8, avgOrderValue: 34200, topCategory: 'Electronics' },
  { brandId: 'adidas', brandName: 'Adidas', isVerified: true, totalFollowers: 22100, newThisWeek: 780, lostThisWeek: 110, growthRate: 9.1, engagementRate: 35.4, avgOrderValue: 6800, topCategory: 'Fashion' },
  { brandId: 'lg', brandName: 'LG', isVerified: true, totalFollowers: 12600, newThisWeek: 340, lostThisWeek: 42, growthRate: 5.8, engagementRate: 22.3, avgOrderValue: 42100, topCategory: 'Appliances' },
  { brandId: 'boAt', brandName: 'boAt', isVerified: true, totalFollowers: 34500, newThisWeek: 2100, lostThisWeek: 180, growthRate: 18.6, engagementRate: 45.7, avgOrderValue: 2400, topCategory: 'Audio' },
  { brandId: 'oneplus', brandName: 'OnePlus', isVerified: true, totalFollowers: 15800, newThisWeek: 620, lostThisWeek: 78, growthRate: 11.2, engagementRate: 33.9, avgOrderValue: 32500, topCategory: 'Electronics' },
];

const PLATFORM_METRICS = {
  totalBrandsWithFollowers: 847,
  totalFollowEvents: 286400,
  avgFollowersPerBrand: 338,
  platformFollowGrowth: 12.8,
  totalUpdatesThisMonth: 2340,
  updateEngagementRate: 28.4,
};

function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : n.toString(); }
function fmtCurrency(n: number) { return '₹' + n.toLocaleString('en-IN'); }

export default function AdminBrandFollowersPage() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'followers' | 'growth' | 'engagement'>('followers');

  const sortedBrands = useMemo(() => {
    let filtered = BRAND_STATS.filter(b =>
      b.brandName.toLowerCase().includes(search.toLowerCase())
    );
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'growth': return b.growthRate - a.growthRate;
        case 'engagement': return b.engagementRate - a.engagementRate;
        default: return b.totalFollowers - a.totalFollowers;
      }
    });
    return filtered;
  }, [search, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            Brand Followers Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Platform-wide brand follow metrics and engagement
          </p>
        </div>
      </div>

      {/* Platform-wide KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Brands with Followers', value: PLATFORM_METRICS.totalBrandsWithFollowers.toLocaleString(), icon: Store, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Follow Events', value: fmt(PLATFORM_METRICS.totalFollowEvents), icon: UserPlus, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Avg per Brand', value: PLATFORM_METRICS.avgFollowersPerBrand.toString(), icon: Users, color: 'bg-violet-50 text-violet-600' },
          { label: 'Platform Growth', value: PLATFORM_METRICS.platformFollowGrowth + '%', icon: TrendingUp, color: 'bg-cyan-50 text-cyan-600' },
          { label: 'Updates This Month', value: PLATFORM_METRICS.totalUpdatesThisMonth.toLocaleString(), icon: Bell, color: 'bg-amber-50 text-amber-600' },
          { label: 'Update Engagement', value: PLATFORM_METRICS.updateEngagementRate + '%', icon: Eye, color: 'bg-pink-50 text-pink-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${kpi.color} mb-2`}>
              <kpi.icon className="w-3.5 h-3.5" />
            </div>
            <div className="text-lg font-black text-slate-800">{kpi.value}</div>
            <div className="text-[10px] text-slate-500">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Brand Followers Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" /> Brand Performance Rankings
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search brands..."
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-48 focus:outline-none focus:border-blue-400"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="border border-slate-200 rounded-lg text-sm px-3 py-2 text-slate-600 focus:outline-none focus:border-blue-400"
            >
              <option value="followers">Sort: Followers</option>
              <option value="growth">Sort: Growth</option>
              <option value="engagement">Sort: Engagement</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs">#</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs">Brand</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs">Followers</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs">New (7d)</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs">Lost (7d)</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs">Growth</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs">Engagement</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs">Avg Order</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedBrands.map((brand, i) => (
                <tr key={brand.brandId} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-medium">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                        {brand.brandName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{brand.brandName}</span>
                          {brand.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
                        </div>
                        <span className="text-[10px] text-slate-400">ID: {brand.brandId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(brand.totalFollowers)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-emerald-600 font-semibold flex items-center gap-0.5 justify-end">
                      <ArrowUpRight className="w-3 h-3" /> +{fmt(brand.newThisWeek)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-red-500 font-semibold flex items-center gap-0.5 justify-end">
                      <ArrowDownRight className="w-3 h-3" /> -{brand.lostThisWeek}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${brand.growthRate >= 10 ? 'text-emerald-600' : 'text-blue-600'}`}>
                      +{brand.growthRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${brand.engagementRate}%` }} />
                      </div>
                      <span className="text-slate-600 font-medium text-xs">{brand.engagementRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 font-medium">{fmtCurrency(brand.avgOrderValue)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{brand.topCategory}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedBrands.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <p className="text-sm">No brands found matching &ldquo;{search}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  );
}
