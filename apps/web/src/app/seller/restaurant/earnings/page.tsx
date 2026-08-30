'use client';

export default function RestaurantEarningsPortalPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-black mb-5">💰 Earnings</h1>
      <div className="bg-linear-to-br from-[#EA580C] to-[#F97316] rounded-2xl p-6 text-white mb-5">
        <div className="text-sm opacity-80">Today&apos;s Revenue</div>
        <div className="text-4xl font-black">38,400</div>
        <div className="flex gap-2 mt-2">
          <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs">42 orders</span>
          <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs">914 avg</span>
        </div>
      </div>
      <div className="flex gap-3 mb-5">
        {[{ label: 'This Week', val: '185,200' }, { label: 'This Month', val: '742,800' }].map((s, i) => (
          <div key={i} className="flex-1 p-4 bg-white rounded-[14px] border border-gray-100">
            <div className="text-xs text-gray-400">{s.label}</div>
            <div className="text-[22px] font-black text-[#EA580C]">{s.val}</div>
          </div>
        ))}
      </div>
      <h3 className="font-extrabold mb-3">Revenue Breakdown</h3>
      {[
        { label: 'Delivery', val: '22,500', barClass: 'w-[58%] bg-[#EA580C]', textClass: 'text-[#EA580C]' },
        { label: 'Dine-In', val: '11,200', barClass: 'w-[29%] bg-[#2563EB]', textClass: 'text-[#2563EB]' },
        { label: 'Takeaway', val: '4,700', barClass: 'w-[13%] bg-[#16a34a]', textClass: 'text-[#16a34a]' },
      ].map((d, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 mb-2">
          <span className="flex-1 font-bold">{d.label}</span>
          <div className="w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-1.5 rounded-full ${d.barClass}`} /></div>
          <strong className={`min-w-[80px] text-right ${d.textClass}`}>{d.val}</strong>
        </div>
      ))}
    </div>
  );
}
