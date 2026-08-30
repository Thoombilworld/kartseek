'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function AdminABTestsPage() {
  const [tests] = useState([
    { id: 'AB-001', name: 'Checkout Button Color', status: 'RUNNING', started: 'Jun 25', variantA: { name: 'Purple', cvr: 3.4, traffic: 50 }, variantB: { name: 'Green', cvr: 3.8, traffic: 50 }, confidence: 87, sampleSize: 12500 },
    { id: 'AB-002', name: 'Product Page Layout', status: 'RUNNING', started: 'Jun 28', variantA: { name: 'Grid', cvr: 2.1, traffic: 50 }, variantB: { name: 'List', cvr: 2.5, traffic: 50 }, confidence: 72, sampleSize: 8200 },
    { id: 'AB-003', name: 'Free Shipping Threshold', status: 'COMPLETED', started: 'Jun 10', variantA: { name: '₹999', cvr: 3.2, traffic: 50 }, variantB: { name: '₹499', cvr: 4.1, traffic: 50 }, confidence: 95, sampleSize: 25000, winner: 'B' },
    { id: 'AB-004', name: 'Homepage Hero Banner', status: 'DRAFT', started: '', variantA: { name: 'Carousel', cvr: 0, traffic: 50 }, variantB: { name: 'Static', cvr: 0, traffic: 50 }, confidence: 0, sampleSize: 0 },
  ]);

  const statusConfig: Record<string, { bg: string; color: string }> = {
    RUNNING: { bg: 'rgba(107,203,119,0.15)', color: '#6bcb77' },
    COMPLETED: { bg: 'rgba(99,102,241,0.15)', color: '#a78bfa' },
    DRAFT: { bg: 'rgba(255,255,255,0.1)', color: '#8b8b9e' },
  };

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link href="/admin/marketplace" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Dashboard</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>🧪 A/B Testing</h1>
          <button style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ New Test</button>
        </div>

        {tests.map(test => {
          const sc = statusConfig[test.status];
          return (
            <div key={test.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700 }}>{test.name}</span>
                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: sc.bg, color: sc.color }}>{test.status}</span>
                </div>
                <span style={{ color: '#8b8b9e', fontSize: '0.75rem' }}>{test.id}</span>
              </div>

              {test.status !== 'DRAFT' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {[test.variantA, test.variantB].map((v, i) => (
                      <div key={v.name} style={{
                        padding: '0.75rem', borderRadius: '10px',
                        background: (test as any).winner === (i === 0 ? 'A' : 'B') ? 'rgba(107,203,119,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${(test as any).winner === (i === 0 ? 'A' : 'B') ? 'rgba(107,203,119,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Variant {i === 0 ? 'A' : 'B'}: {v.name}</span>
                          {(test as any).winner === (i === 0 ? 'A' : 'B') && <span style={{ fontSize: '0.7rem', color: '#6bcb77', fontWeight: 700 }}>🏆 WINNER</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#8b8b9e' }}>CVR: <span style={{ color: '#e6e6e6', fontWeight: 600 }}>{v.cvr}%</span></span>
                          <span style={{ color: '#8b8b9e' }}>Traffic: {v.traffic}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#8b8b9e' }}>
                    <span>Confidence: <span style={{ color: test.confidence >= 95 ? '#6bcb77' : test.confidence >= 80 ? '#fbbf24' : '#f87171', fontWeight: 600 }}>{test.confidence}%</span></span>
                    <span>Sample: {(test.sampleSize / 1000).toFixed(1)}K</span>
                    <span>Started: {test.started}</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
