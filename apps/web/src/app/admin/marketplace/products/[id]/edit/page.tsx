'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function ProductEditAdminPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tab, setTab] = useState<'details' | 'pricing' | 'media' | 'seo' | 'history'>('details');

  const product = {
    name: 'Samsung Galaxy S24 Ultra 256GB', sku: 'SAM-S24U-256-BLK', status: 'ACTIVE',
    seller: 'TechVision Electronics', brand: 'Samsung', category: 'Smartphones',
    price: 129999, mrp: 139999, stock: 245, sold: 4200,
    rating: 4.7, reviews: 1834, returnRate: 1.2,
    description: 'The Galaxy S24 Ultra features a 6.8-inch Dynamic AMOLED 2X display, Snapdragon 8 Gen 3 processor, 200MP camera, and built-in S Pen.',
    specs: [
      { key: 'Display', value: '6.8" Dynamic AMOLED 2X, 3120x1440, 120Hz' },
      { key: 'Processor', value: 'Snapdragon 8 Gen 3' },
      { key: 'RAM', value: '12 GB' },
      { key: 'Storage', value: '256 GB' },
      { key: 'Camera', value: '200MP + 50MP + 10MP + 12MP' },
      { key: 'Battery', value: '5000 mAh, 45W fast charging' },
    ],
    images: ['Front View', 'Back View', 'Side Profile', 'Camera Detail', 'In-Box Contents'],
    history: [
      { date: '2026-06-28', action: 'Price updated', by: 'TechVision Electronics', details: '₹134,999 → ₹129,999' },
      { date: '2026-06-20', action: 'Stock replenished', by: 'System', details: '+500 units added' },
      { date: '2026-06-15', action: 'Listing approved', by: 'Admin (Ravi)', details: 'Quality check passed' },
      { date: '2026-06-14', action: 'Product created', by: 'TechVision Electronics', details: 'Initial listing' },
    ],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };
  const lb: React.CSSProperties = { fontSize: '0.75rem', color: '#8b8b9e', marginBottom: '4px' };
  const vl: React.CSSProperties = { fontSize: '1rem', fontWeight: 600, color: '#e6e6e6' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/products" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← All Products</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem' }}>{product.name}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{product.status}</span>
              <span style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>SKU: {product.sku}</span>
              <span style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>by {product.seller}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Save Changes</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Suppress</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Remove</button>
          </div>
        </div>

        <div style={{ ...cs, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {[{ l: 'Price', v: `₹${product.price.toLocaleString()}`, c: '#6bcb77' }, { l: 'MRP', v: `₹${product.mrp.toLocaleString()}`, c: '#8b8b9e' }, { l: 'Stock', v: product.stock.toString(), c: '#4d96ff' }, { l: 'Sold', v: product.sold.toLocaleString(), c: '#a78bfa' }, { l: 'Rating', v: `⭐ ${product.rating} (${product.reviews})`, c: '#fbbf24' }].map(k => (
            <div key={k.l} style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>{k.l}</div><div style={{ fontSize: '1.1rem', fontWeight: 700, color: k.c }}>{k.v}</div></div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {(['details', 'pricing', 'media', 'seo', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 600, fontSize: '0.85rem', background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent', color: tab === t ? '#a78bfa' : '#8b8b9e', cursor: 'pointer', textTransform: 'capitalize', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent' }}>{t}</button>
          ))}
        </div>

        {tab === 'details' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={cs}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Product Information</h3>
              {[{ l: 'Brand', v: product.brand }, { l: 'Category', v: product.category }, { l: 'Seller', v: product.seller }, { l: 'Return Rate', v: `${product.returnRate}%` }].map(f => (
                <div key={f.l} style={{ marginBottom: '0.6rem' }}><div style={lb}>{f.l}</div><div style={vl}>{f.v}</div></div>
              ))}
              <div style={{ marginTop: '0.75rem' }}><div style={lb}>Description</div><div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: '#c0c0c0' }}>{product.description}</div></div>
            </div>
            <div style={cs}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Specifications</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>{product.specs.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 600, width: '35%', fontSize: '0.85rem' }}>{s.key}</td>
                    <td style={{ padding: '0.5rem 0', fontSize: '0.85rem', color: '#c0c0c0' }}>{s.value}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Activity History</h3>
            {product.history.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{h.action}</div>
                  <div style={{ fontSize: '0.8rem', color: '#8b8b9e' }}>{h.details}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: '#8b8b9e' }}>{h.date}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b6b7e' }}>{h.by}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(tab === 'pricing' || tab === 'media' || tab === 'seo') && (
          <div style={cs}><p style={{ color: '#8b8b9e' }}>✏️ {tab.charAt(0).toUpperCase() + tab.slice(1)} editing — inline form fields for admin content override.</p></div>
        )}
      </div>
    </div>
  );
}
