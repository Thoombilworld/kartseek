'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function MarketplaceGlobalConfigPage() {
  const [settings, setSettings] = useState({
    marketplaceName: 'KartSeek Marketplace',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    minOrderValue: '99',
    maxOrderValue: '500000',
    gstNumber: '27AABCU9603R1ZP',
    supportEmail: 'support@kartseek.com',
    supportPhone: '+91 1800-XXX-XXXX',
    autoApproveProducts: false,
    autoApproveReviews: true,
    enableCOD: true,
    enableGiftCards: true,
    enableWishlist: true,
    enableCompare: true,
    maintenanceMode: false,
  });
  const update = (key: string, value: string | boolean) => setSettings(prev => ({ ...prev, [key]: value }));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e6e6e6', outline: 'none', fontSize: '0.9rem' };
  const labelStyle: React.CSSProperties = { display: 'block', color: '#8b8b9e', fontSize: '0.8rem', marginBottom: '0.3rem', fontWeight: 600 };
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/admin/marketplace" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← Dashboard</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>⚙️ Global Configuration</h1>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>General</h3>
          <div style={{ marginBottom: '0.75rem' }}><label style={labelStyle} htmlFor="marketplace-name">Marketplace Name</label><input id="marketplace-name" value={settings.marketplaceName} onChange={e => update('marketplaceName', e.target.value)} style={inputStyle} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={labelStyle} htmlFor="currency">Currency</label><select id="currency" value={settings.currency} onChange={e => update('currency', e.target.value)} style={inputStyle}><option value="INR">INR (₹)</option><option value="USD">USD ($)</option></select></div>
            <div><label style={labelStyle} htmlFor="timezone">Timezone</label><input id="timezone" value={settings.timezone} onChange={e => update('timezone', e.target.value)} style={inputStyle} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
            <div><label style={labelStyle} htmlFor="min-order">Min Order (₹)</label><input id="min-order" type="number" value={settings.minOrderValue} onChange={e => update('minOrderValue', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="max-order">Max Order (₹)</label><input id="max-order" type="number" value={settings.maxOrderValue} onChange={e => update('maxOrderValue', e.target.value)} style={inputStyle} /></div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Tax & Compliance</h3>
          <div><label style={labelStyle} htmlFor="gst-number">GST Number</label><input id="gst-number" value={settings.gstNumber} onChange={e => update('gstNumber', e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} /></div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Support</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={labelStyle} htmlFor="support-email">Support Email</label><input id="support-email" value={settings.supportEmail} onChange={e => update('supportEmail', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle} htmlFor="support-phone">Support Phone</label><input id="support-phone" value={settings.supportPhone} onChange={e => update('supportPhone', e.target.value)} style={inputStyle} /></div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '1rem' }}>Feature Flags</h3>
          {[
            { key: 'autoApproveProducts', label: 'Auto-approve new product listings' },
            { key: 'autoApproveReviews', label: 'Auto-approve customer reviews' },
            { key: 'enableCOD', label: 'Enable Cash on Delivery' },
            { key: 'enableGiftCards', label: 'Enable Gift Cards' },
            { key: 'enableWishlist', label: 'Enable Wishlist' },
            { key: 'enableCompare', label: 'Enable Product Compare' },
          ].map(flag => (
            <label key={flag.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings[flag.key as keyof typeof settings] as boolean} onChange={e => update(flag.key, e.target.checked)} style={{ accentColor: '#6366f1' }} />
              <span style={{ fontSize: '0.9rem' }}>{flag.label}</span>
            </label>
          ))}
        </div>

        <div style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div><div style={{ fontWeight: 600, color: '#f87171' }}>🛑 Maintenance Mode</div><div style={{ color: '#8b8b9e', fontSize: '0.85rem' }}>Temporarily disable the marketplace</div></div>
            <button onClick={() => update('maintenanceMode', !settings.maintenanceMode)} style={{
              width: '50px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer', position: 'relative',
              background: settings.maintenanceMode ? '#ef4444' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s',
            }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: settings.maintenanceMode ? '25px' : '3px', transition: 'all 0.3s' }} />
            </button>
          </label>
        </div>

        <button style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>Save Configuration</button>
      </div>
    </div>
  );
}
