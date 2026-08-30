import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_event.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_state.dart';
import 'package:kartseek_seller/features/shared/services/seller_api_service.dart';

class HotelSellerBloc extends Bloc<HotelSellerEvent, HotelSellerState> {
  final SellerApiService _api;

  HotelSellerBloc({SellerApiService? api})
      : _api = api ?? SellerApiService.instance,
        super(const HotelSellerState()) {
    on<LoadHotelDashboard>(_onLoadDashboard);
    on<LoadHotelBookings>(_onLoadBookings);
    on<SelectHotelBookingTab>(_onSelectTab);
    on<CheckInGuest>(_onCheckIn);
    on<CheckOutGuest>(_onCheckOut);
    on<CancelHotelBooking>(_onCancel);
    on<MarkPaymentReceived>(_onPayment);
    on<AddSpecialRequest>(_onSpecialRequest);
    on<ExtendStay>(_onExtendStay);
    on<LoadHotelRooms>(_onLoadRooms);
    on<UpdateRoomStatus>(_onUpdateRoomStatus);
    on<UpdateRoomPrice>(_onUpdateRoomPrice);
    on<AddRoomNote>(_onAddRoomNote);
    on<MarkRoomCleaning>(_onMarkRoomCleaning);
    on<MarkRoomAvailable>(_onMarkRoomAvailable);
    on<LoadHotelAvailability>(_onLoadAvailability);
    on<BlockHotelDate>(_onBlockDate);
    on<UnblockHotelDate>(_onUnblockDate);
    on<BlockDateRange>(_onBlockRange);
    on<SetSeasonalRate>(_onSeasonalRate);
    on<LoadHotelAnalytics>(_onLoadAnalytics);
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  Future<void> _onLoadDashboard(
      LoadHotelDashboard event, Emitter<HotelSellerState> emit) async {
    emit(state.copyWith(status: HotelBlocStatus.loading, countryCode: event.countryCode));
    try {
      await _api.getDashboard();
    } catch (_) {}

    final bookings  = HotelBookingModel.mockForCountry(event.countryCode);
    final rooms     = HotelRoomModel.mockForCountry(event.countryCode);
    final analytics = HotelAnalyticsData.forCountry(event.countryCode);
    final staff     = HotelStaffModel.mockForCountry(event.countryCode);
    final config    = HotelCountryConfig(event.countryCode);
    final occupied  = rooms.where((r) => r.status == RoomStatus.occupied).length;

    emit(state.copyWith(
      status: HotelBlocStatus.loaded,
      countryCode: event.countryCode,
      bookings: bookings,
      hotelRooms: rooms,
      analytics: analytics,
      staff: staff,
      occupancyRate: config.totalRooms > 0 ? occupied / config.totalRooms : 0.0,
      dashboardData: {
        'hotel_name':     config.hotelName,
        'city':           config.city,
        'star_rating':    config.starRating,
        'total_rooms':    config.totalRooms,
        'occupied_rooms': config.occupiedRooms,
        'rating':         config.rating,
        'adr':            analytics.adr,
        'rev_par':        analytics.revPar,
        'check_in_time':  config.checkInTime,
        'check_out_time': config.checkOutTime,
        'policy':         config.policyText,
      },
    ));
  }

  // ── Bookings ───────────────────────────────────────────────────────────────

  Future<void> _onLoadBookings(
      LoadHotelBookings event, Emitter<HotelSellerState> emit) async {
    emit(state.copyWith(status: HotelBlocStatus.loading));
    final bookings = HotelBookingModel.mockForCountry(event.countryCode);
    emit(state.copyWith(
      status: HotelBlocStatus.loaded,
      countryCode: event.countryCode,
      bookings: bookings,
    ));
  }

  void _onSelectTab(SelectHotelBookingTab event, Emitter<HotelSellerState> emit) =>
      emit(state.copyWith(actionMessage: null));

  void _onCheckIn(CheckInGuest event, Emitter<HotelSellerState> emit) {
    final updated = state.bookings
        .map((b) => b.id == event.bookingId ? b.copyWith(status: 'checked_in') : b)
        .toList();
    emit(state.copyWith(
      bookings: updated,
      actionMessage: '✅ Guest checked in successfully — welcome!',
    ));
    _api.updateOrderStatus(event.bookingId, 'CHECKED_IN');
  }

  void _onCheckOut(CheckOutGuest event, Emitter<HotelSellerState> emit) {
    final updated = state.bookings
        .map((b) => b.id == event.bookingId ? b.copyWith(status: 'checked_out') : b)
        .toList();
    // Mark the room as cleaning after checkout
    final booking = state.bookings.firstWhere(
      (b) => b.id == event.bookingId,
      orElse: () => HotelBookingModel.mock(),
    );
    final roomId = 'ROOM-${booking.roomNumber}';
    final updatedRooms = state.hotelRooms
        .map((r) => r.id == roomId ? r.copyWith(status: RoomStatus.cleaning) : r)
        .toList();
    final occupied = updatedRooms.where((r) => r.status == RoomStatus.occupied).length;
    emit(state.copyWith(
      bookings: updated,
      hotelRooms: updatedRooms,
      occupancyRate: updatedRooms.isNotEmpty ? occupied / updatedRooms.length : 0.0,
      actionMessage: '🚪 Guest checked out — room queued for housekeeping',
    ));
    _api.updateOrderStatus(event.bookingId, 'CHECKED_OUT');
  }

  void _onCancel(CancelHotelBooking event, Emitter<HotelSellerState> emit) {
    final updated = state.bookings
        .map((b) => b.id == event.bookingId ? b.copyWith(status: 'cancelled') : b)
        .toList();
    emit(state.copyWith(
      bookings: updated,
      actionMessage: '❌ Booking cancelled — refund policy applied',
    ));
  }

  void _onPayment(MarkPaymentReceived event, Emitter<HotelSellerState> emit) {
    final updated = state.bookings.map((b) {
      if (b.id == event.bookingId) {
        return b.copyWith(isPaid: true, paidAmount: event.amount);
      }
      return b;
    }).toList();
    emit(state.copyWith(
      bookings: updated,
      actionMessage: '💳 Payment recorded — balance updated',
    ));
  }

  void _onSpecialRequest(AddSpecialRequest event, Emitter<HotelSellerState> emit) {
    final updated = state.bookings.map((b) =>
        b.id == event.bookingId
            ? b.copyWith(specialRequests: event.request)
            : b).toList();
    emit(state.copyWith(
      bookings: updated,
      actionMessage: '📝 Special request saved — housekeeping notified',
    ));
  }

  void _onExtendStay(ExtendStay event, Emitter<HotelSellerState> emit) {
    final updated = state.bookings.map((b) {
      if (b.id == event.bookingId) {
        final newCheckOut = b.checkOut.add(Duration(days: event.extraNights));
        final newTotal = b.pricePerNight * b.nights + b.pricePerNight * event.extraNights;
        return HotelBookingModel(
          id: b.id, guestName: b.guestName, guestPhone: b.guestPhone,
          guestEmail: b.guestEmail, guestNationality: b.guestNationality,
          roomType: b.roomType, roomNumber: b.roomNumber,
          checkIn: b.checkIn, checkOut: newCheckOut,
          totalAmount: newTotal, paidAmount: b.paidAmount,
          status: b.status, paymentMethod: b.paymentMethod,
          isPaid: false, adults: b.adults, children: b.children,
          specialRequests: b.specialRequests, platform: b.platform, source: b.source,
        );
      }
      return b;
    }).toList();
    emit(state.copyWith(
      bookings: updated,
      actionMessage: '📅 Stay extended by ${event.extraNights} night(s) — new total recalculated',
    ));
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────

  Future<void> _onLoadRooms(
      LoadHotelRooms event, Emitter<HotelSellerState> emit) async {
    emit(state.copyWith(status: HotelBlocStatus.loading));
    final rooms = HotelRoomModel.mockForCountry(event.countryCode);
    final occupied = rooms.where((r) => r.status == RoomStatus.occupied).length;
    emit(state.copyWith(
      status: HotelBlocStatus.loaded,
      countryCode: event.countryCode,
      hotelRooms: rooms,
      occupancyRate: rooms.isNotEmpty ? occupied / rooms.length : 0.0,
    ));
  }

  void _onUpdateRoomStatus(UpdateRoomStatus event, Emitter<HotelSellerState> emit) {
    final statusMap = {
      'available':  RoomStatus.available,
      'occupied':   RoomStatus.occupied,
      'cleaning':   RoomStatus.cleaning,
      'maintenance':RoomStatus.maintenance,
      'out_of_order': RoomStatus.outOfOrder,
    };
    final newStatus = statusMap[event.status] ?? RoomStatus.available;
    final updated = state.hotelRooms
        .map((r) => r.id == event.roomId ? r.copyWith(status: newStatus) : r)
        .toList();
    final occupied = updated.where((r) => r.status == RoomStatus.occupied).length;
    emit(state.copyWith(
      hotelRooms: updated,
      occupancyRate: updated.isNotEmpty ? occupied / updated.length : 0.0,
      actionMessage: 'Room updated to ${event.status} ✅',
    ));
  }

  void _onUpdateRoomPrice(UpdateRoomPrice event, Emitter<HotelSellerState> emit) {
    final updated = state.hotelRooms
        .map((r) => r.id == event.roomId ? r.copyWith(pricePerNight: event.price) : r)
        .toList();
    emit(state.copyWith(
      hotelRooms: updated,
      actionMessage: 'Room price updated ✅',
    ));
  }

  void _onAddRoomNote(AddRoomNote event, Emitter<HotelSellerState> emit) {
    final updated = state.hotelRooms
        .map((r) => r.id == event.roomId ? r.copyWith(notes: event.note) : r)
        .toList();
    emit(state.copyWith(hotelRooms: updated, actionMessage: '📝 Room note saved'));
  }

  void _onMarkRoomCleaning(MarkRoomCleaning event, Emitter<HotelSellerState> emit) {
    final updated = state.hotelRooms
        .map((r) => r.id == event.roomId ? r.copyWith(status: RoomStatus.cleaning) : r)
        .toList();
    final occupied = updated.where((r) => r.status == RoomStatus.occupied).length;
    emit(state.copyWith(
      hotelRooms: updated,
      occupancyRate: updated.isNotEmpty ? occupied / updated.length : 0.0,
      actionMessage: '🧹 Room queued for housekeeping',
    ));
  }

  void _onMarkRoomAvailable(MarkRoomAvailable event, Emitter<HotelSellerState> emit) {
    final updated = state.hotelRooms
        .map((r) => r.id == event.roomId ? r.copyWith(status: RoomStatus.available) : r)
        .toList();
    final occupied = updated.where((r) => r.status == RoomStatus.occupied).length;
    emit(state.copyWith(
      hotelRooms: updated,
      occupancyRate: updated.isNotEmpty ? occupied / updated.length : 0.0,
      actionMessage: '✅ Room marked available',
    ));
  }

  // ── Availability ───────────────────────────────────────────────────────────

  Future<void> _onLoadAvailability(
      LoadHotelAvailability event, Emitter<HotelSellerState> emit) async {
    emit(state.copyWith(status: HotelBlocStatus.loaded, countryCode: event.countryCode));
  }

  void _onBlockDate(BlockHotelDate event, Emitter<HotelSellerState> emit) {
    final updated = Set<DateTime>.from(state.blockedDates)..add(event.date);
    emit(state.copyWith(blockedDates: updated, actionMessage: '🚫 Date blocked'));
  }

  void _onUnblockDate(UnblockHotelDate event, Emitter<HotelSellerState> emit) {
    final updated = Set<DateTime>.from(state.blockedDates)..remove(event.date);
    emit(state.copyWith(blockedDates: updated, actionMessage: '✅ Date unblocked'));
  }

  void _onBlockRange(BlockDateRange event, Emitter<HotelSellerState> emit) {
    final updated = Set<DateTime>.from(state.blockedDates);
    for (var d = event.from;
         !d.isAfter(event.to);
         d = d.add(const Duration(days: 1))) {
      updated.add(DateTime(d.year, d.month, d.day));
    }
    emit(state.copyWith(blockedDates: updated, actionMessage: '🚫 Date range blocked'));
  }

  void _onSeasonalRate(SetSeasonalRate event, Emitter<HotelSellerState> emit) =>
      emit(state.copyWith(actionMessage: '💰 Seasonal rate set (${(event.multiplier * 100 - 100).toStringAsFixed(0)}% surcharge)'));

  // ── Analytics ──────────────────────────────────────────────────────────────

  Future<void> _onLoadAnalytics(
      LoadHotelAnalytics event, Emitter<HotelSellerState> emit) async {
    final analytics = HotelAnalyticsData.forCountry(event.countryCode);
    emit(state.copyWith(analytics: analytics));
  }
}
