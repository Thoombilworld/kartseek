'use client';

export default function RestaurantReferPage() {
  const code = 'FOODIE2847';
  return (
    <div className="max-w-[700px] mx-auto p-6">
      <div className="bg-linear-to-br from-[#EA580C] via-[#F97316] to-[#FBBF24] rounded-2xl p-8 text-white text-center mb-6">
        <div className="text-5xl">🎁</div>
        <h1 className="text-[28px] font-black my-2">Refer & Earn</h1>
        <p className="opacity-80 text-sm">Share food joy with friends!</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center mb-5">
        <p className="text-gray-400 text-xs">Your Referral Code</p>
        <div className="flex justify-center items-center gap-2.5 mt-2">
          <code className="text-[22px] font-black text-[#EA580C] bg-[rgba(234,88,12,0.05)] px-5 py-2 rounded-[10px] border border-[rgba(234,88,12,0.2)] tracking-widest">{code}</code>
          <button onClick={() => navigator.clipboard.writeText(code)} className="bg-[rgba(234,88,12,0.1)] border-none rounded-[10px] p-2.5 cursor-pointer">📋</button>
        </div>
        <button className="w-full p-3.5 bg-[#EA580C] text-white border-none rounded-xl font-extrabold text-[15px] cursor-pointer mt-4">Share with Friends</button>
      </div>
      <div className="bg-white rounded-[14px] border border-gray-100 p-5">
        <h3 className="font-extrabold mb-3">How it works</h3>
        {['Share your code with friends', 'Friend orders their first meal', 'You both get 50% off (up to 200)'].map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 mb-2.5">
            <span className="w-7 h-7 rounded-full bg-[rgba(234,88,12,0.1)] text-[#EA580C] font-black flex items-center justify-center text-xs">{i + 1}</span>
            <span className="text-[13px] font-semibold">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
