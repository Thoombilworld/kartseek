'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, ChevronRight, Trash2, Star, ShoppingCart } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { productPath } from '@/lib/marketplace/product-url';

interface ViewedProduct { id: string; title: string; brand: string; price: number; mrp: number; rating: number; imageUrl?: string; viewedAt: number; }

const STORAGE_KEY = 'kartseek_recently_viewed';

export default function RecentlyViewedPage() {
  const { formatCurrencyValue } = useRegion();
  const [products, setProducts] = useState<ViewedProduct[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setProducts(JSON.parse(stored));
    } catch {}
  }, []);

  const clearAll = () => {
    setProducts([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const removeItem = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const timeAgo = (ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <section className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white py-10 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-8 h-8" />
              <h1 className="text-3xl font-extrabold">Recently Viewed</h1>
            </div>
            <p className="text-white/70">{products.length} product{products.length !== 1 ? 's' : ''} in your browsing history.</p>
          </div>
          {products.length > 0 && (
            <button onClick={clearAll} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Recently Viewed</span>
        </nav>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 mx-auto text-slate-200 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">No recently viewed products</h2>
            <p className="text-slate-500 mb-6">Products you browse will appear here for quick access.</p>
            <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map(product => {
              const discount = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
              return (
                <div key={product.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all group relative">
                  <button onClick={() => removeItem(product.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/90 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm border border-slate-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <Link href={productPath(product)}>
                    <ProductThumb
                      src={product.imageUrl}
                      alt={product.title}
                      brand={product.brand}
                      sizes={THUMB_SIZES.grid5}
                    />
                    <div className="p-3">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{product.brand}</p>
                      <h3 className="font-medium text-sm text-slate-800 line-clamp-2 mb-1 group-hover:text-blue-600">{product.title}</h3>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          {product.rating || '4.0'} <Star className="w-2.5 h-2.5 fill-white" />
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-slate-900">{formatCurrencyValue(product.price)}</span>
                        {discount > 0 && <span className="text-[11px] text-green-600 font-bold">{discount}% off</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Viewed {timeAgo(product.viewedAt)}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
