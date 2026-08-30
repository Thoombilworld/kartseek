/**
 * Minimal layout for admin auth pages (login, forgot-password, etc.).
 * Bypasses the sidebar-based admin layout so these pages
 * render full-screen like any standalone auth form.
 */
export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
