'use client';

import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Save, Loader2, AlertCircle, LayoutTemplate, Eye, Smartphone, Monitor,
  GripVertical, Edit, Trash2, Image as ImageIcon, Store, Tag, LayoutGrid, Megaphone,
  HelpCircle, FileText, Code, Crown, TrendingUp, Award, CheckCircle, ChevronRight,
  EyeOff,
} from 'lucide-react';
import { useGroceryLayout, saveGroceryLayout } from '@/hooks/useGroceryLayout';
import { SectionTypeMenu, SECTION_TYPES } from './components/section-type-menu';
import { GrocerySectionEditor } from './components/grocery-section-editor';
import type { SectionTypeOption } from './components/section-type-menu';

// ── Pages available for editing ──────────────────────────────────────────

const PAGES = [
  { id: 'homepage', label: 'Homepage', icon: LayoutTemplate },
  { id: 'category', label: 'Category Page', icon: LayoutGrid },
  { id: 'store-listing', label: 'Store Listing', icon: Store },
  { id: 'checkout', label: 'Checkout', icon: Tag },
];

// ── Default sections for Grocery Homepage ────────────────────────────────

const DEFAULT_HOMEPAGE_SECTIONS = [
  { id: 'sec-hero', type: 'hero_slider', title: 'Hero Banner Slider', visible: true, banners: [
    { id: 'b1', tag: 'FRESH', headline: 'Fresh Groceries\nDelivered Fast', subheadline: 'Order from 500+ stores near you', cta: 'Shop Now', ctaHref: '/grocery', gradient: 'from-green-600 to-emerald-700' },
    { id: 'b2', tag: 'SAVE', headline: 'Weekly Deals\nUp to 50% Off', subheadline: 'On fruits, vegetables & staples', cta: 'View Deals', ctaHref: '/grocery/deals', gradient: 'from-blue-600 to-cyan-600' },
  ]},
  { id: 'sec-promoted', type: 'promoted_stores', title: 'Sponsored Stores', subtitle: 'Featured partners', emoji: '👑', sectionTag: 'promoted', maxItems: 6, visible: true },
  { id: 'sec-categories', type: 'category_grid', title: 'Shop by Category', emoji: '🛒', columns: 4, visible: true },
  { id: 'sec-nearby', type: 'store_section', title: 'Nearby Stores', subtitle: 'Stores close to you', emoji: '📍', sectionTag: 'nearby', variant: 'default', maxItems: 10, visible: true },
  { id: 'sec-brands', type: 'brand_row', title: 'Shop by Brand', subtitle: 'Your favorite grocery brands', emoji: '🏷️', visible: true },
  { id: 'sec-trending', type: 'store_section', title: 'Trending Stores', subtitle: 'Most popular this week', emoji: '🔥', sectionTag: 'trending', variant: 'default', maxItems: 10, visible: true },
  { id: 'sec-express', type: 'store_section', title: 'Express Delivery', subtitle: 'Get groceries in 10-15 minutes', emoji: '⚡', sectionTag: 'fast-delivery', variant: 'compact', maxItems: 10, visible: true },
  { id: 'sec-new', type: 'store_section', title: 'New Store Arrivals', subtitle: 'Recently opened near you', emoji: '🆕', sectionTag: 'new', variant: 'default', maxItems: 10, visible: true },
  { id: 'sec-top-rated', type: 'store_section', title: 'Top Rated Stores', subtitle: 'Highest customer ratings', emoji: '⭐', sectionTag: 'top-rated', variant: 'default', maxItems: 10, visible: true },
  { id: 'sec-super', type: 'store_section', title: 'Supermarkets & Hypermarkets', subtitle: 'One-stop shop for all your needs', emoji: '🏬', sectionTag: 'supermarket', variant: 'default', maxItems: 10, visible: true },
  { id: 'sec-campaign', type: 'campaign_banner', title: 'Summer Fresh Fest', subtitle: 'Up to 40% off on fruits, vegetables & beverages', tag: 'SEASONAL', cta: 'Shop Now', ctaHref: '/grocery/category/fruits-vegetables', gradient: 'from-green-700 via-green-600 to-emerald-500', emoji: '🍹🥬🍉', visible: true },
  { id: 'sec-meat', type: 'store_section', title: 'Fresh Meat & Fish', subtitle: 'Hygienically processed & delivered chilled', emoji: '🥩', sectionTag: 'meat-fish', variant: 'default', maxItems: 10, visible: true },
  { id: 'sec-fruit', type: 'store_section', title: 'Fruits & Vegetable Stores', subtitle: 'Farm-fresh produce delivered', emoji: '🥬', sectionTag: 'fruits-veggies', variant: 'default', maxItems: 10, visible: true },
  { id: 'sec-dairy', type: 'store_section', title: 'Dairy & Bakery', subtitle: 'Fresh dairy, bread, and pastries', emoji: '🥐', sectionTag: 'dairy-bakery', variant: 'default', maxItems: 10, visible: true },
  { id: 'sec-organic', type: 'store_section', title: 'Organic & Health Stores', subtitle: 'Pesticide-free, organic certified', emoji: '🌱', sectionTag: 'organic', variant: 'default', maxItems: 10, visible: true },
  { id: 'sec-best', type: 'store_section', title: 'Best Seller Stores', subtitle: 'Most ordered from', emoji: '🏆', sectionTag: 'best-seller', variant: 'compact', maxItems: 10, visible: true },
  { id: 'sec-brands2', type: 'brand_row', title: 'More Brands You Love', subtitle: 'Discover more grocery brands', emoji: '💝', visible: true },
  { id: 'sec-all-cat', type: 'category_grid', title: 'Explore All Categories', emoji: '📂', columns: 4, visible: true },
  { id: 'sec-faq', type: 'faq', title: 'Frequently Asked Questions', emoji: '❓', visible: true, items: [
    { q: 'How fast is delivery?', a: 'We offer express delivery in 10-30 minutes and standard delivery in 30-45 minutes depending on the store.' },
    { q: 'What is the minimum order?', a: 'Minimum order varies by store, typically ₹99 - ₹199.' },
    { q: 'Can I order from multiple stores?', a: 'Each order is from a single store to ensure optimal delivery. You can place separate orders from different stores.' },
    { q: 'How do refunds work?', a: 'Refunds for perishable goods must be requested within 24 hours of delivery. Refunds are processed within 5-7 business days.' },
  ]},
  { id: 'sec-seo', type: 'seo_footer', title: 'KARTSEEK Grocery — Order Groceries Online', visible: true, description: 'KARTSEEK Grocery is the easiest way to order groceries online. Shop from nearby stores, supermarkets, hypermarkets, fresh meat and fish shops, bakeries, organic stores, and more.', tags: ['Grocery Delivery', 'Online Supermarket', 'Fresh Produce', 'Meat & Fish', 'Organic Food', 'Quick Commerce', 'Same Day Delivery'] },
];

// ── Sortable Section Row ─────────────────────────────────────────────────

function SortableRow({ id, section, onEdit, onDelete, onToggle }: {
  id: string; section: any; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const getIcon = () => {
    switch (section.type) {
      case 'hero_slider': return <ImageIcon className="w-4 h-4 text-indigo-500" />;
      case 'promoted_stores': return <Crown className="w-4 h-4 text-amber-500" />;
      case 'store_section': return <Store className="w-4 h-4 text-green-500" />;
      case 'brand_row': return <Award className="w-4 h-4 text-purple-500" />;
      case 'category_grid': return <LayoutGrid className="w-4 h-4 text-teal-500" />;
      case 'campaign_banner': return <Megaphone className="w-4 h-4 text-rose-500" />;
      case 'trending_products': return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'faq': return <HelpCircle className="w-4 h-4 text-sky-500" />;
      case 'seo_footer': return <FileText className="w-4 h-4 text-slate-500" />;
      case 'custom_html': return <Code className="w-4 h-4 text-gray-500" />;
      default: return <Tag className="w-4 h-4 text-slate-400" />;
    }
  };

  const isHidden = section.visible === false;

  return (
    <div ref={setNodeRef} style={style} className={`bg-white border rounded-xl shadow-sm mb-2 flex items-center px-3 py-2.5 gap-3 group transition-colors ${isHidden ? 'border-slate-200 opacity-60 bg-slate-50' : 'border-slate-200'}`}>
      <div {...attributes} {...listeners} className="cursor-grab p-0.5 text-slate-400 hover:text-slate-600 active:cursor-grabbing focus:outline-none">
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-800 text-xs truncate">{section.title}</h3>
        <p className="text-[10px] text-slate-400 capitalize">{section.type?.replace(/_/g, ' ')}{section.sectionTag ? ` · ${section.sectionTag}` : ''}</p>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onToggle} aria-label={isHidden ? 'Show section' : 'Hide section'} className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onEdit} aria-label="Edit section" className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-colors">
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} aria-label="Delete section" className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-red-600 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Phone Preview Colors ─────────────────────────────────────────────────

const PREVIEW_COLORS: Record<string, string> = {
  hero_slider: 'bg-green-100 border-green-200 text-green-500',
  promoted_stores: 'bg-amber-50 border-amber-200 text-amber-500',
  store_section: 'bg-emerald-50 border-emerald-200 text-emerald-500',
  brand_row: 'bg-purple-50 border-purple-200 text-purple-400',
  category_grid: 'bg-teal-50 border-teal-200 text-teal-400',
  campaign_banner: 'bg-rose-50 border-rose-200 text-rose-400',
  trending_products: 'bg-orange-50 border-orange-200 text-orange-400',
  faq: 'bg-sky-50 border-sky-200 text-sky-400',
  seo_footer: 'bg-slate-50 border-slate-200 text-slate-400',
  custom_html: 'bg-gray-50 border-gray-200 text-gray-400',
};

const PREVIEW_HEIGHTS: Record<string, string> = {
  hero_slider: 'h-[100px]',
  promoted_stores: 'h-[70px]',
  store_section: 'h-[60px]',
  brand_row: 'h-[40px]',
  category_grid: 'h-[50px]',
  campaign_banner: 'h-[50px]',
  trending_products: 'h-[60px]',
  faq: 'h-[40px]',
  seo_footer: 'h-[30px]',
  custom_html: 'h-[40px]',
};

// ══════════════════════════════════════════════════════════════════════════
// GROCERY PAGE BUILDER — MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════

export default function GroceryPageBuilder() {
  const { regionLabel, isFiltered } = useGroceryRegionFilter([]);
  const [selectedPage, setSelectedPage] = useState('homepage');
  const [platform, setPlatform] = useState<'web' | 'mobile'>('web');
  const [sections, setSections] = useState<any[]>(DEFAULT_HOMEPAGE_SECTIONS);
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load the saved layout so the builder edits what is live, not the defaults.
   *
   * The builder opened on `DEFAULT_HOMEPAGE_SECTIONS` every time, so a previously
   * saved arrangement was invisible and the next save silently reverted it.
   */
  const { sections: savedSections, isLoading: loadingLayout } = useGroceryLayout(selectedPage);
  useEffect(() => {
    if (savedSections?.length) setSections(savedSections as any[]);
    setIsLoading(loadingLayout);
  }, [savedSections, loadingLayout]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Load sections when page/platform changes
  useEffect(() => {
    setIsLoading(true);
    // Simulate API fetch — in production, replace with apiFetch
    setTimeout(() => {
      if (selectedPage === 'homepage') {
        setSections(DEFAULT_HOMEPAGE_SECTIONS);
      } else {
        setSections([]);
      }
      setIsLoading(false);
    }, 300);
  }, [selectedPage, platform]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleAddSection = useCallback((option: SectionTypeOption) => {
    const newSection = {
      ...option.defaultData,
      id: `sec-${Date.now()}`,
      type: option.type,
      visible: true,
    };
    setSections(prev => [...prev, newSection]);
  }, []);

  /**
   * Persist the layout.
   *
   * This was `setTimeout(…, 800)` followed by the message "Layout saved! Changes
   * are live on the grocery page." — a claim that was false twice over: nothing
   * was written, and the storefront hook that would have read it returned null
   * unconditionally. `PUT /admin/layouts/grocery/homepage` and the `page_layouts`
   * table have existed the whole time.
   */
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setMessage('');
    setSaveError(null);
    try {
      await saveGroceryLayout('homepage', sections as any);
      setMessage('Layout saved. The grocery homepage will pick it up on next load.');
      setTimeout(() => setMessage(''), 4000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save this layout');
    } finally {
      setIsSaving(false);
    }
  }, [sections]);

  const visibleSections = sections.filter(s => s.visible !== false);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Grocery Page Builder</h1>
          <p className="text-sm text-slate-500">Design and manage all grocery module pages with full CMS control</p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className="text-sm font-medium flex items-center gap-1 text-emerald-600">
              <CheckCircle className="w-4 h-4" /> {message}
            </span>
          )}
          {/* A failed save has to look different from a successful one — the old
              banner inferred failure from the word "Error" in a message that was
              only ever the hardcoded success string. */}
          {saveError && (
            <span role="alert" className="text-sm font-medium text-rose-600">{saveError}</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
           aria-label="Loading">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Main Layout: Sidebar + Canvas + Preview */}
      <div className="flex gap-5 items-start">

        {/* ── Left Sidebar ────────────────────────────────────────────── */}
        <div className="w-56 shrink-0 space-y-5">
          {/* Page Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Page</label>
            <div className="space-y-1">
              {PAGES.map(page => {
                const Icon = page.icon;
                return (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(page.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                      selectedPage === page.id ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {page.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platform Toggle */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Platform</label>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setPlatform('web')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                  platform === 'web' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Web
              </button>
              <button
                onClick={() => setPlatform('mobile')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                  platform === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Layout Stats</label>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total sections</span>
              <span className="font-bold text-slate-900">{sections.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Visible</span>
              <span className="font-bold text-green-600">{visibleSections.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Hidden</span>
              <span className="font-bold text-slate-400">{sections.length - visibleSections.length}</span>
            </div>
          </div>
        </div>

        {/* ── Center Canvas ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 min-h-[700px] relative">
            {/* Canvas Header */}
            <div className="mb-4 flex justify-between items-center bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <LayoutTemplate className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">
                    {PAGES.find(p => p.id === selectedPage)?.label || 'Homepage'} — {platform === 'web' ? 'Website' : 'Mobile App'}
                  </h2>
                  <p className="text-[10px] text-slate-500">{sections.length} sections · Drag to reorder</p>
                </div>
              </div>
              <button onClick={() => setShowTypeMenu(true)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold" title="Add Section">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {isLoading && (
              <div className="absolute inset-0 bg-slate-50/80 z-10 flex items-center justify-center rounded-xl backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            )}

            {sections.length === 0 && !isLoading ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-sm">No sections defined for this page yet.</p>
                <button onClick={() => setShowTypeMenu(true)} className="mt-4 text-green-600 font-bold text-sm hover:underline">Create First Section</button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {sections.map(section => (
                    <SortableRow
                      key={section.id}
                      id={section.id}
                      section={section}
                      onEdit={() => setEditingSection(section)}
                      onDelete={() => setSections(prev => prev.filter(s => s.id !== section.id))}
                      onToggle={() => setSections(prev => prev.map(s => s.id === section.id ? { ...s, visible: s.visible === false ? true : false } : s))}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            {/* Add Section CTA */}
            <button onClick={() => setShowTypeMenu(true)} className="w-full mt-3 border-2 border-dashed border-slate-300 rounded-xl py-4 flex flex-col items-center justify-center text-slate-400 hover:text-green-600 hover:border-green-400 hover:bg-green-50/30 transition-colors">
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Add New Section</span>
            </button>
          </div>
        </div>

        {/* ── Right Preview (Phone Mockup) ─────────────────────────────── */}
        <div className="hidden xl:block w-[280px] shrink-0">
          <div className="sticky top-20">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Live Preview</label>
            <div className="bg-white border-[6px] border-slate-900 rounded-[2.5rem] h-[620px] overflow-hidden shadow-2xl relative">
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-2xl w-28 mx-auto z-10 flex justify-center items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="w-8 h-1.5 rounded-full bg-slate-800" />
              </div>
              {/* Screen */}
              <div className="bg-slate-50 w-full h-full p-3 overflow-y-auto space-y-2 pt-8 scrollbar-none">
                {/* Mini header */}
                <div className="bg-green-600 rounded-lg p-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-white/20 rounded" />
                    <div className="flex-1 bg-white/20 h-5 rounded-lg" />
                  </div>
                </div>
                {visibleSections.map(s => (
                  <div
                    key={s.id}
                    className={`rounded-lg w-full flex items-center justify-center font-bold text-[9px] border-2 px-2 text-center ${PREVIEW_HEIGHTS[s.type] || 'h-[40px]'} ${PREVIEW_COLORS[s.type] || 'bg-slate-50 border-slate-200 text-slate-400'}`}
                  >
                    {s.emoji && <span className="mr-1">{s.emoji}</span>}
                    {s.title.length > 20 ? s.title.substring(0, 18) + '…' : s.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Type Menu Modal */}
      <SectionTypeMenu
        isOpen={showTypeMenu}
        onClose={() => setShowTypeMenu(false)}
        onSelect={handleAddSection}
      />

      {/* Section Editor Modal */}
      {editingSection && (
        <GrocerySectionEditor
          section={editingSection}
          onClose={() => setEditingSection(null)}
          onSave={(updated) => {
            setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
            setEditingSection(null);
          }}
        />
      )}
    </div>
  );
}
