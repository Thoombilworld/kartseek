import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:kartseek_partner/features/shared/models/ride_model.dart';
import 'package:kartseek_partner/features/shared/models/delivery_model.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/services/taxi_socket_service.dart';
import 'package:kartseek_partner/features/shared/services/partner_delivery_api.dart';

/// KARTSEEK Partner App — Real-time Request Stream Service
///
/// Listens for incoming ride requests via WebSocket (`TaxiSocketService`).
/// Falls back to mock data simulation after 60 seconds if no real requests arrive,
/// ensuring the UI is always testable.
class RequestStreamService {
  RequestStreamService._();
  static final RequestStreamService _instance = RequestStreamService._();
  static RequestStreamService get instance => _instance;

  final _rideController = StreamController<RideRequest>.broadcast();
  final _deliveryController = StreamController<DeliveryTask>.broadcast();
  Timer? _rideTimer;
  Timer? _deliveryTimer;
  bool _isListeningForRides = false;
  bool _isListeningForDeliveries = false;
  StreamSubscription<Map<String, dynamic>>? _wsRideSub;
  bool _hasReceivedRealRequest = false;

  final PartnerDeliveryApi _deliveryApi = PartnerDeliveryApi();

  /// Assignment ids already handed to the UI, so a repeated poll does not
  /// re-offer a job the partner is already looking at.
  final Set<String> _seenAssignmentIds = <String>{};

  /// Frequent enough that a partner is not left waiting, infrequent enough that
  /// an idle app is not hammering the gateway.
  static const Duration _deliveryPollInterval = Duration(seconds: 20);

  /// Stream of incoming ride requests (for taxi drivers).
  Stream<RideRequest> get rideRequests => _rideController.stream;

  /// Stream of incoming delivery tasks (for delivery boys).
  Stream<DeliveryTask> get deliveryTasks => _deliveryController.stream;

  /// Start listening for ride requests — uses real WebSocket first, mock fallback.
  void startRideRequestStream() {
    if (_isListeningForRides) return;
    _isListeningForRides = true;
    _hasReceivedRealRequest = false;

    // 1. Listen to real WebSocket events from TaxiSocketService
    final taxiSocket = TaxiSocketService();
    _wsRideSub?.cancel();
    _wsRideSub = taxiSocket.incomingRideStream.listen((data) {
      if (!_isListeningForRides || _rideController.isClosed) return;
      _hasReceivedRealRequest = true;
      try {
        final ride = RideRequest.fromWebSocket(data);
        _rideController.add(ride);
        debugPrint('[RequestStream] 📥 Real ride request received: ${ride.id}');
      } catch (e) {
        debugPrint('[RequestStream] ⚠️ Error parsing ride request: $e');
      }
    });

    // 2. Register driver with the WebSocket gateway
    taxiSocket.emit('joinAsDriver', {
      'driverId': 'current_driver', // Will be replaced by actual auth ID
    });

    // 3. Mock fallback — if no real requests after 60 seconds, generate mock
    final rng = Random();
    _rideTimer = Timer(const Duration(seconds: 60), () {
      if (!_hasReceivedRealRequest && _isListeningForRides && !_rideController.isClosed) {
        debugPrint('[RequestStream] ⏳ No real requests received, generating mock...');
        _rideController.add(_generateMockRide(rng));
      }
    });

    debugPrint('[RequestStream] ✅ Started listening for ride requests (WebSocket + mock fallback)');
  }

  /// Stop listening for ride requests.
  void stopRideRequestStream() {
    _isListeningForRides = false;
    _rideTimer?.cancel();
    _rideTimer = null;
    _wsRideSub?.cancel();
    _wsRideSub = null;
  }

  /// Start receiving delivery jobs assigned to this partner.
  ///
  /// This used to set a `Timer(10 + rng.nextInt(25))` and emit
  /// `_generateMockDelivery(rng)` — a randomly invented job, with an invented
  /// customer, address and COD amount, roughly twenty seconds after going
  /// online. Unlike the ride stream directly above, it had no socket
  /// subscription and no server call of any kind, so the delivery half of the
  /// app was never connected to order-service or the marketplace at all.
  ///
  /// There is no server-side "job offered" push event to subscribe to yet — the
  /// order gateway carries status updates and partner location, not dispatch —
  /// so this polls `GET /marketplace/delivery-assignments`, which does exist and
  /// is guarded to the DRIVER role. Polling is the honest option here: a
  /// slightly delayed real job beats an instant fictional one. When a dispatch
  /// event lands, subscribe to it the way `startRideRequestStream` does and keep
  /// this as the reconnect fallback.
  void startDeliveryTaskStream(String partnerId) {
    if (_isListeningForDeliveries) return;
    if (partnerId.isEmpty) {
      debugPrint('[RequestStream] ⚠️ No partner id — cannot poll for deliveries.');
      return;
    }
    _isListeningForDeliveries = true;
    _seenAssignmentIds.clear();

    Future<void> poll() async {
      if (!_isListeningForDeliveries || _deliveryController.isClosed) return;
      try {
        final tasks = await _deliveryApi.getAssignments(partnerId);
        for (final task in tasks) {
          // Poll repeats; a job already handed to the UI must not be offered
          // again on the next tick.
          if (!_seenAssignmentIds.add(task.id)) continue;
          if (_deliveryController.isClosed) return;
          _deliveryController.add(task);
          debugPrint('[RequestStream] 📦 Delivery assignment received: ${task.id}');
        }
      } catch (e) {
        // A failed poll is a failed poll. Emitting a placeholder job here is
        // exactly the behaviour being removed.
        debugPrint('[RequestStream] ⚠️ Delivery poll failed: $e');
      }
    }

    poll();
    _deliveryTimer = Timer.periodic(_deliveryPollInterval, (_) => poll());
    debugPrint('[RequestStream] ✅ Polling for delivery assignments');
  }

  /// Stop listening for delivery tasks.
  void stopDeliveryTaskStream() {
    _isListeningForDeliveries = false;
    _deliveryTimer?.cancel();
    _deliveryTimer = null;
    _seenAssignmentIds.clear();
  }

  /// Dispose all streams and timers.
  void dispose() {
    stopRideRequestStream();
    stopDeliveryTaskStream();
    _rideController.close();
    _deliveryController.close();
  }

  // ── Mock Generators ──────────────────────────────────────────────────────────

  static const _customerNames = [
    'Ahmed Al-Rashid', 'Fatima Hassan', 'Omar Khalid', 'Sara Mahmoud',
    'Youssef Ibrahim', 'Leila Nasser', 'Khalid Abbas', 'Mariam Saleh',
  ];

  /// Region-aware pickup locations — use city name from RegionService.
  List<String> get _pickupLocations {
    final city = RegionService.instance.lastDetection?.city ??
        RegionService.instance.currentCountry.defaultCity;
    return [
      '$city City Center', '$city Mall',
      'Central Market, $city', 'Business District',
      'Main Street, $city', 'University Area',
      '$city Grand Hotel',
    ];
  }

  /// Region-aware drop locations — use city name from RegionService.
  List<String> get _dropLocations {
    final city = RegionService.instance.lastDetection?.city ??
        RegionService.instance.currentCountry.defaultCity;
    return [
      '$city International Airport', 'Downtown $city',
      'Residential Area, $city', 'Sports Complex',
      'Medical Center, $city', 'Industrial Zone',
      'Convention Center',
    ];
  }

  RideRequest _generateMockRide(Random rng) {
    final region = RegionService.instance;
    final baseLat = region.lastDetection?.lat ?? region.currentCountry.defaultLat;
    final baseLng = region.lastDetection?.lng ?? region.currentCountry.defaultLng;
    final phonePrefix = region.currentCountry.callingCode;

    final pickup = _pickupLocations[rng.nextInt(_pickupLocations.length)];
    final drop = _dropLocations[rng.nextInt(_dropLocations.length)];
    final tripDist = 2.0 + rng.nextDouble() * 20;

    return RideRequest(
      id: 'RIDE-${1000 + rng.nextInt(9000)}',
      customerName: _customerNames[rng.nextInt(_customerNames.length)],
      customerPhone: '$phonePrefix${rng.nextInt(100000000).toString().padLeft(8, '0')}',
      pickupAddress: pickup,
      pickupLat: baseLat - 0.015 + rng.nextDouble() * 0.03,
      pickupLng: baseLng - 0.015 + rng.nextDouble() * 0.03,
      dropAddress: drop,
      dropLat: baseLat - 0.04 + rng.nextDouble() * 0.08,
      dropLng: baseLng - 0.04 + rng.nextDouble() * 0.08,
      distanceToPickup: 0.5 + rng.nextDouble() * 3,
      tripDistance: tripDist,
      estimatedFare: 300 + rng.nextInt(2000).toDouble(),
      paymentMethod: rng.nextBool() ? 'Card' : 'Cash',
      requestedAt: DateTime.now(),
    );
  }

}
