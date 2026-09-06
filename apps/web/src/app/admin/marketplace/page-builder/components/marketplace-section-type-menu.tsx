'use client';

import React from 'react';
import {
  Image, Package, Tag, LayoutGrid, Megaphone, HelpCircle,
  FileText, Code, X, Sparkles, Crown, TrendingUp, Award,
  Zap, ShieldCheck, MapPin, Star,
} from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
export interface MarketplaceSectionTypeOption {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  defaultData: Record<string, any>;
}

export const MARKETPLACE_SECTION_TYPES: MarketplaceSectionTypeOption[] = [
  {
    type: 'hero_slider',
    label: 'Hero Banner Slider',
    description: 'Full-width promotional carousel with CTA buttons',
    icon: Image,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    defaultData: {
      title: 'Hero Banner Slider',
      banners: [
        { id: `b-${Date.now()}`, tag: 'NEW', headline: 'Mega Sale\nUp to 70% Off', subheadline: 'On Electronics, Fashion & more', cta: 'Shop Now', ctaHref: '/marketplace', gradient: 'from-blue-600 to-indigo-700' },
      ],
    },
  },
  {
    type: 'trust_badges',
    label: 'Trust Badges Bar',
    description: 'Free delivery, secure payment, returns guarantee bar',
    icon: ShieldCheck,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    defaultData: {
      title: 'Trust Badges',
    },
  },
  {
    type: 'category_grid',
    label: 'Category Grid',
    description: 'Grid of 20 shopping categories with icons',
    icon: LayoutGrid,
    color: 'bg-teal-50 text-teal-600 border-teal-200',
    defaultData: {
      title: 'Shop by Category',
      subtitle: 'Explore 20+ categories',
      viewAllHref: '/marketplace/category-list',
    },
  },
  {
    type: 'flash_deals',
    label: 'Flash Deals',
    description: 'Time-limited deals with countdown timer',
    icon: Zap,
    color: 'bg-red-50 text-red-600 border-red-200',
    defaultData: {
      title: 'Flash Deals',
      viewAllHref: '/marketplace/offers',
    },
  },
  {
    type: 'product_section',
    label: 'Product Section',
    description: 'Category product grid with optional brand cards (Electronics, Fashion, etc.)',
    icon: Package,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    defaultData: {
      title: 'Product Section',
      subtitle: 'Top-rated products',
      categoryKey: 'electronics',
      viewAllHref: '/marketplace/category/electronics',
      iconName: 'Laptop',
      showBrandCards: true,
      brandCategory: 'electronics',
    },
  },
  {
    type: 'campaign_banner',
    label: 'Campaign Banner',
    description: 'Mid-page gradient promotional banner with CTA',
    icon: Megaphone,
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    defaultData: {
      title: 'Summer Sale',
      tag: 'SUMMER SALE',
      headline: 'Beat the Heat',
      subheadline: 'ACs, Coolers, Summer Wear — Up to 60% Off',
      cta: 'Shop Summer',
      ctaHref: '/marketplace/offers',
      gradient: 'from-orange-500 via-amber-500 to-yellow-500',
      icon: 'Sun',
    },
  },
  {
    type: 'brand_promo_row',
    label: 'Brand Promo Row',
    description: 'Brand logo cards for a specific category',
    icon: Award,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    defaultData: {
      title: 'Top Brands',
      brandCategory: 'electronics',
    },
  },
  {
    type: 'country_banners',
    label: 'Country Banners',
    description: 'Localized shopping banners by country',
    icon: MapPin,
    color: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    defaultData: {
      title: 'Shop by Country',
      subtitle: 'Localized experience, local delivery',
    },
  },
  {
    type: 'sponsored_products',
    label: 'Sponsored Products',
    description: 'Featured products promoted by sellers',
    icon: Star,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    defaultData: {
      title: 'Sponsored Products',
      subtitle: 'Featured by sellers',
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
      items: [
        { q: 'How fast is delivery?', a: 'We offer standard delivery in 2-5 days and express delivery in 1-2 days depending on your location.' },
        { q: 'What is the return policy?', a: '7-day hassle-free returns on most products. Some categories may have different policies.' },
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
      title: 'KARTSEEK Marketplace — Shop Online',
      description: 'KARTSEEK Marketplace is your one-stop online shopping destination. Shop electronics, fashion, home & kitchen, beauty, sports, toys and more from verified sellers.',
      tags: ['Online Shopping', 'Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports'],
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

interface MarketplaceSectionTypeMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: MarketplaceSectionTypeOption) => void;
}

export function MarketplaceSectionTypeMenu({ isOpen, onClose, onSelect }: MarketplaceSectionTypeMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}><DismissOnEscape onDismiss={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Add Section</h2>
              <p className="text-xs text-slate-500">Choose a section type for your marketplace page</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MARKETPLACE_SECTION_TYPES.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.type}
                  onClick={() => { onSelect(option); onClose(); }}
                  className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 text-left transition-all group"
                >
                  <div className={`w-10 h-10 rounded-lg ${option.color} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 group-hover:text-blue-700 transition-colors">{option.label}</h3>
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
