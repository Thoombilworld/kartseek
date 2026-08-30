import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Your basket',
  'Review the items in your KARTSEEK grocery basket before checkout.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
