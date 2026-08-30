'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/**
 * Connected search input for the restaurant header.
 * Navigates to /restaurant/search?q=... on Enter or click.
 */
export default function RestaurantSearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/restaurant/search?q=${encodeURIComponent(trimmed)}`);
    }
  }, [query, router]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
        placeholder="Search restaurants, cuisines, or dishes..."
        className="module-search-input"
        aria-label="Search restaurants"
      />
      <button
        onClick={handleSearch}
        className="absolute left-3.5 top-[0.6rem] text-slate-400 hover:text-orange-600 transition-colors"
        aria-label="Search"
      >
        <Search className="w-4.5 h-4.5" />
      </button>
    </div>
  );
}
