'use client';
import { useState } from 'react';

export default function ABTestsPage() {
  const tests = [
    { name: 'checkout_flow_v3', status: 'RUNNING', variant_a: 'Current 3-step checkout', variant_b: 'Single-page checkout', traffic: '50/50', started: '2026-06-15', visitors: 42000, conversionA: 4.2, conversionB: 5.8, confidence: 97.2, winner: 'B' },
    { name: 'product_card_layout', status: 'RUNNING', variant_a: 'Grid card with hover', variant_b: 'List card with quick-buy', traffic: '50/50', started: '2026-06-20', visitors: 28000, conversionA: 3.1, conversionB: 3.5, confidence: 82.5, winner: null },
    { name: 'cta_color_green', status: 'COMPLETED', variant_a: 'Blue CTA button', variant_b: 'Green CTA button', traffic: '50/50', started: '2026-05-01', visitors: 120000, conversionA: 2.8, conversionB: 3.6, confidence: 99.5, winner: 'B' },
    { name: 'search_suggestions', status: 'DRAFT', variant_a: 'Text suggestions', variant_b: 'Image + text suggestions', traffic: '30/70', started: '', visitors: 0, conversionA: 0, conversionB: 0, confidence: 0, winner: null },
  ];
  const cs = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>🧪 A/B Test Manager</h1>
          <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>+ New Experiment</button>
        </div>
        {tests.map((t, i) => (
          <div key={i} style={{ ...cs }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'monospace' }}>{t.name}</span>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '6px', background: t.status === 'RUNNING' ? 'rgba(107,203,119,0.15)' : t.status === 'COMPLETED' ? 'rgba(77,150,255,0.15)' : 'rgba(255,255,255,0.08)', color: t.status === 'RUNNING' ? '#6bcb77' : t.status === 'COMPLETED' ? '#4d96ff' : '#8b8b9e' }}>{t.status}</span>
              </div>
              {t.visitors > 0 && <span style={{ fontSize: '0.8rem', color: '#8b8b9e' }}>{(t.visitors / 1000).toFixed(0)}K visitors</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: t.winner === 'A' ? 'rgba(107,203,119,0.08)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.7rem', color: '#8b8b9e', marginBottom: '0.2rem' }}>Variant A (Control)</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t.variant_a}</div>
                {t.conversionA > 0 && <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e6e6e6', marginTop: '0.3rem' }}>{t.conversionA}% conversion</div>}
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: t.winner === 'B' ? 'rgba(107,203,119,0.08)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.7rem', color: '#8b8b9e', marginBottom: '0.2rem' }}>Variant B</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t.variant_b}</div>
                {t.conversionB > 0 && <div style={{ fontSize: '1.1rem', fontWeight: 700, color: t.winner === 'B' ? '#6bcb77' : '#e6e6e6', marginTop: '0.3rem' }}>{t.conversionB}% conversion {t.winner === 'B' && '🏆'}</div>}
              </div>
            </div>
            {t.confidence > 0 && <div style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>Statistical confidence: <span style={{ fontWeight: 700, color: t.confidence >= 95 ? '#6bcb77' : '#fbbf24' }}>{t.confidence}%</span> • Traffic split: {t.traffic} • Started: {t.started}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
