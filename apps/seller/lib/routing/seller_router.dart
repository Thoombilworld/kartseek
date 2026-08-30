import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/screens/seller_hub_screen.dart';
import 'package:kartseek_seller/features/shared/screens/seller_login_screen.dart';
import 'package:kartseek_seller/features/shared/screens/seller_profile_screen.dart';
import 'package:kartseek_seller/features/shared/screens/seller_notifications_screen.dart';
import 'package:kartseek_seller/features/shared/screens/seller_earnings_screen.dart';
import 'package:kartseek_seller/features/shared/screens/seller_support_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_dashboard_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_orders_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_order_detail_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_inventory_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_product_edit_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_analytics_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_storefront_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_add_product_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_bulk_upload_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_low_stock_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_returns_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_refunds_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_reviews_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_promotions_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_campaigns_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_flash_deals_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_sponsored_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_brand_center_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_brand_registry_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_brand_analytics_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_transactions_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_payouts_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_commissions_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_wallet_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_settings_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_staff_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_gst_filing_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_shipping_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_performance_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_messages_screen.dart';
import 'package:kartseek_seller/features/seller_marketplace/screens/marketplace_disputes_screen.dart';
import 'package:kartseek_seller/features/seller_grocery/screens/grocery_dashboard_screen.dart';
import 'package:kartseek_seller/features/seller_grocery/screens/grocery_order_processing_screen.dart';
import 'package:kartseek_seller/features/seller_grocery/screens/grocery_catalog_screen.dart';
import 'package:kartseek_seller/features/seller_grocery/screens/grocery_low_stock_screen.dart';
// Grocery — new screens
import 'package:kartseek_seller/features/grocery/screens/grocery_seller_login_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_seller_notifications_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_seller_settings_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_add_product_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_seller_barcode_scan_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_price_update_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_inventory_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_new_orders_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_active_orders_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_seller_order_detail_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_seller_returns_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_seller_earnings_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_payout_history_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_create_deal_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_sales_analytics_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_customer_insights_screen.dart';
import 'package:kartseek_seller/features/grocery/screens/grocery_seller_ratings_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_dashboard_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_order_detail_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_table_management_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_menu_edit_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_seller_login_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_seller_settings_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_seller_notifications_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_seller_ratings_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_seller_earnings_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_payout_history_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_sales_analytics_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_customer_insights_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_inventory_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_create_offer_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_active_orders_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_new_orders_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_returns_screen.dart';
import 'package:kartseek_seller/features/seller_restaurant/screens/restaurant_dine_in_management_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_dashboard_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_order_detail_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_prescription_review_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_inventory_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_products_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_add_product_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_orders_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_prescription_queue_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_inventory_alerts_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_offers_manager_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_reports_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_earnings_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_payouts_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_seller_notifications_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_seller_reviews_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_seller_settings_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_seller_support_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_staff_screen.dart';
import 'package:kartseek_seller/features/seller_pharmacy/screens/pharmacy_store_profile_screen.dart';
import 'package:kartseek_seller/features/seller_doctor/screens/doctor_dashboard_screen.dart';
import 'package:kartseek_seller/features/seller_doctor/screens/doctor_schedule_screen.dart';
import 'package:kartseek_seller/features/seller_doctor/screens/doctor_appointment_detail_screen.dart';
import 'package:kartseek_seller/features/seller_doctor/screens/doctor_patient_queue_screen.dart';
import 'package:kartseek_seller/features/seller_doctor/screens/doctor_video_call_screen.dart';
import 'package:kartseek_seller/features/seller_hotel/screens/hotel_dashboard_screen.dart';
import 'package:kartseek_seller/features/seller_hotel/screens/hotel_booking_detail_screen.dart';
import 'package:kartseek_seller/features/seller_hotel/screens/hotel_room_inventory_screen.dart';
import 'package:kartseek_seller/features/seller_hotel/screens/hotel_availability_calendar_screen.dart';
import 'package:kartseek_seller/features/seller_hotel/screens/hotel_photo_manager_screen.dart';
import 'package:kartseek_seller/features/seller_hotel/screens/hotel_guest_checkin_screen.dart';
import 'package:kartseek_seller/features/seller_hotel/screens/hotel_quick_pricing_screen.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/screens/taxi_vendor_dashboard_screen.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/screens/taxi_vendor_driver_list_screen.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/screens/taxi_vendor_complaint_screen.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/screens/taxi_vendor_earnings_screen.dart';

/// Centralized router for the KARTSEEK Seller App.
///
/// Route format: `/seller/<module>/<screen>`
///
/// Fix log:
///  - Added `/seller` root route → redirects to `/seller/login`
///  - Added `/seller/login` route
///  - [onGenerateRoute] now handles all argument-passing routes +
///    delegates known static routes to the routes map (fixing the
///    "404 — Route not found: /seller" back-button error)
class SellerRouter {
  SellerRouter._();

  // ── Auth ──────────────────────────────────────────────────────────────────
  static const root = '/seller';
  static const login = '/seller/login';

  // ── Shared ────────────────────────────────────────────────────────────────
  static const hub = '/seller/hub';
  static const profile = '/seller/profile';
  static const notifications = '/seller/notifications';
  static const earnings = '/seller/earnings';
  static const support = '/seller/support';

  // ── Marketplace ───────────────────────────────────────────────────────────
  static const marketplace = '/seller/marketplace';
  static const marketplaceOrders = '/seller/marketplace/orders';
  static const marketplaceOrderDetail = '/seller/marketplace/orders/detail';
  static const marketplaceInventory = '/seller/marketplace/inventory';
  static const marketplaceProductEdit = '/seller/marketplace/product/edit';
  static const marketplaceAnalytics = '/seller/marketplace/analytics';
  static const marketplaceStorefront = '/seller/marketplace/storefront';
  static const marketplaceAddProduct = '/seller/marketplace/product/add';
  static const marketplaceBulkUpload = '/seller/marketplace/bulk-upload';
  static const marketplaceLowStock = '/seller/marketplace/low-stock';
  static const marketplaceReturns = '/seller/marketplace/returns';
  static const marketplaceRefunds = '/seller/marketplace/refunds';
  static const marketplaceReviews = '/seller/marketplace/reviews';
  static const marketplacePromotions = '/seller/marketplace/promotions';
  static const marketplaceCampaigns = '/seller/marketplace/campaigns';
  static const marketplaceFlashDeals = '/seller/marketplace/flash-deals';
  static const marketplaceSponsored = '/seller/marketplace/sponsored';
  static const marketplaceBrandCenter = '/seller/marketplace/brand-center';
  static const marketplaceBrandCenterDetail = '/seller/marketplace/brand-center/detail';
  static const marketplaceBrandAnalytics = '/seller/marketplace/brand-analytics';
  static const marketplaceTransactions = '/seller/marketplace/transactions';
  static const marketplacePayouts = '/seller/marketplace/payouts';
  static const marketplaceCommissions = '/seller/marketplace/commissions';
  static const marketplaceWallet = '/seller/marketplace/wallet';
  static const marketplaceSettings = '/seller/marketplace/settings';
  static const marketplaceStaff = '/seller/marketplace/staff';
  static const marketplaceGstFiling = '/seller/marketplace/gst-filing';
  static const marketplaceShipping = '/seller/marketplace/shipping';
  static const marketplacePerformance = '/seller/marketplace/performance';
  static const marketplaceMessages = '/seller/marketplace/messages';
  static const marketplaceDisputes = '/seller/marketplace/disputes';

  static const grocery = '/seller/grocery';
  static const groceryOrderProcessing = '/seller/grocery/orders/processing';
  static const groceryCatalog = '/seller/grocery/catalog';
  static const groceryLowStock = '/seller/grocery/low-stock';
  // Grocery — new screens
  static const groceryLogin = '/seller/grocery/login';
  static const groceryNotifications = '/seller/grocery/notifications';
  static const grocerySettings = '/seller/grocery/settings';
  static const groceryAddProduct = '/seller/grocery/product/add';
  static const groceryBarcodeScan = '/seller/grocery/barcode-scan';
  static const groceryPriceUpdate = '/seller/grocery/price-update';
  static const groceryInventory = '/seller/grocery/inventory';
  static const groceryNewOrders = '/seller/grocery/orders/new';
  static const groceryActiveOrders = '/seller/grocery/orders/active';
  static const groceryOrderDetail = '/seller/grocery/orders/detail';
  static const groceryReturns = '/seller/grocery/returns';
  static const groceryEarnings = '/seller/grocery/earnings';
  static const groceryPayouts = '/seller/grocery/payouts';
  static const groceryCreateDeal = '/seller/grocery/deals/create';
  static const groceryAnalytics = '/seller/grocery/analytics';
  static const groceryCustomerInsights = '/seller/grocery/customers';
  static const groceryRatings = '/seller/grocery/ratings';

  // ── Restaurant ────────────────────────────────────────────────────────────
  static const restaurant = '/seller/restaurant';
  static const restaurantOrders = '/seller/restaurant/orders';
  static const restaurantOrderDetail = '/seller/restaurant/orders/detail';
  static const restaurantTables = '/seller/restaurant/tables';
  static const restaurantMenu = '/seller/restaurant/menu';
  static const restaurantSellerLogin = '/seller/restaurant/login';
  static const restaurantSellerSettings = '/seller/restaurant/settings';
  static const restaurantSellerNotifs = '/seller/restaurant/notifications';
  static const restaurantSellerRatings = '/seller/restaurant/ratings';
  static const restaurantSellerEarnings = '/seller/restaurant/earnings';
  static const restaurantPayoutHistory = '/seller/restaurant/payouts';
  static const restaurantSalesAnalytics = '/seller/restaurant/analytics';
  static const restaurantCustomerInsights = '/seller/restaurant/customers';
  static const restaurantInventory = '/seller/restaurant/inventory';
  static const restaurantCreateOffer = '/seller/restaurant/offers/create';
  static const restaurantActiveOrders = '/seller/restaurant/orders/active';
  static const restaurantNewOrders = '/seller/restaurant/orders/new';
  static const restaurantReturns = '/seller/restaurant/returns';
  static const restaurantDineInMgmt = '/seller/restaurant/dine-in';

  // ── Pharmacy ──────────────────────────────────────────────────────────────
  static const pharmacy = '/seller/pharmacy';
  static const pharmacyOrderDetail = '/seller/pharmacy/orders/detail';
  static const pharmacyPrescription = '/seller/pharmacy/prescription';
  static const pharmacyInventory = '/seller/pharmacy/inventory';
  static const pharmacyProducts = '/seller/pharmacy/products';
  static const pharmacyAddProduct = '/seller/pharmacy/products/add';
  static const pharmacyEditProduct = '/seller/pharmacy/products/edit';
  static const pharmacyOrders = '/seller/pharmacy/orders';
  static const pharmacyOrderAction = '/seller/pharmacy/orders/action';
  static const pharmacyPrescriptionQueue =
      '/seller/pharmacy/prescription-queue';
  static const pharmacyInventoryAlerts = '/seller/pharmacy/inventory/alerts';
  static const pharmacyStockUpdate = '/seller/pharmacy/stock-update';
  static const pharmacyOffersManager = '/seller/pharmacy/offers';
  static const pharmacyReports = '/seller/pharmacy/reports';
  static const pharmacyEarnings = '/seller/pharmacy/earnings';
  static const pharmacyPayouts = '/seller/pharmacy/payouts';
  static const pharmacyNotifications = '/seller/pharmacy/notifications';
  static const pharmacyReviews = '/seller/pharmacy/reviews';
  static const pharmacySettings = '/seller/pharmacy/settings';
  static const pharmacySupport = '/seller/pharmacy/support';
  static const pharmacyStaff = '/seller/pharmacy/staff';
  static const pharmacyStoreProfile = '/seller/pharmacy/store-profile';

  // ── Doctor ────────────────────────────────────────────────────────────────
  static const doctor = '/seller/doctor';
  static const doctorSchedule = '/seller/doctor/schedule';
  static const doctorAppointmentDetail = '/seller/doctor/appointment/detail';
  static const doctorPatientQueue = '/seller/doctor/queue';
  static const doctorVideoCall = '/seller/doctor/video-call';

  // ── Hotel ─────────────────────────────────────────────────────────────────
  static const hotel = '/seller/hotel';
  static const hotelBookingDetail = '/seller/hotel/booking/detail';
  static const hotelRoomInventory = '/seller/hotel/rooms';
  static const hotelAvailability = '/seller/hotel/availability';
  static const hotelPhotos = '/seller/hotel/photos';
  static const hotelGuestCheckin = '/seller/hotel/guest-checkin';
  static const hotelQuickPricing = '/seller/hotel/quick-pricing';

  // ── Taxi Vendor ───────────────────────────────────────────────────────────
  static const taxiVendor = '/seller/taxi-vendor';
  static const taxiVendorDrivers = '/seller/taxi-vendor/drivers';
  static const taxiVendorComplaints = '/seller/taxi-vendor/complaints';
  static const taxiVendorEarnings = '/seller/taxi-vendor/earnings';

  // ── Route Map ─────────────────────────────────────────────────────────────
  static Map<String, WidgetBuilder> routes() => {
        // Auth / root — bare /seller resolves to login (fixes back-button 404)
        root: (_) => const SellerLoginScreen(),
        login: (_) => const SellerLoginScreen(),
        hub: (_) => const SellerHubScreen(),

        // Shared
        profile: (_) => const SellerProfileScreen(),
        notifications: (_) => const SellerNotificationsScreen(),
        earnings: (_) => const SellerEarningsScreen(),
        support: (_) => const SellerSupportScreen(),

        // Marketplace
        marketplace: (_) => const MarketplaceDashboardScreen(),
        marketplaceOrders: (_) => const MarketplaceOrdersScreen(),
        marketplaceInventory: (_) => const MarketplaceInventoryScreen(),
        marketplaceProductEdit: (_) => const MarketplaceProductEditScreen(),
        marketplaceAnalytics: (_) => const MarketplaceAnalyticsScreen(),
        marketplaceStorefront: (_) => const MarketplaceStorefrontScreen(),
        marketplaceAddProduct: (_) => const MarketplaceAddProductScreen(),
        marketplaceBulkUpload: (_) => const MarketplaceBulkUploadScreen(),
        marketplaceLowStock: (_) => const MarketplaceLowStockScreen(),
        marketplaceReturns: (_) => const MarketplaceReturnsScreen(),
        marketplaceRefunds: (_) => const MarketplaceRefundsScreen(),
        marketplaceReviews: (_) => const MarketplaceReviewsScreen(),
        marketplacePromotions: (_) => const MarketplacePromotionsScreen(),
        marketplaceCampaigns: (_) => const MarketplaceCampaignsScreen(),
        marketplaceFlashDeals: (_) => const MarketplaceFlashDealsScreen(),
        marketplaceSponsored: (_) => const MarketplaceSponsoredScreen(),
        marketplaceBrandCenter: (_) => const MarketplaceBrandCenterScreen(),
        marketplaceTransactions: (_) => const MarketplaceTransactionsScreen(),
        marketplacePayouts: (_) => const MarketplacePayoutsScreen(),
        marketplaceCommissions: (_) => const MarketplaceCommissionsScreen(),
        marketplaceWallet: (_) => const MarketplaceWalletScreen(),
        marketplaceSettings: (_) => const MarketplaceSettingsScreen(),
        marketplaceStaff: (_) => const MarketplaceStaffScreen(),
        marketplaceGstFiling: (_) => const MarketplaceGstFilingScreen(),
        marketplaceShipping: (_) => const MarketplaceShippingScreen(),
        marketplacePerformance: (_) => const MarketplacePerformanceScreen(),
        marketplaceMessages: (_) => const MarketplaceMessagesScreen(),
        marketplaceDisputes: (_) => const MarketplaceDisputesScreen(),

        // Grocery
        grocery: (_) => const GroceryDashboardScreen(),
        groceryOrderProcessing: (_) => const GroceryOrderProcessingScreen(),
        groceryCatalog: (_) => const GroceryCatalogScreen(),
        groceryLowStock: (_) => const GroceryLowStockScreen(),
        // Grocery — new screens
        groceryLogin: (_) => const GrocerySellerLoginScreen(),
        groceryNotifications: (_) => const GrocerySellerNotificationsScreen(),
        grocerySettings: (_) => const GrocerySellerSettingsScreen(),
        groceryAddProduct: (_) => const GroceryAddProductScreen(),
        groceryBarcodeScan: (_) => const GrocerySellerBarcodeScanScreen(),
        groceryPriceUpdate: (_) => const GroceryPriceUpdateScreen(),
        groceryInventory: (_) => const GroceryInventoryScreen(),
        groceryNewOrders: (_) => const GroceryNewOrdersScreen(),
        groceryActiveOrders: (_) => const GroceryActiveOrdersScreen(),
        groceryOrderDetail: (_) => const GrocerySellerOrderDetailScreen(),
        groceryReturns: (_) => const GrocerySellerReturnsScreen(),
        groceryEarnings: (_) => const GrocerySellerEarningsScreen(),
        groceryPayouts: (_) => const GroceryPayoutHistoryScreen(),
        groceryCreateDeal: (_) => const GroceryCreateDealScreen(),
        groceryAnalytics: (_) => const GrocerySalesAnalyticsScreen(),
        groceryCustomerInsights: (_) => const GroceryCustomerInsightsScreen(),
        groceryRatings: (_) => const GrocerySellerRatingsScreen(),

        // Restaurant
        restaurant: (_) => const RestaurantDashboardScreen(),
        restaurantOrders: (_) => const RestaurantOrderProcessingScreen(),
        restaurantTables: (_) => const RestaurantTableManagementScreen(),
        restaurantMenu: (_) => const RestaurantMenuEditScreen(),
        restaurantSellerLogin: (_) => const RestaurantSellerLoginScreen(),
        restaurantSellerSettings: (_) => const RestaurantSellerSettingsScreen(),
        restaurantSellerNotifs: (_) =>
            const RestaurantSellerNotificationsScreen(),
        restaurantSellerRatings: (_) => const RestaurantSellerRatingsScreen(),
        restaurantSellerEarnings: (_) => const RestaurantSellerEarningsScreen(),
        restaurantPayoutHistory: (_) => const RestaurantPayoutHistoryScreen(),
        restaurantSalesAnalytics: (_) => const RestaurantSalesAnalyticsScreen(),
        restaurantCustomerInsights: (_) =>
            const RestaurantCustomerInsightsScreen(),
        restaurantInventory: (_) => const RestaurantInventoryScreen(),
        restaurantCreateOffer: (_) => const RestaurantCreateOfferScreen(),
        restaurantActiveOrders: (_) => const RestaurantActiveOrdersScreen(),
        restaurantNewOrders: (_) => const RestaurantNewOrdersScreen(),
        restaurantReturns: (_) => const RestaurantReturnsScreen(),
        restaurantDineInMgmt: (_) => const RestaurantDineInManagementScreen(),

        // Pharmacy
        pharmacy: (_) => const PharmacyDashboardScreen(),
        pharmacyPrescription: (_) => const PharmacyPrescriptionReviewScreen(),
        pharmacyInventory: (_) => const PharmacyInventoryScreen(),
        pharmacyProducts: (_) => const PharmacyProductsScreen(),
        pharmacyAddProduct: (_) => const PharmacyAddProductScreen(),
        pharmacyOrders: (_) => const PharmacyOrdersScreen(),
        pharmacyPrescriptionQueue: (_) =>
            const PharmacyPrescriptionQueueScreen(),
        pharmacyInventoryAlerts: (_) => const PharmacyInventoryAlertsScreen(),
        pharmacyOffersManager: (_) => const PharmacyOffersManagerScreen(),
        pharmacyReports: (_) => const PharmacyReportsScreen(),
        pharmacyEarnings: (_) => const PharmacyEarningsScreen(),
        pharmacyPayouts: (_) => const PharmacyPayoutsScreen(),
        pharmacyNotifications: (_) => const PharmacySellerNotificationsScreen(),
        pharmacyReviews: (_) => const PharmacySellerReviewsScreen(),
        pharmacySettings: (_) => const PharmacySellerSettingsScreen(),
        pharmacySupport: (_) => const PharmacySellerSupportScreen(),
        pharmacyStaff: (_) => const PharmacyStaffScreen(),
        pharmacyStoreProfile: (_) => const PharmacyStoreProfileScreen(),

        // Doctor
        doctor: (_) => const DoctorDashboardScreen(),
        doctorSchedule: (_) => const DoctorScheduleScreen(),
        doctorPatientQueue: (_) => const DoctorPatientQueueScreen(),

        // Hotel
        hotel: (_) => const HotelDashboardScreen(),
        hotelRoomInventory: (_) => const HotelRoomInventoryScreen(),
        hotelAvailability: (_) => const HotelAvailabilityCalendarScreen(),
        hotelPhotos: (_) => const HotelPhotoManagerScreen(),
        hotelGuestCheckin: (_) => const HotelGuestCheckinScreen(),
        hotelQuickPricing: (_) => const HotelQuickPricingScreen(),

        // Taxi Vendor
        taxiVendor: (_) => const TaxiVendorDashboardScreen(),
        taxiVendorDrivers: (_) => const TaxiVendorDriverListScreen(),
        taxiVendorComplaints: (_) => const TaxiVendorComplaintScreen(),
        taxiVendorEarnings: (_) => const TaxiVendorEarningsScreen(),
      };

  /// [onGenerateRoute] handles:
  ///  1. Argument-passing routes (detail screens with dynamic data)
  ///  2. Any route in the static map that Navigator couldn't resolve
  ///     (e.g. when called via pushNamed with settings only)
  ///  3. Graceful fallback — never shows a raw 404; redirects to login
  static Route<dynamic>? onGenerateRoute(RouteSettings settings) {
    final name = settings.name;

    // ── Argument-passing routes ────────────────────────────────────────────
    switch (name) {
      case marketplaceBrandCenterDetail:
        return _slide((_) =>
            MarketplaceBrandCenterDetailScreen(brandData: settings.arguments as Map<String, dynamic>));
      case marketplaceBrandAnalytics:
        return _slide((_) =>
            MarketplaceBrandAnalyticsScreen(brandData: settings.arguments as Map<String, dynamic>));
      case marketplaceOrderDetail:
        return _slide((_) =>
            MarketplaceOrderDetailScreen(order: settings.arguments as dynamic));
      case restaurantOrderDetail:
        return _slide((_) => const RestaurantOrderProcessingScreen());
      case pharmacyOrderDetail:
        return _slide((_) =>
            PharmacyOrderDetailScreen(order: settings.arguments as dynamic));
      case doctorAppointmentDetail:
        return _slide((_) => DoctorAppointmentDetailScreen(
            appointment: settings.arguments as dynamic));
      case doctorVideoCall:
        return MaterialPageRoute(
          fullscreenDialog: true,
          builder: (_) => DoctorVideoCallScreen(
              appointmentId: settings.arguments as String),
          settings: settings,
        );
      case hotelBookingDetail:
        return _slide((_) =>
            HotelBookingDetailScreen(booking: settings.arguments as dynamic));
    }

    // ── Delegate to static route map ──────────────────────────────────────
    final staticRoutes = routes();
    if (name != null && staticRoutes.containsKey(name)) {
      return MaterialPageRoute(
          builder: staticRoutes[name]!, settings: settings);
    }

    // ── Fallback — redirect to login instead of showing 404 ───────────────
    return MaterialPageRoute(
      builder: (_) => const SellerLoginScreen(),
      settings: const RouteSettings(name: login),
    );
  }

  static PageRouteBuilder _slide(WidgetBuilder builder) {
    return PageRouteBuilder(
      pageBuilder: (ctx, a1, a2) => builder(ctx),
      transitionsBuilder: (ctx, animation, a2, child) => SlideTransition(
        position: Tween<Offset>(begin: const Offset(1, 0), end: Offset.zero)
            .animate(
                CurvedAnimation(parent: animation, curve: Curves.easeInOut)),
        child: child,
      ),
    );
  }
}
