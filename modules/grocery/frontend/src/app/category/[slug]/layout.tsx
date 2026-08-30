import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from '@/lib/seo/metadata';

/** "fresh-fruits" → "Fresh Fruits". */
function toTitle(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Grocery category listings are indexable.
 *
 * Unlike the store and product pages in this module, a category page makes no
 * claim about a specific business or item — it is a listing over a real product
 * search, and the only entity it names is the category itself, which the slug
 * already states. So the metadata can be derived from the slug honestly, with
 * no structured data asserting anything the page cannot back up.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const name = toTitle(slug);

  return buildMeta({
    title: `${name} - Order Groceries Online`,
    description: `Shop ${name.toLowerCase()} from stores near you on KARTSEEK. Fresh stock, transparent pricing and delivery to your door.`,
    path: `/grocery/category/${slug}`,
    keywords: [name, 'grocery delivery', 'order online', 'KARTSEEK'],
  });
}

export default function GroceryCategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
