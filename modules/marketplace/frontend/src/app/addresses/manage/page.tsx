import { redirect } from 'next/navigation';

/**
 * `/marketplace/addresses/manage` → `/marketplace/addresses`.
 *
 * This route held a second, parallel address book that talked to nothing. It
 * seeded its list with two literal addresses belonging to an invented
 * "Rahul Sharma" — full street address and phone number — shown to every signed
 * -in customer as though they were their own saved addresses, and its add /
 * delete / set-default buttons only mutated component state, so anything typed
 * here vanished on reload and never reached the account.
 *
 * `/marketplace/addresses` already does this properly against
 * `getUserAddresses` / `addUserAddress` / `updateUserAddress` /
 * `deleteUserAddress`, so this path redirects there rather than maintaining a
 * duplicate. Nothing in the app linked here; the redirect exists for bookmarks.
 */
export default function ManageAddressesPage() {
  // Zone-relative — see the note in product/[id]/page.tsx: redirect() gets
  // basePath prepended just like next/link does.
  redirect('/addresses');
}
