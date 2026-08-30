'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function GiftCardCreatePage() {
  const [form, setForm] = useState({ code: '', amount: '', expiryDays: '365', maxRedemptions: '1', senderName: '', recipientEmail: '', message: '', batchSize: '1' });
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = `GIFT-${Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('')}-${Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('')}`;
    update('code', code);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e6e6e6', outline: 'none', fontSize: '0.9rem' };
  const labelStyle: React.CSSProperties = { display: 'block', color: '#8b8b9e', fontSize: '0.8rem', marginBottom: '0.3rem', fontWeight: 600 };
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  const presetAmounts = [500, 1000, 2000, 5000, 10000, 25000];

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/gift-cards" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Back to Gift Cards</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>🎁 Create Gift Card</h1>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Card Details</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1 }}><label style={labelStyle} htmlFor="gift-card-code">Gift Card Code</label><input id="gift-card-code" value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} placeholder="Auto-generated" style={{ ...inputStyle, fontFamily: 'monospace' }} /></div>
            <button onClick={generateCode} style={{ alignSelf: 'flex-end', padding: '0.7rem 1rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>🎲 Generate</button>
          </div>
          <label style={labelStyle}>Amount (₹) *</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {presetAmounts.map(a => (
              <button key={a} onClick={() => update('amount', String(a))} style={{
                padding: '0.4rem 0.8rem', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                background: form.amount === String(a) ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.08)',
                color: form.amount === String(a) ? '#fff' : '#8b8b9e',
              }}>₹{a.toLocaleString()}</button>
            ))}
          </div>
          <input type="number" value={form.amount} onChange={e => update('amount', e.target.value)} placeholder="Custom amount" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
            <div><label style={labelStyle} htmlFor="expiry-days">Expiry (days)</label><input id="expiry-days" type="number" value={form.expiryDays} onChange={e => update('expiryDays', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="batch-size">Batch Size</label><input id="batch-size" type="number" value={form.batchSize} onChange={e => update('batchSize', e.target.value)} min="1" max="1000" style={inputStyle} /></div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Personalization (optional)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={labelStyle} htmlFor="sender-name">Sender Name</label><input id="sender-name" value={form.senderName} onChange={e => update('senderName', e.target.value)} placeholder="From" style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="recipient-email">Recipient Email</label><input id="recipient-email" value={form.recipientEmail} onChange={e => update('recipientEmail', e.target.value)} placeholder="To" style={inputStyle} /></div>
          </div>
          <div style={{ marginTop: '0.75rem' }}><label style={labelStyle} htmlFor="message">Message</label><textarea id="message" value={form.message} onChange={e => update('message', e.target.value)} placeholder="Happy Birthday! 🎉" style={{ ...inputStyle, minHeight: '60px' }} /></div>
        </div>

        {form.code && form.amount && (
          <div style={{ background: 'linear-gradient(135deg, rgba(107,203,119,0.1), rgba(77,150,255,0.08))', border: '1px solid rgba(107,203,119,0.2)', borderRadius: '14px', padding: '1.5rem', textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>PREVIEW</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 700, color: '#6bcb77', marginTop: '0.5rem' }}>{form.code}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.3rem' }}>₹{Number(form.amount).toLocaleString()}</div>
            {form.message && <div style={{ color: '#a78bfa', fontSize: '0.9rem', marginTop: '0.3rem' }}>"{form.message}"</div>}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/marketplace/gift-cards" style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e6e6e6', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Cancel</Link>
          <button style={{ flex: 2, padding: '0.9rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6bcb77, #4ade80)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{Number(form.batchSize) > 1 ? `Generate ${form.batchSize} Cards` : 'Create Gift Card'}</button>
        </div>
      </div>
    </div>
  );
}
