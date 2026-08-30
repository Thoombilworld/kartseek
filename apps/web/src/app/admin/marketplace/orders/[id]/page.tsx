'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function OrderDetailAdminPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/marketplace/orders/${id}`)
      .then(r => r.json()).then(d => setOrder(d.data || d))
      .catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const statusColors: Record<string, { bg: string; color: string }> = {
    PENDING: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    CONFIRMED: { bg: 'rgba(99,102,241,0.15)', color: '#a78bfa' },
    SHIPPED: { bg: 'rgba(77,150,255,0.15)', color: '#4d96ff' },
    DELIVERED: { bg: 'rgba(107,203,119,0.15)', color: '#6bcb77' },
    CANCELLED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    RETURNED: { bg: 'rgba(249,115,22,0.15)', color: '#f97316' },
  };

  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#8b8b9e', background: '#0f0f23', minHeight: '100vh' }}>Loading...</div>;

  const status = order?.status || 'PENDING';
  const sc = statusColors[status] || statusColors.PENDING;

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/admin/marketplace/orders" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>← All Orders</Link>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>Order #{id?.substring(0, 8)}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: '6px', fontWeight: 600, background: sc.bg, color: sc.color }}>{status}</span>
              <span style={{ color: '#8b8b9e', fontSize: '0.8rem' }}>{order?.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['Mark Shipped', 'Mark Delivered', 'Cancel'].map((action, i) => (
              <button key={action} style={{
                padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${i === 2 ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`,
                background: i === 2 ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                color: i === 2 ? '#f87171' : '#a78bfa',
              }}>{action}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem' }}>
          <div>
            {/* Items */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Order Items</h3>
              {(order?.items || [{ name: 'Sample Product', quantity: 1, price: 2499, sku: 'SKU-001' }]).map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.9rem' }}>
                  <div><div style={{ fontWeight: 500 }}>{item.name}</div><div style={{ color: '#8b8b9e', fontSize: '0.8rem' }}>SKU: {item.sku} × {item.quantity}</div></div>
                  <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            {/* Timeline */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Activity Log</h3>
              {[
                { action: 'Order placed', by: 'Customer', time: '2 hours ago' },
                { action: 'Payment confirmed', by: 'System', time: '2 hours ago' },
                { action: 'Seller notified', by: 'System', time: '1 hour ago' },
              ].map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: '5px' }} />
                  <div><span>{log.action}</span> <span style={{ color: '#8b8b9e' }}>— {log.by} • {log.time}</span></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            {/* Customer Info */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Customer</h3>
              <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{order?.customerName || 'John Doe'}</div>
              <div style={{ color: '#8b8b9e', fontSize: '0.85rem' }}>{order?.customerEmail || 'john@example.com'}</div>
              <div style={{ color: '#8b8b9e', fontSize: '0.85rem' }}>📞 {order?.customerPhone || '+91 98765 43210'}</div>
            </div>
            {/* Shipping */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Shipping Address</h3>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>42 Green Valley Apartments<br />Near City Mall<br />Bangalore, Karnataka 560001</div>
            </div>
            {/* Payment */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '0.95rem', color: '#8b8b9e', marginBottom: '0.75rem' }}>Payment</h3>
              {[
                { label: 'Method', value: 'UPI' },
                { label: 'Subtotal', value: '₹2,499' },
                { label: 'Shipping', value: '₹49' },
                { label: 'Tax (18%)', value: '₹449' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.85rem', color: '#8b8b9e' }}>
                  <span>{row.label}</span><span style={{ color: '#e6e6e6' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.3rem' }}>
                <span>Total</span><span style={{ color: '#6bcb77' }}>₹2,997</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
