'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ReturnDetailAdminPage() {
  const params = useParams();
  const id = params?.id as string;

  const returnData = {
    id: id || 'RET-A1B2C3', status: 'PROCESSING', orderId: 'ORD-X1Y2Z3', reason: 'Product damaged / defective',
    customerName: 'Priya Sharma', customerEmail: 'priya@example.com',
    product: { name: 'Premium Wireless Headphones', sku: 'WH-BLK-001', price: 2499, quantity: 1 },
    requestDate: '2026-07-01', pickupDate: '2026-07-02', pickupSlot: '9 AM – 12 PM',
    refundAmount: 2499, refundMethod: 'Original Payment (UPI)', notes: 'Item arrived with cracked casing.',
    timeline: [
      { event: 'Return requested', date: 'Jul 1, 3:15 PM', by: 'Customer' },
      { event: 'Pickup scheduled', date: 'Jul 1, 3:20 PM', by: 'System' },
      { event: 'Item picked up', date: 'Jul 2, 11:30 AM', by: 'Blue Dart' },
      { event: 'Received at warehouse', date: 'Jul 3, 2:00 PM', by: 'Warehouse' },
      { event: 'Quality check in progress', date: 'Jul 3, 4:00 PM', by: 'QC Team' },
    ],
  };

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <Link href="/admin/marketplace/returns" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← All Returns</Link>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>Return {returnData.id}</h1>
            <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: '6px', fontWeight: 600, background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{returnData.status}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(107,203,119,0.3)', background: 'rgba(107,203,119,0.1)', color: '#6bcb77', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Approve Refund</button>
            <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Reject</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem' }}>
          <div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Return Details</h3>
              {[
                { label: 'Order ID', value: returnData.orderId },
                { label: 'Reason', value: returnData.reason },
                { label: 'Notes', value: returnData.notes },
                { label: 'Request Date', value: returnData.requestDate },
                { label: 'Pickup', value: `${returnData.pickupDate} • ${returnData.pickupSlot}` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                  <span style={{ color: '#8b8b9e' }}>{row.label}</span><span style={{ maxWidth: '55%', textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Timeline</h3>
              {returnData.timeline.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: '5px' }} />
                  <div><span>{t.event}</span> <span style={{ color: '#8b8b9e' }}>— {t.by} • {t.date}</span></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Product</h3>
              <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{returnData.product.name}</div>
              <div style={{ color: '#8b8b9e', fontSize: '0.8rem' }}>SKU: {returnData.product.sku} × {returnData.product.quantity}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#6bcb77', marginTop: '0.5rem' }}>₹{returnData.product.price.toLocaleString()}</div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Customer</h3>
              <div style={{ fontWeight: 600 }}>{returnData.customerName}</div>
              <div style={{ color: '#8b8b9e', fontSize: '0.85rem' }}>{returnData.customerEmail}</div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Refund</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#6bcb77', marginBottom: '0.3rem' }}>₹{returnData.refundAmount.toLocaleString()}</div>
              <div style={{ color: '#8b8b9e', fontSize: '0.85rem' }}>{returnData.refundMethod}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
