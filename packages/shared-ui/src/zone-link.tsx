import React from 'react';

/**
 * A link that leaves the current micro-frontend.
 *
 * Each zone is its own Next.js application with a `basePath`, and Next prepends
 * that basePath to every `next/link` href. Inside the pharmacy zone,
 * `<Link href="/support">` therefore renders `/pharmacy/support` — a route that
 * does not exist in either application. The same applies to any link pointing
 * at a *different* zone: `<Link href="/grocery">` becomes `/pharmacy/grocery`.
 *
 * Crossing a zone boundary is a document request regardless — the target is a
 * separately built and deployed application, so there is no client-side
 * transition to preserve. A plain anchor is both correct and honest about that,
 * and anchors are never rewritten by basePath.
 *
 * Use `next/link` for destinations inside the same zone (written without the
 * zone prefix, which basePath adds); use this for everything else.
 */
export function ZoneLink({
  href,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

export default ZoneLink;
