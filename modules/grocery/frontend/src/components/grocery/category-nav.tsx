import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
  Beef, Fish, Carrot, Milk, Cookie, 
  Baby, Coffee, Snowflake, SprayCan, ShoppingBasket
} from 'lucide-react';

const categories = [
  { id: 'fresh-vegetables', name: 'Vegetables', icon: Carrot, color: 'bg-orange-100 text-orange-600' },
  { id: 'fresh-meat', name: 'Fresh Meat', icon: Beef, color: 'bg-red-100 text-red-600' },
  { id: 'seafood', name: 'Seafood', icon: Fish, color: 'bg-blue-100 text-blue-600' },
  { id: 'dairy', name: 'Dairy & Eggs', icon: Milk, color: 'bg-yellow-100 text-yellow-600' },
  { id: 'snacks', name: 'Snacks', icon: Cookie, color: 'bg-purple-100 text-purple-600' },
  { id: 'beverages', name: 'Beverages', icon: Coffee, color: 'bg-amber-100 text-amber-600' },
  { id: 'frozen', name: 'Frozen Food', icon: Snowflake, color: 'bg-cyan-100 text-cyan-600' },
  { id: 'baby-care', name: 'Baby Care', icon: Baby, color: 'bg-pink-100 text-pink-600' },
  { id: 'cleaning', name: 'Household', icon: SprayCan, color: 'bg-teal-100 text-teal-600' },
  { id: 'all-groceries', name: 'All Groceries', icon: ShoppingBasket, color: 'bg-green-100 text-green-600' },
];

export default function CategoryNav() {
  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4 px-4 md:px-0">
        <h2 className="text-xl font-bold text-gray-900">Shop by Category</h2>
      </div>
      
      {/* Scrollable container for mobile, grid for desktop */}
      <div className="flex overflow-x-auto md:grid md:grid-cols-5 lg:grid-cols-10 gap-3 xs:gap-4 pb-4 px-3 xs:px-4 md:px-0 snap-x hide-scrollbar">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Link 
              key={category.id} 
              href={`/grocery/category/${category.id}`}
              className="flex flex-col items-center min-w-[80px] md:min-w-0 snap-start group"
            >
              <div className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110 shadow-sm",
                category.color
              )}>
                <Icon className="w-8 h-8 md:w-10 md:h-10 opacity-80 group-hover:opacity-100" />
              </div>
              <span className="text-xs md:text-sm font-medium text-gray-700 text-center leading-tight">
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
