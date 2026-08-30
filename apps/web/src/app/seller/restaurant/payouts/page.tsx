'use client';

export default function RestaurantPayoutsPortalPage() {
  const payouts = [
    { id: 'PAY-4401', amount: '42,300', date: 'Jul 1, 2026', status: 'Completed', method: 'Bank Transfer' },
    { id: 'PAY-4389', amount: '38,700', date: 'Jun 24, 2026', status: 'Completed', method: 'Bank Transfer' },
    { id: 'PAY-4372', amount: '35,100', date: 'Jun 17, 2026', status: 'Completed', method: 'UPI' },
    { id: 'PAY-4358', amount: '29,800', date: 'Jun 10, 2026', status: 'Completed', method: 'Bank Transfer' },
  ];
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-black mb-5">🏦 Payout History</h1>
      <div className="bg-white rounded-[14px] border border-gray-100 p-5 mb-5 flex justify-between items-center">
        <div><p className="text-xs text-gray-400 m-0">Pending Payout</p><div className="text-[28px] font-black text-[#EA580C]">18,600</div><p className="text-[11px] text-gray-300 m-0">Next payout: Jul 8, 2026</p></div>
        <span className="text-4xl">🏦</span>
      </div>
      <table className="w-full bg-white rounded-[14px] border-collapse border border-gray-100">
        <thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="p-3 text-left">ID</th><th>Date</th><th>Method</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
        <tbody>{payouts.map((p, i) => (
          <tr key={i} className="border-t border-gray-100">
            <td className="p-3 font-mono font-bold text-[13px]">{p.id}</td>
            <td className="text-center text-[13px]">{p.date}</td>
            <td className="text-center text-[13px]">{p.method}</td>
            <td className="text-center"><span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold">{p.status}</span></td>
            <td className="text-right font-black text-green-600 text-[15px]">{p.amount}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
