import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_event.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/services/seller_api_service.dart';
import 'package:kartseek_seller/features/shared/services/seller_order_socket_service.dart';
import 'package:kartseek_shared_mobile/features/auth/services/auth_api_service.dart';

/// Central SellerBloc — manages authentication state, profile, and real-time
/// event bridging from [SellerOrderSocketService] into the widget tree.
class SellerBloc extends Bloc<SellerEvent, SellerState> {
  final SellerApiService _api;
  final SellerOrderSocketService _socket;
  final AuthApiService _authApi;

  StreamSubscription<SellerNewOrderEvent>? _newOrderSub;
  StreamSubscription<SellerLowStockAlert>? _lowStockSub;

  SellerBloc({
    SellerApiService? api,
    SellerOrderSocketService? socket,
    AuthApiService? authApi,
  })  : _api = api ?? SellerApiService.instance,
        _socket = socket ?? SellerOrderSocketService(),
        _authApi = authApi ?? AuthApiService(),
        super(const SellerState()) {
    on<LoadSellerProfile>(_onLoadProfile);
    on<SellerAuthenticated>(_onAuthenticated);
    on<SellerLogout>(_onLogout);
    on<SellerNewOrderReceived>(_onNewOrder);
    on<SellerLowStockReceived>(_onLowStock);
    on<SellerDismissLowStockAlerts>(_onDismissAlerts);
    on<SellerNotificationCountUpdated>(_onNotificationCount);
    on<SellerCountryChanged>(_onCountryChanged);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  Future<void> _onLoadProfile(LoadSellerProfile event, Emitter<SellerState> emit) async {
    emit(state.copyWith(status: SellerBlocStatus.loading));
    try {
      final json = await _api.getProfile();
      final profile = SellerProfile.fromJson(json);
      emit(state.copyWith(status: SellerBlocStatus.authenticated, profile: profile));
    } catch (e) {
      emit(state.copyWith(status: SellerBlocStatus.error, error: e.toString()));
    }
  }

  Future<void> _onAuthenticated(SellerAuthenticated event, Emitter<SellerState> emit) async {
    emit(state.copyWith(status: SellerBlocStatus.loading, countryCode: event.countryCode));

    // Connect WebSocket as seller role
    await _socket.connect(
      userId:   event.sellerId,
      role:     'seller',
      userType: event.role.value,
    );

    // Bridge WebSocket streams into BLoC events
    _newOrderSub?.cancel();
    _lowStockSub?.cancel();
    _newOrderSub = _socket.newOrderStream.listen(
      (order) => add(SellerNewOrderReceived(order)),
    );
    _lowStockSub = _socket.lowStockStream.listen(
      (alert) => add(SellerLowStockReceived(alert)),
    );

    // Load profile
    try {
      final json = await _api.getProfile();
      final profile = SellerProfile.fromJson(json);
      emit(state.copyWith(status: SellerBlocStatus.authenticated, profile: profile));
    } catch (_) {
      // Use mock if API unreachable
      emit(state.copyWith(
        status: SellerBlocStatus.authenticated,
        profile: SellerProfile.mock(role: event.role, countryCode: event.countryCode),
      ));
    }
  }

  Future<void> _onLogout(SellerLogout event, Emitter<SellerState> emit) async {
    _newOrderSub?.cancel();
    _lowStockSub?.cancel();
    _socket.disconnect();
    // Ends the session on the gateway too — which blacklists the token, so every
    // module and service rejects it immediately — then clears the keychain and
    // SecureApiClient. Previously this dropped only local state, and since login
    // never stored a token there was nothing to clear anyway.
    await _authApi.logout();
    emit(const SellerState(status: SellerBlocStatus.unauthenticated));
  }

  void _onNewOrder(SellerNewOrderReceived event, Emitter<SellerState> emit) {
    emit(state.copyWith(
      pendingOrderCount: state.pendingOrderCount + 1,
      unreadNotifications: state.unreadNotifications + 1,
    ));
  }

  void _onLowStock(SellerLowStockReceived event, Emitter<SellerState> emit) {
    final updated = List<SellerLowStockAlert>.from(state.lowStockAlerts)
      ..removeWhere((a) => a.itemId == event.alert.itemId) // deduplicate
      ..insert(0, event.alert);
    emit(state.copyWith(lowStockAlerts: updated));
  }

  void _onDismissAlerts(SellerDismissLowStockAlerts event, Emitter<SellerState> emit) {
    emit(state.copyWith(lowStockAlerts: []));
  }

  void _onNotificationCount(SellerNotificationCountUpdated event, Emitter<SellerState> emit) {
    emit(state.copyWith(unreadNotifications: event.count));
  }

  void _onCountryChanged(SellerCountryChanged event, Emitter<SellerState> emit) {
    emit(state.copyWith(
      countryCode: event.countryCode,
      // Update profile country if we have a mock profile
      profile: state.profile?.copyWith(countryCode: event.countryCode),
    ));
  }

  @override
  Future<void> close() async {
    _newOrderSub?.cancel();
    _lowStockSub?.cancel();
    _socket.dispose();
    return super.close();
  }
}
