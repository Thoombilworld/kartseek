'use client';
import { useState } from 'react';

export default function GMVAnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const data = {
    totalGMV: 245000000, netRevenue: 19600000, orders: 42000, aov: 5833, growth: 18.5,
    monthly: [
      { month: 'Jan', gmv: 180, orders: 32 }, { month: 'Feb', gmv: 195, orders: 34 }, { month: 'Mar', gmv: 210, orders: 36 },
      { month: 'Apr', gmv: 225, orders: 38 }, { month: 'May', gmv: 238, orders: 40 }, { month: 'Jun', gmv: 245, orders: 42 },
    ],
    byCategory: [
      { name: 'Electronics', gmv: 98000000, pct: 40, growth: 22 },
      { name: 'Fashion', gmv: 49000000, pct: 20, growth: 15 },
      { name: 'Home & Kitchen', gmv: 36750000, pct: 15, growth: 12 },
      { name: 'Beauty', gmv: 24500000, pct: 10, growth: 28 },
      { name: 'Others', gmv: 36750000, pct: 15, growth: 8 },
    ],
    topSellers: [
      { name: 'TechVision Electronics', gmv: 45200000, orders: 15200 },
      { name: 'FashionHub India', gmv: 28500000, orders: 8500 },
      { name: 'HomeStyle Living', gmv: 18900000, orders: 5200 },
    ],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>📈 GMV Analytics</h1>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {['7d', '30d', '90d', '1y'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.8rem', background: period === p ? 'rgba(99,102,241,0.2)' : 'transparent', color: period === p ? '#a78bfa' : '#8b8b9e', cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
        </div>

        <div style={{ ...cs, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {[{ l: 'Total GMV', v: `₹${(data.totalGMV / 10000000).toFixed(1)}Cr`, c: '#6bcb77' }, { l: 'Net Revenue', v: `₹${(data.netRevenue / 100000).toFixed(0)}L`, c: '#a78bfa' }, { l: 'Orders', v: `${(data.orders / 1000).toFixed(0)}K`, c: '#4d96ff' }, { l: 'AOV', v: `₹${data.aov.toLocaleString()}`, c: '#fbbf24' }, { l: 'Growth', v: `+${data.growth}%`, c: '#6bcb77' }].map(k => (
            <div key={k.l} style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>{k.l}</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: k.c }}>{k.v}</div></div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Monthly GMV Trend</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '140px' }}>
              {data.monthly.map(m => (
                <div key={m.month} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ background: 'linear-gradient(to top, rgba(99,102,241,0.3), rgba(99,102,241,0.8))', borderRadius: '6px 6px 0 0', height: `${(m.gmv / 245) * 100}%`, minHeight: 20 }} />
                  <div style={{ fontSize: '0.7rem', color: '#8b8b9e', marginTop: '4px' }}>{m.month}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>By Category</h3>
            {data.byCategory.map(c => (
              <div key={c.name} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span>{c.name}</span><span style={{ fontWeight: 600 }}>₹{(c.gmv / 10000000).toFixed(1)}Cr <span style={{ color: '#6bcb77', fontSize: '0.75rem' }}>+{c.growth}%</span></span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}><div style={{ height: '100%', borderRadius: 4, background: '#a78bfa', width: `${c.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div style={cs}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Top Sellers by GMV</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Seller', 'GMV', 'Orders'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>{data.topSellers.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: '#6bcb77' }}>₹{(s.gmv / 10000000).toFixed(1)}Cr</td>
                <td style={{ padding: '0.75rem' }}>{s.orders.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
