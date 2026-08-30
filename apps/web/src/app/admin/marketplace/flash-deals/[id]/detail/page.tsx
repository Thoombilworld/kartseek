'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function FlashDealDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const deal = {
    name: 'Mega Electronics Sale', status: 'SCHEDULED', startTime: '2026-07-04 00:00', endTime: '2026-07-04 23:59',
    totalSlots: 50, filledSlots: 42, totalUnits: 12000, soldUnits: 0, expectedRevenue: 15000000,
    products: [
      { name: 'Samsung Galaxy S24 Ultra', originalPrice: 129999, dealPrice: 99999, discount: 23, stock: 200, sold: 0, seller: 'TechVision' },
      { name: 'Sony WH-1000XM5', originalPrice: 29990, dealPrice: 19990, discount: 33, stock: 500, sold: 0, seller: 'AudioWorld' },
      { name: 'MacBook Air M3', originalPrice: 114900, dealPrice: 94900, discount: 17, stock: 100, sold: 0, seller: 'AppleStore IN' },
      { name: 'iPad Air 2024', originalPrice: 69900, dealPrice: 54900, discount: 21, stock: 300, sold: 0, seller: 'AppleStore IN' },
      { name: 'Bose QC Ultra', originalPrice: 34900, dealPrice: 24900, discount: 29, stock: 400, sold: 0, seller: 'AudioWorld' },
    ],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/flash-deals" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← All Flash Deals</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>⚡ {deal.name}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(77,150,255,0.15)', color: '#4d96ff' }}>{deal.status}</span>
              <span style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{deal.startTime} → {deal.endTime}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>+ Add Product</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Cancel Deal</button>
          </div>
        </div>

        <div style={{ ...cs, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[{ l: 'Slots', v: `${deal.filledSlots}/${deal.totalSlots}`, c: '#a78bfa' }, { l: 'Total Units', v: deal.totalUnits.toLocaleString(), c: '#4d96ff' }, { l: 'Sold', v: deal.soldUnits.toLocaleString(), c: '#6bcb77' }, { l: 'Expected Revenue', v: `₹${(deal.expectedRevenue / 10000000).toFixed(1)}Cr`, c: '#fbbf24' }].map(k => (
            <div key={k.l} style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>{k.l}</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: k.c }}>{k.v}</div></div>
          ))}
        </div>

        <div style={cs}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Products ({deal.products.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Product', 'Seller', 'Original', 'Deal Price', 'Discount', 'Stock', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>{deal.products.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</td>
                <td style={{ padding: '0.75rem', color: '#8b8b9e', fontSize: '0.85rem' }}>{p.seller}</td>
                <td style={{ padding: '0.75rem', textDecoration: 'line-through', color: '#6b6b7e' }}>₹{p.originalPrice.toLocaleString()}</td>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: '#6bcb77' }}>₹{p.dealPrice.toLocaleString()}</td>
                <td style={{ padding: '0.75rem' }}><span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>{p.discount}% OFF</span></td>
                <td style={{ padding: '0.75rem' }}>{p.stock}</td>
                <td style={{ padding: '0.75rem' }}><button style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
