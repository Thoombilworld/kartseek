'use client';
import Link from 'next/link';

export default function CategoryPerformancePage() {
  const categories = [
    { name: 'Electronics', revenue: 18500000, orders: 6200, products: 1250, conversion: 4.1, growth: 12.5, topProduct: 'iPhone 15 Pro', avgRating: 4.5 },
    { name: 'Fashion', revenue: 8200000, orders: 4100, products: 3200, conversion: 2.9, growth: 8.3, topProduct: 'Levi\'s 501', avgRating: 4.2 },
    { name: 'Home & Kitchen', revenue: 6100000, orders: 2800, products: 1800, conversion: 3.8, growth: 15.2, topProduct: 'Prestige Cooker', avgRating: 4.3 },
    { name: 'Beauty', revenue: 4300000, orders: 2100, products: 950, conversion: 2.5, growth: -3.2, topProduct: 'L\'Oreal Serum', avgRating: 4.1 },
    { name: 'Books', revenue: 3800000, orders: 5600, products: 8500, conversion: 6.2, growth: 5.8, topProduct: 'Atomic Habits', avgRating: 4.6 },
    { name: 'Sports', revenue: 2100000, orders: 980, products: 620, conversion: 3.2, growth: 22.1, topProduct: 'Nike Air Max', avgRating: 4.4 },
  ];

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Dashboard</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>📂 Category Performance</h1>

        <div style={cardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                {['Category', 'Revenue', 'Orders', 'Products', 'CVR', 'Growth', 'Top Product', 'Rating'].map(h => (
                  <th key={h} style={{ padding: '0.7rem', textAlign: 'left', color: '#8b8b9e', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.7rem', fontWeight: 600 }}>{cat.name}</td>
                    <td style={{ padding: '0.7rem', color: '#6bcb77', fontWeight: 600 }}>₹{(cat.revenue / 100000).toFixed(1)}L</td>
                    <td style={{ padding: '0.7rem' }}>{cat.orders.toLocaleString()}</td>
                    <td style={{ padding: '0.7rem', color: '#8b8b9e' }}>{cat.products.toLocaleString()}</td>
                    <td style={{ padding: '0.7rem', color: cat.conversion >= 4 ? '#6bcb77' : '#fbbf24', fontWeight: 600 }}>{cat.conversion}%</td>
                    <td style={{ padding: '0.7rem' }}>
                      <span style={{ color: cat.growth >= 0 ? '#6bcb77' : '#f87171', fontWeight: 600 }}>{cat.growth >= 0 ? '↑' : '↓'} {Math.abs(cat.growth)}%</span>
                    </td>
                    <td style={{ padding: '0.7rem', fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.topProduct}</td>
                    <td style={{ padding: '0.7rem', color: '#fbbf24' }}>⭐ {cat.avgRating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Distribution */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Revenue Distribution</h3>
          {categories.map(cat => {
            const totalRevenue = categories.reduce((s, c) => s + c.revenue, 0);
            const pct = (cat.revenue / totalRevenue * 100);
            return (
              <div key={cat.name} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                  <span>{cat.name}</span><span style={{ color: '#6bcb77', fontWeight: 600 }}>₹{(cat.revenue / 100000).toFixed(1)}L ({pct.toFixed(1)}%)</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '8px' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '4px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
