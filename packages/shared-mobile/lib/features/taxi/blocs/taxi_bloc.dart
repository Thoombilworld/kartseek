import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:kartseek_shared_mobile/core/security/secure_api_client.dart';
import 'package:kartseek_shared_mobile/core/services/taxi_socket_service.dart' hide NearbyDriver;
import 'package:kartseek_shared_mobile/features/taxi/blocs/taxi_event.dart';
import 'package:kartseek_shared_mobile/features/taxi/blocs/taxi_state.dart';

// Internal private events for socket data streaming
class _NearbyDriversUpdated extends TaxiEvent {
  final List<NearbyDriver> drivers;
  const _NearbyDriversUpdated(this.drivers);
  @override
  List<Object?> get props => [drivers];
}

class _DriverSocketLocationUpdated extends TaxiEvent {
  final double lat;
  final double lng;
  const _DriverSocketLocationUpdated(this.lat, this.lng);
  @override
  List<Object?> get props => [lat, lng];
}

/// TaxiBloc — Manages the entire taxi ride lifecycle with Uber-style matching.
class TaxiBloc extends Bloc<TaxiEvent, TaxiState> {
  final _api = SecureApiClient();
  final _socket = TaxiSocketService();
  StreamSubscription? _locationSub;
  StreamSubscription? _nearbySub;
  StreamSubscription? _driverAssignedSub;
  StreamSubscription? _rideStatusSub;

  TaxiBloc() : super(const TaxiState()) {
    on<EstimateFare>(_onEstimateFare, transformer: restartable());
    on<SelectVehicleType>(_onSelectVehicle);
    on<SetPaymentMethod>(_onSetPayment);
    on<RequestRide>(_onRequestRide, transformer: droppable());
    on<CancelRide>(_onCancelRide, transformer: droppable());
    on<TrackRide>(_onTrackRide, transformer: restartable());
    on<UpdateRideStatus>(_onUpdateRideStatus);
    on<DriverLocationUpdated>(_onDriverLocationUpdated);
    on<LoadNearbyDrivers>(_onLoadNearbyDrivers, transformer: restartable());
    on<LoadRideHistory>(_onLoadRideHistory, transformer: droppable());
    on<RateRide>(_onRateRide, transformer: droppable());
    on<SelectPreferredDriver>(_onSelectPreferredDriver);
    on<DriverAssigned>(_onDriverAssigned);
    on<RideStatusChanged>(_onRideStatusChanged);
    on<SetPickupLocation>(_onSetPickup);
    on<SetDestination>(_onSetDestination);
    on<VerifyOtp>(_onVerifyOtp);
    on<TipDriver>(_onTipDriver);
    on<TriggerSOS>(_onTriggerSOS, transformer: droppable());
    on<ApplyPromoCode>(_onApplyPromoCode);
    on<ClearPromoCode>(_onClearPromoCode);
    on<RaiseDispute>(_onRaiseDispute, transformer: droppable());

    // Private socket stream handlers
    on<_NearbyDriversUpdated>((event, emit) {
      emit(state.copyWith(nearbyDrivers: event.drivers));
    });
    on<_DriverSocketLocationUpdated>((event, emit) {
      if (state.activeRide != null) {
        emit(state.copyWith(
          activeRide: state.activeRide!.copyWith(driverLat: event.lat, driverLng: event.lng),
        ));
      }
    });

    _initSocket();
  }

  void _initSocket() {
    try {
      final customerId = 'CUSTOMER-${DateTime.now().millisecondsSinceEpoch}';
      _socket.connect(userId: customerId, userType: 'customer').catchError((err) {
        debugPrint('[TaxiBloc] Socket connect error: $err');
      });

      _locationSub = _socket.driverLocationStream.listen((update) {
        add(_DriverSocketLocationUpdated(update.lat, update.lng));
      });

      _nearbySub = _socket.nearbyDriversStream.listen((drivers) {
        final mapped = drivers.map((d) => NearbyDriver(
          driverId: d.driverId, name: d.driverId,
          lat: d.lat, lng: d.lng, distanceKm: d.distKm,
          eta: (d.distKm * 2 + 3).round(),
        )).toList();
        add(_NearbyDriversUpdated(mapped));
      });

      // Listen for driver assignment from WebSocket
      _driverAssignedSub = _socket.driverAssignedStream.listen((data) {
        add(DriverAssigned(
          rideId: data['rideId']?.toString() ?? '',
          driverId: data['driverId']?.toString() ?? '',
          driverName: data['driverName']?.toString() ?? 'Driver',
          driverPhone: data['driverPhone']?.toString(),
          driverLat: (data['driverLat'] as num?)?.toDouble() ?? 0.0,
          driverLng: (data['driverLng'] as num?)?.toDouble() ?? 0.0,
          vehiclePlate: data['vehiclePlate']?.toString(),
        ));
      });

      // Listen for ride status changes from WebSocket
      _rideStatusSub = _socket.rideStatusStream.listen((data) {
        add(RideStatusChanged(
          rideId: data['rideId']?.toString() ?? '',
          status: data['status']?.toString() ?? '',
          details: data,
        ));
      });
    } catch (e) {
      debugPrint('[TaxiBloc] Socket init error: $e');
    }
  }

  // ── Fare Estimation ────────────────────────────────────────────────────────

  Future<void> _onEstimateFare(EstimateFare event, Emitter<TaxiState> emit) async {
    emit(state.copyWith(status: TaxiStatus.estimating));
    final distKm = _calculateDistance(event.pickupLat, event.pickupLng, event.dropLat, event.dropLng);
    final vehicleTypes = ['economy', 'comfort', 'premium', 'bike', 'suv', 'delivery'];
    final List<FareEstimate> allEstimates = [];

    try {
      for (final type in vehicleTypes) {
        final res = await _api.post('/taxi/estimate', body: {
          'pickupLat': event.pickupLat, 'pickupLng': event.pickupLng,
          'dropLat': event.dropLat, 'dropLng': event.dropLng,
          'vehicleType': type,
        });
        if (res['estimatedFare'] != null) {
          allEstimates.add(FareEstimate(
            vehicleType: type,
            distanceKm: (res['distanceKm'] as num?)?.toDouble() ?? distKm,
            estimatedFare: (res['estimatedFare'] as num).toInt(),
            estimatedFareRange: 'KES ${(res['estimatedFare'] as num).toInt() - 20} – KES ${(res['estimatedFare'] as num).toInt() + 20}',
            etaMinutes: (res['durationMinutes'] as num?)?.toInt() ?? (distKm * 2 + 5).round(),
            surgeMultiplier: (res['surgeMultiplier'] as num?)?.toDouble() ?? 1.0,
          ));
        }
      }
    } catch (err) {
      debugPrint('[TaxiBloc] REST estimation failed, using fallback: $err');
      final rates = {'economy': 35, 'comfort': 50, 'premium': 75, 'bike': 18, 'suv': 85, 'delivery': 40};
      final bases = {'economy': 50, 'comfort': 80, 'premium': 120, 'bike': 30, 'suv': 150, 'delivery': 60};
      for (final entry in rates.entries) {
        final fare = (bases[entry.key]! + distKm * entry.value).round();
        allEstimates.add(FareEstimate(
          vehicleType: entry.key, distanceKm: (distKm * 10).round() / 10,
          estimatedFare: fare,
          estimatedFareRange: 'KES ${fare - 20} – KES ${fare + 20}',
          etaMinutes: (distKm * 2 + 5).round(),
        ));
      }
    }

    if (allEstimates.isNotEmpty) {
      final selected = allEstimates.firstWhere(
        (e) => e.vehicleType == state.selectedVehicleType,
        orElse: () => allEstimates.first,
      );
      emit(state.copyWith(status: TaxiStatus.estimated, fareEstimate: selected, allEstimates: allEstimates));
    } else {
      emit(state.copyWith(status: TaxiStatus.error, errorMessage: 'Failed to generate fare estimates'));
    }
  }

  // ── Vehicle & Payment ──────────────────────────────────────────────────────

  void _onSelectVehicle(SelectVehicleType event, Emitter<TaxiState> emit) {
    final selected = state.allEstimates.firstWhere(
      (e) => e.vehicleType == event.vehicleType,
      orElse: () => state.fareEstimate ?? const FareEstimate(
        vehicleType: 'economy', distanceKm: 0, estimatedFare: 0,
        estimatedFareRange: '', etaMinutes: 0,
      ),
    );
    emit(state.copyWith(
      selectedVehicleType: event.vehicleType,
      fareEstimate: selected,
      selectedDriverId: null, // Reset driver selection on vehicle change
    ));
  }

  void _onSetPayment(SetPaymentMethod event, Emitter<TaxiState> emit) {
    emit(state.copyWith(paymentMethod: event.method));
  }

  void _onSelectPreferredDriver(SelectPreferredDriver event, Emitter<TaxiState> emit) {
    emit(state.copyWith(selectedDriverId: event.driverId));
  }

  // ── Ride Request with Real Online Driver Matching ───────────────────────────

  Future<void> _onRequestRide(RequestRide event, Emitter<TaxiState> emit) async {
    emit(state.copyWith(status: TaxiStatus.searching));

    final body = {
      'pickupLat': event.pickupLat, 'pickupLng': event.pickupLng,
      'dropLat': event.dropLat, 'dropLng': event.dropLng,
      'pickupAddress': event.pickupAddress ?? 'Current Location',
      'dropAddress': event.dropAddress ?? 'Destination',
      'vehicleType': event.vehicleType,
      'paymentMethod': event.paymentMethod,
      'fareEstimate': state.fareEstimate?.estimatedFare ?? 150,
      if (event.preferredDriverId != null) 'preferredDriverId': event.preferredDriverId,
    };

    try {
      final res = await _api.post('/taxi/request', body: body);
      final rideData = res['ride'];
      if (rideData != null) {
        // Check if backend already determined no drivers available
        final rideStatus = rideData['status']?.toString() ?? 'SEARCHING_DRIVER';
        if (rideStatus == 'NO_DRIVERS_AVAILABLE') {
          emit(state.copyWith(
            status: TaxiStatus.error,
            errorMessage: 'No drivers available nearby. Please try again later.',
          ));
          return;
        }

        final ride = ActiveRide(
          rideId: rideData['id'].toString(),
          status: rideStatus,
          vehicleType: rideData['vehicleType'].toString(),
          pickupLat: (rideData['pickupLat'] as num).toDouble(),
          pickupLng: (rideData['pickupLng'] as num).toDouble(),
          dropLat: (rideData['dropLat'] as num).toDouble(),
          dropLng: (rideData['dropLng'] as num).toDouble(),
          pickupAddress: rideData['pickupAddress']?.toString() ?? event.pickupAddress,
          dropAddress: rideData['dropAddress']?.toString() ?? event.dropAddress,
          estimatedFare: (rideData['fareEstimate'] as num?)?.toInt() ?? state.fareEstimate?.estimatedFare,
          paymentMethod: rideData['paymentMethod']?.toString() ?? event.paymentMethod,
          preferredDriverId: event.preferredDriverId,
        );
        emit(state.copyWith(status: TaxiStatus.searching, activeRide: ride));
        _socket.joinRideTracking(ride.rideId);
        // Backend dispatches to online drivers via WebSocket — we just wait.
        // Start a 60-second timeout: if no driver accepts, emit NO_DRIVER_FOUND.
        _startSearchTimeout(ride.rideId);
        return;
      }
    } catch (err) {
      debugPrint('[TaxiBloc] REST requestRide failed, using local fallback: $err');
    }

    // ── Offline/Fallback: Create a local ride and wait for WS assignment ──
    final localRide = ActiveRide(
      rideId: 'RIDE-${DateTime.now().millisecondsSinceEpoch}',
      status: 'SEARCHING_DRIVER', vehicleType: event.vehicleType,
      pickupLat: event.pickupLat, pickupLng: event.pickupLng,
      dropLat: event.dropLat, dropLng: event.dropLng,
      pickupAddress: event.pickupAddress, dropAddress: event.dropAddress,
      estimatedFare: state.fareEstimate?.estimatedFare,
      paymentMethod: event.paymentMethod,
      preferredDriverId: event.preferredDriverId,
    );
    emit(state.copyWith(status: TaxiStatus.searching, activeRide: localRide));
    // Start timeout — no mock drivers will be assigned
    _startSearchTimeout(localRide.rideId);
  }

  /// If no driver accepts within 60 seconds, emit NO_DRIVER_FOUND.
  void _startSearchTimeout(String rideId) {
    Future.delayed(const Duration(seconds: 60), () {
      if (state.activeRide?.rideId == rideId && state.activeRide?.status == 'SEARCHING_DRIVER') {
        add(RideStatusChanged(
          rideId: rideId,
          status: 'NO_DRIVER_FOUND',
          details: const {},
        ));
      }
    });
  }

  // ── WebSocket Reactive Events ──────────────────────────────────────────────

  void _onDriverAssigned(DriverAssigned event, Emitter<TaxiState> emit) {
    if (state.activeRide == null) return;
    emit(state.copyWith(
      status: TaxiStatus.driverFound,
      activeRide: state.activeRide!.copyWith(
        status: 'DRIVER_ACCEPTED',
        driverId: event.driverId,
        driverName: event.driverName,
        driverPhone: event.driverPhone,
        driverLat: event.driverLat,
        driverLng: event.driverLng,
      ),
    ));
  }

  void _onRideStatusChanged(RideStatusChanged event, Emitter<TaxiState> emit) {
    if (state.activeRide == null || state.activeRide!.rideId != event.rideId) return;
    final statusMap = {
      'DRIVER_ARRIVING': TaxiStatus.driverArriving,
      'DRIVER_ARRIVED': TaxiStatus.driverArriving,
      'RIDE_STARTED': TaxiStatus.rideInProgress,
      'RIDE_COMPLETED': TaxiStatus.rideCompleted,
      'CANCELLED': TaxiStatus.rideCancelled,
      'NO_DRIVER_FOUND': TaxiStatus.error,
    };
    emit(state.copyWith(
      status: statusMap[event.status] ?? state.status,
      activeRide: state.activeRide!.copyWith(status: event.status),
      errorMessage: event.status == 'NO_DRIVER_FOUND' ? 'No drivers available. Please try again.' : null,
    ));
  }

  // ── Cancel / Track / Status ────────────────────────────────────────────────

  Future<void> _onCancelRide(CancelRide event, Emitter<TaxiState> emit) async {
    try {
      await _api.post('/taxi/ride/${event.rideId}/cancel', body: {'reason': event.reason ?? 'Cancelled'});
    } catch (err) {
      debugPrint('[TaxiBloc] Cancel failed: $err');
    }
    _socket.leaveRideTracking(event.rideId);
    emit(const TaxiState(status: TaxiStatus.rideCancelled));
  }

  Future<void> _onTrackRide(TrackRide event, Emitter<TaxiState> emit) async {
    if (state.activeRide == null) return;
    _socket.joinRideTracking(event.rideId);
    emit(state.copyWith(status: TaxiStatus.rideInProgress));
  }

  void _onUpdateRideStatus(UpdateRideStatus event, Emitter<TaxiState> emit) {
    if (state.activeRide == null) return;
    final statusMap = {
      'DRIVER_ARRIVING': TaxiStatus.driverArriving,
      'RIDE_STARTED': TaxiStatus.rideInProgress,
      'RIDE_COMPLETED': TaxiStatus.rideCompleted,
      'CANCELLED': TaxiStatus.rideCancelled,
    };
    emit(state.copyWith(
      status: statusMap[event.status] ?? state.status,
      activeRide: state.activeRide!.copyWith(status: event.status),
    ));
  }

  void _onDriverLocationUpdated(DriverLocationUpdated event, Emitter<TaxiState> emit) {
    if (state.activeRide == null) return;
    emit(state.copyWith(
      activeRide: state.activeRide!.copyWith(driverLat: event.lat, driverLng: event.lng),
    ));
  }

  // ── Nearby Drivers (with vehicle type filter) ──────────────────────────────

  Future<void> _onLoadNearbyDrivers(LoadNearbyDrivers event, Emitter<TaxiState> emit) async {
    try {
      final res = await _api.get('/taxi/nearby-drivers', queryParams: {
        'lat': event.lat.toString(), 'lng': event.lng.toString(),
        'radiusKm': event.radiusKm.toString(),
        if (event.vehicleType != null) 'vehicleType': event.vehicleType!,
      });
      final list = res['drivers'] as List?;
      if (list != null && list.isNotEmpty) {
        final drivers = list.map((d) => NearbyDriver.fromJson(Map<String, dynamic>.from(d as Map))).toList();
        emit(state.copyWith(nearbyDrivers: drivers));
        return;
      }
    } catch (err) {
      debugPrint('[TaxiBloc] REST nearby-drivers failed, using socket + mock: $err');
    }

    // Fallback: request via socket + emit mock data for dev
    _socket.findNearbyDrivers(lat: event.lat, lng: event.lng, radiusKm: event.radiusKm);

    if (state.nearbyDrivers.isEmpty) {
      final mockDrivers = _generateMockNearbyDrivers(event.lat, event.lng);
      emit(state.copyWith(nearbyDrivers: mockDrivers));
    }
  }

  List<NearbyDriver> _generateMockNearbyDrivers(double lat, double lng) {
    final types = ['economy', 'economy', 'comfort', 'premium', 'bike', 'economy', 'suv', 'economy', 'bike', 'delivery'];
    final names = ['James Kamau', 'Peter Ochieng', 'Sarah Wanjiku', 'David Mutua', 'Grace Akinyi',
                    'John Kiprop', 'Mary Njeri', 'Hassan Ali', 'Nancy Muthoni', 'Brian Otieno'];
    final plates = ['KCA 123A', 'KCB 456B', 'KCC 789C', 'KMCA 001', 'KCD 234D',
                    'KCE 567E', 'KCF 890F', 'KCG 123G', 'KCH 456H', 'KCI 789I'];
    final models = ['Toyota Vitz', 'Toyota Axio', 'Mercedes C200', 'Honda CB300', 'Nissan Note',
                    'Toyota Land Cruiser', 'Mazda Demio', 'Suzuki Alto', 'Yamaha FZ', 'Toyota HiAce'];
    final ratings = [4.8, 4.6, 4.9, 4.3, 4.7, 4.5, 4.4, 4.2, 4.1, 3.9];
    final trips = [1240, 890, 2100, 310, 760, 1530, 680, 420, 190, 85];

    return List.generate(10, (i) {
      final offset = (i + 1) * 0.002;
      final dist = (offset * 111).roundToDouble() / 10; // rough km
      return NearbyDriver(
        driverId: 'DRV-${100 + i}',
        name: names[i], vehicleType: types[i],
        vehiclePlate: plates[i], vehicleModel: models[i],
        lat: lat + offset * (i.isEven ? 1 : -1),
        lng: lng + offset * (i.isOdd ? 1 : -1),
        distanceKm: dist, eta: (dist * 2 + 3).round(),
        rating: ratings[i], totalTrips: trips[i],
        acceptanceRate: 0.85 + (i * 0.012),
      );
    });
  }

  // ── History & Rating ───────────────────────────────────────────────────────

  Future<void> _onLoadRideHistory(LoadRideHistory event, Emitter<TaxiState> emit) async {
    emit(state.copyWith(status: TaxiStatus.loading));
    try {
      final res = await _api.get('/taxi/rides');
      final list = res['rides'] as List?;
      final List<ActiveRide> history = [];
      if (list != null) {
        for (final item in list) {
          history.add(ActiveRide(
            rideId: item['id'].toString(), status: item['status'].toString(),
            vehicleType: item['vehicleType'].toString(),
            pickupLat: (item['pickupLat'] as num).toDouble(),
            pickupLng: (item['pickupLng'] as num).toDouble(),
            dropLat: (item['dropLat'] as num).toDouble(),
            dropLng: (item['dropLng'] as num).toDouble(),
            pickupAddress: item['pickupAddress']?.toString(),
            dropAddress: item['dropAddress']?.toString(),
            estimatedFare: (item['fareEstimate'] as num?)?.toInt(),
            paymentMethod: item['paymentMethod']?.toString(),
          ));
        }
      }
      emit(state.copyWith(status: TaxiStatus.initial, rideHistory: history));
    } catch (err) {
      debugPrint('[TaxiBloc] History load failed: $err');
      emit(state.copyWith(status: TaxiStatus.initial, rideHistory: const []));
    }
  }

  Future<void> _onRateRide(RateRide event, Emitter<TaxiState> emit) async {
    try {
      await _api.post('/taxi/ride/${event.rideId}/rating', body: {
        'rating': event.rating, 'comment': event.review ?? '',
      });
    } catch (err) {
      debugPrint('Rating failed: $err');
    }
    emit(state.copyWith(ratingSubmitted: true));
  }

  // ── Location Setting ───────────────────────────────────────────────────────────

  void _onSetPickup(SetPickupLocation event, Emitter<TaxiState> emit) {
    emit(state.copyWith(
      pickupAddress: event.address,
      pickupLat: event.lat,
      pickupLng: event.lng,
    ));
  }

  void _onSetDestination(SetDestination event, Emitter<TaxiState> emit) {
    emit(state.copyWith(
      destinationAddress: event.address,
      destinationLat: event.lat,
      destinationLng: event.lng,
    ));
  }

  // ── OTP Verification ──────────────────────────────────────────────────────────

  void _onVerifyOtp(VerifyOtp event, Emitter<TaxiState> emit) {
    if (state.activeRide?.otp == event.otp) {
      emit(state.copyWith(
        otpVerified: true,
        status: TaxiStatus.rideInProgress,
        activeRide: state.activeRide!.copyWith(status: 'RIDE_STARTED'),
      ));
    }
  }

  // ── Tip Driver ───────────────────────────────────────────────────────────────

  Future<void> _onTipDriver(TipDriver event, Emitter<TaxiState> emit) async {
    try {
      await _api.post('/taxi/ride/${event.rideId}/tip', body: {'amount': event.amount});
    } catch (err) {
      debugPrint('Tip failed: $err');
    }
    emit(state.copyWith(tipAmount: event.amount));
  }

  // ── SOS Emergency ─────────────────────────────────────────────────────────

  Future<void> _onTriggerSOS(TriggerSOS event, Emitter<TaxiState> emit) async {
    try {
      await _api.post('/taxi/ride/${event.rideId}/sos', body: {
        'details': event.details ?? 'Emergency alert triggered from application.',
      });
      emit(state.copyWith(sosTriggered: true));
    } catch (err) {
      debugPrint('[TaxiBloc] SOS trigger failed: $err');
      // Still mark as triggered locally even if API fails
      emit(state.copyWith(sosTriggered: true));
    }
  }

  // ── Promo Code ────────────────────────────────────────────────────────────

  void _onApplyPromoCode(ApplyPromoCode event, Emitter<TaxiState> emit) {
    // Client-side promo validation — backend can validate at booking time
    final promos = {
      'FIRST50': 0.50,
      'WEEKEND20': 0.20,
      'AIRPORT': 150.0, // flat amount
      'REFER100': 100.0,
    };
    final discount = promos[event.code.toUpperCase()];
    if (discount != null) {
      emit(state.copyWith(promoCode: event.code.toUpperCase(), promoDiscount: discount));
    }
  }

  void _onClearPromoCode(ClearPromoCode event, Emitter<TaxiState> emit) {
    emit(state.copyWith(promoCode: '', promoDiscount: 0.0));
  }

  // ── Support Dispute ───────────────────────────────────────────────────────

  Future<void> _onRaiseDispute(RaiseDispute event, Emitter<TaxiState> emit) async {
    try {
      await _api.post('/taxi/ride/${event.rideId}/support', body: {
        'reason': event.reason,
        'details': event.details ?? '',
      });
      emit(state.copyWith(disputeRaised: true));
    } catch (err) {
      debugPrint('[TaxiBloc] Dispute failed: $err');
    }
  }

  // ── Math helpers ───────────────────────────────────────────────────────────

  double _calculateDistance(double lat1, double lng1, double lat2, double lng2) {
    const r = 6371.0;
    final dLat = (lat2 - lat1) * 3.14159 / 180;
    final dLon = (lng2 - lng1) * 3.14159 / 180;
    final a = _sin(dLat / 2) * _sin(dLat / 2) +
        _cos(lat1 * 3.14159 / 180) * _cos(lat2 * 3.14159 / 180) *
        _sin(dLon / 2) * _sin(dLon / 2);
    final c = 2 * _atan2(_sqrt(a), _sqrt(1 - a));
    return r * c;
  }

  static double _sin(double x) { final x2 = x * x; return x * (1 - x2 / 6 * (1 - x2 / 20 * (1 - x2 / 42))); }
  static double _cos(double x) => _sin(x + 1.5707963);
  static double _sqrt(double x) { if (x <= 0) return 0; double g = x / 2; for (int i = 0; i < 10; i++) { g = (g + x / g) / 2; } return g; }
  static double _atan2(double y, double x) {
    if (x > 0) return _atan(y / x);
    if (x < 0 && y >= 0) return _atan(y / x) + 3.14159;
    if (x < 0 && y < 0) return _atan(y / x) - 3.14159;
    if (x == 0 && y > 0) return 1.5708;
    if (x == 0 && y < 0) return -1.5708;
    return 0;
  }
  static double _atan(double x) { final x2 = x * x; return x * (1 - x2 / 3 * (1 - x2 / 5 * (1 - x2 / 7))); }

  @override
  Future<void> close() {
    _locationSub?.cancel();
    _nearbySub?.cancel();
    _driverAssignedSub?.cancel();
    _rideStatusSub?.cancel();
    // NOTE: Do NOT dispose _socket here — it's a singleton shared across blocs.
    // Disposing it would break other BLoC instances.
    return super.close();
  }
}
