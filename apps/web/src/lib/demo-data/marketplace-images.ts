/**
 * Marketplace Image Assets
 *
 * Curated, high-quality image URLs for products, brands, and categories.
 * Uses Unsplash Source API for royalty-free, high-res product photography.
 *
 * URL pattern: https://images.unsplash.com/photo-{ID}?w={width}&q=80&fit=crop
 */

// ── Product Images ──────────────────────────────────────────────────────────
// Maps product ID → array of image URLs (first = primary)

export const PRODUCT_IMAGES: Record<string, string[]> = {
  // ── Electronics ──
  'prod-apple-15':     [
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1696446702183-cbd13d78e1e7?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600&q=80&fit=crop',
  ],
  'prod-macbook-air':  [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&q=80&fit=crop',
  ],
  'prod-ipad-pro':     [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=600&q=80&fit=crop',
  ],
  'prod-airpods-pro':  [
    'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&q=80&fit=crop',
  ],
  'prod-dell-xps':     [
    'https://images.unsplash.com/photo-1593642702749-b7d2a804fbcf?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80&fit=crop',
  ],
  'prod-sony-wh1000':  [
    'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80&fit=crop',
  ],
  'prod-samsung-s24':  [
    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80&fit=crop',
  ],
  'prod-samsung-tab':  [
    'https://images.unsplash.com/photo-1561154464-82e9aab73a65?w=600&q=80&fit=crop',
  ],
  'prod-jbl-flip6':    [
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80&fit=crop',
  ],
  'prod-oneplus-12':   [
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80&fit=crop',
  ],
  'prod-lg-oled':      [
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80&fit=crop',
  ],
  'prod-canon-r50':    [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80&fit=crop',
  ],
  'prod-dyson-airwrap': [
    'https://images.unsplash.com/photo-1522338242992-e1a54571a9f7?w=600&q=80&fit=crop',
  ],
  'prod-apple-watch':  [
    'https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=600&q=80&fit=crop',
  ],
  'prod-apple-pencil': [
    'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=600&q=80&fit=crop',
  ],
  'prod-apple-tv':     [
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80&fit=crop',
  ],
  'prod-homepod-mini': [
    'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=600&q=80&fit=crop',
  ],

  // ── Samsung extras ──
  'prod-samsung-buds':     ['https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600&q=80&fit=crop'],
  'prod-samsung-watch':    ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&q=80&fit=crop'],
  'prod-samsung-frame':    ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80&fit=crop'],
  'prod-samsung-flip5':    ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80&fit=crop'],
  'prod-samsung-soundbar': ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80&fit=crop'],
  'prod-samsung-washer':   ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80&fit=crop'],

  // ── Fashion / Footwear ──
  'prod-nike-air-max': [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80&fit=crop',
    'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&q=80&fit=crop',
  ],
  'prod-nike-dunk':    [
    'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=600&q=80&fit=crop',
  ],
  'prod-nike-pegasus': [
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80&fit=crop',
  ],
  'prod-nike-jordan':  [
    'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&q=80&fit=crop',
  ],
  'prod-nike-tshirt':  [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80&fit=crop',
  ],
  'prod-nike-shorts':  [
    'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&q=80&fit=crop',
  ],
  'prod-nike-bag':     [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80&fit=crop',
  ],
  'prod-nike-cap':     [
    'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600&q=80&fit=crop',
  ],
  'prod-levis-501':    [
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80&fit=crop',
  ],
  'prod-ray-ban':      [
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80&fit=crop',
  ],
  'prod-adidas-ultra': [
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80&fit=crop',
  ],
  'prod-zara-blazer':  [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80&fit=crop',
  ],
  'prod-hm-dress':     [
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80&fit=crop',
  ],
  'prod-puma-tshirt':  [
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80&fit=crop',
  ],
  'prod-woodland-boots': [
    'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&q=80&fit=crop',
  ],

  // ── Home & Kitchen ──
  'prod-dyson-v12':       ['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80&fit=crop'],
  'prod-prestige-cooker': ['https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80&fit=crop'],
  'prod-ikea-shelf':      ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80&fit=crop'],
  'prod-philips-airfryer':['https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80&fit=crop'],
  'prod-wipro-bulb':      ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80&fit=crop'],
  'prod-borosil-set':     ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80&fit=crop'],

  // ── Beauty & Personal Care ──
  'prod-loreal-serum':    ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80&fit=crop'],
  'prod-maybelline-fit':  ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80&fit=crop'],
  'prod-nivea-cream':     ['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80&fit=crop'],
  'prod-mamaearth-face':  ['https://images.unsplash.com/photo-1570194065650-d99fb4d8a609?w=600&q=80&fit=crop'],
  'prod-philips-trimmer': ['https://images.unsplash.com/photo-1621607512214-68297480165e?w=600&q=80&fit=crop'],
  'prod-bath-body-mist':  ['https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80&fit=crop'],

  // ── Sports & Fitness ──
  'prod-cult-dumbbell':    ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80&fit=crop'],
  'prod-domyos-yoga':      ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80&fit=crop'],
  'prod-yonex-racket':     ['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80&fit=crop'],
  'prod-sg-cricket-bat':   ['https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80&fit=crop'],
  'prod-nivia-football':   ['https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600&q=80&fit=crop'],
  'prod-cultsport-shoes':  ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80&fit=crop'],

  // ── Toys & Baby ──
  'prod-lego-technic':     ['https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=600&q=80&fit=crop'],
  'prod-funskool-puzzle':  ['https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=600&q=80&fit=crop'],
  'prod-hot-wheels':       ['https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&q=80&fit=crop'],
  'prod-chicco-stroller':  ['https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=600&q=80&fit=crop'],

  // ── Appliances ──
  'prod-daikin-ac':       ['https://images.unsplash.com/photo-1631545806609-22bcd4b1b4c4?w=600&q=80&fit=crop'],
  'prod-samsung-fridge':  ['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80&fit=crop'],
  'prod-lg-washer':       ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80&fit=crop'],
  'prod-bosch-dishwasher':['https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&q=80&fit=crop'],
};

// ── Brand Images ────────────────────────────────────────────────────────────
// Maps brand slug → logo URL and banner URL

export const BRAND_IMAGES: Record<string, { logo: string; banner: string }> = {
  apple:     { logo: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=1200&q=80&fit=crop' },
  samsung:   { logo: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=1200&q=80&fit=crop' },
  nike:      { logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1200&q=80&fit=crop' },
  sony:      { logo: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80&fit=crop' },
  adidas:    { logo: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1200&q=80&fit=crop' },
  dell:      { logo: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80&fit=crop' },
  dyson:     { logo: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80&fit=crop' },
  jbl:       { logo: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200&q=80&fit=crop' },
  puma:      { logo: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&q=80&fit=crop' },
  oneplus:   { logo: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80&fit=crop' },
  lg:        { logo: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1200&q=80&fit=crop' },
  canon:     { logo: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&q=80&fit=crop' },
  philips:   { logo: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=120&q=80&fit=crop', banner: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1200&q=80&fit=crop' },
};

// ── Category Images ─────────────────────────────────────────────────────────
// Maps category slug → lifestyle thumbnail

export const CATEGORY_IMAGES: Record<string, string> = {
  'mobiles-tablets':    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80&fit=crop',
  'electronics':       'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&q=80&fit=crop',
  'fashion':           'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80&fit=crop',
  'beauty':            'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80&fit=crop',
  'home-kitchen':      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80&fit=crop',
  'appliances':        'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80&fit=crop',
  'furniture':         'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80&fit=crop',
  'sports':            'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80&fit=crop',
  'books':             'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80&fit=crop',
  'toys-baby':         'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400&q=80&fit=crop',
  'automotive':        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=80&fit=crop',
  'health-wellness':   'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80&fit=crop',
  'watches':           'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80&fit=crop',
  'bags-travel':       'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80&fit=crop',
  'footwear':          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80&fit=crop',
  'computers':         'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80&fit=crop',
  'office-supplies':   'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400&q=80&fit=crop',
  'pet-supplies':      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80&fit=crop',
  'baby-care':         'https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=400&q=80&fit=crop',
  'grocery-essentials':'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80&fit=crop',
};

/**
 * Helper to get the primary image for a product.
 * Falls back to a gradient placeholder if no image is available.
 */
export function getProductImage(productId: string, index = 0): string {
  const images = PRODUCT_IMAGES[productId];
  if (images && images[index]) return images[index];
  if (images && images.length > 0) return images[0];
  return '';
}

/**
 * Helper to get brand logo or banner URL.
 */
export function getBrandImage(brandSlug: string, type: 'logo' | 'banner' = 'logo'): string {
  return BRAND_IMAGES[brandSlug]?.[type] ?? '';
}

/**
 * Helper to get category thumbnail.
 */
export function getCategoryImage(categorySlug: string): string {
  return CATEGORY_IMAGES[categorySlug] ?? '';
}
