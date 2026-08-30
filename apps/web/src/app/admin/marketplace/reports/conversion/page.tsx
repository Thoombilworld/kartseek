'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ConversionDashboardPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const funnelData = [
    { stage: 'Page Views', count: 285000, rate: 100, color: '#6366f1' },
    { stage: 'Product Views', count: 142000, rate: 49.8, color: '#8b5cf6' },
    { stage: 'Add to Cart', count: 28400, rate: 20.0, color: '#a78bfa' },
    { stage: 'Checkout Started', count: 14200, rate: 50.0, color: '#4d96ff' },
    { stage: 'Payment Initiated', count: 11360, rate: 80.0, color: '#fbbf24' },
    { stage: 'Order Completed', count: 9656, rate: 85.0, color: '#6bcb77' },
  ];

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/admin/marketplace" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Dashboard</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>🔄 Conversion Analytics</h1>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '3px' }}>
            {(['7d', '30d', '90d'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '0.4rem 0.8rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.8rem',
                background: period === p ? '#6366f1' : 'transparent', color: period === p ? '#fff' : '#8b8b9e', cursor: 'pointer',
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Overall CVR', value: '3.39%', change: '+0.3%', color: '#6bcb77' },
            { label: 'Cart Abandon', value: '28.2%', change: '-1.5%', color: '#fbbf24' },
            { label: 'Payment Success', value: '85.0%', change: '+2.1%', color: '#4d96ff' },
            { label: 'Avg Session', value: '4m 32s', change: '+12s', color: '#a78bfa' },
          ].map(kpi => (
            <div key={kpi.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              <div style={{ color: '#8b8b9e', fontSize: '0.75rem' }}>{kpi.label}</div>
              <div style={{ fontSize: '0.75rem', color: kpi.change.startsWith('+') ? '#6bcb77' : '#f87171', marginTop: '0.2rem' }}>{kpi.change}</div>
            </div>
          ))}
        </div>

        {/* Funnel */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1.25rem' }}>Conversion Funnel</h3>
          {funnelData.map((stage, i) => (
            <div key={stage.stage} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 500 }}>{stage.stage}</span>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <span style={{ color: '#8b8b9e' }}>{(stage.count / 1000).toFixed(0)}K</span>
                  {i > 0 && <span style={{ color: stage.rate >= 50 ? '#6bcb77' : '#fbbf24', fontWeight: 600 }}>{stage.rate}%</span>}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
                <div style={{ width: `${(stage.count / funnelData[0].count) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${stage.color}, ${stage.color}88)`, borderRadius: '4px', transition: 'width 0.5s', minWidth: '2px' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Drop-off Analysis */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Cart Abandonment Reasons</h3>
            {[
              { reason: 'Shipping costs too high', pct: 35 },
              { reason: 'Just browsing', pct: 25 },
              { reason: 'Found better price', pct: 18 },
              { reason: 'Complex checkout', pct: 12 },
              { reason: 'Payment issues', pct: 10 },
            ].map(r => (
              <div key={r.reason} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                <span>{r.reason}</span><span style={{ color: '#f87171', fontWeight: 600 }}>{r.pct}%</span>
              </div>
            ))}
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Top Converting Categories</h3>
            {[
              { category: 'Books', cvr: 6.2, color: '#6bcb77' },
              { category: 'Electronics', cvr: 4.1, color: '#6bcb77' },
              { category: 'Home', cvr: 3.8, color: '#6bcb77' },
              { category: 'Fashion', cvr: 2.9, color: '#fbbf24' },
              { category: 'Beauty', cvr: 2.5, color: '#fbbf24' },
            ].map(c => (
              <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                <span>{c.category}</span><span style={{ color: c.color, fontWeight: 600 }}>{c.cvr}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
