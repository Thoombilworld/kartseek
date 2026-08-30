import type { KeyboardEvent } from 'react';

/**
 * activateOnKey — makes a non-button element respond to Enter and Space.
 *
 * A `<div onClick={…}>` or `<tr onClick={…}>` is invisible to the keyboard: it
 * takes no focus and fires on no key. Across this app 114 controls were built
 * that way — mostly selectable cards in the admin console and expandable rows in
 * the seller and marketplace tables — so those screens could be operated with a
 * mouse and not at all otherwise.
 *
 * The real fix for a card is a `<button>`, and for a row a button inside a cell.
 * Retrofitting that would mean rewriting the markup and the styling of every
 * site; pairing the existing handler with `tabIndex` and this key handler is the
 * behaviour those elements should have had, applied without disturbing layout.
 *
 * Two details that matter:
 *
 *  • `e.target !== e.currentTarget` — rows and cards contain their own buttons
 *    and links. Without this guard, pressing Space on an inner "Approve" button
 *    would also toggle the row that contains it.
 *
 *  • Space is prevented, Enter is not required to be. Space scrolls the page by
 *    default, which is precisely what a user pressing it on a focused card does
 *    not want.
 */
export function activateOnKey(activate: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    // Let nested controls handle their own keystrokes.
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    activate();
  };
}

/**
 * Props for a non-interactive element that behaves as a button.
 *
 * Spread onto a `<div>`/`<span>` card or tile. Do NOT use on `<tr>` — see
 * `rowActivationProps`.
 */
export function buttonActivationProps(activate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: activateOnKey(activate),
  };
}

/**
 * Props for a clickable table row.
 *
 * Deliberately no `role="button"`: that would override the row's implicit `row`
 * role and a screen reader would stop announcing it as part of the table,
 * losing the column context that makes the data readable. A row stays a row —
 * it just becomes focusable and answers Enter/Space, which is what the ARIA
 * grid pattern prescribes.
 *
 * Pass `expanded` for rows that toggle a detail panel so the state is announced.
 */
export function rowActivationProps(activate: () => void, expanded?: boolean) {
  return {
    tabIndex: 0,
    onKeyDown: activateOnKey(activate),
    ...(expanded === undefined ? {} : { 'aria-expanded': expanded }),
  };
}
