'use client';

export default function RestaurantCustomerInsightsPortalPage() {
  const customers = [
    { name: 'Sarah K.', orders: 24, spent: '22,800', last: '2 days ago', fav: 'Chicken Biryani' },
    { name: 'John M.', orders: 18, spent: '16,400', last: '5 days ago', fav: 'Mutton Biryani' },
    { name: 'Priya S.', orders: 15, spent: '12,600', last: '1 week ago', fav: 'Paneer Tikka' },
    { name: 'David L.', orders: 12, spent: '9,200', last: '3 days ago', fav: 'Veg Biryani' },
  ];
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-black mb-5">👥 Customer Insights</h1>
      <div className="flex gap-3 mb-6">
        {[{ label: 'Total Customers', val: '1,284', icon: '👥' }, { label: 'Repeat Customers', val: '342', icon: '🔄' }, { label: 'New (7d)', val: '67', icon: '➕' }].map((s, i) => (
          <div key={i} className="flex-1 p-4 bg-white rounded-[14px] border border-gray-100 text-center">
            <div className="text-3xl">{s.icon}</div>
            <div className="text-2xl font-black text-[#EA580C]">{s.val}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>
      <h3 className="font-extrabold mb-3">Top Customers</h3>
      <table className="w-full bg-white rounded-[14px] border-collapse overflow-hidden border border-gray-100">
        <thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="p-3 text-left">Customer</th><th>Orders</th><th>Total Spent</th><th>Favorite</th><th>Last Order</th></tr></thead>
        <tbody>{customers.map((c, i) => (
          <tr key={i} className="border-t border-gray-100">
            <td className="p-3 font-bold">{c.name}</td>
            <td className="text-center font-bold">{c.orders}</td>
            <td className="text-center text-[#EA580C] font-extrabold">{c.spent}</td>
            <td className="text-center text-[13px]">{c.fav}</td>
            <td className="text-center text-xs text-gray-400">{c.last}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
