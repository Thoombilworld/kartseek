'use client';
import { useState } from 'react';

export default function FeatureFlagsPage() {
  const [search, setSearch] = useState('');
  const flags = [
    { name: 'flash_deals_v2', description: 'New flash deals UI with countdown timer', status: true, env: 'Production', regions: ['IN', 'AE'], rollout: 100, lastModified: '2026-06-25', modifiedBy: 'Admin' },
    { name: 'voice_search', description: 'Enable voice search on mobile apps', status: true, env: 'Production', regions: ['IN'], rollout: 50, lastModified: '2026-06-20', modifiedBy: 'Admin' },
    { name: 'ar_preview', description: 'Augmented reality product preview', status: false, env: 'Staging', regions: ['IN'], rollout: 10, lastModified: '2026-06-28', modifiedBy: 'Admin' },
    { name: 'social_login_apple', description: 'Sign in with Apple', status: true, env: 'Production', regions: ['IN', 'AE', 'US'], rollout: 100, lastModified: '2026-06-15', modifiedBy: 'Admin' },
    { name: 'buy_now_pay_later', description: 'BNPL payment option (Simpl/LazyPay)', status: true, env: 'Production', regions: ['IN'], rollout: 75, lastModified: '2026-06-22', modifiedBy: 'Admin' },
    { name: 'seller_chat', description: 'In-app buyer-seller chat', status: false, env: 'Staging', regions: ['IN'], rollout: 5, lastModified: '2026-06-30', modifiedBy: 'Admin' },
    { name: 'dynamic_pricing', description: 'AI-powered dynamic pricing engine', status: false, env: 'Development', regions: [], rollout: 0, lastModified: '2026-07-01', modifiedBy: 'Admin' },
    { name: 'wishlist_sharing', description: 'Share wishlists with friends', status: true, env: 'Production', regions: ['IN', 'AE'], rollout: 100, lastModified: '2026-06-18', modifiedBy: 'Admin' },
  ];

  const filtered = flags.filter(f => f.name.includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase()));
  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>🚩 Feature Flags</h1>
          <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>+ New Flag</button>
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flags..." style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e6e6e6', fontSize: '0.9rem', marginBottom: '1rem', outline: 'none' }} />

        <div style={{ ...cs, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>Total Flags</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#a78bfa' }}>{flags.length}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>Active</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#6bcb77' }}>{flags.filter(f => f.status).length}</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>Inactive</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f87171' }}>{flags.filter(f => !f.status).length}</div></div>
        </div>

        {filtered.map((f, i) => (
          <div key={i} style={{ ...cs, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 24, borderRadius: 12, background: f.status ? '#6bcb77' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: f.status ? 23 : 3, transition: 'left 0.2s' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'monospace' }}>{f.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#8b8b9e' }}>{f.description}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: f.env === 'Production' ? 'rgba(107,203,119,0.15)' : f.env === 'Staging' ? 'rgba(251,191,36,0.15)' : 'rgba(77,150,255,0.15)', color: f.env === 'Production' ? '#6bcb77' : f.env === 'Staging' ? '#fbbf24' : '#4d96ff' }}>{f.env}</span>
              {f.regions.map(r => <span key={r} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#a78bfa' }}>{r}</span>)}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{f.rollout}%</div>
              <div style={{ fontSize: '0.65rem', color: '#6b6b7e' }}>{f.lastModified}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
