/// KARTSEEK Taxi Booking — Booking BLoC
///
/// Manages the full ride lifecycle: trip planning, vehicle selection,
/// fare estimation, ride request, driver matching, tracking, OTP,
/// completion, and rating.
library;

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';
import '../../domain/entities/entities.dart';
import '../../domain/entities/ride_status.dart';
import '../../domain/repositories/repositories.dart';
import '../../data/repositories/taxi_repository_impl.dart';
import '../../data/datasources/taxi_local_datasource.dart';
import '../../taxi_booking_routes.dart' show resetBookingSession;

// ─── Events ─────────────────────────────────────────────────────────────────

abstract class BookingEvent extends Equatable {
  const BookingEvent();
  @override
  List<Object?> get props => [];
}

// Trip Planning
class SetPickupLocation extends BookingEvent {
  final GeoLocation pickup;
  const SetPickupLocation(this.pickup);
  @override
  List<Object?> get props => [pickup];
}

class SetDestination extends BookingEvent {
  final GeoLocation destination;
  const SetDestination(this.destination);
  @override
  List<Object?> get props => [destination];
}

class AddTripStop extends BookingEvent {
  final GeoLocation location;
  const AddTripStop(this.location);
  @override
  List<Object?> get props => [location];
}

class RemoveTripStop extends BookingEvent {
  final int index;
  const RemoveTripStop(this.index);
  @override
  List<Object?> get props => [index];
}

class ReorderTripStops extends BookingEvent {
  final int oldIndex;
  final int newIndex;
  const ReorderTripStops(this.oldIndex, this.newIndex);
  @override
  List<Object?> get props => [oldIndex, newIndex];
}

class CalculateRoute extends BookingEvent {}

// Vehicle & Fare
class LoadVehicleCategories extends BookingEvent {
  final String countryCode;
  const LoadVehicleCategories(this.countryCode);
  @override
  List<Object?> get props => [countryCode];
}

class SelectVehicleCategory extends BookingEvent {
  final VehicleCategory category;
  const SelectVehicleCategory(this.category);
  @override
  List<Object?> get props => [category];
}

class EstimateFare extends BookingEvent {}

// Payment
class SelectPaymentMethod extends BookingEvent {
  final PaymentMethod method;
  const SelectPaymentMethod(this.method);
  @override
  List<Object?> get props => [method];
}

class ApplyPromotionCode extends BookingEvent {
  final String code;
  const ApplyPromotionCode(this.code);
  @override
  List<Object?> get props => [code];
}

// Booking
class ConfirmPickup extends BookingEvent {
  final String? note;
  const ConfirmPickup({this.note});
  @override
  List<Object?> get props => [note];
}

class RequestRide extends BookingEvent {}

class CancelRide extends BookingEvent {
  final String? reason;
  const CancelRide({this.reason});
  @override
  List<Object?> get props => [reason];
}

// Real-time updates
class DriverAssignedUpdate extends BookingEvent {
  final Driver driver;
  final Vehicle? vehicle;
  const DriverAssignedUpdate(this.driver, {this.vehicle});
  @override
  List<Object?> get props => [driver, vehicle];
}

class DriverLocationUpdate extends BookingEvent {
  final double lat;
  final double lng;
  final double heading;
  const DriverLocationUpdate(this.lat, this.lng, this.heading);
  @override
  List<Object?> get props => [lat, lng, heading];
}

class RideStatusUpdate extends BookingEvent {
  final RideStatus status;
  const RideStatusUpdate(this.status);
  @override
  List<Object?> get props => [status];
}

// OTP
class GenerateOtp extends BookingEvent {}

// Completion
class RateTrip extends BookingEvent {
  final int stars;
  final String? comment;
  final double? tip;
  const RateTrip({required this.stars, this.comment, this.tip});
  @override
  List<Object?> get props => [stars, comment, tip];
}

class ResetBooking extends BookingEvent {}

// ─── State ──────────────────────────────────────────────────────────────────

class BookingState extends Equatable {
  final GeoLocation? pickup;
  final GeoLocation? destination;
  final List<TripStop> stops;
  final RouteEstimate? routeEstimate;
  final List<VehicleCategory> vehicleCategories;
  final VehicleCategory? selectedVehicle;
  final FareEstimate? fareEstimate;
  final PaymentMethod? selectedPayment;
  final List<PaymentMethod> availablePayments;
  final ActiveTrip? activeTrip;
  final String? otp;
  final String? pickupNote;
  final String? promotionCode;
  final bool isCalculatingRoute;
  final bool isEstimatingFare;
  final bool isLoadingCategories;
  final bool isRequesting;
  final bool isRating;
  final String? errorMessage;
  final double? cancellationFee;

  const BookingState({
    this.pickup,
    this.destination,
    this.stops = const [],
    this.routeEstimate,
    this.vehicleCategories = const [],
    this.selectedVehicle,
    this.fareEstimate,
    this.selectedPayment,
    this.availablePayments = const [],
    this.activeTrip,
    this.otp,
    this.pickupNote,
    this.promotionCode,
    this.isCalculatingRoute = false,
    this.isEstimatingFare = false,
    this.isLoadingCategories = false,
    this.isRequesting = false,
    this.isRating = false,
    this.errorMessage,
    this.cancellationFee,
  });

  /// Current booking phase for navigation.
  BookingPhase get phase {
    if (activeTrip != null) {
      final status = activeTrip!.status;
      if (status == RideStatus.searchingDriver || status == RideStatus.requesting) {
        return BookingPhase.searching;
      }
      if (status == RideStatus.driverAssigned || status == RideStatus.driverEnRoute) {
        return BookingPhase.driverEnRoute;
      }
      if (status == RideStatus.driverArrived || status == RideStatus.otpPending) {
        return BookingPhase.driverArrived;
      }
      if (status.isInProgress) return BookingPhase.inTrip;
      if (status == RideStatus.tripCompleted || status == RideStatus.paymentCompleted) {
        return BookingPhase.completed;
      }
      if (status.isTerminal) return BookingPhase.idle;
    }
    if (fareEstimate != null && selectedPayment != null) return BookingPhase.confirmPickup;
    if (fareEstimate != null) return BookingPhase.selectPayment;
    if (selectedVehicle != null) return BookingPhase.estimatingFare;
    if (routeEstimate != null) return BookingPhase.selectVehicle;
    if (destination != null) return BookingPhase.routePreview;
    return BookingPhase.idle;
  }

  BookingState copyWith({
    GeoLocation? pickup,
    GeoLocation? destination,
    List<TripStop>? stops,
    RouteEstimate? routeEstimate,
    List<VehicleCategory>? vehicleCategories,
    VehicleCategory? selectedVehicle,
    FareEstimate? fareEstimate,
    PaymentMethod? selectedPayment,
    List<PaymentMethod>? availablePayments,
    ActiveTrip? activeTrip,
    String? otp,
    String? pickupNote,
    String? promotionCode,
    bool? isCalculatingRoute,
    bool? isEstimatingFare,
    bool? isLoadingCategories,
    bool? isRequesting,
    bool? isRating,
    String? errorMessage,
    double? cancellationFee,
  }) =>
      BookingState(
        pickup: pickup ?? this.pickup,
        destination: destination ?? this.destination,
        stops: stops ?? this.stops,
        routeEstimate: routeEstimate ?? this.routeEstimate,
        vehicleCategories: vehicleCategories ?? this.vehicleCategories,
        selectedVehicle: selectedVehicle ?? this.selectedVehicle,
        fareEstimate: fareEstimate ?? this.fareEstimate,
        selectedPayment: selectedPayment ?? this.selectedPayment,
        availablePayments: availablePayments ?? this.availablePayments,
        activeTrip: activeTrip ?? this.activeTrip,
        otp: otp ?? this.otp,
        pickupNote: pickupNote ?? this.pickupNote,
        promotionCode: promotionCode ?? this.promotionCode,
        isCalculatingRoute: isCalculatingRoute ?? this.isCalculatingRoute,
        isEstimatingFare: isEstimatingFare ?? this.isEstimatingFare,
        isLoadingCategories: isLoadingCategories ?? this.isLoadingCategories,
        isRequesting: isRequesting ?? this.isRequesting,
        isRating: isRating ?? this.isRating,
        errorMessage: errorMessage,
        cancellationFee: cancellationFee ?? this.cancellationFee,
      );

  @override
  List<Object?> get props => [
        pickup, destination, stops, routeEstimate,
        vehicleCategories, selectedVehicle, fareEstimate,
        selectedPayment, availablePayments, activeTrip,
        otp, pickupNote, promotionCode,
        isCalculatingRoute, isEstimatingFare, isLoadingCategories,
        isRequesting, isRating, errorMessage, cancellationFee,
      ];
}

enum BookingPhase {
  idle,
  routePreview,
  selectVehicle,
  estimatingFare,
  selectPayment,
  confirmPickup,
  searching,
  driverEnRoute,
  driverArrived,
  inTrip,
  completed,
}

// ─── BLoC ───────────────────────────────────────────────────────────────────

class BookingBloc extends Bloc<BookingEvent, BookingState> {
  final TaxiBookingRepository _bookingRepo;
  final TaxiLocationRepository _locationRepo;
  final TaxiRealtimeRepository _realtimeRepo;
  final TaxiLocalDatasource _local;

  StreamSubscription? _driverLocationSub;
  StreamSubscription? _rideStatusSub;
  StreamSubscription? _driverAssignedSub;

  BookingBloc({
    TaxiBookingRepository? bookingRepo,
    TaxiLocationRepository? locationRepo,
    TaxiRealtimeRepository? realtimeRepo,
    TaxiLocalDatasource? local,
  })  : _bookingRepo = bookingRepo ?? TaxiBookingRepositoryImpl(),
        _locationRepo = locationRepo ?? TaxiLocationRepositoryImpl(),
        _realtimeRepo = realtimeRepo ?? TaxiRealtimeRepositoryImpl(),
        _local = local ?? TaxiLocalDatasource(),
        super(const BookingState()) {
    // Trip planning
    on<SetPickupLocation>(_onSetPickup);
    on<SetDestination>(_onSetDestination);
    on<AddTripStop>(_onAddStop);
    on<RemoveTripStop>(_onRemoveStop);
    on<ReorderTripStops>(_onReorderStops);
    on<CalculateRoute>(_onCalculateRoute, transformer: restartable());

    // Vehicle & fare
    on<LoadVehicleCategories>(_onLoadCategories, transformer: droppable());
    on<SelectVehicleCategory>(_onSelectVehicle);
    on<EstimateFare>(_onEstimateFare, transformer: restartable());

    // Payment
    on<SelectPaymentMethod>(_onSelectPayment);
    on<ApplyPromotionCode>(_onApplyPromotion);

    // Booking
    on<ConfirmPickup>(_onConfirmPickup);
    on<RequestRide>(_onRequestRide, transformer: droppable());
    on<CancelRide>(_onCancelRide, transformer: droppable());

    // Real-time
    on<DriverAssignedUpdate>(_onDriverAssigned);
    on<DriverLocationUpdate>(_onDriverLocation);
    on<RideStatusUpdate>(_onRideStatus);

    // OTP
    on<GenerateOtp>(_onGenerateOtp);

    // Completion
    on<RateTrip>(_onRateTrip, transformer: droppable());
    on<ResetBooking>(_onReset);

    // Start listening to realtime events
    _initRealtimeListeners();
  }

  void _initRealtimeListeners() {
    _driverLocationSub = _realtimeRepo.driverLocationStream.listen((driver) {
      add(DriverLocationUpdate(driver.lat, driver.lng, driver.heading));
    });

    _rideStatusSub = _realtimeRepo.rideStatusStream.listen((status) {
      add(RideStatusUpdate(status));
    });
  }

  // ─── Trip Planning ────────────────────────────────────────────────────

  void _onSetPickup(SetPickupLocation event, Emitter<BookingState> emit) {
    emit(state.copyWith(pickup: event.pickup));
  }

  void _onSetDestination(SetDestination event, Emitter<BookingState> emit) {
    emit(state.copyWith(destination: event.destination));
    if (state.pickup != null) {
      add(CalculateRoute());
    }
  }

  void _onAddStop(AddTripStop event, Emitter<BookingState> emit) {
    final stops = List<TripStop>.from(state.stops);
    stops.add(TripStop(
      id: 'stop-${DateTime.now().millisecondsSinceEpoch}',
      location: event.location,
      order: stops.length,
    ));
    emit(state.copyWith(stops: stops));
    add(CalculateRoute());
  }

  void _onRemoveStop(RemoveTripStop event, Emitter<BookingState> emit) {
    final stops = List<TripStop>.from(state.stops);
    if (event.index < stops.length) {
      stops.removeAt(event.index);
      // Reorder
      for (int i = 0; i < stops.length; i++) {
        stops[i] = stops[i].copyWith(order: i);
      }
      emit(state.copyWith(stops: stops));
      add(CalculateRoute());
    }
  }

  void _onReorderStops(ReorderTripStops event, Emitter<BookingState> emit) {
    final stops = List<TripStop>.from(state.stops);
    final item = stops.removeAt(event.oldIndex);
    stops.insert(event.newIndex, item);
    for (int i = 0; i < stops.length; i++) {
      stops[i] = stops[i].copyWith(order: i);
    }
    emit(state.copyWith(stops: stops));
    add(CalculateRoute());
  }

  Future<void> _onCalculateRoute(CalculateRoute event, Emitter<BookingState> emit) async {
    if (state.pickup == null || state.destination == null) return;
    emit(state.copyWith(isCalculatingRoute: true));

    try {
      final route = await _locationRepo.calculateRoute(
        pickup: state.pickup!,
        destination: state.destination!,
        stops: state.stops,
      );
      emit(state.copyWith(routeEstimate: route, isCalculatingRoute: false));
    } catch (e) {
      emit(state.copyWith(
        isCalculatingRoute: false,
        errorMessage: 'Could not calculate route',
      ));
    }
  }

  // ─── Vehicle & Fare ───────────────────────────────────────────────────

  Future<void> _onLoadCategories(LoadVehicleCategories event, Emitter<BookingState> emit) async {
    if (state.pickup == null || state.destination == null) return;
    emit(state.copyWith(isLoadingCategories: true));

    try {
      final categories = await _bookingRepo.getVehicleCategories(
        pickup: state.pickup!,
        destination: state.destination!,
        countryCode: event.countryCode,
      );
      emit(state.copyWith(
        vehicleCategories: categories,
        isLoadingCategories: false,
        // Auto-select first
        selectedVehicle: categories.isNotEmpty ? categories.first : null,
      ));
      // Auto-estimate fare for first category
      if (categories.isNotEmpty) {
        add(EstimateFare());
      }
    } catch (e) {
      emit(state.copyWith(
        isLoadingCategories: false,
        errorMessage: 'Could not load vehicle types',
      ));
    }
  }

  void _onSelectVehicle(SelectVehicleCategory event, Emitter<BookingState> emit) {
    emit(state.copyWith(selectedVehicle: event.category));
    add(EstimateFare());
  }

  Future<void> _onEstimateFare(EstimateFare event, Emitter<BookingState> emit) async {
    if (state.pickup == null || state.destination == null || state.selectedVehicle == null) return;
    emit(state.copyWith(isEstimatingFare: true));

    try {
      final fare = await _bookingRepo.estimateFare(
        pickup: state.pickup!,
        destination: state.destination!,
        vehicleType: state.selectedVehicle!.id,
      );
      emit(state.copyWith(fareEstimate: fare, isEstimatingFare: false));
    } catch (e) {
      emit(state.copyWith(
        isEstimatingFare: false,
        errorMessage: 'Could not estimate fare',
      ));
    }
  }

  // ─── Payment ──────────────────────────────────────────────────────────

  void _onSelectPayment(SelectPaymentMethod event, Emitter<BookingState> emit) {
    emit(state.copyWith(selectedPayment: event.method));
  }

  Future<void> _onApplyPromotion(ApplyPromotionCode event, Emitter<BookingState> emit) async {
    emit(state.copyWith(promotionCode: event.code));
    // Re-estimate fare with promotion
    add(EstimateFare());
  }

  // ─── Booking ──────────────────────────────────────────────────────────

  void _onConfirmPickup(ConfirmPickup event, Emitter<BookingState> emit) {
    emit(state.copyWith(pickupNote: event.note));
  }

  Future<void> _onRequestRide(RequestRide event, Emitter<BookingState> emit) async {
    if (state.pickup == null || state.destination == null ||
        state.selectedVehicle == null || state.selectedPayment == null) {
      emit(state.copyWith(errorMessage: 'Please complete all booking details'));
      return;
    }

    emit(state.copyWith(isRequesting: true));

    try {
      final trip = await _bookingRepo.requestRide(
        pickup: state.pickup!,
        destination: state.destination!,
        vehicleType: state.selectedVehicle!.id,
        paymentMethodId: state.selectedPayment!.id,
        fareEstimate: state.fareEstimate?.totalEstimate ?? 0,
        stops: state.stops,
        promotionCode: state.promotionCode,
        pickupNote: state.pickupNote,
      );

      // Join realtime tracking
      _realtimeRepo.joinRideTracking(trip.rideId);

      emit(state.copyWith(
        activeTrip: trip,
        isRequesting: false,
      ));

      debugPrint('[Booking] ✅ Ride requested: ${trip.rideId}');
    } catch (e) {
      debugPrint('[Booking] ❌ Request failed: $e');
      emit(state.copyWith(
        isRequesting: false,
        errorMessage: 'Could not request ride. Please try again.',
      ));
    }
  }

  Future<void> _onCancelRide(CancelRide event, Emitter<BookingState> emit) async {
    if (state.activeTrip == null) return;

    try {
      final fee = await _bookingRepo.cancelRide(
        rideId: state.activeTrip!.rideId,
        reason: event.reason,
      );

      _realtimeRepo.leaveRideTracking(state.activeTrip!.rideId);

      emit(state.copyWith(
        activeTrip: state.activeTrip!.copyWith(
          status: RideStatus.customerCancelled,
        ),
        cancellationFee: fee,
      ));
    } catch (e) {
      emit(state.copyWith(errorMessage: 'Could not cancel ride'));
    }
  }

  // ─── Real-time Updates ────────────────────────────────────────────────

  void _onDriverAssigned(DriverAssignedUpdate event, Emitter<BookingState> emit) {
    if (state.activeTrip == null) return;
    emit(state.copyWith(
      activeTrip: state.activeTrip!.copyWith(
        status: RideStatus.driverAssigned,
        driver: event.driver,
        vehicle: event.vehicle,
      ),
    ));
  }

  void _onDriverLocation(DriverLocationUpdate event, Emitter<BookingState> emit) {
    if (state.activeTrip?.driver == null) return;
    emit(state.copyWith(
      activeTrip: state.activeTrip!.copyWith(
        driver: state.activeTrip!.driver!.copyWith(
          lat: event.lat,
          lng: event.lng,
          heading: event.heading,
        ),
      ),
    ));
  }

  void _onRideStatus(RideStatusUpdate event, Emitter<BookingState> emit) {
    if (state.activeTrip == null) return;
    emit(state.copyWith(
      activeTrip: state.activeTrip!.copyWith(status: event.status),
    ));

    // Auto-generate OTP when driver arrives
    if (event.status == RideStatus.driverArrived) {
      add(GenerateOtp());
    }
  }

  // ─── OTP ──────────────────────────────────────────────────────────────

  Future<void> _onGenerateOtp(GenerateOtp event, Emitter<BookingState> emit) async {
    if (state.activeTrip == null) return;
    try {
      // Generate a 4-digit OTP
      final otp = (1000 + (DateTime.now().millisecondsSinceEpoch % 9000)).toString();
      // Persist OTP locally for recovery
      await _local.saveOtp(state.activeTrip!.rideId, otp);
      emit(state.copyWith(
        otp: otp,
        activeTrip: state.activeTrip!.copyWith(
          otp: otp,
          status: RideStatus.otpPending,
          otpExpiresAt: DateTime.now().add(const Duration(minutes: 5)),
        ),
      ));
      debugPrint('[Booking] 🔑 OTP generated: $otp');
    } catch (e) {
      debugPrint('[Booking] OTP generation failed: $e');
    }
  }

  // ─── Completion ───────────────────────────────────────────────────────

  Future<void> _onRateTrip(RateTrip event, Emitter<BookingState> emit) async {
    if (state.activeTrip == null) return;
    emit(state.copyWith(isRating: true));

    try {
      await _bookingRepo.rateRide(
        rideId: state.activeTrip!.rideId,
        stars: event.stars,
        comment: event.comment,
        tipAmount: event.tip,
      );
      emit(state.copyWith(isRating: false));
    } catch (e) {
      emit(state.copyWith(isRating: false, errorMessage: 'Could not submit rating'));
    }
  }

  void _onReset(ResetBooking event, Emitter<BookingState> emit) {
    if (state.activeTrip != null) {
      _realtimeRepo.leaveRideTracking(state.activeTrip!.rideId);
      _local.clearActiveRideId();
    }
    emit(const BookingState());
    // Reset the singleton holder so the next taxi session starts fresh
    resetBookingSession();
  }

  @override
  Future<void> close() {
    _driverLocationSub?.cancel();
    _rideStatusSub?.cancel();
    _driverAssignedSub?.cancel();
    return super.close();
  }
}
