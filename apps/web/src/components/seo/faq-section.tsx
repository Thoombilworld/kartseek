'use client';

/// KARTSEEK — SEO FAQ Section Component
/// Renders collapsible FAQ blocks optimized for:
/// - Google Featured Snippets
/// - Google AI Overview
/// - Voice Search (voice assistants)
/// - ChatGPT, Gemini, Perplexity, Claude knowledge extraction
///
/// Uses native <details>/<summary> for built-in accessibility.
/// Includes JSON-LD FAQPage schema automatically.

import React from 'react';
import { JsonLd } from './json-ld';
import { faqSchema } from '@/lib/seo/schema';
import styles from './faq-section.module.css';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  title?: string;
  items: FaqItem[];
  id?: string;
}

export function FaqSection({ title = 'Frequently Asked Questions', items, id = 'faq' }: FaqSectionProps) {
  return (
    <section className={styles.section} id={id} aria-labelledby={`${id}-heading`}>
      {/* JSON-LD Schema for AI and search engines */}
      <JsonLd data={faqSchema(items)} />

      <h2 className={styles.heading} id={`${id}-heading`}>{title}</h2>

      <div className={styles.list}>
        {items.map((item, i) => (
          <details key={i} className={styles.item}>
            <summary className={styles.question} title={item.question}>
              <span>{item.question}</span>
              <svg
                className={styles.chevron}
                width="20" height="20" viewBox="0 0 20 20" fill="none"
                stroke="currentColor" strokeWidth="2"
                aria-hidden="true"
              >
                <polyline points="6 8 10 12 14 8" />
              </svg>
            </summary>
            <div className={styles.answer}>
              <p>{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default FaqSection;
