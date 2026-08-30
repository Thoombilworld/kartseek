import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | KARTSEEK Grocery',
    default: 'KARTSEEK Grocery — Fresh Groceries Delivered in Minutes',
  },
  description:
    'Order fresh groceries, fruits, vegetables, meat, dairy, and household essentials from local stores. Same-day delivery with live order tracking. Available in India, UAE, Qatar, Saudi Arabia, UK, and USA.',
  keywords: [
    'grocery delivery', 'online grocery', 'fresh vegetables', 'fruit delivery',
    'meat delivery', 'dairy products', 'household essentials', 'same-day delivery',
    'KARTSEEK', 'multi-vendor grocery', 'local stores',
  ],
  openGraph: {
    title: 'KARTSEEK Grocery — Fresh Groceries Delivered in Minutes',
    description:
      'Shop from 40+ local stores. Fresh produce, meat, dairy, and essentials delivered to your door.',
    type: 'website',
    siteName: 'KARTSEEK',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    languages: {
      'en': '/',
      'ar': '/ar/grocery',
      'hi': '/hi/grocery',
    },
  },
};
