'use client';

import React, { useEffect, useState } from 'react';
import {
  Zap,
  Tag,
  Sparkles,
  Crown,
  TrendingUp,
  Heart,
  Target,
  Plus,
  X,
  Trash2,
  GripVertical,
  Calendar,
  ChevronDown,
  ChevronUp,
  Star,
  Package,
  Search,
  Save,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Clock,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useMarketplace, type FeaturedSection } from '@/lib/contexts/marketplace-context';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import type { HomeProduct } from '@/lib/marketplace/types';
import { formatPrice, discountPercent } from '@/lib/marketplace/pricing';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';

const SECTION_META: Record<
  string,
  { icon: React.ElementType; color: string; accent: string; description: string }
> = {
  'flash-deals': {
    icon: Zap,
    color: 'text-red-500',
    accent: 'bg-red-50 border-red-200',
    description: 'Time-limited deals with countdown timer on homepage',
  },
  'deals-of-day': {
    icon: Tag,
    color: 'text-blue-600',
    accent: 'bg-blue-50 border-blue-200',
    description: 'Handpicked daily deals, refreshed every 24 hours',
  },
  'new-arrivals': {
    icon: Sparkles,
    color: 'text-cyan-600',
    accent: 'bg-cyan-50 border-cyan-200',
    description: 'Recently added products highlighted on homepage',
  },
  'best-sellers': {
    icon: Crown,
    color: 'text-amber-600',
    accent: 'bg-amber-50 border-amber-200',
    description: 'Most purchased products this month',
  },
  trending: {
    icon: TrendingUp,
    color: 'text-violet-600',
    accent: 'bg-violet-50 border-violet-200',
    description: 'Most searched and viewed products right now',
  },
  recommended: {
    icon: Heart,
    color: 'text-pink-600',
    accent: 'bg-pink-50 border-pink-200',
    description: 'AI-recommended products based on browsing trends',
  },
  sponsored: {
    icon: Target,
    color: 'text-slate-600',
    accent: 'bg-slate-50 border-slate-200',
    description: 'Paid placements from seller advertising',
  },
};

// ── Product Picker Modal ────────────────────────────────────────────────────

function ProductPickerModal({
  section,
  existingIds,
  onAdd,
  onClose,
}: {
  section: string;
  existingIds: string[];
  onAdd: (products: HomeProduct[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<HomeProduct[]>([]);
  const [pool, setPool] = useState<HomeProduct[]>([]);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState('');

  /**
   * Search the real catalogue.
   *
   * The picker used to filter a constant `ALL_PRODUCTS` built by spreading the
   * customer homepage's bundled fixtures. Nothing an admin could select here
   * existed in the catalogue, so featuring a product wrote an id no `products`
   * row has — and `products.is_featured`, which the storefront rail reads, was
   * never set on anything real.
   */
  useEffect(() => {
    let cancelled = false;
    setSearching(true);
    setSearchError('');
    const t = setTimeout(async () => {
      try {
        const res: any = await adminMarketplaceApi.getProducts({
          search: search || undefined,
          limit: 40,
        });
        if (cancelled) return;
        const rows: any[] = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
        setPool(
          rows.map((p: any) => ({
            id: p.id,
            title: p.name ?? p.title ?? 'Product',
            brand: p.brand?.name ?? (typeof p.brand === 'string' ? p.brand : ''),
            price: Number(p.price ?? 0),
            mrp: Number(p.mrp ?? p.price ?? 0),
            rating: Number(p.averageRating ?? p.rating ?? 0),
            reviews: String(p.reviewCount ?? p.reviews ?? 0),
            icon: '',
            imageUrl: p.imageUrl ?? p.images?.[0]?.url,
          })),
        );
      } catch (e) {
        if (!cancelled) setSearchError('Could not search the catalogue. Please try again.');
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300); // debounce: this fires on every keystroke otherwise
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  // Already-featured products are filtered out client-side; the search itself
  // is server-side so the pool is the whole catalogue, not one bundled page.
  const filtered = pool.filter((p) => !existingIds.includes(p.id));

  const toggle = (p: HomeProduct) => {
    setSelected((prev) =>
      prev.find((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-black text-slate-900">Add Products to {section}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{selected.length} selected</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or brand..."
              className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {filtered.slice(0, 30).map((p) => {
            const isSel = selected.find((x) => x.id === p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${isSel ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSel ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}
                >
                  {isSel && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{p.brand}</span>
                    <span className="text-xs font-bold text-slate-900">{formatPrice(p.price)}</span>
                    {p.mrp > p.price && (
                      <span className="text-[10px] text-green-600 font-bold">
                        {discountPercent(p.mrp, p.price)}% off
                      </span>
                    )}
                    <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      {p.rating} <Star className="w-2 h-2 fill-white" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
          {/* Three distinct states, because the search is a network call now:
              in flight, failed, and genuinely no match. Collapsing them into
              "No matching products found" would report an unreachable catalogue
              as an empty one. */}
          {searching && (
            <p className="text-center text-slate-400 text-sm py-8">Searching the catalogue…</p>
          )}
          {!searching && searchError && (
            <p role="alert" className="text-center text-red-600 text-sm py-8">
              {searchError}
            </p>
          )}
          {!searching && !searchError && filtered.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">
              {search ? `No products match “${search}”.` : 'No products in the catalogue yet.'}
            </p>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onAdd(selected);
              onClose();
            }}
            disabled={selected.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add {selected.length} Product
            {selected.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function FeaturedProductsPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);

  const { featuredSections, updateFeaturedSection } = useMarketplace();
  const [expandedSection, setExpandedSection] = useState<string | null>('flash-deals');
  const [pickerSection, setPickerSection] = useState<string | null>(null);

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
    showToast,
  } = useAdminData(() => adminMarketplaceApi.getFeaturedProducts(country), [country]);
  const { execute } = useAdminAction(showToast);

  const removeProduct = (sectionKey: string, productId: string) => {
    const section = featuredSections.find((s) => s.key === sectionKey);
    if (section) {
      updateFeaturedSection(sectionKey, {
        products: section.products.filter((p) => p.id !== productId),
      });
    }
  };

  const addProducts = (sectionKey: string, products: HomeProduct[]) => {
    const section = featuredSections.find((s) => s.key === sectionKey);
    if (section) {
      updateFeaturedSection(sectionKey, { products: [...section.products, ...products] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Featured Products</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isFiltered ? `${regionLabel} — ` : ''}Curate products for each homepage section. Add,
          remove, or reorder products. Changes reflect on the marketplace homepage.
        </p>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {featuredSections.map((s) => {
          const meta = SECTION_META[s.key];
          const Icon = meta?.icon || Package;
          return (
            <button
              key={s.key}
              onClick={() => setExpandedSection(expandedSection === s.key ? null : s.key)}
              className={`bg-white border rounded-xl p-3 shadow-sm text-left transition-all ${expandedSection === s.key ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <Icon className={`w-4 h-4 ${meta?.color || 'text-slate-500'} mb-1.5`} />
              <p className="text-lg font-black text-slate-900">{s.products.length}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight">
                {s.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Section Details */}
      {featuredSections.map((section) => {
        const meta = SECTION_META[section.key];
        const Icon = meta?.icon || Package;
        const isExpanded = expandedSection === section.key;

        return (
          <div
            key={section.key}
            className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${isExpanded ? 'border-blue-200' : 'border-slate-200'}`}
          >
            {/* Header */}
            <button
              onClick={() => setExpandedSection(isExpanded ? null : section.key)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${meta?.accent || 'bg-slate-50'} flex items-center justify-center border`}
                >
                  <Icon className={`w-5 h-5 ${meta?.color || 'text-slate-500'}`} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{section.label}</h3>
                  <p className="text-xs text-slate-400">
                    {meta?.description} · {section.products.length}/{section.maxItems} items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {section.isScheduled && section.startDate && (
                  <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Scheduled
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-slate-100">
                {/* Actions bar */}
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Layers className="w-3.5 h-3.5" />
                    {section.products.length} product{section.products.length !== 1 ? 's' : ''} in
                    this section
                  </div>
                  <button
                    onClick={() => setPickerSection(section.key)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Products
                  </button>
                </div>

                {/* Product list */}
                <div className="divide-y divide-slate-100">
                  {section.products.map((product, idx) => {
                    const discount = discountPercent(product.mrp, product.price);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors group"
                      >
                        <span className="text-xs text-slate-400 font-mono w-6 text-right">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {product.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">{product.brand}</span>
                            <span className="text-xs font-bold text-slate-900">
                              {formatPrice(product.price)}
                            </span>
                            {discount > 0 && (
                              <span className="text-[10px] text-green-600 font-bold">
                                {discount}% off
                              </span>
                            )}
                            <span className="bg-green-600 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                              {product.rating} ★
                            </span>
                            <span className="text-[10px] text-slate-400">({product.reviews})</span>
                          </div>
                        </div>
                        {product.badge && (
                          <span
                            className={`text-[8px] font-bold px-2 py-0.5 rounded-full text-white ${product.badgeColor || 'bg-slate-600'}`}
                          >
                            {product.badge}
                          </span>
                        )}
                        <button
                          onClick={() => removeProduct(section.key, product.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {section.products.length === 0 && (
                  <div className="p-8 text-center">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No products in this section</p>
                    <button
                      onClick={() => setPickerSection(section.key)}
                      className="mt-2 text-blue-600 text-sm font-bold"
                    >
                      + Add Products
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Product Picker Modal */}
      {pickerSection && (
        <ProductPickerModal
          section={featuredSections.find((s) => s.key === pickerSection)?.label || ''}
          existingIds={
            featuredSections.find((s) => s.key === pickerSection)?.products.map((p) => p.id) || []
          }
          onAdd={(products) => addProducts(pickerSection, products)}
          onClose={() => setPickerSection(null)}
        />
      )}
      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}
      <AdminToast toast={toast} />
    </div>
  );
}
