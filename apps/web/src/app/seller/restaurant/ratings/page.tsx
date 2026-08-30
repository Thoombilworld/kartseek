'use client';

export default function RestaurantRatingsPortalPage() {
  const reviews = [
    { name: 'Sarah K.', rating: 5, text: 'Amazing biryani! Best in town.', date: 'Jul 3, 2026', items: 'Chicken Biryani, Raita' },
    { name: 'John M.', rating: 4, text: 'Good food, delivery was a bit late though.', date: 'Jul 2, 2026', items: 'Mutton Biryani' },
    { name: 'Priya S.', rating: 5, text: 'Paneer Tikka was outstanding!', date: 'Jul 1, 2026', items: 'Paneer Tikka, Naan' },
    { name: 'David L.', rating: 3, text: 'Food was okay, expected more flavor.', date: 'Jun 30, 2026', items: 'Veg Biryani' },
  ];
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-black mb-5">⭐ Ratings & Reviews</h1>
      <div className="flex gap-4 bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="text-center">
          <div className="text-5xl font-black text-[#EA580C]">4.4</div>
          <div>{'⭐'.repeat(4)}✨</div>
          <p className="text-xs text-gray-400 mt-1">1,284 ratings</p>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1">
          {[706, 359, 154, 45, 20].map((count, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="w-3">{5 - i}</span><span>⭐</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-1.5 bg-[#EA580C] rounded-full w-(--pct)" ref={el => { if (el) el.style.setProperty('--pct', `${(count / 706) * 100}%`); }} /></div>
              <span className="w-[30px] text-right text-gray-400">{count}</span>
            </div>
          ))}
        </div>
      </div>
      {reviews.map((r, i) => (
        <div key={i} className="bg-white rounded-[14px] border border-gray-100 p-4 mb-2.5">
          <div className="flex justify-between items-center mb-2">
            <div><strong>{r.name}</strong> <span className="text-amber-400">{'⭐'.repeat(r.rating)}</span></div>
            <span className="text-xs text-gray-400">{r.date}</span>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed">{r.text}</p>
          <p className="text-[11px] text-gray-300 italic mt-1.5">Ordered: {r.items}</p>
        </div>
      ))}
    </div>
  );
}
