'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ReviewModerationPage() {
  const [tab, setTab] = useState<'pending' | 'flagged' | 'approved'>('pending');
  
  const reviews = [
    { id: '1', product: 'iPhone 15 Pro', customer: 'User123', rating: 5, text: 'Best phone ever! Highly recommend.', date: '2h ago', status: 'pending', flags: 0 },
    { id: '2', product: 'Laptop Backpack', customer: 'User456', rating: 1, text: 'WORST PRODUCT EVER!!! DO NOT BUY!! SCAM!!!', date: '4h ago', status: 'flagged', flags: 3, reason: 'Excessive caps, possible spam' },
    { id: '3', product: 'Smart Watch', customer: 'User789', rating: 5, text: 'Buy from www.spam-link.com for better deals!', date: '6h ago', status: 'flagged', flags: 5, reason: 'Contains external links' },
    { id: '4', product: 'USB Hub', customer: 'UserABC', rating: 4, text: 'Works great, slight heating issue under load but manageable.', date: '1d ago', status: 'approved', flags: 0 },
  ];

  const filtered = reviews.filter(r => r.status === tab);

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link href="/admin/marketplace" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Dashboard</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>📋 Review Moderation</h1>
        <p style={{ color: '#8b8b9e', marginBottom: '1.5rem' }}>{reviews.filter(r => r.status !== 'approved').length} reviews need attention</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['pending', 'flagged', 'approved'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', fontWeight: 600, fontSize: '0.85rem',
              background: tab === t ? (t === 'flagged' ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)') : 'rgba(255,255,255,0.05)',
              color: tab === t ? '#fff' : '#8b8b9e', cursor: 'pointer', textTransform: 'capitalize',
            }}>{t} ({reviews.filter(r => r.status === t).length})</button>
          ))}
        </div>

        {filtered.map(r => (
          <div key={r.id} style={{
            background: r.status === 'flagged' ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${r.status === 'flagged' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '14px', padding: '1.25rem', marginBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div><span style={{ color: '#a78bfa', fontWeight: 600, fontSize: '0.85rem' }}>{r.product}</span> <span style={{ color: '#8b8b9e', fontSize: '0.8rem' }}>by {r.customer}</span></div>
              <span style={{ color: '#8b8b9e', fontSize: '0.75rem' }}>{r.date}</span>
            </div>
            <div style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>{'⭐'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
            <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.4 }}>{r.text}</div>
            {r.reason && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.8rem', color: '#f87171', marginBottom: '0.5rem' }}>⚠️ {r.reason} ({r.flags} flags)</div>}
            {r.status !== 'approved' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: '#6bcb77', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}>✓ Approve</button>
                <button style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}>✕ Reject</button>
                <button style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e6e6e6', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}>Block User</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
