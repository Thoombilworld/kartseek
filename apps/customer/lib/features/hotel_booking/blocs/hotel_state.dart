enum HotelStatus { initial, loading, loaded, searching, booking, booked, error }

class HotelState {
  final HotelStatus status;
  final List<Map<String, dynamic>> searchResults;
  final List<Map<String, dynamic>> nearbyHotels;
  final List<Map<String, dynamic>> reviews;
  final List<Map<String, dynamic>> priceAlerts;
  final Map<String, dynamic>? selectedHotel;
  final Map<String, dynamic>? booking;
  final List<Map<String, dynamic>> myBookings;
  final Map<String, dynamic>? reviewMeta;
  final String? errorMessage;

  const HotelState({
    this.status = HotelStatus.initial,
    this.searchResults = const [],
    this.nearbyHotels = const [],
    this.reviews = const [],
    this.priceAlerts = const [],
    this.selectedHotel,
    this.booking,
    this.myBookings = const [],
    this.reviewMeta,
    this.errorMessage,
  });

  HotelState copyWith({
    HotelStatus? status,
    List<Map<String, dynamic>>? searchResults,
    List<Map<String, dynamic>>? nearbyHotels,
    List<Map<String, dynamic>>? reviews,
    List<Map<String, dynamic>>? priceAlerts,
    Map<String, dynamic>? selectedHotel,
    Map<String, dynamic>? booking,
    List<Map<String, dynamic>>? myBookings,
    Map<String, dynamic>? reviewMeta,
    String? errorMessage,
  }) => HotelState(
    status: status ?? this.status,
    searchResults: searchResults ?? this.searchResults,
    nearbyHotels: nearbyHotels ?? this.nearbyHotels,
    reviews: reviews ?? this.reviews,
    priceAlerts: priceAlerts ?? this.priceAlerts,
    selectedHotel: selectedHotel ?? this.selectedHotel,
    booking: booking ?? this.booking,
    myBookings: myBookings ?? this.myBookings,
    reviewMeta: reviewMeta ?? this.reviewMeta,
    errorMessage: errorMessage ?? this.errorMessage,
  );
}
