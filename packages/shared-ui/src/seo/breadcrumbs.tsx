'use client';

/// KARTSEEK — SEO Breadcrumb Navigation Component
/// Renders semantic breadcrumbs with JSON-LD BreadcrumbList schema.
/// Used across all page types for navigation and search engine linking.

import React from 'react';
import Link from 'next/link';
import { JsonLd } from './json-ld';
import { type BreadcrumbItem } from '@/lib/seo/metadata';
import { breadcrumbSchema as breadcrumbJsonLd } from '@/lib/seo/schema';
import styles from './breadcrumbs.module.css';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const fullItems = [{ name: 'Home', url: '/' }, ...items];

  return (
    <nav className={styles.nav} aria-label="Breadcrumb">
      <JsonLd data={breadcrumbJsonLd(fullItems)} />
      <ol className={styles.list}>
        {fullItems.map((item, i) => {
          const isLast = i === fullItems.length - 1;
          return (
            <li key={i} className={styles.item}>
              {!isLast ? (
                <>
                  <Link href={item.url} className={styles.link}>{item.name}</Link>
                  <span className={styles.separator} aria-hidden="true">›</span>
                </>
              ) : (
                <span className={styles.current} aria-current="page">{item.name}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
