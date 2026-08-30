'use client';

import { adminGroceryApi, type AdminGroceryDashboard } from '@/lib/api/admin-grocery';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * useAdminGroceryDashboard — headline counters for the admin grocery section.
 *
 * `admin.grocery.dashboard` had no handler on grocery-service, so this data had
 * never once been fetched; the console derived its tiles from whatever rows
 * happened to be on screen, including a `revenue` field computed as
 * `totalOrders × 500` and a "Quality Alerts" count over a `complaints` property
 * that does not exist on any store record.
 */
export function useAdminGroceryDashboard() {

  const { data: dashboardData, loading, error, reload } = useAsyncData<AdminGroceryDashboard>(
    async () => {
      const res = await adminGroceryApi.getDashboard();
      if (!res.success || !res.data) throw new Error(res.error ?? 'Could not load the grocery dashboard');
      return res.data;
    },
    [],
  );
  const dashboard = dashboardData;

  return { dashboard, loading, error, refresh: reload };
}
