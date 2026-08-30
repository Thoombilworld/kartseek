'use client';
import { useState } from 'react';

const favorites = [
  { name: 'The Grand Biryani House', cuisine: 'Indian • Biryani • Mughlai', rating: 4.4, time: '35 min', emoji: '🍛', distance: '2.1 km', open: true },
  { name: 'Pizza Paradise', cuisine: 'Italian • Pizza • Pasta', rating: 4.7, time: '25 min', emoji: '🍕', distance: '1.2 km', open: true },
  { name: 'Sushi Master', cuisine: 'Japanese • Sushi • Ramen', rating: 4.8, time: '40 min', emoji: '🍣', distance: '3.5 km', open: false },
  { name: 'Thai Orchid', cuisine: 'Thai • Curry • Noodles', rating: 4.5, time: '35 min', emoji: '🍜', distance: '1.8 km', open: true },
];

export default function RestaurantFavoritesPage() {
  const [items, setItems] = useState(favorites);
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-black mb-5">❤️ Favorite Restaurants</h1>
      {items.length === 0 && <p className="text-gray-400 text-center py-12">No favorites yet</p>}
      {items.map((r, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-[14px] border border-gray-100 mb-2.5">
          <span className="text-4xl">{r.emoji}</span>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <strong className="text-[15px]">{r.name}</strong>
              <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="bg-transparent border-none cursor-pointer text-lg text-red-500" title="Remove from favorites">❤️</button>
            </div>
            <p className="text-gray-500 text-[13px] my-0.5">{r.cuisine}</p>
            <div className="flex gap-3 items-center text-xs text-gray-500">
              <span>⭐ {r.rating}</span><span>⏱ {r.time}</span><span>📍 {r.distance}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.open ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{r.open ? 'Open' : 'Closed'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
