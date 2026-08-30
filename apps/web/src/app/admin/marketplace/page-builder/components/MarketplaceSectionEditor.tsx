'use client';

import React, { useState } from 'react';
import { X, Save, Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
// ── Gradient Presets ──────────────────────────────────────────────────────

const GRADIENT_PRESETS = [
  { label: 'Blue → Indigo', value: 'from-blue-600 to-indigo-700' },
  { label: 'Orange → Amber', value: 'from-orange-500 via-amber-500 to-yellow-500' },
  { label: 'Purple → Violet', value: 'from-purple-600 via-violet-600 to-indigo-600' },
  { label: 'Green → Emerald', value: 'from-green-600 to-emerald-700' },
  { label: 'Red → Rose', value: 'from-red-600 to-rose-600' },
  { label: 'Cyan → Blue', value: 'from-cyan-500 to-blue-600' },
  { label: 'Pink → Fuchsia', value: 'from-pink-500 to-fuchsia-600' },
  { label: 'Slate → Gray', value: 'from-slate-700 to-gray-900' },
  { label: 'Amber → Yellow', value: 'from-amber-500 to-yellow-400' },
  { label: 'Teal → Emerald', value: 'from-teal-500 to-emerald-500' },
];

// ── Category Options (for product sections) ──────────────────────────────

const CATEGORY_OPTIONS = [
  { key: 'electronics', label: 'Electronics', icon: 'Laptop' },
  { key: 'fashion', label: 'Fashion', icon: 'Shirt' },
  { key: 'home-kitchen', label: 'Home & Kitchen', icon: 'Sofa' },
  { key: 'beauty', label: 'Beauty & Personal Care', icon: 'Sparkles' },
  { key: 'sports', label: 'Sports & Fitness', icon: 'Dumbbell' },
  { key: 'toys-baby', label: 'Toys & Baby Products', icon: 'Baby' },
  { key: 'appliances', label: 'Appliances', icon: 'Tv' },
  { key: 'trending', label: 'Trending Now', icon: 'TrendingUp' },
  { key: 'new-arrivals', label: 'New Arrivals', icon: 'Sparkles' },
  { key: 'best-sellers', label: 'Best Sellers', icon: 'Award' },
  { key: 'deals', label: 'Deals of the Day', icon: 'Flame' },
  { key: 'recommended', label: 'Recommended For You', icon: 'Heart' },
];

const BRAND_CATEGORIES = ['electronics', 'fashion', 'home', 'beauty', 'sports', 'toys', 'appliances'];

// ── Icon Options ─────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  'Sun', 'GraduationCap', 'Gift', 'Zap', 'Star', 'Heart', 'Flame',
  'Sparkles', 'Crown', 'TrendingUp', 'ShoppingCart', 'Tag', 'Megaphone',
];

// ── Helper: Input Field ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
    />
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label?: string }) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        aria-label={label || 'Select option'}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors appearance-none bg-white pr-8"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!value)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => onChange(!value))}
        className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${value ? 'bg-blue-600' : 'bg-slate-300'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION EDITOR
// ══════════════════════════════════════════════════════════════════════════

interface MarketplaceSectionEditorProps {
  section: any;
  onClose: () => void;
  onSave: (updated: any) => void;
}

export function MarketplaceSectionEditor({ section, onClose, onSave }: MarketplaceSectionEditorProps) {
  const [data, setData] = useState<any>({ ...section });

  const update = (key: string, value: any) => setData((prev: any) => ({ ...prev, [key]: value }));

  const renderFields = () => {
    switch (data.type) {
      // ── Hero Slider ──────────────────────────────────────────────
      case 'hero_slider':
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Hero Banner Slider" />
            </Field>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Banners</label>
              <div className="space-y-3">
                {(data.banners || []).map((banner: any, i: number) => (
                  <div key={banner.id || i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">Banner {i + 1}</span>
                      <button onClick={() => update('banners', data.banners.filter((_: any, j: number) => j !== i))} className="text-red-400 hover:text-red-600 p-1" title="Remove banner" aria-label={`Remove banner ${i + 1}`}><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <TextInput value={banner.tag} onChange={v => update('banners', data.banners.map((b: any, j: number) => j === i ? { ...b, tag: v } : b))} placeholder="Tag (e.g. SALE)" />
                    <TextArea value={banner.headline} onChange={v => update('banners', data.banners.map((b: any, j: number) => j === i ? { ...b, headline: v } : b))} placeholder="Headline" rows={2} />
                    <TextInput value={banner.subheadline} onChange={v => update('banners', data.banners.map((b: any, j: number) => j === i ? { ...b, subheadline: v } : b))} placeholder="Subheadline" />
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput value={banner.cta} onChange={v => update('banners', data.banners.map((b: any, j: number) => j === i ? { ...b, cta: v } : b))} placeholder="CTA text" />
                      <TextInput value={banner.ctaHref} onChange={v => update('banners', data.banners.map((b: any, j: number) => j === i ? { ...b, ctaHref: v } : b))} placeholder="CTA link" />
                    </div>
                    <Select
                      value={banner.gradient}
                      onChange={v => update('banners', data.banners.map((b: any, j: number) => j === i ? { ...b, gradient: v } : b))}
                      options={GRADIENT_PRESETS.map(g => ({ value: g.value, label: g.label }))}
                    />
                  </div>
                ))}
                <button
                  onClick={() => update('banners', [...(data.banners || []), { id: `b-${Date.now()}`, tag: 'NEW', headline: 'New Banner', subheadline: '', cta: 'Shop Now', ctaHref: '/marketplace', gradient: 'from-blue-600 to-indigo-700' }])}
                  className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Banner
                </button>
              </div>
            </div>
          </div>
        );

      // ── Trust Badges ─────────────────────────────────────────────
      case 'trust_badges':
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Trust Badges" />
            </Field>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              {/* This used to name five badges — "Free Delivery, Secure
                  Payment, Easy Returns, 24/7 Support, 100% Genuine" — that
                  matched nothing in the data, while the storefront rendered
                  the section as nothing at all. */}
              <p className="text-xs text-blue-700">
                Badges come from the marketplace homepage data and are filtered to the
                shopper&apos;s market, so each country sees only the payment methods and
                guarantees offered there. The title above is the only field to set here.
              </p>
            </div>
          </div>
        );

      // ── Category Grid ────────────────────────────────────────────
      case 'category_grid':
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Shop by Category" />
            </Field>
            <Field label="Subtitle">
              <TextInput value={data.subtitle} onChange={v => update('subtitle', v)} placeholder="Explore 20+ categories" />
            </Field>
            <Field label="View All Link">
              <TextInput value={data.viewAllHref} onChange={v => update('viewAllHref', v)} placeholder="/marketplace/category-list" />
            </Field>
          </div>
        );

      // ── Flash Deals ──────────────────────────────────────────────
      case 'flash_deals':
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Flash Deals" />
            </Field>
            <Field label="View All Link">
              <TextInput value={data.viewAllHref} onChange={v => update('viewAllHref', v)} placeholder="/marketplace/offers" />
            </Field>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">Flash deals are populated from the marketplace data with a live countdown timer.</p>
            </div>
          </div>
        );

      // ── Product Section ──────────────────────────────────────────
      case 'product_section':
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Best of Electronics" />
            </Field>
            <Field label="Subtitle">
              <TextInput value={data.subtitle} onChange={v => update('subtitle', v)} placeholder="Top-rated products" />
            </Field>
            <Field label="Product Category">
              <Select
                value={data.categoryKey || 'electronics'}
                onChange={v => {
                  const cat = CATEGORY_OPTIONS.find(c => c.key === v);
                  update('categoryKey', v);
                  if (cat) {
                    update('iconName', cat.icon);
                    update('viewAllHref', `/marketplace/category/${v}`);
                  }
                }}
                options={CATEGORY_OPTIONS.map(c => ({ value: c.key, label: c.label }))}
              />
            </Field>
            <Field label="View All Link">
              <TextInput value={data.viewAllHref} onChange={v => update('viewAllHref', v)} placeholder="/marketplace/category/electronics" />
            </Field>
            <Field label="Icon">
              <Select
                value={data.iconName || 'Laptop'}
                onChange={v => update('iconName', v)}
                options={['Laptop', 'Shirt', 'Sofa', 'Sparkles', 'Dumbbell', 'Baby', 'Tv', 'TrendingUp', 'Award', 'Flame', 'Heart', 'Star'].map(i => ({ value: i, label: i }))}
              />
            </Field>
            <Field label="Border Accent Gradient (optional)">
              <Select
                value={data.borderAccent || ''}
                onChange={v => update('borderAccent', v)}
                options={[{ value: '', label: 'None' }, ...GRADIENT_PRESETS.map(g => ({ value: `bg-linear-to-r ${g.value}`, label: g.label }))]}
              />
            </Field>
            <Toggle value={data.showBrandCards !== false} onChange={v => update('showBrandCards', v)} label="Show brand promo cards below products" />
            {data.showBrandCards !== false && (
              <Field label="Brand Category">
                <Select
                  value={data.brandCategory || 'electronics'}
                  onChange={v => update('brandCategory', v)}
                  options={BRAND_CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                />
              </Field>
            )}
          </div>
        );

      // ── Campaign Banner ──────────────────────────────────────────
      case 'campaign_banner':
        return (
          <div className="space-y-4">
            <Field label="Internal Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Summer Sale" />
            </Field>
            <Field label="Tag">
              <TextInput value={data.tag} onChange={v => update('tag', v)} placeholder="SUMMER SALE" />
            </Field>
            <Field label="Headline">
              <TextInput value={data.headline} onChange={v => update('headline', v)} placeholder="Beat the Heat" />
            </Field>
            <Field label="Subheadline">
              <TextInput value={data.subheadline} onChange={v => update('subheadline', v)} placeholder="ACs, Coolers, Summer Wear — Up to 60% Off" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CTA Text">
                <TextInput value={data.cta} onChange={v => update('cta', v)} placeholder="Shop Summer" />
              </Field>
              <Field label="CTA Link">
                <TextInput value={data.ctaHref} onChange={v => update('ctaHref', v)} placeholder="/marketplace/offers" />
              </Field>
            </div>
            <Field label="Gradient">
              <Select
                value={data.gradient || 'from-orange-500 via-amber-500 to-yellow-500'}
                onChange={v => update('gradient', v)}
                options={GRADIENT_PRESETS.map(g => ({ value: g.value, label: g.label }))}
              />
            </Field>
            <Field label="Icon">
              <Select
                value={data.icon || 'Sun'}
                onChange={v => update('icon', v)}
                options={ICON_OPTIONS.map(i => ({ value: i, label: i }))}
              />
            </Field>
          </div>
        );

      // ── Brand Promo Row ──────────────────────────────────────────
      case 'brand_promo_row':
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Top Brands" />
            </Field>
            <Field label="Brand Category">
              <Select
                value={data.brandCategory || 'electronics'}
                onChange={v => update('brandCategory', v)}
                options={BRAND_CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
              />
            </Field>
          </div>
        );

      // ── Country Banners ──────────────────────────────────────────
      case 'country_banners':
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Shop by Country" />
            </Field>
            <Field label="Subtitle">
              <TextInput value={data.subtitle} onChange={v => update('subtitle', v)} placeholder="Localized experience, local delivery" />
            </Field>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">Country banners are automatically populated from the marketplace data (India, UAE, Saudi Arabia, Kuwait, Egypt).</p>
            </div>
          </div>
        );

      // ── Sponsored Products ───────────────────────────────────────
      case 'sponsored_products':
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Sponsored Products" />
            </Field>
            <Field label="Subtitle">
              <TextInput value={data.subtitle} onChange={v => update('subtitle', v)} placeholder="Featured by sellers" />
            </Field>
          </div>
        );

      // ── FAQ ──────────────────────────────────────────────────────
      case 'faq':
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Frequently Asked Questions" />
            </Field>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Questions & Answers</label>
              <div className="space-y-2">
                {(data.items || []).map((item: any, i: number) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1"><GripVertical className="w-3 h-3 text-slate-400" /> Q{i + 1}</span>
                      <button onClick={() => update('items', data.items.filter((_: any, j: number) => j !== i))} className="text-red-400 hover:text-red-600 p-1" title="Remove question" aria-label={`Remove question ${i + 1}`}><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <TextInput value={item.q} onChange={v => update('items', data.items.map((it: any, j: number) => j === i ? { ...it, q: v } : it))} placeholder="Question" />
                    <TextArea value={item.a} onChange={v => update('items', data.items.map((it: any, j: number) => j === i ? { ...it, a: v } : it))} placeholder="Answer" rows={2} />
                  </div>
                ))}
                <button
                  onClick={() => update('items', [...(data.items || []), { q: '', a: '' }])}
                  className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Question
                </button>
              </div>
            </div>
          </div>
        );

      // ── SEO Footer ───────────────────────────────────────────────
      case 'seo_footer':
        return (
          <div className="space-y-4">
            <Field label="SEO Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="KARTSEEK Marketplace — Shop Online" />
            </Field>
            <Field label="Description">
              <TextArea value={data.description} onChange={v => update('description', v)} placeholder="SEO description..." rows={4} />
            </Field>
            <Field label="Keywords (comma-separated)">
              <TextInput
                value={(data.tags || []).join(', ')}
                onChange={v => update('tags', v.split(',').map((t: string) => t.trim()).filter(Boolean))}
                placeholder="Online Shopping, Electronics, Fashion"
              />
            </Field>
          </div>
        );

      // ── Custom HTML ──────────────────────────────────────────────
      case 'custom_html':
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Custom Section" />
            </Field>
            <Field label="HTML Content">
              <TextArea value={data.htmlContent} onChange={v => update('htmlContent', v)} placeholder="<div>Your HTML here</div>" rows={6} />
            </Field>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <Field label="Section Title">
              <TextInput value={data.title} onChange={v => update('title', v)} placeholder="Section Title" />
            </Field>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}><DismissOnEscape onDismiss={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <h2 className="font-bold text-slate-900">Edit Section</h2>
            <p className="text-xs text-slate-500 capitalize">{data.type?.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={onClose} aria-label="Close editor" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderFields()}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onSave(data)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
