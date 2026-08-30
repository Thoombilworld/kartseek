'use client';
import Link from 'next/link';

export default function TrafficDashboardPage() {
  const trafficSources = [
    { source: 'Organic Search', sessions: 125000, share: 42, change: 5.2, color: '#6bcb77' },
    { source: 'Direct', sessions: 68000, share: 23, change: 1.8, color: '#4d96ff' },
    { source: 'Social Media', sessions: 45000, share: 15, change: 12.5, color: '#a78bfa' },
    { source: 'Paid Search', sessions: 32000, share: 11, change: -2.3, color: '#fbbf24' },
    { source: 'Email', sessions: 18000, share: 6, change: 8.1, color: '#f97316' },
    { source: 'Referral', sessions: 9000, share: 3, change: 3.4, color: '#f87171' },
  ];

  const topPages = [
    { page: '/marketplace', views: 85000, bounceRate: 32, avgTime: '2m 15s' },
    { page: '/marketplace/product/iphone-15', views: 42000, bounceRate: 18, avgTime: '4m 30s' },
    { page: '/marketplace/flash-deals', views: 28000, bounceRate: 25, avgTime: '3m 45s' },
    { page: '/marketplace/categories/electronics', views: 22000, bounceRate: 28, avgTime: '2m 50s' },
    { page: '/marketplace/new-arrivals', views: 18000, bounceRate: 35, avgTime: '2m 00s' },
  ];

  const deviceBreakdown = [
    { device: 'Mobile', share: 62, sessions: 185000, color: '#6366f1' },
    { device: 'Desktop', share: 30, sessions: 89000, color: '#8b5cf6' },
    { device: 'Tablet', share: 8, sessions: 24000, color: '#a78bfa' },
  ];

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Dashboard</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>🌐 Traffic Analytics</h1>

        {/* KPIs */}
        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Total Sessions', value: '297K', color: '#a78bfa' },
            { label: 'Unique Visitors', value: '182K', color: '#4d96ff' },
            { label: 'Bounce Rate', value: '28.5%', color: '#fbbf24' },
            { label: 'Pages/Session', value: '4.2', color: '#6bcb77' },
            { label: 'Avg Duration', value: '3m 12s', color: '#f97316' },
          ].map(kpi => (
            <div key={kpi.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              <div style={{ color: '#8b8b9e', fontSize: '0.7rem' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          {/* Traffic Sources */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Traffic Sources</h3>
            {trafficSources.map(src => (
              <div key={src.source} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: src.color }} />
                    <span>{src.source}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ color: '#8b8b9e' }}>{(src.sessions / 1000).toFixed(0)}K ({src.share}%)</span>
                    <span style={{ color: src.change >= 0 ? '#6bcb77' : '#f87171', fontWeight: 600, minWidth: '50px', textAlign: 'right' }}>{src.change >= 0 ? '+' : ''}{src.change}%</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '3px', height: '4px' }}>
                  <div style={{ width: `${src.share}%`, height: '100%', background: src.color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Device Breakdown */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Device Breakdown</h3>
            {deviceBreakdown.map(d => (
              <div key={d.device} style={{ textAlign: 'center', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: d.color }}>{d.share}%</div>
                <div style={{ fontSize: '0.85rem' }}>{d.device}</div>
                <div style={{ color: '#8b8b9e', fontSize: '0.75rem' }}>{(d.sessions / 1000).toFixed(0)}K sessions</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Top Pages</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
              {['Page', 'Views', 'Bounce Rate', 'Avg Time'].map(h => <th key={h} style={{ padding: '0.6rem', textAlign: 'left', color: '#8b8b9e', fontSize: '0.8rem', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {topPages.map(p => (
                <tr key={p.page} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.6rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#a78bfa' }}>{p.page}</td>
                  <td style={{ padding: '0.6rem', fontWeight: 600 }}>{(p.views / 1000).toFixed(0)}K</td>
                  <td style={{ padding: '0.6rem' }}><span style={{ color: p.bounceRate < 25 ? '#6bcb77' : p.bounceRate < 35 ? '#fbbf24' : '#f87171' }}>{p.bounceRate}%</span></td>
                  <td style={{ padding: '0.6rem', color: '#8b8b9e' }}>{p.avgTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
