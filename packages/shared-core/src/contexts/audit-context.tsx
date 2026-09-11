'use client';

import React, { createContext, useContext, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './auth-context';
import { adminCoreApi } from '@/lib/api/admin-core';

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
  /**
   * Record an action the console performed itself (sign-in, sign-out).
   *
   * Fire-and-forget from the caller's point of view, but the write is a real
   * `POST /admin/audit-logs`: the entry lands in the same immutable collection
   * the gateway's interceptor writes to, and the local copy is appended only
   * once the server confirms it.
   */
  logAction: (action: string, module: string, details?: string, severity?: AuditSeverity) => void;
  /**
   * Actions this browser session recorded and the server accepted.
   *
   * Deliberately *not* the audit trail — that is a server query, and
   * `/admin/audit-logs` asks for it directly. This used to be seeded with seven
   * invented entries so the page looked populated, which meant the one screen an
   * administrator checks after an incident showed fabricated history.
   */
  getAuditLog: (filters?: AuditFilters) => AuditEntry[];
  /** How many of this session's actions were recorded. */
  getAuditCount: () => number;
  /** Forget this session's local copy. Does not, and cannot, alter the trail. */
  clearAuditLog: () => void;
}

const AuditContext = createContext<AuditContextValue | undefined>(undefined);

// ─── Region names for display ─────────────────────────────────────────────────

const REGION_NAMES: Record<string, string> = {
  IN: 'India',
  QA: 'Qatar',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  BH: 'Bahrain',
  KW: 'Kuwait',
  OM: 'Oman',
  GB: 'United Kingdom',
  US: 'United States',
  SG: 'Singapore',
  ALL: 'All Regions',
};

/**
 * Fold a caller's action into the machine key the trail stores.
 *
 * Callers pass sentences — `logAction('Admin signed in', 'Auth', …)` filed
 * entries as `console.Auth.Admin signed in`, a key with capitals and a space in
 * it that no prefix filter, sort or aggregation can address. The gateway now
 * refuses anything that is not a slug (`AuditEntryDto`), so this is what keeps
 * an old call site recording an entry rather than silently 400ing: it is the
 * one place every console-originated key is built.
 *
 * Lower-cased, with anything outside `[a-z0-9_.-]` collapsed to `_` and the
 * result trimmed of leading and trailing separators.
 */
export function auditActionKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '');
}

/**
 * The payload `POST /admin/audit-logs` accepts.
 *
 * Exported so the page spec can assert its shape without rendering a provider.
 * Note what is absent: no `adminId`, no `adminEmail`, no `country`. The gateway
 * takes all three from the verified token, and its validation pipe rejects any
 * field `AuditEntryDto` does not declare — so a console that sent its own idea
 * of who was acting would get a 400, which is the point.
 */
export function auditPostPayload(
  action: string,
  module: string,
  details?: string,
  severity: AuditSeverity = 'info',
) {
  return {
    // `console.<module>.<action>` — the gateway prefixes `console.`, so the
    // module goes in front of the action here and the trail sorts by surface.
    // Both halves are slugged: a readable sentence belongs in `details`, and a
    // key that varies by capitalisation splits one action into several.
    action: `${auditActionKey(module)}.${auditActionKey(action)}`,
    entityType: module,
    details: { details, severity } as Record<string, unknown>,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuditProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const logRef = useRef<AuditEntry[]>([]);

  const logAction = useCallback(
    (action: string, module: string, details?: string, severity: AuditSeverity = 'info') => {
      const payload = auditPostPayload(action, module, details, severity);

      void adminCoreApi
        .addAuditLog(payload)
        .then((res) => {
          // Appended only on success. An entry kept locally after a rejected
          // write would be a row the console shows and the trail does not have.
          if (!res.success) return;
          const entry: AuditEntry = {
            id: res.data?.logId ?? `audit_${Date.now()}`,
            timestamp: new Date().toISOString(),
            adminId: user?.id || 'unknown',
            adminName: user?.name || 'Unknown',
            adminEmail: user?.email || 'unknown',
            adminRoleId: user?.adminRoleId,
            adminRoleName: user?.adminRoleName,
            regionCode: user?.regionCode || 'ALL',
            regionName: REGION_NAMES[user?.regionCode || 'ALL'] || 'Unknown',
            module,
            action,
            details,
            severity,
          };
          logRef.current = [entry, ...logRef.current].slice(0, 500);
        })
        .catch(() => {
          // `addAuditLog` resolves with `{ success: false }` rather than
          // throwing; this only catches a programming error. Either way the
          // local copy stays empty, which is the honest outcome.
        });
    },
    [user],
  );

  const getAuditLog = useCallback((filters?: AuditFilters): AuditEntry[] => {
    let results = [...logRef.current];

    if (filters?.module) {
      results = results.filter((e) => e.module === filters.module);
    }
    if (filters?.regionCode) {
      results = results.filter(
        (e) => e.regionCode === filters.regionCode || e.regionCode === 'ALL',
      );
    }
    if (filters?.severity) {
      results = results.filter((e) => e.severity === filters.severity);
    }
    if (filters?.adminEmail) {
      results = results.filter((e) => e.adminEmail === filters.adminEmail);
    }
    if (filters?.startDate) {
      results = results.filter((e) => e.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      results = results.filter((e) => e.timestamp <= filters.endDate!);
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
