'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CouponDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const coupon = {
    code: 'SUMMER30', status: 'ACTIVE', type: 'PERCENTAGE', value: 30, maxDiscount: 5000, minOrder: 1999,
    usageLimit: 10000, usedCount: 4823, revenue: 2450000, startDate: '2026-06-01', endDate: '2026-07-31',
    categories: ['Electronics', 'Fashion', 'Home & Kitchen'], excludedBrands: ['Apple'],
    usagePerUser: 2, firstOrderOnly: false, stackable: false,
    topUsers: [
      { name: 'Priya S.', uses: 2, saved: 8998 }, { name: 'Rahul V.', uses: 2, saved: 6200 },
      { name: 'Sneha K.', uses: 1, saved: 5000 }, { name: 'Arun M.', uses: 1, saved: 4500 },
    ],
    hourlyUsage: [120, 85, 45, 30, 22, 18, 35, 90, 180, 250, 310, 280, 260, 220, 190, 210, 280, 350, 420, 380, 300, 250, 200, 160],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };
  const usageRate = ((coupon.usedCount / coupon.usageLimit) * 100).toFixed(1);

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/coupons" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← All Coupons</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>🏷️ {coupon.code}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{coupon.status}</span>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}>{coupon.value}% OFF</span>
              <span style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{coupon.startDate} → {coupon.endDate}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Edit</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Deactivate</button>
          </div>
        </div>

        <div style={{ ...cs, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[{ l: 'Used', v: `${coupon.usedCount.toLocaleString()} / ${(coupon.usageLimit / 1000).toFixed(0)}K`, c: '#a78bfa' }, { l: 'Usage Rate', v: `${usageRate}%`, c: '#4d96ff' }, { l: 'Revenue Impact', v: `₹${(coupon.revenue / 100000).toFixed(0)}L`, c: '#6bcb77' }, { l: 'Max Discount', v: `₹${coupon.maxDiscount.toLocaleString()}`, c: '#fbbf24' }].map(k => (
            <div key={k.l} style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>{k.l}</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: k.c }}>{k.v}</div></div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Rules</h3>
            {[{ l: 'Min Order', v: `₹${coupon.minOrder}` }, { l: 'Usage Per User', v: coupon.usagePerUser.toString() }, { l: 'First Order Only', v: coupon.firstOrderOnly ? 'Yes' : 'No' }, { l: 'Stackable', v: coupon.stackable ? 'Yes' : 'No' }].map(f => (
              <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#8b8b9e', fontSize: '0.85rem' }}>{f.l}</span><span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.v}</span>
              </div>
            ))}
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>Valid Categories</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{coupon.categories.map(c => <span key={c} style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(99,102,241,0.1)', color: '#a78bfa' }}>{c}</span>)}</div>
          </div>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Top Users</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Customer', 'Uses', 'Saved'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.7rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>{coupon.topUsers.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</td>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{u.uses}</td>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#6bcb77' }}>₹{u.saved.toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div style={cs}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Hourly Usage (24h)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
            {coupon.hourlyUsage.map((v, i) => (
              <div key={i} style={{ flex: 1, background: `rgba(99,102,241,${0.3 + (v / 420) * 0.7})`, borderRadius: '3px 3px 0 0', height: `${(v / 420) * 100}%`, minWidth: '8px', position: 'relative' }} title={`${i}:00 — ${v} uses`} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#6b6b7e', marginTop: '4px' }}>
            <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
