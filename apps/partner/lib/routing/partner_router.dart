import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/routing/route_helpers.dart';
// Partner Auth
import 'package:kartseek_partner/features/auth/screens/partner_login_screen.dart';
import 'package:kartseek_partner/features/auth/screens/partner_otp_verify_screen.dart';
import 'package:kartseek_partner/features/auth/screens/partner_register_screen.dart';
import 'package:kartseek_partner/features/auth/screens/partner_forgot_password_screen.dart';
// Dashboard
import 'package:kartseek_partner/features/dashboard/screens/partner_role_dashboard_screen.dart';
import 'package:kartseek_partner/features/dashboard/screens/driver_dashboard_screen.dart';
import 'package:kartseek_partner/features/dashboard/screens/delivery_dashboard_screen.dart';
// Rides (Taxi Driver)
import 'package:kartseek_partner/features/rides/screens/incoming_ride_request_screen.dart';
import 'package:kartseek_partner/features/rides/screens/active_trip_screen.dart';
import 'package:kartseek_partner/features/rides/screens/trip_otp_screen.dart';
import 'package:kartseek_partner/features/rides/screens/trip_payment_screen.dart';
import 'package:kartseek_partner/features/rides/screens/trip_completed_screen.dart';
import 'package:kartseek_partner/features/rides/screens/trip_history_screen.dart';
import 'package:kartseek_partner/features/rides/screens/driver_active_ride_screen.dart';
import 'package:kartseek_partner/features/rides/screens/driver_documents_screen.dart';
import 'package:kartseek_partner/features/rides/screens/vendor_info_screen.dart';
// Deliveries
import 'package:kartseek_partner/features/deliveries/screens/incoming_delivery_request_screen.dart';
import 'package:kartseek_partner/features/deliveries/screens/active_delivery_screen.dart';
import 'package:kartseek_partner/features/deliveries/screens/delivery_otp_screen.dart';
import 'package:kartseek_partner/features/deliveries/screens/delivery_payment_screen.dart';
import 'package:kartseek_partner/features/deliveries/screens/delivery_completed_screen.dart';
import 'package:kartseek_partner/features/deliveries/screens/delivery_history_screen.dart';
import 'package:kartseek_partner/features/deliveries/screens/return_pickup_screen.dart';
import 'package:kartseek_partner/features/deliveries/screens/delivery_photo_proof_screen.dart';
// Earnings
import 'package:kartseek_partner/features/earnings/screens/partner_earnings_screen.dart';
import 'package:kartseek_partner/features/earnings/screens/partner_wallet_screen.dart';
import 'package:kartseek_partner/features/earnings/screens/partner_ledger_screen.dart';
// Profile
import 'package:kartseek_partner/features/profile/screens/partner_profile_screen.dart';
import 'package:kartseek_partner/features/profile/screens/partner_edit_profile_screen.dart';
import 'package:kartseek_partner/features/profile/screens/partner_documents_screen.dart';
import 'package:kartseek_partner/features/profile/screens/partner_kyc_status_screen.dart';
import 'package:kartseek_partner/features/profile/screens/partner_bank_details_screen.dart';
import 'package:kartseek_partner/features/profile/screens/partner_vehicle_details_screen.dart';
// Notifications
import 'package:kartseek_partner/features/notifications/screens/partner_notification_screen.dart';
// Support
import 'package:kartseek_partner/features/support/screens/partner_support_screen.dart';
// Settings
import 'package:kartseek_partner/features/settings/screens/partner_settings_screen.dart';
import 'package:kartseek_partner/features/settings/screens/partner_rating_screen.dart';

/// Partner-only route definitions for the KARTSEEK Partner App.
/// Contains routes for all taxi driver and delivery partner flows.
class PartnerRouter {
  PartnerRouter._();

  // ── Partner Auth ──────────────────────────────────────────────────────────
  static const String partnerLogin = '/partner/login';
  static const String partnerOtpVerify = '/partner/otp-verify';
  static const String partnerRegister = '/partner/register';
  static const String partnerForgotPassword = '/partner/forgot-password';

  // ── Dashboards ────────────────────────────────────────────────────────────
  static const String partnerDashboard = '/partner/dashboard';
  static const String partnerDriverDashboard = '/partner/driver';
  static const String partnerDeliveryDashboard = '/partner/delivery';

  // ── Rides (Taxi Driver) ───────────────────────────────────────────────────
  static const String partnerIncomingRide = '/partner/ride/incoming';
  static const String partnerActiveTrip = '/partner/ride/active';
  static const String partnerTripOtp = '/partner/ride/otp';
  static const String partnerTripPayment = '/partner/ride/payment';
  static const String partnerTripCompleted = '/partner/ride/completed';
  static const String partnerTripHistory = '/partner/ride/history';
  static const String partnerPickupNav = '/partner/ride/pickup';
  static const String driverActiveRide = '/partner/ride/driver';
  static const String driverDocuments = '/partner/driver/documents';
  static const String driverVendorInfo = '/partner/driver/vendor';

  // ── Deliveries ────────────────────────────────────────────────────────────
  static const String partnerIncomingDelivery = '/partner/delivery/incoming';
  static const String partnerActiveDelivery = '/partner/delivery/active';
  static const String partnerDeliveryOtp = '/partner/delivery/otp';
  static const String partnerDeliveryPayment = '/partner/delivery/payment';
  static const String partnerDeliveryCompleted = '/partner/delivery/completed';
  static const String partnerDeliveryHistory = '/partner/delivery/history';
  static const String partnerReturnPickup = '/partner/delivery/return-pickup';
  static const String partnerDeliveryPhotoProof = '/partner/delivery/photo-proof';

  // ── Earnings ──────────────────────────────────────────────────────────────
  static const String partnerEarnings = '/partner/earnings';
  static const String partnerWallet = '/partner/wallet';
  static const String partnerLedger = '/partner/ledger';

  // ── Profile ───────────────────────────────────────────────────────────────
  static const String partnerProfile = '/partner/profile';
  static const String partnerEditProfile = '/partner/profile/edit';
  static const String partnerDocuments = '/partner/documents';
  static const String partnerKycStatus = '/partner/kyc';
  static const String partnerBankDetails = '/partner/bank';
  static const String partnerVehicleDetails = '/partner/vehicle';

  // ── Notifications ─────────────────────────────────────────────────────────
  static const String partnerNotifications = '/partner/notifications';

  // ── Support ───────────────────────────────────────────────────────────────
  static const String partnerSupport = '/partner/support';

  // ── Settings ──────────────────────────────────────────────────────────────
  static const String partnerSettings = '/partner/settings';
  static const String partnerRating = '/partner/rating';

  // ── Route Generator ───────────────────────────────────────────────────────
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      // Root route — redirects to login
      case '/':
      // Partner Auth
      case partnerLogin:
        return RouteHelpers.fadeRoute(const PartnerLoginScreen(), settings);
      case partnerOtpVerify:
        return RouteHelpers.slideRoute(const PartnerOtpVerifyScreen(), settings);
      case partnerRegister:
        return RouteHelpers.slideRoute(const PartnerRegisterScreen(), settings);
      case partnerForgotPassword:
        return RouteHelpers.slideRoute(const PartnerForgotPasswordScreen(), settings);

      // Dashboards
      case partnerDashboard:
        return RouteHelpers.fadeRoute(const PartnerRoleDashboardScreen(), settings);
      case partnerDriverDashboard:
        return RouteHelpers.fadeRoute(const DriverDashboardScreen(), settings);
      case partnerDeliveryDashboard:
        return RouteHelpers.fadeRoute(const DeliveryDashboardScreen(), settings);

      // Rides (Taxi Driver)
      case partnerIncomingRide:
        final args = settings.arguments;
        RideRequestData? rideData;
        if (args is Map<String, dynamic>) {
          rideData = RideRequestData.fromMap(args);
        } else if (args is RideRequestData) {
          rideData = args;
        }
        return RouteHelpers.slideRoute(IncomingRideRequestScreen(rideData: rideData), settings);
      case partnerActiveTrip:
        return RouteHelpers.slideRoute(const ActiveTripScreen(), settings);
      case partnerPickupNav:
        return RouteHelpers.slideRoute(const ActiveTripScreen(), settings);
      case partnerTripOtp:
        return RouteHelpers.slideRoute(const TripOtpScreen(), settings);
      case partnerTripPayment:
        return RouteHelpers.slideRoute(const TripPaymentScreen(), settings);
      case partnerTripCompleted:
        return RouteHelpers.fadeRoute(const TripCompletedScreen(), settings);
      case partnerTripHistory:
        return RouteHelpers.slideRoute(const TripHistoryScreen(), settings);
      case driverActiveRide:
        return RouteHelpers.slideRoute(const DriverActiveRideScreen(), settings);
      case driverDocuments:
        return RouteHelpers.slideRoute(const DriverDocumentsScreen(), settings);
      case driverVendorInfo:
        return RouteHelpers.slideRoute(const VendorInfoScreen(), settings);

      // Deliveries
      case partnerIncomingDelivery:
        return RouteHelpers.slideRoute(const IncomingDeliveryRequestScreen(), settings);
      case partnerActiveDelivery:
        return RouteHelpers.slideRoute(const ActiveDeliveryScreen(), settings);
      case partnerDeliveryOtp:
        return RouteHelpers.slideRoute(const DeliveryOtpScreen(), settings);
      case partnerDeliveryPayment:
        return RouteHelpers.slideRoute(const DeliveryPaymentScreen(), settings);
      case partnerDeliveryCompleted:
        return RouteHelpers.fadeRoute(const DeliveryCompletedScreen(), settings);
      case partnerDeliveryHistory:
        return RouteHelpers.slideRoute(const DeliveryHistoryScreen(), settings);
      case partnerReturnPickup:
        return RouteHelpers.slideRoute(const ReturnPickupScreen(), settings);
      case partnerDeliveryPhotoProof:
        return RouteHelpers.slideRoute(const DeliveryPhotoProofScreen(), settings);

      // Earnings
      case partnerEarnings:
        return RouteHelpers.slideRoute(const PartnerEarningsScreen(), settings);
      case partnerWallet:
        return RouteHelpers.slideRoute(const PartnerWalletScreen(), settings);
      case partnerLedger:
        return RouteHelpers.slideRoute(const PartnerLedgerScreen(), settings);

      // Profile
      case partnerProfile:
        return RouteHelpers.slideRoute(const PartnerProfileScreen(), settings);
      case partnerEditProfile:
        return RouteHelpers.slideRoute(const PartnerEditProfileScreen(), settings);
      case partnerDocuments:
        return RouteHelpers.slideRoute(const PartnerDocumentsScreen(), settings);
      case partnerKycStatus:
        return RouteHelpers.slideRoute(const PartnerKycStatusScreen(), settings);
      case partnerBankDetails:
        return RouteHelpers.slideRoute(const PartnerBankDetailsScreen(), settings);
      case partnerVehicleDetails:
        return RouteHelpers.slideRoute(const PartnerVehicleDetailsScreen(), settings);

      // Notifications
      case partnerNotifications:
        return RouteHelpers.slideRoute(const PartnerNotificationScreen(), settings);

      // Support
      case partnerSupport:
        return RouteHelpers.slideRoute(const PartnerSupportScreen(), settings);

      // Settings
      case partnerSettings:
        return RouteHelpers.slideRoute(const PartnerSettingsScreen(), settings);
      case partnerRating:
        return RouteHelpers.slideRoute(const PartnerRatingScreen(), settings);

      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(child: Text('Route not found: ${settings.name}')),
          ),
        );
    }
  }
}
