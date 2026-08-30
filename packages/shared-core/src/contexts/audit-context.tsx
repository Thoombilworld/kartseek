'use client';

import React, {
  createContext, useContext, useCallback, useRef,
  type ReactNode
} from 'react';
import { useAuth, type AuthUser } from './auth-context';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditEntry {
  id: string;
  timestamp: string;
  /** Admin who performed the action */
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRoleId?: string;
  adminRoleName?: string;
  /** Region where the action was performed */
  regionCode: string;
  regionName: string;
  /** Action category */
  module: string;
  /** Human-readable action description */
  action: string;
  /** Additional details */
  details?: string;
  /** Severity level */
  severity: AuditSeverity;
  /** IP address (mocked for frontend) */
  ipAddress: string;
}

export interface AuditFilters {
  module?: string;
  regionCode?: string;
  severity?: AuditSeverity;
  adminEmail?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuditContextValue {
  /** Log a new audit event */
  logAction: (action: string, module: string, details?: string, severity?: AuditSeverity) => void;
  /** Get all audit entries with optional filtering */
  getAuditLog: (filters?: AuditFilters) => AuditEntry[];
  /** Get total count of audit entries */
  getAuditCount: () => number;
  /** Clear all audit entries */
  clearAuditLog: () => void;
}

const AuditContext = createContext<AuditContextValue | undefined>(undefined);

// ─── Region names for display ─────────────────────────────────────────────────

const REGION_NAMES: Record<string, string> = {
  IN: 'India', QA: 'Qatar', AE: 'UAE', SA: 'Saudi Arabia',
  BH: 'Bahrain', KW: 'Kuwait', OM: 'Oman', GB: 'United Kingdom',
  US: 'United States', SG: 'Singapore', ALL: 'All Regions',
};

// ─── Seed data for initial audit log ──────────────────────────────────────────

function generateSeedEntries(): AuditEntry[] {
  const now = new Date();
  return [
    {
      id: 'audit_seed_001', timestamp: new Date(now.getTime() - 86400000 * 2).toISOString(),
      adminId: 'adm_admin', adminName: 'Super Admin', adminEmail: 'admin@kartseek.com',
      adminRoleId: 'R-01', adminRoleName: 'Super Admin',
      regionCode: 'ALL', regionName: 'All Regions',
      module: 'System', action: 'System configuration updated', details: 'Updated payment gateway settings for Stripe',
      severity: 'info', ipAddress: '192.168.1.10',
    },
    {
      id: 'audit_seed_002', timestamp: new Date(now.getTime() - 86400000 * 1.5).toISOString(),
      adminId: 'adm_uae', adminName: 'Sarah Al-Rashid', adminEmail: 'uae@kartseek.com',
      adminRoleId: 'R-03', adminRoleName: 'Country Manager',
      regionCode: 'AE', regionName: 'UAE',
      module: 'Sellers', action: 'Approved new seller registration', details: 'Seller: Dubai Electronics LLC (SLR-4521)',
      severity: 'info', ipAddress: '85.115.62.40',
    },
    {
      id: 'audit_seed_003', timestamp: new Date(now.getTime() - 86400000).toISOString(),
      adminId: 'adm_saudi', adminName: 'Fatima Noor', adminEmail: 'saudi@kartseek.com',
      adminRoleId: 'R-03', adminRoleName: 'Country Manager',
      regionCode: 'SA', regionName: 'Saudi Arabia',
      module: 'KYC', action: 'Verified KYC documents for seller', details: 'Seller: Al Madinah Spices (SLR-7812)',
      severity: 'info', ipAddress: '178.33.140.15',
    },
    {
      id: 'audit_seed_004', timestamp: new Date(now.getTime() - 3600000 * 12).toISOString(),
      adminId: 'adm_finance', adminName: 'Priya Sharma', adminEmail: 'finance@kartseek.com',
      adminRoleId: 'R-15', adminRoleName: 'Finance Manager',
      regionCode: 'ALL', regionName: 'All Regions',
      module: 'Finance', action: 'Processed batch payout', details: 'Payout batch #PB-2026-0711: 142 sellers, total ₹14,20,000',
      severity: 'info', ipAddress: '103.92.45.210',
    },
    {
      id: 'audit_seed_005', timestamp: new Date(now.getTime() - 3600000 * 6).toISOString(),
      adminId: 'adm_support', adminName: 'Maria Garcia', adminEmail: 'support@kartseek.com',
      adminRoleId: 'R-14', adminRoleName: 'Customer Support Agent',
      regionCode: 'ALL', regionName: 'All Regions',
      module: 'Orders', action: 'Processed refund for order', details: 'Order #ORD-89234: Refund of $45.99 to customer',
      severity: 'warning', ipAddress: '72.134.88.155',
    },
    {
      id: 'audit_seed_006', timestamp: new Date(now.getTime() - 3600000 * 3).toISOString(),
      adminId: 'adm_india', adminName: 'Vikram Singh', adminEmail: 'india@kartseek.com',
      adminRoleId: 'R-04', adminRoleName: 'State/District Manager',
      regionCode: 'IN', regionName: 'India',
      module: 'Delivery', action: 'Updated delivery zone boundaries', details: 'Mumbai Zone 3: Added 15 new PIN codes',
      severity: 'info', ipAddress: '49.36.100.22',
    },
    {
      id: 'audit_seed_007', timestamp: new Date(now.getTime() - 3600000).toISOString(),
      adminId: 'adm_admin', adminName: 'Super Admin', adminEmail: 'admin@kartseek.com',
      adminRoleId: 'R-01', adminRoleName: 'Super Admin',
      regionCode: 'ALL', regionName: 'All Regions',
      module: 'Security', action: 'Failed login attempt detected', details: 'Multiple failed OTP attempts from IP 103.45.67.89',
      severity: 'critical', ipAddress: '103.45.67.89',
    },
  ];
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuditProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const logRef = useRef<AuditEntry[]>(generateSeedEntries());

  const logAction = useCallback(
    (action: string, module: string, details?: string, severity: AuditSeverity = 'info') => {
      const entry: AuditEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        timestamp: new Date().toISOString(),
        adminId: user?.id || 'unknown',
        adminName: user?.name || 'Unknown',
        adminEmail: user?.email || 'unknown@kartseek.com',
        adminRoleId: user?.adminRoleId,
        adminRoleName: user?.adminRoleName,
        regionCode: user?.regionCode || 'ALL',
        regionName: REGION_NAMES[user?.regionCode || 'ALL'] || 'Unknown',
        module,
        action,
        details,
        severity,
        ipAddress: '127.0.0.1', // Frontend mock
      };
      logRef.current = [entry, ...logRef.current];

      // Keep max 500 entries in memory
      if (logRef.current.length > 500) {
        logRef.current = logRef.current.slice(0, 500);
      }
    },
    [user],
  );

  const getAuditLog = useCallback((filters?: AuditFilters): AuditEntry[] => {
    let results = [...logRef.current];

    if (filters?.module) {
      results = results.filter(e => e.module === filters.module);
    }
    if (filters?.regionCode) {
      results = results.filter(e => e.regionCode === filters.regionCode || e.regionCode === 'ALL');
    }
    if (filters?.severity) {
      results = results.filter(e => e.severity === filters.severity);
    }
    if (filters?.adminEmail) {
      results = results.filter(e => e.adminEmail === filters.adminEmail);
    }
    if (filters?.startDate) {
      results = results.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      results = results.filter(e => e.timestamp <= filters.endDate!);
    }
    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }, []);

  const getAuditCount = useCallback(() => logRef.current.length, []);

  const clearAuditLog = useCallback(() => {
    logRef.current = [];
  }, []);

  return (
    <AuditContext.Provider value={{ logAction, getAuditLog, getAuditCount, clearAuditLog }}>
      {children}
    </AuditContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAudit(): AuditContextValue {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be used within <AuditProvider>');
  return ctx;
}
