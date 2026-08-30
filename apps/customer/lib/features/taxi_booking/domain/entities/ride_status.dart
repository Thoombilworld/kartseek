/// KARTSEEK Taxi Booking — Ride Status Contract
///
/// Shared status model used across Customer App, Partner App,
/// Vendor Portal, Admin Panel, and Backend.
/// Every platform must use these exact status names.
library;

enum RideStatus {
  draft,
  routeEstimated,
  pickupConfirmed,
  paymentSelected,
  requesting,
  searchingDriver,
  driverAssigned,
  driverEnRoute,
  driverArrived,
  otpPending,
  otpVerified,
  tripStarted,
  tripInProgress,
  tripCompleted,
  paymentPending,
  paymentCompleted,
  customerCancelled,
  driverCancelled,
  adminCancelled,
  expired,
  noDriverAvailable,
  paymentFailed,
  disputed;

  /// Convert from backend snake_case or UPPER_CASE string.
  static RideStatus fromString(String value) {
    final normalized = value
        .replaceAll('_', '')
        .replaceAll('-', '')
        .toLowerCase();

    // Direct matches
    for (final status in RideStatus.values) {
      if (status.name.toLowerCase() == normalized) return status;
    }

    // Legacy status mapping from existing backend
    switch (value.toUpperCase()) {
      case 'SEARCHING_DRIVER':
        return RideStatus.searchingDriver;
      case 'DRIVER_ACCEPTED':
      case 'DRIVER_ASSIGNED':
        return RideStatus.driverAssigned;
      case 'DRIVER_ARRIVING':
        return RideStatus.driverEnRoute;
      case 'DRIVER_ARRIVED':
        return RideStatus.driverArrived;
      case 'RIDE_STARTED':
        return RideStatus.tripStarted;
      case 'RIDE_COMPLETED':
        return RideStatus.tripCompleted;
      case 'CANCELLED_BY_CUSTOMER':
        return RideStatus.customerCancelled;
      case 'CANCELLED_BY_DRIVER':
        return RideStatus.driverCancelled;
      case 'NO_DRIVER_FOUND':
        return RideStatus.noDriverAvailable;
      case 'DRIVER_REJECTED':
        return RideStatus.searchingDriver; // Re-dispatching
      default:
        return RideStatus.draft;
    }
  }

  /// Convert to backend-compatible string.
  String toBackendString() {
    switch (this) {
      case RideStatus.searchingDriver:
        return 'SEARCHING_DRIVER';
      case RideStatus.driverAssigned:
        return 'DRIVER_ASSIGNED';
      case RideStatus.driverEnRoute:
        return 'DRIVER_ARRIVING';
      case RideStatus.driverArrived:
        return 'DRIVER_ARRIVED';
      case RideStatus.tripStarted:
        return 'RIDE_STARTED';
      case RideStatus.tripCompleted:
        return 'RIDE_COMPLETED';
      case RideStatus.customerCancelled:
        return 'CANCELLED_BY_CUSTOMER';
      case RideStatus.driverCancelled:
        return 'CANCELLED_BY_DRIVER';
      case RideStatus.noDriverAvailable:
        return 'NO_DRIVER_FOUND';
      default:
        return name.toUpperCase();
    }
  }

  /// Whether the ride is in an active state (not terminal).
  bool get isActive => ![
    RideStatus.tripCompleted,
    RideStatus.paymentCompleted,
    RideStatus.customerCancelled,
    RideStatus.driverCancelled,
    RideStatus.adminCancelled,
    RideStatus.expired,
    RideStatus.noDriverAvailable,
    RideStatus.paymentFailed,
    RideStatus.disputed,
  ].contains(this);

  /// Whether the ride is in a terminal/completed state.
  bool get isTerminal => !isActive;

  /// Whether the customer can still cancel.
  bool get isCancellable => [
    RideStatus.requesting,
    RideStatus.searchingDriver,
    RideStatus.driverAssigned,
    RideStatus.driverEnRoute,
    RideStatus.driverArrived,
    RideStatus.otpPending,
  ].contains(this);

  /// Whether the ride is actively in progress (driver moving).
  bool get isInProgress => [
    RideStatus.tripStarted,
    RideStatus.tripInProgress,
  ].contains(this);

  /// Human-readable label for UI display.
  String get displayLabel {
    switch (this) {
      case RideStatus.draft:
        return 'Planning';
      case RideStatus.routeEstimated:
        return 'Route Ready';
      case RideStatus.pickupConfirmed:
        return 'Pickup Set';
      case RideStatus.paymentSelected:
        return 'Payment Set';
      case RideStatus.requesting:
        return 'Sending Request';
      case RideStatus.searchingDriver:
        return 'Finding Driver';
      case RideStatus.driverAssigned:
        return 'Driver Found';
      case RideStatus.driverEnRoute:
        return 'Driver Coming';
      case RideStatus.driverArrived:
        return 'Driver Here';
      case RideStatus.otpPending:
        return 'Enter OTP';
      case RideStatus.otpVerified:
        return 'OTP Verified';
      case RideStatus.tripStarted:
        return 'On the Way';
      case RideStatus.tripInProgress:
        return 'In Transit';
      case RideStatus.tripCompleted:
        return 'Trip Done';
      case RideStatus.paymentPending:
        return 'Processing Payment';
      case RideStatus.paymentCompleted:
        return 'Paid';
      case RideStatus.customerCancelled:
        return 'Cancelled';
      case RideStatus.driverCancelled:
        return 'Driver Cancelled';
      case RideStatus.adminCancelled:
        return 'Cancelled by Admin';
      case RideStatus.expired:
        return 'Expired';
      case RideStatus.noDriverAvailable:
        return 'No Drivers';
      case RideStatus.paymentFailed:
        return 'Payment Failed';
      case RideStatus.disputed:
        return 'Under Review';
    }
  }
}
