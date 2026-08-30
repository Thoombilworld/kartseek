import { redirect } from 'next/navigation';

/**
 * Nothing links here, and what was here was a dead form: no submit handler on
 * "Create Category", a parent-category dropdown hard-coded to three options
 * that are not category ids, and an upload well that uploaded nothing. Creating
 * a category now happens in the modal on the list screen, against the real API.
 *
 * Kept as a redirect rather than deleted so any bookmark or external link still
 * lands somewhere that works.
 */
export default function CategoryCreateRedirect() {
  redirect('/admin/marketplace/categories');
}
