import type { HomeFaq, TrustBadge } from './types';

/**
 * Editorial content for the marketplace home page: the trust strip and the FAQ.
 *
 * This is copy, not catalogue data. It lived in `demo-data/marketplace-home.ts`
 * beside the bundled demo products, so the storefront page had to import from
 * a demo module to render text it genuinely publishes — and a sweep for
 * fabricated content could not tell the two apart. Both arrays are
 * region-targeted (`regions` absent = every market) and filtered through
 * `forRegion` at render time, because an Indian GST invoice or PIN-code
 * delivery is a false statement on the Qatar storefront.
 *
 * Nothing here names a price, a discount or a campaign: those come from the
 * home feed, or not at all.
 */
export const TRUST_BADGES: TrustBadge[] = [
  // ── Qatar / Gulf ──
  {
    id: 'free-delivery-gulf',
    regions: ['QA', 'AE', 'SA', 'BH', 'KW', 'OM'],
    title: 'Free Delivery',
    subtitle: 'Free shipping above',
    thresholdAmount: 100,
    icon: 'Truck',
    color: 'text-blue-600',
  },
  {
    id: 'gulf-payments',
    regions: ['QA'],
    title: 'Cards & Himyan',
    subtitle: 'Himyan, NAPS, Visa & Mastercard',
    icon: 'ShieldCheck',
    color: 'text-emerald-600',
  },
  {
    id: 'gulf-cod',
    regions: ['QA', 'AE', 'SA', 'BH', 'KW', 'OM'],
    title: 'Cash on Delivery',
    subtitle: 'Pay the courier on arrival',
    icon: 'Headphones',
    color: 'text-purple-600',
  },
  {
    id: 'gulf-invoice',
    regions: ['QA', 'AE', 'SA', 'BH', 'KW', 'OM'],
    title: 'Tax Invoice',
    subtitle: 'Itemised invoice with every order',
    icon: 'BadgeCheck',
    color: 'text-teal-600',
  },

  // ── India ──
  {
    id: 'free-delivery-in',
    regions: ['IN'],
    title: 'Free Delivery',
    subtitle: 'Free shipping above',
    thresholdAmount: 499,
    icon: 'Truck',
    color: 'text-blue-600',
  },
  {
    id: 'upi-payment',
    regions: ['IN'],
    title: 'UPI & Cards',
    subtitle: 'GPay, PhonePe, Paytm & more',
    icon: 'ShieldCheck',
    color: 'text-emerald-600',
  },
  {
    id: 'cod-available',
    regions: ['IN'],
    title: 'Cash on Delivery',
    subtitle: 'Pay on delivery, India-wide',
    icon: 'Headphones',
    color: 'text-purple-600',
  },
  {
    id: 'gst-invoice',
    regions: ['IN'],
    title: 'GST Invoice',
    subtitle: 'Tax invoice for all orders',
    icon: 'BadgeCheck',
    color: 'text-teal-600',
  },

  // ── Everywhere ──
  {
    id: 'easy-returns',
    title: '10-Day Returns',
    subtitle: 'No questions asked returns',
    icon: 'RotateCcw',
    color: 'text-orange-600',
  },
];

export const MARKETPLACE_FAQ: HomeFaq[] = [
  // ── Qatar ──
  {
    regions: ['QA'],
    q: 'What is KARTSEEK Marketplace?',
    a: "KARTSEEK Marketplace is Qatar's multi-vendor e-commerce platform, where you can shop from trusted local sellers across 20+ categories including electronics, fashion, beauty and home. We deliver to every zone across all of Qatar's municipalities.",
  },
  {
    regions: ['QA'],
    q: 'How can I pay on KARTSEEK?',
    a: 'We accept Himyan and NAPS debit cards, Visa and Mastercard, Apple Pay, Google Pay, Ooredoo Money, bank transfer, your KARTSEEK Wallet, and cash on delivery.',
  },
  {
    regions: ['QA'],
    q: 'How do I enter my delivery address?',
    a: "Qatar uses the national Building / Street / Zone numbering issued by the Ministry of Municipality — there is no postal code. You can find all three numbers on your Kahramaa bill or through the Ministry's address search.",
  },
  {
    regions: ['QA'],
    q: 'Is VAT charged on my order?',
    a: 'No. Qatar does not currently levy VAT on retail goods, so the price you see is the price you pay. Your order confirmation serves as your receipt.',
  },
  {
    regions: ['QA'],
    q: 'How can I sell on KARTSEEK?',
    a: 'Register as a seller and provide your Commercial Registration (CR), trade licence, establishment card, owner QID and a bank account letter with your IBAN. Once verified, you can list products and start selling across Qatar.',
  },
  {
    regions: ['QA'],
    q: 'Is my payment safe?',
    a: "Yes. KARTSEEK is PCI DSS compliant and uses 256-bit SSL. Card details are handled by our licensed payment providers and never stored on our systems. Your personal data is protected under Qatar's Law No. (13) of 2016 on Personal Data Privacy Protection.",
  },

  // ── India ──
  {
    regions: ['IN'],
    q: 'What is KARTSEEK Marketplace?',
    a: "KARTSEEK Marketplace is India's premium multi-vendor e-commerce platform where you can shop from thousands of trusted sellers across 20+ categories including electronics, fashion, beauty, home, and more. We deliver to 26,000+ PIN codes across all 28 states and 8 union territories.",
  },
  {
    regions: ['IN'],
    q: 'How can I pay on KARTSEEK?',
    a: 'We accept all major Indian payment methods — UPI (GPay, PhonePe, Paytm, BHIM), Credit/Debit Cards, Net Banking, KARTSEEK Wallet, No Cost EMI, and Cash on Delivery (COD) at most PIN codes.',
  },
  {
    regions: ['IN'],
    q: 'How do I check if my PIN code is serviceable?',
    a: "Enter your 6-digit PIN code in the delivery checker on the homepage or product page. We'll instantly show you estimated delivery dates and available delivery partners for your area.",
  },
  {
    regions: ['IN'],
    q: 'How is GST applied on my orders?',
    a: 'GST is included in the displayed price for most products. Your GST invoice (with CGST + SGST breakdown) is automatically generated after every order and available in My Orders. B2B buyers can enter their GSTIN at checkout for ITC claims.',
  },
  {
    regions: ['IN'],
    q: 'How can I sell on KARTSEEK?',
    a: "Register as a seller at seller.kartseek.in. You'll need a valid GSTIN, PAN, and bank account for verification. Once approved, list your products and start selling to crores of buyers across India.",
  },
  {
    regions: ['IN'],
    q: 'Is my payment safe?',
    a: "Yes! KARTSEEK is PCI DSS compliant, uses 256-bit SSL, and is registered with RBI for payment aggregation. UPI transactions are secured by NPCI. Your data is protected under India's DPDP Act 2023.",
  },
  {
    regions: ['IN'],
    q: 'Does KARTSEEK offer EMI?',
    a: 'Yes! No Cost EMI is available on orders above ₹3,000 with leading banks including HDFC, SBI, ICICI, Axis, and Kotak. EMI plans of 3, 6, 9, and 12 months are available. Check your product page for eligible cards.',
  },
  {
    regions: ['IN'],
    q: 'What is the KARTSEEK Made in India section?',
    a: "Our Atmanirbhar Bharat section features products manufactured in India — from boAt headphones to Tata products. We display the 'Made in India' badge on all eligible products to help you support Indian brands.",
  },

  // ── Every market ──
  {
    q: 'What is the return policy on KARTSEEK?',
    a: 'Most products come with a 10-day hassle-free return policy. Electronics carry a 10-day replacement guarantee. Fashion items have 30-day returns. Just raise a return request through your order page.',
  },
  {
    q: 'How do I track my order?',
    a: 'Open the order from My Orders and select Track. You will see every shipment event and the estimated delivery window, shown in your own local time.',
  },
];
