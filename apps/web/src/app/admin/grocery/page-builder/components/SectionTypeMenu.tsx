'use client';

import React from 'react';
import {
  Image, Store, Tag, LayoutGrid, Megaphone, HelpCircle,
  FileText, Code, X, Sparkles, Crown, TrendingUp, Award,
} from 'lucide-react';
import { useDismissOnEscape } from '@/lib/hooks/use-dismiss-on-escape';

export interface SectionTypeOption {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  defaultData: Record<string, any>;
}

const SECTION_TYPES: SectionTypeOption[] = [
  {
    type: 'hero_slider',
    label: 'Hero Banner Slider',
    description: 'Full-width carousel with promotional banners',
    icon: Image,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    defaultData: {
      title: 'Hero Banner Slider',
      banners: [
        { id: `b-${Date.now()}`, tag: 'NEW', headline: 'Fresh Groceries\nDelivered Fast', subheadline: 'Order from 500+ stores near you', cta: 'Shop Now', ctaHref: '/grocery', gradient: 'from-green-600 to-emerald-700', image: '' },
      ],
    },
  },
  {
    type: 'promoted_stores',
    label: 'Sponsored Stores',
    description: 'Featured promoted store carousel with gold badge',
    icon: Crown,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    defaultData: {
      title: 'Sponsored Stores',
      subtitle: 'Featured partners',
      emoji: '👑',
      sectionTag: 'promoted',
      maxItems: 6,
    },
  },
  {
    type: 'store_section',
    label: 'Store Carousel',
    description: 'Horizontal scrollable store cards (Nearby, Trending, etc.)',
    icon: Store,
    color: 'bg-green-50 text-green-600 border-green-200',
    defaultData: {
      title: 'Store Section',
      subtitle: 'Discover stores',
      emoji: '🏪',
      sectionTag: 'nearby',
      variant: 'default',
      maxItems: 10,
    },
  },
  {
    type: 'brand_row',
    label: 'Brand Row',
    description: 'Brand logo carousel for grocery brands',
    icon: Award,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    defaultData: {
      title: 'Shop by Brand',
      subtitle: 'Your favorite grocery brands',
      emoji: '🏷️',
    },
  },
  {
    type: 'category_grid',
    label: 'Category Grid',
    description: 'Grid of grocery categories for browsing',
    icon: LayoutGrid,
    color: 'bg-teal-50 text-teal-600 border-teal-200',
    defaultData: {
      title: 'Explore All Categories',
      emoji: '📂',
      columns: 4,
    },
  },
  {
    type: 'campaign_banner',
    label: 'Campaign Banner',
    description: 'Mid-page promotional banner with CTA',
    icon: Megaphone,
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    defaultData: {
      title: 'Summer Fresh Fest',
      subtitle: 'Up to 40% off on fruits, vegetables & beverages',
      tag: 'SEASONAL',
      cta: 'Shop Now',
      ctaHref: '/grocery/category/fruits-vegetables',
      gradient: 'from-green-700 via-green-600 to-emerald-500',
      emoji: '🍹🥬🍉',
    },
  },
  {
    type: 'trending_products',
    label: 'Trending Products',
    description: 'Hot-selling products across stores',
    icon: TrendingUp,
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    defaultData: {
      title: 'Trending Now',
      subtitle: 'Most ordered this week',
      emoji: '🔥',
      maxItems: 8,
    },
  },
  {
    type: 'faq',
    label: 'FAQ Section',
    description: 'Frequently asked questions accordion',
    icon: HelpCircle,
    color: 'bg-sky-50 text-sky-600 border-sky-200',
    defaultData: {
      title: 'Frequently Asked Questions',
      emoji: '❓',
      items: [
        { q: 'How fast is delivery?', a: 'We offer express delivery in 10-30 minutes and standard delivery in 30-45 minutes.' },
        { q: 'What is the minimum order?', a: 'Minimum order varies by store, typically ₹99 - ₹199.' },
      ],
    },
  },
  {
    type: 'seo_footer',
    label: 'SEO Footer',
    description: 'SEO text block with keywords for search ranking',
    icon: FileText,
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    defaultData: {
      title: 'KARTSEEK Grocery — Order Groceries Online',
      description: 'KARTSEEK Grocery is the easiest way to order groceries online. Shop from nearby stores, supermarkets, hypermarkets, and more.',
      tags: ['Grocery Delivery', 'Online Supermarket', 'Fresh Produce', 'Quick Commerce'],
    },
  },
  {
    type: 'custom_html',
    label: 'Custom Content',
    description: 'Free-form rich text or HTML content block',
    icon: Code,
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    defaultData: {
      title: 'Custom Section',
      htmlContent: '<div style="padding: 24px; text-align: center;"><h3>Custom Content</h3><p>Edit this section with your own HTML</p></div>',
    },
  },
];

interface SectionTypeMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: SectionTypeOption) => void;
}

export function SectionTypeMenu({ isOpen, onClose, onSelect }: SectionTypeMenuProps) {
  // Above the early return: hooks must run in the same order on every render,
  // and this component returns null while closed. The hook takes `isOpen` and
  // binds its listener only when open.
  useDismissOnEscape(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Add Section</h2>
              <p className="text-xs text-slate-500">Choose a section type for your grocery page</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SECTION_TYPES.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.type}
                  onClick={() => { onSelect(option); onClose(); }}
                  className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50/30 text-left transition-all group"
                >
                  <div className={`w-10 h-10 rounded-lg ${option.color} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 group-hover:text-green-700 transition-colors">{option.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export { SECTION_TYPES };
