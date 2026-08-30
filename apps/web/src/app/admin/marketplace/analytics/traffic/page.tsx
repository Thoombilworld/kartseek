'use client';
import { useState } from 'react';

export default function TrafficAnalyticsPage() {
  const [period, setPeriod] = useState('7d');
  const data = {
    totalViews: 2840000, uniqueVisitors: 892000, sessions: 1250000, bounceRate: 38.5, avgSessionDuration: '4m 32s', pagesPerSession: 5.2,
    sources: [
      { name: 'Organic Search', sessions: 487500, pct: 39, color: '#6bcb77' },
      { name: 'Direct', sessions: 312500, pct: 25, color: '#4d96ff' },
      { name: 'Social Media', sessions: 187500, pct: 15, color: '#a78bfa' },
      { name: 'Paid Ads', sessions: 137500, pct: 11, color: '#fbbf24' },
      { name: 'Email', sessions: 75000, pct: 6, color: '#f472b6' },
      { name: 'Referral', sessions: 50000, pct: 4, color: '#fb923c' },
    ],
    topPages: [
      { page: '/marketplace/home', views: 420000, avgTime: '2m 10s' },
      { page: '/marketplace/products', views: 380000, avgTime: '3m 45s' },
      { page: '/marketplace/flash-deals', views: 210000, avgTime: '4m 20s' },
      { page: '/marketplace/categories/electronics', views: 185000, avgTime: '2m 55s' },
      { page: '/marketplace/search?q=phone', views: 145000, avgTime: '1m 40s' },
    ],
    devices: [{ name: 'Mobile', pct: 72 }, { name: 'Desktop', pct: 22 }, { name: 'Tablet', pct: 6 }],
    daily: [320, 380, 410, 450, 520, 680, 780, 720, 620, 550, 480, 430, 390, 360],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>📊 Traffic Analytics</h1>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {['24h', '7d', '30d', '90d'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.8rem', background: period === p ? 'rgba(99,102,241,0.2)' : 'transparent', color: period === p ? '#a78bfa' : '#8b8b9e', cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
        </div>

        <div style={{ ...cs, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
          {[{ l: 'Page Views', v: `${(data.totalViews / 1000000).toFixed(1)}M`, c: '#a78bfa' }, { l: 'Unique Visitors', v: `${(data.uniqueVisitors / 1000).toFixed(0)}K`, c: '#4d96ff' }, { l: 'Sessions', v: `${(data.sessions / 1000000).toFixed(1)}M`, c: '#6bcb77' }, { l: 'Bounce Rate', v: `${data.bounceRate}%`, c: '#fbbf24' }, { l: 'Avg Duration', v: data.avgSessionDuration, c: '#f472b6' }, { l: 'Pages/Session', v: data.pagesPerSession.toString(), c: '#fb923c' }].map(k => (
            <div key={k.l} style={{ textAlign: 'center' }}><div style={{ fontSize: '0.65rem', color: '#8b8b9e' }}>{k.l}</div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: k.c }}>{k.v}</div></div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Daily Sessions (last 14 days)</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }}>
              {data.daily.map((v, i) => (
                <div key={i} style={{ flex: 1, background: `rgba(99,102,241,${0.3 + (v / 780) * 0.7})`, borderRadius: '4px 4px 0 0', height: `${(v / 780) * 100}%` }} title={`${v}K sessions`} />
              ))}
            </div>
          </div>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Devices</h3>
            {data.devices.map(d => (
              <div key={d.name} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}><span>{d.name}</span><span style={{ fontWeight: 600 }}>{d.pct}%</span></div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}><div style={{ height: '100%', borderRadius: 4, background: '#a78bfa', width: `${d.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Traffic Sources</h3>
            {data.sources.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</span></div>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.pct}%</span>
                <span style={{ color: '#8b8b9e', fontSize: '0.8rem', width: 70, textAlign: 'right' }}>{(s.sessions / 1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Top Pages</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Page', 'Views', 'Avg Time'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.7rem', color: '#8b8b9e' }}>{h}</th>)}
              </tr></thead>
              <tbody>{data.topPages.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>{p.page}</td>
                  <td style={{ padding: '0.5rem', fontSize: '0.8rem' }}>{(p.views / 1000).toFixed(0)}K</td>
                  <td style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#8b8b9e' }}>{p.avgTime}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
