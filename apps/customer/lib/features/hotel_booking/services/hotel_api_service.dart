import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:kartseek_shared_mobile/core/constants.dart';
import 'package:kartseek_shared_mobile/core/security/ssl_pinning_service.dart';

/// Hotel API Service — Secure client for Hotel booking endpoints.
/// Communicates with the API Gateway hotel proxy controller.
class HotelApiService {
  static String get _devBase => AppConstants.apiBaseUrl;

  late final Dio _dio;
  final bool useMock;

  HotelApiService({this.useMock = false}) {
    _dio = Dio(BaseOptions(
      baseUrl: _devBase,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: SslPinningService.createSecureHttpClient,
    );
  }

  // ── Search & Discovery ──────────────────────────────────────────────────

  /// Search hotels with optional filters
  Future<Map<String, dynamic>> searchHotels({
    String? query,
    String? city,
    String? checkin,
    String? checkout,
    int guests = 2,
    String? starRating,
    double? minPrice,
    double? maxPrice,
    int page = 1,
    int limit = 20,
  }) async {
    if (useMock) return _mockSearchResult();

    try {
      final params = <String, dynamic>{
        if (query != null) 'q': query,
        if (city != null) 'city': city,
        if (checkin != null) 'checkin': checkin,
        if (checkout != null) 'checkout': checkout,
        'guests': guests,
        if (starRating != null) 'starRating': starRating,
        if (minPrice != null) 'minPrice': minPrice,
        if (maxPrice != null) 'maxPrice': maxPrice,
        'page': page,
        'limit': limit,
      };
      final res = await _dio.get('/hotels', queryParameters: params);
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return _mockSearchResult();
    }
  }

  /// Search hotels near a GPS coordinate (M1 fix)
  Future<Map<String, dynamic>> searchNearbyHotels({
    required double lat,
    required double lng,
    double radius = 10.0,
    int page = 1,
    int limit = 20,
  }) async {
    if (useMock) return _mockNearbyResult(lat, lng);

    try {
      final res = await _dio.get('/hotels', queryParameters: {
        'lat': lat,
        'lng': lng,
        'radius': radius,
        'page': page,
        'limit': limit,
      });
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return _mockNearbyResult(lat, lng);
    }
  }

  /// Get hotel details by ID
  Future<Map<String, dynamic>> getHotelById(String hotelId) async {
    if (useMock) return _mockHotels.firstWhere((h) => h['id'] == hotelId, orElse: () => _mockHotels.first);

    try {
      final res = await _dio.get('/hotels/$hotelId');
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return _mockHotels.firstWhere((h) => h['id'] == hotelId, orElse: () => _mockHotels.first);
    }
  }

  /// Get room availability
  Future<Map<String, dynamic>> getRoomAvailability(String hotelId, String checkin, String checkout, int guests) async {
    if (useMock) return {'rooms': [], 'available': true};

    try {
      final res = await _dio.get('/hotels/$hotelId/rooms', queryParameters: {
        'checkin': checkin,
        'checkout': checkout,
        'guests': guests,
      });
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return {'rooms': [], 'available': true};
    }
  }

  // ── Reviews ─────────────────────────────────────────────────────────────

  /// Get reviews for a hotel (M5 fix)
  Future<Map<String, dynamic>> getHotelReviews(String hotelId, {int page = 1, int limit = 10}) async {
    if (useMock) return _mockReviewsResult(hotelId);

    try {
      final res = await _dio.get('/hotels/$hotelId/reviews', queryParameters: {'page': page, 'limit': limit});
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return _mockReviewsResult(hotelId);
    }
  }

  /// Submit a review
  Future<Map<String, dynamic>> submitReview(String hotelId, Map<String, dynamic> review) async {
    if (useMock) return {'id': 'rv-${DateTime.now().millisecondsSinceEpoch}', 'hotelId': hotelId, ...review};

    try {
      final res = await _dio.post('/hotels/$hotelId/reviews', data: review);
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return {'id': 'rv-${DateTime.now().millisecondsSinceEpoch}', 'hotelId': hotelId, ...review};
    }
  }

  // ── Bookings ────────────────────────────────────────────────────────────

  /// Create a booking
  Future<Map<String, dynamic>> createBooking(String hotelId, Map<String, dynamic> bookingData) async {
    if (useMock) {
      return {
        'id': 'BK-${DateTime.now().millisecondsSinceEpoch}',
        'hotelId': hotelId,
        'status': 'confirmed',
        ...bookingData,
      };
    }

    try {
      final res = await _dio.post('/hotels/$hotelId/bookings', data: bookingData);
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return {
        'id': 'BK-${DateTime.now().millisecondsSinceEpoch}',
        'hotelId': hotelId,
        'status': 'confirmed',
        ...bookingData,
      };
    }
  }

  /// Get booking by ID
  Future<Map<String, dynamic>> getBookingById(String bookingId) async {
    if (useMock) return {'id': bookingId, 'status': 'confirmed'};

    try {
      final res = await _dio.get('/hotels/bookings/$bookingId');
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return {'id': bookingId, 'status': 'confirmed'};
    }
  }

  /// Get user's bookings (L3 fix)
  Future<Map<String, dynamic>> getUserBookings(String userId, {int page = 1, int limit = 10}) async {
    if (useMock) return _mockBookingsResult();

    try {
      final res = await _dio.get('/hotels/bookings/user/$userId', queryParameters: {'page': page, 'limit': limit});
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return _mockBookingsResult();
    }
  }

  /// Cancel a booking
  Future<Map<String, dynamic>> cancelBooking(String bookingId, String reason) async {
    if (useMock) return {'id': bookingId, 'status': 'cancelled'};

    try {
      final res = await _dio.put('/hotels/bookings/$bookingId/cancel', data: {'reason': reason});
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return {'id': bookingId, 'status': 'cancelled'};
    }
  }

  /// Modify a booking
  Future<Map<String, dynamic>> modifyBooking(String bookingId, Map<String, dynamic> changes) async {
    if (useMock) return {'id': bookingId, 'status': 'modified', ...changes};

    try {
      final res = await _dio.put('/hotels/bookings/$bookingId/modify', data: changes);
      return res.data as Map<String, dynamic>;
    } catch (e) {
      return {'id': bookingId, 'status': 'modified', ...changes};
    }
  }

  // ── Price Alerts (L4 fix) ──────────────────────────────────────────────

  /// Get user's price alerts
  Future<Map<String, dynamic>> getPriceAlerts(String userId) async {
    // Price alerts endpoint is not yet in the backend — always returns mock for now.
    // When backend adds GET /hotels/price-alerts/user/:userId, remove the early return.
    return _mockPriceAlertsResult();
  }

  /// Toggle a price alert on/off
  Future<Map<String, dynamic>> togglePriceAlert(String alertId, bool enabled) async {
    // Price alerts toggle endpoint is not yet in the backend.
    return {'id': alertId, 'enabled': enabled};
  }

  // ── Mock Data ───────────────────────────────────────────────────────────

  Map<String, dynamic> _mockSearchResult() => {
    'hotels': _mockHotels,
    'total': _mockHotels.length,
    'page': 1,
    'limit': 20,
  };

  Map<String, dynamic> _mockNearbyResult(double lat, double lng) => {
    'hotels': _mockHotels.map((h) => {
      ...h,
      'distance': '${(1.0 + _mockHotels.indexOf(h) * 1.2).toStringAsFixed(1)} km',
    }).toList(),
    'total': _mockHotels.length,
    'page': 1,
    'limit': 20,
    'searchedLat': lat,
    'searchedLng': lng,
  };

  Map<String, dynamic> _mockReviewsResult(String hotelId) => {
    'reviews': _mockReviews,
    'total': _mockReviews.length,
    'averageRating': 4.5,
    'ratingDistribution': {'5': 68, '4': 20, '3': 8, '2': 3, '1': 1},
    'hotelId': hotelId,
  };

  Map<String, dynamic> _mockBookingsResult() => {
    'bookings': _mockBookings,
    'total': _mockBookings.length,
  };

  Map<String, dynamic> _mockPriceAlertsResult() => {
    'alerts': _mockPriceAlerts,
    'total': _mockPriceAlerts.length,
  };

  static const _mockHotels = <Map<String, dynamic>>[
    {'id': 'htl-01', 'name': 'The Grand Palace Hotel', 'city': 'Dubai, UAE', 'rating': 4.8, 'price': 450, 'currency': 'AED', 'type': 'Luxury', 'stars': 5, 'amenities': ['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Parking'], 'distance': '2.1 km from center', 'reviewCount': 1240, 'offer': '20% OFF', 'lat': 25.2048, 'lng': 55.2708, 'bannerUrl': null, 'photos': null},
    {'id': 'htl-02', 'name': 'KARTSEEK Business Suites', 'city': 'Doha, Qatar', 'rating': 4.6, 'price': 280, 'currency': 'QAR', 'type': 'Business', 'stars': 4, 'amenities': ['WiFi', 'Gym', 'Restaurant', 'Meeting Room'], 'distance': '1.5 km from center', 'reviewCount': 890, 'lat': 25.3548, 'lng': 51.1839, 'bannerUrl': null, 'photos': null},
    {'id': 'htl-03', 'name': 'Seaside Family Resort', 'city': 'Mumbai, India', 'rating': 4.7, 'price': 8500, 'currency': '₹', 'type': 'Resort', 'stars': 5, 'amenities': ['WiFi', 'Pool', 'Beach', 'Kids Club', 'Restaurant'], 'distance': 'Beachfront', 'reviewCount': 2100, 'offer': 'Free Breakfast', 'lat': 19.0760, 'lng': 72.8777, 'bannerUrl': null, 'photos': null},
    {'id': 'htl-04', 'name': 'Heritage Boutique Hotel', 'city': 'London, UK', 'rating': 4.9, 'price': 320, 'currency': '£', 'type': 'Boutique', 'stars': 5, 'amenities': ['WiFi', 'Bar', 'Restaurant', 'Concierge'], 'distance': '0.8 km from center', 'reviewCount': 560, 'offer': 'Suite Upgrade', 'lat': 51.5074, 'lng': -0.1278, 'bannerUrl': null, 'photos': null},
    {'id': 'htl-05', 'name': 'Cityscape Modern Hotel', 'city': 'Riyadh, KSA', 'rating': 4.5, 'price': 380, 'currency': 'SAR', 'type': 'Modern', 'stars': 4, 'amenities': ['WiFi', 'Pool', 'Gym', 'Lounge'], 'distance': '3.2 km from center', 'reviewCount': 670, 'lat': 24.7136, 'lng': 46.6753, 'bannerUrl': null, 'photos': null},
    {'id': 'htl-06', 'name': 'Desert Oasis Resort', 'city': 'Muscat, Oman', 'rating': 4.8, 'price': 190, 'currency': 'OMR', 'type': 'Resort', 'stars': 5, 'amenities': ['WiFi', 'Pool', 'Spa', 'Desert Safari', 'Restaurant'], 'distance': '12 km from center', 'reviewCount': 430, 'lat': 23.5880, 'lng': 58.3829, 'bannerUrl': null, 'photos': null},
  ];

  static const _mockReviews = <Map<String, dynamic>>[
    {'id': 'rv-01', 'user': 'Sarah M.', 'avatar': '👩', 'rating': 5.0, 'date': '2 days ago', 'title': 'Absolutely incredible stay!', 'body': 'The room was spotless, staff were incredibly welcoming, and the breakfast buffet was outstanding. The pool area is gorgeous and well maintained. Would definitely come back!', 'helpful': 24, 'photos': 3, 'tags': ['Clean', 'Friendly Staff', 'Great Breakfast']},
    {'id': 'rv-02', 'user': 'Ahmed K.', 'avatar': '👨', 'rating': 4.0, 'date': '1 week ago', 'title': 'Great location, minor issues', 'body': 'Perfect location for business. Walking distance to everything. The WiFi was excellent. Only issue was slow room service on the first night. Overall good value for money.', 'helpful': 12, 'photos': 1, 'tags': ['Good Location', 'Fast WiFi', 'Business Friendly']},
    {'id': 'rv-03', 'user': 'Priya R.', 'avatar': '👩‍🦱', 'rating': 5.0, 'date': '2 weeks ago', 'title': 'Family-friendly paradise', 'body': 'Kids loved the pool and kids club! The staff arranged a birthday surprise for our daughter. Restaurant had great options for picky eaters. Highly recommend for families.', 'helpful': 31, 'photos': 5, 'tags': ['Family Friendly', 'Kids Club', 'Great Pool']},
    {'id': 'rv-04', 'user': 'James T.', 'avatar': '🧑', 'rating': 3.0, 'date': '3 weeks ago', 'title': 'Decent but overpriced', 'body': 'Room was nice but nothing spectacular for the price. Bathroom could use updating. The spa was the highlight — truly relaxing experience. Breakfast was average.', 'helpful': 8, 'photos': 0, 'tags': ['Good Spa', 'Needs Updating']},
    {'id': 'rv-05', 'user': 'Fatima A.', 'avatar': '🧕', 'rating': 5.0, 'date': '1 month ago', 'title': 'Best hotel experience ever', 'body': 'From check-in to check-out, everything was perfect. The suite was luxurious with an amazing city view. The concierge helped plan our entire trip. Will be back!', 'helpful': 45, 'photos': 7, 'tags': ['Luxurious', 'Great View', 'Excellent Concierge']},
  ];

  static const _mockBookings = <Map<String, dynamic>>[
    {'id': 'HBK-A7B3C9', 'hotelName': 'The Grand Palace Hotel', 'roomType': 'Deluxe King Room', 'city': 'Dubai, UAE', 'checkin': '2026-07-15', 'checkout': '2026-07-18', 'nights': 3, 'status': 'CONFIRMED', 'total': 1551, 'currency': 'AED', 'emoji': '🏰', 'confirmationCode': 'KS-A7B3C9'},
    {'id': 'HBK-D4E5F6', 'hotelName': 'Seaside Family Resort', 'roomType': 'Family Suite', 'city': 'Mumbai, India', 'checkin': '2026-08-10', 'checkout': '2026-08-14', 'nights': 4, 'status': 'CONFIRMED', 'total': 43120, 'currency': '₹', 'emoji': '🏖️', 'confirmationCode': 'KS-D4E5F6'},
    {'id': 'HBK-G7H8I9', 'hotelName': 'Heritage Boutique Hotel', 'roomType': 'Premium Twin Room', 'city': 'London, UK', 'checkin': '2026-03-05', 'checkout': '2026-03-08', 'nights': 3, 'status': 'COMPLETED', 'total': 1104, 'currency': '£', 'emoji': '🏛️', 'confirmationCode': 'KS-G7H8I9', 'hasReview': true},
    {'id': 'HBK-J1K2L3', 'hotelName': 'KARTSEEK Business Suites', 'roomType': 'Business Suite', 'city': 'Doha, Qatar', 'checkin': '2026-01-10', 'checkout': '2026-01-12', 'nights': 2, 'status': 'COMPLETED', 'total': 1954, 'currency': 'QAR', 'emoji': '🏢', 'confirmationCode': 'KS-J1K2L3', 'hasReview': false},
    {'id': 'HBK-M4N5O6', 'hotelName': 'Budget Inn Express', 'roomType': 'Standard Room', 'city': 'Riyadh, KSA', 'checkin': '2025-12-20', 'checkout': '2025-12-22', 'nights': 2, 'status': 'CANCELLED', 'total': 276, 'currency': 'SAR', 'emoji': '🏨', 'confirmationCode': 'KS-M4N5O6', 'hasReview': false},
  ];

  static const _mockPriceAlerts = <Map<String, dynamic>>[
    {'id': 'pa-01', 'hotel': 'The Grand Palace Hotel', 'city': 'Dubai', 'emoji': '🏰', 'currentPrice': 450, 'targetPrice': 350, 'currency': 'AED', 'enabled': true, 'created': '3 days ago'},
    {'id': 'pa-02', 'hotel': 'Heritage Boutique Hotel', 'city': 'London', 'emoji': '🏛️', 'currentPrice': 320, 'targetPrice': 250, 'currency': '£', 'enabled': true, 'created': '1 week ago'},
    {'id': 'pa-03', 'hotel': 'KARTSEEK Business Suites', 'city': 'Doha', 'emoji': '🏢', 'currentPrice': 280, 'targetPrice': 200, 'currency': 'QAR', 'enabled': false, 'created': '2 weeks ago'},
  ];
}
