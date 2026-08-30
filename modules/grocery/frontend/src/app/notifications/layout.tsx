import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Notifications',
  'Order updates and offers on your KARTSEEK account.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
