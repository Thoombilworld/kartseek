'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function SellerDetailDeepPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tab, setTab] = useState<'kyc' | 'bank' | 'warehouses' | 'compliance'>('kyc');

  const seller = {
    name: 'TechVision Electronics', email: 'contact@techvision.in', status: 'ACTIVE', verified: true,
    legalName: 'TechVision Private Limited', registrationType: 'Private Limited Company',
    gstNumber: '29AABCT1332Q1ZX', panNumber: 'AABCT1332Q', cin: 'U72200KA2019PTC127893',
    kyc: [
      { doc: 'PAN Card', status: 'Verified', uploaded: '2024-01-15', verifiedBy: 'Admin (Ravi)' },
      { doc: 'GST Certificate', status: 'Verified', uploaded: '2024-01-15', verifiedBy: 'Admin (Ravi)' },
      { doc: 'Address Proof', status: 'Verified', uploaded: '2024-01-16', verifiedBy: 'Admin (Ravi)' },
      { doc: 'Cancelled Cheque', status: 'Verified', uploaded: '2024-01-16', verifiedBy: 'System' },
      { doc: 'Brand Authorization', status: 'Pending', uploaded: '2026-06-20', verifiedBy: '—' },
    ],
    bank: { name: 'HDFC Bank', branch: 'Koramangala, Bengaluru', ifsc: 'HDFC0001234', account: '****5678', beneficiary: 'TechVision Private Limited', verified: true },
    warehouses: [
      { name: 'Primary Warehouse', address: 'Plot 42, Phase 2, Electronic City, Bengaluru', pincode: '560100', type: 'Self-Managed' },
      { name: 'FBK Warehouse', address: 'KartSeek Fulfillment Center, Hosur Road', pincode: '560068', type: 'FBK' },
    ],
    compliance: { gstFiled: true, tdsDeducted: true, lastAudit: '2026-05-15', nextAudit: '2026-08-15', riskLevel: 'Low' },
  };

  const cs: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href={`/admin/marketplace/sellers/${id}`} style={{ color: '#8b8b9e', textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>← Seller Overview</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>🏢 {seller.name} — Deep Profile</h1>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(107,203,119,0.15)', color: '#6bcb77' }}>{seller.status}</span>
          <span style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{seller.legalName} • {seller.registrationType}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {(['kyc', 'bank', 'warehouses', 'compliance'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 600, fontSize: '0.85rem', background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent', color: tab === t ? '#a78bfa' : '#8b8b9e', cursor: 'pointer', textTransform: 'uppercase', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent' }}>{t}</button>
          ))}
        </div>

        {tab === 'kyc' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>KYC Documents</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Document', 'Status', 'Uploaded', 'Verified By', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', color: '#8b8b9e', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>{seller.kyc.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{d.doc}</td>
                  <td style={{ padding: '0.75rem' }}><span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: d.status === 'Verified' ? 'rgba(107,203,119,0.15)' : 'rgba(251,191,36,0.15)', color: d.status === 'Verified' ? '#6bcb77' : '#fbbf24' }}>{d.status}</span></td>
                  <td style={{ padding: '0.75rem', color: '#8b8b9e' }}>{d.uploaded}</td>
                  <td style={{ padding: '0.75rem', color: '#8b8b9e' }}>{d.verifiedBy}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem', marginRight: '0.5rem' }}>View</button>
                    {d.status === 'Pending' && <button style={{ background: 'none', border: 'none', color: '#6bcb77', cursor: 'pointer', fontSize: '0.8rem' }}>Verify</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {tab === 'bank' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Bank Account</h3>
            {[{ l: 'Bank', v: seller.bank.name }, { l: 'Branch', v: seller.bank.branch }, { l: 'IFSC', v: seller.bank.ifsc }, { l: 'Account', v: seller.bank.account }, { l: 'Beneficiary', v: seller.bank.beneficiary }, { l: 'Status', v: seller.bank.verified ? '✅ Verified' : '⏳ Pending' }].map(f => (
              <div key={f.l} style={{ marginBottom: '0.5rem' }}><div style={{ fontSize: '0.75rem', color: '#8b8b9e' }}>{f.l}</div><div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{f.v}</div></div>
            ))}
          </div>
        )}

        {tab === 'warehouses' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Warehouses ({seller.warehouses.length})</h3>
            {seller.warehouses.map((w, i) => (
              <div key={i} style={{ marginBottom: '0.75rem', padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 700 }}>{w.name}</span>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: w.type === 'FBK' ? 'rgba(99,102,241,0.15)' : 'rgba(251,191,36,0.15)', color: w.type === 'FBK' ? '#a78bfa' : '#fbbf24' }}>{w.type}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#8b8b9e' }}>{w.address} — {w.pincode}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'compliance' && (
          <div style={cs}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Compliance</h3>
            {[{ l: 'GST Filed', v: seller.compliance.gstFiled ? '✅ Up to date' : '⚠️ Overdue' }, { l: 'TDS Deducted', v: seller.compliance.tdsDeducted ? '✅ Yes' : '❌ No' }, { l: 'Last Audit', v: seller.compliance.lastAudit }, { l: 'Next Audit', v: seller.compliance.nextAudit }, { l: 'Risk Level', v: seller.compliance.riskLevel }].map(f => (
              <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#8b8b9e', fontSize: '0.85rem' }}>{f.l}</span><span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
