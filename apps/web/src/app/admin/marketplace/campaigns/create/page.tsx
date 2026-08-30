'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function CampaignCreatePage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', type: 'SEASONAL', startDate: '', endDate: '', budget: '', targetRevenue: '', description: '', banner: '' });
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e6e6e6', outline: 'none', fontSize: '0.9rem' };
  const labelStyle: React.CSSProperties = { display: 'block', color: '#8b8b9e', fontSize: '0.8rem', marginBottom: '0.3rem', fontWeight: 600 };
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/campaigns" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Back to Campaigns</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>🎯 Create Campaign</h1>

        {/* Steps */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {['Details', 'Budget', 'Content'].map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', background: i + 1 <= step ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.08)', color: i + 1 <= step ? '#fff' : '#8b8b9e', marginBottom: '0.3rem' }}>{i < step ? '✓' : i + 1}</div>
              <div style={{ fontSize: '0.8rem', color: i + 1 <= step ? '#a78bfa' : '#8b8b9e' }}>{s}</div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Campaign Details</h3>
            <div style={{ marginBottom: '0.75rem' }}><label style={labelStyle} htmlFor="campaign-name">Campaign Name *</label><input id="campaign-name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Independence Day Sale" style={inputStyle} /></div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle} htmlFor="campaign-type">Campaign Type *</label>
              <select id="campaign-type" value={form.type} onChange={e => update('type', e.target.value)} style={inputStyle}>
                {['SEASONAL', 'CLEARANCE', 'BRAND_PROMOTION', 'CATEGORY_SALE', 'FLASH_EVENT', 'LOYALTY_REWARD'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label style={labelStyle} htmlFor="start-date">Start Date *</label><input id="start-date" type="datetime-local" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle} htmlFor="end-date">End Date *</label><input id="end-date" type="datetime-local" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={inputStyle} /></div>
            </div>
            <div style={{ marginTop: '0.75rem' }}><label style={labelStyle} htmlFor="description">Description</label><textarea id="description" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Campaign description..." style={{ ...inputStyle, minHeight: '80px' }} /></div>
            <button onClick={() => setStep(2)} style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Continue</button>
          </div>
        )}

        {step === 2 && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Budget & Targets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label style={labelStyle} htmlFor="total-budget">Total Budget (₹) *</label><input id="total-budget" type="number" value={form.budget} onChange={e => update('budget', e.target.value)} placeholder="e.g. 500000" style={inputStyle} /></div>
              <div><label style={labelStyle} htmlFor="target-revenue">Target Revenue (₹)</label><input id="target-revenue" type="number" value={form.targetRevenue} onChange={e => update('targetRevenue', e.target.value)} placeholder="e.g. 5000000" style={inputStyle} /></div>
            </div>
            {form.budget && form.targetRevenue && (
              <div style={{ marginTop: '1rem', background: 'rgba(107,203,119,0.08)', border: '1px solid rgba(107,203,119,0.2)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem', color: '#6bcb77' }}>
                Expected ROI: {((Number(form.targetRevenue) / Number(form.budget) - 1) * 100).toFixed(0)}%
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e6e6e6', fontWeight: 600, cursor: 'pointer' }}>Back</button>
              <button onClick={() => setStep(3)} style={{ flex: 2, padding: '0.8rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Content & Creative</h3>
            <div style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
              <div style={{ color: '#8b8b9e' }}>Upload campaign banner</div>
              <div style={{ color: '#6b6b80', fontSize: '0.8rem' }}>1200×400px recommended</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e6e6e6', fontWeight: 600, cursor: 'pointer' }}>Back</button>
              <button style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 600, cursor: 'pointer' }}>Save Draft</button>
              <button style={{ flex: 2, padding: '0.8rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6bcb77, #4ade80)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Launch Campaign</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
