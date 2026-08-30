/// KARTSEEK — JSON-LD Schema Injector Component
/// Renders structured data as <script type="application/ld+json"> in the DOM.
/// Use in any page component to inject schema markup.

import React from 'react';

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
}

/**
 * Renders JSON-LD structured data for SEO.
 *
 * @example
 * ```tsx
 * import { JsonLd } from '@/components/seo/json-ld';
 * import { productSchema, breadcrumbSchema } from '@/lib/seo';
 *
 * export default function ProductPage() {
 *   return (
 *     <>
 *       <JsonLd data={productSchema({ name: 'iPhone', ... })} />
 *       <JsonLd data={breadcrumbSchema([{ name: 'Home', url: '/' }, ...])} />
 *       <div>...page content...</div>
 *     </>
 *   );
 * }
 * ```
 */
export function JsonLd({ data }: JsonLdProps) {
  const schemas = Array.isArray(data) ? data : [data];

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={`jsonld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

export default JsonLd;
