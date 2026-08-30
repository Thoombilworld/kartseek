import { redirect } from 'next/navigation';

/**
 * `/notifications` → `/marketplace/notifications`.
 *
 * A static list of invented notifications with no fetch and no read-state.
 * The site header linked here, so real notifications were never surfaced.
 *
 * The marketplace route is the wired implementation; keeping a second copy of
 * this screen is what let the two drift apart in the first place. Redirecting
 * rather than deleting keeps existing links and bookmarks working.
 */
export default function NotificationsRedirectPage() {
  redirect('/marketplace/notifications');
}
