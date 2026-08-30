'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PayoutDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const payout = {
    id: `PAY-${id || '8823'}`, status: 'COMPLETED', amount: 245000, seller: 'TechVision Electronics',
    accountName: 'TechVision Private Limited', bankName: 'HDFC Bank', ifsc: 'HDFC0001234', accountLast4: '5678',
    initiatedAt: '2026-06-28 00:00', processedAt: '2026-06-28 06:30', settledAt: '2026-06-28 18:00',
    utrNumber: 'UTR-HDFC-293847562', period: '2026-06-21 to 2026-06-27',
    breakdown: [
      { label: 'Gross Sales', amount: 320000, type: 'credit' },
      { label: 'Platform Commission (8%)', amount: -25600, type: 'debit' },
      { label: 'Shipping Charges', amount: -12400, type: 'debit' },
      { label: 'GST on Commission', amount: -4608, type: 'debit' },
      { label: 'TDS (1%)', amount: -3200, type: 'debit' },
      { label: 'SLA Penalty', amount: -2500, type: 'debit' },
      { label: 'Previous Balance', amount: -26692, type: 'debit' },
    ],
    orders: [
      { id: 'ORD-48500', amount: 129999, commission: 10400, date: '2026-06-27' },
      { id: 'ORD-48420', amount: 45999, commission: 3680, date: '2026-06-25' },
      { id: 'ORD-48380', amount: 89500, commission: 7160, date: '2026-06-24' },
      { id: 'ORD-48210', amount: 54502, commission: 4360, date: '2026-06-22' },
    ],
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/admin/marketplace/payouts" style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← All Payouts</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>💳 {payout.id}</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{payout.status}</span>
              <span style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{payout.seller} • {payout.period}</span>
            </div>
          </div>
        </div>

        <div style={{ ...cs, textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>Net Payout Amount</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6bcb77' }}>₹{payout.amount.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: '#8b8b9e', marginTop: '0.3rem' }}>UTR: {payout.utrNumber}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Breakdown</h3>
            {payout.breakdown.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '0.85rem', color: '#c0c0c0' }}>{b.label}</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: b.type === 'credit' ? '#6bcb77' : '#f87171' }}>{b.type === 'credit' ? '+' : ''}₹{Math.abs(b.amount).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0 0', marginTop: '0.5rem', borderTop: '2px solid rgba(255,255,255,0.12)' }}>
              <span style={{ fontWeight: 700 }}>Net Payout</span><span style={{ fontWeight: 700, color: '#6bcb77', fontSize: '1.1rem' }}>₹{payout.amount.toLocaleString()}</span>
            </div>
          </div>
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Bank Details</h3>
            {[{ l: 'Account Name', v: payout.accountName }, { l: 'Bank', v: payout.bankName }, { l: 'IFSC', v: payout.ifsc }, { l: 'Account', v: `****${payout.accountLast4}` }, { l: 'Initiated', v: payout.initiatedAt }, { l: 'Processed', v: payout.processedAt }, { l: 'Settled', v: payout.settledAt }].map(f => (
              <div key={f.l} style={{ marginBottom: '0.5rem' }}><div style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>{f.l}</div><div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{f.v}</div></div>
            ))}
          </div>
        </div>

        <div style={cs}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Included Orders ({payout.orders.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Order', 'Date', 'Amount', 'Commission'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>{payout.orders.map((o, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600, color: '#a78bfa' }}>{o.id}</td>
                <td style={{ padding: '0.75rem', color: '#8b8b9e' }}>{o.date}</td>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>₹{o.amount.toLocaleString()}</td>
                <td style={{ padding: '0.75rem', color: '#f87171' }}>-₹{o.commission.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
