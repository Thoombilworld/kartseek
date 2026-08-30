// apps/web/src/lib/mock/marketplace.ts
// Mock product data for development without a backend API

export interface MockProduct {
  id: string;
  title: string;
  shortDescription: string;
  mrp: number;
  averageRating: number;
  reviewCount: number;
  category: { id: string; name: string };
  brand: { id: string; name: string };
  listing: {
    sellingPrice: number;
    seller: {
      id: string;
      businessName: string;
      sellerRating: number;
    };
  };
  metadata: {
    imageGalleryUrls: string[];
    richDescriptionHtml: string;
    specifications: {
      groupName: string;
      attributes: { key: string; value: string }[];
    }[];
    variantDimensions: {
      variantName: string;
      variantOptions: string[];
    }[];
  };
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'prod-apple-15',
    title: 'iPhone 15 Pro (256GB) - Titanium Blue',
    shortDescription: 'Experience the ultimate smartphone with the A17 Pro chip, a 48MP camera system, and titanium design.',
    mrp: 134900,
    averageRating: 4.9,
    reviewCount: 12400,
    category: { id: 'electronics', name: 'Electronics' },
    brand: { id: 'apple', name: 'Apple' },
    listing: {
      sellingPrice: 115900,
      seller: {
        id: 'seller-applebuzz',
        businessName: 'AppleBuzz Official Store',
        sellerRating: 4.9,
      },
    },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `
        <h3>iPhone 15 Pro - Titanium. So Strong. So Light. So Pro.</h3>
        <p>iPhone 15 Pro is the first iPhone to feature an aerospace-grade titanium design, using the same alloy that spacecraft use for missions to Mars. Titanium has one of the best strength-to-weight ratios of any metal, making these our lightest Pro models ever.</p>
        <h4>Key Features</h4>
        <ul>
          <li><strong>A17 Pro Chip</strong> — The most powerful chip ever in a smartphone, with a GPU that's up to 20% faster.</li>
          <li><strong>48MP Main Camera</strong> — Captures incredible detail with a quad-pixel sensor and next-generation portraits.</li>
          <li><strong>Action Button</strong> — A new, customizable button that gives quick access to your favorite features.</li>
          <li><strong>USB-C with USB 3</strong> — Speeds up to 10Gb/s for blazing-fast data transfer.</li>
          <li><strong>Titanium Design</strong> — Incredibly durable, yet remarkably light. Available in four stunning finishes.</li>
        </ul>
      `,
      specifications: [
        {
          groupName: 'General',
          attributes: [
            { key: 'Brand', value: 'Apple' },
            { key: 'Model', value: 'iPhone 15 Pro' },
            { key: 'SIM Type', value: 'Nano SIM + eSIM' },
            { key: 'Release Year', value: '2023' },
          ],
        },
        {
          groupName: 'Display',
          attributes: [
            { key: 'Screen Size', value: '6.1 inches' },
            { key: 'Resolution', value: '2556 x 1179 pixels' },
            { key: 'Display Type', value: 'Super Retina XDR OLED, ProMotion 120Hz' },
            { key: 'Peak Brightness', value: '2000 nits (outdoor)' },
          ],
        },
        {
          groupName: 'Performance',
          attributes: [
            { key: 'Processor', value: 'A17 Pro (3nm)' },
            { key: 'RAM', value: '8 GB' },
            { key: 'Storage', value: '256 GB' },
          ],
        },
        {
          groupName: 'Camera',
          attributes: [
            { key: 'Rear Camera', value: '48MP + 12MP + 12MP' },
            { key: 'Front Camera', value: '12MP TrueDepth' },
            { key: 'Video Recording', value: '4K @ 60fps, ProRes, Cinematic Mode' },
          ],
        },
        {
          groupName: 'Battery & Connectivity',
          attributes: [
            { key: 'Battery Life', value: 'Up to 23 hours video playback' },
            { key: 'Charging', value: 'USB-C, MagSafe, Qi2 Wireless' },
            { key: '5G', value: 'Sub-6 GHz + mmWave' },
            { key: 'Wi-Fi', value: 'Wi-Fi 6E' },
          ],
        },
      ],
      variantDimensions: [
        {
          variantName: 'Color',
          variantOptions: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
        },
        {
          variantName: 'Storage',
          variantOptions: ['128 GB', '256 GB', '512 GB', '1 TB'],
        },
      ],
    },
  },
  {
    id: 'prod-dell-xps',
    title: 'Dell XPS 13 Plus (16GB RAM, 512GB SSD)',
    shortDescription: 'A futuristic ultrabook with an edge-to-edge keyboard and stunning InfinityEdge display.',
    mrp: 160000,
    averageRating: 4.7,
    reviewCount: 892,
    category: { id: 'electronics', name: 'Electronics' },
    brand: { id: 'dell', name: 'Dell' },
    listing: {
      sellingPrice: 145000,
      seller: {
        id: 'seller-dellstore',
        businessName: 'Dell Official India',
        sellerRating: 4.8,
      },
    },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `
        <h3>Dell XPS 13 Plus — Redefining the Future of Laptops</h3>
        <p>The Dell XPS 13 Plus pushes the boundaries of innovation with its seamlessly integrated edge-to-edge keyboard, haptic touchpad, and a capacitive touch function row that replaces traditional keys. Every detail has been refined for a futuristic computing experience.</p>
        <h4>Key Features</h4>
        <ul>
          <li><strong>13th Gen Intel Core</strong> — Powered by up to Intel Core i7-1360P for powerful multitasking.</li>
          <li><strong>13.4" InfinityEdge Display</strong> — Available in FHD+ or 3.5K OLED with 100% DCI-P3 color.</li>
          <li><strong>Edge-to-Edge Keyboard</strong> — Seamlessly integrated, zero-lattice design for a sleek profile.</li>
          <li><strong>Compact & Light</strong> — Weighing just 1.23 kg with a stunning CNC-machined aluminium chassis.</li>
          <li><strong>Thunderbolt 4</strong> — Two Thunderbolt 4 ports for blazing-fast data and display connectivity.</li>
        </ul>
      `,
      specifications: [
        {
          groupName: 'General',
          attributes: [
            { key: 'Brand', value: 'Dell' },
            { key: 'Model', value: 'XPS 13 Plus 9320' },
            { key: 'Operating System', value: 'Windows 11 Home' },
            { key: 'Weight', value: '1.23 kg' },
          ],
        },
        {
          groupName: 'Display',
          attributes: [
            { key: 'Screen Size', value: '13.4 inches' },
            { key: 'Resolution', value: '1920 x 1200 (FHD+)' },
            { key: 'Panel Type', value: 'IPS, Anti-Reflective' },
            { key: 'Touch', value: 'Optional' },
          ],
        },
        {
          groupName: 'Performance',
          attributes: [
            { key: 'Processor', value: 'Intel Core i7-1360P' },
            { key: 'RAM', value: '16 GB LPDDR5' },
            { key: 'Storage', value: '512 GB M.2 NVMe SSD' },
            { key: 'Graphics', value: 'Intel Iris Xe' },
          ],
        },
        {
          groupName: 'Connectivity',
          attributes: [
            { key: 'Ports', value: '2x Thunderbolt 4 (USB-C)' },
            { key: 'Wi-Fi', value: 'Wi-Fi 6E (AX211)' },
            { key: 'Bluetooth', value: '5.3' },
          ],
        },
        {
          groupName: 'Battery',
          attributes: [
            { key: 'Battery Capacity', value: '55 Whr' },
            { key: 'Battery Life', value: 'Up to 13 hours' },
            { key: 'Charging', value: '60W USB-C' },
          ],
        },
      ],
      variantDimensions: [
        {
          variantName: 'Color',
          variantOptions: ['Platinum Silver', 'Graphite'],
        },
        {
          variantName: 'Configuration',
          variantOptions: ['i5 / 8GB / 256GB', 'i7 / 16GB / 512GB', 'i7 / 32GB / 1TB'],
        },
      ],
    },
  },
  {
    id: 'prod-sony-wh1000',
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    shortDescription: 'Industry-leading noise cancellation with 30-hour battery and crystal-clear hands-free calling.',
    mrp: 34990,
    averageRating: 4.8,
    reviewCount: 8200,
    category: { id: 'electronics', name: 'Electronics' },
    brand: { id: 'sony', name: 'Sony' },
    listing: { sellingPrice: 24990, seller: { id: 'seller-applebuzz', businessName: 'SonyAudio Official', sellerRating: 4.8 } },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `<h3>Sony WH-1000XM5 — The Gold Standard in ANC</h3><p>Experience industry-leading noise cancellation powered by two processors and eight microphones. The WH-1000XM5 features a newly developed driver unit with a 30mm dome for extraordinarily clear sound.</p><ul><li><strong>Industry-leading ANC</strong> — Two chips + eight mics for best-in-class noise cancellation.</li><li><strong>30-Hour Battery</strong> — All-day listening with quick charge (3 min = 3 hrs).</li><li><strong>Crystal-clear calls</strong> — Four beamforming mics precisely capture your voice.</li><li><strong>Multipoint connection</strong> — Seamlessly switch between two Bluetooth devices.</li></ul>`,
      specifications: [
        { groupName: 'Audio', attributes: [{ key: 'Driver Size', value: '30mm' }, { key: 'Frequency Response', value: '4 Hz – 40,000 Hz' }, { key: 'Impedance', value: '48 Ω' }] },
        { groupName: 'Connectivity', attributes: [{ key: 'Bluetooth', value: '5.2' }, { key: 'Codec Support', value: 'LDAC, AAC, SBC' }, { key: 'Multipoint', value: 'Yes (2 devices)' }] },
        { groupName: 'Battery', attributes: [{ key: 'Battery Life', value: '30 hours (ANC on)' }, { key: 'Quick Charge', value: '3 min = 3 hours' }, { key: 'Charging', value: 'USB-C' }] },
      ],
      variantDimensions: [{ variantName: 'Color', variantOptions: ['Black', 'Silver'] }],
    },
  },
  {
    id: 'prod-macbook-air',
    title: 'MacBook Air M3 (8GB RAM, 256GB SSD)',
    shortDescription: 'Supercharged by M3 chip. Up to 18 hours battery. Fanless, silent design.',
    mrp: 119900,
    averageRating: 4.8,
    reviewCount: 3200,
    category: { id: 'electronics', name: 'Electronics' },
    brand: { id: 'apple', name: 'Apple' },
    listing: { sellingPrice: 114900, seller: { id: 'seller-applebuzz', businessName: 'AppleBuzz Official Store', sellerRating: 4.9 } },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `<h3>MacBook Air M3 — Impossibly Thin. Incredibly Powerful.</h3><p>The MacBook Air M3 is powered by the Apple M3 chip, bringing a new level of performance to the world's most popular laptop. With up to 18 hours of battery life and an all-new fanless design, it's completely silent in operation.</p><ul><li><strong>Apple M3 Chip</strong> — 8-core CPU, 10-core GPU, 16-core Neural Engine.</li><li><strong>Liquid Retina Display</strong> — 13.6-inch, 2560×1664, 500 nits brightness.</li><li><strong>18-Hour Battery</strong> — All-day and beyond battery life.</li><li><strong>MagSafe Charging</strong> — Comes back faster than ever.</li></ul>`,
      specifications: [
        { groupName: 'Performance', attributes: [{ key: 'Chip', value: 'Apple M3' }, { key: 'CPU Cores', value: '8-core' }, { key: 'GPU Cores', value: '10-core' }, { key: 'RAM', value: '8 GB' }, { key: 'Storage', value: '256 GB SSD' }] },
        { groupName: 'Display', attributes: [{ key: 'Screen Size', value: '13.6 inches' }, { key: 'Resolution', value: '2560 x 1664' }, { key: 'Brightness', value: '500 nits' }] },
        { groupName: 'Battery', attributes: [{ key: 'Battery Life', value: 'Up to 18 hours' }, { key: 'Charging', value: '35W MagSafe 3 / USB-C' }] },
      ],
      variantDimensions: [
        { variantName: 'Color', variantOptions: ['Midnight', 'Starlight', 'Space Gray', 'Sky Blue'] },
        { variantName: 'Storage', variantOptions: ['256 GB', '512 GB', '1 TB', '2 TB'] },
      ],
    },
  },
  {
    id: 'prod-airpods-pro',
    title: 'Apple AirPods Pro 2nd Gen (USB-C)',
    shortDescription: 'Active Noise Cancellation, Adaptive Audio, and up to 30 hours total listening.',
    mrp: 24900,
    averageRating: 4.7,
    reviewCount: 15000,
    category: { id: 'electronics', name: 'Electronics' },
    brand: { id: 'apple', name: 'Apple' },
    listing: { sellingPrice: 20900, seller: { id: 'seller-applebuzz', businessName: 'AppleBuzz Official Store', sellerRating: 4.9 } },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `<h3>AirPods Pro — Personalized Spatial Audio. Next-level ANC.</h3><p>AirPods Pro 2nd generation deliver up to 2x more Active Noise Cancellation than the previous generation, plus Adaptive Audio that seamlessly blends ANC and Transparency mode.</p><ul><li><strong>Active Noise Cancellation</strong> — Up to 2x more powerful than AirPods Pro 1st gen.</li><li><strong>Adaptive Audio</strong> — New mode that dynamically blends ANC and Transparency.</li><li><strong>Personalised Spatial Audio</strong> — Sound that surrounds you with head tracking.</li><li><strong>30-Hour Battery</strong> — 6 hours in earbuds + 24 from the case.</li></ul>`,
      specifications: [
        { groupName: 'Audio', attributes: [{ key: 'Chip', value: 'Apple H2' }, { key: 'ANC', value: 'Yes (Adaptive)' }, { key: 'Spatial Audio', value: 'Yes (Head Tracking)' }] },
        { groupName: 'Battery', attributes: [{ key: 'Earbud Battery', value: 'Up to 6 hours' }, { key: 'Case Battery', value: 'Up to 24 additional hours' }, { key: 'Charging', value: 'USB-C / MagSafe / Qi' }] },
        { groupName: 'Connectivity', attributes: [{ key: 'Bluetooth', value: '5.3' }, { key: 'Chip', value: 'H2' }, { key: 'Water Resistance', value: 'IPX4' }] },
      ],
      variantDimensions: [],
    },
  },
  {
    id: 'prod-nike-air-max',
    title: 'Nike Air Max 270 React – Black/White',
    shortDescription: 'Nike\'s biggest heel Air unit yet for all-day comfort. Max cushioning meets minimal style.',
    mrp: 15995,
    averageRating: 4.6,
    reviewCount: 7200,
    category: { id: 'fashion', name: 'Fashion' },
    brand: { id: 'nike', name: 'Nike' },
    listing: { sellingPrice: 11995, seller: { id: 'seller-nikezone', businessName: 'Nike Zone Official', sellerRating: 4.7 } },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `<h3>Nike Air Max 270 React — Maximum Comfort, Maximum Style</h3><p>The Nike Air Max 270 React combines Nike's biggest-ever heel Air unit with React foam for a shoe that's as comfortable as it is striking. The result is a plush, bouncy ride that keeps you comfortable all day long.</p><ul><li><strong>Air Max 270 Unit</strong> — Nike's biggest heel Air unit yet, providing ultimate cushioning.</li><li><strong>React Foam</strong> — Soft, springy foam that's incredibly lightweight and durable.</li><li><strong>Mesh Upper</strong> — Breathable mesh keeps your feet cool and comfortable.</li></ul>`,
      specifications: [
        { groupName: 'General', attributes: [{ key: 'Brand', value: 'Nike' }, { key: 'Type', value: 'Lifestyle / Casual' }, { key: 'Closure', value: 'Lace-up' }] },
        { groupName: 'Materials', attributes: [{ key: 'Upper', value: 'Mesh + Synthetic Overlays' }, { key: 'Sole', value: 'Air Max 270 + React Foam' }, { key: 'Lining', value: 'Textile' }] },
      ],
      variantDimensions: [
        { variantName: 'Size (UK)', variantOptions: ['6', '7', '8', '9', '10', '11', '12'] },
        { variantName: 'Color', variantOptions: ['Black/White', 'White/Red', 'All Black'] },
      ],
    },
  },
  {
    id: 'prod-dyson-v12',
    title: 'Dyson V12 Detect Slim Cordless Vacuum',
    shortDescription: 'Laser reveals invisible dust. Auto-adjusting suction. 60 min run time.',
    mrp: 52900,
    averageRating: 4.7,
    reviewCount: 2100,
    category: { id: 'home-kitchen', name: 'Home & Kitchen' },
    brand: { id: 'dyson', name: 'Dyson' },
    listing: { sellingPrice: 42900, seller: { id: 'seller-dysonin', businessName: 'Dyson India Official', sellerRating: 4.9 } },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `<h3>Dyson V12 Detect Slim — Reveals What Others Miss</h3><p>The built-in laser reveals microscopic dust invisible to the naked eye. The V12 Detect Slim automatically adapts suction power as it detects changes in floor type and dust levels.</p><ul><li><strong>Laser Dust Detection</strong> — Built-in laser reveals invisible dust particles.</li><li><strong>Auto-Adapt Suction</strong> — Intelligently increases suction power when more dust is detected.</li><li><strong>HEPA Filtration</strong> — Whole-machine filtration captures 99.97% of particles.</li><li><strong>60-Minute Runtime</strong> — In Eco mode for all-home cleaning.</li></ul>`,
      specifications: [
        { groupName: 'Performance', attributes: [{ key: 'Suction Power', value: '150 AW (Boost mode)' }, { key: 'Filtration', value: 'Whole-machine HEPA' }, { key: 'Bin Volume', value: '0.35 litres' }] },
        { groupName: 'Battery', attributes: [{ key: 'Runtime', value: 'Up to 60 min (Eco)' }, { key: 'Charge Time', value: '4.5 hours' }, { key: 'Battery Type', value: 'Nickel Manganese Cobalt' }] },
      ],
      variantDimensions: [{ variantName: 'Color', variantOptions: ['Nickel/Yellow', 'Absolute Extra'] }],
    },
  },
  {
    id: 'prod-samsung-s24',
    title: 'Samsung Galaxy S24 Ultra (12GB, 256GB)',
    shortDescription: 'Galaxy AI. Built-in S Pen. 200MP camera. Titanium frame.',
    mrp: 134999,
    averageRating: 4.6,
    reviewCount: 5100,
    category: { id: 'electronics', name: 'Electronics' },
    brand: { id: 'samsung', name: 'Samsung' },
    listing: { sellingPrice: 119999, seller: { id: 'seller-samsung-in', businessName: 'Samsung India Official', sellerRating: 4.8 } },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `<h3>Samsung Galaxy S24 Ultra — Galaxy AI is here</h3><p>The Galaxy S24 Ultra is Samsung's most powerful smartphone ever. With built-in Galaxy AI, a 200MP camera, and a titanium frame, it redefines what a smartphone can do.</p><ul><li><strong>Galaxy AI</strong> — Circle to Search, Live Translate, Chat Assist and more.</li><li><strong>200MP Camera</strong> — Capture every detail with the highest resolution Galaxy camera.</li><li><strong>Built-in S Pen</strong> — Write, draw, and create with precision.</li><li><strong>Titanium Frame</strong> — Aerospace-grade titanium for premium durability.</li></ul>`,
      specifications: [
        { groupName: 'Performance', attributes: [{ key: 'Processor', value: 'Snapdragon 8 Gen 3' }, { key: 'RAM', value: '12 GB' }, { key: 'Storage', value: '256 GB' }] },
        { groupName: 'Display', attributes: [{ key: 'Screen', value: '6.8" Dynamic AMOLED 2X' }, { key: 'Refresh Rate', value: '1-120Hz Adaptive' }, { key: 'Brightness', value: '2600 nits peak' }] },
        { groupName: 'Camera', attributes: [{ key: 'Main Camera', value: '200MP' }, { key: 'Front Camera', value: '12MP' }, { key: 'Zoom', value: '5x Optical + 100x Space Zoom' }] },
      ],
      variantDimensions: [
        { variantName: 'Color', variantOptions: ['Titanium Black', 'Titanium Grey', 'Titanium Violet', 'Titanium Yellow'] },
        { variantName: 'Storage', variantOptions: ['256 GB', '512 GB', '1 TB'] },
      ],
    },
  },
  {
    id: 'prod-levis-501',
    title: "Levi's 501 Original Fit Jeans – Dark Wash",
    shortDescription: "The original jean. Straight leg, button fly, and the most iconic silhouette in denim history.",
    mrp: 4999,
    averageRating: 4.4,
    reviewCount: 11000,
    category: { id: 'fashion', name: 'Fashion' },
    brand: { id: 'levis', name: "Levi's" },
    listing: { sellingPrice: 3499, seller: { id: 'seller-levisofficial', businessName: "Levi's Official Store", sellerRating: 4.6 } },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `<h3>Levi's 501 Original — The Original Jean Since 1873</h3><p>The 501 Original Fit Jeans are the most recognizable jeans in the world. Born in 1873, this classic straight leg jean features a button fly and sits at the waist for a timeless, versatile silhouette.</p><ul><li><strong>Original Fit</strong> — Straight leg that sits at the waist.</li><li><strong>Button Fly</strong> — The original closure since 1873.</li><li><strong>Premium Denim</strong> — Rigid denim that softens and molds to your body over time.</li></ul>`,
      specifications: [
        { groupName: 'Fit', attributes: [{ key: 'Fit Type', value: 'Original / Straight' }, { key: 'Rise', value: 'Mid-Rise' }, { key: 'Leg Opening', value: 'Straight' }] },
        { groupName: 'Material', attributes: [{ key: 'Fabric', value: '100% Cotton Denim' }, { key: 'Wash', value: 'Dark Wash (Stonewash)' }] },
      ],
      variantDimensions: [
        { variantName: 'Waist (inches)', variantOptions: ['28', '30', '32', '34', '36', '38'] },
        { variantName: 'Length (inches)', variantOptions: ['30', '32', '34'] },
      ],
    },
  },
  {
    id: 'prod-prestige-cooker',
    title: 'Prestige Svachh 5L Aluminium Pressure Cooker',
    shortDescription: 'Smart lid collects safety valves to prevent clogging. ISI certified. 5-year warranty.',
    mrp: 3050,
    averageRating: 4.5,
    reviewCount: 18000,
    category: { id: 'home-kitchen', name: 'Home & Kitchen' },
    brand: { id: 'prestige', name: 'Prestige' },
    listing: { sellingPrice: 2149, seller: { id: 'seller-prestige-official', businessName: 'Prestige Smart Kitchen', sellerRating: 4.7 } },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `<h3>Prestige Svachh — India's Smartest Pressure Cooker</h3><p>The Prestige Svachh pressure cooker features a revolutionary lid design that collects the safety valves, preventing food particles from clogging them. ISI certified for safety and backed by a 5-year warranty.</p><ul><li><strong>Svachh Lid</strong> — Unique lid that collects safety valves for clog-free cooking.</li><li><strong>ISI Certified</strong> — Meets strict Indian safety standards.</li><li><strong>5-Year Warranty</strong> — Industry-leading warranty from India's #1 kitchen brand.</li></ul>`,
      specifications: [
        { groupName: 'General', attributes: [{ key: 'Capacity', value: '5 Litres' }, { key: 'Material', value: 'Aluminium' }, { key: 'Certification', value: 'ISI Marked' }] },
        { groupName: 'Features', attributes: [{ key: 'Lid Type', value: 'Svachh (Valve-collecting)' }, { key: 'Warranty', value: '5 Years' }, { key: 'Induction Compatible', value: 'No' }] },
      ],
      variantDimensions: [{ variantName: 'Capacity', variantOptions: ['2L', '3L', '5L', '7L'] }],
    },
  },
];

/**
 * Finds a product by its ID from the mock data.
 * If no exact match exists, generates a dynamic mock product from the slug
 * so that links from seller/brand/category pages always resolve.
 */
export function getMockProductById(id: string): MockProduct | null {
  // First, check for an exact match in curated products
  const exact = MOCK_PRODUCTS.find((p) => p.id === id);
  if (exact) return exact;

  // Generate a dynamic mock product from any slug (e.g. "prod-seller-dellstore-0")
  // This ensures every product link in the app resolves to a working page
  const slugParts = id
    .replace(/^prod-/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const productName = slugParts.join(' ') || 'KARTSEEK Product';

  // Use the slug to generate a deterministic price (so it doesn't change on refresh)
  const hashCode = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const basePrice = 500 + ((hashCode * 137) % 9500);
  const mrp = Math.round(basePrice * 1.15);

  return {
    id,
    title: `${productName}`,
    shortDescription: `High-quality ${productName.toLowerCase()} available exclusively on KARTSEEK Mall. Premium quality guaranteed.`,
    mrp,
    averageRating: 3.5 + +((hashCode % 15) / 10).toFixed(1),
    reviewCount: 50 + (hashCode % 500),
    category: { id: 'general', name: 'General' },
    brand: { id: 'kartseek', name: 'KARTSEEK' },
    listing: {
      sellingPrice: basePrice,
      seller: {
        id: 'seller-kartseek',
        businessName: 'KARTSEEK Official Store',
        sellerRating: 4.5,
      },
    },
    metadata: {
      imageGalleryUrls: [],
      richDescriptionHtml: `
        <h3>${productName}</h3>
        <p>This is a premium product available on KARTSEEK Mall. Enjoy fast delivery, easy returns, and secure payments.</p>
        <ul>
          <li><strong>Quality Assured</strong> — Every product goes through rigorous quality checks.</li>
          <li><strong>Fast Delivery</strong> — Get it delivered in 2-5 business days.</li>
          <li><strong>Easy Returns</strong> — 7-day hassle-free return policy.</li>
        </ul>
      `,
      specifications: [
        {
          groupName: 'General',
          attributes: [
            { key: 'Product Name', value: productName },
            { key: 'SKU', value: id.toUpperCase() },
            { key: 'Availability', value: 'In Stock' },
          ],
        },
      ],
      variantDimensions: [],
    },
  };
}
