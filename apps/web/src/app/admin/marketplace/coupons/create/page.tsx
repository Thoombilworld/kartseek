'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function CouponCreatePage() {
  const [form, setForm] = useState({ code: '', type: 'PERCENTAGE', value: '', minOrderAmount: '', maxDiscount: '', usageLimit: '', perUserLimit: '1', startDate: '', endDate: '', description: '', applicableCategories: '', applicableProducts: '' });
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e6e6e6', outline: 'none', fontSize: '0.9rem' };
  const labelStyle: React.CSSProperties = { display: 'block', color: '#8b8b9e', fontSize: '0.8rem', marginBottom: '0.3rem', fontWeight: 600 };
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/coupons" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Back to Coupons</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create Coupon</h1>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Basic Info</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={labelStyle} htmlFor="coupon-code">Coupon Code *</label><input id="coupon-code" value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} placeholder="e.g. SUMMER20" style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '2px' }} /></div>
            <div>
              <label style={labelStyle} htmlFor="discount-type">Discount Type *</label>
              <select id="discount-type" value={form.type} onChange={e => update('type', e.target.value)} style={inputStyle}>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat Amount (₹)</option>
                <option value="FREE_SHIPPING">Free Shipping</option>
                <option value="BUY_X_GET_Y">Buy X Get Y</option>
              </select>
            </div>
            <div><label style={labelStyle} htmlFor="discount-value">Discount Value *</label><input id="discount-value" type="number" value={form.value} onChange={e => update('value', e.target.value)} placeholder={form.type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 500'} style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="max-discount-cap">Max Discount Cap (₹)</label><input id="max-discount-cap" type="number" value={form.maxDiscount} onChange={e => update('maxDiscount', e.target.value)} placeholder="e.g. 1000" style={inputStyle} /></div>
          </div>
          <div style={{ marginTop: '1rem' }}><label style={labelStyle} htmlFor="description">Description</label><textarea id="description" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Coupon description..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} /></div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Conditions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={labelStyle} htmlFor="min-order-amount">Min Order Amount (₹)</label><input id="min-order-amount" type="number" value={form.minOrderAmount} onChange={e => update('minOrderAmount', e.target.value)} placeholder="e.g. 999" style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="total-usage-limit">Total Usage Limit</label><input id="total-usage-limit" type="number" value={form.usageLimit} onChange={e => update('usageLimit', e.target.value)} placeholder="e.g. 1000" style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="per-user-limit">Per User Limit</label><input id="per-user-limit" type="number" value={form.perUserLimit} onChange={e => update('perUserLimit', e.target.value)} style={inputStyle} /></div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Validity</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={labelStyle} htmlFor="start-date">Start Date *</label><input id="start-date" type="datetime-local" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="end-date">End Date *</label><input id="end-date" type="datetime-local" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={inputStyle} /></div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Applicability (optional)</h3>
          <div><label style={labelStyle} htmlFor="category-ids-comma-separated">Category IDs (comma-separated)</label><input id="category-ids-comma-separated" value={form.applicableCategories} onChange={e => update('applicableCategories', e.target.value)} placeholder="Leave empty for all categories" style={inputStyle} /></div>
          <div style={{ marginTop: '0.75rem' }}><label style={labelStyle} htmlFor="product-ids-comma-separated">Product IDs (comma-separated)</label><input id="product-ids-comma-separated" value={form.applicableProducts} onChange={e => update('applicableProducts', e.target.value)} placeholder="Leave empty for all products" style={inputStyle} /></div>
        </div>

        {/* Preview */}
        {form.code && form.value && (
          <div style={{ background: 'rgba(107,203,119,0.06)', border: '1px solid rgba(107,203,119,0.2)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#8b8b9e' }}>Preview</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6bcb77', fontFamily: 'monospace' }}>{form.code}</div>
            <div style={{ color: '#a78bfa' }}>{form.type === 'PERCENTAGE' ? `${form.value}% off` : form.type === 'FREE_SHIPPING' ? 'Free Shipping' : `₹${form.value} off`}{form.maxDiscount ? ` (max ₹${form.maxDiscount})` : ''}</div>
            {form.minOrderAmount && <div style={{ color: '#8b8b9e', fontSize: '0.8rem' }}>Min. order ₹{form.minOrderAmount}</div>}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/marketplace/coupons" style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e6e6e6', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Cancel</Link>
          <button style={{ flex: 2, padding: '0.9rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>Create Coupon</button>
        </div>
      </div>
    </div>
  );
}
