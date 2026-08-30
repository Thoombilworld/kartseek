'use client';

/**
 * KARTSEEK — RecommendationCarousel
 *
 * Reusable horizontal carousel for displaying personalized recommendations.
 * Responsive: 2 cards on mobile, 3 on tablet, 4-5 on desktop.
 *
 * Features:
 *  - Smooth horizontal scrolling with snap points
 *  - Skeleton loading state
 *  - Reason badges ("Trending", "For You", "Order Again")
 *  - Click tracking for recommendation feedback loop
 *  - Module-specific styling via CSS custom properties
 */

import React, { useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import type { Recommendation, RecommendationModule } from '@/lib/hooks/use-recommendations';

// ─── Module → Route Mapping ─────────────────────────────────────────────────

const MODULE_ROUTES: Record<RecommendationModule, string> = {
  marketplace: '/marketplace/product',
  grocery: '/grocery/product',
  pharmacy: '/pharmacy/product',
  hotel: '/hotel-booking',
  restaurant: '/restaurant',
  doctor: '/doctor',
};

const MODULE_COLORS: Record<RecommendationModule, { bg: string; accent: string; badge: string }> = {
  marketplace: { bg: 'from-indigo-500/10 to-purple-500/10', accent: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  grocery: { bg: 'from-green-500/10 to-emerald-500/10', accent: 'text-green-600', badge: 'bg-green-100 text-green-700' },
  pharmacy: { bg: 'from-cyan-500/10 to-blue-500/10', accent: 'text-cyan-600', badge: 'bg-cyan-100 text-cyan-700' },
  hotel: { bg: 'from-amber-500/10 to-orange-500/10', accent: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  restaurant: { bg: 'from-red-500/10 to-rose-500/10', accent: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  doctor: { bg: 'from-teal-500/10 to-emerald-500/10', accent: 'text-teal-600', badge: 'bg-teal-100 text-teal-700' },
};

const REASON_ICONS: Record<string, string> = {
  recently_viewed: '👁️',
  order_history: '📦',
  trending: '🔥',
  popular_in_region: '📍',
  similar_users: '👥',
  cross_module: '✨',
  reorder: '🔄',
  search_based: '🔍',
  category_affinity: '💡',
  new_arrival: '🆕',
};

interface RecommendationCarouselProps {
  title: string;
  icon?: string;
  recommendations: Recommendation[];
  module: RecommendationModule;
  isLoading?: boolean;
  onCardClick?: (recommendation: Recommendation, position: number) => void;
  showReason?: boolean;
  className?: string;
}

export function RecommendationCarousel({
  title,
  icon,
  recommendations,
  module,
  isLoading = false,
  onCardClick,
  showReason = true,
  className = '',
}: RecommendationCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('[data-reco-card]')?.clientWidth || 220;
    el.scrollBy({ left: direction === 'left' ? -cardWidth * 2 : cardWidth * 2, behavior: 'smooth' });
  }, []);

  if (!isLoading && recommendations.length === 0) return null;

  const colors = MODULE_COLORS[module];
  const baseRoute = MODULE_ROUTES[module];

  return (
    <section className={`relative py-6 ${className}`} id={`reco-${module}-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {isLoading ? '...' : recommendations.length}
          </span>
        </div>
        {canScrollLeft || canScrollRight ? (
          <div className="flex gap-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-all"
              aria-label="Scroll left"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-all"
              aria-label="Scroll right"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        ) : null}
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={`skel-${i}`} />)
          : recommendations.map((reco, index) => (
              <RecommendationCard
                key={reco.id}
                recommendation={reco}
                index={index}
                baseRoute={baseRoute}
                colors={colors}
                showReason={showReason}
                onClick={() => onCardClick?.(reco, index)}
              />
            ))}
      </div>
    </section>
  );
}

// ─── Card Component ─────────────────────────────────────────────────────────

interface CardProps {
  recommendation: Recommendation;
  index: number;
  baseRoute: string;
  colors: { bg: string; accent: string; badge: string };
  showReason: boolean;
  onClick?: () => void;
}

function RecommendationCard({ recommendation, index, baseRoute, colors, showReason, onClick }: CardProps) {
  const { entityId, title, subtitle, imageUrl, reason, reasonLabel, metadata } = recommendation;
  const href = `${baseRoute}/${entityId}`;
  const icon = REASON_ICONS[reason] || '💡';

  return (
    <Link
      href={href}
      data-reco-card
      onClick={onClick}
      className="shrink-0 w-[180px] sm:w-[200px] md:w-[220px] snap-start group"
      id={`reco-card-${entityId}`}
    >
      <div className={`relative rounded-xl overflow-hidden bg-linear-to-br ${colors.bg} border border-gray-100 dark:border-gray-800 transition-all duration-300 group-hover:shadow-lg group-hover:scale-[1.02] group-hover:border-gray-200 dark:group-hover:border-gray-700`}>
        {/* Image */}
        <div className="relative aspect-4/3 bg-gray-100 dark:bg-gray-800 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300 dark:text-gray-600">
              {MODULE_ROUTES[recommendation.module]?.includes('grocery') ? '🥬' :
               MODULE_ROUTES[recommendation.module]?.includes('pharmacy') ? '💊' :
               MODULE_ROUTES[recommendation.module]?.includes('hotel') ? '🏨' :
               MODULE_ROUTES[recommendation.module]?.includes('restaurant') ? '🍽️' :
               MODULE_ROUTES[recommendation.module]?.includes('doctor') ? '🩺' : '🛍️'}
            </div>
          )}

          {/* Reason badge */}
          {showReason && (
            <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${colors.badge} shadow-sm`}>
              {icon} {reasonLabel.length > 25 ? reasonLabel.slice(0, 25) + '…' : reasonLabel}
            </span>
          )}

          {/* Score indicator (subtle) */}
          {recommendation.score > 0.7 && (
            <span className="absolute top-2 right-2 text-[10px] font-bold bg-yellow-400/90 text-yellow-900 px-1.5 py-0.5 rounded-full">
              ⭐ Top Pick
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{subtitle}</p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-2 mt-2">
            {metadata?.price !== undefined && (
              <span className={`text-sm font-bold ${colors.accent}`}>
                {typeof metadata.price === 'number' ? `₹${metadata.price}` : metadata.price}
              </span>
            )}
            {metadata?.rating !== undefined && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                ⭐ {metadata.rating}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="shrink-0 w-[180px] sm:w-[200px] md:w-[220px] snap-start">
      <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-pulse">
        <div className="aspect-4/3 bg-gray-200 dark:bg-gray-700" />
        <div className="p-3 space-y-2">
          <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-1" />
        </div>
      </div>
    </div>
  );
}

export default RecommendationCarousel;
