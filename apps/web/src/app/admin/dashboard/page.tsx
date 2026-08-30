import { redirect } from 'next/navigation';

/**
 * /admin/dashboard → redirects to /admin (the main admin dashboard is at root)
 */
export default function AdminDashboardRedirect() {
  redirect('/admin');
}
