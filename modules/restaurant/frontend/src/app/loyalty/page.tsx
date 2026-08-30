'use client';

export default function RestaurantLoyaltyPage() {
  return (
    <div className="max-w-[700px] mx-auto p-6">
      <h1 className="text-2xl font-black mb-5">🏆 Rewards Program</h1>
      <div className="bg-linear-to-br from-[#EA580C] to-[#F97316] rounded-2xl p-6 text-white mb-5">
        <div className="text-sm opacity-80">Your Points</div>
        <div className="text-[42px] font-black">2,840</div>
        <div className="text-[13px] opacity-70 mt-1">Gold Member • 160 points to Platinum</div>
        <div className="bg-white/20 rounded h-1.5 mt-3"><div className="bg-white rounded h-1.5 w-[85%]" /></div>
      </div>
      <h3 className="font-extrabold mb-3">Redeem Rewards</h3>
      {[
        { name: 'Free Delivery', points: 500, emoji: '🚗' },
        { name: '20% Off Next Order', points: 1000, emoji: '💰' },
        { name: 'Free Dessert', points: 300, emoji: '🍰' },
        { name: 'Priority Table Booking', points: 800, emoji: '🪑' },
      ].map((r, i) => (
        <div key={i} className="flex items-center gap-3.5 p-3.5 bg-white rounded-xl border border-gray-100 mb-2">
          <span className="text-3xl">{r.emoji}</span>
          <div className="flex-1"><strong>{r.name}</strong><p className="text-xs text-gray-500 m-0">{r.points} points</p></div>
          <button className="bg-[#EA580C] text-white border-none rounded-lg px-4 py-2 font-bold cursor-pointer">Redeem</button>
        </div>
      ))}
    </div>
  );
}
