import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Your orders',
  'Track and reorder your KARTSEEK grocery orders.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
