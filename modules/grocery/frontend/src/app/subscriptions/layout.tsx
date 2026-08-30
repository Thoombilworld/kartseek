import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Subscriptions',
  'Manage your recurring KARTSEEK grocery deliveries.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
