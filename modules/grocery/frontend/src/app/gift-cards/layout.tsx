import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Gift cards',
  'Buy and redeem KARTSEEK gift cards.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
