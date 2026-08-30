'use client';
import Link from 'next/link';

export default function SellerRankingsPage() {
  const rankings = [
    { rank: 1, name: 'TechVision Electronics', revenue: 4520000, orders: 15200, rating: 4.8, fulfillment: 98.5, badge: '🏆' },
    { rank: 2, name: 'BookWorld', revenue: 3890000, orders: 22100, rating: 4.7, fulfillment: 97.2, badge: '🥈' },
    { rank: 3, name: 'FashionHub India', revenue: 2780000, orders: 8930, rating: 4.6, fulfillment: 95.1, badge: '🥉' },
    { rank: 4, name: 'HomeDecor Pro', revenue: 1950000, orders: 5670, rating: 4.5, fulfillment: 92.8, badge: '' },
    { rank: 5, name: 'Sports Zone', revenue: 1420000, orders: 3210, rating: 4.4, fulfillment: 90.5, badge: '' },
    { rank: 6, name: 'GadgetMart', revenue: 980000, orders: 2100, rating: 4.3, fulfillment: 88.2, badge: '' },
    { rank: 7, name: 'Beauty Palace', revenue: 870000, orders: 4500, rating: 4.2, fulfillment: 91.0, badge: '' },
    { rank: 8, name: 'KidZone', revenue: 650000, orders: 1800, rating: 4.1, fulfillment: 89.5, badge: '' },
  ];

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/admin/marketplace" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Dashboard</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>🏆 Seller Rankings</h1>

        {/* Top 3 Podium */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {rankings.slice(0, 3).map((s, i) => (
            <div key={s.rank} style={{
              ...cardStyle, textAlign: 'center', marginBottom: 0,
              background: i === 0 ? 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.05))' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>{s.badge}</div>
              <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{s.name}</div>
              <div style={{ color: '#6bcb77', fontWeight: 700, fontSize: '1.2rem' }}>₹{(s.revenue / 100000).toFixed(1)}L</div>
              <div style={{ color: '#fbbf24', fontSize: '0.8rem' }}>⭐ {s.rating}</div>
            </div>
          ))}
        </div>

        {/* Full table */}
        <div style={cardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                  {['#', 'Seller', 'Revenue', 'Orders', 'Rating', 'Fulfillment'].map(h => (
                    <th key={h} style={{ padding: '0.7rem', textAlign: 'left', color: '#8b8b9e', fontWeight: 600, fontSize: '0.8rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankings.map(s => (
                  <tr key={s.rank} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.7rem', fontWeight: 700, color: s.rank <= 3 ? '#fbbf24' : '#8b8b9e' }}>{s.rank}</td>
                    <td style={{ padding: '0.7rem', fontWeight: 500 }}>{s.name} {s.badge}</td>
                    <td style={{ padding: '0.7rem', color: '#6bcb77', fontWeight: 600 }}>₹{(s.revenue / 100000).toFixed(1)}L</td>
                    <td style={{ padding: '0.7rem' }}>{s.orders.toLocaleString()}</td>
                    <td style={{ padding: '0.7rem', color: '#fbbf24' }}>⭐ {s.rating}</td>
                    <td style={{ padding: '0.7rem' }}>
                      <span style={{ color: s.fulfillment >= 95 ? '#6bcb77' : s.fulfillment >= 90 ? '#fbbf24' : '#f87171', fontWeight: 600 }}>{s.fulfillment}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
