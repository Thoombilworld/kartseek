import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/route_helpers.dart';
// Legacy TaxiBloc removed — new module uses BookingBloc via generateTaxiRoute()
import 'package:kartseek_customer/features/taxi_booking/taxi_booking_routes.dart';
// Auth (shared)
import 'package:shared_mobile/features/auth/screens/login_screen.dart';
import 'package:shared_mobile/features/auth/screens/signup_screen.dart';
import 'package:shared_mobile/features/auth/screens/profile_screen.dart';
import 'package:shared_mobile/features/auth/screens/profile_feature_screen.dart';
// Central
import 'package:kartseek_customer/features/home/screens/super_app_home.dart';
import 'package:kartseek_customer/features/home/screens/notifications_screen.dart';
import 'package:kartseek_customer/features/home/screens/orders_screen.dart';
import 'package:kartseek_customer/features/home/screens/settings_screen.dart';
import 'package:kartseek_customer/features/home/screens/search_screen.dart';
// Profile
import 'package:kartseek_customer/features/profile/screens/edit_profile_screen.dart';
import 'package:kartseek_customer/features/profile/screens/saved_addresses_screen.dart';
import 'package:kartseek_customer/features/profile/screens/payment_methods_screen.dart';
import 'package:kartseek_customer/features/profile/screens/change_password_screen.dart';
import 'package:kartseek_customer/features/profile/screens/reviews_ratings_screen.dart';
import 'package:kartseek_customer/features/profile/screens/coupons_offers_screen.dart';
import 'package:kartseek_customer/features/profile/screens/wallet_screen.dart';
import 'package:kartseek_customer/features/profile/screens/loyalty_points_screen.dart';
import 'package:kartseek_customer/features/profile/screens/refer_earn_screen.dart';
import 'package:kartseek_customer/features/profile/screens/terms_conditions_screen.dart';
import 'package:kartseek_customer/features/profile/screens/privacy_policy_screen.dart';
import 'package:kartseek_customer/features/profile/screens/about_kartseek_screen.dart';
// Marketplace
import 'package:kartseek_customer/features/marketplace/screens/marketplace_home_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/product_detail_screen.dart';
import 'package:kartseek_customer/features/cart/screens/cart_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/category_products_screen.dart';
import 'package:kartseek_customer/features/checkout/screens/checkout_screen.dart';
import 'package:kartseek_customer/features/checkout/screens/checkout_success_screen.dart';
import 'package:kartseek_customer/features/checkout/screens/checkout_failed_screen.dart';
import 'package:kartseek_customer/features/wishlist/screens/wishlist_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/deals_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/flash_deals_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/featured_products_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/recently_viewed_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/top_brands_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/verified_sellers_screen.dart';
import 'package:kartseek_customer/features/orders/screens/order_detail_screen.dart';
import 'package:kartseek_customer/features/orders/screens/order_history_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/marketplace_search_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/category_list_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/category_detail_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/subcategory_detail_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/product_listing_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/brand_detail_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/seller_store_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/address_selection_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/payment_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/order_tracking_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/cancel_order_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/refund_status_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/reviews_ratings_screen.dart' as marketplace_reviews;
import 'package:kartseek_customer/features/marketplace/screens/write_review_screen.dart';
import 'package:kartseek_customer/features/marketplace/screens/recommended_products_screen.dart';
import 'package:kartseek_customer/features/returns/screens/returns_screen.dart';
import 'package:kartseek_customer/features/support/screens/support_screen.dart';
// Grocery
import 'package:kartseek_customer/features/grocery/screens/grocery_home_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_category_stores_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/store_detail_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_product_detail_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_checkout_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_cart_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_search_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_order_tracking_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_category_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_flash_deals_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_recently_viewed_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_barcode_scanner_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_address_picker_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_delivery_slot_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_payment_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_order_confirmation_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_order_history_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_order_detail_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_rate_review_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_subscriptions_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_notifications_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_addresses_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_coupons_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_gift_cards_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_chat_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_help_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_refer_earn_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_language_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_settings_screen.dart';
import 'package:kartseek_customer/features/grocery/screens/grocery_brand_screen.dart';  // contains GroceryBrandListScreen
import 'package:kartseek_customer/features/grocery/screens/grocery_wishlist_screen.dart';
// Restaurant
import 'package:kartseek_customer/features/restaurant/screens/restaurant_home_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_detail_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/table_booking_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/food_customization_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_checkout_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_order_tracking_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_cart_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/food_item_detail_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_order_history_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/takeaway_pickup_time_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/takeaway_checkout_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/takeaway_order_success_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/takeaway_order_tracking_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/dine_in_table_selection_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/dine_in_checkout_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/dine_in_order_success_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/dine_in_order_tracking_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_search_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_review_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_addresses_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_address_picker_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_coupons_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_gift_cards_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_payment_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_delivery_slot_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_chat_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_notifications_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_help_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_settings_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_language_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_refer_earn_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_recently_viewed_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_subscriptions_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_wishlist_screen.dart';
import 'package:kartseek_customer/features/restaurant/screens/restaurant_flash_deals_screen.dart';
// Doctor
import 'package:kartseek_customer/features/doctor/screens/doctor_home_screen.dart';
import 'package:kartseek_customer/features/doctor/screens/doctor_booking_screen.dart';
import 'package:kartseek_customer/features/doctor/screens/doctor_search_screen.dart';
import 'package:kartseek_customer/features/doctor/screens/doctor_profile_screen.dart';
import 'package:kartseek_customer/features/doctor/screens/appointment_detail_screen.dart';
import 'package:kartseek_customer/features/doctor/screens/doctor_review_screen.dart';
import 'package:kartseek_customer/features/doctor/screens/video_consult_screen.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_bloc.dart';
// Pharmacy
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_home_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/medicine_detail_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/prescription_upload_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_store_detail_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_category_products_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_checkout_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_cart_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_order_tracking_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_order_history_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_search_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_categories_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_address_picker_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_delivery_slot_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_payment_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_order_confirmation_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_order_detail_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_prescriptions_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_prescription_detail_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_review_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_offers_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_brands_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_near_me_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_reorder_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_notifications_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_generic_alternatives_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_scanner_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_articles_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_refund_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_wallet_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_live_tracking_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_driver_chat_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_add_address_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_edit_address_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_location_permission_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_coupon_selection_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_cancel_order_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_damaged_product_complaint_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_missing_item_complaint_screen.dart';
import 'package:kartseek_customer/features/pharmacy/screens/pharmacy_support_ticket_screen.dart';
// Hotel Booking
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_booking_home_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_search_results_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_detail_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_checkout_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_booking_confirmation_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_bloc.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_my_bookings_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_saved_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_cancel_modify_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_search_filters_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_map_search_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_reviews_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_gallery_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_room_types_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_deals_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_trip_planner_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_compare_screen.dart';
import 'package:kartseek_customer/features/hotel_booking/screens/hotel_price_alerts_screen.dart';
// ── Legacy taxi module deleted ──────────────────────────────────────────────
// All /taxi/* routes are handled by the taxi_booking module via
// generateTaxiRoute() in taxi_booking_routes.dart. The legacy features/taxi/
// directory was fully removed on 2026-07-07.
import 'package:kartseek_customer/features/taxi_booking/presentation/screens/ride_history_screen.dart';
import 'package:kartseek_customer/features/taxi_booking/presentation/screens/rental_booking_screen.dart';
import 'package:kartseek_customer/features/taxi_booking/presentation/screens/intercity_booking_screen.dart';
// Restaurant bloc for inline providers
import 'package:kartseek_customer/features/restaurant/blocs/restaurant_bloc.dart';
import 'package:kartseek_customer/features/marketplace/screens/product_qa_screen.dart';

/// Customer-only route definitions for the KARTSEEK Customer App.
/// Contains routes for all customer-facing modules only.
class CustomerRouter {
  CustomerRouter._();

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
  static const String groceryCart = '/grocery/cart';
  static const String grocerySearch = '/grocery/search';
  static const String groceryOrderTracking = '/grocery/tracking';
  static const String groceryCategories = '/grocery/categories';
  static const String groceryFlashDeals = '/grocery/flash-deals';
  static const String groceryRecentlyViewed = '/grocery/recently-viewed';
  static const String groceryBarcodeScan = '/grocery/barcode-scan';
  static const String groceryAddressPicker = '/grocery/address-picker';
  static const String groceryDeliverySlot = '/grocery/delivery-slot';
  static const String groceryPayment = '/grocery/payment';
  static const String groceryOrderConfirmed = '/grocery/order-confirmed';
  static const String groceryOrderHistory = '/grocery/order-history';
  static const String groceryOrderDetail = '/grocery/order-detail';
  static const String groceryReview = '/grocery/review';
  static const String grocerySubscriptions = '/grocery/subscriptions';
  static const String groceryNotifications = '/grocery/notifications';
  static const String groceryAddresses = '/grocery/addresses';
  static const String groceryCoupons = '/grocery/coupons';
  static const String groceryGiftCards = '/grocery/gift-cards';
  static const String groceryChat = '/grocery/chat';
  static const String groceryHelp = '/grocery/help';
  static const String groceryReferEarn = '/grocery/refer-earn';
  static const String groceryLanguage = '/grocery/language';
  static const String grocerySettings = '/grocery/settings';
  static const String groceryBrand = '/grocery/brand';
  static const String groceryWishlist = '/grocery/wishlist';

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
  static const String restaurantSearch = '/restaurant/search';
  static const String restaurantReview = '/restaurant/review';
  static const String restaurantAddresses = '/restaurant/addresses';
  static const String restaurantAddressPicker = '/restaurant/address-picker';
  static const String restaurantCoupons = '/restaurant/coupons';
  static const String restaurantGiftCards = '/restaurant/gift-cards';
  static const String restaurantPayment = '/restaurant/payment';
  static const String restaurantDeliverySlot = '/restaurant/delivery-slot';
  static const String restaurantChat = '/restaurant/chat';
  static const String restaurantNotifications = '/restaurant/notifications';
  static const String restaurantHelp = '/restaurant/help';
  static const String restaurantSettings = '/restaurant/settings';
  static const String restaurantLanguage = '/restaurant/language';
  static const String restaurantReferEarn = '/restaurant/refer-earn';
  static const String restaurantRecentlyViewed = '/restaurant/recently-viewed';
  static const String restaurantSubscriptions = '/restaurant/subscriptions';
  static const String restaurantWishlist = '/restaurant/wishlist';
  static const String restaurantFlashDeals = '/restaurant/flash-deals';

  // ── Doctor ────────────────────────────────────────────────────────────────
  static const String doctor = '/doctor';
  static const String doctorBooking = '/doctor/booking';
  static const String doctorSearch = '/doctor/search';
  static const String doctorProfile = '/doctor/profile';
  static const String appointmentDetail = '/doctor/appointment';
  static const String doctorReview = '/doctor/review';
  static const String videoConsult = '/doctor/video-consult';

  // ── Pharmacy ──────────────────────────────────────────────────────────────
  static const String pharmacy = '/pharmacy';
  static const String medicineDetail = '/pharmacy/medicine';
  static const String prescriptionUpload = '/pharmacy/prescription';
  static const String pharmacyStoreDetail = '/pharmacy/store';
  static const String pharmacyCategoryProducts = '/pharmacy/category';
  static const String pharmacyCheckout = '/pharmacy/checkout';
  static const String pharmacyCart = '/pharmacy/cart';
  static const String pharmacyOrderTracking = '/pharmacy/tracking';
  static const String pharmacyOrderHistory = '/pharmacy/history';
  // Phase 2 — new routes
  static const String pharmacySearch = '/pharmacy/search';
  static const String pharmacyCategories = '/pharmacy/categories';
  static const String pharmacyBrands = '/pharmacy/brands';
  static const String pharmacyOffers = '/pharmacy/offers';
  static const String pharmacyNearMe = '/pharmacy/near-me';
  static const String pharmacyAddressPicker = '/pharmacy/address-picker';
  static const String pharmacyDeliverySlot = '/pharmacy/delivery-slot';
  static const String pharmacyPayment = '/pharmacy/payment';
  static const String pharmacyOrderConfirmation = '/pharmacy/order-confirmed';
  static const String pharmacyOrderDetail = '/pharmacy/order-detail';
  static const String pharmacyPrescriptions = '/pharmacy/prescriptions';
  static const String pharmacyPrescriptionDetail = '/pharmacy/prescription-detail';
  static const String pharmacyReview = '/pharmacy/review';
  static const String pharmacyReorder = '/pharmacy/reorder';
  static const String pharmacyNotifications = '/pharmacy/notifications';
  static const String pharmacyGenericAlternatives = '/pharmacy/generic-alternatives';
  static const String pharmacyScanner = '/pharmacy/scanner';
  static const String pharmacyArticles = '/pharmacy/articles';
  static const String pharmacyRefund = '/pharmacy/refund';
  static const String pharmacyWallet = '/pharmacy/wallet';
  static const String pharmacyLiveTracking = '/pharmacy/live-tracking';
  static const String pharmacyDriverChat = '/pharmacy/driver-chat';
  static const String pharmacyAddAddress = '/pharmacy/add-address';
  static const String pharmacyEditAddress = '/pharmacy/edit-address';
  static const String pharmacyLocationPermission = '/pharmacy/location-permission';
  static const String pharmacyCouponSelection = '/pharmacy/coupon-selection';
  static const String pharmacyCancelOrder = '/pharmacy/cancel-order';
  static const String pharmacyDamagedComplaint = '/pharmacy/damaged-complaint';
  static const String pharmacyMissingItemComplaint = '/pharmacy/missing-item-complaint';
  static const String pharmacySupportTicket = '/pharmacy/support-ticket';


  // ── Hotel Booking ──────────────────────────────────────────────────────────
  static const String hotelBooking = '/hotel-booking';
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
  static const String taxiRideHistory = '/taxi/ride-history';
  static const String taxiRentals = '/taxi/rentals';
  static const String taxiIntercity = '/taxi/intercity';
  static const String rideReceipt = '/taxi/receipt';
  static const String taxiSOS = '/taxi/sos';
  static const String taxiSplitFare = '/taxi/split-fare';
  static const String taxiRateDriver = '/taxi/rate-driver';
  static const String taxiScheduledRides = '/taxi/scheduled';
  static const String taxiSavedPlaces = '/taxi/saved-places';
  static const String taxiPromo = '/taxi/promo';

  // ── Route Generator ───────────────────────────────────────────────────────
  static Route<dynamic> generateRoute(RouteSettings settings) {
    // New taxi booking module (clean architecture) takes priority over legacy routes.
    // Handles all /taxi/* paths with BookingBloc, polylines, car markers, etc.
    final taxiRoute = generateTaxiRoute(settings);
    if (taxiRoute != null) return taxiRoute;

    switch (settings.name) {
      // Auth
      case login:
        return RouteHelpers.fadeRoute(const LoginScreen(), settings);
      case signUp:
        return RouteHelpers.slideRoute(const SignUpScreen(), settings);
      case profile:
        return RouteHelpers.slideRoute(const ProfileScreen(), settings);
      case profileFeature:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(ProfileFeatureScreen(title: args['title'] ?? 'Feature'), settings);

      // Profile
      case editProfile: return RouteHelpers.slideRoute(const EditProfileScreen(), settings);
      case savedAddresses: return RouteHelpers.slideRoute(const SavedAddressesScreen(), settings);
      case paymentMethods: return RouteHelpers.slideRoute(const PaymentMethodsScreen(), settings);
      case changePassword: return RouteHelpers.slideRoute(const ChangePasswordScreen(), settings);
      case reviewsRatings: return RouteHelpers.slideRoute(const ReviewsRatingsScreen(), settings);
      case couponsOffers: return RouteHelpers.slideRoute(const CouponsOffersScreen(), settings);
      case wallet: return RouteHelpers.slideRoute(const WalletScreen(), settings);
      case loyaltyPoints: return RouteHelpers.slideRoute(const LoyaltyPointsScreen(), settings);
      case referEarn: return RouteHelpers.slideRoute(const ReferEarnScreen(), settings);
      case termsConditions: return RouteHelpers.slideRoute(const TermsConditionsScreen(), settings);
      case privacyPolicy: return RouteHelpers.slideRoute(const PrivacyPolicyScreen(), settings);
      case aboutKartseek: return RouteHelpers.slideRoute(const AboutKartseekScreen(), settings);

      // Central
      case home:
        return RouteHelpers.fadeRoute(const SuperAppHome(), settings);
      case notifications:
        return RouteHelpers.slideRoute(const NotificationsScreen(), settings);
      case CustomerRouter.orders:
        return RouteHelpers.slideRoute(const OrdersScreen(), settings);
      case CustomerRouter.settings:
        return RouteHelpers.slideRoute(const SettingsScreen(), settings);
      case search:
        final args = settings.arguments;
        if (args is Map<String, String>) {
          return RouteHelpers.slideRoute(
            SearchScreen(module: args['module'] ?? 'all', initialQuery: args['initialQuery']),
            settings,
          );
        }
        final module = args as String? ?? 'all';
        return RouteHelpers.slideRoute(SearchScreen(module: module), settings);

      // Marketplace
      case marketplace:
        return RouteHelpers.slideRoute(const MarketplaceHomeScreen(), settings);
      case productDetail:
        // The argument is a product id. It used to be a product *name*, with
        // 'iPhone 15 Pro Max' as the default — so a deep link with no argument
        // opened a specific hardcoded product, and two products sharing a name
        // were the same page. An id is required; there is no sensible default
        // for "which product", so a missing one is a routing bug worth seeing.
        final productId = settings.arguments is String
            ? settings.arguments as String
            : (settings.arguments as Map?)?['productId'] as String?;
        if (productId == null || productId.isEmpty) {
          return RouteHelpers.slideRoute(
            const _MissingRouteArgument(what: 'product'),
            settings,
          );
        }
        return RouteHelpers.deferredSlideRoute(
            ProductDetailScreen(productId: productId), settings);
      case cart:
        return RouteHelpers.slideRoute(const CartScreen(), settings);
      case categoryProducts:
        final args = settings.arguments;
        if (args is Map<String, dynamic>) {
          return RouteHelpers.slideRoute(CategoryProductsScreen(categoryId: args['id'] ?? 'c1', categoryName: args['name'] ?? 'Products', accentColor: args['color'] ?? AppTheme.marketplaceColor), settings);
        }
        return RouteHelpers.slideRoute(const CategoryProductsScreen(categoryId: 'c1', categoryName: 'Products'), settings);
      case categoryDetail:
        final args = settings.arguments;
        if (args is Map<String, dynamic>) {
          return RouteHelpers.deferredSlideRoute(CategoryDetailScreen(categoryId: args['id'] ?? 'c1', categoryName: args['name'] ?? 'Category'), settings);
        }
        return RouteHelpers.deferredSlideRoute(const CategoryDetailScreen(categoryId: 'c1'), settings);
      case subcategoryDetail:
        final args = settings.arguments;
        if (args is Map<String, dynamic>) {
          return RouteHelpers.slideRoute(SubcategoryDetailScreen(subcategoryId: args['id'] ?? 'sc1', subcategoryName: args['name'] ?? 'Subcategory'), settings);
        }
        return RouteHelpers.slideRoute(const SubcategoryDetailScreen(subcategoryId: 'sc1'), settings);
      case productListing:
        final args = settings.arguments;
        if (args is Map<String, dynamic>) {
          return RouteHelpers.slideRoute(ProductListingScreen(title: args['title'] ?? 'Products', categoryId: args['categoryId'], subcategoryId: args['subcategoryId'], brandId: args['brandId'], sellerId: args['sellerId']), settings);
        }
        return RouteHelpers.slideRoute(const ProductListingScreen(), settings);
      case checkout:
        return RouteHelpers.slideRoute(const CheckoutScreen(), settings);
      case checkoutSuccess:
        return RouteHelpers.fadeRoute(const CheckoutSuccessScreen(), settings);
      case checkoutFailed:
        return RouteHelpers.fadeRoute(const CheckoutFailedScreen(), settings);
      case wishlist:
        return RouteHelpers.slideRoute(const WishlistScreen(), settings);
      case deals:
        return RouteHelpers.slideRoute(const DealsScreen(), settings);
      case flashDeals:
        return RouteHelpers.slideRoute(const FlashDealsScreen(), settings);
      case featuredProducts:
        return RouteHelpers.slideRoute(const FeaturedProductsScreen(), settings);
      case recentlyViewed:
        return RouteHelpers.slideRoute(const RecentlyViewedScreen(), settings);
      case topBrands:
        return RouteHelpers.slideRoute(const TopBrandsScreen(), settings);
      case verifiedSellers:
        return RouteHelpers.slideRoute(const VerifiedSellersScreen(), settings);
      case orderDetail:
        final id = settings.arguments as String? ?? 'KS-2026-78432';
        return RouteHelpers.slideRoute(OrderDetailScreen(orderId: id), settings);
      case orderHistory:
        return RouteHelpers.slideRoute(const OrderHistoryScreen(), settings);
      case marketplaceSearch:
        final query = settings.arguments as String?;
        return RouteHelpers.slideRoute(MarketplaceSearchScreen(initialQuery: query), settings);
      case categoryList:
        return RouteHelpers.slideRoute(const CategoryListScreen(), settings);
      case brandDetail:
        // Was `settings.arguments as String? ?? 'Apple'` — a link with no
        // argument opened Apple's page, and the screen then matched products by
        // comparing brand names. Both screens key on ids now.
        final brandArgs = settings.arguments;
        final brandId = brandArgs is Map ? brandArgs['brandId']?.toString() : null;
        if (brandId == null || brandId.isEmpty) {
          return RouteHelpers.slideRoute(const _MissingRouteArgument(what: 'brand'), settings);
        }
        return RouteHelpers.slideRoute(
          BrandDetailScreen(
            brandId: brandId,
            brandName: brandArgs is Map ? brandArgs['brandName']?.toString() : null,
          ),
          settings,
        );
      case sellerStore:
        final sellerArgs = settings.arguments;
        final sellerId = sellerArgs is Map ? sellerArgs['sellerId']?.toString() : null;
        if (sellerId == null || sellerId.isEmpty) {
          return RouteHelpers.slideRoute(const _MissingRouteArgument(what: 'seller'), settings);
        }
        return RouteHelpers.slideRoute(
          SellerStoreScreen(
            sellerId: sellerId,
            sellerName: sellerArgs is Map ? sellerArgs['sellerName']?.toString() : null,
          ),
          settings,
        );
      case addressSelection:
        return RouteHelpers.slideRoute(const AddressSelectionScreen(), settings);
      case payment:
        return RouteHelpers.slideRoute(const PaymentScreen(), settings);
      case orderTracking:
        final id = settings.arguments as String? ?? 'KS-2026-78432';
        return RouteHelpers.slideRoute(OrderTrackingScreen(orderId: id), settings);
      case cancelOrder:
        final id = settings.arguments as String? ?? 'KS-2026-78432';
        return RouteHelpers.slideRoute(CancelOrderScreen(orderId: id), settings);
      case refundStatus:
        final id = settings.arguments as String? ?? 'KS-2026-78432';
        return RouteHelpers.slideRoute(RefundStatusScreen(orderId: id), settings);
      case productQa:
        // Q&A was written, complete, and unrouted — nothing anywhere could open
        // it, which is part of why nobody noticed its "Submit Question" button
        // only inserted into local state.
        final qaArgs = settings.arguments;
        final qaProductId = qaArgs is Map ? qaArgs['productId']?.toString() : null;
        if (qaProductId == null || qaProductId.isEmpty) {
          return RouteHelpers.slideRoute(const _MissingRouteArgument(what: 'product'), settings);
        }
        return RouteHelpers.slideRoute(
          ProductQAScreen(
            productId: qaProductId,
            productName: qaArgs is Map ? qaArgs['productName']?.toString() : null,
          ),
          settings,
        );
      case productReviews:
        // The product page pushes a Map — `{productId, productName,
        // writeReview}` — and this cast it with `as String?`, which yields null
        // for a Map, so every reviews screen opened titled 'Product' with no
        // product behind it. It also had nowhere to send `writeReview: true`,
        // which is why WriteReviewScreen sat unrouted and unreachable.
        final reviewArgs = settings.arguments;
        final reviewProductId = reviewArgs is Map ? reviewArgs['productId']?.toString() : null;
        final reviewProductName = reviewArgs is Map
            ? (reviewArgs['productName']?.toString() ?? 'Product')
            : (reviewArgs as String? ?? 'Product');
        final wantsWriteReview = reviewArgs is Map && reviewArgs['writeReview'] == true;

        if (wantsWriteReview) {
          if (reviewProductId == null || reviewProductId.isEmpty) {
            return RouteHelpers.slideRoute(
              const _MissingRouteArgument(what: 'review form'),
              settings,
            );
          }
          return RouteHelpers.slideRoute(
            WriteReviewScreen(productId: reviewProductId, productName: reviewProductName),
            settings,
          );
        }
        return RouteHelpers.slideRoute(
            marketplace_reviews.ReviewsRatingsScreen(productName: reviewProductName), settings);
      case recommendedProducts:
        return RouteHelpers.slideRoute(const RecommendedProductsScreen(), settings);
      case CustomerRouter.returns:
        final id = settings.arguments as String? ?? 'KS-2026-78432';
        return RouteHelpers.slideRoute(ReturnsScreen(orderId: id), settings);
      case CustomerRouter.support:
        final id = settings.arguments as String?;
        return RouteHelpers.slideRoute(SupportScreen(orderId: id), settings);

      // Grocery
      case grocery:
        return RouteHelpers.slideRoute(const GroceryHomeScreen(), settings);
      case groceryCategoryStores:
        // Accepts new-style Map<String, dynamic> with categoryId + categoryName
        // OR legacy String (backward compat for any existing callers).
        final args = settings.arguments;
        String catName = 'Category';
        if (args is Map<String, dynamic>) {
          catName = args['categoryName'] as String? ?? 'Category';
        } else if (args is String) {
          catName = args;
        }
        return RouteHelpers.slideRoute(GroceryCategoryStoresScreen(categoryName: catName), settings);
      case storeDetail:
        final name = settings.arguments as String? ?? 'FreshMart Supermarket';
        return RouteHelpers.slideRoute(StoreDetailScreen(storeName: name), settings);
      case groceryProductDetail:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(GroceryProductDetailScreen(productData: args), settings);
      case groceryCheckout:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(GroceryCheckoutScreen(cartData: args), settings);
      case groceryCart:
        return RouteHelpers.slideRoute(const GroceryCartScreen(), settings);
      case grocerySearch:
        return RouteHelpers.slideRoute(const GrocerySearchScreen(), settings);
      case groceryOrderTracking:
        final id = settings.arguments as String? ?? 'GR-1234';
        return RouteHelpers.slideRoute(GroceryOrderTrackingScreen(orderId: id), settings);
      case groceryCategories:
        return RouteHelpers.slideRoute(const GroceryCategoryScreen(), settings);
      case groceryFlashDeals:
        return RouteHelpers.slideRoute(const GroceryFlashDealsScreen(), settings);
      case groceryRecentlyViewed:
        return RouteHelpers.slideRoute(const GroceryRecentlyViewedScreen(), settings);
      case groceryBarcodeScan:
        return RouteHelpers.slideRoute(const GroceryBarcodeScannerScreen(), settings);
      case groceryAddressPicker:
        return RouteHelpers.slideRoute(const GroceryAddressPickerScreen(), settings);
      case groceryDeliverySlot:
        return RouteHelpers.slideRoute(const GroceryDeliverySlotScreen(), settings);
      case groceryPayment:
        return RouteHelpers.slideRoute(const GroceryPaymentScreen(), settings);
      case groceryOrderConfirmed:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.fadeRoute(GroceryOrderConfirmationScreen(orderId: args['orderId'] as String?), settings);
      case groceryOrderHistory:
        return RouteHelpers.slideRoute(const GroceryOrderHistoryScreen(), settings);
      case groceryOrderDetail:
        final id = settings.arguments as String? ?? 'GR-1234';
        return RouteHelpers.slideRoute(GroceryOrderDetailScreen(orderId: id), settings);
      case groceryReview:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(GroceryRateReviewScreen(productName: args['productName'] as String?), settings);
      case grocerySubscriptions:
        return RouteHelpers.slideRoute(const GrocerySubscriptionsScreen(), settings);
      case groceryNotifications:
        return RouteHelpers.slideRoute(const GroceryNotificationsScreen(), settings);
      case groceryAddresses:
        return RouteHelpers.slideRoute(const GroceryAddressesScreen(), settings);
      case groceryCoupons:
        return RouteHelpers.slideRoute(const GroceryCouponsScreen(), settings);
      case groceryGiftCards:
        return RouteHelpers.slideRoute(const GroceryGiftCardsScreen(), settings);
      case groceryChat:
        return RouteHelpers.slideRoute(const GroceryChatScreen(), settings);
      case groceryHelp:
        return RouteHelpers.slideRoute(const GroceryHelpScreen(), settings);
      case groceryReferEarn:
        return RouteHelpers.slideRoute(const GroceryReferEarnScreen(), settings);
      case groceryLanguage:
        return RouteHelpers.slideRoute(const GroceryLanguageScreen(), settings);
      case grocerySettings:
        return RouteHelpers.slideRoute(const GrocerySettingsScreen(), settings);
      case groceryBrand:
        return RouteHelpers.slideRoute(const GroceryBrandListScreen(), settings);
      case groceryWishlist:
        return RouteHelpers.slideRoute(const GroceryWishlistScreen(), settings);

      // Restaurant
      case restaurant:
        return RouteHelpers.slideRoute(const RestaurantHomeScreen(), settings);
      case restaurantDetail:
        final args = settings.arguments;
        if (args is Map<String, dynamic>) {
          return RouteHelpers.slideRoute(RestaurantDetailScreen(
            name: args['name'] as String? ?? 'The Grand Biryani House',
            imageUrl: args['imageUrl'] as String? ?? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
          ), settings);
        }
        final name = args as String? ?? 'The Grand Biryani House';
        return RouteHelpers.slideRoute(RestaurantDetailScreen(name: name), settings);
      case tableBooking:
        return RouteHelpers.slideRoute(const TableBookingScreen(), settings);
      case foodCustomization:
        return RouteHelpers.slideRoute(const FoodCustomizationScreen(), settings);
      case restaurantCheckout:
        return RouteHelpers.slideRoute(const RestaurantCheckoutScreen(), settings);
      case restaurantCart:
        return RouteHelpers.slideRoute(const RestaurantCartScreen(), settings);
      case restaurantOrderHistory:
        return RouteHelpers.slideRoute(const RestaurantOrderHistoryScreen(), settings);
      case foodItemDetail:
        final name = settings.arguments as String? ?? 'Chicken Biryani';
        return RouteHelpers.slideRoute(FoodItemDetailScreen(itemName: name), settings);
      case restaurantTracking:
        return RouteHelpers.slideRoute(const RestaurantOrderTrackingScreen(), settings);
      case takeawayPickupTime:
        return RouteHelpers.slideRoute(const TakeawayPickupTimeScreen(), settings);
      case takeawayCheckout:
        final args = settings.arguments as Map<String, dynamic>?;
        return RouteHelpers.slideRoute(
          BlocProvider(
            create: (_) => RestaurantBloc(),
            child: TakeawayCheckoutScreen(args: args),
          ),
          settings
        );
      case takeawaySuccess:
        final args = settings.arguments as Map<String, dynamic>?;
        return RouteHelpers.slideRoute(TakeawayOrderSuccessScreen(args: args), settings);
      case takeawayTracking:
        final args = settings.arguments as Map<String, dynamic>?;
        return RouteHelpers.slideRoute(TakeawayOrderTrackingScreen(args: args), settings);
      case dineInTableSelection:
        final args = settings.arguments as Map<String, dynamic>?;
        return RouteHelpers.slideRoute(DineInTableSelectionScreen(args: args), settings);
      case dineInCheckout:
        final args = settings.arguments as Map<String, dynamic>?;
        return RouteHelpers.slideRoute(
          BlocProvider(
            create: (_) => RestaurantBloc(),
            child: DineInCheckoutScreen(args: args),
          ),
          settings
        );
      case dineInSuccess:
        final args = settings.arguments as Map<String, dynamic>?;
        return RouteHelpers.fadeRoute(DineInOrderSuccessScreen(args: args), settings);
      case dineInTracking:
        final args = settings.arguments as Map<String, dynamic>?;
        return RouteHelpers.slideRoute(DineInOrderTrackingScreen(args: args), settings);
      case restaurantSearch:
        return RouteHelpers.slideRoute(const RestaurantSearchScreen(), settings);
      case restaurantReview:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        final orderId = args['orderId'] as String? ?? 'ORD-001';
        final restName = args['restaurantName'] as String?;
        return RouteHelpers.slideRoute(RestaurantReviewScreen(orderId: orderId, restaurantName: restName), settings);
      case restaurantAddresses:
        return RouteHelpers.slideRoute(const RestaurantAddressesScreen(), settings);
      case restaurantAddressPicker:
        return RouteHelpers.slideRoute(const RestaurantAddressPickerScreen(), settings);
      case restaurantCoupons:
        return RouteHelpers.slideRoute(const RestaurantCouponsScreen(), settings);
      case restaurantGiftCards:
        return RouteHelpers.slideRoute(const RestaurantGiftCardsScreen(), settings);
      case restaurantPayment:
        return RouteHelpers.slideRoute(const RestaurantPaymentScreen(), settings);
      case restaurantDeliverySlot:
        return RouteHelpers.slideRoute(const RestaurantDeliverySlotScreen(), settings);
      case restaurantChat:
        final args = settings.arguments as Map<String, dynamic>?;
        return RouteHelpers.slideRoute(RestaurantChatScreen(restaurantName: args?['restaurantName'] as String?), settings);
      case restaurantNotifications:
        return RouteHelpers.slideRoute(const RestaurantNotificationsScreen(), settings);
      case restaurantHelp:
        return RouteHelpers.slideRoute(const RestaurantHelpScreen(), settings);
      case restaurantSettings:
        return RouteHelpers.slideRoute(const RestaurantSettingsScreen(), settings);
      case restaurantLanguage:
        return RouteHelpers.slideRoute(const RestaurantLanguageScreen(), settings);
      case restaurantReferEarn:
        return RouteHelpers.slideRoute(const RestaurantReferEarnScreen(), settings);
      case restaurantRecentlyViewed:
        return RouteHelpers.slideRoute(const RestaurantRecentlyViewedScreen(), settings);
      case restaurantSubscriptions:
        return RouteHelpers.slideRoute(const RestaurantSubscriptionsScreen(), settings);
      case restaurantWishlist:
        return RouteHelpers.slideRoute(const RestaurantWishlistScreen(), settings);
      case restaurantFlashDeals:
        return RouteHelpers.slideRoute(const RestaurantFlashDealsScreen(), settings);

      // Doctor
      case doctor:
        return RouteHelpers.slideRoute(
          BlocProvider(
            create: (_) => DoctorBloc(),
            child: const DoctorHomeScreen(),
          ),
          settings,
        );
      case doctorBooking:
        final args = settings.arguments;
        String name = 'Dr. Sarah Kamau';
        DoctorBloc? bloc;

        if (args is Map<String, dynamic>) {
          name = args['doctorName'] as String? ?? name;
          bloc = args['bloc'] as DoctorBloc?;
        } else if (args is String) {
          name = args;
        }

        Widget screen = DoctorBookingScreen(doctorName: name);
        if (bloc != null) {
          screen = BlocProvider.value(value: bloc, child: screen);
        }
        return RouteHelpers.slideRoute(screen, settings);
      case doctorSearch:
        final specialty = settings.arguments as String?;
        return RouteHelpers.slideRoute(
          BlocProvider(
            create: (_) => DoctorBloc(),
            child: DoctorSearchScreen(initialSpecialty: specialty),
          ),
          settings,
        );
      case doctorProfile:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(DoctorProfileScreen(doctorData: args), settings);
      case appointmentDetail:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(AppointmentDetailScreen(appointmentData: args), settings);
      case doctorReview:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(DoctorReviewScreen(appointmentData: args), settings);
      case videoConsult:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.fadeRoute(VideoConsultScreen(appointmentData: args), settings);

      // Pharmacy
      case pharmacy:
        return RouteHelpers.slideRoute(const PharmacyHomeScreen(), settings);
      case medicineDetail:
        final name = settings.arguments as String? ?? 'Dolo 650mg';
        return RouteHelpers.slideRoute(MedicineDetailScreen(name: name), settings);
      case prescriptionUpload:
        return RouteHelpers.slideRoute(const PrescriptionUploadScreen(), settings);
      case pharmacyStoreDetail:
        final name = settings.arguments as String? ?? 'HealthPlus Pharmacy';
        return RouteHelpers.slideRoute(PharmacyStoreDetailScreen(storeName: name), settings);
      case pharmacyCategoryProducts:
        final cat = settings.arguments as String? ?? 'OTC Medicines';
        return RouteHelpers.slideRoute(PharmacyCategoryProductsScreen(categoryName: cat), settings);
      case pharmacyCheckout:
        return RouteHelpers.slideRoute(const PharmacyCheckoutScreen(), settings);
      case pharmacyCart:
        return RouteHelpers.slideRoute(const PharmacyCartScreen(), settings);
      case pharmacyOrderTracking:
        final id = settings.arguments as String? ?? 'PH-2026-1234';
        return RouteHelpers.slideRoute(PharmacyOrderTrackingScreen(orderId: id), settings);
      case pharmacyOrderHistory:
        return RouteHelpers.slideRoute(const PharmacyOrderHistoryScreen(), settings);
      case pharmacySearch:
        return RouteHelpers.slideRoute(const PharmacySearchScreen(), settings);
      case pharmacyCategories:
        return RouteHelpers.slideRoute(const PharmacyCategoriesScreen(), settings);
      case pharmacyBrands:
        return RouteHelpers.slideRoute(const PharmacyBrandsScreen(), settings);
      case pharmacyOffers:
        return RouteHelpers.slideRoute(const PharmacyOffersScreen(), settings);
      case pharmacyNearMe:
        return RouteHelpers.slideRoute(const PharmacyNearMeScreen(), settings);
      case pharmacyAddressPicker:
        return RouteHelpers.slideRoute(const PharmacyAddressPickerScreen(), settings);
      case pharmacyDeliverySlot:
        return RouteHelpers.slideRoute(const PharmacyDeliverySlotScreen(), settings);
      case pharmacyPayment:
        return RouteHelpers.slideRoute(const PharmacyPaymentScreen(), settings);
      case pharmacyOrderConfirmation:
        final id = settings.arguments as String?;
        return RouteHelpers.slideRoute(PharmacyOrderConfirmationScreen(orderId: id), settings);
      case pharmacyOrderDetail:
        final id = settings.arguments as String? ?? 'po-001';
        return RouteHelpers.slideRoute(PharmacyOrderDetailScreen(orderId: id), settings);
      case pharmacyPrescriptions:
        return RouteHelpers.slideRoute(const PharmacyPrescriptionsScreen(), settings);
      case pharmacyPrescriptionDetail:
        final id = settings.arguments as String? ?? 'rx-001';
        return RouteHelpers.slideRoute(PharmacyPrescriptionDetailScreen(prescriptionId: id), settings);
      case pharmacyReview:
        final args = settings.arguments as Map<String, dynamic>?;
        return RouteHelpers.slideRoute(PharmacyReviewScreen(storeId: args?['storeId'] ?? '', storeName: args?['storeName']), settings);
      case pharmacyReorder:
        final id = settings.arguments as String? ?? 'po-001';
        return RouteHelpers.slideRoute(PharmacyReorderScreen(orderId: id), settings);
      case pharmacyNotifications:
        return RouteHelpers.slideRoute(const PharmacyNotificationsScreen(), settings);
      case pharmacyGenericAlternatives:
        final name = settings.arguments as String?;
        return RouteHelpers.slideRoute(PharmacyGenericAlternativesScreen(medicineName: name), settings);
      case pharmacyScanner:
        return RouteHelpers.slideRoute(const PharmacyScannerScreen(), settings);
      case pharmacyArticles:
        return RouteHelpers.slideRoute(const PharmacyArticlesScreen(), settings);
      case pharmacyRefund:
        final id = settings.arguments as String?;
        return RouteHelpers.slideRoute(PharmacyRefundScreen(orderId: id), settings);
      case pharmacyWallet:
        return RouteHelpers.slideRoute(const PharmacyWalletScreen(), settings);
      case pharmacyLiveTracking:
        final orderId = settings.arguments as String?;
        return RouteHelpers.slideRoute(PharmacyLiveTrackingScreen(orderId: orderId ?? ''), settings);
      case pharmacyDriverChat:
        final orderId = settings.arguments as String?;
        return RouteHelpers.slideRoute(PharmacyDriverChatScreen(orderId: orderId ?? ''), settings);
      case pharmacyAddAddress:
        return RouteHelpers.slideRoute(const PharmacyAddAddressScreen(), settings);
      case pharmacyEditAddress:
        final addressId = settings.arguments as String?;
        return RouteHelpers.slideRoute(PharmacyEditAddressScreen(addressId: addressId ?? ''), settings);
      case pharmacyLocationPermission:
        return RouteHelpers.slideRoute(const PharmacyLocationPermissionScreen(), settings);
      case pharmacyCouponSelection:
        return RouteHelpers.slideRoute(const PharmacyCouponSelectionScreen(), settings);
      case pharmacyCancelOrder:
        final orderId = settings.arguments as String?;
        return RouteHelpers.slideRoute(PharmacyCancelOrderScreen(orderId: orderId ?? ''), settings);
      case pharmacyDamagedComplaint:
        final orderId = settings.arguments as String?;
        return RouteHelpers.slideRoute(PharmacyDamagedProductComplaintScreen(orderId: orderId ?? ''), settings);
      case pharmacyMissingItemComplaint:
        final orderId = settings.arguments as String?;
        return RouteHelpers.slideRoute(PharmacyMissingItemComplaintScreen(orderId: orderId ?? ''), settings);
      case pharmacySupportTicket:
        return RouteHelpers.slideRoute(const PharmacySupportTicketScreen(), settings);

      // Hotel Booking
      case hotelBooking:
        return RouteHelpers.slideRoute(
          BlocProvider(
            create: (_) => HotelBloc(),
            child: const HotelBookingHomeScreen(),
          ),
          settings,
        );
      case hotelSearchResults:
        final args = settings.arguments as Map<String, dynamic>?;
        return RouteHelpers.slideRoute(
          BlocProvider(
            create: (_) => HotelBloc(),
            child: HotelSearchResultsScreen(searchParams: args),
          ),
          settings,
        );
      case hotelDetail:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(HotelDetailScreen(hotelData: args), settings);
      case hotelCheckout:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(HotelCheckoutScreen(bookingData: args), settings);
      case hotelConfirmation:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.fadeRoute(HotelBookingConfirmationScreen(bookingData: args), settings);
      case hotelMyBookings:
        return RouteHelpers.slideRoute(const HotelMyBookingsScreen(), settings);
      case hotelSavedHotels:
        return RouteHelpers.slideRoute(const HotelSavedScreen(), settings);
      case hotelCancelModify:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(HotelCancelModifyScreen(bookingId: args['bookingId'] ?? '', mode: args['mode'] ?? 'cancel'), settings);
      case hotelSearchFilters:
        return RouteHelpers.slideRoute(const HotelSearchFiltersScreen(), settings);
      case hotelMapSearch:
        return RouteHelpers.slideRoute(const HotelMapSearchScreen(), settings);
      case hotelReviews:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(HotelReviewsScreen(hotelId: args['hotelId'] ?? '', hotelName: args['hotelName'] ?? 'Hotel', overallRating: (args['rating'] as num?)?.toDouble() ?? 4.5), settings);
      case hotelGallery:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(HotelGalleryScreen(hotelId: args['hotelId'] ?? '', hotelName: args['hotelName'] ?? 'Hotel'), settings);
      case hotelRoomTypes:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        return RouteHelpers.slideRoute(HotelRoomTypesScreen(hotelId: args['hotelId'] ?? '', hotelName: args['hotelName'] ?? 'Hotel'), settings);
      case hotelDeals:
        return RouteHelpers.slideRoute(const HotelDealsScreen(), settings);
      case hotelTripPlanner:
        return RouteHelpers.slideRoute(const HotelTripPlannerScreen(), settings);
      case hotelCompare:
        return RouteHelpers.slideRoute(const HotelCompareScreen(), settings);
      case hotelPriceAlerts:
        return RouteHelpers.slideRoute(const HotelPriceAlertsScreen(), settings);

      // ── Taxi ─────────────────────────────────────────────────────────────────
      // All /taxi/* routes are handled by generateTaxiRoute() on line 443.
      // The following are kept as fallbacks for deep-link compatibility:
      case taxiRideHistory:
        return RouteHelpers.slideRoute(const RideHistoryScreen(), settings);
      case taxiRentals:
        return RouteHelpers.slideRoute(const RentalBookingScreen(), settings);
      case taxiIntercity:
        return RouteHelpers.slideRoute(const IntercityBookingScreen(), settings);
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(child: Text('Route not found: ${settings.name}')),
          ),
        );
    }
  }
}

/// Shown when a route is reached without the identifier it needs.
///
/// The alternative — substituting a default — is how `/marketplace/product`
/// ended up opening a hardcoded iPhone for any link that forgot its argument.
/// A visible dead end is easier to find and fix than a plausible wrong page.
class _MissingRouteArgument extends StatelessWidget {
  const _MissingRouteArgument({required this.what});

  final String what;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.link_off, size: 48, color: Color(0xFF94A3B8)),
              const SizedBox(height: 16),
              Text("We couldn't open that $what",
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text('The link is missing some information. Try opening it again from the store.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: Color(0xFF64748B))),
            ],
          ),
        ),
      ),
    );
  }
}
