'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function BannerCreatePage() {
  const [form, setForm] = useState({ title: '', subtitle: '', linkUrl: '', position: 'HOME_HERO', startDate: '', endDate: '', priority: '1', isActive: true });
  const update = (key: string, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e6e6e6', outline: 'none', fontSize: '0.9rem' };
  const labelStyle: React.CSSProperties = { display: 'block', color: '#8b8b9e', fontSize: '0.8rem', marginBottom: '0.3rem', fontWeight: 600 };
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/banners" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Back to Banners</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>🖼️ Create Banner</h1>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Banner Content</h3>
          <div style={{ marginBottom: '0.75rem' }}><label style={labelStyle} htmlFor="title">Title *</label><input id="title" value={form.title} onChange={e => update('title', e.target.value)} placeholder="Banner headline" style={inputStyle} /></div>
          <div style={{ marginBottom: '0.75rem' }}><label style={labelStyle} htmlFor="subtitle">Subtitle</label><input id="subtitle" value={form.subtitle} onChange={e => update('subtitle', e.target.value)} placeholder="Supporting text" style={inputStyle} /></div>
          <div style={{ marginBottom: '0.75rem' }}><label style={labelStyle} htmlFor="link-url">Link URL</label><input id="link-url" value={form.linkUrl} onChange={e => update('linkUrl', e.target.value)} placeholder="/marketplace/flash-deals" style={inputStyle} /></div>
          <label style={labelStyle}>Banner Image *</label>
          <div style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
            <div style={{ color: '#8b8b9e' }}>Upload banner image (1920×600 recommended)</div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Placement & Scheduling</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle} htmlFor="position">Position *</label>
              <select id="position" value={form.position} onChange={e => update('position', e.target.value)} style={inputStyle}>
                {['HOME_HERO', 'HOME_MIDDLE', 'CATEGORY_TOP', 'SEARCH_RESULTS', 'CHECKOUT', 'SIDEBAR'].map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div><label style={labelStyle} htmlFor="priority">Priority</label><input id="priority" type="number" value={form.priority} onChange={e => update('priority', e.target.value)} min="1" max="100" style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="start-date">Start Date</label><input id="start-date" type="datetime-local" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="end-date">End Date</label><input id="end-date" type="datetime-local" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={inputStyle} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => update('isActive', e.target.checked)} style={{ accentColor: '#6366f1' }} />
            <label style={{ fontSize: '0.9rem' }}>Active immediately</label>
          </div>
        </div>

        {/* Preview */}
        {form.title && (
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '14px', padding: '2rem', textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#8b8b9e', marginBottom: '0.5rem' }}>PREVIEW</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.3rem' }}>{form.title}</div>
            {form.subtitle && <div style={{ color: '#a78bfa' }}>{form.subtitle}</div>}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/marketplace/banners" style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e6e6e6', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Cancel</Link>
          <button style={{ flex: 2, padding: '0.9rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Create Banner</button>
        </div>
      </div>
    </div>
  );
}
