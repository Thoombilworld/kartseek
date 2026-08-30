import Link from 'next/link';
import { Search, Utensils } from 'lucide-react';

export default function RestaurantNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
        <Utensils className="w-12 h-12 text-orange-500" />
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">Restaurant Not Found</h1>
      <p className="text-slate-500 max-w-md mb-8">
        We couldn&apos;t find the restaurant you&apos;re looking for. It may have been removed or the link might be incorrect.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/restaurant"
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-md"
        >
          <Search className="w-4 h-4" /> Browse Restaurants
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
