'use client';
import { useState } from 'react';

export default function RecommendationConfigPage() {
  const models = [
    { name: 'Collaborative Filtering', type: 'User-based', status: 'ACTIVE', accuracy: 82.5, latency: '12ms', lastTrained: '2026-06-30', dataPoints: '2.4M' },
    { name: 'Content-Based Similarity', type: 'Item-based', status: 'ACTIVE', accuracy: 78.2, latency: '8ms', lastTrained: '2026-06-28', dataPoints: '850K' },
    { name: 'Trending Score', type: 'Popularity', status: 'ACTIVE', accuracy: 71.0, latency: '3ms', lastTrained: '2026-07-01', dataPoints: '120K' },
    { name: 'Deep Learning (BERT)', type: 'Neural', status: 'STAGING', accuracy: 88.1, latency: '45ms', lastTrained: '2026-06-25', dataPoints: '5.2M' },
  ];
  const placements = [
    { location: 'Product Page — "Similar Products"', model: 'Content-Based Similarity', ctr: 4.2, conversion: 1.8, revenue: 2400000 },
    { location: 'Home — "Recommended for You"', model: 'Collaborative Filtering', ctr: 6.5, conversion: 2.4, revenue: 5200000 },
    { location: 'Cart — "Frequently Bought Together"', model: 'Collaborative Filtering', ctr: 8.1, conversion: 3.2, revenue: 3800000 },
    { location: 'Home — "Trending Now"', model: 'Trending Score', ctr: 5.8, conversion: 1.5, revenue: 1800000 },
  ];
  const cs = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>🤖 Recommendation Engine</h1>
        <div style={{ ...cs }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>ML Models</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Model', 'Type', 'Status', 'Accuracy', 'Latency', 'Last Trained', 'Data'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.7rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>{models.map((m, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 700 }}>{m.name}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{m.type}</td>
                <td style={{ padding: '0.75rem' }}><span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '6px', background: m.status === 'ACTIVE' ? 'rgba(107,203,119,0.15)' : 'rgba(251,191,36,0.15)', color: m.status === 'ACTIVE' ? '#6bcb77' : '#fbbf24' }}>{m.status}</span></td>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: m.accuracy >= 85 ? '#6bcb77' : '#fbbf24' }}>{m.accuracy}%</td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{m.latency}</td>
                <td style={{ padding: '0.75rem', color: '#8b8b9e', fontSize: '0.85rem' }}>{m.lastTrained}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{m.dataPoints}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{ ...cs }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Placements & Performance</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Placement', 'Model', 'CTR', 'Conversion', 'Revenue'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.7rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>{placements.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600, fontSize: '0.85rem' }}>{p.location}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#a78bfa' }}>{p.model}</td>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{p.ctr}%</td>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{p.conversion}%</td>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: '#6bcb77' }}>₹{(p.revenue / 100000).toFixed(0)}L</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
