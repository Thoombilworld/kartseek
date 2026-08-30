'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function FlashDealCreatePage() {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', discountPercentage: '', maxProducts: '20', status: 'DRAFT' });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e6e6e6', outline: 'none', fontSize: '0.9rem' };
  const labelStyle: React.CSSProperties = { display: 'block', color: '#8b8b9e', fontSize: '0.8rem', marginBottom: '0.3rem', fontWeight: 600 };
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  const sampleProducts = [
    { id: '1', name: 'iPhone 15 Pro', price: 134900 },
    { id: '2', name: 'Samsung Galaxy S24', price: 79999 },
    { id: '3', name: 'Sony WH-1000XM5', price: 29990 },
    { id: '4', name: 'MacBook Air M3', price: 114900 },
    { id: '5', name: 'iPad Air', price: 69900 },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/flash-deals" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Back to Flash Deals</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>⚡ Create Flash Deal</h1>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Deal Details</h3>
          <div style={{ marginBottom: '0.75rem' }}><label style={labelStyle} htmlFor="deal-name">Deal Name *</label><input id="deal-name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Mega Electronics Sale" style={inputStyle} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={labelStyle} htmlFor="start-date-time">Start Date/Time *</label><input id="start-date-time" type="datetime-local" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="end-date-time">End Date/Time *</label><input id="end-date-time" type="datetime-local" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="discount">Discount % *</label><input id="discount" type="number" value={form.discountPercentage} onChange={e => update('discountPercentage', e.target.value)} placeholder="e.g. 35" style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="max-products">Max Products</label><input id="max-products" type="number" value={form.maxProducts} onChange={e => update('maxProducts', e.target.value)} style={inputStyle} /></div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Select Products ({selectedProducts.length} selected)</h3>
          {sampleProducts.map(p => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '10px', cursor: 'pointer', marginBottom: '0.3rem', background: selectedProducts.includes(p.id) ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'all 0.2s' }}>
              <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => setSelectedProducts(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} style={{ accentColor: '#6366f1', width: '18px', height: '18px' }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500 }}>{p.name}</span>
                <span style={{ color: '#8b8b9e', fontSize: '0.8rem', marginLeft: '0.5rem' }}>₹{p.price.toLocaleString()}</span>
              </div>
              {form.discountPercentage && <span style={{ color: '#6bcb77', fontWeight: 600, fontSize: '0.85rem' }}>₹{Math.round(p.price * (1 - Number(form.discountPercentage) / 100)).toLocaleString()}</span>}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/marketplace/flash-deals" style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e6e6e6', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Cancel</Link>
          <button style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 600, cursor: 'pointer' }}>Save Draft</button>
          <button style={{ flex: 2, padding: '0.9rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #ef4444, #f97316)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>⚡ Publish Deal</button>
        </div>
      </div>
    </div>
  );
}
