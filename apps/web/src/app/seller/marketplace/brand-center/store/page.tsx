'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import {
  Store, Save, Eye, Palette, Globe, FileText, Upload, Image as ImageIcon,
  CheckCircle, X, Layers, Type, Layout, Sparkles, ChevronRight,
  Monitor, Smartphone, Tablet,
} from 'lucide-react';

type Tab = 'branding' | 'theme' | 'content' | 'seo';

export default function BrandStorePage() {
  const { seller } = useSeller();
  const [activeTab, setActiveTab] = useState<Tab>('branding');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Form state
  const [storeName, setStoreName] = useState(seller?.sellerName || '');
  const [tagline, setTagline] = useState('Premium Electronics at Best Prices');
  const [description, setDescription] = useState('Your one-stop destination for premium smartphones, laptops, and accessories. Authorized reseller of top brands.');
  const [brandColor, setBrandColor] = useState('#3b82f6');
  const [heroTitle, setHeroTitle] = useState('Welcome to Our Brand Store');
  const [heroSubtitle, setHeroSubtitle] = useState('Discover premium products with guaranteed authenticity');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  const BRAND_COLORS = [
    { hex: '#3b82f6', name: 'Blue' },
    { hex: '#10b981', name: 'Emerald' },
    { hex: '#8b5cf6', name: 'Violet' },
    { hex: '#f59e0b', name: 'Amber' },
    { hex: '#ef4444', name: 'Red' },
    { hex: '#06b6d4', name: 'Cyan' },
    { hex: '#ec4899', name: 'Pink' },
    { hex: '#000000', name: 'Black' },
  ];

  /**
   * Upload a logo or banner.
   *
   * The picker was a button with no `onClick` and a dashed drop zone with no
   * input behind it, so a seller could click both and nothing happened —
   * despite `POST /upload/brand-image` having existed all along. The client
   * could not have called it either: `api.post` JSON-stringifies its body, so
   * there was no way to send a file until `api.upload` was added.
   *
   * The returned URL goes into form state and is persisted by Save, rather than
   * being written immediately — an upload that succeeds followed by a save that
   * fails should not leave the storefront half-changed.
   */
  const uploadImage = async (kind: 'logo' | 'banner', file: File) => {
    const limitMb = kind === 'logo' ? 2 : 5;
    if (file.size > limitMb * 1024 * 1024) {
      setSaveError(`That ${kind} is larger than ${limitMb}MB. Pick a smaller file.`);
      return;
    }

    setUploading(kind);
    setSaveError(null);
    try {
      const res: any = await sellerApi.uploadBrandImage(seller.sellerId, file, kind);
      const url = res?.url ?? res?.data?.url;
      if (!url) throw new Error('Upload succeeded but returned no URL');
      if (kind === 'logo') setLogoUrl(url); else setBannerUrl(url);
    } catch (e) {
      setSaveError(e instanceof Error
        ? e.message
        : `We couldn't upload that ${kind}. Please try again.`);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!seller?.sellerId) return;
    setSaving(true);
    try {
      await sellerApi.updateBrand(seller.sellerId, {
        logoUrl,
        bannerUrl,
        storeName,
        tagline,
        description,
        brandColor,
        heroTitle,
        heroSubtitle,
        metaTitle,
        metaDescription,
      });
      setSaveError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      // "We still show success" is how a seller ends up believing their
      // storefront copy is live when the request never landed. A failed save has
      // to look like one.
      setSaveError(err instanceof Error && err.message
        ? err.message
        : 'We could not save your storefront just now. Your changes are still here — try again.');
    } finally {
      setSaving(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'branding', label: 'Branding', icon: Palette },
    { key: 'theme', label: 'Theme & Colors', icon: Sparkles },
    { key: 'content', label: 'Content', icon: Layers },
    { key: 'seo', label: 'SEO & Meta', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/seller/marketplace/brand-center" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-flex items-center gap-1 transition-colors">
          ← Back to Brand Center
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              Brand Store
            </h1>
            <p className="text-sm text-slate-500 mt-1">Customize how your brand appears to customers</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
              <Eye className="w-4 h-4" />Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-70 shadow-sm"
            >
              {saved ? <><CheckCircle className="w-4 h-4" />Saved!</> : saving ? 'Saving...' : <><Save className="w-4 h-4" />Save Changes</>}
            </button>
          </div>
        </div>
      </div>

      {saveError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-700 font-medium">
          <X className="w-4 h-4 shrink-0 mt-px" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Sync Status */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-700 font-medium">
        <CheckCircle className="w-4 h-4" />
        Your brand store is synced with the super admin panel. Changes here reflect on the marketplace after admin approval.
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors flex-1 ${
              activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            {/* Branding Tab */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Store Logo</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-blue-50 rounded-xl flex items-center justify-center text-2xl font-bold text-blue-600 border border-blue-200/50 overflow-hidden">
                      {logoUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={logoUrl} alt="Store logo" className="w-full h-full object-cover" />
                        // Was `|| 'TH'` — every seller without a name saw Tech
                        // Haven's initials.
                        : (storeName.substring(0, 2).toUpperCase() || '—')}
                    </div>
                    <div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImage('logo', file);
                          e.target.value = '';
                        }}
                      />
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploading !== null}
                        className="flex items-center gap-2 bg-blue-50 text-blue-600 disabled:opacity-60 font-bold px-4 py-2 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        {uploading === 'logo' ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload Logo'}
                      </button>
                      <p className="text-xs text-slate-500 mt-1">PNG/SVG, max 2MB, min 200×200px</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Store Banner</h3>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage('banner', file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploading !== null}
                    className="w-full border-2 border-dashed border-slate-200 rounded-xl h-36 flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 hover:bg-blue-50/30 disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bannerUrl} alt="Store banner" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">
                          {uploading === 'banner' ? 'Uploading…' : 'Upload banner image (1200 × 300px recommended)'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">JPG/PNG, max 5MB</p>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="store-display-name">Store Display Name</label>
                    <input id="store-display-name"
                      type="text"
                      value={storeName}
                      onChange={e => setStoreName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tech Haven Electronics"
                      aria-label="Store Display Name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="tagline">Tagline</label>
                    <input id="tagline"
                      type="text"
                      value={tagline}
                      onChange={e => setTagline(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Premium Electronics at Best Prices"
                      aria-label="Tagline"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="store-description">Store Description</label>
                  <textarea id="store-description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Tell customers about your brand..."
                    aria-label="Store Description"
                  />
                </div>
              </div>
            )}

            {/* Theme Tab */}
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Brand Color</h3>
                  <div className="flex gap-3 flex-wrap">
                    {BRAND_COLORS.map(c => (
                      <button
                        key={c.hex}
                        onClick={() => setBrandColor(c.hex)}
                        className={`w-10 h-10 rounded-xl border-2 transition-all ${
                          brandColor === c.hex ? 'border-slate-900 scale-110 shadow-md' : 'border-slate-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                        aria-label={`Select ${c.name}`}
                      />
                    ))}
                    <div className="flex items-center gap-2 ml-2">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={e => setBrandColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                        aria-label="Custom color picker"
                      />
                      <span className="text-xs text-slate-400 font-mono">{brandColor}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Font Style</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { name: 'Modern', font: 'Inter', sample: 'Aa' },
                      { name: 'Classic', font: 'Georgia', sample: 'Aa' },
                      { name: 'Bold', font: 'Arial Black', sample: 'Aa' },
                    ].map((f, i) => (
                      <button
                        key={i}
                        className={`border rounded-xl p-4 text-center hover:border-blue-400 transition-colors ${
                          i === 0 ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200'
                        }`}
                      >
                        <div className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: f.font }}>{f.sample}</div>
                        <div className="text-xs text-slate-500 font-medium">{f.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Layout Style</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Grid View', icon: Layout, desc: 'Products in grid cards' },
                      { name: 'List View', icon: FileText, desc: 'Products in detailed rows' },
                    ].map((l, i) => (
                      <button
                        key={i}
                        className={`border rounded-xl p-4 text-left hover:border-blue-400 transition-colors flex items-center gap-3 ${
                          i === 0 ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200'
                        }`}
                      >
                        <l.icon className="w-5 h-5 text-slate-500" />
                        <div>
                          <div className="text-sm font-bold text-slate-900">{l.name}</div>
                          <div className="text-xs text-slate-500">{l.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Hero Section</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="hero-title">Hero Title</label>
                      <input id="hero-title"
                        type="text"
                        value={heroTitle}
                        onChange={e => setHeroTitle(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Welcome to Our Brand Store"
                        aria-label="Hero Title"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="hero-subtitle">Hero Subtitle</label>
                      <input id="hero-subtitle"
                        type="text"
                        value={heroSubtitle}
                        onChange={e => setHeroSubtitle(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Discover premium products"
                        aria-label="Hero Subtitle"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Featured Categories</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {['Smartphones', 'Laptops', 'Audio', 'Accessories'].map((cat, i) => (
                      <div key={i} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{cat}</span>
                        <div className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-3 text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                    + Add Category
                  </button>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Custom Sections</h3>
                  <div className="space-y-2">
                    {['Best Sellers', 'New Arrivals', 'Deals of the Day'].map((section, i) => (
                      <div key={i} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between group hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center text-xs font-bold text-slate-400">
                            {i + 1}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{section}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === 'seo' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Search Engine Optimization</h3>
                  <p className="text-sm text-slate-500 mb-4">Control how your brand store appears in search results</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="meta-title">Meta Title</label>
                      <input id="meta-title"
                        type="text"
                        value={metaTitle || storeName}
                        onChange={e => setMetaTitle(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Tech Haven - Official Brand Store | KARTSEEK"
                        aria-label="Meta Title"
                      />
                      <p className="text-xs text-slate-400 mt-1">{(metaTitle || storeName).length}/60 characters</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block" htmlFor="meta-description">Meta Description</label>
                      <textarea id="meta-description"
                        value={metaDescription || description}
                        onChange={e => setMetaDescription(e.target.value)}
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Shop authentic products from Tech Haven on KARTSEEK..."
                        aria-label="Meta Description"
                      />
                      <p className="text-xs text-slate-400 mt-1">{(metaDescription || description).length}/160 characters</p>
                    </div>
                  </div>
                </div>

                {/* Search Preview */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Search Preview</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="text-blue-700 text-lg font-medium hover:underline cursor-pointer">
                      {metaTitle || `${storeName} — Official Brand Store | KARTSEEK`}
                    </div>
                    <div className="text-sm text-emerald-700 mt-0.5">kartseek.com/brand/{seller?.storeSlug || 'your-brand'}</div>
                    <div className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {metaDescription || description}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-3">OG Image</h3>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                    <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                    <p className="text-xs text-slate-400">1200 × 630px — Shown when shared on social media</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-6">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Preview</h3>
              <div className="flex gap-1">
                {[
                  { key: 'desktop', icon: Monitor },
                  { key: 'tablet', icon: Tablet },
                  { key: 'mobile', icon: Smartphone },
                ].map(d => (
                  <button
                    key={d.key}
                    onClick={() => setPreviewDevice(d.key as typeof previewDevice)}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      previewDevice === d.key ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    aria-label={`Preview ${d.key}`}
                  >
                    <d.icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className={`${previewDevice === 'mobile' ? 'max-w-[280px]' : previewDevice === 'tablet' ? 'max-w-[360px]' : ''} mx-auto`}>
              {/* Preview Header */}
              <div
                className="p-4"
                style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-xs font-bold text-white">
                    {storeName.substring(0, 2).toUpperCase() || 'TH'}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{storeName || 'Store Name'}</div>
                    <div className="text-white/70 text-[10px]">{tagline || 'Your tagline here'}</div>
                  </div>
                </div>
              </div>

              {/* Preview Hero */}
              <div className="bg-slate-50 p-4 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">{heroTitle || 'Hero Title'}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{heroSubtitle || 'Hero subtitle'}</p>
              </div>

              {/* Preview Products */}
              <div className="p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Featured Products</div>
                <div className="grid grid-cols-2 gap-2">
                  {['iPhone 15 Pro', 'MacBook Air', 'AirPods Pro', 'Sony WH-1000XM5'].map((p, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-2">
                      <div className="w-full aspect-square bg-slate-200 rounded-md mb-1.5" />
                      <div className="text-[10px] font-medium text-slate-700 truncate">{p}</div>
                      <div className="text-[10px] text-slate-400">₹{(10000 + i * 15000).toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
