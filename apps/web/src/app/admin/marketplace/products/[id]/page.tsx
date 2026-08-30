'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'variants' | 'reviews' | 'qa' | 'seo'>('overview');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/marketplace/products/${id}`)
      .then(r => r.json()).then(d => setProduct(d.data || d))
      .catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem',
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#8b8b9e', background: '#0f0f23', minHeight: '100vh' }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/admin/marketplace/products" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← All Products</Link>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>{product?.name || 'Product'}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: product?.status === 'ACTIVE' ? 'rgba(107,203,119,0.15)' : 'rgba(251,191,36,0.15)', color: product?.status === 'ACTIVE' ? '#6bcb77' : '#fbbf24' }}>{product?.status || 'DRAFT'}</span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: product?.approval_status === 'APPROVED' ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.15)', color: product?.approval_status === 'APPROVED' ? '#a78bfa' : '#f87171' }}>{product?.approval_status || 'PENDING'}</span>
              <span style={{ color: '#8b8b9e', fontSize: '0.8rem' }}>SKU: {product?.globalTradeItemNumber || 'N/A'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Edit</button>
            <button style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: '1px solid rgba(107,203,119,0.3)', background: 'rgba(107,203,119,0.1)', color: '#6bcb77', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Approve</button>
            <button style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Reject</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0' }}>
          {(['overview', 'variants', 'reviews', 'qa', 'seo'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 600, fontSize: '0.85rem',
              background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: tab === t ? '#a78bfa' : '#8b8b9e', cursor: 'pointer', textTransform: 'capitalize',
              borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Product Information</h3>
                {[
                  { label: 'Name', value: product?.name },
                  { label: 'Slug', value: product?.slug },
                  { label: 'Short Description', value: product?.short_description || 'Not set' },
                  { label: 'Category', value: product?.category?.name || 'N/A' },
                  { label: 'Brand', value: product?.brand?.name || 'N/A' },
                  { label: 'Seller', value: product?.seller_id || 'N/A' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.9rem' }}>
                    <span style={{ color: '#8b8b9e' }}>{row.label}</span>
                    <span style={{ maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Long Description</h3>
                <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#c9c9d6' }}>{product?.long_description || 'No description available.'}</div>
              </div>
            </div>
            <div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Pricing</h3>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6bcb77', marginBottom: '0.5rem' }}>₹{Number(product?.mrp || 0).toLocaleString('en-IN')}</div>
                <div style={{ color: '#8b8b9e', fontSize: '0.85rem' }}>MRP</div>
              </div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Metrics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>⭐ {(product?.averageRating || 0).toFixed(1)}</div>
                    <div style={{ color: '#8b8b9e', fontSize: '0.75rem' }}>Avg Rating</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{product?.reviewCount || 0}</div>
                    <div style={{ color: '#8b8b9e', fontSize: '0.75rem' }}>Reviews</div>
                  </div>
                </div>
              </div>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Timestamps</h3>
                <div style={{ fontSize: '0.8rem', color: '#8b8b9e', lineHeight: 1.8 }}>
                  Created: {product?.created_at ? new Date(product.created_at).toLocaleString() : 'N/A'}<br />
                  Updated: {product?.updated_at ? new Date(product.updated_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'variants' && <div style={cardStyle}><div style={{ textAlign: 'center', padding: '2rem', color: '#8b8b9e' }}>Product variants will be managed here. (Size, Color, Storage, etc.)</div></div>}
        {tab === 'reviews' && <div style={cardStyle}><div style={{ textAlign: 'center', padding: '2rem', color: '#8b8b9e' }}>Customer reviews and ratings management.</div></div>}
        {tab === 'qa' && <div style={cardStyle}><div style={{ textAlign: 'center', padding: '2rem', color: '#8b8b9e' }}>Product Q&A moderation.</div></div>}
        {tab === 'seo' && <div style={cardStyle}><div style={{ textAlign: 'center', padding: '2rem', color: '#8b8b9e' }}>SEO settings: meta title, description, canonical URL, og:image.</div></div>}
      </div>
    </div>
  );
}
