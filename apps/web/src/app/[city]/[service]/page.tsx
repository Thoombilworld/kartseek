/// KARTSEEK — Dynamic City Landing Page
/// Local SEO pages for /{city}/{service}
/// Examples: /doha/restaurants, /mumbai/pharmacies, /dubai/doctors

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cityMeta } from '@/lib/seo/metadata';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, faqSchema } from '@/lib/seo/schema';
import { FaqSection } from '@/components/seo/faq-section';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import {
  generateRestaurantFaqs, generateDoctorFaqs, generatePharmacyFaqs,
  generateGroceryFaqs, generateTaxiFaqs, generateServiceHub,
} from '@/lib/seo/aeo-geo';
// Shared with `sitemap.ts`, which publishes one URL per city × service.
import { CITY_COUNTRY } from '@/lib/seo/city-registry';
import styles from './page.module.css';

// ─── Params ─────────────────────────────────────────────────────────────────

interface CityPageProps {
  params: Promise<{ city: string; service: string }>;
}

// ─── City & Country Registry ────────────────────────────────────────────────

const SERVICE_MAP: Record<string, { label: string; icon: string; route: string; faqGen: any }> = {
  restaurants: { label: 'Restaurants', icon: '🍔', route: '/restaurant', faqGen: generateRestaurantFaqs },
  pharmacies: { label: 'Pharmacies', icon: '💊', route: '/pharmacy', faqGen: generatePharmacyFaqs },
  doctors: { label: 'Doctors', icon: '🏥', route: '/doctor', faqGen: generateDoctorFaqs },
  taxi: { label: 'Taxi Booking', icon: '🚕', route: '/taxi', faqGen: generateTaxiFaqs },
  'grocery-stores': { label: 'Grocery Stores', icon: '🛒', route: '/grocery', faqGen: generateGroceryFaqs },
};

function toTitle(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Generate Metadata ──────────────────────────────────────────────────────

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city, service } = await params;
  const info = CITY_COUNTRY[city];
  if (!info || !SERVICE_MAP[service]) {
    return { title: 'Page not found', robots: { index: false, follow: true } };
  }
  return cityMeta(toTitle(city), service, info.code);
}

// ─── Static Params ──────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const params: { city: string; service: string }[] = [];
  const services = Object.keys(SERVICE_MAP);

  Object.keys(CITY_COUNTRY).forEach(city => {
    services.forEach(service => {
      params.push({ city, service });
    });
  });

  return params;
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function CityServicePage({ params }: CityPageProps) {
  const { city, service } = await params;

  // Anything outside the two registries is not a page we can honestly render.
  // The fallbacks that used to stand here — `{ country: 'Qatar' }` and a
  // service config built from the raw slug — meant `/houston/restaurants`
  // returned 200 and presented Houston as a Qatari city, with generated FAQs
  // and local-business markup asserting it. Every unknown slug produced one.
  const info = CITY_COUNTRY[city];
  const serviceConfig = SERVICE_MAP[service];
  if (!info || !serviceConfig) notFound();

  const cityName = toTitle(city);

  const faqs = serviceConfig.faqGen(cityName, info.country);
  const contentHub = generateServiceHub(
    service === 'grocery-stores' ? 'grocery' : (service === 'restaurants' ? 'restaurant' : service),
    cityName, info.country
  );

  return (
    <main id="main-content" className={styles.page}>
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { name: info.country, url: `/${info.code.toLowerCase()}` },
        { name: cityName, url: `/${city}` },
        { name: serviceConfig.label, url: `/${city}/${service}` },
      ]} />

      {/* H1 — Primary keyword target */}
      <h1 className={styles.title}>
        {serviceConfig.icon} {serviceConfig.label} in {cityName}, {info.country}
      </h1>

      <p className={styles.subtitle}>
        {service === 'restaurants' && `Discover the best restaurants in ${cityName}. Order food delivery, dine-in, or takeaway from hundreds of verified restaurants on KARTSEEK.`}
        {service === 'pharmacies' && `Find pharmacies near you in ${cityName}. Order medicines online, upload prescriptions, and get fast delivery from verified pharmacies.`}
        {service === 'doctors' && `Book doctor appointments in ${cityName}. Browse specialists, read reviews, and schedule in-person or online consultations.`}
        {service === 'taxi' && `Book a taxi in ${cityName}. Economy, premium, and SUV rides with transparent pricing and real-time driver tracking.`}
        {service === 'grocery-stores' && `Shop groceries online in ${cityName}. Fresh produce, daily essentials, and more delivered from local stores in under 60 minutes.`}
      </p>

      {/* Quick action link */}
      <Link href={serviceConfig.route} className={styles.ctaButton}>
        {serviceConfig.icon} Browse {serviceConfig.label} →
      </Link>

      {/* AI-Friendly Content Hub */}
      {contentHub.length > 0 && (
        <section className={styles.hubSection}>
          {contentHub.map((section, i) => (
            <article key={i} className={styles.hubArticle}>
              <h2 className={styles.hubHeading}>
                {section.heading}
              </h2>
              <p className={styles.hubContent}>
                {section.content}
              </p>
            </article>
          ))}
        </section>
      )}

      {/* FAQ Section — AEO optimized */}
      {faqs.length > 0 && (
        <FaqSection
          title={`${serviceConfig.label} in ${cityName} — FAQs`}
          items={faqs}
          id={`${city}-${service}-faq`}
        />
      )}

      {/* Other services in this city */}
      <section className={styles.moreSection}>
        <h2 className={styles.moreHeading}>
          More Services in {cityName}
        </h2>
        <div className={styles.moreLinks}>
          {Object.entries(SERVICE_MAP).map(([key, svc]) => (
            key !== service && (
              <Link key={key} href={`/${city}/${key}`} className={styles.serviceLink}>
                {svc.icon} {svc.label}
              </Link>
            )
          ))}
        </div>
      </section>
    </main>
  );
}
