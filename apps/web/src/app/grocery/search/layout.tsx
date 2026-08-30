import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Search groceries',
  'Search products, stores and brands on KARTSEEK Grocery.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
