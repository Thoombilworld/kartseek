import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Checkout',
  'Complete your KARTSEEK grocery order.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
