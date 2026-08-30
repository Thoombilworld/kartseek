'use client';
import { useState } from 'react';

export default function RestaurantGiftCardsPage() {
  const [amount, setAmount] = useState(1);
  const amounts = [500, 1000, 2000, 5000];
  return (
    <div className="max-w-[700px] mx-auto p-6">
      <h1 className="text-2xl font-black mb-5">🎁 Gift Cards</h1>
      <div className="bg-linear-to-br from-[#EA580C] to-[#F97316] rounded-2xl p-6 text-white mb-5 text-center">
        <div className="text-[28px]">🎁</div>
        <h2 className="font-black my-2">KARTSEEK Food Gift Card</h2>
        <p className="opacity-70 text-[13px]">Gift someone a delicious meal</p>
      </div>
      <h3 className="font-extrabold mb-3">Select Amount</h3>
      <div className="flex gap-2.5 mb-4">
        {amounts.map((a, i) => (
          <button key={i} onClick={() => setAmount(i)}
            className={`flex-1 py-3 rounded-[10px] font-extrabold cursor-pointer ${i === amount ? 'border-2 border-[#EA580C] bg-[rgba(234,88,12,0.1)] text-[#EA580C]' : 'border border-gray-200 bg-white text-gray-800'}`}>
            {a}
          </button>
        ))}
      </div>
      <button className="w-full py-3.5 bg-[#EA580C] text-white border-none rounded-xl font-extrabold text-[15px] cursor-pointer">Buy Gift Card</button>
      <h3 className="font-extrabold mt-6 mb-3">My Gift Cards</h3>
      {[{ code: 'GC-FOOD-4821', balance: 750, expiry: 'Dec 2026' }, { code: 'GC-FOOD-9103', balance: 200, expiry: 'Mar 2027' }].map((c, i) => (
        <div key={i} className="flex items-center gap-3.5 p-3.5 bg-white rounded-xl border border-gray-100 mb-2">
          <span className="text-2xl">🎁</span>
          <div className="flex-1"><code className="font-bold">{c.code}</code><p className="text-[11px] text-gray-400 m-0">Expires: {c.expiry}</p></div>
          <strong className="text-[#EA580C] text-base">{c.balance}</strong>
        </div>
      ))}
    </div>
  );
}
