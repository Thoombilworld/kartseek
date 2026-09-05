import 'package:kartseek_shared_mobile/core/constants.dart';

/// KARTSEEK Partner App — API Service
/// Centralized API endpoint definitions for the partner module.
///
/// Route mapping:
///   - Auth, Profile, Online/Offline, Rides → taxi controller (`/taxi/driver/*`)
///   - KYC, Compliance → partner controller (`/api/partner/*`)
///   - Delivery lifecycle → partner controller (`/api/partner/delivery/*`)
///   - Notifications, Support → partner controller (`/api/partner/*`)
///   - Wallet → wallet controller (`/wallet/*`)
class PartnerApiService {
  static final PartnerApiService _i = PartnerApiService._();
  factory PartnerApiService() => _i;
  PartnerApiService._();

  final String _base = AppConstants.apiBaseUrl;
  /// Partner-specific controller base (unified partner APIs)
  String get _partner => '$_base/api/partner';

  // ── Auth ────────────────────────────────────────────────────────────────
  String get loginUrl => '$_partner/auth/login';
  String get otpVerifyUrl => '$_partner/auth/otp/verify';

  // ── Driver Profile ─────────────────────────────────────────────────────
  String get profileUrl => '$_base/taxi/driver/profile';
  String get updateProfileUrl => '$_base/taxi/driver/profile';
  String get onlineUrl => '$_base/taxi/driver/online';
  String get offlineUrl => '$_base/taxi/driver/offline';
  String get earningsUrl => '$_base/taxi/driver/earnings';
  String get locationUrl => '$_base/taxi/driver/location';

  // ── KYC & Documents (partner controller) ───────────────────────────────
  String get kycUploadUrl => '$_partner/documents/upload';
  String get kycStatusUrl => '$_partner/compliance/status';

  // ── Notifications (partner controller) ─────────────────────────────────
  String get notificationsUrl => '$_partner/notifications';

  // ── Support (partner controller) ───────────────────────────────────────
  String get supportTicketsUrl => '$_partner/support/tickets';
  String get createSupportTicketUrl => '$_partner/support/tickets';

  // ── Wallet ─────────────────────────────────────────────────────────────
  String get walletUrl => '$_base/wallet';
  String get ledgerUrl => '$_base/wallet/ledger';

  // ── Earnings & Payouts (partner controller) ────────────────────────────
  String get earningsSummaryUrl => '$_partner/earnings/summary';
  String get payoutsUrl => '$_partner/payouts';

  // ── SOS Emergency (partner controller) ─────────────────────────────────
  String get sosUrl => '$_partner/sos';

  // ── Taxi Driver Rides (taxi controller) ────────────────────────────────
  String get taxiDashboardUrl => '$_partner/taxi/dashboard';
  String get rideRequestsUrl => '$_base/taxi/driver/ride-requests';
  String rideAcceptUrl(String rideId) => '$_base/taxi/driver/ride/$rideId/accept';
  String rideRejectUrl(String rideId) => '$_partner/taxi/rides/$rideId/reject';
  String rideArrivedUrl(String rideId) => '$_base/taxi/driver/ride/$rideId/arrived';
  String rideStartUrl(String rideId) => '$_base/taxi/driver/ride/$rideId/start';
  String rideCompleteUrl(String rideId) => '$_base/taxi/driver/ride/$rideId/complete';
  String rideCancelUrl(String rideId) => '$_partner/taxi/rides/$rideId/cancel';
  String get rideHistoryUrl => '$_partner/taxi/history';
  String get taxiEarningsUrl => '$_partner/taxi/earnings';

  // ── Delivery Tasks (partner controller — full lifecycle) ───────────────
  String get deliveryDashboardUrl => '$_partner/delivery/dashboard';
  String get deliveryTasksUrl => '$_partner/delivery/tasks';
  String deliveryTaskDetailUrl(String id) => '$_partner/delivery/tasks/$id';
  String deliveryAcceptUrl(String id) => '$_partner/delivery/tasks/$id/accept';
  String deliveryRejectUrl(String id) => '$_partner/delivery/tasks/$id/reject';
  String deliveryPickupStartUrl(String id) => '$_partner/delivery/tasks/$id/pickup-start';
  String deliveryPickupProofUrl(String id) => '$_partner/delivery/tasks/$id/pickup-proof';
  String deliveryDropStartUrl(String id) => '$_partner/delivery/tasks/$id/drop-start';
  String deliveryVerifyOtpUrl(String id) => '$_partner/delivery/tasks/$id/verify-otp';
  String deliveryDropProofUrl(String id) => '$_partner/delivery/tasks/$id/drop-proof';
  String deliveryCompleteUrl(String id) => '$_partner/delivery/tasks/$id/complete';
  String deliveryFailedUrl(String id) => '$_partner/delivery/tasks/$id/failed';
  String deliveryCodCollectUrl(String id) => '$_partner/delivery/tasks/$id/cod-collect';
  String get deliveryReturnsUrl => '$_partner/delivery/returns';
  String get deliveryHistoryUrl => '$_partner/delivery/history';
  String get deliveryEarningsUrl => '$_partner/delivery/earnings';
}
