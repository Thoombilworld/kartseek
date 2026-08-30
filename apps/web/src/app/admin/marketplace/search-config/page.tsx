'use client';
import { useState } from 'react';

export default function SearchConfigPage() {
  const [tab, setTab] = useState('ranking');
  const config = {
    ranking: [
      { field: 'relevance_score', weight: 40, boost: true },
      { field: 'sales_velocity', weight: 20, boost: true },
      { field: 'rating', weight: 15, boost: true },
      { field: 'freshness', weight: 10, boost: true },
      { field: 'seller_score', weight: 10, boost: true },
      { field: 'price_competitiveness', weight: 5, boost: false },
    ],
    synonyms: [
      { term: 'mobile', synonyms: 'phone, smartphone, cellphone, handset' },
      { term: 'laptop', synonyms: 'notebook, ultrabook, macbook' },
      { term: 'headphones', synonyms: 'earphones, earbuds, headset, AirPods' },
      { term: 'TV', synonyms: 'television, smart TV, LED TV, OLED' },
    ],
    stopwords: ['the', 'a', 'an', 'is', 'for', 'with', 'and', 'or', 'in', 'on', 'at', 'to', 'of', 'buy', 'best', 'price'],
  };
  const cs = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>🔍 Search Configuration</h1>
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {['ranking', 'synonyms', 'stopwords'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 600, fontSize: '0.85rem', background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent', color: tab === t ? '#a78bfa' : '#8b8b9e', cursor: 'pointer', textTransform: 'capitalize', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent' }}>{t}</button>
          ))}
        </div>
        {tab === 'ranking' && (
          <div style={{ ...cs }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Ranking Factors</h3>
            {config.ranking.map((r, i) => (
              <div key={i} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.field}</span><span style={{ fontWeight: 700, color: '#a78bfa' }}>{r.weight}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.06)' }}><div style={{ height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, rgba(99,102,241,0.5), rgba(99,102,241,1))', width: r.weight + '%' }} /></div>
              </div>
            ))}
          </div>
        )}
        {tab === 'synonyms' && (
          <div style={{ ...cs }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Search Synonyms</h3>
              <button style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>+ Add</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Term', 'Synonyms', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>{config.synonyms.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>{s.term}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#c0c0c0' }}>{s.synonyms}</td>
                  <td style={{ padding: '0.75rem' }}><button style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {tab === 'stopwords' && (
          <div style={{ ...cs }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Stopwords ({config.stopwords.length})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {config.stopwords.map(w => <span key={w} style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#c0c0c0' }}>{w} ×</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
