'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CATEGORIES as INIT_CATEGORIES, HERO_BANNERS as INIT_HERO_BANNERS, CAMPAIGN_BANNERS as INIT_CAMPAIGN_BANNERS, COUNTRY_BANNERS as INIT_COUNTRY_BANNERS, FLASH_DEALS as INIT_FLASH_DEALS, DEALS_OF_DAY as INIT_DEALS_OF_DAY, NEW_ARRIVALS as INIT_NEW_ARRIVALS, BEST_SELLERS as INIT_BEST_SELLERS, TRENDING_PRODUCTS as INIT_TRENDING, RECOMMENDED as INIT_RECOMMENDED, SPONSORED_PRODUCTS as INIT_SPONSORED, TRUST_BADGES as INIT_TRUST_BADGES, MARKETPLACE_FAQ as INIT_FAQ } from '@/lib/demo-data/marketplace-home';
import type { HomeCategory, HomeProduct, CampaignBanner, CountryBanner } from '@/lib/marketplace/types';

// ─── Extended Types ──────────────────────────────────────────────────────────

export interface HeroBanner {
  id: string;
  tag: string;
  headline: string;
  cta: string;
  ctaHref: string;
  gradient: string;
  status: 'active' | 'inactive';
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  countries?: string[];
  imageUrl?: string;
}

export interface ExtendedCampaignBanner extends CampaignBanner {
  status: 'active' | 'inactive';
  sortOrder: number;
  startDate?: string;
  endDate?: string;
}

export interface ExtendedCountryBanner extends CountryBanner {
  status: 'active' | 'inactive';
  sortOrder: number;
}

export interface FeaturedSection {
  key: string;
  label: string;
  products: HomeProduct[];
  maxItems: number;
  isScheduled: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SubcategoryItem {
  id: string;
  name: string;
  slug: string;
  parentCategoryId: string;
  icon?: string;
  imageUrl?: string;
  status: 'active' | 'inactive';
  sortOrder: number;
  productCount: number;
  seo?: { metaTitle: string; metaDescription: string };
}

export interface ExtendedCategory extends HomeCategory {
  slug: string;
  description?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
  status: 'active' | 'inactive';
  featured: boolean;
  countries: string[];
  seo?: { metaTitle: string; metaDescription: string; keywords?: string; ogImage?: string };
}

export interface MarketplaceSEOPage {
  id: string;
  page: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  keywords?: string;
  ogImage?: string;
  schemaType?: string;
}

// ─── Hydrate initial data with extended fields ───────────────────────────────

const hydrateHeroBanners = (): HeroBanner[] =>
  INIT_HERO_BANNERS.map((b, i) => ({
    ...b, status: 'active' as const, sortOrder: i + 1, countries: ['India', 'UAE', 'UK', 'SA', 'QA'],
  }));

const hydrateCampaignBanners = (): ExtendedCampaignBanner[] =>
  INIT_CAMPAIGN_BANNERS.map((b, i) => ({
    ...b, status: 'active' as const, sortOrder: i + 1,
  }));

const hydrateCountryBanners = (): ExtendedCountryBanner[] =>
  INIT_COUNTRY_BANNERS.map((b, i) => ({
    ...b, status: 'active' as const, sortOrder: i + 1,
  }));

const hydrateCategories = (): ExtendedCategory[] =>
  INIT_CATEGORIES.map(c => ({
    ...c,
    slug: c.id,
    status: 'active' as const,
    featured: ['mobiles-tablets', 'electronics', 'fashion', 'beauty'].includes(c.id),
    countries: ['India', 'UAE', 'UK', 'SA', 'QA'],
    seo: {
      metaTitle: `Buy ${c.label} Online – Best Deals | KARTSEEK`,
      metaDescription: `Shop ${c.label.toLowerCase()} online at best prices. ${c.productCount?.toLocaleString()} products from verified sellers.`,
    },
  }));

const hydrateFeaturedSections = (): FeaturedSection[] => [
  { key: 'flash-deals', label: 'Flash Deals', products: [...INIT_FLASH_DEALS], maxItems: 10, isScheduled: true, startDate: '2026-06-17', endDate: '2026-06-18' },
  { key: 'deals-of-day', label: 'Deals of the Day', products: [...INIT_DEALS_OF_DAY], maxItems: 10, isScheduled: true },
  { key: 'new-arrivals', label: 'New Arrivals', products: [...INIT_NEW_ARRIVALS], maxItems: 10, isScheduled: false },
  { key: 'best-sellers', label: 'Best Sellers', products: [...INIT_BEST_SELLERS], maxItems: 10, isScheduled: false },
  { key: 'trending', label: 'Trending Now', products: [...INIT_TRENDING], maxItems: 10, isScheduled: false },
  { key: 'recommended', label: 'Recommended', products: [...INIT_RECOMMENDED], maxItems: 10, isScheduled: false },
  { key: 'sponsored', label: 'Sponsored Products', products: [...INIT_SPONSORED], maxItems: 10, isScheduled: false },
];

const hydrateSubcategories = (): SubcategoryItem[] => {
  const items: SubcategoryItem[] = [];
  let counter = 0;
  INIT_CATEGORIES.forEach(cat => {
    cat.subcategories.forEach((sub, i) => {
      // Deterministic product count to avoid server/client hydration mismatch
      const seed = (counter * 2654435761) >>> 0; // Knuth multiplicative hash
      const productCount = (seed % 2800) + 200;
      counter++;
      items.push({
        id: `${cat.id}-sub-${i}`,
        name: sub,
        slug: sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
        parentCategoryId: cat.id,
        status: 'active',
        sortOrder: i + 1,
        productCount,
      });
    });
  });
  return items;
};

const hydrateSEOPages = (): MarketplaceSEOPage[] => {
  const pages: MarketplaceSEOPage[] = [
    { id: 'seo-home', page: 'Marketplace Home', slug: '/marketplace', metaTitle: 'KARTSEEK Marketplace – Shop Electronics, Fashion & More', metaDescription: 'Shop the best products from verified sellers. Free delivery, easy returns, secure payments.', schemaType: 'WebSite' },
    { id: 'seo-sellers', page: 'All Sellers', slug: '/marketplace/sellers', metaTitle: 'Official Seller Stores – Verified Sellers | KARTSEEK', metaDescription: 'Browse official stores from verified sellers on KARTSEEK marketplace.', schemaType: 'ItemList' },
    { id: 'seo-offers', page: 'Offers & Deals', slug: '/marketplace/offers', metaTitle: 'Best Offers & Deals – Up to 70% Off | KARTSEEK', metaDescription: 'Discover the hottest deals and discounts across all categories on KARTSEEK.', schemaType: 'OfferCatalog' },
    { id: 'seo-search', page: 'Search Results', slug: '/marketplace/search', metaTitle: 'Search Results | KARTSEEK Marketplace', metaDescription: 'Find exactly what you need from millions of products on KARTSEEK.', schemaType: 'SearchResultsPage' },
  ];
  INIT_CATEGORIES.forEach(cat => {
    pages.push({
      id: `seo-cat-${cat.id}`,
      page: `Category: ${cat.label}`,
      slug: `/marketplace/category/${cat.id}`,
      metaTitle: `Buy ${cat.label} Online – Best Deals | KARTSEEK`,
      metaDescription: `Shop ${cat.label.toLowerCase()} online at best prices. ${cat.productCount?.toLocaleString()} products from verified sellers.`,
      schemaType: 'CollectionPage',
    });
  });
  return pages;
};

// ─── Context ─────────────────────────────────────────────────────────────────

interface MarketplaceContextValue {
  // Banners
  heroBanners: HeroBanner[];
  campaignBanners: ExtendedCampaignBanner[];
  countryBanners: ExtendedCountryBanner[];
  setHeroBanners: (b: HeroBanner[]) => void;
  setCampaignBanners: (b: ExtendedCampaignBanner[]) => void;
  setCountryBanners: (b: ExtendedCountryBanner[]) => void;
  addHeroBanner: (b: Omit<HeroBanner, 'id'>) => void;
  updateHeroBanner: (id: string, data: Partial<HeroBanner>) => void;
  deleteHeroBanner: (id: string) => void;

  // Categories
  categories: ExtendedCategory[];
  setCategories: (c: ExtendedCategory[]) => void;
  updateCategory: (id: string, data: Partial<ExtendedCategory>) => void;
  addCategory: (c: Omit<ExtendedCategory, 'id'>) => void;

  // Subcategories
  subcategories: SubcategoryItem[];
  setSubcategories: (s: SubcategoryItem[]) => void;
  addSubcategory: (s: Omit<SubcategoryItem, 'id'>) => void;
  updateSubcategory: (id: string, data: Partial<SubcategoryItem>) => void;
  deleteSubcategory: (id: string) => void;

  // Featured sections
  featuredSections: FeaturedSection[];
  setFeaturedSections: (s: FeaturedSection[]) => void;
  updateFeaturedSection: (key: string, data: Partial<FeaturedSection>) => void;

  // SEO
  seoPages: MarketplaceSEOPage[];
  setSeoPages: (s: MarketplaceSEOPage[]) => void;
  updateSEOPage: (id: string, data: Partial<MarketplaceSEOPage>) => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>(hydrateHeroBanners);
  const [campaignBanners, setCampaignBanners] = useState<ExtendedCampaignBanner[]>(hydrateCampaignBanners);
  const [countryBanners, setCountryBanners] = useState<ExtendedCountryBanner[]>(hydrateCountryBanners);
  const [categories, setCategories] = useState<ExtendedCategory[]>(hydrateCategories);
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>(hydrateSubcategories);
  const [featuredSections, setFeaturedSections] = useState<FeaturedSection[]>(hydrateFeaturedSections);
  const [seoPages, setSeoPages] = useState<MarketplaceSEOPage[]>(hydrateSEOPages);

  // Banner mutations
  const addHeroBanner = useCallback((b: Omit<HeroBanner, 'id'>) => {
    setHeroBanners(prev => [...prev, { ...b, id: `banner-${Date.now()}` }]);
  }, []);
  const updateHeroBanner = useCallback((id: string, data: Partial<HeroBanner>) => {
    setHeroBanners(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  }, []);
  const deleteHeroBanner = useCallback((id: string) => {
    setHeroBanners(prev => prev.filter(b => b.id !== id));
  }, []);

  // Category mutations
  const addCategory = useCallback((c: Omit<ExtendedCategory, 'id'>) => {
    setCategories(prev => [...prev, { ...c, id: c.slug || `cat-${Date.now()}` }]);
  }, []);
  const updateCategory = useCallback((id: string, data: Partial<ExtendedCategory>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  // Subcategory mutations
  const addSubcategory = useCallback((s: Omit<SubcategoryItem, 'id'>) => {
    setSubcategories(prev => [...prev, { ...s, id: `sub-${Date.now()}` }]);
  }, []);
  const updateSubcategory = useCallback((id: string, data: Partial<SubcategoryItem>) => {
    setSubcategories(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);
  const deleteSubcategory = useCallback((id: string) => {
    setSubcategories(prev => prev.filter(s => s.id !== id));
  }, []);

  // Featured sections
  const updateFeaturedSection = useCallback((key: string, data: Partial<FeaturedSection>) => {
    setFeaturedSections(prev => prev.map(s => s.key === key ? { ...s, ...data } : s));
  }, []);

  // SEO
  const updateSEOPage = useCallback((id: string, data: Partial<MarketplaceSEOPage>) => {
    setSeoPages(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);

  return (
    <MarketplaceContext.Provider value={{
      heroBanners, campaignBanners, countryBanners,
      setHeroBanners, setCampaignBanners, setCountryBanners,
      addHeroBanner, updateHeroBanner, deleteHeroBanner,
      categories, setCategories, updateCategory, addCategory,
      subcategories, setSubcategories, addSubcategory, updateSubcategory, deleteSubcategory,
      featuredSections, setFeaturedSections, updateFeaturedSection,
      seoPages, setSeoPages, updateSEOPage,
    }}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return ctx;
}
