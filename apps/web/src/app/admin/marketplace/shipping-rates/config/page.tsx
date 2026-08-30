'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ShippingConfigPage() {
  const [rates, setRates] = useState([
    { zone: 'Local (same city)', standard: 29, express: 79, sameDay: 149, freeThreshold: 499, weight: '< 500g' },
    { zone: 'Regional (same state)', standard: 49, express: 129, sameDay: 249, freeThreshold: 999, weight: '< 500g' },
    { zone: 'National', standard: 69, express: 179, sameDay: 0, freeThreshold: 1499, weight: '< 500g' },
    { zone: 'Remote / NE India', standard: 99, express: 249, sameDay: 0, freeThreshold: 2499, weight: '< 500g' },
  ]);

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/admin/marketplace" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Back to Admin</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>🚚 Shipping Rate Configuration</h1>
        <p style={{ color: '#8b8b9e', marginBottom: '1.5rem' }}>Configure shipping rates by zone and delivery speed.</p>

        <div style={cardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                  {['Zone', 'Standard (₹)', 'Express (₹)', 'Same Day (₹)', 'Free Above (₹)', 'Weight'].map(h => (
                    <th key={h} style={{ padding: '0.7rem', textAlign: 'left', color: '#8b8b9e', fontWeight: 600, fontSize: '0.8rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rates.map((rate, i) => (
                  <tr key={rate.zone} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.7rem', fontWeight: 500 }}>{rate.zone}</td>
                    <td style={{ padding: '0.7rem' }}><span style={{ color: '#6bcb77', fontWeight: 600 }}>₹{rate.standard}</span></td>
                    <td style={{ padding: '0.7rem' }}><span style={{ color: '#4d96ff', fontWeight: 600 }}>₹{rate.express}</span></td>
                    <td style={{ padding: '0.7rem' }}>{rate.sameDay ? <span style={{ color: '#f97316', fontWeight: 600 }}>₹{rate.sameDay}</span> : <span style={{ color: '#8b8b9e' }}>N/A</span>}</td>
                    <td style={{ padding: '0.7rem' }}><span style={{ color: '#a78bfa', fontWeight: 600 }}>₹{rate.freeThreshold}</span></td>
                    <td style={{ padding: '0.7rem', color: '#8b8b9e', fontSize: '0.85rem' }}>{rate.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weight surcharges */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Weight Surcharges</h3>
          {[
            { range: '500g – 1kg', surcharge: '+₹20' },
            { range: '1kg – 5kg', surcharge: '+₹50' },
            { range: '5kg – 10kg', surcharge: '+₹100' },
            { range: '10kg – 25kg', surcharge: '+₹250' },
            { range: '25kg+', surcharge: 'Custom quote' },
          ].map(w => (
            <div key={w.range} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
              <span style={{ color: '#8b8b9e' }}>{w.range}</span><span style={{ fontWeight: 600, color: '#fbbf24' }}>{w.surcharge}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e6e6e6', fontWeight: 600, cursor: 'pointer' }}>Reset to Defaults</button>
          <button style={{ flex: 2, padding: '0.9rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Configuration</button>
        </div>
      </div>
    </div>
  );
}
