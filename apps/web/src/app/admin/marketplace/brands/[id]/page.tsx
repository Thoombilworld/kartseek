'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function BrandDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tab, setTab] = useState<'overview' | 'products' | 'sellers' | 'documents'>('overview');

  const brand = {
    name: 'Samsung', slug: 'samsung', logo: '📱', status: 'VERIFIED', tier: 'Premium',
    description: 'Samsung Electronics is a global leader in technology, opening new possibilities for people everywhere.',
    website: 'https://samsung.com', country: 'South Korea', founded: '1969',
    totalProducts: 2450, activeSellers: 38, totalRevenue: 12500000, avgRating: 4.5,
    categories: ['Smartphones', 'TVs', 'Laptops', 'Tablets', 'Wearables', 'Home Appliances'],
    topProducts: [
      { name: 'Galaxy S24 Ultra', sales: 4200, revenue: 503580000, rating: 4.7 },
      { name: 'Galaxy A54', sales: 8500, revenue: 254830000, rating: 4.4 },
      { name: 'Galaxy Tab S9', sales: 2100, revenue: 146790000, rating: 4.6 },
    ],
    documents: [
      { name: 'Brand Authorization Letter', type: 'PDF', uploaded: '2025-08-12', verified: true },
      { name: 'Trademark Registration', type: 'PDF', uploaded: '2025-08-12', verified: true },
      { name: 'GST Certificate', type: 'PDF', uploaded: '2025-08-12', verified: true },
    ],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/brands" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← All Brands</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>{brand.logo} {brand.name}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{brand.status}</span>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{brand.tier}</span>
            </div>
          </div>
          <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Edit Brand</button>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {(['overview', 'products', 'sellers', 'documents'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 600, fontSize: '0.85rem', background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent', color: tab === t ? '#a78bfa' : '#8b8b9e', cursor: 'pointer', textTransform: 'capitalize', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent' }}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (<>
          <div style={{ ...cs, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[{ l: 'Products', v: brand.totalProducts.toLocaleString(), c: '#a78bfa' }, { l: 'Active Sellers', v: brand.activeSellers.toString(), c: '#4d96ff' }, { l: 'Revenue', v: `₹${(brand.totalRevenue / 100000).toFixed(0)}L`, c: '#6bcb77' }, { l: 'Avg Rating', v: `⭐ ${brand.avgRating}`, c: '#fbbf24' }].map(k => (
              <div key={k.l} style={{ textAlign: 'center' }}><div style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{k.l}</div><div style={{ fontSize: '1.4rem', fontWeight: 700, color: k.c }}>{k.v}</div></div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={cs}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Brand Info</h3>
              {[{ l: 'Website', v: brand.website }, { l: 'Country', v: brand.country }, { l: 'Founded', v: brand.founded }, { l: 'Description', v: brand.description }].map(f => (
                <div key={f.l} style={{ marginBottom: '0.6rem' }}><div style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{f.l}</div><div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{f.v}</div></div>
              ))}
            </div>
            <div style={cs}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Categories</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {brand.categories.map(c => <span key={c} style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', border: '1px solid rgba(99,102,241,0.2)' }}>{c}</span>)}
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '1rem' }}>Top Products</h3>
              {brand.topProducts.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span><span style={{ color: '#6bcb77' }}>₹{(p.revenue / 100000).toFixed(0)}L</span>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {tab === 'documents' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Brand Documents</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Document', 'Type', 'Uploaded', 'Status', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>{brand.documents.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: '0.75rem' }}>{d.type}</td>
                  <td style={{ padding: '0.75rem', color: '#8b8b9e' }}>{d.uploaded}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: d.verified ? 'rgba(107,203,119,0.15)' : 'rgba(251,191,36,0.15)', color: d.verified ? '#6bcb77' : '#fbbf24' }}>{d.verified ? 'Verified' : 'Pending'}</span></td>
                  <td style={{ padding: '0.75rem' }}><button style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem' }}>Download</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {(tab === 'products' || tab === 'sellers') && (
          <div style={cs}><p style={{ color: '#8b8b9e' }}>View all {tab} for {brand.name} in the <Link href={`/admin/marketplace/${tab}`} style={{ color: '#a78bfa' }}>{tab} section</Link>.</p></div>
        )}
      </div>
    </div>
  );
}
