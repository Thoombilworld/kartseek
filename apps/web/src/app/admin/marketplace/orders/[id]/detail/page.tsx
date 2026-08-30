'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function OrderDetailAdminPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tab, setTab] = useState<'overview' | 'items' | 'payment' | 'shipping' | 'timeline'>('overview');

  const order = {
    id: `ORD-${id || '48521'}`, status: 'SHIPPED', paymentStatus: 'PAID', date: '2026-06-28 14:32',
    customer: { name: 'Priya Sharma', email: 'priya@gmail.com', phone: '+91 98765 43210' },
    seller: 'TechVision Electronics', channel: 'WEB',
    subtotal: 145498, discount: 5000, shippingCost: 0, tax: 25290, total: 165788,
    payment: { method: 'UPI', txnId: 'PAY-8823-UPI', gateway: 'Razorpay', paidAt: '2026-06-28 14:35' },
    address: '402, Maple Heights, Andheri West, Mumbai - 400058',
    items: [
      { name: 'Samsung Galaxy S24 Ultra', qty: 1, price: 129999, sku: 'SAM-S24U-256' },
      { name: 'Samsung 45W Charger', qty: 1, price: 2499, sku: 'SAM-CHRG-45W' },
      { name: 'Clear Case S24 Ultra', qty: 2, price: 6500, sku: 'SAM-CASE-S24U' },
    ],
    shipping: { carrier: 'Delhivery', trackingId: 'DLV-293847562', weight: '0.8 kg', estimatedDelivery: '2026-07-01' },
    timeline: [
      { time: '2026-06-28 14:32', event: 'Order placed', status: 'done' },
      { time: '2026-06-28 14:35', event: 'Payment confirmed (UPI)', status: 'done' },
      { time: '2026-06-28 16:00', event: 'Order confirmed by seller', status: 'done' },
      { time: '2026-06-29 10:20', event: 'Packed & ready for pickup', status: 'done' },
      { time: '2026-06-29 15:45', event: 'Picked up by Delhivery', status: 'done' },
      { time: '2026-06-30 08:10', event: 'In transit — Mumbai Hub', status: 'current' },
      { time: '', event: 'Out for delivery', status: 'pending' },
      { time: '', event: 'Delivered', status: 'pending' },
    ],
  };

  const cardClasses = 'bg-white/[0.04] border border-white/8 rounded-[14px] p-5 mb-4';
  const labelClasses = 'text-xs text-[#8b8b9e] mb-1';

  return (
    <div className="min-h-screen bg-[#0f0f23] text-[#e6e6e6] p-6">
      <div className="max-w-[1100px] mx-auto">
        <Link href="/admin/marketplace/orders" className="text-[#8b8b9e] no-underline text-[0.85rem] block mb-2">← All Orders</Link>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-[1.6rem] font-bold mb-1">📦 {order.id}</h1>
            <div className="flex gap-2">
              <span className="text-[0.7rem] px-2 py-0.5 rounded-md bg-[rgba(77,150,255,0.15)] text-[#4d96ff]">{order.status}</span>
              <span className="text-[0.7rem] px-2 py-0.5 rounded-md bg-[rgba(107,203,119,0.15)] text-[#6bcb77]">{order.paymentStatus}</span>
              <span className="text-xs text-[#8b8b9e]">{order.date}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-[10px] border border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.1)] text-[#fbbf24] font-semibold text-[0.8rem] cursor-pointer">Cancel Order</button>
            <button className="px-4 py-2 rounded-[10px] border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.1)] text-[#a78bfa] font-semibold text-[0.8rem] cursor-pointer">Initiate Refund</button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-white/8">
          {(['overview', 'items', 'payment', 'shipping', 'timeline'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 rounded-t-lg border-none font-semibold text-[0.85rem] cursor-pointer capitalize border-b-2 ${tab === t ? 'bg-[rgba(99,102,241,0.15)] text-[#a78bfa] border-b-indigo-500' : 'bg-transparent text-[#8b8b9e] border-b-transparent'}`}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={cardClasses}>
              <h3 className="text-[0.95rem] font-semibold mb-4">Customer</h3>
              {[{ l: 'Name', v: order.customer.name }, { l: 'Email', v: order.customer.email }, { l: 'Phone', v: order.customer.phone }, { l: 'Address', v: order.address }].map(f => (
                <div key={f.l} className="mb-2.5"><div className={labelClasses}>{f.l}</div><div className="text-[0.9rem] font-medium">{f.v}</div></div>
              ))}
            </div>
            <div className={cardClasses}>
              <h3 className="text-[0.95rem] font-semibold mb-4">Order Summary</h3>
              {[{ l: 'Subtotal', v: `₹${order.subtotal.toLocaleString()}` }, { l: 'Discount', v: `-₹${order.discount.toLocaleString()}` }, { l: 'Shipping', v: order.shippingCost === 0 ? 'FREE' : `₹${order.shippingCost}` }, { l: 'Tax (GST)', v: `₹${order.tax.toLocaleString()}` }].map(f => (
                <div key={f.l} className="flex justify-between py-1.5 border-b border-white/4">
                  <span className="text-[#8b8b9e] text-[0.85rem]">{f.l}</span><span className="font-medium text-[0.85rem]">{f.v}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-2 border-t border-white/[0.12]">
                <span className="font-bold text-base">Total</span><span className="font-bold text-lg text-[#6bcb77]">₹{order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'items' && (
          <div className={cardClasses}>
            <h3 className="text-[0.95rem] font-semibold mb-4">Order Items ({order.items.length})</h3>
            <table className="w-full border-collapse">
              <thead><tr className="border-b border-white/8">
                {['Product', 'SKU', 'Qty', 'Price', 'Total'].map(h => <th key={h} className="text-left p-3 text-xs text-[#8b8b9e] font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>{order.items.map((item, i) => (
                <tr key={i} className="border-b border-white/4">
                  <td className="p-3 font-semibold">{item.name}</td>
                  <td className="p-3 text-[#8b8b9e] text-[0.85rem]">{item.sku}</td>
                  <td className="p-3">{item.qty}</td>
                  <td className="p-3">₹{item.price.toLocaleString()}</td>
                  <td className="p-3 font-semibold">₹{(item.qty * item.price).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {tab === 'timeline' && (
          <div className={cardClasses}>
            <h3 className="text-[0.95rem] font-semibold mb-4">Order Timeline</h3>
            {order.timeline.map((t, i) => (
              <div key={i} className="flex gap-4 py-3 items-start">
                <div className="flex flex-col items-center w-5">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${t.status === 'done' ? 'bg-[#6bcb77]' : t.status === 'current' ? 'bg-[#4d96ff] border-2 border-[#4d96ff]' : 'bg-white/10'}`} />
                  {i < order.timeline.length - 1 && <div className={`w-0.5 h-[30px] ${t.status === 'done' ? 'bg-[rgba(107,203,119,0.3)]' : 'bg-white/6'}`} />}
                </div>
                <div><div className={`font-semibold text-[0.9rem] ${t.status === 'pending' ? 'text-[#6b6b7e]' : 'text-[#e6e6e6]'}`}>{t.event}</div>{t.time && <div className="text-xs text-[#8b8b9e]">{t.time}</div>}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'payment' && (
          <div className={cardClasses}>
            <h3 className="text-[0.95rem] font-semibold mb-4">Payment Details</h3>
            {[{ l: 'Method', v: order.payment.method }, { l: 'Transaction ID', v: order.payment.txnId }, { l: 'Gateway', v: order.payment.gateway }, { l: 'Paid At', v: order.payment.paidAt }].map(f => (
              <div key={f.l} className="mb-2.5"><div className={labelClasses}>{f.l}</div><div className="text-[0.9rem] font-semibold">{f.v}</div></div>
            ))}
          </div>
        )}

        {tab === 'shipping' && (
          <div className={cardClasses}>
            <h3 className="text-[0.95rem] font-semibold mb-4">Shipping Details</h3>
            {[{ l: 'Carrier', v: order.shipping.carrier }, { l: 'Tracking ID', v: order.shipping.trackingId }, { l: 'Weight', v: order.shipping.weight }, { l: 'Est. Delivery', v: order.shipping.estimatedDelivery }, { l: 'Seller', v: order.seller }].map(f => (
              <div key={f.l} className="mb-2.5"><div className={labelClasses}>{f.l}</div><div className="text-[0.9rem] font-semibold">{f.v}</div></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
