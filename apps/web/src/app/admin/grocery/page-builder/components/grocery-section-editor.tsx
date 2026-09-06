'use client';

import React, { useState } from 'react';
import {
  X, Save, Image as ImageIcon, Trash2, Plus, ChevronDown, Palette,
  Store, Tag, LayoutGrid, Megaphone, HelpCircle, FileText, Code,
  Crown, TrendingUp, Award,
} from 'lucide-react';
import { useDismissOnEscape } from '@/lib/hooks/use-dismiss-on-escape';

// ── Store section tag options ────────────────────────────────────────────

const STORE_SECTION_TAGS = [
  { value: 'nearby', label: '📍 Nearby Stores' },
  { value: 'trending', label: '🔥 Trending Stores' },
  { value: 'fast-delivery', label: '⚡ Express Delivery' },
  { value: 'new', label: '🆕 New Arrivals' },
  { value: 'top-rated', label: '⭐ Top Rated' },
  { value: 'supermarket', label: '🏬 Supermarkets' },
  { value: 'meat-fish', label: '🥩 Meat & Fish' },
  { value: 'fruits-veggies', label: '🥬 Fruits & Vegetables' },
  { value: 'dairy-bakery', label: '🥐 Dairy & Bakery' },
  { value: 'organic', label: '🌱 Organic & Health' },
  { value: 'best-seller', label: '🏆 Best Sellers' },
  { value: 'promoted', label: '👑 Promoted / Sponsored' },
];

const STORE_CARD_VARIANTS = [
  { value: 'default', label: 'Default Card' },
  { value: 'promoted', label: 'Promoted (Gold)' },
  { value: 'compact', label: 'Compact' },
];

const GRADIENTS = [
  'from-green-600 to-emerald-700',
  'from-green-700 via-green-600 to-emerald-500',
  'from-blue-600 to-cyan-600',
  'from-indigo-600 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
  'from-red-500 to-rose-600',
  'from-teal-500 to-cyan-600',
  'from-slate-700 to-slate-900',
  'from-violet-600 to-purple-700',
];

// ── Types ────────────────────────────────────────────────────────────────

interface GrocerySectionEditorProps {
  section: any;
  onClose: () => void;
  onSave: (updated: any) => void;
}

// ── Component ────────────────────────────────────────────────────────────

export function GrocerySectionEditor({ section, onClose, onSave }: GrocerySectionEditorProps) {
  const [data, setData] = useState<any>({ ...section });

  // Always open: the parent mounts this only while a section is being edited.
  // Backdrop click was previously the only way out, which is no way out at all
  // for anyone on a keyboard.
  useDismissOnEscape(true, onClose);

  const update = (key: string, value: any) => {
    setData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(data);
  };

  // ── Section-specific icon ──────────────────────────────────────────────

  const getTypeIcon = () => {
    switch (data.type) {
      case 'hero_slider': return <ImageIcon className="w-5 h-5 text-indigo-500" />;
      case 'promoted_stores': return <Crown className="w-5 h-5 text-amber-500" />;
      case 'store_section': return <Store className="w-5 h-5 text-green-500" />;
      case 'brand_row': return <Award className="w-5 h-5 text-purple-500" />;
      case 'category_grid': return <LayoutGrid className="w-5 h-5 text-teal-500" />;
      case 'campaign_banner': return <Megaphone className="w-5 h-5 text-rose-500" />;
      case 'trending_products': return <TrendingUp className="w-5 h-5 text-orange-500" />;
      case 'faq': return <HelpCircle className="w-5 h-5 text-sky-500" />;
      case 'seo_footer': return <FileText className="w-5 h-5 text-slate-500" />;
      case 'custom_html': return <Code className="w-5 h-5 text-gray-500" />;
      default: return <Tag className="w-5 h-5 text-slate-400" />;
    }
  };

  // ── Render editor form based on section type ───────────────────────────

  const renderFields = () => {
    switch (data.type) {

      // ─── Hero Slider ───────────────────────────────────────────────────
      case 'hero_slider':
        return (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banners</h4>
            {(data.banners || []).map((banner: any, idx: number) => (
              <div key={banner.id || idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 relative group space-y-3">
                <button onClick={() => {
                  const updated = [...(data.banners || [])];
                  updated.splice(idx, 1);
                  update('banners', updated);
                }} aria-label="Remove banner" className="absolute top-3 right-3 p-1.5 bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 shadow-sm z-10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`hero-tag-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Badge Tag</label>
                    <input id={`hero-tag-${idx}`} value={banner.tag || ''} onChange={e => {
                      const updated = [...data.banners]; updated[idx] = { ...updated[idx], tag: e.target.value }; update('banners', updated);
                    }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
                  </div>
                  <div>
                    <label htmlFor={`hero-cta-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">CTA Text</label>
                    <input id={`hero-cta-${idx}`} value={banner.cta || ''} onChange={e => {
                      const updated = [...data.banners]; updated[idx] = { ...updated[idx], cta: e.target.value }; update('banners', updated);
                    }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
                  </div>
                </div>

                <div>
                  <label htmlFor={`hero-headline-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Headline</label>
                  <textarea id={`hero-headline-${idx}`} value={banner.headline || ''} onChange={e => {
                    const updated = [...data.banners]; updated[idx] = { ...updated[idx], headline: e.target.value }; update('banners', updated);
                  }} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none" />
                </div>

                <div>
                  <label htmlFor={`hero-sub-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Subheadline</label>
                  <input id={`hero-sub-${idx}`} value={banner.subheadline || ''} onChange={e => {
                    const updated = [...data.banners]; updated[idx] = { ...updated[idx], subheadline: e.target.value }; update('banners', updated);
                  }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
                </div>

                <div>
                  <label htmlFor={`hero-link-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Link</label>
                  <input id={`hero-link-${idx}`} value={banner.ctaHref || ''} onChange={e => {
                    const updated = [...data.banners]; updated[idx] = { ...updated[idx], ctaHref: e.target.value }; update('banners', updated);
                  }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1.5"><Palette className="w-3 h-3" /> Gradient</label>
                  <div className="flex flex-wrap gap-2">
                    {GRADIENTS.map(g => (
                      <button key={g} onClick={() => { const updated = [...data.banners]; updated[idx] = { ...updated[idx], gradient: g }; update('banners', updated); }} aria-label={`Select gradient ${g}`}
                        className={`w-8 h-8 rounded-full bg-linear-to-r ${g} border-2 transition-transform hover:scale-110 ${banner.gradient === g ? 'border-slate-900 shadow-md scale-110 ring-2 ring-white' : 'border-transparent'}`} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => {
              const newBanner = { id: `b-${Date.now()}`, tag: 'NEW', headline: 'New Banner', subheadline: 'Add your message', cta: 'Shop Now', ctaHref: '/grocery', gradient: 'from-green-600 to-emerald-700', image: '' };
              update('banners', [...(data.banners || []), newBanner]);
            }} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm font-semibold text-slate-500 hover:text-green-600 hover:border-green-400 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Banner Slide
            </button>
          </div>
        );

      // ─── Store Section / Promoted Stores ───────────────────────────────
      case 'store_section':
      case 'promoted_stores':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="store-section-tag" className="text-xs font-bold text-slate-500 block mb-1">Store Section</label>
              <select id="store-section-tag" value={data.sectionTag || 'nearby'} onChange={e => update('sectionTag', e.target.value)} aria-label="Store section tag"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
                {STORE_SECTION_TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="store-variant" className="text-xs font-bold text-slate-500 block mb-1">Card Style</label>
              <select id="store-variant" value={data.variant || 'default'} onChange={e => update('variant', e.target.value)} aria-label="Card variant"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
                {STORE_CARD_VARIANTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="store-emoji" className="text-xs font-bold text-slate-500 block mb-1">Emoji Icon</label>
                <input id="store-emoji" value={data.emoji || ''} onChange={e => update('emoji', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label htmlFor="store-max" className="text-xs font-bold text-slate-500 block mb-1">Max Items</label>
                <input id="store-max" type="number" value={data.maxItems || 10} onChange={e => update('maxItems', Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
            </div>
          </div>
        );

      // ─── Brand Row ─────────────────────────────────────────────────────
      case 'brand_row':
        return (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Brands are loaded automatically from the grocery brands database. Use this section to control where brand rows appear and their titles.</p>
            <div>
              <label htmlFor="brand-emoji" className="text-xs font-bold text-slate-500 block mb-1">Emoji Icon</label>
              <input id="brand-emoji" value={data.emoji || '🏷️'} onChange={e => update('emoji', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
          </div>
        );

      // ─── Category Grid ─────────────────────────────────────────────────
      case 'category_grid':
        return (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Categories are loaded from the grocery categories database. Control columns and display settings here.</p>
            <div>
              <label htmlFor="cat-columns" className="text-xs font-bold text-slate-500 block mb-1">Grid Columns (Desktop)</label>
              <select id="cat-columns" value={data.columns || 4} onChange={e => update('columns', Number(e.target.value))} aria-label="Grid columns"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
                <option value={3}>3 Columns</option>
                <option value={4}>4 Columns</option>
                <option value={5}>5 Columns</option>
                <option value={6}>6 Columns</option>
              </select>
            </div>
            <div>
              <label htmlFor="cat-emoji" className="text-xs font-bold text-slate-500 block mb-1">Emoji Icon</label>
              <input id="cat-emoji" value={data.emoji || '📂'} onChange={e => update('emoji', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
          </div>
        );

      // ─── Campaign Banner ───────────────────────────────────────────────
      case 'campaign_banner':
        return (
          <div className="space-y-3">
            <div>
              <label htmlFor="camp-tag" className="text-xs font-bold text-slate-500 block mb-1">Campaign Tag</label>
              <input id="camp-tag" value={data.tag || ''} onChange={e => update('tag', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
            <div>
              <label htmlFor="camp-sub" className="text-xs font-bold text-slate-500 block mb-1">Subtitle</label>
              <input id="camp-sub" value={data.subtitle || ''} onChange={e => update('subtitle', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="camp-cta" className="text-xs font-bold text-slate-500 block mb-1">CTA Text</label>
                <input id="camp-cta" value={data.cta || ''} onChange={e => update('cta', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label htmlFor="camp-link" className="text-xs font-bold text-slate-500 block mb-1">CTA Link</label>
                <input id="camp-link" value={data.ctaHref || ''} onChange={e => update('ctaHref', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="camp-emoji" className="text-xs font-bold text-slate-500 block mb-1">Emoji</label>
                <input id="camp-emoji" value={data.emoji || ''} onChange={e => update('emoji', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1.5"><Palette className="w-3 h-3" /> Gradient</label>
              <div className="flex flex-wrap gap-2">
                {GRADIENTS.map(g => (
                  <button key={g} onClick={() => update('gradient', g)} aria-label={`Select gradient ${g}`}
                    className={`w-8 h-8 rounded-full bg-linear-to-r ${g} border-2 transition-transform hover:scale-110 ${data.gradient === g ? 'border-slate-900 shadow-md scale-110 ring-2 ring-white' : 'border-transparent'}`} />
                ))}
              </div>
            </div>
          </div>
        );

      // ─── FAQ ───────────────────────────────────────────────────────────
      case 'faq':
        return (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Questions & Answers</h4>
            {(data.items || []).map((item: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 relative group space-y-2">
                <button onClick={() => {
                  const updated = [...(data.items || [])]; updated.splice(idx, 1); update('items', updated);
                }} aria-label="Remove FAQ" className="absolute top-2 right-2 p-1 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div>
                  <label htmlFor={`faq-q-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Question</label>
                  <input id={`faq-q-${idx}`} value={item.q} onChange={e => {
                    const updated = [...data.items]; updated[idx] = { ...updated[idx], q: e.target.value }; update('items', updated);
                  }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label htmlFor={`faq-a-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Answer</label>
                  <textarea id={`faq-a-${idx}`} value={item.a} onChange={e => {
                    const updated = [...data.items]; updated[idx] = { ...updated[idx], a: e.target.value }; update('items', updated);
                  }} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
                </div>
              </div>
            ))}
            <button onClick={() => {
              update('items', [...(data.items || []), { q: 'New question?', a: 'Answer here...' }]);
            }} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-3 text-sm font-semibold text-slate-500 hover:text-green-600 hover:border-green-400 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add FAQ Item
            </button>
          </div>
        );

      // ─── SEO Footer ────────────────────────────────────────────────────
      case 'seo_footer':
        return (
          <div className="space-y-3">
            <div>
              <label htmlFor="seo-desc" className="text-xs font-bold text-slate-500 block mb-1">Description</label>
              <textarea id="seo-desc" value={data.description || ''} onChange={e => update('description', e.target.value)} rows={4}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
            </div>
            <div>
              <label htmlFor="seo-tags" className="text-xs font-bold text-slate-500 block mb-1">SEO Tags (comma-separated)</label>
              <input id="seo-tags" value={(data.tags || []).join(', ')} onChange={e => update('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
          </div>
        );

      // ─── Custom HTML ───────────────────────────────────────────────────
      case 'custom_html':
        return (
          <div className="space-y-3">
            <div>
              <label htmlFor="html-content" className="text-xs font-bold text-slate-500 block mb-1">HTML Content</label>
              <textarea id="html-content" value={data.htmlContent || ''} onChange={e => update('htmlContent', e.target.value)} rows={8}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-y" />
            </div>
            <p className="text-[10px] text-slate-400">⚠️ Raw HTML will be rendered. Use responsibly.</p>
          </div>
        );

      // ─── Trending Products ─────────────────────────────────────────────
      case 'trending_products':
        return (
          <div className="space-y-3">
            <div>
              <label htmlFor="trend-emoji" className="text-xs font-bold text-slate-500 block mb-1">Emoji</label>
              <input id="trend-emoji" value={data.emoji || '🔥'} onChange={e => update('emoji', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
            <div>
              <label htmlFor="trend-max" className="text-xs font-bold text-slate-500 block mb-1">Max Products</label>
              <input id="trend-max" type="number" value={data.maxItems || 8} onChange={e => update('maxItems', Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
            </div>
          </div>
        );

      default:
        return <p className="text-sm text-slate-400">No additional settings for this section type.</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
              {getTypeIcon()}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Edit Section</h2>
              <p className="text-[10px] text-slate-500 capitalize">{data.type?.replace(/_/g, ' ')} Settings</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close editor" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Common fields: Title & Subtitle */}
          <div className="space-y-3">
            <div>
              <label htmlFor="sec-title" className="text-xs font-bold text-slate-500 block mb-1">Section Title</label>
              <input id="sec-title" value={data.title || ''} onChange={e => update('title', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
            </div>
            {data.type !== 'hero_slider' && data.type !== 'seo_footer' && data.type !== 'custom_html' && (
              <div>
                <label htmlFor="sec-subtitle" className="text-xs font-bold text-slate-500 block mb-1">Subtitle</label>
                <input id="sec-subtitle" value={data.subtitle || ''} onChange={e => update('subtitle', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
              </div>
            )}
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-700">Visible</p>
              <p className="text-[10px] text-slate-400">Show this section on the page</p>
            </div>
            <button onClick={() => update('visible', data.visible === false ? true : data.visible === true ? false : false)}
              className={`w-10 h-6 rounded-full transition-colors relative ${data.visible !== false ? 'bg-green-500' : 'bg-slate-300'}`} aria-label="Toggle visibility">
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${data.visible !== false ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Section-specific fields */}
          <div className="border-t border-slate-100 pt-4">
            {renderFields()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-300 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
