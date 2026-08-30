import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'presentation/blocs/taxi_home_bloc.dart';
import 'presentation/blocs/booking_bloc.dart';
import 'presentation/screens/taxi_home_screen.dart';
import 'presentation/screens/destination_search_screen.dart';
import 'presentation/screens/vehicle_selection_screen.dart';
import 'presentation/screens/driver_searching_screen.dart';
import 'presentation/screens/ride_tracking_screen.dart';
import 'presentation/screens/trip_complete_screen.dart';
import 'presentation/screens/pickup_confirmation_screen.dart';
import 'presentation/screens/payment_methods_screen.dart';
import 'presentation/screens/ride_history_screen.dart';
import 'presentation/screens/safety_screen.dart';
import 'presentation/screens/emergency_screen.dart';
import 'presentation/screens/map_picker_screen.dart';
import 'presentation/screens/trip_details_screen.dart';
import 'presentation/screens/coupon_selection_screen.dart';
import 'presentation/screens/saved_places_screen.dart';
import 'presentation/screens/scheduled_rides_screen.dart';
import 'presentation/screens/ride_cancellation_screen.dart';
import 'presentation/screens/fare_dispute_screen.dart';
import 'presentation/screens/lost_item_screen.dart';
import 'presentation/screens/trip_share_screen.dart';
import 'presentation/screens/ride_preferences_screen.dart';

/// Route names for the new taxi booking module.
class TaxiBookingRoutes {
  TaxiBookingRoutes._();

  static const String home = '/taxi';
  static const String search = '/taxi/search';
  static const String tripPlan = '/taxi/trip-plan';
  static const String savedPlaces = '/taxi/saved-places';
  static const String mapPicker = '/taxi/map-picker';
  static const String vehicleSelect = '/taxi/vehicles';
  static const String fareDetails = '/taxi/fare-details';
  static const String pickupConfirm = '/taxi/pickup-confirm';
  static const String paymentSelect = '/taxi/payment';
  static const String couponSelect = '/taxi/coupons';
  static const String searching = '/taxi/searching';
  static const String driverAccepted = '/taxi/driver-accepted';
  static const String driverArriving = '/taxi/driver-arriving';
  static const String driverArrived = '/taxi/driver-arrived';
  static const String otp = '/taxi/otp';
  static const String tracking = '/taxi/tracking';
  static const String safety = '/taxi/safety';
  static const String emergency = '/taxi/emergency';
  static const String tripShare = '/taxi/trip-share';
  static const String tripComplete = '/taxi/complete';
  static const String paymentResult = '/taxi/payment-result';
  static const String rating = '/taxi/rating';
  static const String tripHistory = '/taxi/history';
  static const String tripDetails = '/taxi/trip-details';
  static const String receipt = '/taxi/receipt';
  static const String fareDispute = '/taxi/dispute';
  static const String lostItem = '/taxi/lost-item';
  static const String schedule = '/taxi/schedule';
  static const String scheduledTrips = '/taxi/scheduled';
  static const String preferences = '/taxi/preferences';
  static const String support = '/taxi/support';
  static const String cancel = '/taxi/cancel';

  /// All route names — used for matching.
  static const allRoutes = [
    home, search, tripPlan, savedPlaces, mapPicker,
    vehicleSelect, fareDetails, pickupConfirm, paymentSelect,
    couponSelect, searching, driverAccepted, driverArriving,
    driverArrived, otp, tracking, safety, emergency,
    tripShare, tripComplete, paymentResult, rating,
    tripHistory, tripDetails, receipt, fareDispute,
    lostItem, schedule, scheduledTrips, preferences, support, cancel,
  ];

  /// Check if a route name belongs to the taxi module.
  static bool isMatch(String routeName) {
    return routeName.startsWith('/taxi');
  }
}

/// Lazy-initialized BookingBloc holder — ensures state persists across
/// route navigation within a booking session, but can be reset when the
/// user completes/cancels a trip or on logout.
class _BookingBlocHolder {
  _BookingBlocHolder._();
  static BookingBloc? _instance;

  static BookingBloc get instance {
    _instance ??= BookingBloc();
    return _instance!;
  }

  /// Reset the shared bloc (e.g., after trip completion or logout).
  /// Closes the old instance and creates a fresh one on next access.
  static void reset() {
    _instance?.close();
    _instance = null;
  }
}

/// Lazy-initialized TaxiHomeBloc holder — persists across navigations
/// to avoid re-fetching GPS, nearby drivers, etc. on every visit.
class _TaxiHomeBlocHolder {
  _TaxiHomeBlocHolder._();
  static TaxiHomeBloc? _instance;

  static TaxiHomeBloc get instance {
    _instance ??= TaxiHomeBloc()..add(InitializeTaxiHome());
    return _instance!;
  }

  /// Force re-initialization (e.g., on logout or region change).
  static void reset() {
    _instance?.close();
    _instance = null;
  }
}

BookingBloc get _sharedBookingBloc => _BookingBlocHolder.instance;
TaxiHomeBloc get _sharedTaxiHomeBloc => _TaxiHomeBlocHolder.instance;

/// Reset the shared booking session state.
/// Call after trip completion, cancellation, or logout.
void resetBookingSession() {
  _BookingBlocHolder.reset();
}

/// Reset the taxi home state (GPS, nearby drivers, etc.).
/// Call on logout or region change.
void resetTaxiHomeSession() {
  _TaxiHomeBlocHolder.reset();
}

/// Generate routes for the taxi booking module.
///
/// Returns null if the route is not handled by this module,
/// allowing the parent router to try other modules.
///
/// IMPORTANT: All routes share the same BookingBloc instance so that
/// pickup/destination/vehicle selection state persists across screens.
Route<dynamic>? generateTaxiRoute(RouteSettings settings) {
  if (!TaxiBookingRoutes.isMatch(settings.name ?? '')) return null;

  switch (settings.name) {
    case TaxiBookingRoutes.home:
      return _fadeRoute(
        MultiBlocProvider(
          providers: [
            BlocProvider.value(value: _sharedTaxiHomeBloc),
            BlocProvider.value(value: _sharedBookingBloc),
          ],
          child: const TaxiHomeScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.search:
      final searchType = settings.arguments as String?;
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: DestinationSearchScreen(initialSearchType: searchType),
        ),
        settings,
      );

    case TaxiBookingRoutes.vehicleSelect:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const VehicleSelectionScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.pickupConfirm:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const PickupConfirmationScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.paymentSelect:
      return _slideRoute(
        const PaymentMethodsScreen(),
        settings,
      );

    case TaxiBookingRoutes.searching:
      return _fadeRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const DriverSearchingScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.tracking:
    case TaxiBookingRoutes.driverArriving:
    case TaxiBookingRoutes.driverArrived:
    case TaxiBookingRoutes.otp:
      return _fadeRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const RideTrackingScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.tripComplete:
    case TaxiBookingRoutes.rating:
      return _fadeRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const TripCompleteScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.tripHistory:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const RideHistoryScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.cancel:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const RideCancellationScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.fareDispute:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const FareDisputeScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.lostItem:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const LostItemScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.tripShare:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const TripShareScreen(),
        ),
        settings,
      );

    // ── Trip Planning & Fare ────────────────────────────────────────
    case TaxiBookingRoutes.tripPlan:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const VehicleSelectionScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.fareDetails:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const TripCompleteScreen(), // Fare details shown in trip complete
        ),
        settings,
      );

    // ── Safety & Emergency ──────────────────────────────────────────
    case TaxiBookingRoutes.safety:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const SafetyScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.emergency:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const EmergencyScreen(),
        ),
        settings,
      );

    // ── Schedule & Preferences ──────────────────────────────────────
    case TaxiBookingRoutes.schedule:
    case TaxiBookingRoutes.scheduledTrips:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const ScheduledRidesScreen(),
        ),
        settings,
      );

    // ── Receipt & Trip Details ──────────────────────────────────────
    case TaxiBookingRoutes.receipt:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const TripCompleteScreen(),
        ),
        settings,
      );

    case TaxiBookingRoutes.tripDetails:
      final tripData = settings.arguments as TripDetail?;
      return _slideRoute(
        tripData != null
            ? TripDetailsScreen(trip: tripData)
            : BlocProvider.value(
                value: _sharedBookingBloc,
                child: const TripCompleteScreen(),
              ),
        settings,
      );

    case TaxiBookingRoutes.paymentResult:
      return _fadeRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const TripCompleteScreen(),
        ),
        settings,
      );

    // ── Map Picker ──────────────────────────────────────────────────
    case TaxiBookingRoutes.mapPicker:
      final args = settings.arguments as Map<String, dynamic>?;
      return _slideRoute(
        MapPickerScreen(
          mode: args?['mode'] == 'destination'
              ? MapPickerMode.destination
              : MapPickerMode.pickup,
          initialPosition: args?['position'],
        ),
        settings,
      );

    // ── Saved Places ────────────────────────────────────────────────
    case TaxiBookingRoutes.savedPlaces:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const SavedPlacesScreen(),
        ),
        settings,
      );

    // ── Coupons ─────────────────────────────────────────────────────
    case TaxiBookingRoutes.couponSelect:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: const CouponSelectionScreen(),
        ),
        settings,
      );

    // ── Preferences & Support ───────────────────────────────────────
    case TaxiBookingRoutes.preferences:
    case TaxiBookingRoutes.support:
      return _slideRoute(
        BlocProvider.value(
          value: _sharedBookingBloc,
          child: RidePreferencesScreen(isSupport: settings.name == TaxiBookingRoutes.support),
        ),
        settings,
      );

    default:
      // Only return null for routes we DON'T handle (non-/taxi routes)
      // to let the legacy router handle them.
      return null;
  }
}

/// Creates a fade transition route.
Route<dynamic> _fadeRoute(Widget page, RouteSettings settings) {
  return PageRouteBuilder(
    settings: settings,
    pageBuilder: (_, __, ___) => page,
    transitionsBuilder: (_, animation, __, child) {
      return FadeTransition(opacity: animation, child: child);
    },
    transitionDuration: const Duration(milliseconds: 300),
  );
}

/// Creates a slide-from-right transition route.
Route<dynamic> _slideRoute(Widget page, RouteSettings settings) {
  return PageRouteBuilder(
    settings: settings,
    pageBuilder: (_, __, ___) => page,
    transitionsBuilder: (_, animation, __, child) {
      final offset = Tween<Offset>(
        begin: const Offset(1, 0),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
      ));
      return SlideTransition(position: offset, child: child);
    },
    transitionDuration: const Duration(milliseconds: 350),
  );
}

