'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function CustomerDetailAdminPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tab, setTab] = useState<'overview' | 'orders' | 'reviews' | 'activity'>('overview');

  const customer = {
    name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 99876 54321',
    status: 'ACTIVE', tier: 'Gold', joinDate: '2023-06-15',
    totalOrders: 47, totalSpent: 156000, avgOrderValue: 3319,
    addresses: [{ label: 'Home', city: 'Mumbai', pincode: '400001' }, { label: 'Office', city: 'Mumbai', pincode: '400053' }],
    recentOrders: [
      { id: 'ORD-001', date: '2026-06-28', total: 2499, status: 'Delivered' },
      { id: 'ORD-002', date: '2026-06-20', total: 5999, status: 'Shipped' },
      { id: 'ORD-003', date: '2026-06-10', total: 899, status: 'Returned' },
    ],
  };

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <Link href="/admin/marketplace/customers" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← All Customers</Link>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>{customer.name}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{customer.status}</span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>🏅 {customer.tier}</span>
            </div>
          </div>
          <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Block User</button>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {(['overview', 'orders', 'reviews', 'activity'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 600, fontSize: '0.85rem',
              background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent', color: tab === t ? '#a78bfa' : '#8b8b9e',
              cursor: 'pointer', textTransform: 'capitalize', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem' }}>
            <div>
              <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Orders', value: customer.totalOrders, color: '#a78bfa' },
                  { label: 'Total Spent', value: `₹${(customer.totalSpent / 1000).toFixed(0)}K`, color: '#6bcb77' },
                  { label: 'Avg Order', value: `₹${customer.avgOrderValue.toLocaleString()}`, color: '#4d96ff' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                    <div style={{ color: '#8b8b9e', fontSize: '0.75rem' }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Recent Orders</h3>
                {customer.recentOrders.map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                    <div><span style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{o.id}</span> <span style={{ color: '#8b8b9e' }}>• {o.date}</span></div>
                    <div><span style={{ fontWeight: 600 }}>₹{o.total.toLocaleString()}</span> <span style={{ color: o.status === 'Delivered' ? '#6bcb77' : o.status === 'Returned' ? '#f87171' : '#4d96ff', marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>{o.status}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Contact</h3>
                {[{ label: 'Email', value: customer.email }, { label: 'Phone', value: customer.phone }, { label: 'Member Since', value: new Date(customer.joinDate).toLocaleDateString() }].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                    <span style={{ color: '#8b8b9e' }}>{row.label}</span><span>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Addresses</h3>
                {customer.addresses.map(addr => (
                  <div key={addr.label} style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 0', fontSize: '0.85rem' }}>
                    <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>{addr.label}</span>
                    <span style={{ color: '#8b8b9e' }}>{addr.city} - {addr.pincode}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab !== 'overview' && <div style={cardStyle}><div style={{ textAlign: 'center', padding: '3rem', color: '#8b8b9e' }}>Customer {tab} data.</div></div>}
      </div>
    </div>
  );
}
