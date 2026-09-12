'use client';

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
  Plus,
  Save,
  Loader2,
  AlertCircle,
  LayoutTemplate,
  Eye,
  Smartphone,
  Monitor,
  GripVertical,
  Edit,
  Trash2,
  Image,
  Package,
  Tag,
  LayoutGrid,
  Megaphone,
  HelpCircle,
  FileText,
  Code,
  Crown,
  TrendingUp,
  Award,
  CheckCircle,
  EyeOff,
  Zap,
  ShieldCheck,
  MapPin,
  Star,
  ShoppingBag,
} from 'lucide-react';
import { MarketplaceSectionTypeMenu } from './components/marketplace-section-type-menu';
import { MarketplaceSectionEditor } from './components/marketplace-section-editor';
import type { MarketplaceSectionTypeOption } from './components/marketplace-section-type-menu';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';

// ── Pages available for editing ──────────────────────────────────────────

const PAGES = [
  { id: 'homepage', label: 'Homepage', icon: LayoutTemplate },
  { id: 'category', label: 'Category Page', icon: LayoutGrid },
  { id: 'product-detail', label: 'Product Detail', icon: Package },
  { id: 'checkout', label: 'Checkout', icon: ShoppingBag },
];

// ── Default sections for Marketplace Homepage ────────────────────────────

const DEFAULT_HOMEPAGE_SECTIONS = [
  {
    id: 'sec-hero',
    type: 'hero_slider',
    title: 'Hero Banner Slider',
    visible: true,
    banners: [
      {
        id: 'b1',
        tag: 'MEGA SALE',
        headline: 'Up to 70% Off\nOn Top Brands',
        subheadline: 'Electronics, Fashion, Home & more',
        cta: 'Shop Now',
        ctaHref: '/marketplace',
        gradient: 'from-blue-600 to-indigo-700',
      },
      {
        id: 'b2',
        tag: 'FASHION FEST',
        headline: 'New Season Styles\nMin 30% Off',
        subheadline: 'Latest trends from top brands',
        cta: 'Explore Fashion',
        ctaHref: '/marketplace/category/fashion',
        gradient: 'from-rose-600 to-pink-600',
      },
      {
        id: 'b3',
        tag: 'TECH DEALS',
        headline: 'Gadget Fest\nFlat 40% Off',
        subheadline: 'Smartphones, Laptops, Accessories',
        cta: 'Shop Electronics',
        ctaHref: '/marketplace/category/electronics',
        gradient: 'from-violet-600 to-purple-700',
      },
    ],
  },
  { id: 'sec-trust', type: 'trust_badges', title: 'Trust Badges', visible: true },
  {
    id: 'sec-categories',
    type: 'category_grid',
    title: 'Shop by Category',
    subtitle: 'Explore 20+ categories',
    viewAllHref: '/marketplace/category-list',
    visible: true,
  },
  {
    id: 'sec-flash',
    type: 'flash_deals',
    title: 'Flash Deals',
    viewAllHref: '/marketplace/offers',
    visible: true,
  },
  {
    id: 'sec-electronics',
    type: 'product_section',
    title: 'Best of Electronics',
    subtitle: 'Top-rated tech products',
    categoryKey: 'electronics',
    viewAllHref: '/marketplace/category/electronics',
    iconName: 'Laptop',
    showBrandCards: true,
    brandCategory: 'electronics',
    visible: true,
  },
  {
    id: 'sec-campaign1',
    type: 'campaign_banner',
    title: 'Summer Sale',
    tag: 'SUMMER SALE',
    headline: 'Beat the Heat',
    subheadline: 'ACs, Coolers, Summer Wear — Up to 60% Off',
    cta: 'Shop Summer',
    ctaHref: '/marketplace/offers',
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    icon: 'Sun',
    visible: true,
  },
  {
    id: 'sec-fashion',
    type: 'product_section',
    title: 'Fashion Store',
    subtitle: 'Latest trends & styles',
    categoryKey: 'fashion',
    viewAllHref: '/marketplace/category/fashion',
    iconName: 'Shirt',
    showBrandCards: true,
    brandCategory: 'fashion',
    visible: true,
  },
  {
    id: 'sec-home',
    type: 'product_section',
    title: 'Home & Kitchen',
    subtitle: 'Everything for your home',
    categoryKey: 'home-kitchen',
    viewAllHref: '/marketplace/category/home-kitchen',
    iconName: 'Sofa',
    showBrandCards: true,
    brandCategory: 'home',
    visible: true,
  },
  {
    id: 'sec-campaign2',
    type: 'campaign_banner',
    title: 'Back to School',
    tag: 'BACK TO SCHOOL',
    headline: 'Gear Up for Success',
    subheadline: 'Stationery, Bags, Laptops — Starting ₹99',
    cta: 'Shop Now',
    ctaHref: '/marketplace/category/books-stationery',
    gradient: 'from-purple-600 via-violet-600 to-indigo-600',
    icon: 'GraduationCap',
    visible: true,
  },
  {
    id: 'sec-beauty',
    type: 'product_section',
    title: 'Beauty & Personal Care',
    subtitle: 'Skincare, makeup & grooming',
    categoryKey: 'beauty',
    viewAllHref: '/marketplace/category/beauty',
    iconName: 'Sparkles',
    showBrandCards: true,
    brandCategory: 'beauty',
    visible: true,
  },
  {
    id: 'sec-sports',
    type: 'product_section',
    title: 'Sports & Fitness',
    subtitle: 'Gear up for performance',
    categoryKey: 'sports',
    viewAllHref: '/marketplace/category/sports',
    iconName: 'Dumbbell',
    showBrandCards: true,
    brandCategory: 'sports',
    visible: true,
  },
  {
    id: 'sec-toys',
    type: 'product_section',
    title: 'Toys & Baby Products',
    subtitle: 'Fun for all ages',
    categoryKey: 'toys-baby',
    viewAllHref: '/marketplace/category/toys-baby',
    iconName: 'Baby',
    showBrandCards: true,
    brandCategory: 'toys',
    visible: true,
  },
  {
    id: 'sec-appliances',
    type: 'product_section',
    title: 'Appliances',
    subtitle: 'Smart home essentials',
    categoryKey: 'appliances',
    viewAllHref: '/marketplace/category/appliances',
    iconName: 'Tv',
    showBrandCards: true,
    brandCategory: 'appliances',
    visible: true,
  },
  {
    id: 'sec-trending',
    type: 'product_section',
    title: 'Trending Now',
    subtitle: 'What everyone is buying',
    categoryKey: 'trending',
    viewAllHref: '/marketplace/trending',
    iconName: 'TrendingUp',
    borderAccent: 'bg-linear-to-r from-violet-500 via-purple-500 to-fuchsia-500',
    visible: true,
  },
  {
    id: 'sec-new',
    type: 'product_section',
    title: 'New Arrivals',
    subtitle: 'Just landed on KARTSEEK',
    categoryKey: 'new-arrivals',
    viewAllHref: '/marketplace/new-arrivals',
    iconName: 'Sparkles',
    borderAccent: 'bg-linear-to-r from-blue-500 via-cyan-500 to-teal-500',
    visible: true,
  },
  {
    id: 'sec-best',
    type: 'product_section',
    title: 'Best Sellers',
    subtitle: 'Top-rated by customers',
    categoryKey: 'best-sellers',
    viewAllHref: '/marketplace/best-sellers',
    iconName: 'Award',
    borderAccent: 'bg-linear-to-r from-amber-500 via-yellow-500 to-orange-500',
    visible: true,
  },
  {
    id: 'sec-deals',
    type: 'product_section',
    title: 'Deals of the Day',
    subtitle: 'Massive savings, limited time',
    categoryKey: 'deals',
    viewAllHref: '/marketplace/deals',
    iconName: 'Flame',
    borderAccent: 'bg-linear-to-r from-red-500 via-rose-500 to-pink-500',
    visible: true,
  },
  {
    id: 'sec-recommended',
    type: 'product_section',
    title: 'Recommended For You',
    subtitle: 'Personalized picks',
    categoryKey: 'recommended',
    viewAllHref: '/marketplace/recommended',
    iconName: 'Heart',
    visible: true,
  },
  {
    id: 'sec-sponsored',
    type: 'sponsored_products',
    title: 'Sponsored Products',
    subtitle: 'Featured by sellers',
    visible: true,
  },
  {
    id: 'sec-country',
    type: 'country_banners',
    title: 'Shop by Country',
    subtitle: 'Localized experience, local delivery',
    visible: true,
  },
  {
    id: 'sec-all-cat',
    type: 'category_grid',
    title: 'Explore All Categories',
    subtitle: 'Browse everything',
    viewAllHref: '/marketplace/category-list',
    visible: true,
  },
  {
    id: 'sec-faq',
    type: 'faq',
    title: 'Frequently Asked Questions',
    visible: true,
    items: [
      {
        q: 'How fast is delivery?',
        a: 'We offer standard delivery in 2-5 days and express delivery in 1-2 days depending on your location.',
      },
      {
        q: 'What is the return policy?',
        a: '7-day hassle-free returns on most products. Some categories may have different policies.',
      },
      {
        q: 'Are all products genuine?',
        a: 'Yes. Every seller on KARTSEEK is verified, and we guarantee 100% authentic products.',
      },
      {
        q: 'How do I become a seller?',
        a: 'Visit our Seller Portal to register. Our team will review your application within 24-48 hours.',
      },
    ],
  },
  {
    id: 'sec-seo',
    type: 'seo_footer',
    title: 'KARTSEEK Marketplace — Shop Online',
    visible: true,
    description:
      'KARTSEEK Marketplace is your one-stop online shopping destination. Shop electronics, fashion, home & kitchen, beauty, sports, toys and more from verified sellers with fast delivery and secure payment.',
    tags: [
      'Online Shopping',
      'Electronics',
      'Fashion',
      'Home & Kitchen',
      'Beauty',
      'Sports',
      'Free Delivery',
      'Genuine Products',
    ],
  },
];

// ── Sortable Section Row ─────────────────────────────────────────────────

function SortableRow({
  id,
  section,
  onEdit,
  onDelete,
  onToggle,
}: {
  id: string;
  section: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const getIcon = () => {
    switch (section.type) {
      case 'hero_slider':
        return <Image className="w-4 h-4 text-indigo-500" />;
      case 'trust_badges':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'category_grid':
        return <LayoutGrid className="w-4 h-4 text-teal-500" />;
      case 'flash_deals':
        return <Zap className="w-4 h-4 text-red-500" />;
      case 'product_section':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'campaign_banner':
        return <Megaphone className="w-4 h-4 text-rose-500" />;
      case 'brand_promo_row':
        return <Award className="w-4 h-4 text-purple-500" />;
      case 'country_banners':
        return <MapPin className="w-4 h-4 text-cyan-500" />;
      case 'sponsored_products':
        return <Star className="w-4 h-4 text-amber-500" />;
      case 'faq':
        return <HelpCircle className="w-4 h-4 text-sky-500" />;
      case 'seo_footer':
        return <FileText className="w-4 h-4 text-slate-500" />;
      case 'custom_html':
        return <Code className="w-4 h-4 text-gray-500" />;
      default:
        return <Tag className="w-4 h-4 text-slate-400" />;
    }
  };

  const isHidden = section.visible === false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-xl shadow-sm mb-2 flex items-center px-3 py-2.5 gap-3 group transition-colors ${isHidden ? 'border-slate-200 opacity-60 bg-slate-50' : 'border-slate-200'}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab p-0.5 text-slate-400 hover:text-slate-600 active:cursor-grabbing focus:outline-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-800 text-xs truncate">{section.title}</h3>
        <p className="text-[10px] text-slate-400 capitalize">
          {section.type?.replace(/_/g, ' ')}
          {section.categoryKey ? ` · ${section.categoryKey}` : ''}
        </p>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onToggle}
          aria-label={isHidden ? 'Show section' : 'Hide section'}
          className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
        >
          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onEdit}
          aria-label="Edit section"
          className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete section"
          className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Phone Preview Colors ─────────────────────────────────────────────────

const PREVIEW_COLORS: Record<string, string> = {
  hero_slider: 'bg-indigo-100 border-indigo-200 text-indigo-500',
  trust_badges: 'bg-emerald-50 border-emerald-200 text-emerald-500',
  category_grid: 'bg-teal-50 border-teal-200 text-teal-400',
  flash_deals: 'bg-red-50 border-red-200 text-red-500',
  product_section: 'bg-blue-50 border-blue-200 text-blue-500',
  campaign_banner: 'bg-rose-50 border-rose-200 text-rose-400',
  brand_promo_row: 'bg-purple-50 border-purple-200 text-purple-400',
  country_banners: 'bg-cyan-50 border-cyan-200 text-cyan-400',
  sponsored_products: 'bg-amber-50 border-amber-200 text-amber-400',
  faq: 'bg-sky-50 border-sky-200 text-sky-400',
  seo_footer: 'bg-slate-50 border-slate-200 text-slate-400',
  custom_html: 'bg-gray-50 border-gray-200 text-gray-400',
};

const PREVIEW_HEIGHTS: Record<string, string> = {
  hero_slider: 'h-[100px]',
  trust_badges: 'h-[30px]',
  category_grid: 'h-[50px]',
  flash_deals: 'h-[60px]',
  product_section: 'h-[55px]',
  campaign_banner: 'h-[45px]',
  brand_promo_row: 'h-[35px]',
  country_banners: 'h-[40px]',
  sponsored_products: 'h-[55px]',
  faq: 'h-[40px]',
  seo_footer: 'h-[30px]',
  custom_html: 'h-[40px]',
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MARKETPLACE PAGE BUILDER — MAIN PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default function MarketplacePageBuilder() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);

  const [selectedPage, setSelectedPage] = useState('homepage');
  const [platform, setPlatform] = useState<'web' | 'mobile'>('web');
  const [sections, setSections] = useState<any[]>(DEFAULT_HOMEPAGE_SECTIONS);
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
    showToast,
  } = useAdminData(() => adminMarketplaceApi.getPageLayout(country), [country]);
  const { execute } = useAdminAction(showToast);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Load sections when page/platform changes
  useEffect(() => {
    setIsLoading(true);
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
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleAddSection = useCallback((option: MarketplaceSectionTypeOption) => {
    const newSection = {
      ...option.defaultData,
      id: `sec-${Date.now()}`,
      type: option.type,
      visible: true,
    };
    setSections((prev) => [...prev, newSection]);
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    setMessage('');
    setTimeout(() => {
      setIsSaving(false);
      setMessage('Layout saved! Changes are live on the marketplace page.');
      setTimeout(() => setMessage(''), 4000);
    }, 800);
  }, []);

  const visibleSections = sections.filter((s) => s.visible !== false);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Marketplace Page Builder</h1>
          <p className="text-sm text-slate-500">
            Design and manage all marketplace module pages with full CMS control
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span
              className={`text-sm font-medium flex items-center gap-1 ${message.includes('Error') ? 'text-rose-500' : 'text-emerald-600'}`}
            >
              {!message.includes('Error') && <CheckCircle className="w-4 h-4" />}
              {message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
            aria-label="Loading"
          >
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Page
            </label>
            <div className="space-y-1">
              {PAGES.map((page) => {
                const Icon = page.icon;
                return (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(page.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                      selectedPage === page.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Platform
            </label>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setPlatform('web')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                  platform === 'web'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Web
              </button>
              <button
                onClick={() => setPlatform('mobile')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                  platform === 'mobile'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Layout Stats
            </label>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total sections</span>
              <span className="font-bold text-slate-900">{sections.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Visible</span>
              <span className="font-bold text-blue-600">{visibleSections.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Hidden</span>
              <span className="font-bold text-slate-400">
                {sections.length - visibleSections.length}
              </span>
            </div>
          </div>

          {/* Seller Sync Status */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Seller Sync
            </label>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-700 font-medium">Connected</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Seller products auto-inject into matching category sections
            </p>
          </div>
        </div>

        {/* ── Center Canvas ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 min-h-[700px] relative">
            {/* Canvas Header */}
            <div className="mb-4 flex justify-between items-center bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <LayoutTemplate className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">
                    {PAGES.find((p) => p.id === selectedPage)?.label || 'Homepage'} —{' '}
                    {platform === 'web' ? 'Website' : 'Mobile App'}
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    {sections.length} sections · Drag to reorder
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTypeMenu(true)}
                className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Add Section"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {isLoading && (
              <div className="absolute inset-0 bg-slate-50/80 z-10 flex items-center justify-center rounded-xl backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {sections.length === 0 && !isLoading ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-sm">
                  No sections defined for this page yet.
                </p>
                <button
                  onClick={() => setShowTypeMenu(true)}
                  className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                >
                  Create First Section
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sections.map((section) => (
                    <SortableRow
                      key={section.id}
                      id={section.id}
                      section={section}
                      onEdit={() => setEditingSection(section)}
                      onDelete={() =>
                        setSections((prev) => prev.filter((s) => s.id !== section.id))
                      }
                      onToggle={() =>
                        setSections((prev) =>
                          prev.map((s) =>
                            s.id === section.id
                              ? { ...s, visible: s.visible === false ? true : false }
                              : s,
                          ),
                        )
                      }
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            {/* Add Section CTA */}
            <button
              onClick={() => setShowTypeMenu(true)}
              className="w-full mt-3 border-2 border-dashed border-slate-300 rounded-xl py-4 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Add New Section</span>
            </button>
          </div>
        </div>

        {/* ── Right Preview (Phone Mockup) ─────────────────────────────── */}
        <div className="hidden xl:block w-[280px] shrink-0">
          <div className="sticky top-20">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Live Preview
            </label>
            <div className="bg-white border-[6px] border-slate-900 rounded-[2.5rem] h-[620px] overflow-hidden shadow-2xl relative">
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-2xl w-28 mx-auto z-10 flex justify-center items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="w-8 h-1.5 rounded-full bg-slate-800" />
              </div>
              {/* Screen */}
              <div className="bg-slate-50 w-full h-full p-3 overflow-y-auto space-y-2 pt-8 scrollbar-none">
                {/* Mini header */}
                <div className="bg-blue-600 rounded-lg p-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-white/20 rounded" />
                    <div className="flex-1 bg-white/20 h-5 rounded-lg" />
                  </div>
                </div>
                {visibleSections.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-lg w-full flex items-center justify-center font-bold text-[9px] border-2 px-2 text-center ${PREVIEW_HEIGHTS[s.type] || 'h-[40px]'} ${PREVIEW_COLORS[s.type] || 'bg-slate-50 border-slate-200 text-slate-400'}`}
                  >
                    {s.title.length > 20 ? s.title.substring(0, 18) + '…' : s.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Type Menu Modal */}
      <MarketplaceSectionTypeMenu
        isOpen={showTypeMenu}
        onClose={() => setShowTypeMenu(false)}
        onSelect={handleAddSection}
      />

      {/* Section Editor Modal */}
      {editingSection && (
        <MarketplaceSectionEditor
          section={editingSection}
          onClose={() => setEditingSection(null)}
          onSave={(updated) => {
            setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setEditingSection(null);
          }}
        />
      )}
      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}
      <AdminToast toast={toast} />
    </div>
  );
}
