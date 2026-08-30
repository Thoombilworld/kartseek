import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'hotel_event.dart';
import 'hotel_state.dart';
import 'package:kartseek_customer/features/hotel_booking/services/hotel_api_service.dart';

class HotelBloc extends Bloc<HotelEvent, HotelState> {
  final HotelApiService _api;

  HotelBloc({HotelApiService? api})
      : _api = api ?? HotelApiService(),
        super(const HotelState()) {
    on<SearchHotels>(_onSearch);
    on<SearchNearbyHotels>(_onNearbySearch);
    on<LoadHotelDetail>(_onLoadDetail);
    on<LoadHotelReviews>(_onLoadReviews);
    on<SubmitBooking>(_onSubmitBooking);
    on<LoadMyBookings>(_onLoadBookings);
    on<LoadPriceAlerts>(_onLoadPriceAlerts);
    on<TogglePriceAlert>(_onTogglePriceAlert);
  }

  Future<void> _onSearch(SearchHotels event, Emitter<HotelState> emit) async {
    emit(state.copyWith(status: HotelStatus.searching));
    try {
      final result = await _api.searchHotels(
        city: event.city,
        checkin: event.checkIn,
        checkout: event.checkOut,
        guests: event.guests,
      );
      final hotels = (result['hotels'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      emit(state.copyWith(status: HotelStatus.loaded, searchResults: hotels));
    } catch (e) {
      debugPrint('[HotelBloc] ❌ Search failed: $e');
      emit(state.copyWith(status: HotelStatus.error));
    }
  }

  Future<void> _onNearbySearch(SearchNearbyHotels event, Emitter<HotelState> emit) async {
    emit(state.copyWith(status: HotelStatus.searching));
    try {
      final result = await _api.searchNearbyHotels(
        lat: event.lat,
        lng: event.lng,
        radius: event.radius,
      );
      final hotels = (result['hotels'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      emit(state.copyWith(status: HotelStatus.loaded, nearbyHotels: hotels));
    } catch (e) {
      debugPrint('[HotelBloc] ❌ Nearby search failed: $e');
      emit(state.copyWith(status: HotelStatus.error));
    }
  }

  Future<void> _onLoadDetail(LoadHotelDetail event, Emitter<HotelState> emit) async {
    emit(state.copyWith(status: HotelStatus.loading));
    try {
      final hotel = await _api.getHotelById(event.hotelId);
      emit(state.copyWith(status: HotelStatus.loaded, selectedHotel: hotel));
    } catch (e) {
      debugPrint('[HotelBloc] ❌ Load detail failed: $e');
      emit(state.copyWith(status: HotelStatus.error));
    }
  }

  Future<void> _onLoadReviews(LoadHotelReviews event, Emitter<HotelState> emit) async {
    emit(state.copyWith(status: HotelStatus.loading));
    try {
      final result = await _api.getHotelReviews(event.hotelId, page: event.page);
      final reviews = (result['reviews'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      final meta = <String, dynamic>{
        'averageRating': result['averageRating'],
        'ratingDistribution': result['ratingDistribution'],
        'total': result['total'],
      };
      emit(state.copyWith(status: HotelStatus.loaded, reviews: reviews, reviewMeta: meta));
    } catch (e) {
      debugPrint('[HotelBloc] ❌ Load reviews failed: $e');
      emit(state.copyWith(status: HotelStatus.error));
    }
  }

  Future<void> _onSubmitBooking(SubmitBooking event, Emitter<HotelState> emit) async {
    emit(state.copyWith(status: HotelStatus.booking));
    try {
      final booking = await _api.createBooking(event.hotelId, {
        'roomType': event.roomType,
        ...event.guestDetails,
      });
      emit(state.copyWith(
        status: HotelStatus.booked,
        booking: booking,
        myBookings: [...state.myBookings, booking],
      ));
      debugPrint('[HotelBloc] ✅ Booking confirmed: ${booking['id']}');
    } catch (e) {
      debugPrint('[HotelBloc] ❌ Booking failed: $e');
      emit(state.copyWith(status: HotelStatus.error));
    }
  }

  Future<void> _onLoadBookings(LoadMyBookings event, Emitter<HotelState> emit) async {
    emit(state.copyWith(status: HotelStatus.loading));
    try {
      final result = await _api.getUserBookings(event.userId, page: 1, limit: 20);
      final bookings = (result['bookings'] as List?)?.cast<Map<String, dynamic>>() ?? state.myBookings;
      emit(state.copyWith(status: HotelStatus.loaded, myBookings: bookings));
    } catch (e) {
      debugPrint('[HotelBloc] ❌ Load bookings failed: $e');
      emit(state.copyWith(status: HotelStatus.loaded, myBookings: state.myBookings));
    }
  }

  Future<void> _onLoadPriceAlerts(LoadPriceAlerts event, Emitter<HotelState> emit) async {
    emit(state.copyWith(status: HotelStatus.loading));
    try {
      final result = await _api.getPriceAlerts(event.userId);
      final alerts = (result['alerts'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      emit(state.copyWith(status: HotelStatus.loaded, priceAlerts: alerts));
    } catch (e) {
      debugPrint('[HotelBloc] ❌ Load price alerts failed: $e');
      emit(state.copyWith(status: HotelStatus.loaded));
    }
  }

  Future<void> _onTogglePriceAlert(TogglePriceAlert event, Emitter<HotelState> emit) async {
    try {
      await _api.togglePriceAlert(event.alertId, event.enabled);
      // Update local state
      final updatedAlerts = state.priceAlerts.map((a) {
        if (a['id'] == event.alertId) {
          return <String, dynamic>{...a, 'enabled': event.enabled};
        }
        return a;
      }).toList();
      emit(state.copyWith(priceAlerts: updatedAlerts));
    } catch (e) {
      debugPrint('[HotelBloc] ❌ Toggle alert failed: $e');
    }
  }
}
