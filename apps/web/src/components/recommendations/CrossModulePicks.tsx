'use client';

/**
 * KARTSEEK — CrossModulePicks
 *
 * "Explore More" strip that shows recommendations from OTHER modules
 * the user hasn't visited recently. Encourages cross-module engagement.
 *
 * Each card shows:
 *  - Module icon + label
 *  - Item preview (title, image)
 *  - Reason why it's recommended
 */

import React from 'react';
import Link from 'next/link';
import type { Recommendation, RecommendationModule } from '@/lib/hooks/use-recommendations';

const MODULE_META: Record<RecommendationModule, { icon: string; label: string; color: string; route: string }> = {
  marketplace: { icon: '🛍️', label: 'Marketplace', color: 'from-indigo-500 to-purple-500', route: '/marketplace/product' },
  grocery: { icon: '🥬', label: 'Grocery', color: 'from-green-500 to-emerald-500', route: '/grocery/product' },
  pharmacy: { icon: '💊', label: 'Pharmacy', color: 'from-cyan-500 to-blue-500', route: '/pharmacy/product' },
  hotel: { icon: '🏨', label: 'Hotels', color: 'from-amber-500 to-orange-500', route: '/hotel-booking' },
  restaurant: { icon: '🍽️', label: 'Restaurants', color: 'from-red-500 to-rose-500', route: '/restaurant' },
  doctor: { icon: '🩺', label: 'Doctors', color: 'from-teal-500 to-emerald-500', route: '/doctor' },
};

interface CrossModulePicksProps {
  recommendations: Recommendation[];
  currentModule: RecommendationModule;
  onCardClick?: (recommendation: Recommendation, position: number) => void;
  className?: string;
}

export function CrossModulePicks({
  recommendations,
  currentModule,
  onCardClick,
  className = '',
}: CrossModulePicksProps) {
  // Filter out current module
  const crossModuleItems = recommendations.filter((r) => r.module !== currentModule);

  if (crossModuleItems.length === 0) return null;

  // Group by module
  const grouped = crossModuleItems.reduce<Record<string, Recommendation[]>>((acc, item) => {
    if (!acc[item.module]) acc[item.module] = [];
    acc[item.module].push(item);
    return acc;
  }, {});

  return (
    <section className={`py-6 ${className}`} id="reco-cross-module">
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className="text-xl">✨</span>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Explore More</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">from other services</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(grouped).map(([mod, items]) => {
          const meta = MODULE_META[mod as RecommendationModule];
          if (!meta) return null;

          return (
            <div
              key={mod}
              className="group relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 hover:shadow-md"
            >
              {/* Module header strip */}
              <div className={`bg-linear-to-r ${meta.color} px-3 py-2 flex items-center gap-2`}>
                <span className="text-lg">{meta.icon}</span>
                <span className="text-sm font-semibold text-white">{meta.label}</span>
              </div>

              {/* Items */}
              <div className="p-2 space-y-1.5 bg-white dark:bg-gray-900">
                {items.slice(0, 2).map((item, idx) => (
                  <Link
                    key={item.id}
                    href={`${meta.route}/${item.entityId}`}
                    onClick={() => onCardClick?.(item, idx)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    id={`cross-${mod}-${item.entityId}`}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">{meta.icon}</div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.reasonLabel}</p>
                    </div>

                    {/* Price/Rating */}
                    {item.metadata?.price !== undefined && (
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">
                        {typeof item.metadata.price === 'number' ? `₹${item.metadata.price}` : item.metadata.price}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {/* "View all" link */}
              <Link
                href={`/${mod === 'hotel' ? 'hotel-booking' : mod}`}
                className="block px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-800/50 text-center transition-colors"
              >
                View all in {meta.label} →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default CrossModulePicks;
