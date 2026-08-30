import React from 'react';
import Link from 'next/link';
import { Search, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100 max-w-lg w-full text-center">
        <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">Product Not Found</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          We couldn't find the product you're looking for. It might have been removed, or the URL might be incorrect.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Continue Shopping
          </Link>
          <Link href="/category-list" className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl transition-colors">
            Browse Categories
          </Link>
        </div>
      </div>
    </div>
  );
}
