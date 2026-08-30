import React, { useState } from 'react';
import { MenuCategory, MenuItem } from '@/lib/types/restaurant';
import { addToCart } from '@/lib/api-client';

interface Props {
  categories: MenuCategory[];
  items: MenuItem[];
  restaurantId: string;
}

export const MenuCategoryAccordion: React.FC<Props> = ({ categories, items, restaurantId }) => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const toggle = (id: string) => setOpenCategory(openCategory === id ? null : id);

  const itemsByCategory = (catId: string) => items.filter((i) => i.categoryId === catId && i.available);

  const handleAdd = async (itemId: string) => {
    await addToCart({ restaurantId, itemId, quantity: 1 });
    // In a real app you would show a toast; keep it simple here.
    // eslint-disable-next-line no-alert
    alert('Added to cart');
  };

  return (
    <div className="space-y-4">
      {categories.map((cat) => (
        <div key={cat.id} className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggle(cat.id)}
            className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 transition-colors flex justify-between items-center"
          >
            <span className="font-medium text-gray-800">{cat.name}</span>
            <span>{openCategory === cat.id ? '-' : '+'}</span>
          </button>
          {openCategory === cat.id && (
            <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {itemsByCategory(cat.id).map((item) => (
                <div key={item.id} className="border rounded-lg p-3 hover:shadow-lg transition-shadow bg-white">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded" />
                  <h3 className="mt-2 font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-indigo-600">
                      ${item.offerPrice ?? item.price}{item.offerPrice ? <span className="text-sm text-gray-500 line-through ml-1">${item.price}</span> : null}
                    </span>
                    <button
                      onClick={() => handleAdd(item.id)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
