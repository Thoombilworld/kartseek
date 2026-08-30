import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Saved items',
  'Products you have saved on KARTSEEK Grocery.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
