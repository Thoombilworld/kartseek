import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/restaurant/blocs/restaurant_event.dart';
import 'package:kartseek_customer/features/restaurant/blocs/restaurant_state.dart';
import 'package:kartseek_customer/features/restaurant/repositories/restaurant_repository.dart';
import 'package:kartseek_customer/features/restaurant/services/restaurant_api_service.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// RestaurantBloc — Manages restaurant discovery, ordering, and table booking.
class RestaurantBloc extends Bloc<RestaurantEvent, RestaurantState> {
  final RestaurantRepository _repository;
  final RestaurantApiService _api = RestaurantApiService();

  RestaurantBloc({RestaurantRepository? repository}) 
      : _repository = repository ?? RestaurantRepository(),
        super(const RestaurantState()) {
    on<LoadRestaurants>(_onLoadRestaurants);
    on<LoadRestaurantById>(_onLoadById);
    on<LoadRestaurantMenu>(_onLoadMenu);
    on<SearchRestaurants>(_onSearch);
    on<LoadNearbyRestaurants>(_onLoadNearby);
    on<LoadCuisines>(_onLoadCuisines);
    on<AddFoodToCart>(_onAddToCart);
    on<RemoveFoodFromCart>(_onRemoveFromCart);
    on<PlaceFoodOrder>(_onPlaceOrder);
    on<BookTable>(_onBookTable);
    on<LoadTableBookings>(_onLoadBookings);
    on<CancelTableBooking>(_onCancelBooking);
    on<LoadRestaurantReviews>(_onLoadReviews);
    on<SubmitReview>(_onSubmitReview);
  }

  Future<void> _onLoadRestaurants(LoadRestaurants event, Emitter<RestaurantState> emit) async {
    emit(state.copyWith(status: RestaurantStatus.loading));
    try {
      final region = RegionService.instance;
      final lat = region.lastDetection?.lat ?? region.currentCountry.defaultLat;
      final lng = region.lastDetection?.lng ?? region.currentCountry.defaultLng;

      final data = await _api.getNearby(
        lat: lat,
        lng: lng,
        radius: 15,
      );
      emit(state.copyWith(status: RestaurantStatus.success, restaurants: data.cast<Map<String, dynamic>>()));
    } catch (err) {
      emit(state.copyWith(status: RestaurantStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadById(LoadRestaurantById event, Emitter<RestaurantState> emit) async {
    emit(state.copyWith(status: RestaurantStatus.loading));
    try {
      final data = await _repository.getRestaurantById(event.id);
      emit(state.copyWith(status: RestaurantStatus.success, selectedRestaurant: data));
    } catch (err) {
      emit(state.copyWith(status: RestaurantStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadMenu(LoadRestaurantMenu event, Emitter<RestaurantState> emit) async {
    emit(state.copyWith(status: RestaurantStatus.loading));
    try {
      final data = await _repository.getRestaurantMenu(event.restaurantId);
      emit(state.copyWith(status: RestaurantStatus.success, menu: data.cast<Map<String, dynamic>>()));
    } catch (err) {
      emit(state.copyWith(status: RestaurantStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onSearch(SearchRestaurants event, Emitter<RestaurantState> emit) async {
    if (event.query.isEmpty) {
      emit(state.copyWith(status: RestaurantStatus.initial, restaurants: []));
      return;
    }
    emit(state.copyWith(status: RestaurantStatus.loading));
    try {
      final data = await _repository.searchRestaurants(event.query);
      emit(state.copyWith(status: RestaurantStatus.success, restaurants: data.cast<Map<String, dynamic>>()));
    } catch (err) {
      emit(state.copyWith(status: RestaurantStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadNearby(LoadNearbyRestaurants event, Emitter<RestaurantState> emit) async {
    emit(state.copyWith(status: RestaurantStatus.loading));
    try {
      final data = await _api.getNearby(
        lat: event.lat, lng: event.lng,
        radius: event.radiusKm.toInt(),
      );
      emit(state.copyWith(status: RestaurantStatus.success, restaurants: data.cast<Map<String, dynamic>>()));
    } catch (err) {
      emit(state.copyWith(status: RestaurantStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadCuisines(LoadCuisines event, Emitter<RestaurantState> emit) async {
    try {
      final data = await _api.getCuisines();
      emit(state.copyWith(cuisines: data.cast<Map<String, dynamic>>()));
    } catch (err) {
      debugPrint('Load cuisines failed: $err');
    }
  }

  // ── Cart ─────────────────────────────────────────────────────────────────────
  void _onAddToCart(AddFoodToCart event, Emitter<RestaurantState> emit) {
    final items = List<Map<String, dynamic>>.from(state.cartItems);
    final existingIdx = items.indexWhere((i) => i['id'] == event.itemId);
    if (existingIdx >= 0) {
      items[existingIdx] = {
        ...items[existingIdx],
        'quantity': (items[existingIdx]['quantity'] as int? ?? 1) + event.quantity,
      };
    } else {
      items.add({'id': event.itemId, 'quantity': event.quantity, 'addons': event.addons ?? []});
    }
    emit(state.copyWith(cartItems: items));
  }

  void _onRemoveFromCart(RemoveFoodFromCart event, Emitter<RestaurantState> emit) {
    final items = state.cartItems.where((i) => i['id'] != event.itemId).toList();
    emit(state.copyWith(cartItems: items));
  }

  Future<void> _onPlaceOrder(PlaceFoodOrder event, Emitter<RestaurantState> emit) async {
    emit(state.copyWith(status: RestaurantStatus.ordering));
    try {
      await _repository.placeOrder({
        'restaurantId': event.restaurantId,
        'items': state.cartItems,
        'type': event.orderType,
        'paymentMethod': event.paymentMethod,
        if (event.extras != null) ...event.extras!,
      });
      emit(state.copyWith(status: RestaurantStatus.ordered, cartItems: []));
    } catch (err) {
      emit(state.copyWith(status: RestaurantStatus.error, errorMessage: err.toString()));
    }
  }

  // ── Table Booking ──────────────────────────────────────────────────────────
  Future<void> _onBookTable(BookTable event, Emitter<RestaurantState> emit) async {
    emit(state.copyWith(status: RestaurantStatus.loading));
    try {
      final data = await _repository.bookTable({
        'restaurantId': event.restaurantId,
        'dateTime': event.dateTime.toIso8601String(),
        'guests': event.guests,
      });
      final bookings = List<Map<String, dynamic>>.from(state.tableBookings)..add(data);
      emit(state.copyWith(status: RestaurantStatus.success, tableBookings: bookings));
    } catch (err) {
      emit(state.copyWith(status: RestaurantStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadBookings(LoadTableBookings event, Emitter<RestaurantState> emit) async {
    try {
      final data = await _api.getMyReservations();
      if (data.isNotEmpty) {
        emit(state.copyWith(tableBookings: data.cast<Map<String, dynamic>>()));
        return;
      }
      emit(state.copyWith(tableBookings: state.tableBookings));
    } catch (err) {
      debugPrint('Load bookings failed: $err');
    }
  }

  Future<void> _onCancelBooking(CancelTableBooking event, Emitter<RestaurantState> emit) async {
    final bookings = state.tableBookings.map((b) {
      if (b['id'] == event.bookingId) return {...b, 'status': 'cancelled'};
      return b;
    }).toList();
    emit(state.copyWith(tableBookings: bookings));
  }

  // ── Reviews ────────────────────────────────────────────────────────────────
  Future<void> _onLoadReviews(LoadRestaurantReviews event, Emitter<RestaurantState> emit) async {
    try {
      final data = await _api.getReviews(event.restaurantId);
      emit(state.copyWith(reviews: data.cast<Map<String, dynamic>>()));
    } catch (err) {
      debugPrint('Load reviews failed: $err');
    }
  }

  Future<void> _onSubmitReview(SubmitReview event, Emitter<RestaurantState> emit) async {
    try {
      await _api.addReview(event.restaurantId, {
        'rating': event.rating,
        'comment': event.comment,
      });
    } catch (err) {
      debugPrint('Submit review failed: $err');
    }
  }
}
