'use client';
import { useState } from 'react';
import Link from 'next/link';

const mockData = {
  revenue: { total: 45200000, change: 12.5, daily: [32, 38, 28, 45, 52, 48, 55, 42, 60, 38, 55, 62, 48, 72, 65] },
  orders: { total: 15230, change: 8.2 },
  avgOrderValue: { total: 2968, change: 3.1 },
  conversion: { total: 3.4, change: 0.3 },
  gmv: { total: 125600000, change: 15.8 },
  refundRate: { total: 2.1, change: -0.4 },
};

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  return (
    <svg viewBox={`0 0 ${data.length * 10} 40`} width="100%" height="40" style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"
        points={data.map((v, i) => `${i * 10},${40 - ((v - min) / range) * 35}`).join(' ')} />
    </svg>
  );
}

export default function RevenueDashboardPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const kpis = [
    { label: 'Revenue', value: `₹${(mockData.revenue.total / 10000000).toFixed(1)}Cr`, change: mockData.revenue.change, color: '#6bcb77' },
    { label: 'Orders', value: mockData.orders.total.toLocaleString(), change: mockData.orders.change, color: '#4d96ff' },
    { label: 'Avg Order', value: `₹${mockData.avgOrderValue.total.toLocaleString()}`, change: mockData.avgOrderValue.change, color: '#a78bfa' },
    { label: 'Conversion', value: `${mockData.conversion.total}%`, change: mockData.conversion.change, color: '#fbbf24' },
    { label: 'GMV', value: `₹${(mockData.gmv.total / 10000000).toFixed(1)}Cr`, change: mockData.gmv.change, color: '#f97316' },
    { label: 'Refund Rate', value: `${mockData.refundRate.total}%`, change: mockData.refundRate.change, color: '#f87171' },
  ];

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/admin/marketplace" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Dashboard</Link>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>📊 Revenue Analytics</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '3px' }}>
            {(['7d', '30d', '90d', '1y'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '0.4rem 0.9rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.8rem',
                background: period === p ? '#6366f1' : 'transparent', color: period === p ? '#fff' : '#8b8b9e', cursor: 'pointer',
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {kpis.map(kpi => (
            <div key={kpi.label} style={cardStyle}>
              <div style={{ color: '#8b8b9e', fontSize: '0.8rem', marginBottom: '0.3rem' }}>{kpi.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: '0.8rem', color: kpi.change >= 0 ? '#6bcb77' : '#f87171', marginTop: '0.2rem' }}>
                {kpi.change >= 0 ? '↑' : '↓'} {Math.abs(kpi.change)}%
              </div>
              <MiniChart data={mockData.revenue.daily} color={kpi.color} />
            </div>
          ))}
        </div>

        {/* Revenue Chart Placeholder */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'linear-gradient(to right, rgba(99,102,241,0.05), rgba(107,203,119,0.05))' }}>
          <div style={{ textAlign: 'center', color: '#8b8b9e' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📈</div>
            <div>Revenue & Orders Trend</div>
            <div style={{ fontSize: '0.8rem' }}>Interactive chart with filters</div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Top Categories by Revenue</h3>
            {[
              { name: 'Electronics', revenue: '₹18.5L', share: 41 },
              { name: 'Fashion', revenue: '₹8.2L', share: 18 },
              { name: 'Home & Kitchen', revenue: '₹6.1L', share: 14 },
              { name: 'Beauty', revenue: '₹4.3L', share: 10 },
              { name: 'Books', revenue: '₹3.8L', share: 8 },
            ].map(cat => (
              <div key={cat.name} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <span>{cat.name}</span><span style={{ color: '#6bcb77', fontWeight: 600 }}>{cat.revenue} ({cat.share}%)</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '6px' }}>
                  <div style={{ width: `${cat.share}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Payment Method Distribution</h3>
            {[
              { method: 'UPI', share: 42, color: '#6bcb77' },
              { method: 'Credit Card', share: 25, color: '#4d96ff' },
              { method: 'Debit Card', share: 18, color: '#a78bfa' },
              { method: 'Net Banking', share: 8, color: '#fbbf24' },
              { method: 'Wallet', share: 5, color: '#f97316' },
              { method: 'COD', share: 2, color: '#f87171' },
            ].map(pm => (
              <div key={pm.method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pm.color }} />
                  <span>{pm.method}</span>
                </div>
                <span style={{ fontWeight: 600 }}>{pm.share}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
