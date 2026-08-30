'use client';
import React, { useState } from 'react';
import { ArrowLeft, Heart, ShoppingCart, Star, Trash2, Pill } from 'lucide-react';
import Link from 'next/link';

const initProducts = [
  { id: 1, name: 'Paracetamol 500mg', brand: 'Calpol', price: 35, mrp: 42, image: '💊', rating: 4.6, inStock: true, rxRequired: false },
  { id: 2, name: 'Augmentin 625mg', brand: 'GSK', price: 245, mrp: 290, image: '💊', rating: 4.8, inStock: true, rxRequired: true },
  { id: 3, name: 'Cetrizine 10mg', brand: 'Zyrtec', price: 28, mrp: 35, image: '💊', rating: 4.4, inStock: true, rxRequired: false },
  { id: 4, name: 'Vitamin D3 60K IU', brand: 'HealthVit', price: 180, mrp: 250, image: '🧴', rating: 4.7, inStock: false, rxRequired: false },
  { id: 5, name: 'Blood Pressure Monitor', brand: 'Omron', price: 1899, mrp: 2499, image: '🩺', rating: 4.9, inStock: true, rxRequired: false },
  { id: 6, name: 'Pantoprazole 40mg', brand: 'Pan-D', price: 85, mrp: 110, image: '💊', rating: 4.3, inStock: true, rxRequired: true },
];

export default function WishlistPage() {
  const [items, setItems] = useState(initProducts);

  const remove = (id: number) => setItems(prev => prev.filter(p => p.id !== id));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <h1 className="text-lg font-bold flex-1">My Wishlist</h1>
          <span className="text-sm text-gray-500">{items.length} items</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Your wishlist is empty</p>
            <Link href="/search" className="inline-block mt-4 text-teal-600 font-bold hover:underline">Browse medicines</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(p => {
              const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
                  {/* Image area */}
                  <div className="h-36 bg-gradient-to-br from-gray-50 to-teal-50 flex items-center justify-center relative">
                    <span className="text-5xl">{p.image}</span>
                    <button onClick={() => remove(p.id)} className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                    {p.rxRequired && (
                      <span className="absolute top-3 left-3 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded flex items-center gap-1"><Pill className="w-3 h-3" /> Rx</span>
                    )}
                    {discount > 0 && (
                      <span className="absolute bottom-3 left-3 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">{discount}% OFF</span>
                    )}
                  </div>
                  {/* Details */}
                  <div className="p-4">
                    <p className="text-xs text-gray-400 font-medium">{p.brand}</p>
                    <h3 className="font-bold text-gray-900 text-sm mt-0.5 line-clamp-2">{p.name}</h3>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-bold text-gray-700">{p.rating}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-black text-gray-900">₹{p.price}</span>
                      {p.mrp > p.price && <span className="text-sm text-gray-400 line-through">₹{p.mrp}</span>}
                    </div>
                    <button disabled={!p.inStock} className={`w-full mt-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${p.inStock ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                      {p.inStock ? <><ShoppingCart className="w-4 h-4" /> Add to Cart</> : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
