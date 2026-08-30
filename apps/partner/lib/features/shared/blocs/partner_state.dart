import 'package:equatable/equatable.dart';
import 'package:kartseek_partner/features/shared/models/partner_profile_model.dart';
import 'package:kartseek_partner/features/shared/models/partner_earning_model.dart';
import 'package:kartseek_partner/features/shared/models/ride_model.dart';
import 'package:kartseek_partner/features/shared/models/delivery_model.dart';

/// Represents the full partner application state.
class PartnerState extends Equatable {
  // Profile & Auth
  final PartnerProfile profile;
  final bool isOnline;
  final PartnerRole? activeRole;

  // Earnings & Wallet
  final PartnerEarning earnings;
  final PartnerWallet wallet;
  final List<LedgerEntry> ledger;

  // Taxi Driver State
  final RideRequest? activeRide;
  final List<RideRequest> rideHistory;

  // Delivery Partner State
  final DeliveryTask? activeDelivery;
  final List<DeliveryTask> deliveryHistory;

  // Incoming Requests (real-time)
  final RideRequest? pendingRideRequest;
  final DeliveryTask? pendingDeliveryTask;

  // UI Flags
  final bool isLoading;
  final String? errorMessage;

  const PartnerState({
    required this.profile,
    this.isOnline = false,
    this.activeRole,
    required this.earnings,
    required this.wallet,
    this.ledger = const [],
    this.activeRide,
    this.rideHistory = const [],
    this.activeDelivery,
    this.deliveryHistory = const [],
    this.pendingRideRequest,
    this.pendingDeliveryTask,
    this.isLoading = false,
    this.errorMessage,
  });

  /// Initialise with mock data for immediate UI rendering.
  /// Default role is now `both` to demonstrate dual-role switching.
  factory PartnerState.initial() => PartnerState(
        profile: PartnerProfile.mock(role: PartnerRole.both),
        earnings: PartnerEarning.mock(),
        wallet: PartnerWallet.mock(),
        ledger: LedgerEntry.mockList(),
        rideHistory: RideRequest.mockHistory(),
        deliveryHistory: DeliveryTask.mockHistory(),
        activeRole: PartnerRole.taxiDriver,
      );

  PartnerState copyWith({
    PartnerProfile? profile,
    bool? isOnline,
    Object? activeRole = _sentinel,
    PartnerEarning? earnings,
    PartnerWallet? wallet,
    List<LedgerEntry>? ledger,
    Object? activeRide = _sentinel,
    List<RideRequest>? rideHistory,
    Object? activeDelivery = _sentinel,
    List<DeliveryTask>? deliveryHistory,
    Object? pendingRideRequest = _sentinel,
    Object? pendingDeliveryTask = _sentinel,
    bool? isLoading,
    Object? errorMessage = _sentinel,
  }) =>
      PartnerState(
        profile: profile ?? this.profile,
        isOnline: isOnline ?? this.isOnline,
        activeRole: activeRole == _sentinel ? this.activeRole : activeRole as PartnerRole?,
        earnings: earnings ?? this.earnings,
        wallet: wallet ?? this.wallet,
        ledger: ledger ?? this.ledger,
        activeRide: activeRide == _sentinel ? this.activeRide : activeRide as RideRequest?,
        rideHistory: rideHistory ?? this.rideHistory,
        activeDelivery: activeDelivery == _sentinel ? this.activeDelivery : activeDelivery as DeliveryTask?,
        deliveryHistory: deliveryHistory ?? this.deliveryHistory,
        pendingRideRequest: pendingRideRequest == _sentinel ? this.pendingRideRequest : pendingRideRequest as RideRequest?,
        pendingDeliveryTask: pendingDeliveryTask == _sentinel ? this.pendingDeliveryTask : pendingDeliveryTask as DeliveryTask?,
        isLoading: isLoading ?? this.isLoading,
        errorMessage: errorMessage == _sentinel ? this.errorMessage : errorMessage as String?,
      );

  /// Whether the partner is currently acting as a taxi driver.
  bool get isTaxiMode => activeRole == PartnerRole.taxiDriver;

  /// Whether the partner is currently acting as a delivery boy.
  bool get isDeliveryMode => activeRole == PartnerRole.deliveryBoy;

  /// Whether there is a pending incoming request of any type.
  bool get hasIncomingRequest => pendingRideRequest != null || pendingDeliveryTask != null;

  @override
  List<Object?> get props => [
        profile,
        isOnline,
        activeRole,
        earnings,
        wallet,
        ledger,
        activeRide,
        rideHistory,
        activeDelivery,
        deliveryHistory,
        pendingRideRequest,
        pendingDeliveryTask,
        isLoading,
        errorMessage,
      ];
}

/// Sentinel value for nullable copyWith fields.
const Object _sentinel = Object();
