'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './vpn-detection-overlay.module.css';

interface GeoCheckResult {
  ip: string;
  country: string | null;
  city: string | null;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  isSuspicious: boolean;
  threatLevel: string;
  action: string;
  message: string | null;
}

interface VpnDetectionOverlayProps {
  apiBaseUrl?: string;
  checkOnMount?: boolean;
  recheckIntervalMs?: number;
}

const BLOCKED_SERVICES = [
  { emoji: '🚕', name: 'Taxi Booking' },
  { emoji: '🍔', name: 'Restaurant Orders' },
  { emoji: '🛒', name: 'Grocery Delivery' },
  { emoji: '💊', name: 'Pharmacy' },
  { emoji: '🏥', name: 'Doctor Appointments' },
  { emoji: '🏪', name: 'Local Store Discovery' },
];

function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.**`;
  return ip.length > 6 ? `${ip.substring(0, 6)}...` : ip;
}

export function VpnDetectionOverlay({
  apiBaseUrl = '/api/v1',
  checkOnMount = true,
  recheckIntervalMs = 600000, // 10 minutes
}: VpnDetectionOverlayProps) {
  const [result, setResult] = useState<GeoCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const performCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`${apiBaseUrl}/geo/check`, {
        headers: { 'x-platform': 'web' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data: GeoCheckResult = await res.json();
        setResult(data);
        setDismissed(false);
      }
    } catch (e) {
      console.warn('[GeoSecurity] Check failed:', e);
    } finally {
      setIsChecking(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (checkOnMount) performCheck();
    const interval = setInterval(performCheck, recheckIntervalMs);
    return () => clearInterval(interval);
  }, [checkOnMount, recheckIntervalMs, performCheck]);

  // Recheck when tab becomes visible (user may have disabled VPN)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') performCheck();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [performCheck]);

  const handleRetry = () => {
    setResult(null);
    performCheck();
  };

  // Block overlay
  if (result?.action === 'block' && !dismissed) {
    return (
      <div className={styles.overlay}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          </div>

          <h2 className={styles.title}>VPN / Proxy Detected</h2>
          <p className={styles.message}>
            {result.message || 'VPN or proxy detected. Please disable your VPN to continue using KARTSEEK services.'}
          </p>

          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>IP Address</span>
              <span className={styles.detailValue}>{maskIp(result.ip)}</span>
            </div>
            {result.country && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Country</span>
                <span className={styles.detailValue}>{result.country}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Detection</span>
              <span className={styles.detailValue}>
                {[
                  result.isVpn && 'VPN',
                  result.isProxy && 'Proxy',
                  result.isTor && 'TOR',
                  result.isDatacenter && 'Datacenter',
                ].filter(Boolean).join(', ')}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Threat Level</span>
              <span className={`${styles.detailValue} ${styles[`threat${result.threatLevel}`]}`}>
                {result.threatLevel.toUpperCase()}
              </span>
            </div>
          </div>

          <p className={styles.servicesLabel}>The following services are unavailable:</p>
          <div className={styles.servicesList}>
            {BLOCKED_SERVICES.map(s => (
              <span key={s.name} className={styles.serviceChip}>
                {s.emoji} {s.name}
              </span>
            ))}
          </div>

          <button
            title="Retry location check"
            onClick={handleRetry}
            disabled={isChecking}
            className={styles.retryBtn}
          >
            {isChecking ? (
              <span className={styles.spinner} />
            ) : (
              <>↻ Retry Location Check</>
            )}
          </button>

          <p className={styles.helpText}>
            Disable your VPN, then click &quot;Retry&quot; to continue.
          </p>
        </div>
      </div>
    );
  }

  // Warning banner (non-blocking)
  if (result?.action === 'warn' && !dismissed) {
    return (
      <div className={styles.warningBanner}>
        <span className={styles.warningIcon}>⚠️</span>
        <span className={styles.warningText}>
          {result.message || 'VPN detected — some location-based services may be limited.'}
        </span>
        <button
          title="Dismiss warning"
          onClick={() => setDismissed(true)}
          className={styles.dismissBtn}
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}

export default VpnDetectionOverlay;
