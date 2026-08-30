'use client';

const coupons = [
  { code: 'FOODIE50', desc: '50% off up to 200 on first order', min: '300', expiry: 'Jul 15, 2026', active: true },
  { code: 'BIRYANI30', desc: '30% off on Biryani orders', min: '400', expiry: 'Jul 20, 2026', active: true },
  { code: 'FREEDELIVERY', desc: 'Free delivery above 500', min: '500', expiry: 'Aug 1, 2026', active: true },
];

export default function RestaurantCouponsPage() {
  return (
    <div className="max-w-[700px] mx-auto p-6">
      <h1 className="text-2xl font-black mb-5">🏷️ Coupons & Offers</h1>
      <div className="flex gap-2 p-3.5 bg-white rounded-[14px] border border-gray-100 mb-5">
        <input placeholder="Enter coupon code" className="flex-1 border-none outline-none text-sm" />
        <button className="bg-transparent border-none text-[#EA580C] font-extrabold cursor-pointer">APPLY</button>
      </div>
      {coupons.map((c, i) => (
        <div key={i} className="bg-white rounded-[14px] border border-[rgba(234,88,12,0.3)] mb-2.5 overflow-hidden">
          <div className="flex justify-between items-center px-3.5 py-2.5 bg-[rgba(234,88,12,0.05)]">
            <span className="font-black text-[#EA580C] tracking-wider">🏷️ {c.code}</span>
            <button className="bg-transparent border-none text-[#EA580C] font-extrabold cursor-pointer">APPLY</button>
          </div>
          <div className="p-3.5">
            <p className="font-semibold text-[13px] mb-1">{c.desc}</p>
            <span className="text-[11px] text-gray-400">Min: {c.min} • Expires: {c.expiry}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
