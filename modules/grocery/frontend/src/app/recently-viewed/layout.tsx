import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Recently viewed',
  'Products you have looked at recently on KARTSEEK Grocery.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
