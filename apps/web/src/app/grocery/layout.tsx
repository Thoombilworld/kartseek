import type { Metadata } from 'next';
import GroceryClientLayout from './grocery-layout-client';

// ── SEO Metadata (Server Component) ─────────────────────────────────────
export const metadata: Metadata = {
  title: {
    template: '%s | KARTSEEK Grocery',
    default: 'KARTSEEK Grocery — Fresh Groceries Delivered in Minutes',
  },
  description:
    'Order fresh groceries, fruits, vegetables, meat, dairy, and household essentials from local stores. Same-day delivery with live order tracking across India, UAE, Qatar, Saudi Arabia, UK, and USA.',
  keywords: [
    'grocery delivery', 'online grocery', 'fresh vegetables', 'fruit delivery',
    'meat delivery', 'dairy products', 'household essentials', 'same-day delivery',
    'KARTSEEK', 'multi-vendor grocery', 'local stores', 'grocery near me',
  ],
  openGraph: {
    title: 'KARTSEEK Grocery — Fresh Groceries Delivered in Minutes',
    description:
      'Shop from local stores near you. Fresh produce, meat, dairy, and essentials delivered to your door.',
    type: 'website',
    siteName: 'KARTSEEK',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ── Server Layout (exports metadata + wraps client layout) ──────────────
export default function GroceryLayout({ children }: { children: React.ReactNode }) {
  return <GroceryClientLayout>{children}</GroceryClientLayout>;
}
