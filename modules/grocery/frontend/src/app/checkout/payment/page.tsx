import { redirect } from 'next/navigation';

/**
 * Grocery payment step.
 *
 * Nothing in the module linked here — `/grocery/checkout` collects the payment
 * method and places the order in one step — so this was an orphan route rendering
 * a second, contradictory checkout: a fixed four-line basket, a `deliveryFee` of 29
 * and a `discount` of 45 that no cart produced, two saved cards ("Visa •4242",
 * "Mastercard •8765") belonging to nobody, and a KARTSEEK Wallet showing a balance
 * of ₹2,450.00 that was a string literal in the file.
 *
 * A fabricated balance on a payment screen is the most consequential kind of stub
 * — it invites a customer to pay from money they may not have — so the route now
 * sends them to the checkout that actually prices and places the order.
 */
export default function GroceryPaymentPage() {
  redirect('/grocery/checkout');
}
