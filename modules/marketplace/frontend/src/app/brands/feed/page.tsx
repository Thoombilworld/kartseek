'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Sparkles, Tag, Package, Megaphone, ArrowRight, Filter, Clock, ArrowLeft } from 'lucide-react';
import { unwrapCatalogList } from '@/lib/api/map-catalog-product';
import { apiFetch } from '@/lib/api-fetch';

interface BrandUpdate {
  id: string;
  type: string;
  title: string;
  message: string;
  imageUrl?: string;
  actionUrl?: string;
  createdAt: string;
  brand: { id: string; name: string; slug: string; logoUrl?: string; isVerified: boolean };
}

const UPDATE_TYPE_CONFIG: Record<string, { icon: typeof Sparkles; color: string; bg: string; label: string }> = {
  LAUNCH:       { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Launch' },
  OFFER:        { icon: Tag,      color: 'text-amber-600',  bg: 'bg-amber-100',  label: 'Offer' },
  NEW_PRODUCT:  { icon: Package,  color: 'text-emerald-600',bg: 'bg-emerald-100', label: 'New Product' },
  ANNOUNCEMENT: { icon: Megaphone,color: 'text-blue-600',   bg: 'bg-blue-100',   label: 'Announcement' },
};

const FILTER_OPTIONS = [
  { key: 'ALL', label: 'All Updates' },
  { key: 'LAUNCH', label: 'Launches' },
  { key: 'OFFER', label: 'Offers' },
  { key: 'NEW_PRODUCT', label: 'New Products' },
  { key: 'ANNOUNCEMENT', label: 'Announcements' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function BrandFeedPage() {
  const [updates, setUpdates] = useState<BrandUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    async function fetchFeed() {
      try {
        // The feed is the caller's own — the gateway derives the user from the
        // JWT, so the `userId=demo-user` param was both ignored and misleading.
        const params = new URLSearchParams({ page: '1', limit: '30' });
        if (activeFilter !== 'ALL') params.set('type', activeFilter);
        const res = await apiFetch(`/marketplace/brands/feed?${params}`);
        // Rows are at `data.data.data`; the old `data?.data?.length` read the
        // page object's length, so the guard never passed and a signed-in
        // customer's real feed was replaced by demo posts every time.
        setUpdates(unwrapCatalogList(await res.json()) as BrandUpdate[]);
      } catch {
        setUpdates([]);
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    fetchFeed();
  }, [activeFilter]);

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(139,92,246,0.2),transparent_60%)]" />
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-14 relative z-10">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Brand Updates</h1>
              <p className="text-purple-200 text-sm">Latest from brands you follow</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar mb-2">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setActiveFilter(opt.key)}
              className={`
                whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border
                ${activeFilter === opt.key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-sm">Loading updates...</p>
          </div>
        ) : updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">No updates yet</h3>
            <p className="text-slate-400 text-sm mb-4">Follow brands to see their latest updates here</p>
            <Link href="/marketplace" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
              Explore Brands
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map(update => {
              const config = UPDATE_TYPE_CONFIG[update.type] || UPDATE_TYPE_CONFIG.ANNOUNCEMENT;
              const Icon = config.icon;
              return (
                <div key={update.id} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:border-slate-200 transition-all duration-300 group">
                  {/* Brand Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/marketplace/brand/${update.brand.slug || update.brand.id}`} className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center text-blue-700 font-black text-lg shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      {update.brand.name[0]}
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/marketplace/brand/${update.brand.slug || update.brand.id}`} className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors">
                          {update.brand.name}
                        </Link>
                        {update.brand.isVerified && (
                          <svg className="w-3.5 h-3.5 text-blue-500 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo(update.createdAt)}</span>
                        <span>•</span>
                        <span className={`${config.color} font-semibold`}>{config.label}</span>
                      </div>
                    </div>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.bg} ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="font-bold text-slate-900 mb-1.5 text-base leading-snug group-hover:text-blue-700 transition-colors">{update.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-3">{update.message}</p>

                  {/* Action */}
                  {update.actionUrl && (
                    <Link href={update.actionUrl} className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                      View Details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
