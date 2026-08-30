import { redirect } from 'next/navigation';

/**
 * `/profile/orders/[id]` → `/marketplace/orders/[id]`.
 *
 * The detail half of the same fiction: it rendered a fixed order built from the
 * bundled demo products, for whatever id was in the URL.
 *
 * The id is carried across because the real page resolves it — an order number
 * or the order-service uuid both work there.
 */
export default async function ProfileOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/marketplace/orders/${encodeURIComponent(id)}`);
}
