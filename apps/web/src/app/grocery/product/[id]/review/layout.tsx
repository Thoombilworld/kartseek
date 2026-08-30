import type { Metadata } from 'next';
import { accountRouteMeta } from '@/lib/seo/account-routes';

export const metadata: Metadata = accountRouteMeta(
  'Write a review',
  'Share your experience of a product on KARTSEEK Grocery.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
