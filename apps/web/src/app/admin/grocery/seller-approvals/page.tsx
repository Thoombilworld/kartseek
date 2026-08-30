import { redirect } from 'next/navigation';

/**
 * Grocery seller approvals.
 *
 * This screen and `/admin/grocery/stores` were two copies of the same queue, both
 * hardcoded: this one listed five sellers ("Fresh Farm Organics", "Urban Meats")
 * whose approve and reject buttons mutated a local array, while the other listed
 * two vendors whose buttons posted `status` into a field the API drops.
 *
 * There is one approval queue, backed by `grocery_stores.status = 'PENDING_KYC'`,
 * and it is on the stores screen. Two consoles for one workflow is how they came
 * to disagree, so this route now points at the real one rather than being a third
 * implementation.
 */
export default function GrocerySellerApprovalsPage() {
  redirect('/admin/grocery/stores');
}
