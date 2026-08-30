import type { TranslationKeys } from '../types';
import en from './en';

/** Malayalam (മലയാളം) — India */
const ml: TranslationKeys = {
  ...en,
  common: { ...en.common, appName: 'കാർട്ട്‌സീക്ക്', tagline: 'അൾട്ടിമേറ്റ് സൂപ്പർ ആപ്പ്', searchPlaceholder: 'ഉൽപ്പന്നങ്ങൾ, പലചരക്ക്, റെസ്റ്ററന്റുകൾ തിരയുക...', searchIn: '{{city}} ൽ തിരയുക…', loading: 'ലോഡ് ചെയ്യുന്നു…', detecting: 'കണ്ടെത്തുന്നു…', viewAll: 'എല്ലാം കാണുക', seeAll: 'എല്ലാം കാണുക', back: 'പിന്നിലേക്ക്', next: 'അടുത്തത്', cancel: 'റദ്ദാക്കുക', save: 'സേവ്', delete: 'ഇല്ലാതാക്കുക', edit: 'എഡിറ്റ്', close: 'ക്ലോസ്', confirm: 'സ്ഥിരീകരിക്കുക', yes: 'അതെ', no: 'ഇല്ല', ok: 'ശരി', error: 'പിശക്', success: 'വിജയം', warning: 'മുന്നറിയിപ്പ്', retry: 'വീണ്ടും ശ്രമിക്കുക', noResults: 'ഫലങ്ങളൊന്നും കണ്ടെത്തിയില്ല', selectRegion: 'പ്രദേശം തിരഞ്ഞെടുക്കുക', language: 'ഭാഷ', country: 'രാജ്യം', currency: 'നാണയം', settings: 'ക്രമീകരണങ്ങൾ', logout: 'ലോഗ്ഔട്ട്', login: 'ലോഗിൻ', signUp: 'സൈൻ അപ്പ്', signOut: 'സൈൻ ഔട്ട്', filter: 'ഫിൽട്ടർ', sort: 'ക്രമപ്പെടുത്തുക', today: 'ഇന്ന്', yesterday: 'ഇന്നലെ', justNow: 'ഇപ്പോൾ', promoted: 'പ്രൊമോട്ടഡ്', popular: 'ജനപ്രിയം', trending: 'ട്രെൻഡിംഗ്', freeDelivery: 'സൗജന്യ ഡെലിവറി', orderNow: 'ഇപ്പോൾ ഓർഡർ ചെയ്യുക', shopNow: 'ഇപ്പോൾ ഷോപ്പ് ചെയ്യുക', bookNow: 'ഇപ്പോൾ ബുക്ക് ചെയ്യുക', continueText: 'തുടരുക', submit: 'സമർപ്പിക്കുക', allRightsReserved: 'എല്ലാ അവകാശങ്ങളും സംരക്ഷിതം.', termsOfService: 'സേവന നിബന്ധനകൾ', privacyPolicy: 'സ്വകാര്യതാ നയം', helpCenter: 'സഹായ കേന്ദ്രം', contactUs: 'ഞങ്ങളെ ബന്ധപ്പെടുക' },
  nav: { ...en.nav, home: 'ഹോം', shop: 'ഷോപ്പ്', orders: 'ഓർഡറുകൾ', wishlist: 'വിഷ്‌ലിസ്റ്റ്', profile: 'പ്രൊഫൈൽ', cart: 'കാർട്ട്', notifications: 'അറിയിപ്പുകൾ', marketplace: 'മാർക്കറ്റ്‌പ്ലേസ്', grocery: 'പലചരക്ക്', restaurant: 'റെസ്റ്ററന്റ്', foodDelivery: 'ഭക്ഷണ ഡെലിവറി', pharmacy: 'ഫാർമസി', doctor: 'ഡോക്ടർ', taxi: 'ടാക്സി', wallet: 'വാലറ്റ്', rewards: 'റിവാർഡുകൾ', support: 'സഹായം', helpSupport: 'സഹായവും പിന്തുണയും' },
  home: { ...en.home, walletLabel: 'വാലറ്റ്', walletTopUp: 'ടോപ്പ് അപ്പ് ചെയ്യാൻ ടാപ്പ് ചെയ്യുക', loyaltyLabel: 'ലോയൽറ്റി', ourServices: 'ഞങ്ങളുടെ സേവനങ്ങൾ', recentOrders: 'സമീപകാല ഓർഡറുകൾ', trendingNow: 'ഇപ്പോൾ ട്രെൻഡിംഗ്', nearbyStores: 'സമീപത്തെ പലചരക്ക് കടകൾ', popularBrands: 'ജനപ്രിയ ബ്രാൻഡുകൾ', premiumRestaurants: 'പ്രീമിയം റെസ്റ്ററന്റുകൾ', trackOrder: 'ഓർഡർ ട്രാക്ക്', getHelp: 'സഹായം നേടുക', delivery: 'ഡെലിവറി', takeaway: 'ടേക്ക്‌അവേ', dineIn: 'ഡൈൻ-ഇൻ', bookTable: 'ടേബിൾ ബുക്ക്' },
  grocery: { ...en.grocery, title: 'പലചരക്ക്', freshGroceries: 'ഫ്രഷ് പലചരക്ക്', nearbyStores: 'സമീപത്തെ കടകൾ', shopByBrand: 'ബ്രാൻഡ് അനുസരിച്ച്', trendingStores: 'ട്രെൻഡിംഗ് കടകൾ', todaysDeals: 'ഇന്നത്തെ ഓഫറുകൾ' },
  food: { ...en.food, title: 'ഭക്ഷണ ഡെലിവറി', restaurants: 'റെസ്റ്ററന്റുകൾ', addToCart: 'കാർട്ടിലേക്ക് ചേർക്കുക', viewMenu: 'മെനു കാണുക' },
  pharmacy: { ...en.pharmacy, title: 'ഫാർമസി', orderMedicine: 'മരുന്ന് ഓർഡർ', searchMedicine: 'മരുന്ന് തിരയുക' },
  doctor: { ...en.doctor, title: 'ഡോക്ടർ', findDoctor: 'ഡോക്ടറെ കണ്ടെത്തുക', bookAppointment: 'അപ്പോയിന്റ്‌മെന്റ് ബുക്ക്' },
  taxi: { ...en.taxi, title: 'ടാക്സി', bookRide: 'റൈഡ് ബുക്ക്', whereToGo: 'എവിടെ പോകണം?' },
  cart: { ...en.cart, myCart: 'എന്റെ കാർട്ട്', emptyCart: 'നിങ്ങളുടെ കാർട്ട് ശൂന്യമാണ്', subtotal: 'ഉപ ആകെ', total: 'ആകെ', checkout: 'ചെക്ക്ഔട്ട്', placeOrder: 'ഓർഡർ ചെയ്യുക' },
  orders: { ...en.orders, myOrders: 'എന്റെ ഓർഡറുകൾ', delivered: 'ഡെലിവർ ചെയ്തു', cancelled: 'റദ്ദാക്കി', trackOrder: 'ഓർഡർ ട്രാക്ക്' },
  admin: { ...en.admin, dashboard: 'ഡാഷ്‌ബോർഡ്', settings: 'ക്രമീകരണങ്ങൾ' },
  footer: { ...en.footer, about: 'ഞങ്ങളെ കുറിച്ച്', services: 'സേവനങ്ങൾ' },
  notifications: { ...en.notifications, title: 'അറിയിപ്പുകൾ' },
  promos: { ...en.promos, freeDelivery: 'സൗജന്യ ഡെലിവറി' },
  errors: { ...en.errors, somethingWentWrong: 'എന്തോ കുഴപ്പമുണ്ടായി', pageNotFound: 'പേജ് കണ്ടെത്തിയില്ല', tryAgain: 'വീണ്ടും ശ്രമിക്കുക', goHome: 'ഹോമിലേക്ക് പോകുക' },
};

export default ml;
