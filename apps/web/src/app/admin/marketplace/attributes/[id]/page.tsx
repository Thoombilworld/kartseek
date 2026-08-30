'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function AttributeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [editing, setEditing] = useState(false);

  const attribute = {
    name: 'Color', slug: 'color', type: 'multi-select', filterable: true, searchable: true,
    required: false, status: 'ACTIVE', description: 'Product color variant selector',
    validationRules: { minValues: 1, maxValues: 5 },
    values: [
      { value: 'Black', hex: '#000000', sortOrder: 1, productCount: 3200 },
      { value: 'White', hex: '#FFFFFF', sortOrder: 2, productCount: 2800 },
      { value: 'Blue', hex: '#3B82F6', sortOrder: 3, productCount: 2100 },
      { value: 'Red', hex: '#EF4444', sortOrder: 4, productCount: 1650 },
      { value: 'Green', hex: '#22C55E', sortOrder: 5, productCount: 890 },
      { value: 'Silver', hex: '#C0C0C0', sortOrder: 6, productCount: 1200 },
      { value: 'Gold', hex: '#FFD700', sortOrder: 7, productCount: 780 },
      { value: 'Rose Gold', hex: '#B76E79', sortOrder: 8, productCount: 540 },
    ],
    mappedCategories: ['Electronics', 'Fashion', 'Home & Kitchen', 'Automotive'],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };
  const lb: React.CSSProperties = { fontSize: '0.75rem', color: '#8b8b9e', marginBottom: '4px' };
  const vl: React.CSSProperties = { fontSize: '1rem', fontWeight: 600, color: '#e6e6e6' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/attributes" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← All Attributes</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>🏷️ {attribute.name}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{attribute.status}</span>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(77,150,255,0.15)', color: '#4d96ff' }}>{attribute.type}</span>
              {attribute.filterable && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>Filterable</span>}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>{editing ? 'Cancel' : 'Edit Attribute'}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Properties</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div><div style={lb}>Slug</div><div style={vl}>{attribute.slug}</div></div>
              <div><div style={lb}>Description</div><div style={{ ...vl, fontSize: '0.85rem', fontWeight: 400 }}>{attribute.description}</div></div>
              <div><div style={lb}>Required</div><div style={vl}>{attribute.required ? 'Yes' : 'No'}</div></div>
              <div><div style={lb}>Searchable</div><div style={vl}>{attribute.searchable ? 'Yes' : 'No'}</div></div>
              <div><div style={lb}>Validation</div><div style={{ ...vl, fontSize: '0.85rem' }}>Min: {attribute.validationRules.minValues}, Max: {attribute.validationRules.maxValues} values</div></div>
            </div>
          </div>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Mapped Categories ({attribute.mappedCategories.length})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {attribute.mappedCategories.map(c => (
                <span key={c} style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', border: '1px solid rgba(99,102,241,0.2)' }}>{c}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={cs}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Attribute Values ({attribute.values.length})</h3>
            <button style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>+ Add Value</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Value', 'Preview', 'Sort Order', 'Products Using', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>{attribute.values.map((v, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{v.value}</td>
                <td style={{ padding: '0.75rem' }}><span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: '50%', background: v.hex, border: '2px solid rgba(255,255,255,0.2)' }} /></td>
                <td style={{ padding: '0.75rem' }}>{v.sortOrder}</td>
                <td style={{ padding: '0.75rem' }}>{v.productCount.toLocaleString()}</td>
                <td style={{ padding: '0.75rem' }}><button style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
