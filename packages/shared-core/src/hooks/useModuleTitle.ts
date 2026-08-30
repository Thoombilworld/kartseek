'use client';

import { useEffect } from 'react';
import { getModuleTitleConfig, type ModuleKey } from '@/lib/config/module-titles';

/**
 * Hook to set a dynamic, admin-configurable page title for a module homepage.
 * Falls back to default titles when no admin override is configured.
 *
 * Usage in any client component:
 *   useModuleTitle('taxi');
 *   useModuleTitle('grocery');
 */
export function useModuleTitle(moduleKey: ModuleKey, subPageTitle?: string) {
  useEffect(() => {
    const config = getModuleTitleConfig(moduleKey);
    if (subPageTitle) {
      // Sub-page: use template
      document.title = config.titleTemplate.replace('%s', subPageTitle);
    } else {
      // Homepage: use main page title
      document.title = `${config.pageTitle} | KARTSEEK`;
    }

    // Also set meta description dynamically
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', config.metaDescription);

    // OG title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', subPageTitle ? `${subPageTitle} | KARTSEEK` : config.ogTitle);

    // OG description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', config.metaDescription);
  }, [moduleKey, subPageTitle]);
}
