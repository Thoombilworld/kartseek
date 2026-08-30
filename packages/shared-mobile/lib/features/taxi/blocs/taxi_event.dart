import 'package:equatable/equatable.dart';

abstract class TaxiEvent extends Equatable {
  const TaxiEvent();
  @override
  List<Object?> get props => [];
}

// ── Fare Estimation ──────────────────────────────────────────────────────────
class EstimateFare extends TaxiEvent {
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;
  final String vehicleType;
  const EstimateFare({
    required this.pickupLat, required this.pickupLng,
    required this.dropLat, required this.dropLng,
    this.vehicleType = 'economy',
  });
  @override
  List<Object?> get props => [pickupLat, pickupLng, dropLat, dropLng, vehicleType];
}

// ── Ride Request ─────────────────────────────────────────────────────────────
class RequestRide extends TaxiEvent {
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;
  final String vehicleType;
  final String paymentMethod;
  final String? pickupAddress;
  final String? dropAddress;
  /// Optional: preferred driver ID from the NearbyDriversScreen selection.
  final String? preferredDriverId;
  const RequestRide({
    required this.pickupLat, required this.pickupLng,
    required this.dropLat, required this.dropLng,
    required this.vehicleType, required this.paymentMethod,
    this.pickupAddress, this.dropAddress,
    this.preferredDriverId,
  });
  @override
  List<Object?> get props => [pickupLat, pickupLng, dropLat, dropLng, vehicleType, paymentMethod, preferredDriverId];
}

class CancelRide extends TaxiEvent {
  final String rideId;
  final String? reason;
  const CancelRide({required this.rideId, this.reason});
  @override
  List<Object?> get props => [rideId, reason];
}

// ── Ride Tracking ────────────────────────────────────────────────────────────
class TrackRide extends TaxiEvent {
  final String rideId;
  const TrackRide({required this.rideId});
  @override
  List<Object?> get props => [rideId];
}

class UpdateRideStatus extends TaxiEvent {
  final String rideId;
  final String status;
  const UpdateRideStatus({required this.rideId, required this.status});
  @override
  List<Object?> get props => [rideId, status];
}

class DriverLocationUpdated extends TaxiEvent {
  final double lat;
  final double lng;
  final double? heading;
  const DriverLocationUpdated({required this.lat, required this.lng, this.heading});
  @override
  List<Object?> get props => [lat, lng, heading];
}

// ── Vehicle Type Selection ───────────────────────────────────────────────────
class SelectVehicleType extends TaxiEvent {
  final String vehicleType;
  const SelectVehicleType(this.vehicleType);
  @override
  List<Object?> get props => [vehicleType];
}

// ── Nearby Drivers ───────────────────────────────────────────────────────────
class LoadNearbyDrivers extends TaxiEvent {
  final double lat;
  final double lng;
  final String? vehicleType;
  final double radiusKm;
  const LoadNearbyDrivers({
    required this.lat,
    required this.lng,
    this.vehicleType,
    this.radiusKm = 5.0,
  });
  @override
  List<Object?> get props => [lat, lng, vehicleType, radiusKm];
}

/// Customer selects a preferred driver from the nearby list.
class SelectPreferredDriver extends TaxiEvent {
  final String? driverId;
  const SelectPreferredDriver(this.driverId);
  @override
  List<Object?> get props => [driverId];
}

/// Driver assigned by the backend/WebSocket (reactive update).
class DriverAssigned extends TaxiEvent {
  final String rideId;
  final String driverId;
  final String driverName;
  final String? driverPhone;
  final double driverLat;
  final double driverLng;
  final String? vehiclePlate;
  const DriverAssigned({
    required this.rideId,
    required this.driverId,
    required this.driverName,
    this.driverPhone,
    required this.driverLat,
    required this.driverLng,
    this.vehiclePlate,
  });
  @override
  List<Object?> get props => [rideId, driverId];
}

/// Ride status changed by backend/WebSocket.
class RideStatusChanged extends TaxiEvent {
  final String rideId;
  final String status;
  final Map<String, dynamic>? details;
  const RideStatusChanged({
    required this.rideId,
    required this.status,
    this.details,
  });
  @override
  List<Object?> get props => [rideId, status];
}

// ── Ride History ─────────────────────────────────────────────────────────────
class LoadRideHistory extends TaxiEvent {
  final int page;
  const LoadRideHistory({this.page = 1});
  @override
  List<Object?> get props => [page];
}

// ── Rating ───────────────────────────────────────────────────────────────────
class RateRide extends TaxiEvent {
  final String rideId;
  final int rating;
  final String? review;
  const RateRide({required this.rideId, required this.rating, this.review});
  @override
  List<Object?> get props => [rideId, rating, review];
}

// ── Payment Method ───────────────────────────────────────────────────────────
class SetPaymentMethod extends TaxiEvent {
  final String method; // 'cash', 'mpesa', 'card', 'wallet'
  const SetPaymentMethod(this.method);
  @override
  List<Object?> get props => [method];
}

// ── Location Setting ─────────────────────────────────────────────────────────
class SetPickupLocation extends TaxiEvent {
  final double lat;
  final double lng;
  final String address;
  const SetPickupLocation({required this.lat, required this.lng, required this.address});
  @override
  List<Object?> get props => [lat, lng, address];
}

class SetDestination extends TaxiEvent {
  final double lat;
  final double lng;
  final String address;
  const SetDestination({required this.lat, required this.lng, required this.address});
  @override
  List<Object?> get props => [lat, lng, address];
}

// ── OTP Verification ─────────────────────────────────────────────────────────
class VerifyOtp extends TaxiEvent {
  final String rideId;
  final String otp;
  const VerifyOtp({required this.rideId, required this.otp});
  @override
  List<Object?> get props => [rideId, otp];
}

// ── Driver Tip ───────────────────────────────────────────────────────────────
class TipDriver extends TaxiEvent {
  final String rideId;
  final double amount;
  const TipDriver({required this.rideId, required this.amount});
  @override
  List<Object?> get props => [rideId, amount];
}

// ── SOS Emergency ────────────────────────────────────────────────────────────
class TriggerSOS extends TaxiEvent {
  final String rideId;
  final String? details;
  const TriggerSOS({required this.rideId, this.details});
  @override
  List<Object?> get props => [rideId, details];
}

// ── Promo Code ───────────────────────────────────────────────────────────────
class ApplyPromoCode extends TaxiEvent {
  final String code;
  const ApplyPromoCode({required this.code});
  @override
  List<Object?> get props => [code];
}

class ClearPromoCode extends TaxiEvent {
  const ClearPromoCode();
}

// ── Support Dispute ──────────────────────────────────────────────────────────
class RaiseDispute extends TaxiEvent {
  final String rideId;
  final String reason;
  final String? details;
  const RaiseDispute({required this.rideId, required this.reason, this.details});
  @override
  List<Object?> get props => [rideId, reason, details];
}
