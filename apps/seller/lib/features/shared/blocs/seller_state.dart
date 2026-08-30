import 'package:equatable/equatable.dart';
import 'package:kartseek_seller/features/shared/models/country_config.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/services/seller_order_socket_service.dart';

enum SellerBlocStatus { initial, loading, authenticated, unauthenticated, error }

class SellerState extends Equatable {
  final SellerBlocStatus status;
  final SellerProfile? profile;
  final int pendingOrderCount;
  final List<SellerLowStockAlert> lowStockAlerts;
  final int unreadNotifications;
  final String countryCode; // ISO country code, default QA
  final String? error;

  const SellerState({
    this.status = SellerBlocStatus.initial,
    this.profile,
    this.pendingOrderCount = 0,
    this.lowStockAlerts = const [],
    this.unreadNotifications = 0,
    this.countryCode = 'QA',
    this.error,
  });

  /// Full country configuration for the current session.
  CountryConfig get country => CountryConfig.forCode(
      profile?.countryCode ?? countryCode);

  bool get isAuthenticated   => status == SellerBlocStatus.authenticated;
  bool get isLoading         => status == SellerBlocStatus.loading;
  bool get isUnauthenticated => status == SellerBlocStatus.unauthenticated;

  SellerState copyWith({
    SellerBlocStatus? status,
    SellerProfile? profile,
    int? pendingOrderCount,
    List<SellerLowStockAlert>? lowStockAlerts,
    int? unreadNotifications,
    String? countryCode,
    String? error,
  }) {
    return SellerState(
      status:              status ?? this.status,
      profile:             profile ?? this.profile,
      pendingOrderCount:   pendingOrderCount ?? this.pendingOrderCount,
      lowStockAlerts:      lowStockAlerts ?? this.lowStockAlerts,
      unreadNotifications: unreadNotifications ?? this.unreadNotifications,
      countryCode:         countryCode ?? this.countryCode,
      error:               error,
    );
  }

  @override
  List<Object?> get props =>
      [status, profile, pendingOrderCount, lowStockAlerts, unreadNotifications, countryCode, error];
}
