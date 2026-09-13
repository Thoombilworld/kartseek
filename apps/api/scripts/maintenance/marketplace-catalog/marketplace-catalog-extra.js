/**
 * Marketplace catalog extension.
 *
 * The storefront advertises 20 top-level categories (they are baked into the
 * web app's bundled category grid), but the original seed only created 8 — so
 * 12 category tiles led to an empty page, and 13 subcategories of the 8 real
 * ones had no products either.
 *
 * Everything here is authored the other way round: a subcategory is only
 * declared when there are products to put in it. That invariant is what keeps
 * "every advertised view shows product cards" true — adding a subcategory
 * without products would recreate the very bug this fixes. `verifyCatalog()`
 * in the seed asserts it after loading.
 *
 * Slugs match the web app's `slugify()` output for the same labels, so the
 * storefront's offline fallback links resolve against these rows too. The one
 * exception is noted inline.
 */

const { randomUUID } = require('crypto');

// ── Brands ───────────────────────────────────────────────────────────────────
const EXTRA_BRANDS = [
  ['Anker', 'anker', 'Charge Fast, Live More'],
  ['Philips', 'philips', 'Innovation and You'],
  ['Tefal', 'tefal', 'Cook Better'],
  ['HP', 'hp', 'Keep Reinventing'],
  ['Lenovo', 'lenovo', 'Smarter Technology for All'],
  ['Fossil', 'fossil', 'Make Time for Style'],
  ['Casio', 'casio', 'Timekeeping Perfected'],
  ['Adidas', 'adidas', 'Impossible Is Nothing'],
  ["Levi's", 'levis', 'Quality Never Goes Out of Style'],
  ['Himalaya', 'himalaya', 'Wellness Through Ayurveda'],
  ['Dabur', 'dabur', 'Ayurvedic Since 1884'],
  ['Pedigree', 'pedigree', 'Feed the Good'],
  ['Whiskas', 'whiskas', 'Feed Their Curiosity'],
  ['Royal Canin', 'royal-canin', 'Tailored Nutrition'],
  ['Bosch', 'bosch', 'Invented for Life'],
  ['Al Alali', 'al-alali', 'Trusted in Every Kitchen'],
  ['Baladna', 'baladna', "Qatar's Own Dairy"],
  ["Kellogg's", 'kelloggs', 'Start Right'],
  ['Al Rifai', 'al-rifai', 'Roasted Since 1948'],
  ['Castrol', 'castrol', "It's More Than Just Oil"],
  ['3M', '3m', 'Science Applied to Life'],
  ['LS2', 'ls2', 'Ride Protected'],
  ["B'Twin", 'btwin', 'Cycling for Everyone'],
  ['Faber-Castell', 'faber-castell', 'Since 1761'],
  ['Deli', 'deli', 'Everyday Stationery'],
  ['Maped', 'maped', 'Ideas for School'],
  ['Delsey', 'delsey', 'Paris Since 1946'],
  ['American Tourister', 'american-tourister', 'Be a Tourister'],
  ['Samsonite', 'samsonite', 'Built to Travel'],
  ['Quechua', 'quechua', 'Made for the Outdoors'],
  ['Bata', 'bata', 'Comfort in Every Step'],
  ['Timberland', 'timberland', 'Best Then. Better Now.'],
  ["Johnson's", 'johnsons', 'Gentle Since 1894'],
  ['Nivea', 'nivea', 'Care for Skin'],
  ["L'Oréal Paris", 'loreal-paris', "Because You're Worth It"],
  ['Osram', 'osram', 'Light Is OSRAM'],
  ['Thermos', 'thermos', 'Hot Stays Hot'],
  ['Luminarc', 'luminarc', 'French Glassware Since 1948'],
  ['Home Centre', 'home-centre', 'Furnish Your Story'],
  ['Sealy', 'sealy', 'Sleep Better, Live Better'],
  ['IDdesign', 'iddesign', 'Danish Design for Living'],
  ['Splash', 'splash', 'Fashion for Everyone'],
  ['Al Motahajiba', 'al-motahajiba', 'Modest Elegance'],
  ['Penguin', 'penguin', 'Penguin Random House'],
  ['HarperCollins', 'harpercollins', 'Publishers Since 1817'],
  ['Oxford', 'oxford', 'Oxford University Press'],
  ['LEGO', 'lego', 'Build Beyond'],
  ['Chicco', 'chicco', "Where There's a Baby"],
  ['Funskool', 'funskool', 'Fun for Everyone'],
  ['Pampers', 'pampers', 'Love, Sleep & Play'],
  ['Nestle', 'nestle', 'Good Food, Good Life'],
  ['Omron', 'omron', 'Sensing the Future'],
  ['Optimum Nutrition', 'optimum-nutrition', 'Gold Standard'],
  ['Ray-Ban', 'rayban', 'Never Hide'],
  ['Logitech', 'logitech', 'Designed for Life'],
  ['Canon', 'canon', 'Delighting You Always'],
].map(([name, slug, description]) => ({ name, slug, description }));

// ── New top-level categories ────────────────────────────────────────────────
// Only subcategories that receive products below are declared here.
const EXTRA_CATEGORIES = [
  {
    name: 'Furniture',
    slug: 'furniture',
    icon: 'Sofa',
    subs: [
      ['Living Room', 'living-room'],
      ['Bedroom', 'bedroom'],
      ['Office Furniture', 'office-furniture'],
      ['Mattresses', 'mattresses'],
    ],
  },
  {
    name: 'Toys & Baby Products',
    slug: 'toys-baby',
    icon: 'Baby',
    subs: [
      ['Toys & Games', 'toys-and-games'],
      ['Baby Gear', 'baby-gear'],
      ['Diapers & Wipes', 'diapers-and-wipes'],
      ['Educational Toys', 'educational-toys'],
    ],
  },
  {
    name: 'Automotive Accessories',
    slug: 'automotive',
    icon: 'Car',
    subs: [
      ['Car Accessories', 'car-accessories'],
      ['Bike Accessories', 'bike-accessories'],
      ['Helmets', 'helmets'],
      ['Car Care', 'car-care'],
    ],
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    icon: 'Dumbbell',
    subs: [
      ['Vitamins & Supplements', 'vitamins-and-supplements'],
      ['Ayurvedic', 'ayurvedic'],
      ['Fitness Devices', 'fitness-devices'],
      ['Medical Devices', 'medical-devices'],
    ],
  },
  {
    name: 'Watches & Accessories',
    slug: 'watches',
    icon: 'Sparkles',
    subs: [
      ["Men's Watches", 'mens-watches'],
      ["Women's Watches", 'womens-watches'],
      ['Smartwatches', 'smartwatches'],
      ['Sunglasses', 'sunglasses'],
    ],
  },
  {
    name: 'Bags & Travel',
    slug: 'bags-travel',
    icon: 'ShoppingBasket',
    subs: [
      ['Backpacks', 'backpacks'],
      ['Handbags', 'handbags'],
      ['Luggage', 'luggage'],
      ['Laptop Bags', 'laptop-bags'],
    ],
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    icon: 'Shirt',
    subs: [
      ["Men's Casual", 'mens-casual'],
      ["Women's Flats", 'womens-flats'],
      ['Sports Shoes', 'sports-shoes'],
      ['Sandals & Slippers', 'sandals-and-slippers'],
    ],
  },
  {
    name: 'Computers & Accessories',
    slug: 'computers',
    icon: 'Laptop',
    subs: [
      ['Desktops', 'desktops'],
      ['Monitors', 'monitors'],
      ['Keyboards & Mice', 'keyboards-and-mice'],
      ['Printers', 'printers'],
    ],
  },
  {
    name: 'Office Supplies',
    slug: 'office-supplies',
    icon: 'BookOpen',
    subs: [
      ['Writing Instruments', 'writing-instruments'],
      ['Paper Products', 'paper-products'],
      ['Desk Accessories', 'desk-accessories'],
      ['Filing & Organisation', 'filing-and-organisation'],
    ],
  },
  {
    name: 'Pet Supplies',
    slug: 'pet-supplies',
    icon: 'ShoppingBasket',
    subs: [
      ['Dog Food', 'dog-food'],
      ['Cat Food', 'cat-food'],
      ['Pet Toys', 'pet-toys'],
      ['Collars & Leashes', 'collars-and-leashes'],
    ],
  },
  {
    name: 'Baby Care',
    slug: 'baby-care',
    icon: 'Baby',
    subs: [
      ['Diapers', 'diapers'],
      ['Baby Food', 'baby-food'],
      ['Bathing & Skincare', 'bathing-and-skincare'],
      ['Feeding Bottles', 'feeding-bottles'],
    ],
  },
  {
    name: 'Grocery Essentials',
    slug: 'grocery-essentials',
    icon: 'ShoppingBasket',
    subs: [
      ['Snacks & Beverages', 'snacks-and-beverages'],
      ['Dry Fruits & Nuts', 'dry-fruits-and-nuts'],
      ['Cooking Essentials', 'cooking-essentials'],
      ['Breakfast & Cereals', 'breakfast-and-cereals'],
      // `personal-care` already belongs to Beauty and category slugs are unique,
      // so the household variant is prefixed.
      ['Household & Personal Care', 'household-personal-care'],
    ],
  },
].map((c) => ({ ...c, subs: c.subs.map(([name, slug]) => ({ name, slug })) }));

// ── Subcategories missing from the ORIGINAL 8 categories ────────────────────
// These parents already exist; only the extra children are declared.
const EXTRA_SUBCATEGORIES = {
  electronics: [
    ['Drones', 'drones'],
    ['Storage Devices', 'storage-devices'],
  ],
  'mobiles-tablets': [['Screen Protectors', 'screen-protectors']],
  fashion: [['Winter Wear', 'winter-wear']],
  beauty: [['Personal Care', 'personal-care']],
  sports: [['Cricket', 'cricket']],
};

// ── Products ────────────────────────────────────────────────────────────────
// [name, slug, brand, category, subcategory, mrp, price, rating, reviews]
const P = (name, slug, brand, category, subcategory, mrp, price, rating, reviews) => ({
  name,
  slug,
  gtin: `SKU-${slug
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 18)}`,
  brand,
  category,
  subcategory,
  mrp,
  price,
  rating,
  reviews,
});

const EXTRA_PRODUCTS = [
  // ── Filling the 13 empty subcategories of the original 8 categories ───────
  P(
    'Anker Soundcore Charging Case',
    'anker-soundcore-charging-case',
    'anker',
    'mobiles-tablets',
    'mobile-accessories',
    130,
    55,
    4.2,
    18400,
  ),

  P(
    'Samsung 25W USB-C Travel Adapter',
    'samsung-25w-travel-adapter',
    'samsung',
    'mobiles-tablets',
    'mobile-accessories',
    85,
    65,
    4.4,
    6200,
  ),

  P(
    'Apple iPhone 15 Pro Silicone Case',
    'apple-iphone-15-pro-silicone-case',
    'apple',
    'mobiles-tablets',
    'cases-and-covers',
    210,
    185,
    4.5,
    3100,
  ),

  P(
    'Samsung Galaxy S24 Clear Standing Cover',
    'samsung-s24-clear-standing-cover',
    'samsung',
    'mobiles-tablets',
    'cases-and-covers',
    130,
    95,
    4.3,
    1500,
  ),

  P(
    '3M Privacy Screen Protector 15.6"',
    '3m-privacy-screen-protector-156',
    '3m',
    'mobiles-tablets',
    'screen-protectors',
    260,
    195,
    4.4,
    900,
  ),

  P(
    'Anker Tempered Glass for iPhone 15',
    'anker-tempered-glass-iphone-15',
    'anker',
    'mobiles-tablets',
    'screen-protectors',
    45,
    20,
    4.1,
    7600,
  ),

  P(
    'Sony PlayStation 5 Slim Console',
    'sony-ps5-slim-console',
    'sony',
    'electronics',
    'gaming-consoles',
    2400,
    2150,
    4.8,
    9800,
  ),

  P(
    'Lenovo Legion Go Handheld Console',
    'lenovo-legion-go-handheld',
    'lenovo',
    'electronics',
    'gaming-consoles',
    3900,
    3250,
    4.4,
    1200,
  ),

  P(
    'Canon PowerShot V10 Vlogging Camera',
    'canon-powershot-v10-vlogging-camera',
    'canon',
    'electronics',
    'drones',
    1950,
    1700,
    4.6,
    1600,
  ),

  P(
    'Canon PowerShot Aerial Kit',
    'canon-powershot-aerial-kit',
    'canon',
    'electronics',
    'drones',
    2750,
    2400,
    4.3,
    420,
  ),

  P(
    'Samsung T7 Portable SSD 1TB',
    'samsung-t7-portable-ssd-1tb',
    'samsung',
    'electronics',
    'storage-devices',
    650,
    390,
    4.7,
    12400,
  ),

  P(
    'Sony Tough microSD 256GB',
    'sony-tough-microsd-256gb',
    'sony',
    'electronics',
    'storage-devices',
    220,
    120,
    4.6,
    21000,
  ),

  P(
    'Splash Linen Shirt, Men',
    'splash-linen-shirt-men',
    'splash',
    'fashion',
    'ethnic-wear',
    130,
    90,
    4.4,
    3400,
  ),

  P(
    'Al Motahajiba Embroidered Abaya',
    'al-motahajiba-embroidered-abaya',
    'al-motahajiba',
    'fashion',
    'ethnic-wear',
    240,
    145,
    4.3,
    2100,
  ),

  P(
    "Levi's Puffer Jacket, Men",
    'levis-puffer-jacket-men',
    'levis',
    'fashion',
    'winter-wear',
    350,
    240,
    4.5,
    1800,
  ),

  P(
    'Timberland Fleece Hoodie',
    'timberland-fleece-hoodie',
    'timberland',
    'fashion',
    'winter-wear',
    175,
    120,
    4.2,
    950,
  ),

  P(
    "L'Oréal Paris Revitalift Vitamin C Serum",
    'loreal-revitalift-vitamin-c-serum',
    'loreal-paris',
    'beauty',
    'skincare',
    45,
    30,
    4.3,
    24000,
  ),

  P(
    'Nivea Soft Light Moisturiser 300ml',
    'nivea-soft-light-moisturiser-300ml',
    'nivea',
    'beauty',
    'skincare',
    25,
    16,
    4.5,
    41000,
  ),

  P(
    "L'Oréal Paris Colour Riche Lipstick",
    'loreal-colour-riche-lipstick',
    'loreal-paris',
    'beauty',
    'makeup',
    40,
    30,
    4.2,
    15600,
  ),

  P(
    "L'Oréal Paris True Match Foundation",
    'loreal-true-match-foundation',
    'loreal-paris',
    'beauty',
    'makeup',
    40,
    25,
    4.1,
    8300,
  ),

  P(
    'Fossil Signature Eau de Parfum',
    'fossil-signature-eau-de-parfum',
    'fossil',
    'beauty',
    'fragrances',
    110,
    75,
    4.4,
    5200,
  ),

  P(
    'Nivea Men Deep Impact Deodorant',
    'nivea-men-deep-impact-deo',
    'nivea',
    'beauty',
    'fragrances',
    16,
    11,
    4.3,
    19800,
  ),

  P(
    'Himalaya Purifying Neem Face Wash',
    'himalaya-neem-face-wash',
    'himalaya',
    'beauty',
    'personal-care',
    8,
    7,
    4.5,
    62000,
  ),

  P(
    'Dabur Amla Hair Oil 450ml',
    'dabur-amla-hair-oil-450ml',
    'dabur',
    'beauty',
    'personal-care',
    12,
    9,
    4.4,
    38000,
  ),

  P(
    'Tefal Titanium Non-Stick Wok 28cm',
    'tefal-titanium-wok-28cm',
    'tefal',
    'home-kitchen',
    'cookware',
    110,
    65,
    4.3,
    9200,
  ),

  P(
    'Luminarc Glass Casserole Set, 3-Piece',
    'luminarc-glass-casserole-set-3pc',
    'luminarc',
    'home-kitchen',
    'cookware',
    95,
    70,
    4.5,
    4100,
  ),

  P(
    'Philips 9W LED Bulb, Pack of 4',
    'philips-9w-led-bulb-4pack',
    'philips',
    'home-kitchen',
    'lighting',
    35,
    20,
    4.4,
    27000,
  ),

  P(
    'Osram Ceiling LED Panel 18W',
    'osram-ceiling-led-panel-18w',
    'osram',
    'home-kitchen',
    'lighting',
    70,
    50,
    4.2,
    3600,
  ),

  P(
    "B'Twin Rockrider ST100 Mountain Bike",
    'btwin-rockrider-st100-mountain-bike',
    'btwin',
    'sports',
    'cycling',
    960,
    740,
    4.2,
    2400,
  ),

  P(
    'Quechua Cycling Helmet, Adult',
    'quechua-cycling-helmet-adult',
    'quechua',
    'sports',
    'cycling',
    110,
    70,
    4.3,
    1100,
  ),

  P(
    'Adidas Incurza Cricket Bat',
    'adidas-incurza-cricket-bat',
    'adidas',
    'sports',
    'cricket',
    830,
    610,
    4.5,
    860,
  ),

  P(
    'Adidas Cricket Batting Gloves',
    'adidas-cricket-batting-gloves',
    'adidas',
    'sports',
    'cricket',
    150,
    105,
    4.2,
    640,
  ),

  // Books — the category existed but had no products at all
  P(
    'The Midnight Library — Matt Haig',
    'the-midnight-library',
    'penguin',
    'books',
    'fiction',
    35,
    17,
    4.6,
    48000,
  ),

  P(
    'To Kill a Mockingbird — Harper Lee',
    'to-kill-a-mockingbird-harper-lee',
    'harpercollins',
    'books',
    'fiction',
    25,
    14,
    4.5,
    22000,
  ),

  P(
    'Sapiens: A Brief History of Humankind',
    'sapiens-brief-history',
    'penguin',
    'books',
    'non-fiction',
    40,
    20,
    4.7,
    91000,
  ),

  P(
    'The Alchemist — Paulo Coelho',
    'the-alchemist-paulo-coelho',
    'harpercollins',
    'books',
    'non-fiction',
    17,
    11,
    4.8,
    76000,
  ),

  P(
    'Oxford Advanced Learner’s Dictionary',
    'oxford-advanced-learners-dictionary',
    'oxford',
    'books',
    'academic-and-textbooks',
    50,
    40,
    4.7,
    15400,
  ),

  P(
    'Oxford IB Diploma Mathematics',
    'oxford-ib-diploma-mathematics',
    'oxford',
    'books',
    'academic-and-textbooks',
    20,
    17,
    4.4,
    6800,
  ),

  P(
    'Deli Spiral Notebook, Pack of 6',
    'deli-spiral-notebook-pack-6',
    'deli',
    'books',
    'stationery',
    30,
    20,
    4.4,
    31000,
  ),

  P(
    'Faber-Castell Colour Pencils, 24 Shades',
    'faber-castell-colour-pencils-24',
    'faber-castell',
    'books',
    'stationery',
    17,
    13,
    4.6,
    18700,
  ),

  // ── Furniture ─────────────────────────────────────────────────────────────
  P(
    'IDdesign Riva 3-Seater Sofa',
    'iddesign-riva-3-seater-sofa',
    'iddesign',
    'furniture',
    'living-room',
    2400,
    1750,
    4.4,
    1900,
  ),

  P(
    'IKEA LACK Coffee Table, Oak',
    'ikea-lack-coffee-table-oak',
    'ikea',
    'furniture',
    'living-room',
    300,
    240,
    4.2,
    3800,
  ),

  P(
    'Home Centre 3-Door Wardrobe',
    'home-centre-3-door-wardrobe',
    'home-centre',
    'furniture',
    'bedroom',
    1850,
    1500,
    4.3,
    1400,
  ),

  P(
    'IKEA MALM Bed Frame, King',
    'ikea-malm-bed-frame-king',
    'ikea',
    'furniture',
    'bedroom',
    1450,
    1150,
    4.5,
    2600,
  ),

  P(
    'Home Centre Ergonomic Office Chair',
    'home-centre-ergonomic-office-chair',
    'home-centre',
    'furniture',
    'office-furniture',
    830,
    610,
    4.3,
    4200,
  ),

  P(
    'IDdesign Study Desk, Walnut',
    'iddesign-study-desk-walnut',
    'iddesign',
    'furniture',
    'office-furniture',
    700,
    520,
    4.4,
    1700,
  ),

  P(
    'Sealy Ortho Pro Mattress, Queen',
    'sealy-ortho-pro-mattress-queen',
    'sealy',
    'furniture',
    'mattresses',
    1250,
    870,
    4.5,
    8600,
  ),

  P(
    'Sealy Dual Comfort Mattress, Single',
    'sealy-dual-comfort-mattress-single',
    'sealy',
    'furniture',
    'mattresses',
    560,
    390,
    4.3,
    5400,
  ),

  // ── Toys & Baby Products ──────────────────────────────────────────────────
  P(
    'LEGO Classic Creative Bricks 1500pc',
    'lego-classic-creative-1500',
    'lego',
    'toys-baby',
    'toys-and-games',
    390,
    300,
    4.8,
    12800,
  ),

  P(
    'Funskool Monopoly Board Game',
    'funskool-monopoly-board-game',
    'funskool',
    'toys-baby',
    'toys-and-games',
    55,
    40,
    4.4,
    9400,
  ),

  P(
    'Chicco Bravo Travel System Stroller',
    'chicco-bravo-travel-stroller',
    'chicco',
    'toys-baby',
    'baby-gear',
    1450,
    1100,
    4.6,
    2100,
  ),

  P(
    'Chicco KeyFit Infant Car Seat',
    'chicco-keyfit-infant-car-seat',
    'chicco',
    'toys-baby',
    'baby-gear',
    960,
    760,
    4.7,
    1600,
  ),

  P(
    'Pampers Premium Care Pants, M (72)',
    'pampers-premium-care-pants-m72',
    'pampers',
    'toys-baby',
    'diapers-and-wipes',
    65,
    45,
    4.5,
    54000,
  ),

  P(
    "Johnson's Baby Skincare Wipes, 72s",
    'johnsons-baby-skincare-wipes-72',
    'johnsons',
    'toys-baby',
    'diapers-and-wipes',
    17,
    12,
    4.4,
    21000,
  ),

  P(
    'LEGO Education Coding Express',
    'lego-education-coding-express',
    'lego',
    'toys-baby',
    'educational-toys',
    700,
    570,
    4.7,
    890,
  ),

  P(
    'Funskool Learn & Play Alphabet Set',
    'funskool-learn-play-alphabet',
    'funskool',
    'toys-baby',
    'educational-toys',
    45,
    30,
    4.3,
    4600,
  ),

  // ── Automotive Accessories ────────────────────────────────────────────────
  P(
    '3M Car Dashboard Camera Full HD',
    '3m-car-dash-camera-fhd',
    '3m',
    'automotive',
    'car-accessories',
    430,
    300,
    4.2,
    3300,
  ),

  P(
    'Bosch Car Wiper Blade Set, 24"+16"',
    'bosch-wiper-blade-set-24-16',
    'bosch',
    'automotive',
    'car-accessories',
    80,
    60,
    4.4,
    8700,
  ),

  P(
    'LS2 Bike Tank Grip Pad',
    'ls2-bike-tank-grip-pad',
    'ls2',
    'automotive',
    'bike-accessories',
    55,
    35,
    4.1,
    2400,
  ),

  P(
    'Bosch Motorcycle LED Headlamp',
    'bosch-motorcycle-led-headlamp',
    'bosch',
    'automotive',
    'bike-accessories',
    150,
    115,
    4.3,
    1500,
  ),

  P(
    'LS2 FF353 Full Face Helmet',
    'ls2-ff353-full-face-helmet',
    'ls2',
    'automotive',
    'helmets',
    150,
    100,
    4.4,
    16800,
  ),

  P(
    'LS2 OF600 Open Face Helmet',
    'ls2-of600-open-face-helmet',
    'ls2',
    'automotive',
    'helmets',
    95,
    65,
    4.2,
    9100,
  ),

  P(
    'Castrol GTX 5W-30 Engine Oil, 3.5L',
    'castrol-gtx-5w30-35l',
    'castrol',
    'automotive',
    'car-care',
    145,
    115,
    4.6,
    12200,
  ),

  P(
    '3M Car Care Wash & Wax Kit',
    '3m-car-wash-wax-kit',
    '3m',
    'automotive',
    'car-care',
    85,
    60,
    4.4,
    6700,
  ),

  // ── Health & Wellness ─────────────────────────────────────────────────────
  P(
    'Optimum Nutrition Gold Standard Whey 2lb',
    'on-gold-standard-whey-2lb',
    'optimum-nutrition',
    'health-wellness',
    'vitamins-and-supplements',
    240,
    185,
    4.7,
    38000,
  ),

  P(
    'Himalaya Multivitamin Tablets, 60s',
    'himalaya-multivitamin-60',
    'himalaya',
    'health-wellness',
    'vitamins-and-supplements',
    30,
    25,
    4.3,
    9800,
  ),

  P(
    'Dabur Chyawanprash Awaleha 1kg',
    'dabur-chyawanprash-1kg',
    'dabur',
    'health-wellness',
    'ayurvedic',
    25,
    20,
    4.5,
    44000,
  ),

  P(
    'Himalaya Ashwagandha Capsules, 60s',
    'himalaya-ashwagandha-60',
    'himalaya',
    'health-wellness',
    'ayurvedic',
    20,
    15,
    4.4,
    15600,
  ),

  P(
    'Casio Step Tracker Band',
    'casio-step-tracker-band',
    'casio',
    'health-wellness',
    'fitness-devices',
    175,
    80,
    4.1,
    27000,
  ),

  P(
    'Omron Body Composition Monitor',
    'omron-body-composition-monitor',
    'omron',
    'health-wellness',
    'fitness-devices',
    195,
    145,
    4.4,
    5300,
  ),

  P(
    'Omron HEM-7124 Digital BP Monitor',
    'omron-hem-7124-bp-monitor',
    'omron',
    'health-wellness',
    'medical-devices',
    120,
    85,
    4.6,
    46000,
  ),

  P(
    'Omron Nebuliser NE-C101',
    'omron-nebuliser-ne-c101',
    'omron',
    'health-wellness',
    'medical-devices',
    115,
    85,
    4.5,
    8900,
  ),

  // ── Watches & Accessories ─────────────────────────────────────────────────
  P(
    'Fossil Minimalist Slim Watch, Men',
    'fossil-minimalist-slim-watch-men',
    'fossil',
    'watches',
    'mens-watches',
    830,
    660,
    4.6,
    6400,
  ),

  P(
    'Casio Enticer Analog Watch, Men',
    'casio-enticer-analog-watch-men',
    'casio',
    'watches',
    'mens-watches',
    220,
    150,
    4.3,
    18900,
  ),

  P(
    'Fossil Carlie Analog Watch, Women',
    'fossil-carlie-analog-watch-women',
    'fossil',
    'watches',
    'womens-watches',
    560,
    450,
    4.5,
    4700,
  ),

  P(
    'Casio Sheen Analog Watch, Women',
    'casio-sheen-analog-watch-women',
    'casio',
    'watches',
    'womens-watches',
    175,
    120,
    4.2,
    11200,
  ),

  P(
    'Apple Watch SE 2nd Gen (40mm)',
    'apple-watch-se-2nd-gen-40mm',
    'apple',
    'watches',
    'smartwatches',
    1300,
    1100,
    4.7,
    22000,
  ),

  P(
    'Samsung Galaxy Watch FE (40mm)',
    'samsung-galaxy-watch-fe-40mm',
    'samsung',
    'watches',
    'smartwatches',
    1250,
    870,
    4.4,
    5600,
  ),

  P(
    'Ray-Ban Aviator Classic Sunglasses',
    'rayban-aviator-classic',
    'rayban',
    'watches',
    'sunglasses',
    560,
    450,
    4.7,
    14500,
  ),

  P(
    'Casio UV-Protected Wayfarer',
    'casio-uv-protected-wayfarer',
    'casio',
    'watches',
    'sunglasses',
    95,
    55,
    4.2,
    26000,
  ),

  // ── Bags & Travel ─────────────────────────────────────────────────────────
  P(
    'Quechua Trailblazer 45L Rucksack',
    'quechua-trailblazer-45l-rucksack',
    'quechua',
    'bags-travel',
    'backpacks',
    195,
    135,
    4.5,
    12600,
  ),

  P(
    'Delsey Casual Backpack 46L',
    'delsey-casual-backpack-46l',
    'delsey',
    'bags-travel',
    'backpacks',
    95,
    50,
    4.3,
    34000,
  ),

  P(
    'Samsonite Sling Handbag, Tan',
    'samsonite-sling-handbag-tan',
    'samsonite',
    'bags-travel',
    'handbags',
    130,
    80,
    4.1,
    3900,
  ),

  P(
    'American Tourister Shoulder Bag',
    'american-tourister-shoulder-bag',
    'american-tourister',
    'bags-travel',
    'handbags',
    150,
    105,
    4.2,
    2700,
  ),

  P(
    'American Tourister Trolley 68cm',
    'american-tourister-trolley-68cm',
    'american-tourister',
    'bags-travel',
    'luggage',
    430,
    260,
    4.5,
    21000,
  ),

  P(
    'Samsonite Pentagon Hard Trolley 65cm',
    'samsonite-pentagon-hard-trolley-65cm',
    'samsonite',
    'bags-travel',
    'luggage',
    370,
    185,
    4.3,
    15800,
  ),

  P(
    'Delsey Laptop Backpack 15.6"',
    'delsey-laptop-backpack-156',
    'delsey',
    'bags-travel',
    'laptop-bags',
    145,
    85,
    4.4,
    9600,
  ),

  P(
    'HP Business Laptop Sleeve 15.6"',
    'hp-business-laptop-sleeve-156',
    'hp',
    'bags-travel',
    'laptop-bags',
    110,
    75,
    4.3,
    4300,
  ),

  // ── Footwear ──────────────────────────────────────────────────────────────
  P(
    'Bata Comfit Casual Loafers, Men',
    'bata-comfit-loafers-men',
    'bata',
    'footwear',
    'mens-casual',
    130,
    80,
    4.2,
    8800,
  ),

  P(
    'Timberland Leather Casual Shoes, Men',
    'timberland-leather-casual-shoes-men',
    'timberland',
    'footwear',
    'mens-casual',
    220,
    165,
    4.4,
    11400,
  ),

  P(
    'Bata Ballerina Flats, Women',
    'bata-ballerina-flats-women',
    'bata',
    'footwear',
    'womens-flats',
    80,
    45,
    4.1,
    6200,
  ),

  P(
    'Adidas Cloudfoam Slip-On, Women',
    'adidas-cloudfoam-slipon-women',
    'adidas',
    'footwear',
    'womens-flats',
    175,
    120,
    4.3,
    4900,
  ),

  P(
    'Nike Air Max SC Sports Shoes',
    'nike-air-max-sc-sports',
    'nike',
    'footwear',
    'sports-shoes',
    330,
    230,
    4.5,
    19800,
  ),

  P(
    'Puma Softride Running Shoes',
    'puma-softride-running-shoes',
    'puma',
    'footwear',
    'sports-shoes',
    260,
    155,
    4.3,
    13200,
  ),

  P(
    'Adidas Adilette Slides',
    'adidas-adilette-slides',
    'adidas',
    'footwear',
    'sandals-and-slippers',
    100,
    70,
    4.4,
    22600,
  ),

  P(
    'Bata Everyday Flip-Flops',
    'bata-everyday-flipflops',
    'bata',
    'footwear',
    'sandals-and-slippers',
    20,
    15,
    4.0,
    17300,
  ),

  // ── Computers & Accessories ───────────────────────────────────────────────
  P(
    'HP Pavilion Desktop TP01 (16GB, 1TB)',
    'hp-pavilion-desktop-tp01',
    'hp',
    'computers',
    'desktops',
    2750,
    2250,
    4.3,
    3100,
  ),

  P(
    'Lenovo IdeaCentre 3 All-in-One 24"',
    'lenovo-ideacentre-3-aio-24',
    'lenovo',
    'computers',
    'desktops',
    2550,
    2050,
    4.2,
    1800,
  ),

  P(
    'LG UltraGear 27" QHD Gaming Monitor',
    'lg-ultragear-27-qhd-monitor',
    'lg',
    'computers',
    'monitors',
    1500,
    1100,
    4.6,
    7400,
  ),

  P(
    'Dell S2425HS 24" IPS Monitor',
    'dell-s2425hs-24-ips-monitor',
    'dell',
    'computers',
    'monitors',
    740,
    520,
    4.4,
    5200,
  ),

  P(
    'Logitech MX Keys S Wireless Keyboard',
    'logitech-mx-keys-s',
    'logitech',
    'computers',
    'keyboards-and-mice',
    560,
    430,
    4.7,
    8600,
  ),

  P(
    'Logitech MX Master 3S Mouse',
    'logitech-mx-master-3s',
    'logitech',
    'computers',
    'keyboards-and-mice',
    520,
    390,
    4.8,
    14200,
  ),

  P(
    'HP LaserJet M141w Printer',
    'hp-laserjet-m141w',
    'hp',
    'computers',
    'printers',
    830,
    610,
    4.4,
    9800,
  ),

  P(
    'Canon PIXMA G3770 Ink Tank Printer',
    'canon-pixma-g3770',
    'canon',
    'computers',
    'printers',
    780,
    590,
    4.5,
    6300,
  ),

  // ── Office Supplies ───────────────────────────────────────────────────────
  P(
    'Faber-Castell Ball Pen, Pack of 20',
    'faber-castell-ball-pen-20',
    'faber-castell',
    'office-supplies',
    'writing-instruments',
    17,
    13,
    4.5,
    23000,
  ),

  P(
    'Maped Gel Pen Set, Pack of 10',
    'maped-gel-pen-set-pack-10',
    'maped',
    'office-supplies',
    'writing-instruments',
    11,
    8,
    4.3,
    15400,
  ),

  P(
    'Deli A4 Copier Paper, 500 Sheets',
    'deli-a4-copier-paper-500-sheets',
    'deli',
    'office-supplies',
    'paper-products',
    18,
    14,
    4.4,
    18600,
  ),

  P(
    'Deli Sticky Notes, 5 Pads',
    'deli-sticky-notes-5-pads',
    'deli',
    'office-supplies',
    'paper-products',
    9,
    6,
    4.2,
    9700,
  ),

  P(
    '3M Desk Organiser Tray Set',
    '3m-desk-organiser-tray-set',
    '3m',
    'office-supplies',
    'desk-accessories',
    55,
    40,
    4.3,
    4100,
  ),

  P(
    'Maped Desktop Stationery Caddy',
    'maped-desktop-stationery-caddy',
    'maped',
    'office-supplies',
    'desk-accessories',
    30,
    20,
    4.1,
    2800,
  ),

  P(
    'Deli Ring Binder File, Pack of 5',
    'deli-ring-binder-file-pack-5',
    'deli',
    'office-supplies',
    'filing-and-organisation',
    35,
    25,
    4.2,
    5600,
  ),

  P(
    '3M Document Storage Box, Pack of 3',
    '3m-document-storage-box-3',
    '3m',
    'office-supplies',
    'filing-and-organisation',
    65,
    45,
    4.3,
    2200,
  ),

  // ── Pet Supplies ──────────────────────────────────────────────────────────
  P(
    'Pedigree Adult Dry Dog Food 10kg',
    'pedigree-adult-dry-10kg',
    'pedigree',
    'pet-supplies',
    'dog-food',
    145,
    110,
    4.5,
    34000,
  ),

  P(
    'Royal Canin Medium Adult Dog Food 4kg',
    'royal-canin-medium-adult-dog-food-4kg',
    'royal-canin',
    'pet-supplies',
    'dog-food',
    65,
    45,
    4.4,
    27000,
  ),

  P(
    'Whiskas Adult Ocean Fish 1.2kg',
    'whiskas-adult-ocean-fish-12kg',
    'whiskas',
    'pet-supplies',
    'cat-food',
    30,
    20,
    4.4,
    19800,
  ),

  P(
    'Royal Canin Indoor Adult Cat Food 1.2kg',
    'royal-canin-indoor-adult-cat-food-12kg',
    'royal-canin',
    'pet-supplies',
    'cat-food',
    25,
    20,
    4.3,
    12600,
  ),

  P(
    'Pedigree Squeaky Rubber Bone Toy',
    'pedigree-squeaky-rubber-bone',
    'pedigree',
    'pet-supplies',
    'pet-toys',
    25,
    18,
    4.2,
    8300,
  ),

  P(
    'Quechua Rope Tug Toy for Dogs',
    'quechua-rope-tug-toy-dogs',
    'quechua',
    'pet-supplies',
    'pet-toys',
    20,
    14,
    4.1,
    5100,
  ),

  P(
    'Quechua Padded Dog Collar, Medium',
    'quechua-padded-dog-collar-medium',
    'quechua',
    'pet-supplies',
    'collars-and-leashes',
    40,
    25,
    4.3,
    6700,
  ),

  P(
    'Royal Canin Retractable Dog Leash 5m',
    'royal-canin-retractable-dog-leash-5m',
    'royal-canin',
    'pet-supplies',
    'collars-and-leashes',
    50,
    35,
    4.2,
    4400,
  ),

  // ── Baby Care ─────────────────────────────────────────────────────────────
  P(
    'Pampers All Round Protection Pants, L (64)',
    'pampers-all-round-pants-l64',
    'pampers',
    'baby-care',
    'diapers',
    60,
    45,
    4.5,
    62000,
  ),

  P(
    'Chicco Dry Fit Diapers, S (78)',
    'chicco-dry-fit-diapers-s78',
    'chicco',
    'baby-care',
    'diapers',
    55,
    40,
    4.3,
    8600,
  ),

  P(
    'Nestle Cerelac Wheat Apple 300g',
    'nestle-cerelac-wheat-apple-300g',
    'nestle',
    'baby-care',
    'baby-food',
    14,
    12,
    4.6,
    48000,
  ),

  P(
    'Nestle Nan Pro Follow-Up Formula 400g',
    'nestle-nan-pro-followup-400g',
    'nestle',
    'baby-care',
    'baby-food',
    35,
    30,
    4.5,
    21000,
  ),

  P(
    "Johnson's Top-to-Toe Baby Wash 500ml",
    'johnsons-top-to-toe-baby-wash-500ml',
    'johnsons',
    'baby-care',
    'bathing-and-skincare',
    17,
    12,
    4.5,
    33000,
  ),

  P(
    'Himalaya Baby Lotion 400ml',
    'himalaya-baby-lotion-400ml',
    'himalaya',
    'baby-care',
    'bathing-and-skincare',
    15,
    12,
    4.4,
    26000,
  ),

  P(
    'Philips Avent Natural Response Bottle 260ml',
    'philips-avent-natural-bottle-260',
    'philips',
    'baby-care',
    'feeding-bottles',
    55,
    45,
    4.6,
    14200,
  ),

  P(
    'Chicco Well-Being Feeding Bottle 250ml',
    'chicco-wellbeing-bottle-250',
    'chicco',
    'baby-care',
    'feeding-bottles',
    40,
    30,
    4.4,
    7800,
  ),

  // ── Grocery Essentials ────────────────────────────────────────────────────
  P(
    'Al Rifai Mixed Kernels 1kg',
    'al-rifai-mixed-kernels-1kg',
    'al-rifai',
    'grocery-essentials',
    'snacks-and-beverages',
    17,
    14,
    4.5,
    29000,
  ),

  P(
    'Al Alali Black Tea 1kg',
    'al-alali-black-tea-1kg',
    'al-alali',
    'grocery-essentials',
    'snacks-and-beverages',
    25,
    25,
    4.6,
    51000,
  ),

  P(
    'Al Rifai Premium Almonds 500g',
    'al-rifai-premium-almonds-500g',
    'al-rifai',
    'grocery-essentials',
    'dry-fruits-and-nuts',
    35,
    25,
    4.4,
    37000,
  ),

  P(
    'Al Rifai Walnut Kernels 500g',
    'al-rifai-walnut-kernels-500g',
    'al-rifai',
    'grocery-essentials',
    'dry-fruits-and-nuts',
    55,
    35,
    4.3,
    18400,
  ),

  P(
    'Al Alali Sunflower Oil 5L',
    'al-alali-sunflower-oil-5l',
    'al-alali',
    'grocery-essentials',
    'cooking-essentials',
    50,
    45,
    4.4,
    42000,
  ),

  P(
    'Al Alali Chickpeas 1kg',
    'al-alali-chickpeas-1kg',
    'al-alali',
    'grocery-essentials',
    'cooking-essentials',
    9,
    8,
    4.5,
    33000,
  ),

  P(
    "Kellogg's Corn Flakes Original 875g",
    'kelloggs-corn-flakes-875g',
    'kelloggs',
    'grocery-essentials',
    'breakfast-and-cereals',
    20,
    17,
    4.5,
    27600,
  ),

  P(
    'Baladna Fresh Laban 1.5L',
    'baladna-fresh-laban-15l',
    'baladna',
    'grocery-essentials',
    'breakfast-and-cereals',
    30,
    25,
    4.7,
    39000,
  ),

  P(
    'Thermos Stainless King Flask 1L',
    'thermos-stainless-king-flask-1l',
    'thermos',
    'grocery-essentials',
    'household-personal-care',
    65,
    45,
    4.5,
    22000,
  ),

  P(
    'Home Centre Room Diffuser, Pack of 3',
    'home-centre-room-diffuser-pack-3',
    'home-centre',
    'grocery-essentials',
    'household-personal-care',
    30,
    20,
    4.3,
    16800,
  ),
];

// ── Merge helpers ───────────────────────────────────────────────────────────
// Each mutates the seed's own array in place, at the point where that array is
// declared. Existing entries win on slug, so re-running never duplicates a row
// and the original 8 categories keep their hand-tuned names and icons.

function mergeBrands(brands) {
  const have = new Set(brands.map((b) => b.slug));
  // `id` is required by the insert; the seed re-reads the real ids after the
  // upsert, so a fresh one here is only ever used for a brand-new row.
  for (const b of EXTRA_BRANDS) if (!have.has(b.slug)) brands.push({ id: randomUUID(), ...b });
  return brands;
}

function mergeCategories(categoryDefs) {
  const bySlug = new Map(categoryDefs.map((c) => [c.slug, c]));
  for (const [parentSlug, subs] of Object.entries(EXTRA_SUBCATEGORIES)) {
    const parent = bySlug.get(parentSlug);
    if (!parent) continue;
    const have = new Set(parent.subs.map((s) => s.slug));
    for (const [name, slug] of subs) if (!have.has(slug)) parent.subs.push({ name, slug });
  }
  for (const c of EXTRA_CATEGORIES) if (!bySlug.has(c.slug)) categoryDefs.push(c);
  return categoryDefs;
}

function mergeProducts(productDefs) {
  const have = new Set(productDefs.map((p) => p.slug));
  for (const p of EXTRA_PRODUCTS) if (!have.has(p.slug)) productDefs.push(p);
  return productDefs;
}

/**
 * Guard for the invariant this file exists to hold: nothing may be advertised
 * that has no products behind it. An empty subcategory is what produced the
 * "category shows no product cards" reports in the first place, so the seed
 * fails loudly rather than loading a catalog that reintroduces it.
 */
function verifyCatalog(categoryDefs, productDefs) {
  const bySub = new Set(productDefs.map((p) => p.subcategory));
  const byCat = new Set(productDefs.map((p) => p.category));
  const emptySubs = [];
  const emptyCats = [];
  for (const c of categoryDefs) {
    if (!byCat.has(c.slug)) emptyCats.push(c.slug);
    for (const s of c.subs) if (!bySub.has(s.slug)) emptySubs.push(`${c.slug}/${s.slug}`);
  }
  return { emptyCats, emptySubs };
}

module.exports = {
  EXTRA_BRANDS,
  EXTRA_CATEGORIES,
  EXTRA_SUBCATEGORIES,
  EXTRA_PRODUCTS,
  mergeBrands,
  mergeCategories,
  mergeProducts,
  verifyCatalog,
};
