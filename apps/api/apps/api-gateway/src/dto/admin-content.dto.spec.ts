import { describe, it, expect } from 'vitest';
import { GatewayValidationPipe } from '../pipes/gateway-validation.pipe';
import { SavePageDto, SaveLayoutDto, SeoOverrideDto, BulkSeoDto } from './admin-content.dto';

/**
 * `SaveLayoutDto`/`LayoutSectionDto` and `SavePageDto` were built once and
 * never run through the pipe that actually gates a request —
 * `global-content-refusal.spec.ts` calls controller methods directly with
 * hand-built objects, so `ValidationPipe`/`forbidNonWhitelisted` never saw
 * them, and the DTOs shipped narrower than what the real, network-calling
 * admin console already sends on every save (review C1/C2). Every body below
 * is copied verbatim from the console file that sends it, run through the
 * gateway's own `GatewayValidationPipe` — same `whitelist`,
 * `forbidNonWhitelisted`, `transform`, `enableImplicitConversion` the real
 * request gets, not a bare `validate()` call.
 */

const pipe = new GatewayValidationPipe();

const run = (metatype: unknown, value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: metatype as never, data: undefined });

const rejectionOf = async (metatype: unknown, value: unknown): Promise<string[]> => {
  try {
    await run(metatype, value);
  } catch (err) {
    const body = (err as { getResponse(): unknown }).getResponse() as { message?: unknown };
    return Array.isArray(body?.message) ? (body.message as string[]) : [String(body?.message)];
  }
  throw new Error('expected the pipe to reject this body, and it did not');
};

describe('static pages: the real console body', () => {
  /**
   * `apps/web/src/app/admin/static-pages/[slug]/page.tsx`'s `handleSave`,
   * `saveData`, after review C2 removed `adminId` from it.
   */
  const REAL_BODY = {
    title: 'Privacy Policy',
    metaDescription: 'How KartSeek collects, uses, and protects your personal information.',
    heroGradient: 'from-blue-700 via-indigo-700 to-violet-700',
    heroIcon: 'Shield',
    sections: [
      {
        id: 'prv-1',
        title: '1. Information We Collect',
        order: 1,
        content: 'Personal Information: ...',
      },
      {
        id: 'prv-2',
        title: '2. How We Use Your Information',
        order: 2,
        content: 'Order Processing: ...',
      },
    ],
    isPublished: true,
  };

  it('is accepted as sent', async () => {
    const out = (await run(SavePageDto, REAL_BODY)) as SavePageDto;
    expect(out.title).toBe('Privacy Policy');
    expect(out.sections).toHaveLength(2);
  });

  it('refuses the adminId the console used to send (review C2)', async () => {
    expect(await rejectionOf(SavePageDto, { ...REAL_BODY, adminId: 'admin-user' })).toContain(
      'property adminId should not exist',
    );
  });
});

describe('page layouts: the real console bodies', () => {
  /**
   * `apps/web/src/app/admin/page-builder/page.tsx`'s `handleSave`, with a
   * section shaped by `apps/web/src/app/admin/page-builder/components/section-editor-modal.tsx`
   * (`viewAllHref`, `banners[]` with `headline/tag/cta/ctaHref/image/gradient`)
   * plus a bare `{id, type, title}` section — what `getLayout`'s own default
   * seeds round-trip through an untouched save.
   */
  const MARKETPLACE_BODY = {
    sections: [
      {
        id: 'sec-hero',
        type: 'hero_slider',
        title: 'Main Hero Slider',
        banners: [
          {
            id: 'bnr-1',
            headline: 'Big Billion Days',
            tag: 'SALE',
            cta: 'Shop Now',
            ctaHref: '/marketplace/deals',
            image: 'https://example.com/banner.png',
            gradient: 'from-blue-600 to-indigo-700',
          },
        ],
      },
      { id: 'sec-trust', type: 'trust_badges', title: 'Trust Badges' },
      {
        id: 'sec-shop',
        type: 'category_grid',
        title: 'Shop by Category',
        viewAllHref: '/marketplace/categories',
      },
    ],
  };

  /**
   * `apps/web/src/app/admin/grocery/page-builder/page.tsx`'s
   * `DEFAULT_HOMEPAGE_SECTIONS` — what `saveGroceryLayout` persists on an
   * unedited save, one section per real section `type`.
   */
  const GROCERY_BODY = {
    sections: [
      {
        id: 'sec-hero',
        type: 'hero_slider',
        title: 'Hero Banner Slider',
        visible: true,
        banners: [
          {
            id: 'b1',
            tag: 'FRESH',
            headline: 'Fresh Groceries\nDelivered Fast',
            subheadline: 'Order from 500+ stores near you',
            cta: 'Shop Now',
            ctaHref: '/grocery',
            gradient: 'from-green-600 to-emerald-700',
          },
        ],
      },
      {
        id: 'sec-promoted',
        type: 'promoted_stores',
        title: 'Sponsored Stores',
        subtitle: 'Featured partners',
        emoji: '👑',
        sectionTag: 'promoted',
        maxItems: 6,
        visible: true,
      },
      {
        id: 'sec-categories',
        type: 'category_grid',
        title: 'Shop by Category',
        emoji: '🛒',
        columns: 4,
        visible: true,
      },
      {
        id: 'sec-faq',
        type: 'faq',
        title: 'Frequently Asked Questions',
        emoji: '❓',
        visible: true,
        items: [{ q: 'How fast is delivery?', a: 'We offer express delivery in 10-30 minutes.' }],
      },
      {
        id: 'sec-seo',
        type: 'seo_footer',
        title: 'KARTSEEK Grocery — Order Groceries Online',
        visible: true,
        description: 'KARTSEEK Grocery is the easiest way to order groceries online.',
        tags: ['Grocery Delivery', 'Online Supermarket'],
      },
    ],
  };

  /**
   * `apps/web/src/app/admin/taxi/landing-editor/page.tsx`'s `handleSave`:
   * `{ sections: content }` where `content` is the full
   * `Record<CountryCode, CountryLandingContent>` state, seeded from
   * `DEFAULT_CONTENT` (never partial — every country is always present).
   * Structurally nothing like the two bodies above: an object keyed by
   * country code, not an array of sections.
   */
  const TAXI_BODY = {
    sections: {
      IN: {
        heroTitle: 'Launch Your Fleet Business in India',
        heroSub: 'Join 1,200+ fleet vendors earning with KARTSEEK across 50+ cities.',
        earningRange: '₹3,00,000 – ₹12,00,000/month',
        driverCount: '8,000+',
        payout: 'Bank Transfer + UPI',
        payoutFreq: 'Weekly (Mondays)',
        requirements: ['GST Registration', 'PAN Card', 'Business Registration Certificate'],
        documents: ['GST Certificate', 'PAN Card', 'Business Registration'],
        testimonialName: 'Rajesh Patel',
        testimonialQuote: 'Started with 5 autos. Now I manage 40 cabs and 12 autos.',
        testimonialFleet: 'SpeedCab India',
        testimonialRating: 4.8,
      },
      AE: {
        heroTitle: 'Start Your Fleet Business in the UAE',
        heroSub: 'Serve millions across Dubai, Abu Dhabi, Sharjah & more.',
        earningRange: 'AED 50,000 – 200,000/month',
        driverCount: '1,500+',
        payout: 'Bank Transfer',
        payoutFreq: 'Bi-weekly',
        requirements: ['RTA Fleet Operator Permit', 'Trade License'],
        documents: ['RTA Fleet Permit', 'Trade License'],
        testimonialName: 'Ahmed Al-Fahim',
        testimonialQuote: 'Managing a fleet in Dubai was challenging until KARTSEEK.',
        testimonialFleet: 'SafeRide UAE',
        testimonialRating: 4.7,
      },
      SA: {
        heroTitle: 'Launch Your Fleet Business in Saudi Arabia',
        heroSub: 'Serve Vision 2030 transportation demand across Riyadh, Jeddah & beyond.',
        earningRange: 'SAR 40,000 – 180,000/month',
        driverCount: '1,200+',
        payout: 'Bank Transfer',
        payoutFreq: 'Bi-weekly',
        requirements: ['TGA Transport License', 'Commercial Registration (CR)'],
        documents: ['TGA License', 'CR Certificate'],
        testimonialName: 'Fahad Al-Otaibi',
        testimonialQuote: 'KARTSEEK handles all our Saudi compliance needs.',
        testimonialFleet: 'Riyadh Express',
        testimonialRating: 4.8,
      },
      GB: {
        heroTitle: 'Start Your Fleet Business in the UK',
        heroSub: 'Join the growing private hire market across London, Manchester & 30+ cities.',
        earningRange: '£15,000 – £60,000/month',
        driverCount: '800+',
        payout: 'Bank Transfer',
        payoutFreq: 'Weekly',
        requirements: ['Private Hire Operator License', 'Companies House Registration'],
        documents: ['PHV Operator License', 'Companies House Certificate'],
        testimonialName: 'David Thompson',
        testimonialQuote: 'KARTSEEK understands UK transport regulations.',
        testimonialFleet: 'GreenCab London',
        testimonialRating: 4.6,
      },
    },
  };

  it('accepts the marketplace page-builder body, banners included', async () => {
    const out = (await run(SaveLayoutDto, MARKETPLACE_BODY)) as SaveLayoutDto;
    expect(out.sections).toHaveLength(3);
  });

  it('accepts the grocery page-builder body — every real section type at once', async () => {
    const out = (await run(SaveLayoutDto, GROCERY_BODY)) as SaveLayoutDto;
    expect(out.sections).toHaveLength(5);
  });

  it('accepts the taxi landing-editor body — a country-code map, not an array', async () => {
    const out = (await run(SaveLayoutDto, TAXI_BODY)) as SaveLayoutDto;
    expect(Array.isArray(out.sections)).toBe(false);
    expect(Object.keys(out.sections as object).sort()).toEqual(['AE', 'GB', 'IN', 'SA']);
  });

  it('still refuses more than 50 sections', async () => {
    const big = {
      sections: Array.from({ length: 51 }, (_, i) => ({ id: `s${i}`, type: 'hero_slider' })),
    };
    expect(await rejectionOf(SaveLayoutDto, big)).toContain(
      'a page layout may hold at most 50 sections',
    );
  });

  it('still refuses an unknown field inside a section', async () => {
    const bad = { sections: [{ id: 's1', type: 'hero_slider', notAField: 'x' }] };
    const messages = await rejectionOf(SaveLayoutDto, bad);
    expect(messages.join(' ')).toContain('property notAField should not exist');
  });

  it('still refuses an unknown country key in the landing-content map', async () => {
    const bad = { sections: { XX: { heroTitle: 'x' } } };
    const messages = await rejectionOf(SaveLayoutDto, bad);
    expect(messages.join(' ')).toContain('property XX should not exist');
  });
});

describe('seo overrides: a schema-conformant body', () => {
  /**
   * `apps/web/src/app/admin/seo/page.tsx`'s `saveOverride()` never calls the
   * network at all — it is pure client state (review I2, pre-existing, not
   * this round). There is therefore no real console body to capture for this
   * route family; this exercises the pipe against the shape `SeoOverrideDto`
   * itself documents, which is what any future caller (or a curl/Postman
   * probe) will send.
   */
  const REAL_BODY = {
    path: '/marketplace/product/iphone-17-pro',
    module: 'marketplace',
    metaTitle: 'iPhone 17 Pro',
  };

  it('is accepted as sent', async () => {
    const out = (await run(SeoOverrideDto, REAL_BODY)) as SeoOverrideDto;
    expect(out.path).toBe('/marketplace/product/iphone-17-pro');
  });

  it('bulk-update accepts an array of the same shape', async () => {
    const out = (await run(BulkSeoDto, { overrides: [REAL_BODY] })) as BulkSeoDto;
    expect(out.overrides).toHaveLength(1);
  });
});

describe('an undeclared field, on the route that used to accept one', () => {
  it('is a 400 naming the field, not a 200 that ignores it', async () => {
    expect(
      await rejectionOf(SeoOverrideDto, {
        path: '/x',
        module: 'marketplace',
        updatedBy: 'someone-else',
      }),
    ).toContain('property updatedBy should not exist');
  });
});
