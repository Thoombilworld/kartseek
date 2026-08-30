'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function CategoryDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tab, setTab] = useState<'overview' | 'subcategories' | 'attributes' | 'products'>('overview');

  const category = {
    name: 'Electronics', slug: 'electronics', icon: '📱', status: 'ACTIVE',
    description: 'All electronic devices, gadgets, and accessories.',
    productCount: 4200, sellerCount: 145, subcategoryCount: 18,
    avgPrice: 15499, topBrand: 'Samsung', commission: 8.5,
    attributes: [
      { name: 'Brand', type: 'select', required: true, values: 'Samsung, Apple, OnePlus, Xiaomi, ...' },
      { name: 'Warranty', type: 'select', required: true, values: '1 Year, 2 Years, No Warranty' },
      { name: 'Color', type: 'multi-select', required: false, values: 'Black, White, Blue, Red, ...' },
      { name: 'RAM', type: 'select', required: false, values: '4GB, 6GB, 8GB, 12GB, 16GB' },
      { name: 'Storage', type: 'select', required: false, values: '64GB, 128GB, 256GB, 512GB, 1TB' },
    ],
    subcategories: [
      { name: 'Smartphones', products: 1200, status: 'ACTIVE' },
      { name: 'Laptops', products: 850, status: 'ACTIVE' },
      { name: 'Tablets', products: 320, status: 'ACTIVE' },
      { name: 'Headphones', products: 780, status: 'ACTIVE' },
      { name: 'Smartwatches', products: 450, status: 'ACTIVE' },
      { name: 'Cameras', products: 200, status: 'ACTIVE' },
      { name: 'Gaming', products: 400, status: 'ACTIVE' },
    ],
    seo: { title: 'Electronics - Buy Online', metaDescription: 'Shop electronics online at best prices.', keywords: 'electronics, gadgets, mobile, laptop' },
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };
  const lb: React.CSSProperties = { fontSize: '0.75rem', color: '#8b8b9e', marginBottom: '4px' };
  const vl: React.CSSProperties = { fontSize: '1rem', fontWeight: 600, color: '#e6e6e6' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/categories" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← All Categories</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>{category.icon} {category.name}</h1>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{category.status}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Edit Category</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Deactivate</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {(['overview', 'subcategories', 'attributes', 'products'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 600, fontSize: '0.85rem',
              background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent', color: tab === t ? '#a78bfa' : '#8b8b9e',
              cursor: 'pointer', textTransform: 'capitalize', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div style={{ ...cs, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Products', value: category.productCount.toLocaleString(), color: '#a78bfa' },
                { label: 'Sellers', value: category.sellerCount.toString(), color: '#4d96ff' },
                { label: 'Subcategories', value: category.subcategoryCount.toString(), color: '#6bcb77' },
                { label: 'Avg Price', value: `₹${category.avgPrice.toLocaleString()}`, color: '#fbbf24' },
              ].map(kpi => (
                <div key={kpi.label} style={{ textAlign: 'center' }}>
                  <div style={lb}>{kpi.label}</div>
                  <div style={{ ...vl, color: kpi.color, fontSize: '1.4rem' }}>{kpi.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={cs}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Category Details</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div><div style={lb}>Slug</div><div style={vl}>{category.slug}</div></div>
                  <div><div style={lb}>Description</div><div style={{ ...vl, fontSize: '0.85rem', fontWeight: 400 }}>{category.description}</div></div>
                  <div><div style={lb}>Top Brand</div><div style={vl}>{category.topBrand}</div></div>
                  <div><div style={lb}>Commission Rate</div><div style={vl}>{category.commission}%</div></div>
                </div>
              </div>
              <div style={cs}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>SEO Settings</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div><div style={lb}>Page Title</div><div style={vl}>{category.seo.title}</div></div>
                  <div><div style={lb}>Meta Description</div><div style={{ ...vl, fontSize: '0.85rem', fontWeight: 400 }}>{category.seo.metaDescription}</div></div>
                  <div><div style={lb}>Keywords</div><div style={{ ...vl, fontSize: '0.85rem', fontWeight: 400 }}>{category.seo.keywords}</div></div>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'subcategories' && (
          <div style={cs}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Subcategories ({category.subcategories.length})</h3>
              <button style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>+ Add Subcategory</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Name', 'Products', 'Status', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>{category.subcategories.map((sc, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{sc.name}</td>
                  <td style={{ padding: '0.75rem' }}>{sc.products}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{sc.status}</span></td>
                  <td style={{ padding: '0.75rem' }}><button style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {tab === 'attributes' && (
          <div style={cs}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Mapped Attributes ({category.attributes.length})</h3>
              <button style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>+ Map Attribute</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Attribute', 'Type', 'Required', 'Values'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>{category.attributes.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{a.name}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(77,150,255,0.15)', color: '#4d96ff' }}>{a.type}</span></td>
                  <td style={{ padding: '0.75rem' }}>{a.required ? '✅ Yes' : '—'}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#8b8b9e', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.values}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {tab === 'products' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Top Products in {category.name}</h3>
            <p style={{ color: '#8b8b9e', fontSize: '0.85rem' }}>Showing {category.productCount.toLocaleString()} products — view in <Link href="/admin/marketplace/products" style={{ color: '#a78bfa' }}>Products</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
