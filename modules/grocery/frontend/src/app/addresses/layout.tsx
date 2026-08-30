import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Delivery addresses',
  'Manage the addresses your KARTSEEK grocery orders are delivered to.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
