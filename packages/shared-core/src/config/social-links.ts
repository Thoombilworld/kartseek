/**
 * The company's social profiles, in one place.
 *
 * These URLs already existed in `lib/seo/schema.ts` as the Organization
 * schema's `sameAs` list, where search engines could read them — but the footer
 * rendered its icons with `href="#"`, so the links a customer could actually
 * click went nowhere. Clicking one jumps to the top of the page, which reads as
 * a broken site. Both consumers now share this list, so they cannot drift.
 *
 * A platform with no presence on a network should be omitted here rather than
 * given a placeholder: `renderable` filters the list, and the footer renders
 * nothing at all rather than a dead icon.
 */

export interface SocialLink {
  /** Key used to pick the icon and the accessible label. */
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'youtube';
  label: string;
  url: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { platform: 'twitter',   label: 'Twitter',   url: 'https://twitter.com/kartseekapp' },
  { platform: 'facebook',  label: 'Facebook',  url: 'https://facebook.com/kartseek' },
  { platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/kartseek' },
  { platform: 'linkedin',  label: 'LinkedIn',  url: 'https://linkedin.com/company/kartseek' },
];

/** Just the URLs, for the Organization schema's `sameAs`. */
export const SOCIAL_URLS = SOCIAL_LINKS.map((s) => s.url);
