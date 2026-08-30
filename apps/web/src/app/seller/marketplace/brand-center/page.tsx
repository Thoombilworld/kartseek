'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import {
  Award, ArrowRight, ShieldCheck, Store, BarChart3, TrendingUp,
  CheckCircle, Clock, AlertTriangle, FileText, Zap, Eye,
  ChevronRight, Package, Star, Search,
} from 'lucide-react';

interface BrandData {
  brandName: string;
  logo?: string;
  status: string;
  trademark?: string;
  productCount?: number;
  protectedSince?: string;
}

export default function BrandCenterPage() {
  const { seller } = useSeller();
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seller?.sellerId) return;
    sellerApi.getBrand(seller.sellerId)
      .then((res: any) => {
        if (res?.data?.brandName) {
          setBrand(res.data);
        } else {
          setBrand({
            brandName: seller.sellerName || 'My Brand',
            status: 'PENDING',
            productCount: 0,
          });
        }
      })
      .catch(() => {
        setBrand({
          brandName: seller.sellerName || 'My Brand',
          status: 'PENDING',
          productCount: 0,
        });
      })
      .finally(() => setLoading(false));
  }, [seller?.sellerId, seller?.sellerName]);

  const brandScore = brand?.status === 'REGISTERED' ? 92 : brand?.status === 'PENDING' ? 45 : 20;

  const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
    REGISTERED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle, label: 'Registered & Protected' },
    PENDING: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock, label: 'Pending Review' },
    REJECTED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: AlertTriangle, label: 'Action Required' },
  };

  const statusInfo = STATUS_CONFIG[brand?.status || 'PENDING'] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusInfo.icon;

  const MODULES = [
    {
      title: 'Brand Registry',
      subtitle: 'Register and protect your brand identity on the marketplace',
      href: '/seller/marketplace/brand-center/registry',
      icon: ShieldCheck,
      gradient: 'from-blue-500 to-indigo-600',
      stats: [
        { label: 'Status', value: brand?.status === 'REGISTERED' ? 'Active' : 'Pending' },
        { label: 'Products', value: brand?.productCount?.toString() || '0' },
        { label: 'Violations', value: '0' },
      ],
    },
    {
      title: 'Brand Store',
      subtitle: 'Customize your storefront theme, banners, and brand experience',
      href: '/seller/marketplace/brand-center/store',
      icon: Store,
      gradient: 'from-violet-500 to-purple-600',
      stats: [
        { label: 'Theme', value: 'Default' },
        { label: 'Sections', value: '4' },
        { label: 'Published', value: 'Yes' },
      ],
    },
    {
      title: 'Brand Analytics',
      subtitle: 'Track brand search volume, conversions, and market share',
      href: '/seller/marketplace/brand-center/analytics',
      icon: BarChart3,
      gradient: 'from-cyan-500 to-blue-600',
      stats: [
        { label: 'Store Views', value: '3.4K' },
        { label: 'Conversion', value: '4.2%' },
        { label: 'Trend', value: '+12%' },
      ],
    },
    {
      title: 'Brand Followers',
      subtitle: 'View followers, engagement metrics, and send brand updates',
      href: '/seller/marketplace/brand-center/followers',
      icon: TrendingUp,
      gradient: 'from-pink-500 to-rose-600',
      stats: [
        { label: 'Followers', value: '12.4K' },
        { label: 'Growth', value: '+8.4%' },
        { label: 'Engagement', value: '34%' },
      ],
    },
  ];

  const QUICK_ACTIONS = [
    { label: 'Register New Brand', icon: FileText, href: '/seller/marketplace/brand-center/registry' },
    { label: 'Update Store Theme', icon: Eye, href: '/seller/marketplace/brand-center/store' },
    { label: 'View Search Insights', icon: Search, href: '/seller/marketplace/brand-center/analytics' },
    { label: 'A+ Content Editor', icon: Zap, href: '/seller/marketplace/a-plus' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            Brand Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your brand identity, storefront, and analytics</p>
        </div>
      </div>

      {/* Brand Health Summary */}
      {!loading && brand && (
        <div className={`border rounded-xl p-5 ${statusInfo.bg}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl font-bold text-blue-600 border border-slate-100">
                {brand.logo ? (
                  <span>{brand.logo}</span>
                ) : (
                  brand.brandName.substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{brand.brandName}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                  <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
                {brand.trademark && (
                  <p className="text-xs text-slate-500 mt-1">Trademark: {brand.trademark}</p>
                )}
              </div>
            </div>

            {/* Brand Score */}
            <div className="text-right">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Brand Score</div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-white/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      brandScore >= 80 ? 'bg-emerald-500' : brandScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${brandScore}%` }}
                  />
                </div>
                <span className={`text-lg font-black ${
                  brandScore >= 80 ? 'text-emerald-700' : brandScore >= 50 ? 'text-amber-700' : 'text-red-700'
                }`}>{brandScore}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading brand data...</span>
          </div>
        </div>
      )}

      {/* Module Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {MODULES.map((mod, i) => (
          <Link href={mod.href} key={i} className="group block">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-300 h-full flex flex-col">
              {/* Gradient Header */}
              <div className={`bg-gradient-to-r ${mod.gradient} p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <mod.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{mod.title}</h3>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <p className="text-sm text-slate-500 leading-relaxed">{mod.subtitle}</p>

                {/* Mini Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                  {mod.stats.map((s, j) => (
                    <div key={j}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action, i) => (
            <Link href={action.href} key={i} className="group">
              <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-3 cursor-pointer">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <action.icon className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Brand Benefits */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          Brand Registry Benefits
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: ShieldCheck, text: 'Counterfeit protection & takedown tools' },
            { icon: Store, text: 'Branded storefront with custom design' },
            { icon: Zap, text: 'A+ enhanced product content' },
            { icon: BarChart3, text: 'Brand-level analytics & insights' },
            { icon: TrendingUp, text: 'Sponsored brand advertising' },
            { icon: Package, text: 'Brand packaging & unboxing experience' },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
              <b.icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
