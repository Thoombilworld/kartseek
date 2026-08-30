'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function DisputeDetailAdminPage() {
  const params = useParams();
  const id = params?.id as string;

  const dispute = {
    id: id || 'DSP-001', type: 'Product Not Received', status: 'OPEN', priority: 'HIGH',
    orderId: 'ORD-X1Y2Z3', customerName: 'Amit Kumar', sellerName: 'TechVision Electronics',
    amount: 4999, createdAt: '2026-06-28', escalatedAt: '2026-07-01',
    description: 'Order marked as delivered but customer claims item was not received. Delivery photo shows item left at door.',
    messages: [
      { from: 'Customer', text: 'I never received this item. The delivery partner left it without verification.', time: '2h ago' },
      { from: 'Seller', text: 'Delivery partner confirmed drop at door. We have photo proof.', time: '1h ago' },
      { from: 'Admin', text: 'Reviewing delivery proof and GPS logs.', time: '30m ago' },
    ],
  };

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <Link href="/admin/marketplace/disputes" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← All Disputes</Link>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>Dispute {dispute.id}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>{dispute.status}</span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>⚠ {dispute.priority}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(107,203,119,0.3)', background: 'rgba(107,203,119,0.1)', color: '#6bcb77', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Resolve (Customer)</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Resolve (Seller)</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem' }}>
          <div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Description</h3>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#c9c9d6' }}>{dispute.description}</div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Conversation</h3>
              {dispute.messages.map((msg, i) => (
                <div key={i} style={{ padding: '0.75rem', background: msg.from === 'Admin' ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '0.5rem', borderLeft: `3px solid ${msg.from === 'Customer' ? '#4d96ff' : msg.from === 'Seller' ? '#fbbf24' : '#6366f1'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: msg.from === 'Customer' ? '#4d96ff' : msg.from === 'Seller' ? '#fbbf24' : '#a78bfa' }}>{msg.from}</span>
                    <span style={{ color: '#8b8b9e', fontSize: '0.75rem' }}>{msg.time}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#c9c9d6' }}>{msg.text}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <input placeholder="Add admin response..." style={{ flex: 1, padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e6e6e6', outline: 'none', fontSize: '0.85rem' }}  aria-label="Add admin response..."/>
                <button style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Send</button>
              </div>
            </div>
          </div>
          <div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Dispute Info</h3>
              {[{ label: 'Type', value: dispute.type }, { label: 'Order', value: dispute.orderId }, { label: 'Amount', value: `₹${dispute.amount.toLocaleString()}` }, { label: 'Filed', value: dispute.createdAt }, { label: 'Escalated', value: dispute.escalatedAt }].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                  <span style={{ color: '#8b8b9e' }}>{row.label}</span><span>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Parties</h3>
              <div style={{ marginBottom: '0.5rem' }}><span style={{ color: '#8b8b9e', fontSize: '0.8rem' }}>Customer</span><div style={{ fontWeight: 600 }}>{dispute.customerName}</div></div>
              <div><span style={{ color: '#8b8b9e', fontSize: '0.8rem' }}>Seller</span><div style={{ fontWeight: 600 }}>{dispute.sellerName}</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
