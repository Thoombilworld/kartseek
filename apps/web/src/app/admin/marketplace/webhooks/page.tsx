'use client';
import { useState } from 'react';

export default function WebhookManagerPage() {
  const webhooks = [
    { id: 'WH-001', url: 'https://api.erp.techvision.in/kartseek/orders', events: ['order.created', 'order.shipped'], status: 'ACTIVE', lastTriggered: '2 min ago', successRate: 99.2, secret: 'whsec_****X9Yz' },
    { id: 'WH-002', url: 'https://hooks.slack.com/services/T01/B02/xxxx', events: ['seller.registered', 'dispute.created'], status: 'ACTIVE', lastTriggered: '1 hour ago', successRate: 100, secret: 'whsec_****A1Bc' },
    { id: 'WH-003', url: 'https://analytics.kartseek.com/events', events: ['order.delivered', 'return.created', 'review.created'], status: 'ACTIVE', lastTriggered: '5 min ago', successRate: 98.5, secret: 'whsec_****D2Ef' },
    { id: 'WH-004', url: 'https://crm.partner.com/api/leads', events: ['seller.registered'], status: 'INACTIVE', lastTriggered: '3 days ago', successRate: 85.2, secret: 'whsec_****G3Hi' },
  ];
  const cs = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem' };
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#e6e6e6', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>🔗 Webhook Manager</h1>
          <button style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>+ Add Webhook</button>
        </div>
        {webhooks.map((w, i) => (
          <div key={i} style={{ ...cs }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>{w.url}</div>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {w.events.map(e => <span key={e} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#a78bfa' }}>{e}</span>)}
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: w.status === 'ACTIVE' ? 'rgba(107,203,119,0.15)' : 'rgba(255,255,255,0.08)', color: w.status === 'ACTIVE' ? '#6bcb77' : '#8b8b9e' }}>{w.status}</span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#8b8b9e' }}>
              <span>Last: {w.lastTriggered}</span>
              <span>Success: <span style={{ color: w.successRate >= 95 ? '#6bcb77' : '#fbbf24', fontWeight: 600 }}>{w.successRate}%</span></span>
              <span>ID: {w.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
