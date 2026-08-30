'use client';
import Link from 'next/link';

export default function FraudDetectionPage() {
  const alerts = [
    { id: 'FRD-001', type: 'Suspicious Login', severity: 'HIGH', user: 'user@example.com', ip: '103.21.XX.XX', location: 'Beijing, CN', time: '2 hours ago', status: 'INVESTIGATING' },
    { id: 'FRD-002', type: 'Bulk Fake Reviews', severity: 'CRITICAL', user: 'seller_xyz', details: '47 reviews from same IP range', time: '5 hours ago', status: 'CONFIRMED' },
    { id: 'FRD-003', type: 'Price Manipulation', severity: 'MEDIUM', user: 'seller_abc', details: 'Price inflated 300% before discount', time: '1 day ago', status: 'RESOLVED' },
    { id: 'FRD-004', type: 'Coupon Abuse', severity: 'HIGH', user: 'user2@example.com', details: 'Same coupon used from 12 accounts', time: '2 days ago', status: 'INVESTIGATING' },
    { id: 'FRD-005', type: 'Fake Returns', severity: 'MEDIUM', user: 'user3@example.com', details: 'Empty box returned 3 times', time: '3 days ago', status: 'INVESTIGATING' },
  ];

  const severityConfig: Record<string, { bg: string; color: string }> = {
    CRITICAL: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    HIGH: { bg: 'rgba(249,115,22,0.15)', color: '#f97316' },
    MEDIUM: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    LOW: { bg: 'rgba(99,102,241,0.15)', color: '#a78bfa' },
  };

  const statusConfig: Record<string, { bg: string; color: string }> = {
    INVESTIGATING: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    CONFIRMED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    RESOLVED: { bg: 'rgba(107,203,119,0.15)', color: '#6bcb77' },
  };

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/admin/marketplace" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Dashboard</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>🛡️ Fraud Detection</h1>

        {/* KPIs */}
        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Active Alerts', value: '3', color: '#f87171' },
            { label: 'Blocked This Month', value: '47', color: '#fbbf24' },
            { label: 'Revenue Saved', value: '₹2.8L', color: '#6bcb77' },
            { label: 'False Positive Rate', value: '4.2%', color: '#a78bfa' },
          ].map(kpi => (
            <div key={kpi.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              <div style={{ color: '#8b8b9e', fontSize: '0.75rem' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Alerts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.map(alert => {
            const sev = severityConfig[alert.severity];
            const st = statusConfig[alert.status];
            return (
              <div key={alert.id} style={{
                ...cardStyle, marginBottom: 0,
                borderLeft: `4px solid ${sev.color}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>{alert.id}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: sev.bg, color: sev.color }}>{alert.severity}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: st.bg, color: st.color }}>{alert.status}</span>
                  </div>
                  <span style={{ color: '#8b8b9e', fontSize: '0.75rem' }}>{alert.time}</span>
                </div>
                <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{alert.type}</div>
                <div style={{ color: '#8b8b9e', fontSize: '0.85rem' }}>
                  User: <span style={{ color: '#a78bfa' }}>{alert.user}</span>
                  {alert.details && <> • {alert.details}</>}
                  {alert.location && <> • Location: {alert.location}</>}
                </div>
                {alert.status !== 'RESOLVED' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}>Block User</button>
                    <button style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(107,203,119,0.3)', background: 'rgba(107,203,119,0.1)', color: '#6bcb77', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}>Mark Resolved</button>
                    <button style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e6e6e6', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}>Investigate</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
