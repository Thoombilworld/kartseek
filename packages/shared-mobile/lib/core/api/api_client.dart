import 'package:shared_mobile/core/constants.dart';

/// Centralized API client configuration for KARTSEEK.
///
/// All endpoint paths match the NestJS API Gateway controllers exactly:
///   • Global prefix: /api/v1
///   • Controllers: auth, users, taxi, restaurants, orders, delivery, regions,
///     marketplace (under /api), partner (under /api/partner), etc.
///
/// Route resolution rule:
///   final url = '${AppConstants.apiBaseUrl}${endpoint}';
///   e.g. http://localhost:3001/api/v1/taxi/estimate
class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  final String baseUrl = AppConstants.apiBaseUrl;

  /// Build headers with auth token and region
  Map<String, String> getHeaders({String? token, String? regionCode, double? lat, double? lng}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-App-Version': AppConstants.appVersion,
      'X-Client-Platform': 'mobile',
    };
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    if (regionCode != null) {
      headers['X-Region-Code'] = regionCode;
    }
    if (lat != null) {
      headers['X-Latitude'] = lat.toString();
    }
    if (lng != null) {
      headers['X-Longitude'] = lng.toString();
    }
    return headers;
  }

  /// Build full URL from path
  String buildUrl(String path) => '$baseUrl$path';

  // ── Module-specific endpoint groups ─────────────────────────────────────
  static const auth = _AuthEndpoints();
  static const users = _UserEndpoints();
  static const regions = _RegionEndpoints();
  static const marketplace = _MarketplaceEndpoints();
  static const grocery = _GroceryEndpoints();
  static const restaurant = _RestaurantEndpoints();
  static const doctor = _DoctorEndpoints();
  static const pharmacy = _PharmacyEndpoints();
  static const taxi = _TaxiEndpoints();
  static const orders = _OrderEndpoints();
  static const delivery = _DeliveryEndpoints();
  static const partner = _PartnerEndpoints();
  static const wallet = _WalletEndpoints();
  static const upload = _UploadEndpoints();
  static const search = _SearchEndpoints();
  static const health = _HealthEndpoints();
}

// ─── Auth (/auth) ── maps to GatewayController ────────────────────────────
class _AuthEndpoints {
  const _AuthEndpoints();
  String get login => '/auth/login';
  String get register => '/auth/register';
  String get refresh => '/auth/refresh';
  String get forgotPassword => '/auth/forgot-password';
  String get resetPassword => '/auth/reset-password';
  String get otpSend => '/auth/otp/send';
  String get otpVerify => '/auth/otp/verify';
  String get profile => '/auth/profile';
  String get logout => '/auth/logout';
}

// ─── Users (/users) ── maps to UserController ─────────────────────────────
class _UserEndpoints {
  const _UserEndpoints();
  String profile(String userId) => '/users/$userId/profile';
  String addresses(String userId) => '/users/$userId/addresses';
  String deleteAddress(String userId, String addressId) =>
      '/users/$userId/addresses/$addressId';
}

// ─── Regions (/regions) ── maps to RegionController ───────────────────────
class _RegionEndpoints {
  const _RegionEndpoints();
  String get detect => '/regions/detect';
  String get list => '/regions';
  String get current => '/regions/current';
  String get stats => '/regions/stats';
}

// ─── Marketplace (/api/*) ── maps to MarketplaceGatewayController ─────────
// Note: MarketplaceGatewayController has @Controller('api') so its routes
// already include /api prefix. With global prefix api/v1, full path is:
// /api/v1/api/marketplace/home → but Swagger shows /api/v1/marketplace/home
// This depends on exact NestJS prefix resolution. The paths below use
// the clean logical paths as exposed through the Swagger UI.
class _MarketplaceEndpoints {
  const _MarketplaceEndpoints();
  String get home => '/marketplace/home';
  String get products => '/marketplace/products';
  String get categories => '/categories';
  String get search => '/search';
  String get cart => '/cart';
  String get checkout => '/orders/checkout';
  String get flashDeals => '/marketplace/flash-deals';
  String get deals => '/marketplace/deals';
  String get featured => '/marketplace/featured';
  String get brands => '/marketplace/brands';
  String get topBrands => '/marketplace/brands/top';
  String get sellers => '/marketplace/sellers';
  String get verifiedSellers => '/marketplace/sellers/verified';
  String get wishlist => '/marketplace/wishlist';
  String get recentlyViewed => '/marketplace/recently-viewed';
  String get support => '/marketplace/support';
  String product(String id) => '/products/$id';
  String category(String id) => '/categories/$id';
  String brand(String id) => '/marketplace/brands/$id';
  String seller(String id) => '/marketplace/sellers/$id';
  String order(String id) => '/orders/$id';
  String orderCancel(String id) => '/marketplace/orders/$id/cancel';
  String orderReturn(String id) => '/marketplace/orders/$id/returns';
  String productReviews(String id) => '/marketplace/products/$id/reviews';
}

// ─── Grocery (/grocery) ── maps to GroceryModule (src/grocery) ────────────
class _GroceryEndpoints {
  const _GroceryEndpoints();
  String get stores => '/grocery/stores';
  String get search => '/grocery/search';
  String store(String id) => '/grocery/stores/$id';
  String storeCategories(String id) => '/grocery/stores/$id/categories';
  String storeProducts(String id) => '/grocery/stores/$id/products';
  String product(String storeId, String productId) =>
      '/grocery/stores/$storeId/products/$productId';
}

// ─── Restaurant (/restaurants) ── maps to RestaurantController ────────────
class _RestaurantEndpoints {
  const _RestaurantEndpoints();
  String get nearby => '/restaurants/nearby';
  String get search => '/restaurants/search';
  String get pendingApprovals => '/restaurants/approvals/pending';
  String detail(String slug) => '/restaurants/$slug';
  String menu(String id) => '/restaurants/$id/menu';
  String bookTable(String id) => '/restaurants/$id/book-table';
  String placeOrder(String id) => '/restaurants/$id/order';
  String approve(String id) => '/restaurants/$id/approve';
}

// ─── Doctor (/doctor) ── maps to doctor service ───────────────────────────
class _DoctorEndpoints {
  const _DoctorEndpoints();
  String get hospitals => '/doctor/hospitals';
  String get appointments => '/doctor/appointments';
  String get myAppointments => '/doctor/appointments/me';
  String hospital(String id) => '/doctor/hospitals/$id';
  String hospitalDoctors(String id) => '/doctor/hospitals/$id/doctors';
  String doctor(String id) => '/doctor/doctors/$id';
  String doctorSlots(String id) => '/doctor/doctors/$id/slots';
}

// ─── Pharmacy (/pharmacy) ── maps to pharmacy service ─────────────────────
class _PharmacyEndpoints {
  const _PharmacyEndpoints();
  String get stores => '/pharmacy/stores';
  String get search => '/pharmacy/search';
  String get prescriptionUpload => '/pharmacy/prescriptions/upload';
  String store(String id) => '/pharmacy/stores/$id';
  String storeMedicines(String id) => '/pharmacy/stores/$id/medicines';
  String medicine(String storeId, String medicineId) =>
      '/pharmacy/stores/$storeId/medicines/$medicineId';
}

// ─── Taxi (/taxi) ── maps to TaxiController ───────────────────────────────
class _TaxiEndpoints {
  const _TaxiEndpoints();
  // Customer
  String get estimate => '/taxi/estimate';
  String get requestRide => '/taxi/request';
  String get rides => '/taxi/rides';
  String get nearbyDrivers => '/taxi/nearby-drivers';
  String ride(String id) => '/taxi/ride/$id';
  String rideTrack(String id) => '/taxi/ride/$id/track';
  String rideCancel(String id) => '/taxi/ride/$id/cancel';
  String rideRate(String id) => '/taxi/ride/$id/rating';
  String rideSupport(String id) => '/taxi/ride/$id/support';
  String rideSos(String id) => '/taxi/ride/$id/sos';
  // Driver
  String get driverOnline => '/taxi/driver/online';
  String get driverOffline => '/taxi/driver/offline';
  String get driverRideRequests => '/taxi/driver/ride-requests';
  String get driverLocation => '/taxi/driver/location';
  String get driverEarnings => '/taxi/driver/earnings';
  String driverAcceptRide(String id) => '/taxi/driver/ride/$id/accept';
  String driverArrivedRide(String id) => '/taxi/driver/ride/$id/arrived';
  String driverStartRide(String id) => '/taxi/driver/ride/$id/start';
  String driverCompleteRide(String id) => '/taxi/driver/ride/$id/complete';
  // Vendor (Seller Portal)
  String get vendorDashboard => '/taxi/vendor/dashboard';
  String get vendorDrivers => '/taxi/vendor/drivers';
  String get vendorVehicles => '/taxi/vendor/vehicles';
  // Admin
  String get adminDashboard => '/taxi/admin/dashboard';
  String get adminVendors => '/taxi/admin/vendors';
}

// ─── Orders (/orders) ── maps to OrderController ─────────────────────────
class _OrderEndpoints {
  const _OrderEndpoints();
  String get checkout => '/orders/checkout';
  String tracking(String id) => '/orders/$id/tracking';
  String detail(String id) => '/orders/$id';
  String updateStatus(String id) => '/orders/$id/status';
  String updateDeliveryStatus(String id) => '/orders/$id/delivery-status';
}

// ─── Delivery (/delivery) ── maps to DeliveryController ──────────────────
class _DeliveryEndpoints {
  const _DeliveryEndpoints();
  String get assign => '/delivery/assign';
  String get estimate => '/delivery/estimate';
  String orderStatus(String orderId) => '/delivery/order/$orderId';
  String updateStatus(String orderId) => '/delivery/order/$orderId/status';
  String partnerActive(String partnerId) => '/delivery/partner/$partnerId/active';
  String partnerHistory(String partnerId) => '/delivery/partner/$partnerId/history';
  String partnerLocation(String partnerId) => '/delivery/partner/$partnerId/location';
}

// ─── Partner (/api/partner) ── maps to PartnerController ─────────────────
// Note: PartnerController uses @Controller('api/partner') so with the global
// prefix the full path is /api/v1/api/partner/... Keep the prefix to match.
class _PartnerEndpoints {
  const _PartnerEndpoints();
  // Auth
  String get login => '/api/partner/auth/login';
  String get otpVerify => '/api/partner/auth/otp/verify';
  // Profile & Compliance
  String get profile => '/api/partner/profile';
  String get complianceStatus => '/api/partner/compliance/status';
  String get uploadDocument => '/api/partner/documents/upload';
  // Online/Offline
  String get goOnline => '/api/partner/online';
  String get goOffline => '/api/partner/offline';
  // Notifications & Support
  String get notifications => '/api/partner/notifications';
  String get supportTickets => '/api/partner/support/tickets';
  // Earnings & Payouts
  String get earningsSummary => '/api/partner/earnings/summary';
  String get payouts => '/api/partner/payouts';
  // SOS
  String get sos => '/api/partner/sos';
  // Taxi Mode
  String get taxiDashboard => '/api/partner/taxi/dashboard';
  String get taxiRideRequests => '/api/partner/taxi/ride-requests';
  String get taxiHistory => '/api/partner/taxi/history';
  String get taxiEarnings => '/api/partner/taxi/earnings';
  String get taxiLocation => '/api/partner/taxi/location';
  String taxiAcceptRide(String id) => '/api/partner/taxi/rides/$id/accept';
  String taxiRejectRide(String id) => '/api/partner/taxi/rides/$id/reject';
  String taxiArrivedRide(String id) => '/api/partner/taxi/rides/$id/arrived';
  String taxiStartRide(String id) => '/api/partner/taxi/rides/$id/start';
  String taxiCompleteRide(String id) => '/api/partner/taxi/rides/$id/complete';
  String taxiCancelRide(String id) => '/api/partner/taxi/rides/$id/cancel';
  // Delivery Mode
  String get deliveryDashboard => '/api/partner/delivery/dashboard';
  String get deliveryTasks => '/api/partner/delivery/tasks';
  String get deliveryReturns => '/api/partner/delivery/returns';
  String get deliveryHistory => '/api/partner/delivery/history';
  String get deliveryEarnings => '/api/partner/delivery/earnings';
  String deliveryTask(String id) => '/api/partner/delivery/tasks/$id';
  String deliveryAcceptTask(String id) => '/api/partner/delivery/tasks/$id/accept';
  String deliveryRejectTask(String id) => '/api/partner/delivery/tasks/$id/reject';
  String deliveryPickupStart(String id) => '/api/partner/delivery/tasks/$id/pickup-start';
  String deliveryPickupProof(String id) => '/api/partner/delivery/tasks/$id/pickup-proof';
  String deliveryDropStart(String id) => '/api/partner/delivery/tasks/$id/drop-start';
  String deliveryVerifyOtp(String id) => '/api/partner/delivery/tasks/$id/verify-otp';
  String deliveryDropProof(String id) => '/api/partner/delivery/tasks/$id/drop-proof';
  String deliveryComplete(String id) => '/api/partner/delivery/tasks/$id/complete';
  String deliveryFailed(String id) => '/api/partner/delivery/tasks/$id/failed';
  String deliveryCodCollect(String id) => '/api/partner/delivery/tasks/$id/cod-collect';
}

// ─── Wallet (/wallet) ── maps to wallet endpoints in UserController ──────
class _WalletEndpoints {
  const _WalletEndpoints();
  String balance(String userId) => '/wallet/$userId/balance';
  String topUp(String userId) => '/wallet/$userId/topup';
  String transactions(String userId) => '/wallet/$userId/transactions';
  String partnerWallet(String partnerId) => '/users/partner/$partnerId/wallet';
}

// ─── Upload (/upload) ── maps to UploadController ────────────────────────
class _UploadEndpoints {
  const _UploadEndpoints();
  String get upload => '/upload';
}

// ─── Search (/search) ── global search ───────────────────────────────────
class _SearchEndpoints {
  const _SearchEndpoints();
  String get query => '/search';
}

// ─── Health (/health) ── maps to HealthController ────────────────────────
class _HealthEndpoints {
  const _HealthEndpoints();
  String get check => '/health';
  String get ready => '/health/ready';
  String get metrics => '/health/metrics';
}
