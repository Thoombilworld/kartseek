import 'package:equatable/equatable.dart';

abstract class RestaurantEvent extends Equatable {
  const RestaurantEvent();
  @override
  List<Object?> get props => [];
}

class LoadRestaurants extends RestaurantEvent {
  final String? cuisineFilter;
  final String? sortBy;
  const LoadRestaurants({this.cuisineFilter, this.sortBy});
  @override
  List<Object?> get props => [cuisineFilter, sortBy];
}

class LoadRestaurantById extends RestaurantEvent {
  final String id;
  const LoadRestaurantById(this.id);
  @override
  List<Object?> get props => [id];
}

class LoadRestaurantMenu extends RestaurantEvent {
  final String restaurantId;
  const LoadRestaurantMenu(this.restaurantId);
  @override
  List<Object?> get props => [restaurantId];
}

class SearchRestaurants extends RestaurantEvent {
  final String query;
  const SearchRestaurants(this.query);
  @override
  List<Object?> get props => [query];
}

class LoadNearbyRestaurants extends RestaurantEvent {
  final double lat;
  final double lng;
  final double radiusKm;
  const LoadNearbyRestaurants({required this.lat, required this.lng, this.radiusKm = 5.0});
  @override
  List<Object?> get props => [lat, lng, radiusKm];
}

class LoadCuisines extends RestaurantEvent {
  const LoadCuisines();
}

// ── Cart / Order ─────────────────────────────────────────────────────────────
class AddFoodToCart extends RestaurantEvent {
  final String itemId;
  final int quantity;
  final List<String>? addons;
  const AddFoodToCart({required this.itemId, this.quantity = 1, this.addons});
  @override
  List<Object?> get props => [itemId, quantity, addons];
}

class RemoveFoodFromCart extends RestaurantEvent {
  final String itemId;
  const RemoveFoodFromCart(this.itemId);
  @override
  List<Object?> get props => [itemId];
}

class PlaceFoodOrder extends RestaurantEvent {
  final String restaurantId;
  final String orderType; // 'delivery', 'takeaway', 'dine_in'
  final String paymentMethod;
  final Map<String, dynamic>? extras;
  const PlaceFoodOrder({
    required this.restaurantId, required this.orderType,
    required this.paymentMethod, this.extras,
  });
  @override
  List<Object?> get props => [restaurantId, orderType, paymentMethod];
}

// ── Table Booking ────────────────────────────────────────────────────────────
class BookTable extends RestaurantEvent {
  final String restaurantId;
  final DateTime dateTime;
  final int guests;
  final String? specialRequest;
  const BookTable({
    required this.restaurantId, required this.dateTime,
    required this.guests, this.specialRequest,
  });
  @override
  List<Object?> get props => [restaurantId, dateTime, guests];
}

class LoadTableBookings extends RestaurantEvent {
  const LoadTableBookings();
}

class CancelTableBooking extends RestaurantEvent {
  final String bookingId;
  const CancelTableBooking(this.bookingId);
  @override
  List<Object?> get props => [bookingId];
}

// ── Reviews ──────────────────────────────────────────────────────────────────
class LoadRestaurantReviews extends RestaurantEvent {
  final String restaurantId;
  const LoadRestaurantReviews(this.restaurantId);
  @override
  List<Object?> get props => [restaurantId];
}

class SubmitReview extends RestaurantEvent {
  final String restaurantId;
  final int rating;
  final String? comment;
  const SubmitReview({required this.restaurantId, required this.rating, this.comment});
  @override
  List<Object?> get props => [restaurantId, rating, comment];
}
