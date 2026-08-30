import { redirect } from 'next/navigation';

/**
 * `/profile/restaurant-orders` → `/restaurant/orders`.
 *
 * A second, older copy of the restaurant order history: five hardcoded orders
 * (`TKW-9981` from "The Grand Biryani House", `DEL-8821` from "Green Leaf Cafe"
 * and three more) with `canReorder` / `canRate` flags on buttons that did
 * nothing. It made no request, so it showed the same five orders to every
 * customer.
 *
 * `/restaurant/orders` reads the customer's real orders from `restaurant_orders`
 * and offers tracking on the ones still in progress. Keeping a second screen for
 * the same data is what let this one drift into fiction unnoticed; redirecting
 * rather than deleting keeps the account sidebar's existing links working.
 */
export default function ProfileRestaurantOrdersPage() {
  redirect('/restaurant/orders');
}
