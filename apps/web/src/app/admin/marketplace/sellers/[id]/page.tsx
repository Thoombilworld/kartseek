'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function SellerDetailAdminPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tab, setTab] = useState<'overview' | 'products' | 'orders' | 'reviews' | 'payouts'>('overview');

  const seller = {
    name: 'TechVision Electronics', email: 'contact@techvision.in', phone: '+91 98765 00001',
    status: 'ACTIVE', verified: true, rating: 4.8, totalProducts: 342, totalOrders: 15200,
    revenue: 4520000, commissionEarned: 452000, joinDate: '2024-01-15', gstNumber: '29XXXXX1234X1ZX',
    panNumber: 'ABCDE1234F', bankName: 'HDFC Bank', accountNumber: '****5678',
    metrics: { returnRate: 1.2, fulfillmentRate: 98.5, responseTime: '< 1 hour', avgShipTime: '1.2 days' },
  };

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/admin/marketplace/sellers" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← All Sellers</Link>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>{seller.name}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{seller.status}</span>
              {seller.verified && <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}>✓ VERIFIED</span>}
              <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>⭐ {seller.rating}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Suspend</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Ban</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {(['overview', 'products', 'orders', 'reviews', 'payouts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 600, fontSize: '0.85rem',
              background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent', color: tab === t ? '#a78bfa' : '#8b8b9e',
              cursor: 'pointer', textTransform: 'capitalize', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* KPI Row */}
            <div style={{ ...cardStyle, gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Total Products', value: seller.totalProducts.toLocaleString(), color: '#a78bfa' },
                { label: 'Total Orders', value: seller.totalOrders.toLocaleString(), color: '#4d96ff' },
                { label: 'Revenue', value: `₹${(seller.revenue / 100000).toFixed(1)}L`, color: '#6bcb77' },
                { label: 'Commission', value: `₹${(seller.commissionEarned / 100000).toFixed(1)}L`, color: '#fbbf24' },
              ].map(kpi => (
                <div key={kpi.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                  <div style={{ color: '#8b8b9e', fontSize: '0.8rem' }}>{kpi.label}</div>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Contact & Legal</h3>
              {[
                { label: 'Email', value: seller.email },
                { label: 'Phone', value: seller.phone },
                { label: 'GSTIN', value: seller.gstNumber },
                { label: 'PAN', value: seller.panNumber },
                { label: 'Joined', value: new Date(seller.joinDate).toLocaleDateString() },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                  <span style={{ color: '#8b8b9e' }}>{row.label}</span><span>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Performance</h3>
              {Object.entries(seller.metrics).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                  <span style={{ color: '#8b8b9e', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span style={{ fontWeight: 600, color: '#6bcb77' }}>{val}{typeof val === 'number' ? '%' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab !== 'overview' && <div style={cardStyle}><div style={{ textAlign: 'center', padding: '3rem', color: '#8b8b9e' }}>Seller {tab} management panel. (Products list, order history, reviews, payout schedule)</div></div>}
      </div>
    </div>
  );
}
