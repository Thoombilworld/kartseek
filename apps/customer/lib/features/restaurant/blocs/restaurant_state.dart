import 'package:equatable/equatable.dart';

enum RestaurantStatus { initial, loading, success, empty, error, ordering, ordered }

class RestaurantState extends Equatable {
  final RestaurantStatus status;
  final List<Map<String, dynamic>> restaurants;
  final Map<String, dynamic>? selectedRestaurant;
  final List<Map<String, dynamic>> menu;
  final List<Map<String, dynamic>> cuisines;
  final List<Map<String, dynamic>> cartItems;
  final List<Map<String, dynamic>> tableBookings;
  final List<Map<String, dynamic>> reviews;
  final String? errorMessage;

  const RestaurantState({
    this.status = RestaurantStatus.initial,
    this.restaurants = const [],
    this.selectedRestaurant,
    this.menu = const [],
    this.cuisines = const [],
    this.cartItems = const [],
    this.tableBookings = const [],
    this.reviews = const [],
    this.errorMessage,
  });

  int get cartTotal => cartItems.fold<int>(0, (sum, item) {
    final price = (item['price'] as num?)?.toInt() ?? 0;
    final qty = (item['quantity'] as num?)?.toInt() ?? 1;
    return sum + (price * qty);
  });

  int get cartItemCount => cartItems.fold<int>(0, (sum, item) =>
      sum + ((item['quantity'] as num?)?.toInt() ?? 1));

  RestaurantState copyWith({
    RestaurantStatus? status,
    List<Map<String, dynamic>>? restaurants,
    Map<String, dynamic>? selectedRestaurant,
    List<Map<String, dynamic>>? menu,
    List<Map<String, dynamic>>? cuisines,
    List<Map<String, dynamic>>? cartItems,
    List<Map<String, dynamic>>? tableBookings,
    List<Map<String, dynamic>>? reviews,
    String? errorMessage,
  }) => RestaurantState(
    status: status ?? this.status,
    restaurants: restaurants ?? this.restaurants,
    selectedRestaurant: selectedRestaurant ?? this.selectedRestaurant,
    menu: menu ?? this.menu,
    cuisines: cuisines ?? this.cuisines,
    cartItems: cartItems ?? this.cartItems,
    tableBookings: tableBookings ?? this.tableBookings,
    reviews: reviews ?? this.reviews,
    errorMessage: errorMessage,
  );

  @override
  List<Object?> get props => [status, restaurants, selectedRestaurant, menu, cartItems, tableBookings, errorMessage];
}
