'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function CustomerDetailAdminPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tab, setTab] = useState<'overview' | 'orders' | 'returns' | 'activity'>('overview');

  const customer = {
    name: 'Priya Sharma', email: 'priya.sharma@gmail.com', phone: '+91 98765 43210',
    status: 'ACTIVE', verified: true, segment: 'Loyal', joinDate: '2024-03-15', lastActive: '2 hours ago',
    totalOrders: 47, totalSpend: 324500, avgOrderValue: 6904, lifetimeValue: 324500,
    returnRate: 2.1, loyaltyPoints: 12400, referrals: 5,
    addresses: [
      { label: 'Home', line: '402, Maple Heights, Andheri West, Mumbai 400058', default: true },
      { label: 'Office', line: '5th Floor, Tech Park, BKC, Mumbai 400051', default: false },
    ],
    recentOrders: [
      { id: 'ORD-48521', date: '2026-06-28', items: 3, total: 15999, status: 'Delivered' },
      { id: 'ORD-47830', date: '2026-06-15', items: 1, total: 3499, status: 'Delivered' },
      { id: 'ORD-47201', date: '2026-06-02', items: 2, total: 8799, status: 'Delivered' },
      { id: 'ORD-46800', date: '2026-05-20', items: 1, total: 129999, status: 'Delivered' },
    ],
    activity: [
      { time: '2h ago', action: 'Viewed Samsung Galaxy S25', type: 'browse' },
      { time: '3h ago', action: 'Added iPhone 16 Pro to wishlist', type: 'wishlist' },
      { time: '1d ago', action: 'Wrote review for Galaxy S24 Ultra', type: 'review' },
      { time: '2d ago', action: 'Redeemed 5000 loyalty points', type: 'loyalty' },
    ],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/customers" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← All Customers</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>👤 {customer.name}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{customer.status}</span>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}>{customer.segment}</span>
              <span style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>Last active: {customer.lastActive}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Suspend</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Block</button>
          </div>
        </div>

        <div style={{ ...cs, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {[{ l: 'Orders', v: customer.totalOrders.toString(), c: '#a78bfa' }, { l: 'Total Spend', v: `₹${(customer.totalSpend / 1000).toFixed(0)}K`, c: '#6bcb77' }, { l: 'Avg Order', v: `₹${customer.avgOrderValue.toLocaleString()}`, c: '#4d96ff' }, { l: 'Return Rate', v: `${customer.returnRate}%`, c: '#fbbf24' }, { l: 'Loyalty Pts', v: customer.loyaltyPoints.toLocaleString(), c: '#f472b6' }].map(k => (
            <div key={k.l} style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>{k.l}</div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: k.c }}>{k.v}</div></div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {(['overview', 'orders', 'returns', 'activity'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 600, fontSize: '0.85rem', background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent', color: tab === t ? '#a78bfa' : '#8b8b9e', cursor: 'pointer', textTransform: 'capitalize', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent' }}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={cs}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Contact Info</h3>
              {[{ l: 'Email', v: customer.email }, { l: 'Phone', v: customer.phone }, { l: 'Joined', v: customer.joinDate }, { l: 'Referrals', v: customer.referrals.toString() }].map(f => (
                <div key={f.l} style={{ marginBottom: '0.6rem' }}><div style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{f.l}</div><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{f.v}</div></div>
              ))}
            </div>
            <div style={cs}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Addresses</h3>
              {customer.addresses.map((a, i) => (
                <div key={i} style={{ marginBottom: '0.75rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.label}</span>
                    {a.default && <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>Default</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#8b8b9e' }}>{a.line}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Orders</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Order ID', 'Date', 'Items', 'Total', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>{customer.recentOrders.map((o, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: '#a78bfa' }}>{o.id}</td>
                  <td style={{ padding: '0.75rem', color: '#8b8b9e' }}>{o.date}</td>
                  <td style={{ padding: '0.75rem' }}>{o.items}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>₹{o.total.toLocaleString()}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{o.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {tab === 'activity' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Activity</h3>
            {customer.activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                <div style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>{a.action}</div>
                <div style={{ fontSize: '0.8rem', color: '#8b8b9e', flexShrink: 0 }}>{a.time}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'returns' && <div style={cs}><p style={{ color: '#8b8b9e' }}>Return history for this customer — {customer.returnRate}% return rate.</p></div>}
      </div>
    </div>
  );
}
