/// KARTSEEK — Shared Route Constants
///
/// Provides route constants used by screens in both Customer and Partner apps.
/// These constants define the logical route names. Each app's router
/// (CustomerRouter / PartnerRouter) maps these to actual screen widgets.
///
/// This is the backward-compatible bridge: screens reference [AppRouter.marketplace]
/// and the app's [onGenerateRoute] resolves it to the correct screen.
class AppRouter {
  AppRouter._();

  // ── Auth ──────────────────────────────────────────────────────────────────
  static const String login = '/login';
  static const String signUp = '/signup';
  static const String profile = '/profile';
  static const String profileFeature = '/profile/feature';

  // ── Profile ───────────────────────────────────────────────────────────────
  static const String editProfile = '/profile/edit';
  static const String savedAddresses = '/profile/addresses';
  static const String paymentMethods = '/profile/payment';
  static const String changePassword = '/profile/password';
  static const String reviewsRatings = '/profile/reviews';
  static const String couponsOffers = '/profile/coupons';
  static const String wallet = '/profile/wallet';
  static const String loyaltyPoints = '/profile/loyalty';
  static const String referEarn = '/profile/refer';
  static const String termsConditions = '/profile/terms';
  static const String privacyPolicy = '/profile/privacy';
  static const String aboutKartseek = '/profile/about';

  // ── Central ───────────────────────────────────────────────────────────────
  static const String home = '/';
  static const String notifications = '/notifications';
  static const String orders = '/orders';
  static const String settings = '/settings';
  static const String search = '/search';

  // ── Marketplace ───────────────────────────────────────────────────────────
  static const String marketplace = '/marketplace';
  static const String productDetail = '/marketplace/product';
  static const String cart = '/marketplace/cart';
  static const String categoryProducts = '/marketplace/category';
  static const String categoryDetail = '/marketplace/category/detail';
  static const String subcategoryDetail = '/marketplace/subcategory';
  static const String productListing = '/marketplace/listing';
  static const String checkout = '/marketplace/checkout';
  static const String checkoutSuccess = '/marketplace/checkout/success';
  static const String checkoutFailed = '/marketplace/checkout/failed';
  static const String wishlist = '/marketplace/wishlist';
  static const String deals = '/marketplace/deals';
  static const String flashDeals = '/marketplace/flash-deals';
  static const String featuredProducts = '/marketplace/featured';
  static const String recentlyViewed = '/marketplace/recently-viewed';
  static const String topBrands = '/marketplace/top-brands';
  static const String verifiedSellers = '/marketplace/verified-sellers';
  static const String orderDetail = '/marketplace/order';
  static const String orderHistory = '/marketplace/orders';
  static const String marketplaceSearch = '/marketplace/search';
  static const String categoryList = '/marketplace/categories';
  static const String brandDetail = '/marketplace/brand';
  static const String sellerStore = '/marketplace/seller';
  static const String addressSelection = '/marketplace/address';
  static const String payment = '/marketplace/payment';
  static const String orderTracking = '/marketplace/order/tracking';
  static const String cancelOrder = '/marketplace/order/cancel';
  static const String refundStatus = '/marketplace/refund';
  static const String productReviews = '/marketplace/reviews';
  static const String productQa = '/marketplace/product/qa';
  static const String recommendedProducts = '/marketplace/recommended';
  static const String returns = '/returns';
  static const String support = '/support';

  // ── Grocery ───────────────────────────────────────────────────────────────
  static const String grocery = '/grocery';
  static const String groceryCategoryStores = '/grocery/category-stores';
  static const String storeDetail = '/grocery/store';
  static const String groceryProductDetail = '/grocery/product';
  static const String groceryCheckout = '/grocery/checkout';

  // ── Restaurant ────────────────────────────────────────────────────────────
  static const String restaurant = '/restaurant';
  static const String restaurantDetail = '/restaurant/detail';
  static const String tableBooking = '/restaurant/table-booking';
  static const String foodCustomization = '/restaurant/customize';
  static const String restaurantCheckout = '/restaurant/checkout';
  static const String restaurantCart = '/restaurant/cart';
  static const String restaurantOrderHistory = '/restaurant/history';
  static const String foodItemDetail = '/restaurant/food-item';
  static const String restaurantTracking = '/restaurant/tracking';
  static const String takeawayPickupTime = '/restaurant/takeaway/pickup-time';
  static const String takeawayCheckout = '/restaurant/takeaway/checkout';
  static const String takeawaySuccess = '/restaurant/takeaway/success';
  static const String takeawayTracking = '/restaurant/takeaway/tracking';
  static const String dineInTableSelection = '/restaurant/dine-in/table-selection';
  static const String dineInCheckout = '/restaurant/dine-in/checkout';
  static const String dineInSuccess = '/restaurant/dine-in/success';
  static const String dineInTracking = '/restaurant/dine-in/tracking';

  // ── Doctor ────────────────────────────────────────────────────────────────
  static const String doctor = '/doctor';
  static const String doctorBooking = '/doctor/booking';

  // ── Pharmacy ──────────────────────────────────────────────────────────────
  static const String pharmacy = '/pharmacy';
  static const String medicineDetail = '/pharmacy/medicine';
  static const String prescriptionUpload = '/pharmacy/prescription';
  static const String pharmacyStoreDetail = '/pharmacy/store';
  static const String pharmacyCategoryProducts = '/pharmacy/category';
  static const String pharmacyCheckout = '/pharmacy/checkout';
  static const String pharmacyCart = '/pharmacy/cart';
  static const String pharmacyOrderTracking = '/pharmacy/tracking';

  // ── Hotel Booking ──────────────────────────────────────────────────────────
  static const String hotelBooking = '/hotel-booking';
  static const String hotelSearch = '/hotel-booking/search';
  static const String hotelSearchResults = '/hotel-booking/search';
  static const String hotelDetail = '/hotel-booking/detail';
  static const String hotelCheckout = '/hotel-booking/checkout';
  static const String hotelConfirmation = '/hotel-booking/confirmation';
  static const String hotelMyBookings = '/hotel-booking/my-bookings';
  static const String hotelSavedHotels = '/hotel-booking/saved';
  static const String hotelCancelModify = '/hotel-booking/cancel-modify';
  static const String hotelSearchFilters = '/hotel-booking/search-filters';
  static const String hotelMapSearch = '/hotel-booking/map-search';
  static const String hotelReviews = '/hotel-booking/reviews';
  static const String hotelGallery = '/hotel-booking/gallery';
  static const String hotelRoomTypes = '/hotel-booking/room-types';
  static const String hotelDeals = '/hotel-booking/deals';
  static const String hotelTripPlanner = '/hotel-booking/trip-planner';
  static const String hotelCompare = '/hotel-booking/compare';
  static const String hotelPriceAlerts = '/hotel-booking/price-alerts';


  // ── Taxi (customer booking) ───────────────────────────────────────────────
  static const String taxi = '/taxi';
  static const String rideTracking = '/taxi/tracking';
  static const String nearbyDrivers = '/taxi/nearby-drivers';
  static const String taxiPlanTrip = '/taxi/plan-trip';
  static const String taxiSearchDestination = '/taxi/search-destination';
  static const String taxiConfirmPickup = '/taxi/confirm-pickup';
  static const String taxiPaymentMethods = '/taxi/payment-methods';
  static const String taxiPayWith = '/taxi/pay-with';
  static const String taxiDriverSearching = '/taxi/driver-searching';
  static const String taxiTripComplete = '/taxi/trip-complete';

  // ── Partner (Driver / Delivery) ───────────────────────────────────────────
  static const String partnerLogin = '/partner/login';
  static const String partnerDashboard = '/partner/dashboard';
  static const String partnerDriverDashboard = '/partner/driver';
  static const String partnerDeliveryDashboard = '/partner/delivery';
  static const String partnerProfile = '/partner/profile';
  static const String partnerEditProfile = '/partner/profile/edit';
  static const String partnerSettings = '/partner/settings';
  static const String partnerNotifications = '/partner/notifications';
  static const String partnerEarnings = '/partner/earnings';
  static const String partnerWallet = '/partner/wallet';
  static const String partnerLedger = '/partner/ledger';
  static const String partnerDocuments = '/partner/documents';
  static const String partnerSupport = '/partner/support';
  static const String partnerRating = '/partner/rating';
  static const String partnerVehicleDetails = '/partner/vehicle';
  static const String partnerBankDetails = '/partner/bank';
  static const String partnerKycStatus = '/partner/kyc';

  // ── Partner — Rides ────────────────────────────────────────────────────────
  static const String partnerIncomingRide = '/partner/ride/incoming';
  static const String partnerActiveTrip = '/partner/ride/active';
  static const String partnerPickupNav = '/partner/ride/pickup';
  static const String partnerTripOtp = '/partner/ride/otp';
  static const String partnerTripPayment = '/partner/ride/payment';
  static const String partnerTripCompleted = '/partner/ride/completed';
  static const String partnerTripHistory = '/partner/ride/history';
  static const String driverActiveRide = '/partner/ride/driver';

  // ── Partner — Deliveries ───────────────────────────────────────────────────
  static const String partnerIncomingDelivery = '/partner/delivery/incoming';
  static const String partnerActiveDelivery = '/partner/delivery/active';
  static const String partnerDeliveryOtp = '/partner/delivery/otp';
  static const String partnerDeliveryPayment = '/partner/delivery/payment';
  static const String partnerDeliveryCompleted = '/partner/delivery/completed';
  static const String partnerDeliveryHistory = '/partner/delivery/history';

  // ── Partner — Auth ─────────────────────────────────────────────────────────
  static const String partnerRegister = '/partner/register';
  static const String partnerForgotPassword = '/partner/forgot-password';
  static const String partnerOtpVerify = '/partner/otp-verify';
}
