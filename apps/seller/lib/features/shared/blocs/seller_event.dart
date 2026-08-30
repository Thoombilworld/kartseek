import 'package:equatable/equatable.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/services/seller_order_socket_service.dart';

abstract class SellerEvent extends Equatable {
  const SellerEvent();
  @override
  List<Object?> get props => [];
}

/// Load or refresh the seller's profile from the API.
class LoadSellerProfile extends SellerEvent {
  const LoadSellerProfile();
}

/// Called when authentication succeeds — connects WebSocket and loads profile.
class SellerAuthenticated extends SellerEvent {
  final String sellerId;
  final SellerRole role;
  final String countryCode;
  const SellerAuthenticated({
    required this.sellerId,
    required this.role,
    this.countryCode = 'QA',
  });
  @override List<Object?> get props => [sellerId, role, countryCode];
}

/// Logout — disconnects WebSocket, clears profile.
class SellerLogout extends SellerEvent {
  const SellerLogout();
}

/// Incoming real-time new order (piped from SellerOrderSocketService).
class SellerNewOrderReceived extends SellerEvent {
  final SellerNewOrderEvent order;
  const SellerNewOrderReceived(this.order);
  @override List<Object?> get props => [order.orderId];
}

/// Incoming low-stock alert (piped from SellerOrderSocketService).
class SellerLowStockReceived extends SellerEvent {
  final SellerLowStockAlert alert;
  const SellerLowStockReceived(this.alert);
  @override List<Object?> get props => [alert.itemId];
}

/// Dismiss low-stock alerts banner.
class SellerDismissLowStockAlerts extends SellerEvent {
  const SellerDismissLowStockAlerts();
}

/// Update notification count.
class SellerNotificationCountUpdated extends SellerEvent {
  final int count;
  const SellerNotificationCountUpdated(this.count);
  @override List<Object?> get props => [count];
}

/// Seller switches country (e.g. operates in multiple markets).
class SellerCountryChanged extends SellerEvent {
  final String countryCode;
  const SellerCountryChanged(this.countryCode);
  @override List<Object?> get props => [countryCode];
}
