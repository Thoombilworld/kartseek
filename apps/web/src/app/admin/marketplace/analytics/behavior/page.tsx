'use client';
import { useState } from 'react';

export default function UserBehaviorPage() {
  const [view, setView] = useState<'funnel' | 'heatmap' | 'sessions'>('funnel');
  const funnel = [
    { stage: 'Homepage Visit', users: 892000, rate: 100 },
    { stage: 'Category/Search', users: 623400, rate: 69.9 },
    { stage: 'Product View', users: 445200, rate: 49.9 },
    { stage: 'Add to Cart', users: 133560, rate: 15.0 },
    { stage: 'Checkout Start', users: 89040, rate: 10.0 },
    { stage: 'Payment Complete', users: 44520, rate: 5.0 },
    { stage: 'Order Delivered', users: 42300, rate: 4.7 },
  ];
  const heatmapData = [
    { page: 'Home', clicks: { hero: 45, categories: 25, deals: 20, search: 10 } },
    { page: 'Product', clicks: { buyNow: 35, addToCart: 30, reviews: 20, specs: 15 } },
  ];
  const sessions = [
    { id: 'S-001', user: 'priya@gmail.com', pages: 12, duration: '8m 30s', device: 'Mobile', converted: true },
    { id: 'S-002', user: 'rahul@gmail.com', pages: 5, duration: '3m 15s', device: 'Desktop', converted: false },
    { id: 'S-003', user: 'sneha@gmail.com', pages: 8, duration: '6m 40s', device: 'Mobile', converted: true },
  ];

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>🧠 User Behavior Analytics</h1>
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {(['funnel', 'heatmap', 'sessions'] as const).map(t => (
            <button key={t} onClick={() => setView(t)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 600, fontSize: '0.85rem', background: view === t ? 'rgba(99,102,241,0.15)' : 'transparent', color: view === t ? '#a78bfa' : '#8b8b9e', cursor: 'pointer', textTransform: 'capitalize', borderBottom: view === t ? '2px solid #6366f1' : '2px solid transparent' }}>{t === 'heatmap' ? 'Click Heatmap' : t === 'sessions' ? 'Session Replays' : 'Conversion Funnel'}</button>
          ))}
        </div>

        {view === 'funnel' && (
          <div style={cs}>
            {funnel.map((s, i) => (
              <div key={i} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{s.stage}</span>
                  <span>{(s.users / 1000).toFixed(0)}K <span style={{ color: '#8b8b9e' }}>({s.rate}%)</span></span>
                </div>
                <div style={{ height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ height: '100%', borderRadius: 6, background: `rgba(99,102,241,${0.3 + (s.rate / 100) * 0.7})`, width: `${s.rate}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'heatmap' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Click Distribution</h3>
            {heatmapData.map(p => (
              <div key={p.page} style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a78bfa', marginBottom: '0.5rem' }}>{p.page} Page</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {Object.entries(p.clicks).map(([area, pct]) => (
                    <div key={area} style={{ padding: '1rem', borderRadius: '10px', background: `rgba(239,68,68,${(pct as number) / 100})`, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{pct as number}%</div>
                      <div style={{ fontSize: '0.75rem', color: '#e6e6e6', textTransform: 'capitalize' }}>{area}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'sessions' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Sessions</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Session', 'User', 'Pages', 'Duration', 'Device', 'Converted'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>{sessions.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: '#a78bfa' }}>{s.id}</td>
                  <td style={{ padding: '0.75rem' }}>{s.user}</td>
                  <td style={{ padding: '0.75rem' }}>{s.pages}</td>
                  <td style={{ padding: '0.75rem' }}>{s.duration}</td>
                  <td style={{ padding: '0.75rem' }}>{s.device}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: s.converted ? 'rgba(107,203,119,0.15)' : 'rgba(239,68,68,0.15)', color: s.converted ? '#6bcb77' : '#f87171' }}>{s.converted ? 'Yes' : 'No'}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
