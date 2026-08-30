import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';
import 'package:kartseek_customer/features/pharmacy/repositories/pharmacy_repository.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_fuzzy_search.dart';

/// PharmacyBloc — Manages pharmacy discovery, medicine ordering, and prescriptions.
class PharmacyBloc extends Bloc<PharmacyEvent, PharmacyState> {
  final PharmacyRepository _repository;

  PharmacyBloc({PharmacyRepository? repository})
      : _repository = repository ?? PharmacyRepository(),
        super(const PharmacyState()) {
    // Home & Discovery
    on<LoadPharmacyHome>(_onLoadHome);
    on<LoadPharmacies>(_onLoadPharmacies);
    on<LoadPharmacyById>(_onLoadById);

    // Categories
    on<LoadPharmacyCategories>(_onLoadCategories);
    on<SelectPharmacyCategory>(_onSelectCategory);
    on<ClearCategoryFilter>(_onClearCategoryFilter);
    on<LoadPharmaciesByCategory>(_onLoadPharmaciesByCategory);

    // Store Detail
    on<LoadPharmacyStoreDetail>(_onLoadStoreDetail);

    // Store Selection (single-store cart enforcement)
    on<SelectPharmacyStore>(_onSelectStore);
    on<ConfirmStoreSwitch>(_onConfirmStoreSwitch);
    on<CancelStoreSwitch>(_onCancelStoreSwitch);

    // Search
    on<SearchMedicines>(_onSearch);
    on<ClearSearchResults>(_onClearSearch);

    // Cart
    on<AddMedicineToCart>(_onAddToCart);
    on<RemoveMedicineFromCart>(_onRemoveFromCart);
    on<UpdateCartItemQuantity>(_onUpdateCartQty);
    on<ClearPharmacyCart>(_onClearCart);

    // Prescription
    on<UploadPrescription>(_onUploadPrescription);
    on<LoadMyPrescriptions>(_onLoadPrescriptions);
    on<LoadPrescriptionDetail>(_onLoadPrescriptionDetail);

    // Orders
    on<PlacePharmacyOrder>(_onPlaceOrder);
    on<LoadPharmacyOrders>(_onLoadOrders);
    on<LoadPharmacyOrderDetail>(_onLoadOrderDetail);
    on<ReorderPharmacyOrder>(_onReorder);

    // Reviews
    on<LoadStoreReviews>(_onLoadReviews);
    on<SubmitPharmacyReview>(_onSubmitReview);

    // Offers & Coupons
    on<LoadPharmacyOffers>(_onLoadOffers);
    on<ApplyPharmacyCoupon>(_onApplyCoupon);
    on<RemovePharmacyCoupon>(_onRemoveCoupon);

    // Brands
    on<LoadPharmacyBrands>(_onLoadBrands);

    // Near Me
    on<LoadNearbyPharmacies>(_onLoadNearby);

    // Delivery
    on<SelectDeliveryAddress>(_onSelectAddress);
    on<SelectDeliverySlot>(_onSelectSlot);

    // Scanner
    on<ScanBarcode>(_onScanBarcode);
    on<ScanTextRecognized>(_onScanText);
    on<ClearScanResults>(_onClearScan);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  void _recalcCartTotals(Emitter<PharmacyState> emit) {
    final items = state.cartItems;
    double subtotal = 0;
    for (final item in items) {
      final price = (item['price'] as num?)?.toDouble() ?? 0;
      final qty = (item['quantity'] as int?) ?? 1;
      subtotal += price * qty;
    }
    final discount = state.appliedCoupon != null
        ? (state.appliedCoupon!.type == 'PERCENTAGE'
            ? subtotal * state.appliedCoupon!.value / 100
            : state.appliedCoupon!.value)
        : 0.0;
    final fee = subtotal >= 500 ? 0.0 : 49.0;
    emit(state.copyWith(
      cartSubtotal: subtotal,
      cartDeliveryFee: fee,
      cartDiscount: discount,
      cartTotal: subtotal - discount + fee,
    ));
  }

  // ── Home & Discovery ───────────────────────────────────────────────────────

  Future<void> _onLoadHome(LoadPharmacyHome event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      final data = await _repository.getPharmacyHome();
      final mockHome = PharmacyMockData.homeData;
      emit(state.copyWith(
        status: PharmacyStatus.success,
        homeData: data,
        typedHomeData: mockHome,
        categories: mockHome.categories,
        allStores: mockHome.allStores,
      ));
    } catch (err) {
      debugPrint('API error, using mock data: $err');
      final mockHome = PharmacyMockData.homeData;
      emit(state.copyWith(
        status: PharmacyStatus.success,
        typedHomeData: mockHome,
        categories: mockHome.categories,
        allStores: mockHome.allStores,
      ));
    }
  }

  Future<void> _onLoadPharmacies(LoadPharmacies event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      final data = await _repository.getPharmacies();
      emit(state.copyWith(status: PharmacyStatus.success, pharmacies: data.cast<Map<String, dynamic>>()));
    } catch (err) {
      emit(state.copyWith(status: PharmacyStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadById(LoadPharmacyById event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      final data = await _repository.getPharmacyById(event.id);
      emit(state.copyWith(status: PharmacyStatus.success, selectedPharmacy: data));
    } catch (err) {
      emit(state.copyWith(status: PharmacyStatus.error, errorMessage: err.toString()));
    }
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  Future<void> _onLoadCategories(LoadPharmacyCategories event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      final data = await _repository.getCategories();
      final cats = data.map((e) => PharmacyCategory.fromJson(e)).toList();
      emit(state.copyWith(status: PharmacyStatus.success, categories: cats));
    } catch (err) {
      // Fall back to mock
      emit(state.copyWith(status: PharmacyStatus.success, categories: PharmacyMockData.categories));
    }
  }

  void _onSelectCategory(SelectPharmacyCategory event, Emitter<PharmacyState> emit) {
    if (state.selectedCategoryId == event.categoryId) {
      emit(state.copyWith(clearCategory: true, filteredStores: [], categoryStatus: PharmacyStatus.initial));
      return;
    }
    emit(state.copyWith(selectedCategoryId: event.categoryId, categoryStatus: PharmacyStatus.loading));
    final filtered = PharmacyMockData.getStoresByCategory(event.categoryId);
    emit(state.copyWith(
      selectedCategoryId: event.categoryId,
      filteredStores: filtered,
      categoryStatus: filtered.isEmpty ? PharmacyStatus.empty : PharmacyStatus.success,
    ));
  }

  void _onClearCategoryFilter(ClearCategoryFilter event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(clearCategory: true, filteredStores: [], categoryStatus: PharmacyStatus.initial));
  }

  void _onLoadPharmaciesByCategory(LoadPharmaciesByCategory event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(status: PharmacyStatus.loading));
    final filtered = PharmacyMockData.getStoresByCategory(event.categoryId);
    emit(state.copyWith(
      status: filtered.isEmpty ? PharmacyStatus.empty : PharmacyStatus.success,
      filteredStores: filtered,
      selectedCategoryId: event.categoryId,
    ));
  }

  // ── Store Detail ───────────────────────────────────────────────────────────

  void _onLoadStoreDetail(LoadPharmacyStoreDetail event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      final store = PharmacyMockData.stores.firstWhere(
        (s) => s.id == event.storeId || s.name.toLowerCase() == event.storeId.toLowerCase(),
        orElse: () => PharmacyMockData.stores.first,
      );
      final products = PharmacyMockData.getProductsByStore(store.id);
      emit(state.copyWith(status: PharmacyStatus.success, storeDetail: store, storeProducts: products));
    } catch (err) {
      emit(state.copyWith(status: PharmacyStatus.error, errorMessage: err.toString()));
    }
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  Future<void> _onSearch(SearchMedicines event, Emitter<PharmacyState> emit) async {
    if (event.query.isEmpty) {
      emit(state.copyWith(status: PharmacyStatus.initial, searchResults: [], searchQuery: null));
      return;
    }
    emit(state.copyWith(status: PharmacyStatus.loading, searchQuery: event.query));
    try {
      final data = await _repository.searchMedicines(event.query, page: event.page);
      final results = data.map((e) => PharmacyProduct.fromJson(e as Map<String, dynamic>)).toList();

      if (results.isEmpty) {
        // API returned nothing — try fuzzy match locally
        final fuzzyResults = _fuzzyFallback(event.query);
        emit(state.copyWith(
          status: fuzzyResults.isEmpty ? PharmacyStatus.empty : PharmacyStatus.success,
          searchResults: fuzzyResults,
        ));
      } else {
        emit(state.copyWith(
          status: PharmacyStatus.success,
          medicines: data.cast<Map<String, dynamic>>(),
          searchResults: results,
        ));
      }
    } catch (err) {
      // Fall back to mock search, then fuzzy if still empty
      final q = event.query.toLowerCase();
      final mockResults = PharmacyMockData.allProducts
          .where((p) => p.name.toLowerCase().contains(q) || p.brand.toLowerCase().contains(q))
          .toList();

      if (mockResults.isEmpty) {
        // Try fuzzy matching for misspellings
        final fuzzyResults = _fuzzyFallback(event.query);
        emit(state.copyWith(
          status: fuzzyResults.isEmpty ? PharmacyStatus.empty : PharmacyStatus.success,
          searchResults: fuzzyResults,
        ));
      } else {
        emit(state.copyWith(
          status: PharmacyStatus.success,
          searchResults: mockResults,
        ));
      }
    }
  }

  /// Fuzzy search fallback — uses Levenshtein distance to find close matches.
  List<PharmacyProduct> _fuzzyFallback(String query) {
    final matches = PharmacyFuzzySearch.fuzzyMatch(
      query,
      PharmacyMockData.allProducts,
      maxDistance: 3,
    );
    return matches.map((m) => m.product).toList();
  }

  void _onClearSearch(ClearSearchResults event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(searchResults: [], searchQuery: null, status: PharmacyStatus.initial));
  }

  // ── Cart ───────────────────────────────────────────────────────────────────

  void _onAddToCart(AddMedicineToCart event, Emitter<PharmacyState> emit) {
    // ── Store binding guard ───────────────────────────────────────────────────
    // If the cart is empty / unbound → auto-bind to this store
    if (state.cartStoreId == null || state.cartItems.isEmpty) {
      // Proceed — the store will be set below with the add
    } else if (state.cartStoreId != event.storeId) {
      // Cart belongs to a different store — reject and flag conflict
      debugPrint('[PharmacyBloc] ❌ Blocked cross-store add: cart=${state.cartStoreId}, event=${event.storeId}');
      emit(state.copyWith(
        storeConflict: true,
        pendingStoreId: event.storeId,
        pendingStoreName: event.storeName,
      ));
      return;
    }

    // ── Normal add logic ──────────────────────────────────────────────────────
    final items = List<Map<String, dynamic>>.from(state.cartItems);
    final idx = items.indexWhere((i) => i['medicineId'] == event.medicineId);
    if (idx >= 0) {
      items[idx] = {...items[idx], 'quantity': (items[idx]['quantity'] as int? ?? 1) + event.quantity};
    } else {
      items.add({
        'medicineId': event.medicineId,
        'quantity': event.quantity,
        'storeId': event.storeId,
        ...?event.medicineData,
      });
    }
    emit(state.copyWith(
      cartItems: items,
      cartStoreId: event.storeId,
      cartStoreName: event.storeName,
    ));
    _recalcCartTotals(emit);
  }

  void _onRemoveFromCart(RemoveMedicineFromCart event, Emitter<PharmacyState> emit) {
    final items = state.cartItems.where((i) => i['medicineId'] != event.medicineId).toList();
    emit(state.copyWith(cartItems: items));
    _recalcCartTotals(emit);
  }

  void _onUpdateCartQty(UpdateCartItemQuantity event, Emitter<PharmacyState> emit) {
    if (event.quantity <= 0) {
      _onRemoveFromCart(RemoveMedicineFromCart(event.medicineId), emit);
      return;
    }
    final items = List<Map<String, dynamic>>.from(state.cartItems);
    final idx = items.indexWhere((i) => i['medicineId'] == event.medicineId);
    if (idx >= 0) {
      items[idx] = {...items[idx], 'quantity': event.quantity};
      emit(state.copyWith(cartItems: items));
      _recalcCartTotals(emit);
    }
  }

  void _onClearCart(ClearPharmacyCart event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(
      cartItems: [],
      cartSubtotal: 0, cartDeliveryFee: 0, cartDiscount: 0, cartTotal: 0,
      clearCoupon: true, clearCartStore: true,
      storeConflict: false,
    ));
  }

  // ── Store Selection (single-store cart) ──────────────────────────────────────

  /// When a customer enters a store detail page:
  /// - If cart is empty or same store → silently bind
  /// - If cart has items from a different store → flag conflict for UI dialog
  void _onSelectStore(SelectPharmacyStore event, Emitter<PharmacyState> emit) {
    final hasDifferentStore = state.cartStoreId != null &&
        state.cartStoreId != event.storeId &&
        state.cartItems.isNotEmpty;

    if (hasDifferentStore) {
      // Flag the conflict — UI shows confirmation dialog
      emit(state.copyWith(
        storeConflict: true,
        pendingStoreId: event.storeId,
        pendingStoreName: event.storeName,
      ));
      debugPrint('[PharmacyBloc] ⚠️ Store conflict: cart=${state.cartStoreName}, pending=${event.storeName}');
    } else {
      // No conflict — bind to this store
      emit(state.copyWith(
        cartStoreId: event.storeId,
        cartStoreName: event.storeName,
        storeConflict: false,
      ));
    }
  }

  /// User confirmed the store switch — clear cart and bind to the new store.
  void _onConfirmStoreSwitch(ConfirmStoreSwitch event, Emitter<PharmacyState> emit) {
    debugPrint('[PharmacyBloc] 🔄 Confirmed store switch → ${event.newStoreName}');
    emit(state.copyWith(
      cartItems: [],
      cartSubtotal: 0, cartDeliveryFee: 0, cartDiscount: 0, cartTotal: 0,
      clearCoupon: true,
      cartStoreId: event.newStoreId,
      cartStoreName: event.newStoreName,
      storeConflict: false,
    ));
  }

  /// User cancelled the store switch — dismiss the conflict dialog.
  void _onCancelStoreSwitch(CancelStoreSwitch event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(storeConflict: false));
  }

  // ── Prescription ───────────────────────────────────────────────────────────

  Future<void> _onUploadPrescription(UploadPrescription event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      final url = await _repository.uploadPrescription(event.imagePath);
      emit(state.copyWith(status: PharmacyStatus.success, prescriptionUrl: url));
    } catch (err) {
      emit(state.copyWith(status: PharmacyStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadPrescriptions(LoadMyPrescriptions event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      final data = await _repository.getMyPrescriptions('current-user');
      final rxList = data.map((e) => PharmacyPrescription.fromJson(e as Map<String, dynamic>)).toList();
      emit(state.copyWith(status: PharmacyStatus.success, prescriptions: rxList));
    } catch (err) {
      // Mock fallback
      emit(state.copyWith(status: PharmacyStatus.success, prescriptions: PharmacyMockData.prescriptions));
    }
  }

  void _onLoadPrescriptionDetail(LoadPrescriptionDetail event, Emitter<PharmacyState> emit) {
    final rx = state.prescriptions.isNotEmpty
        ? state.prescriptions.firstWhere((p) => p.id == event.prescriptionId, orElse: () => state.prescriptions.first)
        : PharmacyMockData.prescriptions.first;
    emit(state.copyWith(prescriptionDetail: rx));
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  Future<void> _onPlaceOrder(PlacePharmacyOrder event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.ordering));
    try {
      await _repository.placeOrder({
        'items': state.cartItems,
        'prescriptionUrl': state.prescriptionUrl,
        'paymentMethod': event.paymentMethod,
        'deliveryAddress': event.deliveryAddress,
        'deliverySlot': event.deliverySlot,
        'couponCode': event.couponCode,
      });
      emit(state.copyWith(status: PharmacyStatus.ordered, cartItems: [], clearCoupon: true));
    } catch (err) {
      emit(state.copyWith(status: PharmacyStatus.error, errorMessage: err.toString()));
    }
  }

  Future<void> _onLoadOrders(LoadPharmacyOrders event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      final data = await _repository.getOrders();
      final typedOrders = data.map((e) => PharmacyOrder.fromJson(e as Map<String, dynamic>)).toList();
      emit(state.copyWith(
        status: PharmacyStatus.success,
        orders: data.cast<Map<String, dynamic>>(),
        orderHistory: typedOrders,
      ));
    } catch (err) {
      // Mock fallback
      emit(state.copyWith(status: PharmacyStatus.success, orderHistory: PharmacyMockData.orders));
    }
  }

  Future<void> _onLoadOrderDetail(LoadPharmacyOrderDetail event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      final data = await _repository.getOrderById(event.orderId);
      final order = PharmacyOrder.fromJson(data);
      emit(state.copyWith(status: PharmacyStatus.success, orderDetail: order));
    } catch (err) {
      // Mock fallback
      final mockOrder = PharmacyMockData.orders.firstWhere(
        (o) => o.id == event.orderId,
        orElse: () => PharmacyMockData.orders.first,
      );
      emit(state.copyWith(status: PharmacyStatus.success, orderDetail: mockOrder));
    }
  }

  void _onReorder(ReorderPharmacyOrder event, Emitter<PharmacyState> emit) {
    final order = state.orderHistory.firstWhere(
      (o) => o.id == event.orderId,
      orElse: () => PharmacyMockData.orders.first,
    );
    final cartItems = order.items.map((item) => {
      'medicineId': item.itemId,
      'name': item.name,
      'quantity': item.quantity,
      'price': item.price,
      'needsRx': item.requiresPrescription,
    }).toList();
    emit(state.copyWith(cartItems: cartItems));
    _recalcCartTotals(emit);
  }

  // ── Reviews ────────────────────────────────────────────────────────────────

  Future<void> _onLoadReviews(LoadStoreReviews event, Emitter<PharmacyState> emit) async {
    try {
      final data = await _repository.getStoreReviews(event.storeId);
      final reviews = data.map((e) => PharmacyReview.fromJson(e as Map<String, dynamic>)).toList();
      emit(state.copyWith(storeReviews: reviews));
    } catch (err) {
      emit(state.copyWith(storeReviews: PharmacyMockData.reviews));
    }
  }

  Future<void> _onSubmitReview(SubmitPharmacyReview event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      await _repository.submitReview(event.storeId, rating: event.rating, comment: event.comment, customerId: 'current-user');
      emit(state.copyWith(status: PharmacyStatus.success));
    } catch (err) {
      // Simulate success for mock
      emit(state.copyWith(status: PharmacyStatus.success));
    }
  }

  // ── Offers ─────────────────────────────────────────────────────────────────

  void _onLoadOffers(LoadPharmacyOffers event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(offers: PharmacyMockData.offers));
  }

  void _onApplyCoupon(ApplyPharmacyCoupon event, Emitter<PharmacyState> emit) {
    final offer = PharmacyMockData.offers.firstWhere(
      (o) => o.code.toLowerCase() == event.code.toLowerCase() && o.isActive,
      orElse: () => const PharmacyOffer(id: '', title: '', code: '', type: '', value: 0, isActive: false),
    );
    if (offer.isActive) {
      emit(state.copyWith(appliedCoupon: offer));
      _recalcCartTotals(emit);
    } else {
      emit(state.copyWith(errorMessage: 'Invalid or expired coupon code'));
    }
  }

  void _onRemoveCoupon(RemovePharmacyCoupon event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(clearCoupon: true));
    _recalcCartTotals(emit);
  }

  // ── Brands ─────────────────────────────────────────────────────────────────

  void _onLoadBrands(LoadPharmacyBrands event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(brands: PharmacyMockData.brands));
  }

  // ── Near Me ────────────────────────────────────────────────────────────────

  Future<void> _onLoadNearby(LoadNearbyPharmacies event, Emitter<PharmacyState> emit) async {
    emit(state.copyWith(status: PharmacyStatus.loading));
    try {
      final data = await _repository.getNearbyPharmacies(lat: event.latitude, lng: event.longitude, radius: event.radius);
      final stores = data.map((e) => PharmacyStore.fromJson(e as Map<String, dynamic>)).toList();
      emit(state.copyWith(status: PharmacyStatus.success, nearbyStores: stores));
    } catch (err) {
      // Fall back to mock
      emit(state.copyWith(status: PharmacyStatus.success, nearbyStores: PharmacyMockData.stores.take(5).toList()));
    }
  }

  // ── Delivery ───────────────────────────────────────────────────────────────

  void _onSelectAddress(SelectDeliveryAddress event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(selectedAddress: event.address));
  }

  void _onSelectSlot(SelectDeliverySlot event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(selectedSlotId: event.slotId, selectedSlotLabel: event.slotLabel));
  }

  // ── Scanner ────────────────────────────────────────────────────────────────

  Future<void> _onScanBarcode(ScanBarcode event, Emitter<PharmacyState> emit) async {
    // Prevent duplicate lookups for the same code
    if (event.code == state.lastScannedCode && state.scanStatus == PharmacyStatus.success) return;

    emit(state.copyWith(
      scanStatus: PharmacyStatus.loading,
      lastScannedCode: event.code,
      lastScanFormat: event.format,
    ));

    try {
      final result = await _repository.lookupBarcode(event.code);
      final items = (result['data'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      final matchType = result['matchType'] as String? ?? 'unknown';

      if (items.isEmpty) {
        // Try mock data fallback for development
        final mockResults = PharmacyMockData.allProducts
            .where((p) => p.name.toLowerCase().contains(event.code.toLowerCase()) ||
                          p.id.contains(event.code))
            .toList();
        emit(state.copyWith(
          scanStatus: mockResults.isEmpty ? PharmacyStatus.empty : PharmacyStatus.success,
          scanResults: mockResults,
          scanMatchType: 'mock_fallback',
        ));
      } else {
        // Parse real API results
        final products = items.map((e) {
          try { return PharmacyProduct.fromJson(e); }
          catch (_) { return null; }
        }).whereType<PharmacyProduct>().toList();

        emit(state.copyWith(
          scanStatus: products.isEmpty ? PharmacyStatus.empty : PharmacyStatus.success,
          scanResults: products,
          scanMatchType: matchType,
        ));
      }
    } catch (err) {
      // Fall back to mock data on error
      final mockResults = PharmacyMockData.allProducts
          .where((p) => p.name.toLowerCase().contains(event.code.toLowerCase()))
          .take(5)
          .toList();
      emit(state.copyWith(
        scanStatus: mockResults.isEmpty ? PharmacyStatus.empty : PharmacyStatus.success,
        scanResults: mockResults,
        scanMatchType: 'error_fallback',
      ));
    }
  }

  Future<void> _onScanText(ScanTextRecognized event, Emitter<PharmacyState> emit) async {
    final text = event.recognizedText.trim();
    if (text.isEmpty || text.length < 3) return;

    emit(state.copyWith(
      scanStatus: PharmacyStatus.loading,
      lastScannedCode: text,
      lastScanFormat: 'TEXT_OCR',
    ));

    try {
      // Use the existing search endpoint for text queries
      final results = await _repository.searchMedicines(text, limit: 10);
      final products = results.map((e) {
        try { return PharmacyProduct.fromJson(e as Map<String, dynamic>); }
        catch (_) { return null; }
      }).whereType<PharmacyProduct>().toList();

      if (products.isEmpty) {
        // Mock fallback
        final mockResults = PharmacyMockData.allProducts
            .where((p) => p.name.toLowerCase().contains(text.toLowerCase()) ||
                          p.genericName?.toLowerCase().contains(text.toLowerCase()) == true ||
                          p.brand.toLowerCase().contains(text.toLowerCase()))
            .take(8)
            .toList();
        emit(state.copyWith(
          scanStatus: mockResults.isEmpty ? PharmacyStatus.empty : PharmacyStatus.success,
          scanResults: mockResults,
          scanMatchType: 'ocr_mock',
        ));
      } else {
        emit(state.copyWith(
          scanStatus: PharmacyStatus.success,
          scanResults: products,
          scanMatchType: 'ocr_api',
        ));
      }
    } catch (err) {
      final mockResults = PharmacyMockData.allProducts
          .where((p) => p.name.toLowerCase().contains(text.toLowerCase()))
          .take(5)
          .toList();
      emit(state.copyWith(
        scanStatus: mockResults.isEmpty ? PharmacyStatus.empty : PharmacyStatus.success,
        scanResults: mockResults,
        scanMatchType: 'ocr_fallback',
      ));
    }
  }

  void _onClearScan(ClearScanResults event, Emitter<PharmacyState> emit) {
    emit(state.copyWith(clearScan: true));
  }
}
