import 'package:equatable/equatable.dart';
import 'package:kartseek_partner/features/shared/models/partner_profile_model.dart';
import 'package:kartseek_partner/features/shared/models/ride_model.dart';
import 'package:kartseek_partner/features/shared/models/delivery_model.dart';

/// All events that can be dispatched to [PartnerBloc].
abstract class PartnerEvent extends Equatable {
  const PartnerEvent();
  @override
  List<Object?> get props => [];
}

// ── Profile ──────────────────────────────────────────────────────────────────
class LoadPartnerProfile extends PartnerEvent {
  const LoadPartnerProfile();
}

class UpdatePartnerProfile extends PartnerEvent {
  final PartnerProfile profile;
  const UpdatePartnerProfile(this.profile);
  @override
  List<Object?> get props => [profile];
}

// ── Online Status ────────────────────────────────────────────────────────────
class ToggleOnlineStatus extends PartnerEvent {
  const ToggleOnlineStatus();
}

class SetOnlineStatus extends PartnerEvent {
  final bool isOnline;
  const SetOnlineStatus(this.isOnline);
  @override
  List<Object?> get props => [isOnline];
}

// ── Role ─────────────────────────────────────────────────────────────────────
class SetActiveRole extends PartnerEvent {
  final PartnerRole? role;
  const SetActiveRole(this.role);
  @override
  List<Object?> get props => [role];
}

class ResetRole extends PartnerEvent {
  const ResetRole();
}

/// Switches from current role to opposite role in one action.
class SwitchRole extends PartnerEvent {
  const SwitchRole();
}

// ── Rides (Taxi) ─────────────────────────────────────────────────────────────
class LoadRideHistory extends PartnerEvent {
  const LoadRideHistory();
}

class SetActiveRide extends PartnerEvent {
  final RideRequest? ride;
  const SetActiveRide(this.ride);
  @override
  List<Object?> get props => [ride];
}

class AcceptRide extends PartnerEvent {
  final RideRequest ride;
  const AcceptRide(this.ride);
  @override
  List<Object?> get props => [ride];
}

class CompleteRide extends PartnerEvent {
  final String rideId;
  const CompleteRide(this.rideId);
  @override
  List<Object?> get props => [rideId];
}

class ArrivedAtPickup extends PartnerEvent {
  final String rideId;
  const ArrivedAtPickup(this.rideId);
  @override
  List<Object?> get props => [rideId];
}

class StartRide extends PartnerEvent {
  final String rideId;
  const StartRide(this.rideId);
  @override
  List<Object?> get props => [rideId];
}

class CancelRide extends PartnerEvent {
  final String rideId;
  final String? reason;
  const CancelRide(this.rideId, {this.reason});
  @override
  List<Object?> get props => [rideId, reason];
}

class RejectRide extends PartnerEvent {
  final String rideId;
  final String? reason;
  const RejectRide(this.rideId, {this.reason});
  @override
  List<Object?> get props => [rideId, reason];
}

class LoadEarnings extends PartnerEvent {
  const LoadEarnings();
}

// ── Deliveries ───────────────────────────────────────────────────────────────
class LoadDeliveryHistory extends PartnerEvent {
  const LoadDeliveryHistory();
}

class SetActiveDelivery extends PartnerEvent {
  final DeliveryTask? delivery;
  const SetActiveDelivery(this.delivery);
  @override
  List<Object?> get props => [delivery];
}

class AcceptDelivery extends PartnerEvent {
  final DeliveryTask delivery;
  const AcceptDelivery(this.delivery);
  @override
  List<Object?> get props => [delivery];
}

class CompleteDelivery extends PartnerEvent {
  final String deliveryId;
  const CompleteDelivery(this.deliveryId);
  @override
  List<Object?> get props => [deliveryId];
}

// ── Incoming Requests ────────────────────────────────────────────────────────
/// Emitted when an incoming ride request arrives from the stream.
class IncomingRideReceived extends PartnerEvent {
  final RideRequest ride;
  const IncomingRideReceived(this.ride);
  @override
  List<Object?> get props => [ride];
}

/// Emitted when an incoming delivery task arrives from the stream.
class IncomingDeliveryReceived extends PartnerEvent {
  final DeliveryTask delivery;
  const IncomingDeliveryReceived(this.delivery);
  @override
  List<Object?> get props => [delivery];
}

/// Clears the pending incoming request after the overlay is dismissed.
class DismissIncomingRequest extends PartnerEvent {
  const DismissIncomingRequest();
}
