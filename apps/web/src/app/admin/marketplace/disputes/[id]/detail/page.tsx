'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function DisputeDetailAdminPage() {
  const params = useParams();
  const id = params?.id as string;
  const [resolution, setResolution] = useState('');

  const dispute = {
    id: `DSP-${id || '1042'}`, status: 'OPEN', priority: 'High', createdAt: '2026-06-29', escalated: true,
    order: { id: 'ORD-47830', total: 3499, date: '2026-06-15' },
    buyer: { name: 'Rahul Verma', email: 'rahul@gmail.com' },
    seller: { name: 'FashionHub India', email: 'support@fashionhub.in' },
    product: { name: 'Nike Air Max 270', sku: 'NIK-AM270-BLK-10', price: 3499 },
    reason: 'Received counterfeit product — logo placement is different from product images.',
    evidence: ['Photo showing wrong logo placement', 'Comparison with authentic product', 'Purchase receipt screenshot'],
    messages: [
      { from: 'Buyer', time: '2026-06-29 10:00', msg: 'I received a fake product. The Nike logo is clearly in the wrong position.' },
      { from: 'Seller', time: '2026-06-29 14:30', msg: 'We source directly from authorized distributors. This is genuine product with regional packaging variation.' },
      { from: 'Admin', time: '2026-06-30 09:00', msg: 'Escalated to quality team for verification. Brand team notified.' },
    ],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/disputes" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← All Disputes</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>⚖️ {dispute.id}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>{dispute.status}</span>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{dispute.priority}</span>
              {dispute.escalated && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>⬆ ESCALATED</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(107,203,119,0.3)', background: 'rgba(107,203,119,0.1)', color: '#6bcb77', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Resolve — Favor Buyer</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(77,150,255,0.3)', background: 'rgba(77,150,255,0.1)', color: '#4d96ff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Resolve — Favor Seller</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Dispute Details</h3>
            {[{ l: 'Product', v: dispute.product.name }, { l: 'Order', v: dispute.order.id }, { l: 'Amount', v: `₹${dispute.product.price.toLocaleString()}` }, { l: 'Reason', v: dispute.reason }].map(f => (
              <div key={f.l} style={{ marginBottom: '0.5rem' }}><div style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{f.l}</div><div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{f.v}</div></div>
            ))}
          </div>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Parties</h3>
            <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(107,203,119,0.05)', border: '1px solid rgba(107,203,119,0.1)' }}>
              <div style={{ fontSize: '0.7rem', color: '#6bcb77', fontWeight: 600, marginBottom: '0.3rem' }}>BUYER</div>
              <div style={{ fontWeight: 600 }}>{dispute.buyer.name}</div><div style={{ fontSize: '0.8rem', color: '#8b8b9e' }}>{dispute.buyer.email}</div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(77,150,255,0.05)', border: '1px solid rgba(77,150,255,0.1)' }}>
              <div style={{ fontSize: '0.7rem', color: '#4d96ff', fontWeight: 600, marginBottom: '0.3rem' }}>SELLER</div>
              <div style={{ fontWeight: 600 }}>{dispute.seller.name}</div><div style={{ fontSize: '0.8rem', color: '#8b8b9e' }}>{dispute.seller.email}</div>
            </div>
          </div>
        </div>

        <div style={cs}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Evidence ({dispute.evidence.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {dispute.evidence.map((e, i) => (
              <div key={i} style={{ aspectRatio: '16/9', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#8b8b9e', textAlign: 'center', padding: '0.5rem' }}>📎 {e}</div>
            ))}
          </div>
        </div>

        <div style={cs}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Conversation ({dispute.messages.length})</h3>
          {dispute.messages.map((m, i) => (
            <div key={i} style={{ padding: '0.75rem', marginBottom: '0.5rem', borderRadius: '10px', background: m.from === 'Admin' ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${m.from === 'Admin' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: m.from === 'Buyer' ? '#6bcb77' : m.from === 'Seller' ? '#4d96ff' : '#a78bfa' }}>{m.from}</span>
                <span style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{m.time}</span>
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{m.msg}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <input value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Add admin response..." style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e6e6e6', fontSize: '0.85rem', outline: 'none' }} />
            <button style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
