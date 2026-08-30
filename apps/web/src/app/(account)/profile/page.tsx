import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isModuleKey, getModuleConfig } from '@/lib/modules/profiles';
import { ProfileHub } from './profile-hub';

export const metadata: Metadata = {
  title: 'Your profile | KARTSEEK',
  description: 'Your activity across every KARTSEEK service.',
  robots: { index: false, follow: false },
};

/**
 * The account hub — one card per service, each opening that module's own
 * profile section.
 *
 * `?module=` used to select which of seven hardcoded profile blobs to render
 * here. Each module now owns a real profile route tailored to what it does, so
 * the parameter survives only to forward the links that still carry it.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const { module } = await searchParams;
  if (isModuleKey(module)) redirect(getModuleConfig(module).profileHref);

  return <ProfileHub />;
}
