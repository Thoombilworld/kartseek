'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ReturnDetailAdminPage() {
  const params = useParams();
  const id = params?.id as string;

  const ret = {
    id: `RET-${id || '2041'}`, orderId: 'ORD-48521', status: 'PROCESSING', type: 'RETURN',
    reason: 'Product not as described — color mismatch', createdAt: '2026-06-30',
    customer: { name: 'Priya Sharma', email: 'priya@gmail.com' },
    seller: 'TechVision Electronics',
    product: { name: 'Samsung Clear Case S24 Ultra', sku: 'SAM-CASE-S24U', qty: 1, price: 3250 },
    refundAmount: 3250, refundMethod: 'Original Payment Method',
    qcImages: ['Front damage photo', 'Back photo', 'Package photo'],
    timeline: [
      { time: '2026-06-30 09:00', event: 'Return requested by customer' },
      { time: '2026-06-30 09:05', event: 'Auto-approved (within 7-day window)' },
      { time: '2026-06-30 14:00', event: 'Pickup scheduled — Delhivery' },
      { time: '2026-07-01 10:20', event: 'Product picked up' },
      { time: '2026-07-01 18:00', event: 'QC check pending at warehouse' },
    ],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/returns" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← All Returns</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>↩️ {ret.id}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{ret.status}</span>
              <span style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>Order: {ret.orderId}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(107,203,119,0.3)', background: 'rgba(107,203,119,0.1)', color: '#6bcb77', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Approve Refund</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Reject</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Return Details</h3>
            {[{ l: 'Product', v: ret.product.name }, { l: 'SKU', v: ret.product.sku }, { l: 'Qty', v: ret.product.qty.toString() }, { l: 'Reason', v: ret.reason }, { l: 'Customer', v: ret.customer.name }, { l: 'Seller', v: ret.seller }].map(f => (
              <div key={f.l} style={{ marginBottom: '0.5rem' }}><div style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{f.l}</div><div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{f.v}</div></div>
            ))}
          </div>
          <div>
            <div style={cs}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Refund</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6bcb77', marginBottom: '0.3rem' }}>₹{ret.refundAmount.toLocaleString()}</div>
              <div style={{ fontSize: '0.8rem', color: '#8b8b9e' }}>via {ret.refundMethod}</div>
            </div>
            <div style={cs}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>QC Images ({ret.qcImages.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {ret.qcImages.map((img, i) => (
                  <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#8b8b9e', textAlign: 'center', padding: '0.5rem' }}>📷 {img}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={cs}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Timeline</h3>
          {ret.timeline.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
              <div style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>{t.event}</div>
              <div style={{ fontSize: '0.8rem', color: '#8b8b9e', flexShrink: 0 }}>{t.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
