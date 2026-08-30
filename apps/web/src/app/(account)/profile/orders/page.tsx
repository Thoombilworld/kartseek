import { redirect } from 'next/navigation';

/**
 * `/profile/orders` → `/marketplace/orders`.
 *
 * This rendered a hardcoded `ORDERS` array padded out with demo flash-deal
 * products — it made no API call of any kind — so a signed-in customer reached
 * it from the site header and the account menu and saw somebody's invented
 * order history as their own.
 *
 * Its "View Invoice" control was worse: it opened `InvoiceModal`, an Indian GST
 * document, populated from a `KARTSEEK_SELLER` constant naming
 * "KARTSEEK India Pvt. Ltd." at a Bangalore address with the GSTIN
 * 29AADCK1234A1Z5, a PAN and a CIN. None of those entities or registrations
 * exist, and the platform trades in Qatar.
 *
 * `/marketplace/orders` reads the customer's real orders, and its invoice route
 * names the merchant who actually sold the goods.
 */
export default function ProfileOrdersPage() {
  redirect('/marketplace/orders');
}
