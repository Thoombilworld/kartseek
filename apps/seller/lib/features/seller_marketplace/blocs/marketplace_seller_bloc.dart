import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_event.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_state.dart';
import 'package:kartseek_seller/features/seller_marketplace/services/marketplace_seller_api_service.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/services/seller_api_service.dart';
import 'package:kartseek_seller/features/shared/services/seller_order_socket_service.dart';

class MarketplaceSellerBloc
    extends Bloc<MarketplaceSellerEvent, MarketplaceSellerState> {
  final SellerApiService _api;
  final MarketplaceSellerApiService _mktApi;
  final SellerOrderSocketService _socket;

  MarketplaceSellerBloc({SellerApiService? api, MarketplaceSellerApiService? mktApi, SellerOrderSocketService? socket})
      : _api    = api    ?? SellerApiService.instance,
        _mktApi = mktApi ?? MarketplaceSellerApiService.instance,
        _socket = socket ?? SellerOrderSocketService(),
        super(const MarketplaceSellerState()) {
    on<LoadMarketplaceDashboard>(_onLoadDashboard);
    on<LoadMarketplaceOrders>(_onLoadOrders);
    on<FilterMarketplaceOrders>(_onFilterOrders);
    on<AcceptMarketplaceOrder>(_onAccept);
    on<RejectMarketplaceOrder>(_onReject);
    on<StartPreparingMarketplaceOrder>(_onPrepare);
    on<MarkMarketplaceOrderReady>(_onReady);
    on<MarkMarketplaceOrderShipped>(_onShipped);
    on<DispatchMarketplaceDelivery>(_onDispatch);
    on<MarketplaceNewOrderPushed>(_onNewOrder);
    on<UpdateOrderStatus>(_onUpdateStatus);
    on<LoadMarketplaceProducts>(_onLoadProducts);
    on<FilterMarketplaceProducts>(_onFilterProducts);
    on<SearchMarketplaceProducts>(_onSearchProducts);
    on<UpdateMarketplaceStock>(_onUpdateStock);
    on<ToggleMarketplaceProductActive>(_onToggleActive);
    on<ToggleMarketplaceProductFeatured>(_onToggleFeatured);
    on<UpdateMarketplaceProductPrice>(_onUpdatePrice);
    on<AddMarketplaceProduct>(_onAddProduct);
    on<LoadMarketplaceAnalytics>(_onLoadAnalytics);
    // ── New marketplace-specific event handlers ─────────────────
    on<LoadMarketplaceReturns>(_onLoadReturns);
    on<ApproveMarketplaceReturn>(_onApproveReturn);
    on<RejectMarketplaceReturn>(_onRejectReturn);
    on<LoadMarketplaceRefunds>(_onLoadRefunds);
    on<LoadMarketplaceReviews>(_onLoadReviews);
    on<ReplyToMarketplaceReview>(_onReplyReview);
    on<LoadMarketplacePromotions>(_onLoadPromotions);
    on<CreateMarketplacePromotion>(_onCreatePromotion);
    on<UpdateMarketplacePromotion>(_onUpdatePromotion);
    on<LoadMarketplaceCampaigns>(_onLoadCampaigns);
    on<CreateMarketplaceCampaign>(_onCreateCampaign);
    on<LoadMarketplaceStorefront>(_onLoadStorefront);
    on<UpdateMarketplaceStorefront>(_onUpdateStorefront);
    on<LoadMarketplaceTransactions>(_onLoadTransactions);
    on<LoadMarketplacePayouts>(_onLoadPayouts);
    on<RequestEarlyPayout>(_onRequestPayout);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  Future<void> _onLoadDashboard(LoadMarketplaceDashboard event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    try {
      final data = await _api.getDashboard();
      emit(state.copyWith(status: MarketplaceBlocStatus.loaded, dashboardData: data));
    } catch (e) {
      // Was: emit `loaded` with `_mockDashboard(...)`. A seller reading invented
      // revenue cannot tell it from their own.
      emit(state.copyWith(
        status: MarketplaceBlocStatus.error,
        error: _readableError(e, 'your dashboard'),
      ));
    }
    add(LoadMarketplaceOrders(countryCode: event.countryCode));
    add(LoadMarketplaceProducts(countryCode: event.countryCode));
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  Future<void> _onLoadOrders(LoadMarketplaceOrders event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    try {
      final orders = await _api.getOrders(status: event.statusFilter);
      emit(state.copyWith(status: MarketplaceBlocStatus.loaded, orders: orders));
    } catch (e) {
      emit(state.copyWith(
        status: MarketplaceBlocStatus.error,
        error: _readableError(e, 'your orders'),
      ));
    }
  }

  void _onFilterOrders(FilterMarketplaceOrders event, Emitter<MarketplaceSellerState> emit) {
    emit(state.copyWith(selectedOrderFilter: event.filter));
  }

  Future<void> _onAccept(AcceptMarketplaceOrder event, Emitter<MarketplaceSellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.confirmed, message: 'Order accepted by seller');
    await _api.updateOrderStatus(event.orderId, 'CONFIRMED');
    _mutateStatus(event.orderId, SellerOrderStatus.confirmed, emit);
    emit(state.copyWith(actionMessage: 'Order accepted ✅', actionSuccess: true));
  }

  Future<void> _onReject(RejectMarketplaceOrder event, Emitter<MarketplaceSellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.cancelled, message: event.reason);
    await _api.updateOrderStatus(event.orderId, 'CANCELLED');
    final updated = state.orders.where((o) => o.id != event.orderId).toList();
    emit(state.copyWith(orders: updated, actionMessage: 'Order rejected ❌', actionSuccess: false));
  }

  Future<void> _onPrepare(StartPreparingMarketplaceOrder event, Emitter<MarketplaceSellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.preparing);
    await _api.updateOrderStatus(event.orderId, 'PREPARING');
    _mutateStatus(event.orderId, SellerOrderStatus.preparing, emit);
    emit(state.copyWith(actionMessage: 'Preparing order 📦', actionSuccess: true));
  }

  Future<void> _onReady(MarkMarketplaceOrderReady event, Emitter<MarketplaceSellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.ready);
    _socket.dispatchDelivery(orderId: event.orderId, pickupLat: event.pickupLat, pickupLng: event.pickupLng);
    await _api.updateOrderStatus(event.orderId, 'READY');
    _mutateStatus(event.orderId, SellerOrderStatus.ready, emit);
    emit(state.copyWith(actionMessage: 'Ready — delivery partner notified 🚚', actionSuccess: true));
  }

  Future<void> _onShipped(MarkMarketplaceOrderShipped event, Emitter<MarketplaceSellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.outForDelivery);
    await _api.updateOrderStatus(event.orderId, 'OUT_FOR_DELIVERY');
    _mutateStatus(event.orderId, SellerOrderStatus.outForDelivery, emit);
    emit(state.copyWith(actionMessage: 'Marked as shipped 🚚', actionSuccess: true));
  }

  Future<void> _onDispatch(DispatchMarketplaceDelivery event, Emitter<MarketplaceSellerState> emit) async {
    _socket.dispatchDelivery(orderId: event.orderId, pickupLat: event.pickupLat, pickupLng: event.pickupLng);
    emit(state.copyWith(actionMessage: 'Delivery dispatched 🚚', actionSuccess: true));
  }

  void _onNewOrder(MarketplaceNewOrderPushed event, Emitter<MarketplaceSellerState> emit) {
    emit(state.copyWith(orders: [event.order, ...state.orders]));
  }

  void _onUpdateStatus(UpdateOrderStatus event, Emitter<MarketplaceSellerState> emit) {
    _socket.updateOrderStatus(event.orderId, event.status);
    _mutateStatus(event.orderId, event.status, emit);
    emit(state.copyWith(actionMessage: 'Status updated', actionSuccess: true));
  }

  void _mutateStatus(String orderId, SellerOrderStatus status, Emitter<MarketplaceSellerState> emit) {
    final updated = state.orders
        .map((o) => o.id == orderId ? o.copyWith(status: status) : o)
        .toList();
    emit(state.copyWith(orders: updated));
  }

  // ── Products / Inventory ──────────────────────────────────────────────────

  /// Load the seller's own catalogue.
  ///
  /// This used to `await _api.getProducts(...)`, discard the result, and emit
  /// `_mockProducts()` unconditionally — outside the try — so a seller's product
  /// list on mobile was fictional even when the backend answered correctly. It
  /// also never advanced `status` past `loading`.
  Future<void> _onLoadProducts(LoadMarketplaceProducts event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    try {
      final res = await _api.getProducts(search: event.search, category: event.category);
      final rows = (res['data'] ?? res['products'] ?? const []) as List;
      emit(state.copyWith(
        status: MarketplaceBlocStatus.loaded,
        products: rows
            .whereType<Map>()
            .map((e) => MarketplaceProduct.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      ));
    } catch (e) {
      emit(state.copyWith(
        status: MarketplaceBlocStatus.error,
        error: _readableError(e, 'your products'),
      ));
    }
  }

  void _onFilterProducts(FilterMarketplaceProducts event, Emitter<MarketplaceSellerState> emit) {
    emit(state.copyWith(selectedCategory: event.category));
  }

  void _onSearchProducts(SearchMarketplaceProducts event, Emitter<MarketplaceSellerState> emit) {
    emit(state.copyWith(productSearch: event.query));
  }

  Future<void> _onUpdateStock(UpdateMarketplaceStock event, Emitter<MarketplaceSellerState> emit) async {
    final updated = state.products
        .map((p) => p.id == event.productId ? p.copyWith(stock: event.newStock) : p)
        .toList();
    emit(state.copyWith(products: updated, actionMessage: 'Stock updated to ${event.newStock} ✅', actionSuccess: true));
    await _api.updateStock(event.productId, event.newStock);
  }

  void _onToggleActive(ToggleMarketplaceProductActive event, Emitter<MarketplaceSellerState> emit) {
    final updated = state.products
        .map((p) => p.id == event.productId ? p.copyWith(isActive: event.isActive) : p)
        .toList();
    emit(state.copyWith(products: updated,
        actionMessage: event.isActive ? 'Product activated ✅' : 'Product deactivated', actionSuccess: event.isActive));
    _api.updateProduct(event.productId, {'active': event.isActive});
  }

  void _onToggleFeatured(ToggleMarketplaceProductFeatured event, Emitter<MarketplaceSellerState> emit) {
    final updated = state.products
        .map((p) => p.id == event.productId ? p.copyWith(isFeatured: event.isFeatured) : p)
        .toList();
    emit(state.copyWith(products: updated,
        actionMessage: event.isFeatured ? 'Featured ⭐' : 'Removed from featured', actionSuccess: true));
  }

  void _onUpdatePrice(UpdateMarketplaceProductPrice event, Emitter<MarketplaceSellerState> emit) {
    final updated = state.products
        .map((p) => p.id == event.productId ? p.copyWith(price: event.newPrice) : p)
        .toList();
    emit(state.copyWith(products: updated, actionMessage: 'Price updated ✅', actionSuccess: true));
  }

  void _onAddProduct(AddMarketplaceProduct event, Emitter<MarketplaceSellerState> emit) {
    emit(state.copyWith(products: [event.product, ...state.products],
        actionMessage: 'Product added ✅', actionSuccess: true));
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  /// Load sales analytics.
  ///
  /// Was the same shape as `_onLoadProducts`: call the API, throw the answer
  /// away, emit `_mockAnalytics(...)` as though it were the seller's own trading
  /// history.
  Future<void> _onLoadAnalytics(LoadMarketplaceAnalytics event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    try {
      final res = await _api.getAnalytics(period: event.period);
      final payload = (res['data'] is Map ? res['data'] : res) as Map;
      emit(state.copyWith(
        status: MarketplaceBlocStatus.loaded,
        analytics: MarketplaceAnalytics.fromJson(Map<String, dynamic>.from(payload)),
        analyticsPeriod: event.period,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: MarketplaceBlocStatus.error,
        error: _readableError(e, 'your analytics'),
        analyticsPeriod: event.period,
      ));
    }
  }

  /// Turn a transport failure into a sentence a seller can act on.
  String _readableError(Object error, String subject) {
    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.connectionError:
          return "We couldn't reach Seller Central. Check your connection and try again.";
        case DioExceptionType.badResponse:
          if (error.response?.statusCode == 401 || error.response?.statusCode == 403) {
            return 'Please sign in again to continue.';
          }
          break;
        default:
          break;
      }
    }
    return "We couldn't load $subject just now. Pull down to retry.";
  }

  // ── Country Catalogs ──────────────────────────────────────────────────────

  // ═══════════════════════════════════════════════════════════════════════════
  // New Event Handlers — wired to MarketplaceSellerApiService
  // ═══════════════════════════════════════════════════════════════════════════

  static const _sellerId = 'seller_001'; // TODO: read from auth state

  Future<void> _onLoadReturns(LoadMarketplaceReturns event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    final data = await _mktApi.getReturns(_sellerId, status: event.statusFilter);
    emit(state.copyWith(status: MarketplaceBlocStatus.loaded, extraData: {...state.extraData, 'returns': data}));
  }

  Future<void> _onApproveReturn(ApproveMarketplaceReturn event, Emitter<MarketplaceSellerState> emit) async {
    final ok = await _mktApi.approveReturn(_sellerId, event.returnId);
    emit(state.copyWith(actionMessage: ok ? 'Return approved ✅' : 'Failed to approve', actionSuccess: ok));
  }

  Future<void> _onRejectReturn(RejectMarketplaceReturn event, Emitter<MarketplaceSellerState> emit) async {
    final ok = await _mktApi.rejectReturn(_sellerId, event.returnId, event.reason);
    emit(state.copyWith(actionMessage: ok ? 'Return rejected' : 'Failed to reject', actionSuccess: ok));
  }

  Future<void> _onLoadRefunds(LoadMarketplaceRefunds event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    final data = await _mktApi.getRefunds(_sellerId, status: event.statusFilter);
    emit(state.copyWith(status: MarketplaceBlocStatus.loaded, extraData: {...state.extraData, 'refunds': data}));
  }

  Future<void> _onLoadReviews(LoadMarketplaceReviews event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    final data = await _mktApi.getReviews(_sellerId, filter: event.filter);
    emit(state.copyWith(status: MarketplaceBlocStatus.loaded, extraData: {...state.extraData, 'reviews': data}));
  }

  Future<void> _onReplyReview(ReplyToMarketplaceReview event, Emitter<MarketplaceSellerState> emit) async {
    final ok = await _mktApi.replyToReview(_sellerId, event.reviewId, event.reply);
    emit(state.copyWith(actionMessage: ok ? 'Reply sent ✅' : 'Failed to send reply', actionSuccess: ok));
  }

  Future<void> _onLoadPromotions(LoadMarketplacePromotions event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    final data = await _mktApi.getPromotions(_sellerId);
    emit(state.copyWith(status: MarketplaceBlocStatus.loaded, extraData: {...state.extraData, 'promotions': data}));
  }

  Future<void> _onCreatePromotion(CreateMarketplacePromotion event, Emitter<MarketplaceSellerState> emit) async {
    final ok = await _mktApi.createPromotion(_sellerId, event.promoData);
    emit(state.copyWith(actionMessage: ok ? 'Promotion created ✅' : 'Failed to create promotion', actionSuccess: ok));
  }

  Future<void> _onUpdatePromotion(UpdateMarketplacePromotion event, Emitter<MarketplaceSellerState> emit) async {
    final ok = await _mktApi.updatePromotion(_sellerId, event.promoId, event.promoData);
    emit(state.copyWith(actionMessage: ok ? 'Promotion updated' : 'Failed to update', actionSuccess: ok));
  }

  Future<void> _onLoadCampaigns(LoadMarketplaceCampaigns event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    final data = await _mktApi.getCampaigns(_sellerId);
    emit(state.copyWith(status: MarketplaceBlocStatus.loaded, extraData: {...state.extraData, 'campaigns': data}));
  }

  Future<void> _onCreateCampaign(CreateMarketplaceCampaign event, Emitter<MarketplaceSellerState> emit) async {
    final ok = await _mktApi.createCampaign(_sellerId, event.campaignData);
    emit(state.copyWith(actionMessage: ok ? 'Campaign created ✅' : 'Failed to create', actionSuccess: ok));
  }

  Future<void> _onLoadStorefront(LoadMarketplaceStorefront event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    final data = await _mktApi.getStorefront(_sellerId);
    emit(state.copyWith(status: MarketplaceBlocStatus.loaded, extraData: {...state.extraData, 'storefront': data}));
  }

  Future<void> _onUpdateStorefront(UpdateMarketplaceStorefront event, Emitter<MarketplaceSellerState> emit) async {
    final ok = await _mktApi.updateStorefront(_sellerId, event.storefrontData);
    emit(state.copyWith(actionMessage: ok ? 'Storefront updated ✅' : 'Failed to update', actionSuccess: ok));
  }

  Future<void> _onLoadTransactions(LoadMarketplaceTransactions event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    final data = await _mktApi.getTransactions(_sellerId, type: event.typeFilter);
    emit(state.copyWith(status: MarketplaceBlocStatus.loaded, extraData: {...state.extraData, 'transactions': data}));
  }

  Future<void> _onLoadPayouts(LoadMarketplacePayouts event, Emitter<MarketplaceSellerState> emit) async {
    emit(state.copyWith(status: MarketplaceBlocStatus.loading));
    final data = await _mktApi.getPayouts(_sellerId);
    emit(state.copyWith(status: MarketplaceBlocStatus.loaded, extraData: {...state.extraData, 'payouts': data}));
  }

  Future<void> _onRequestPayout(RequestEarlyPayout event, Emitter<MarketplaceSellerState> emit) async {
    final wallet = await _mktApi.getWallet(_sellerId);
    final balance = (wallet['pendingPayout'] as num?)?.toDouble() ?? 0;
    if (balance <= 0) {
      emit(state.copyWith(actionMessage: 'No pending balance to withdraw', actionSuccess: false));
      return;
    }
    final result = await _mktApi.requestPayout(_sellerId, amount: balance);
    final ok = result['success'] == true;
    emit(state.copyWith(actionMessage: ok ? 'Payout requested ✅' : 'Failed to request payout', actionSuccess: ok));
  }

}
