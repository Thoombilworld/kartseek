import type { TranslationKeys } from '../types';
import en from './en';

/** Tamil (தமிழ்) — India */
const ta: TranslationKeys = {
  ...en,
  common: { ...en.common, appName: 'கார்ட்சீக்', tagline: 'இறுதி சூப்பர் ஆப்', searchPlaceholder: 'பொருட்கள், மளிகை, உணவகங்கள் தேடுங்கள்...', searchIn: '{{city}} இல் தேடுங்கள்…', loading: 'ஏற்றுகிறது…', detecting: 'கண்டறிகிறது…', viewAll: 'அனைத்தையும் காண', seeAll: 'அனைத்தையும் காண', back: 'பின்னால்', next: 'அடுத்து', cancel: 'ரத்து', save: 'சேமி', delete: 'நீக்கு', edit: 'திருத்து', close: 'மூடு', confirm: 'உறுதிசெய்', yes: 'ஆம்', no: 'இல்லை', ok: 'சரி', error: 'பிழை', success: 'வெற்றி', warning: 'எச்சரிக்கை', retry: 'மீண்டும் முயற்சி', noResults: 'முடிவுகள் இல்லை', selectRegion: 'பகுதி தேர்வு', language: 'மொழி', country: 'நாடு', currency: 'நாணயம்', settings: 'அமைப்புகள்', logout: 'வெளியேறு', login: 'உள்நுழை', signUp: 'பதிவு', signOut: 'வெளியேறு', filter: 'வடிகட்டு', sort: 'வரிசை', apply: 'பயன்படுத்து', reset: 'மீட்டமை', showMore: 'மேலும் காட்டு', showLess: 'குறைவாக காட்டு', today: 'இன்று', yesterday: 'நேற்று', justNow: 'இப்போது', promoted: 'விளம்பரம்', featured: 'சிறப்பு', popular: 'பிரபலம்', trending: 'டிரெண்டிங்', freeDelivery: 'இலவச டெலிவரி', orderNow: 'இப்போது ஆர்டர்', shopNow: 'இப்போது வாங்கு', bookNow: 'இப்போது புக்', continueText: 'தொடரவும்', submit: 'சமர்ப்பி', allRightsReserved: 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.', termsOfService: 'சேவை விதிமுறைகள்', privacyPolicy: 'தனியுரிமை கொள்கை', helpCenter: 'உதவி மையம்', contactUs: 'எங்களை தொடர்புகொள்ளவும்' },
  nav: { ...en.nav, home: 'முகப்பு', shop: 'கடை', orders: 'ஆர்டர்கள்', wishlist: 'விருப்பப்பட்டியல்', profile: 'சுயவிவரம்', cart: 'வண்டி', notifications: 'அறிவிப்புகள்', marketplace: 'சந்தை', grocery: 'மளிகை', restaurant: 'உணவகம்', foodDelivery: 'உணவு டெலிவரி', pharmacy: 'மருந்தகம்', doctor: 'மருத்துவர்', taxi: 'டாக்சி', wallet: 'பணப்பை', rewards: 'வெகுமதிகள்', support: 'ஆதரவு', helpSupport: 'உதவி & ஆதரவு' },
  home: { ...en.home, walletLabel: 'பணப்பை', walletTopUp: 'டாப் அப் செய்ய தட்டவும்', loyaltyLabel: 'விசுவாசம்', ourServices: 'எங்கள் சேவைகள்', recentOrders: 'சமீபத்திய ஆர்டர்கள்', trendingNow: 'இப்போது டிரெண்டிங்', nearbyStores: 'அருகிலுள்ள மளிகை கடைகள்', popularBrands: 'பிரபல பிராண்டுகள்', premiumRestaurants: 'பிரீமியம் உணவகங்கள்', trackOrder: 'ஆர்டர் கண்காணி', getHelp: 'உதவி பெறு', delivery: 'டெலிவரி', takeaway: 'டேக்அவே', dineIn: 'டைன்-இன்', bookTable: 'டேபிள் புக்' },
  grocery: { ...en.grocery, title: 'மளிகை', freshGroceries: 'புதிய மளிகை', nearbyStores: 'அருகிலுள்ள கடைகள்', shopByBrand: 'பிராண்ட் வாரியாக', trendingStores: 'டிரெண்டிங் கடைகள்', todaysDeals: 'இன்றைய சலுகைகள்' },
  food: { ...en.food, title: 'உணவு டெலிவரி', restaurants: 'உணவகங்கள்', addToCart: 'வண்டியில் சேர்', viewMenu: 'மெனு காண', deliveryTime: 'டெலிவரி நேரம்' },
  pharmacy: { ...en.pharmacy, title: 'மருந்தகம்', orderMedicine: 'மருந்து ஆர்டர்', searchMedicine: 'மருந்து தேடு' },
  doctor: { ...en.doctor, title: 'மருத்துவர்', findDoctor: 'மருத்துவர் தேடு', bookAppointment: 'சந்திப்பு புக்' },
  taxi: { ...en.taxi, title: 'டாக்சி', bookRide: 'பயணம் புக்', whereToGo: 'எங்கு செல்ல வேண்டும்?' },
  cart: { ...en.cart, myCart: 'என் வண்டி', emptyCart: 'உங்கள் வண்டி காலியாக உள்ளது', subtotal: 'துணை மொத்தம்', total: 'மொத்தம்', checkout: 'செக்அவுட்', placeOrder: 'ஆர்டர் செய்' },
  orders: { ...en.orders, myOrders: 'என் ஆர்டர்கள்', delivered: 'டெலிவர் ஆனது', cancelled: 'ரத்து', trackOrder: 'ஆர்டர் கண்காணி' },
  admin: { ...en.admin, dashboard: 'டாஷ்போர்ட்', settings: 'அமைப்புகள்' },
  footer: { ...en.footer, about: 'எங்களைப் பற்றி', services: 'சேவைகள்' },
  notifications: { ...en.notifications, title: 'அறிவிப்புகள்' },
  promos: { ...en.promos, freeDelivery: 'இலவச டெலிவரி' },
  errors: { ...en.errors, somethingWentWrong: 'ஏதோ தவறாகிவிட்டது', pageNotFound: 'பக்கம் கிடைக்கவில்லை', tryAgain: 'மீண்டும் முயற்சி', goHome: 'முகப்புக்கு செல்' },
};

export default ta;
