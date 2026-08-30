'use client';

import React, { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface StoreGridExpandProps {
  children: React.ReactNode[];
  initialCount?: number;
}

export default function StoreGridExpand({ children, initialCount = 8 }: StoreGridExpandProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? children : children.slice(0, initialCount);
  const hasMore = children.length > initialCount;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {visible}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setShowAll(v => !v)}
            className="inline-flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 font-bold px-6 py-2.5 rounded-xl transition-all duration-200 border border-green-200 hover:border-green-300 shadow-sm text-sm"
          >
            {showAll ? 'Show Less' : `View All ${children.length} Stores`}
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
    </>
  );
}
