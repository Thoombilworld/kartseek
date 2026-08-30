'use client';

import React, { useState } from 'react';
import {
  Globe, Save, Search, ChevronDown, ChevronRight, Eye, Upload,
  Code, FileText, Tag, Image as ImageIcon, ExternalLink, Check,
} from 'lucide-react';
import { useMarketplace, type MarketplaceSEOPage } from '@/lib/contexts/marketplace-context';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

const SCHEMA_TYPES = ['WebSite', 'CollectionPage', 'ItemList', 'OfferCatalog', 'SearchResultsPage', 'Product', 'Organization'];

export default function SEOSettingsPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);

  const { seoPages, updateSEOPage } = useMarketplace();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [saved, setSaved] = useState<string | null>(null);

  // Globals
  const [robotsTxt, setRobotsTxt] = useState('Allow All');
  const [sitemap, setSitemap] = useState('Auto-generate');
  const [canonical, setCanonical] = useState('https://kartseek.com{path}');
  const [structuredData, setStructuredData] = useState('Product + Organization (JSON-LD)');

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getSeoSettings(),
    []
  );
  const { execute } = useAdminAction(showToast);

  const filtered = seoPages.filter(s => {
    if (search && !s.page.toLowerCase().includes(search.toLowerCase()) && !s.slug.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType === 'category' && !s.id.startsWith('seo-cat-')) return false;
    if (filterType === 'page' && s.id.startsWith('seo-cat-')) return false;
    return true;
  });

  const handleSave = (id: string) => {
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  };

  const categoryPages = seoPages.filter(s => s.id.startsWith('seo-cat-'));
  const systemPages = seoPages.filter(s => !s.id.startsWith('seo-cat-'));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Marketplace SEO Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure search engine optimization for all marketplace pages. Covers {seoPages.length} pages including {categoryPages.length} category pages.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-blue-600">{seoPages.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total Pages</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-emerald-600">{categoryPages.length}</p>
          <p className="text-xs text-slate-500 mt-1">Category Pages</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-purple-600">{systemPages.length}</p>
          <p className="text-xs text-slate-500 mt-1">System Pages</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-black text-amber-600">{seoPages.filter(s => s.keywords).length}</p>
          <p className="text-xs text-slate-500 mt-1">With Keywords</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pages..."
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="flex gap-1.5 bg-white border border-slate-200 rounded-xl p-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'page', label: 'System Pages' },
            { key: 'category', label: 'Categories' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterType === f.key ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Individual Pages */}
      <div className="space-y-3">
        {filtered.map(page => {
          const isExpanded = expandedId === page.id;
          const titleLen = page.metaTitle.length;
          const descLen = page.metaDescription.length;
          const titleOk = titleLen >= 30 && titleLen <= 65;
          const descOk = descLen >= 100 && descLen <= 165;

          return (
            <div key={page.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${isExpanded ? 'border-blue-200' : 'border-slate-200'}`}>
              <button onClick={() => setExpandedId(isExpanded ? null : page.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors text-left">
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{page.page}</h3>
                      {page.schemaType && <span className="text-[8px] bg-purple-50 text-purple-600 font-bold px-1.5 py-0.5 rounded">{page.schemaType}</span>}
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">{page.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${titleOk ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    Title: {titleLen}c
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${descOk ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    Desc: {descLen}c
                  </span>
                  {saved === page.id && <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 p-5 space-y-4">
                  {/* Google Preview */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 flex items-center gap-1"><Eye className="w-3 h-3" /> Google Search Preview</p>
                    <div className="max-w-xl">
                      <p className="text-blue-700 text-base font-medium truncate hover:underline cursor-pointer">{page.metaTitle || 'Page Title'}</p>
                      <p className="text-green-700 text-xs font-mono truncate">https://kartseek.com{page.slug}</p>
                      <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">{page.metaDescription || 'Page description...'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Meta Title <span className={`${titleOk ? 'text-emerald-500' : 'text-amber-500'}`}>({titleLen}/60)</span></label>
                    <input value={page.metaTitle} onChange={e => updateSEOPage(page.id, { metaTitle: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" aria-label="Meta title" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Meta Description <span className={`${descOk ? 'text-emerald-500' : 'text-amber-500'}`}>({descLen}/160)</span></label>
                    <textarea rows={2} value={page.metaDescription} onChange={e => updateSEOPage(page.id, { metaDescription: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500" aria-label="Meta description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="keywords">Keywords</label>
                      <input id="keywords" value={page.keywords || ''} onChange={e => updateSEOPage(page.id, { keywords: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none" placeholder="keyword1, keyword2, keyword3" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="schema-type">Schema Type</label>
                      <select id="schema-type" value={page.schemaType || ''} onChange={e => updateSEOPage(page.id, { schemaType: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none" aria-label="Schema type">
                        <option value="">None</option>
                        {SCHEMA_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">OG Image</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex items-center gap-3 hover:border-blue-300 transition-colors cursor-pointer">
                      <div className="w-16 h-10 bg-slate-100 rounded flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-400" /></div>
                      <div><p className="text-xs text-slate-500 font-medium">Upload OG Image</p><p className="text-[10px] text-slate-400">1200×630px recommended</p></div>
                    </div>
                  </div>

                  {/* JSON-LD Preview */}
                  {page.schemaType && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Code className="w-3 h-3" /> Structured Data Preview</p>
                      <pre className="bg-slate-900 text-green-400 text-[10px] p-4 rounded-xl overflow-x-auto font-mono">
{`{
  "@context": "https://schema.org",
  "@type": "${page.schemaType}",
  "name": "${page.metaTitle}",
  "description": "${page.metaDescription}",
  "url": "https://kartseek.com${page.slug}"
}`}
                      </pre>
                    </div>
                  )}

                  <button onClick={() => handleSave(page.id)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">
                    <Save className="w-3.5 h-3.5" /> Save SEO Settings
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global SEO Settings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-600" /> Global SEO Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="robots-txt">Robots.txt</label>
            <select id="robots-txt" value={robotsTxt} onChange={e => setRobotsTxt(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none" aria-label="Robots.txt">
              <option>Allow All</option><option>Disallow Seller Pages</option><option>Custom</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="sitemap">Sitemap</label>
            <select id="sitemap" value={sitemap} onChange={e => setSitemap(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none" aria-label="Sitemap">
              <option>Auto-generate</option><option>Manual</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="canonical-url-pattern">Canonical URL Pattern</label>
            <input id="canonical-url-pattern" value={canonical} onChange={e => setCanonical(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono outline-none" aria-label="Canonical URL pattern" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block" htmlFor="structured-data">Structured Data</label>
            <select id="structured-data" value={structuredData} onChange={e => setStructuredData(e.target.value)} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none" aria-label="Structured Data">
              <option>Product + Organization (JSON-LD)</option><option>Product only</option><option>Disabled</option>
            </select>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 mt-4 transition-colors">
          <Save className="w-4 h-4" /> Save Global Settings
        </button>
      </div>
      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}
      <AdminToast toast={toast} />
    </div>
  );
}
