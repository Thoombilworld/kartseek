'use client';

export default function TaxCompliancePage() {
  const states = [
    { state: 'Maharashtra', gstin: '27XXXXX1234X1ZX', gstFiled: true, tdsDeducted: true, sellers: 145, revenue: 8500000, taxCollected: 1530000 },
    { state: 'Karnataka', gstin: '29XXXXX1234X1ZX', gstFiled: true, tdsDeducted: true, sellers: 120, revenue: 6200000, taxCollected: 1116000 },
    { state: 'Delhi NCR', gstin: '07XXXXX1234X1ZX', gstFiled: true, tdsDeducted: true, sellers: 98, revenue: 5400000, taxCollected: 972000 },
    { state: 'Tamil Nadu', gstin: '33XXXXX1234X1ZX', gstFiled: true, tdsDeducted: false, sellers: 85, revenue: 4200000, taxCollected: 756000 },
    { state: 'Gujarat', gstin: '24XXXXX1234X1ZX', gstFiled: false, tdsDeducted: true, sellers: 72, revenue: 3800000, taxCollected: 684000 },
    { state: 'Telangana', gstin: '36XXXXX1234X1ZX', gstFiled: true, tdsDeducted: true, sellers: 65, revenue: 3200000, taxCollected: 576000 },
  ];
  const cs = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };
  const totalTax = states.reduce((s, st) => s + st.taxCollected, 0);
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>🧾 Tax Compliance Dashboard</h1>
        <div style={{ ...cs, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[{ l: 'Total Tax Collected', v: '₹' + (totalTax / 100000).toFixed(0) + 'L', c: '#6bcb77' }, { l: 'States Active', v: states.length.toString(), c: '#a78bfa' }, { l: 'GST Filed', v: states.filter(s => s.gstFiled).length + '/' + states.length, c: '#4d96ff' }, { l: 'TDS Compliance', v: states.filter(s => s.tdsDeducted).length + '/' + states.length, c: '#fbbf24' }].map(k => (
            <div key={k.l} style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#8b8b9e' }}>{k.l}</div><div style={{ fontSize: '1.3rem', fontWeight: 700, color: k.c }}>{k.v}</div></div>
          ))}
        </div>
        <div style={{ ...cs }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>State-wise Compliance</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['State', 'GSTIN', 'GST Filed', 'TDS', 'Sellers', 'Revenue', 'Tax Collected'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>{states.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{s.state}</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.gstin}</td>
                <td style={{ padding: '0.75rem' }}>{s.gstFiled ? '✅' : '⚠️'}</td>
                <td style={{ padding: '0.75rem' }}>{s.tdsDeducted ? '✅' : '⚠️'}</td>
                <td style={{ padding: '0.75rem' }}>{s.sellers}</td>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>₹{(s.revenue / 100000).toFixed(0)}L</td>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: '#6bcb77' }}>₹{(s.taxCollected / 100000).toFixed(0)}L</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
