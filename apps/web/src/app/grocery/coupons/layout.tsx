import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Coupons',
  'Coupons and offers available on your KARTSEEK grocery account.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
