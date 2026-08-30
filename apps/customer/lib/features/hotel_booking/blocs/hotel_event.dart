abstract class HotelEvent {
  const HotelEvent();
}

class SearchHotels extends HotelEvent {
  final String city;
  final String? checkIn;
  final String? checkOut;
  final int guests;
  final int rooms;
  const SearchHotels({required this.city, this.checkIn, this.checkOut, this.guests = 2, this.rooms = 1});
}

class SearchNearbyHotels extends HotelEvent {
  final double lat;
  final double lng;
  final double radius;
  const SearchNearbyHotels({required this.lat, required this.lng, this.radius = 10.0});
}

class LoadHotelDetail extends HotelEvent {
  final String hotelId;
  const LoadHotelDetail(this.hotelId);
}

class LoadHotelReviews extends HotelEvent {
  final String hotelId;
  final int page;
  const LoadHotelReviews({required this.hotelId, this.page = 1});
}

class SubmitBooking extends HotelEvent {
  final String hotelId;
  final String roomType;
  final Map<String, dynamic> guestDetails;
  const SubmitBooking({required this.hotelId, required this.roomType, required this.guestDetails});
}

class LoadMyBookings extends HotelEvent {
  final String userId;
  const LoadMyBookings({this.userId = 'current-user'});
}

class LoadPriceAlerts extends HotelEvent {
  final String userId;
  const LoadPriceAlerts({this.userId = 'current-user'});
}

class TogglePriceAlert extends HotelEvent {
  final String alertId;
  final bool enabled;
  const TogglePriceAlert({required this.alertId, required this.enabled});
}
