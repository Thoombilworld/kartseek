import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_event.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/services/seller_api_service.dart';
import 'package:kartseek_seller/features/shared/services/seller_order_socket_service.dart';

class GrocerySellerBloc extends Bloc<GrocerySellerEvent, GrocerySellerState> {
  final SellerApiService _api;
  final SellerOrderSocketService _socket;

  GrocerySellerBloc({SellerApiService? api, SellerOrderSocketService? socket})
      : _api    = api    ?? SellerApiService.instance,
        _socket = socket ?? SellerOrderSocketService(),
        super(const GrocerySellerState()) {
    on<LoadGroceryDashboard>(_onLoadDashboard);
    on<ToggleGroceryStore>(_onToggleStore);
    on<LoadGroceryOrders>(_onLoadOrders);
    on<FilterGroceryOrders>(_onFilterOrders);
    on<AcceptGroceryOrder>(_onAccept);
    on<StartPackingGroceryOrder>(_onPacking);
    on<MarkGroceryOrderReady>(_onReady);
    on<RejectGroceryOrder>(_onReject);
    on<MarkGroceryItemOos>(_onMarkOos);
    on<ConfirmGroceryDispatch>(_onDispatch);
    on<GroceryNewOrderPushed>(_onNewOrderPush);
    on<LoadGroceryCatalog>(_onLoadCatalog);
    on<FilterGroceryCatalog>(_onFilterCatalog);
    on<SearchGroceryCatalog>(_onSearchCatalog);
    on<ToggleCatalogItemAvailability>(_onToggleItem);
    on<UpdateGroceryProductPrice>(_onUpdatePrice);
    on<RestockGroceryProduct>(_onRestock);
    on<LoadGroceryLowStock>(_onLoadLowStock);
    on<SetGroceryEta>(_onSetEta);
    on<BulkRestockCategory>(_onBulkRestock);
    on<AddNewGroceryProduct>(_onAddProduct);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  Future<void> _onLoadDashboard(LoadGroceryDashboard event, Emitter<GrocerySellerState> emit) async {
    emit(state.copyWith(status: GroceryBlocStatus.loading));
    try {
      final data = await _api.getDashboard();
      emit(state.copyWith(status: GroceryBlocStatus.loaded, dashboardData: data));
    } catch (_) {
      emit(state.copyWith(status: GroceryBlocStatus.loaded, dashboardData: _mockDashboard(event.countryCode)));
    }
    add(LoadGroceryOrders(countryCode: event.countryCode));
    add(LoadGroceryCatalog(countryCode: event.countryCode));
  }

  void _onToggleStore(ToggleGroceryStore event, Emitter<GrocerySellerState> emit) {
    emit(state.copyWith(
      isOpen: event.isOpen,
      actionMessage: event.isOpen ? 'Store is now Open 🟢' : 'Store is now Closed 🔴',
    ));
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  Future<void> _onLoadOrders(LoadGroceryOrders event, Emitter<GrocerySellerState> emit) async {
    emit(state.copyWith(status: GroceryBlocStatus.loading));
    try {
      final orders = await _api.getOrders();
      emit(state.copyWith(status: GroceryBlocStatus.loaded, orders: orders));
    } catch (_) {
      emit(state.copyWith(status: GroceryBlocStatus.loaded, orders: _mockOrders(event.countryCode)));
    }
  }

  void _onFilterOrders(FilterGroceryOrders event, Emitter<GrocerySellerState> emit) {
    emit(state.copyWith(selectedOrderFilter: event.filter));
  }

  Future<void> _onAccept(AcceptGroceryOrder event, Emitter<GrocerySellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.confirmed, estimatedMinutes: event.estimatedMinutes);
    await _api.updateOrderStatus(event.orderId, 'CONFIRMED');
    _updateStatus(event.orderId, SellerOrderStatus.confirmed, emit);
    emit(state.copyWith(actionMessage: 'Order accepted — ~${event.estimatedMinutes} min ✅', actionSuccess: true));
  }

  Future<void> _onPacking(StartPackingGroceryOrder event, Emitter<GrocerySellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.preparing);
    await _api.updateOrderStatus(event.orderId, 'PREPARING');
    _updateStatus(event.orderId, SellerOrderStatus.preparing, emit);
    emit(state.copyWith(actionMessage: 'Packing started 📦', actionSuccess: true));
  }

  Future<void> _onReady(MarkGroceryOrderReady event, Emitter<GrocerySellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.ready);
    _socket.dispatchDelivery(
      orderId:       event.orderId,
      pickupLat:     event.pickupLat,
      pickupLng:     event.pickupLng,
      pickupAddress: event.pickupAddress,
    );
    await _api.updateOrderStatus(event.orderId, 'READY');
    _updateStatus(event.orderId, SellerOrderStatus.ready, emit);
    emit(state.copyWith(actionMessage: 'Order ready — delivery partner dispatched 🚚', actionSuccess: true));
  }

  Future<void> _onReject(RejectGroceryOrder event, Emitter<GrocerySellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.cancelled, message: event.reason);
    await _api.updateOrderStatus(event.orderId, 'CANCELLED');
    final updated = state.orders.where((o) => o.id != event.orderId).toList();
    emit(state.copyWith(orders: updated, actionMessage: 'Order rejected ❌', actionSuccess: false));
  }

  Future<void> _onMarkOos(MarkGroceryItemOos event, Emitter<GrocerySellerState> emit) async {
    final updated = state.orders.map((o) {
      if (o.id != event.orderId) return o;
      final items = o.items.map((i) => i.id == event.itemId ? i.copyWith(isAvailable: false) : i).toList();
      return SellerOrder(
        id: o.id, type: o.type, status: o.status,
        customerId: o.customerId, customerName: o.customerName,
        items: items, total: o.total, createdAt: o.createdAt,
      );
    }).toList();
    emit(state.copyWith(orders: updated, actionMessage: 'Item marked as out of stock', actionSuccess: false));
  }

  Future<void> _onDispatch(ConfirmGroceryDispatch event, Emitter<GrocerySellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.ready);
    _socket.dispatchDelivery(orderId: event.orderId, pickupLat: 25.2854, pickupLng: 51.5310);
    await _api.updateOrderStatus(event.orderId, 'READY');
    _updateStatus(event.orderId, SellerOrderStatus.ready, emit);
    emit(state.copyWith(actionMessage: 'Delivery dispatched 🚚', actionSuccess: true));
  }

  void _onNewOrderPush(GroceryNewOrderPushed event, Emitter<GrocerySellerState> emit) {
    emit(state.copyWith(orders: [event.order, ...state.orders]));
  }

  void _updateStatus(String orderId, SellerOrderStatus status, Emitter<GrocerySellerState> emit) {
    final updated = state.orders
        .map((o) => o.id == orderId ? o.copyWith(status: status) : o)
        .toList();
    emit(state.copyWith(orders: updated));
  }

  // ── New Events ────────────────────────────────────────────────────────────

  void _onSetEta(SetGroceryEta event, Emitter<GrocerySellerState> emit) {
    emit(state.copyWith(
      dashboardData: {...state.dashboardData, 'eta_${event.orderId}': event.eta},
      actionMessage: 'ETA set to ${event.eta} min ⏱️',
      actionSuccess: true,
    ));
  }

  void _onBulkRestock(BulkRestockCategory event, Emitter<GrocerySellerState> emit) {
    final updated = state.allProducts.map((p) {
      if (p.category == event.categoryId && p.stockLevel != StockLevel.ok) {
        return p.copyWith(stockQty: p.minStockQty * 3);
      }
      return p;
    }).toList();
    emit(state.copyWith(allProducts: updated, actionMessage: 'Bulk restock for ${event.categoryId} applied ✅', actionSuccess: true));
  }

  void _onAddProduct(AddNewGroceryProduct event, Emitter<GrocerySellerState> emit) {
    final newProduct = GroceryProduct(
      id: 'g_new_${DateTime.now().millisecondsSinceEpoch}',
      name: event.name,
      emoji: event.emoji,
      category: event.categoryId,
      price: event.price,
      unit: event.unit,
      stockQty: event.stockQty,
      minStockQty: (event.stockQty * 0.3).round(),
      isAvailable: true,
    );
    final updated = [...state.allProducts, newProduct];
    final updatedCats = state.categories.map((cat) {
      if (cat.id == event.categoryId) {
        return GroceryCategory(id: cat.id, name: cat.name, emoji: cat.emoji, products: [...cat.products, newProduct]);
      }
      return cat;
    }).toList();
    emit(state.copyWith(allProducts: updated, categories: updatedCats, actionMessage: '${event.name} added to catalog ✅', actionSuccess: true));
  }

  // ── Catalog ───────────────────────────────────────────────────────────────

  Future<void> _onLoadCatalog(LoadGroceryCatalog event, Emitter<GrocerySellerState> emit) async {
    final categories = _mockCatalog(event.countryCode);
    final allProducts = categories.expand((c) => c.products).toList();
    emit(state.copyWith(categories: categories, allProducts: allProducts));
  }

  void _onFilterCatalog(FilterGroceryCatalog event, Emitter<GrocerySellerState> emit) {
    emit(state.copyWith(selectedCategoryId: event.categoryId));
  }

  void _onSearchCatalog(SearchGroceryCatalog event, Emitter<GrocerySellerState> emit) {
    emit(state.copyWith(catalogSearch: event.query));
  }

  void _onToggleItem(ToggleCatalogItemAvailability event, Emitter<GrocerySellerState> emit) {
    final updatedProducts = state.allProducts.map((p) {
      if (p.id == event.itemId) return p.copyWith(isAvailable: event.isAvailable);
      return p;
    }).toList();
    final updatedCats = state.categories.map((cat) {
      final products = cat.products.map((p) {
        if (p.id == event.itemId) return p.copyWith(isAvailable: event.isAvailable);
        return p;
      }).toList();
      return GroceryCategory(id: cat.id, name: cat.name, emoji: cat.emoji, products: products);
    }).toList();
    emit(state.copyWith(allProducts: updatedProducts, categories: updatedCats));
    _api.updateProduct(event.itemId, {'available': event.isAvailable});
  }

  void _onUpdatePrice(UpdateGroceryProductPrice event, Emitter<GrocerySellerState> emit) {
    final updated = state.allProducts.map((p) {
      if (p.id == event.itemId) return p.copyWith(price: event.newPrice);
      return p;
    }).toList();
    emit(state.copyWith(allProducts: updated, actionMessage: 'Price updated ✅', actionSuccess: true));
  }

  void _onRestock(RestockGroceryProduct event, Emitter<GrocerySellerState> emit) {
    final updated = state.allProducts.map((p) {
      if (p.id == event.itemId) return p.copyWith(stockQty: p.stockQty + event.quantity);
      return p;
    }).toList();
    emit(state.copyWith(allProducts: updated, actionMessage: 'Stock updated +${event.quantity} ✅', actionSuccess: true));
    _api.updateProduct(event.itemId, {'restock_qty': event.quantity});
  }

  void _onLoadLowStock(LoadGroceryLowStock event, Emitter<GrocerySellerState> emit) {
    emit(state.copyWith(status: GroceryBlocStatus.loaded));
  }

  // ── Country-Specific Mock Data ─────────────────────────────────────────────

  Map<String, dynamic> _mockDashboard(String cc) {
    const data = <String, Map<String, dynamic>>{
      'QA': {'orders': 54,  'revenue': 18400,  'currency': 'QAR', 'low_stock': 5,  'avg_pack': 12, 'rating': 4.7, 'reviews': 238,
             'weekly': [12400.0, 15200.0, 18400.0, 14100.0, 19800.0, 22300.0, 18400.0]},
      'IN': {'orders': 128, 'revenue': 52000,  'currency': '₹',   'low_stock': 8,  'avg_pack': 10, 'rating': 4.5, 'reviews': 710,
             'weekly': [38000.0, 44000.0, 52000.0, 49000.0, 61000.0, 58000.0, 52000.0]},
      'AE': {'orders': 43,  'revenue': 12800,  'currency': 'AED', 'low_stock': 3,  'avg_pack': 14, 'rating': 4.8, 'reviews': 189,
             'weekly': [9400.0, 10800.0, 12800.0, 11200.0, 14500.0, 16200.0, 12800.0]},
      'SA': {'orders': 61,  'revenue': 16200,  'currency': 'SAR', 'low_stock': 6,  'avg_pack': 11, 'rating': 4.6, 'reviews': 302,
             'weekly': [11800.0, 13400.0, 16200.0, 14800.0, 18500.0, 17900.0, 16200.0]},
      'KE': {'orders': 96,  'revenue': 48500,  'currency': 'KSh', 'low_stock': 9,  'avg_pack': 8,  'rating': 4.4, 'reviews': 512,
             'weekly': [34000.0, 38000.0, 48500.0, 42000.0, 55000.0, 51000.0, 48500.0]},
      'BH': {'orders': 29,  'revenue': 4200,   'currency': 'BHD', 'low_stock': 4,  'avg_pack': 13, 'rating': 4.7, 'reviews': 112,
             'weekly': [2800.0, 3400.0, 4200.0, 3900.0, 5100.0, 4700.0, 4200.0]},
      'KW': {'orders': 38,  'revenue': 5900,   'currency': 'KWD', 'low_stock': 3,  'avg_pack': 12, 'rating': 4.8, 'reviews': 158,
             'weekly': [4200.0, 4800.0, 5900.0, 5400.0, 7100.0, 6600.0, 5900.0]},
      'OM': {'orders': 31,  'revenue': 4800,   'currency': 'OMR', 'low_stock': 5,  'avg_pack': 14, 'rating': 4.5, 'reviews': 128,
             'weekly': [3300.0, 3900.0, 4800.0, 4400.0, 5700.0, 5200.0, 4800.0]},
      'GB': {'orders': 37,  'revenue': 3200,   'currency': '£',   'low_stock': 4,  'avg_pack': 15, 'rating': 4.9, 'reviews': 143,
             'weekly': [2100.0, 2600.0, 3200.0, 2900.0, 3800.0, 3600.0, 3200.0]},
      'US': {'orders': 72,  'revenue': 5400,   'currency': '\$',  'low_stock': 7,  'avg_pack': 13, 'rating': 4.6, 'reviews': 381,
             'weekly': [3800.0, 4400.0, 5400.0, 4900.0, 6300.0, 5900.0, 5400.0]},
    };
    return data[cc] ?? data['QA']!;
  }

  // ── Country-Specific Orders ────────────────────────────────────────────────

  List<SellerOrder> _mockOrders(String cc) {
    final configs = <String, List<Map<String, dynamic>>>{
      'QA': [
        {'sfx':'001','name':'Yousef Al Attiya',   'phone':'+974 5566 7788','status':SellerOrderStatus.pending,
         'items':[('🍅 Fresh Tomatoes (1kg)',140.0,2),('🥛 Full Cream Milk 1L',21.0,3),('🍗 Chicken Breast 1kg',90.0,1),('🫓 Arabic Bread (Khubz)',4.5,4)],
         'addr':'The Pearl, Doha'},
        {'sfx':'002','name':'Fatima Al Kuwari',   'phone':'+974 5544 1122','status':SellerOrderStatus.confirmed,
         'items':[('🥩 Lamb Mince 500g',135.0,1),('🥚 Free Range Eggs (tray)',36.0,1),('🌿 Fresh Spinach',18.0,2)],
         'addr':'West Bay, Doha'},
        {'sfx':'003','name':'Mohammed Al Kaabi',  'phone':'+974 5577 3344','status':SellerOrderStatus.preparing,
         'items':[('🍚 Basmati Rice 5kg',75.0,1),('🫘 Chickpeas 1kg',24.0,2),('🌴 Medjool Dates 1kg',105.0,1),('☕ Arabic Qahwa 250g',66.0,1)],
         'addr':'Lusail City, Doha'},
        {'sfx':'004','name':'Noura Al Thani',     'phone':'+974 5500 9988','status':SellerOrderStatus.ready,
         'items':[('💧 Mineral Water 1.5L (6pk)',27.0,2),('🥭 Mango (Alphonso) 1kg',54.0,1),('🧀 Labneh 250g',15.0,3)],
         'addr':'Al Sadd, Doha'},
        {'sfx':'005','name':'Khalid Al Naimi',    'phone':'+974 5533 6677','status':SellerOrderStatus.outForDelivery,
         'items':[('🥦 Broccoli 500g',21.0,1),('🥛 Greek Yoghurt 200g',25.5,2)],
         'addr':'Al Wakra, Qatar'},
        {'sfx':'006','name':'Amal Al Mahmoud',    'phone':'+974 5511 4455','status':SellerOrderStatus.pending,
         'items':[('🥩 Beef Fillet 500g',97.5,1),('🫙 Olive Oil Extra Virgin 500ml',105.0,1),('🍊 Fresh Orange Juice 1L',27.0,1)],
         'addr':'Al Dafna, Doha'},
        {'sfx':'007','name':'Ibrahim Al Sulaiti', 'phone':'+974 5599 2211','status':SellerOrderStatus.delivered,
         'items':[('🍝 Pasta 500g',15.0,3),('🥐 Croissants 6pk',36.0,1),('🍅 Fresh Tomatoes 1kg',14.0,2)],
         'addr':'Al Rayyan, Qatar'},
      ],
      'IN': [
        {'sfx':'001','name':'Rahul Sharma',     'phone':'+91 98100 11234','status':SellerOrderStatus.pending,
         'items':[('🧅 Onions 1kg',30.0,2),('🍅 Tomatoes 1kg',45.0,1),('🥔 Potatoes 2kg',50.0,1),('🌶️ MDH Garam Masala',85.0,1)],
         'addr':'Connaught Place, New Delhi'},
        {'sfx':'002','name':'Priya Patel',      'phone':'+91 88005 22345','status':SellerOrderStatus.confirmed,
         'items':[('🥛 Amul Full Cream Milk 1L',56.0,2),('🧀 Paneer 250g',90.0,1),('🍦 Dahi 500g',40.0,2)],
         'addr':'Bandra West, Mumbai'},
        {'sfx':'003','name':'Arjun Mehta',      'phone':'+91 70000 33456','status':SellerOrderStatus.preparing,
         'items':[('🍚 Basmati Rice 5kg',380.0,1),('🫘 Toor Dal 1kg',130.0,2),('🌾 Atta 10kg',350.0,1)],
         'addr':'Koramangala, Bangalore'},
        {'sfx':'004','name':'Sunita Verma',     'phone':'+91 94450 44567','status':SellerOrderStatus.ready,
         'items':[('🍪 Parle-G Biscuits (10pk)',100.0,1),('🍜 Maggi Noodles 12pk',144.0,1),('🥤 Chaas 1L',45.0,2)],
         'addr':'Salt Lake, Kolkata'},
        {'sfx':'005','name':'Vikram Singh',     'phone':'+91 99001 55678','status':SellerOrderStatus.outForDelivery,
         'items':[('🥚 Eggs 30pc tray',180.0,1),('🥭 Alphonso Mangoes (dozen)',280.0,1)],
         'addr':'Churchgate, Mumbai'},
        {'sfx':'006','name':'Meera Krishnan',   'phone':'+91 80000 66789','status':SellerOrderStatus.pending,
         'items':[('🌶️ Red Chilli Powder 200g',55.0,1),('🟡 Turmeric 200g',40.0,1),('🌿 Palak (Spinach) bundle',20.0,3)],
         'addr':'T Nagar, Chennai'},
        {'sfx':'007','name':'Rajan Gupta',      'phone':'+91 91234 77890','status':SellerOrderStatus.delivered,
         'items':[('🫘 Chana Dal 1kg',120.0,2),('🥛 Amul Full Cream Milk 1L',56.0,3)],
         'addr':'Powai, Mumbai'},
      ],
      'AE': [
        {'sfx':'001','name':'Mohammed Al Rashid','phone':'+971 50 123 4567','status':SellerOrderStatus.pending,
         'items':[('🍅 Fresh Tomatoes 1kg',17.0,2),('🥛 Full Cream Milk 1L',5.5,4),('🍗 Chicken Breast 1kg',25.0,1)],
         'addr':'Downtown Dubai'},
        {'sfx':'002','name':'Sarah Johnson',      'phone':'+971 55 234 5678','status':SellerOrderStatus.confirmed,
         'items':[('🌴 Medjool Dates 1kg',130.0,1),('☕ Arabic Qahwa 250g',80.0,1),('🫓 Arabic Bread (Khubz)',6.0,6)],
         'addr':'Palm Jumeirah, Dubai'},
        {'sfx':'003','name':'Aisha Al Zahra',     'phone':'+971 50 345 6789','status':SellerOrderStatus.preparing,
         'items':[('🥩 Beef Fillet 500g',240.0,1),('🥩 Lamb Mince 500g',165.0,1),('🥚 Free Range Eggs tray',44.0,1)],
         'addr':'Jumeirah Village Circle, Dubai'},
        {'sfx':'004','name':'Rajesh Nair',        'phone':'+971 55 456 7890','status':SellerOrderStatus.ready,
         'items':[('🍚 Basmati Rice 5kg',92.0,1),('🫙 Olive Oil 500ml',128.0,1),('🍝 Pasta 500g',18.4,3)],
         'addr':'Business Bay, Dubai'},
        {'sfx':'005','name':'Elena Petrov',       'phone':'+971 50 567 8901','status':SellerOrderStatus.outForDelivery,
         'items':[('💧 Mineral Water 500ml (6pk)',31.0,2),('🍊 Fresh OJ 1L',33.0,2)],
         'addr':'Marina Walk, Abu Dhabi'},
        {'sfx':'006','name':'Khalid Al Falasi',   'phone':'+971 55 678 9012','status':SellerOrderStatus.pending,
         'items':[('🧀 Greek Yoghurt 200g',31.0,3),('🧀 Labneh 250g',18.4,2),('🌿 Spinach bundle',22.0,2)],
         'addr':'Al Reem Island, Abu Dhabi'},
        {'sfx':'007','name':'Lisa Chen',          'phone':'+971 50 789 0123','status':SellerOrderStatus.delivered,
         'items':[('🥦 Cucumber 1kg',11.0,2),('🥑 Avocados (3pk)',20.0,2),('🍓 Strawberries punnet',23.0,1)],
         'addr':'Yas Island, Abu Dhabi'},
      ],
      'SA': [
        {'sfx':'001','name':'Tariq Al Zahrani',  'phone':'+966 50 111 2222','status':SellerOrderStatus.pending,
         'items':[('🍅 Fresh Tomatoes 1kg',18.0,2),('🥛 Full Cream Milk 1L',5.5,4),('🌴 Medjool Dates 1kg',130.0,1)],
         'addr':'King Fahd District, Riyadh'},
        {'sfx':'002','name':'Noura Al Qahtani',  'phone':'+966 55 222 3333','status':SellerOrderStatus.confirmed,
         'items':[('🍗 Whole Chicken (Halal)',80.0,2),('🥩 Lamb Mince 500g',170.0,1),('🥚 Free Range Eggs tray',45.0,1)],
         'addr':'Al Olaya, Riyadh'},
        {'sfx':'003','name':'Abdullah Al Ghamdi','phone':'+966 59 333 4444','status':SellerOrderStatus.preparing,
         'items':[('🍚 Basmati Rice 5kg',92.0,1),('☕ Arabic Qahwa 250g',80.0,2),('🫓 Arabic Bread (Khubz)',6.0,8)],
         'addr':'Al Hamra, Jeddah'},
        {'sfx':'004','name':'Lina Al Hassan',    'phone':'+966 50 444 5555','status':SellerOrderStatus.ready,
         'items':[('🧀 Greek Yoghurt 200g',31.0,2),('🥚 Eggs tray',45.0,1),('🥦 Cucumber 1kg',11.0,3)],
         'addr':'Al Madinah Road, Jeddah'},
        {'sfx':'005','name':'Omar Al Dossari',   'phone':'+966 55 555 6666','status':SellerOrderStatus.outForDelivery,
         'items':[('🫙 Olive Oil Extra Virgin 500ml',128.0,1),('🍝 Pasta 500g',18.4,3)],
         'addr':'Al Corniche, Dammam'},
        {'sfx':'006','name':'Reem Al Mutairi',   'phone':'+966 59 666 7777','status':SellerOrderStatus.pending,
         'items':[('🥭 Mango (Alphonso) 1kg',198.0,1),('💧 Mineral Water 1.5L (6pk)',28.0,3)],
         'addr':'Tahlia Street, Riyadh'},
        {'sfx':'007','name':'Saad Al Anazi',     'phone':'+966 50 777 8888','status':SellerOrderStatus.delivered,
         'items':[('🌿 Fresh Spinach bundle',22.0,2),('🍊 Fresh OJ 1L',33.0,2),('🫓 Khubz Bread (10pk)',15.0,1)],
         'addr':'Al Aziziyah, Makkah'},
      ],
      'KE': [
        {'sfx':'001','name':'Peter Ochieng',  'phone':'+254 722 111 222','status':SellerOrderStatus.pending,
         'items':[('🥬 Sukuma Wiki bundle',20.0,3),('🍅 Tomatoes 1kg',80.0,1),('🌽 Unga wa Ugali 2kg',120.0,1)],
         'addr':'Westlands, Nairobi'},
        {'sfx':'002','name':'Grace Wangari',  'phone':'+254 711 222 333','status':SellerOrderStatus.confirmed,
         'items':[('🥛 Brookside Milk 1L',65.0,2),('🥚 Eggs tray 30',420.0,1),('🍗 Chicken Legs 1kg',350.0,1)],
         'addr':'Kilimani, Nairobi'},
        {'sfx':'003','name':'Samuel Otieno',  'phone':'+254 733 333 444','status':SellerOrderStatus.preparing,
         'items':[('🍚 Pishori Rice 5kg',650.0,1),('🫘 Lentils (Dengu) 1kg',130.0,2),('🫘 Nyayo Beans 1kg',140.0,1)],
         'addr':'Karen, Nairobi'},
        {'sfx':'004','name':'Aisha Mohamed',  'phone':'+254 700 444 555','status':SellerOrderStatus.ready,
         'items':[('🥑 Avocados 3pk',150.0,2),('🍌 Sweet Bananas bunch',60.0,2),('🟣 Passion Fruits 6pk',100.0,1)],
         'addr':'Mombasa Road, Nairobi'},
        {'sfx':'005','name':'John Kamau',     'phone':'+254 722 555 666','status':SellerOrderStatus.outForDelivery,
         'items':[('🍹 Dawa Plus Juice 1L',130.0,2),('🥤 Milo 200g',180.0,1)],
         'addr':'Nyali, Mombasa'},
        {'sfx':'006','name':'Mary Njoroge',   'phone':'+254 711 666 777','status':SellerOrderStatus.pending,
         'items':[('🌽 Unga wa Ugali 2kg',120.0,2),('🫘 Dengu Lentils 1kg',130.0,1),('🥚 Eggs tray 30',420.0,1)],
         'addr':'Eldoret Town'},
        {'sfx':'007','name':'David Mutua',    'phone':'+254 733 777 888','status':SellerOrderStatus.delivered,
         'items':[('🥬 Sukuma Wiki bundle',20.0,4),('🍅 Tomatoes 1kg',80.0,1),('🥤 Tusker Soda 6pk',280.0,1)],
         'addr':'Kisumu City Centre'},
      ],
      'GB': [
        {'sfx':'001','name':'Oliver Smith',   'phone':'+44 7700 900123','status':SellerOrderStatus.pending,
         'items':[('🥛 Organic Whole Milk 2pt',1.25,3),('🧀 Cheddar Cheese 400g',3.5,1),('🥚 British Free Range Eggs 6',2.4,2)],
         'addr':'Mayfair, London W1'},
        {'sfx':'002','name':'Sophie Clarke',  'phone':'+44 7911 111222','status':SellerOrderStatus.confirmed,
         'items':[('🍞 Hovis Wholemeal Loaf',1.7,2),('🥐 Croissants 4pk',2.0,2),('🍵 PG Tips 80 Teabags',2.5,2)],
         'addr':'Covent Garden, London WC2'},
        {'sfx':'003','name':'Arjun Patel',    'phone':'+44 7700 222333','status':SellerOrderStatus.preparing,
         'items':[('🫘 Heinz Baked Beans 415g',1.2,4),('🫙 Marmite 250g',3.3,1),('🌿 Baby Spinach 200g',1.5,2)],
         'addr':'Canary Wharf, London E14'},
        {'sfx':'004','name':'Emma Thompson',  'phone':'+44 7800 333444','status':SellerOrderStatus.ready,
         'items':[('🍓 British Strawberries punnet',2.5,3),('🥑 Avocados',1.2,4),('🥗 Mixed Salad Leaves',1.8,2)],
         'addr':'Shoreditch, London E1'},
        {'sfx':'005','name':'James Whitfield','phone':'+44 7700 444555','status':SellerOrderStatus.outForDelivery,
         'items':[('🥚 British Free Range Eggs 6',2.4,2),('🧀 Cheddar Cheese 400g',3.5,2)],
         'addr':'Notting Hill, London W11'},
        {'sfx':'006','name':'Priya Sharma',   'phone':'+44 7911 555666','status':SellerOrderStatus.pending,
         'items':[('🍵 PG Tips 80 Teabags',2.5,3),('🫘 Heinz Baked Beans 415g',1.2,6),('🍞 Hovis Wholemeal Loaf',1.7,2)],
         'addr':'Manchester City Centre'},
        {'sfx':'007','name':'Thomas Brown',   'phone':'+44 7800 666777','status':SellerOrderStatus.delivered,
         'items':[('🥛 Organic Whole Milk 2pt',1.25,4),('🥐 Croissants 4pk',2.0,3)],
         'addr':'Edinburgh Old Town'},
      ],
      'US': [
        {'sfx':'001','name':'Michael Johnson', 'phone':'+1 212 555 0101','status':SellerOrderStatus.pending,
         'items':[('🥦 Organic Broccoli 1lb',2.99,2),('🥕 Baby Carrots 1lb',1.99,2),('🥛 Organic Valley Whole Milk',4.99,1)],
         'addr':'Midtown Manhattan, NY 10001'},
        {'sfx':'002','name':'Emily Rodriguez', 'phone':'+1 310 555 0202','status':SellerOrderStatus.confirmed,
         'items':[('🥜 Skippy Peanut Butter 16oz',3.99,2),('🌾 Quaker Oats 42oz',5.99,1),('🍊 Tropicana OJ 52oz',4.99,2)],
         'addr':'Beverly Hills, CA 90210'},
        {'sfx':'003','name':'David Kim',       'phone':'+1 415 555 0303','status':SellerOrderStatus.preparing,
         'items':[('🥚 Large Eggs Grade A (12)',4.29,2),('🍦 Greek Yogurt 32oz',5.49,2),('🥑 Hass Avocados',1.5,4)],
         'addr':'SoMa, San Francisco, CA 94103'},
        {'sfx':'004','name':'Jennifer Walsh',  'phone':'+1 617 555 0404','status':SellerOrderStatus.ready,
         'items':[('🫐 Blueberries 6oz',3.99,3),('🥗 Baby Spinach 5oz',3.49,2),('💧 LaCroix Sparkling 12pk',5.99,2)],
         'addr':'Back Bay, Boston, MA 02116'},
        {'sfx':'005','name':'Carlos Mendez',   'phone':'+1 786 555 0505','status':SellerOrderStatus.outForDelivery,
         'items':[('🍲 Campbells Tomato Soup',1.89,4),('🥜 Skippy Peanut Butter 16oz',3.99,1)],
         'addr':'Brickell, Miami, FL 33131'},
        {'sfx':'006','name':'Lisa Thompson',   'phone':'+1 312 555 0606','status':SellerOrderStatus.pending,
         'items':[('🥦 Organic Broccoli 1lb',2.99,3),('🥕 Baby Carrots 1lb',1.99,2),('🍊 Tropicana OJ 52oz',4.99,1)],
         'addr':'Lincoln Park, Chicago, IL 60614'},
        {'sfx':'007','name':'Robert Davis',    'phone':'+1 469 555 0707','status':SellerOrderStatus.delivered,
         'items':[('🥚 Large Eggs Grade A (12)',4.29,1),('🍦 Greek Yogurt 32oz',5.49,1),('🌾 Quaker Oats 42oz',5.99,1)],
         'addr':'Uptown, Dallas, TX 75204'},
      ],
    };

    final list = configs[cc] ?? configs['AE']!;
    final currency = _currencyFor(cc);

    return list.asMap().entries.map((entry) {
      final cfg      = entry.value;
      final sfx      = cfg['sfx'] as String;
      final rawItems = cfg['items'] as List<(String, double, int)>;

      final items = rawItems.map((t) => SellerOrderItem(
        id: 'gi_${t.$1.hashCode.abs()}',
        name: t.$1,
        quantity: t.$3,
        price: t.$2,
      )).toList();

      final total = items.fold(0.0, (s, i) => s + i.price * i.quantity);

      return SellerOrder(
        id: 'GRC-$cc$sfx',
        type: SellerOrderType.grocery,
        status: cfg['status'] as SellerOrderStatus,
        customerId: 'gcust_${sfx.hashCode.abs()}',
        customerName: cfg['name'] as String,
        customerPhone: cfg['phone'] as String,
        items: items,
        total: total,
        currency: currency,
        paymentMethod: entry.key.isEven ? 'Credit Card' : 'Digital Wallet',
        isPaid: (cfg['status'] as SellerOrderStatus) != SellerOrderStatus.pending || entry.key.isEven,
        deliveryAddress: cfg['addr'] as String,
        createdAt: DateTime.now().subtract(Duration(minutes: 5 + entry.key * 13)),
        moduleData: const {},
      );
    }).toList();
  }

  // ── Country-Specific Grocery Catalogs ──────────────────────────────────────

  List<GroceryCategory> _mockCatalog(String cc) {
    switch (cc) {
      case 'IN': return _indiaCatalog();
      case 'KE': return _kenyaCatalog();
      case 'GB': return _ukCatalog();
      case 'US': return _usCatalog();
      case 'BH': return _gulfCatalog('BH');
      case 'KW': return _gulfCatalog('KW');
      case 'OM': return _gulfCatalog('OM');
      default:   return _gulfCatalog(cc); // QA, AE, SA
    }
  }

  List<GroceryCategory> _gulfCatalog(String cc) {
    final mul = _priceMultiplier(cc);
    return [
      GroceryCategory(id: 'fruits_veg', name: 'Fruits & Vegetables', emoji: '🥦', products: [
        GroceryProduct(id: 'g01', name: 'Fresh Tomatoes',         emoji: '🍅', category: 'fruits_veg', price: 4.5*mul,  unit: 'kg',     stockQty: 45, minStockQty: 20, isPopular: true),
        GroceryProduct(id: 'g02', name: 'Cucumber',               emoji: '🥒', category: 'fruits_veg', price: 3.0*mul,  unit: 'kg',     stockQty: 30, minStockQty: 15),
        GroceryProduct(id: 'g03', name: 'Mango (Alphonso)',        emoji: '🥭', category: 'fruits_veg', price: 18.0*mul, unit: 'kg',     stockQty: 12, minStockQty: 20, isPopular: true),
        GroceryProduct(id: 'g04', name: 'Spinach',                emoji: '🌿', category: 'fruits_veg', price: 6.0*mul,  unit: 'bundle', stockQty: 8,  minStockQty: 15),
        GroceryProduct(id: 'g05', name: 'Dates (Medjool)',        emoji: '🌴', category: 'fruits_veg', price: 35.0*mul, unit: 'kg',     stockQty: 25, minStockQty: 10, isPopular: true, origin: 'Saudi Arabia'),
        GroceryProduct(id: 'g25', name: 'Avocados (3pk)',         emoji: '🥑', category: 'fruits_veg', price: 8.0*mul,  unit: 'pcs',    stockQty: 18, minStockQty: 8,  isPopular: true),
        GroceryProduct(id: 'g26', name: 'Strawberries punnet',    emoji: '🍓', category: 'fruits_veg', price: 12.0*mul, unit: 'pcs',    stockQty: 10, minStockQty: 8),
      ]),
      GroceryCategory(id: 'dairy', name: 'Dairy & Eggs', emoji: '🥛', products: [
        GroceryProduct(id: 'g06', name: 'Full Cream Milk',         emoji: '🥛', category: 'dairy', price: 6.0*mul,  unit: 'L',    stockQty: 4,  minStockQty: 20),
        GroceryProduct(id: 'g07', name: 'Greek Yoghurt',           emoji: '🍦', category: 'dairy', price: 8.5*mul,  unit: 'pcs',  stockQty: 18, minStockQty: 10),
        GroceryProduct(id: 'g08', name: 'Free Range Eggs',         emoji: '🥚', category: 'dairy', price: 12.0*mul, unit: 'tray', stockQty: 10, minStockQty: 15, isPopular: true),
        GroceryProduct(id: 'g09', name: 'Labneh (250g)',           emoji: '🧀', category: 'dairy', price: 5.0*mul,  unit: 'pcs',  stockQty: 22, minStockQty: 10),
      ]),
      GroceryCategory(id: 'meat', name: 'Meat & Poultry', emoji: '🥩', products: [
        GroceryProduct(id: 'g10', name: 'Chicken Breast',          emoji: '🍗', category: 'meat', price: 28.0*mul, unit: 'kg',  stockQty: 15, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g11', name: 'Lamb Mince',              emoji: '🥩', category: 'meat', price: 45.0*mul, unit: 'kg',  stockQty: 8,  minStockQty: 10),
        GroceryProduct(id: 'g12', name: 'Beef Fillet',             emoji: '🥩', category: 'meat', price: 65.0*mul, unit: 'kg',  stockQty: 6,  minStockQty: 8),
        GroceryProduct(id: 'g13', name: 'Whole Chicken (Halal)',   emoji: '🐔', category: 'meat', price: 22.0*mul, unit: 'pcs', stockQty: 20, minStockQty: 10, origin: 'Brazil'),
      ]),
      GroceryCategory(id: 'bakery', name: 'Bread & Bakery', emoji: '🍞', products: [
        GroceryProduct(id: 'g14', name: 'Arabic Bread (Khubz)',    emoji: '🫓', category: 'bakery', price: 1.5*mul,  unit: 'pcs', stockQty: 60, minStockQty: 30, isPopular: true),
        GroceryProduct(id: 'g15', name: 'Whole Wheat Bread',       emoji: '🍞', category: 'bakery', price: 4.5*mul,  unit: 'pcs', stockQty: 5,  minStockQty: 20),
        GroceryProduct(id: 'g16', name: 'Croissants (6pk)',        emoji: '🥐', category: 'bakery', price: 12.0*mul, unit: 'pcs', stockQty: 12, minStockQty: 8),
      ]),
      GroceryCategory(id: 'pantry', name: 'Pantry & Dry Goods', emoji: '🛒', products: [
        GroceryProduct(id: 'g17', name: 'Basmati Rice 5kg',        emoji: '🍚', category: 'pantry', price: 25.0*mul, unit: 'pcs', stockQty: 30, minStockQty: 15, isPopular: true, origin: 'India'),
        GroceryProduct(id: 'g18', name: 'Chickpeas (1kg)',          emoji: '🫘', category: 'pantry', price: 8.0*mul,  unit: 'pcs', stockQty: 25, minStockQty: 10),
        GroceryProduct(id: 'g19', name: 'Olive Oil (Extra Virgin)', emoji: '🫙', category: 'pantry', price: 35.0*mul, unit: 'pcs', stockQty: 18, minStockQty: 8, origin: 'Spain'),
        GroceryProduct(id: 'g20', name: 'Pasta (500g)',             emoji: '🍝', category: 'pantry', price: 5.0*mul,  unit: 'pcs', stockQty: 40, minStockQty: 20),
      ]),
      GroceryCategory(id: 'beverages', name: 'Beverages', emoji: '🧃', products: [
        GroceryProduct(id: 'g21', name: 'Mineral Water 500ml',     emoji: '💧', category: 'beverages', price: 1.5*mul,  unit: 'pcs', stockQty: 100, minStockQty: 50, isPopular: true),
        GroceryProduct(id: 'g22', name: 'Fresh Orange Juice 1L',   emoji: '🍊', category: 'beverages', price: 9.0*mul,  unit: 'pcs', stockQty: 15, minStockQty: 10),
        GroceryProduct(id: 'g23', name: 'Arabic Qahwa (250g)',      emoji: '☕', category: 'beverages', price: 22.0*mul, unit: 'pcs', stockQty: 20, minStockQty: 8, isPopular: true),
        GroceryProduct(id: 'g24', name: 'Fresh Lemon Juice 1L',    emoji: '🍋', category: 'beverages', price: 7.0*mul,  unit: 'pcs', stockQty: 8,  minStockQty: 12),
      ]),
    ];
  }

  List<GroceryCategory> _indiaCatalog() {
    return [
      const GroceryCategory(id: 'fruits_veg', name: 'Sabzi & Fruits', emoji: '🥦', products: [
        GroceryProduct(id: 'g01', name: 'Onions',               emoji: '🧅', category: 'fruits_veg', price: 30,  unit: 'kg',     stockQty: 50, minStockQty: 20, isPopular: true),
        GroceryProduct(id: 'g02', name: 'Tomatoes',             emoji: '🍅', category: 'fruits_veg', price: 45,  unit: 'kg',     stockQty: 40, minStockQty: 20, isPopular: true),
        GroceryProduct(id: 'g03', name: 'Potatoes',             emoji: '🥔', category: 'fruits_veg', price: 25,  unit: 'kg',     stockQty: 60, minStockQty: 25),
        GroceryProduct(id: 'g04', name: 'Alphonso Mangoes',     emoji: '🥭', category: 'fruits_veg', price: 280, unit: 'dozen',  stockQty: 8,  minStockQty: 12, isPopular: true),
        GroceryProduct(id: 'g05', name: 'Spinach (Palak)',      emoji: '🌿', category: 'fruits_veg', price: 20,  unit: 'bundle', stockQty: 15, minStockQty: 20),
        GroceryProduct(id: 'g20', name: 'Bhindi (Okra) 500g',  emoji: '🌱', category: 'fruits_veg', price: 40,  unit: 'pcs',    stockQty: 20, minStockQty: 10),
        GroceryProduct(id: 'g21', name: 'Green Chillies 100g', emoji: '🌶️', category: 'fruits_veg', price: 15,  unit: 'pcs',    stockQty: 30, minStockQty: 15),
      ]),
      const GroceryCategory(id: 'dairy', name: 'Dairy & Paneer', emoji: '🥛', products: [
        GroceryProduct(id: 'g06', name: 'Amul Full Cream Milk', emoji: '🥛', category: 'dairy', price: 56,  unit: 'L',    stockQty: 30, minStockQty: 20, isPopular: true),
        GroceryProduct(id: 'g07', name: 'Paneer (250g)',         emoji: '🧀', category: 'dairy', price: 90,  unit: 'pcs',  stockQty: 15, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g08', name: 'Dahi (Curd) 500g',     emoji: '🍦', category: 'dairy', price: 40,  unit: 'pcs',  stockQty: 25, minStockQty: 15),
        GroceryProduct(id: 'g09', name: 'Eggs (30pc)',           emoji: '🥚', category: 'dairy', price: 180, unit: 'tray', stockQty: 10, minStockQty: 8),
        GroceryProduct(id: 'g22', name: 'Amul Butter 100g',     emoji: '🧈', category: 'dairy', price: 60,  unit: 'pcs',  stockQty: 20, minStockQty: 10, isPopular: true),
      ]),
      const GroceryCategory(id: 'staples', name: 'Dal & Staples', emoji: '🍚', products: [
        GroceryProduct(id: 'g10', name: 'Basmati Rice 5kg',      emoji: '🍚', category: 'staples', price: 380, unit: 'pcs', stockQty: 25, minStockQty: 10, isPopular: true, origin: 'Punjab'),
        GroceryProduct(id: 'g11', name: 'Toor Dal 1kg',          emoji: '🫘', category: 'staples', price: 130, unit: 'pcs', stockQty: 30, minStockQty: 15),
        GroceryProduct(id: 'g12', name: 'Chana Dal 1kg',         emoji: '🫘', category: 'staples', price: 120, unit: 'pcs', stockQty: 28, minStockQty: 15),
        GroceryProduct(id: 'g13', name: 'Atta (Wheat Flour) 10kg',emoji: '🌾', category: 'staples', price: 350, unit: 'pcs', stockQty: 20, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g23', name: 'Moong Dal 500g',        emoji: '🫘', category: 'staples', price: 80,  unit: 'pcs', stockQty: 22, minStockQty: 10),
      ]),
      const GroceryCategory(id: 'spices', name: 'Masala & Spices', emoji: '🌶️', products: [
        GroceryProduct(id: 'g14', name: 'MDH Garam Masala',      emoji: '🌶️', category: 'spices', price: 85,  unit: 'pcs', stockQty: 20, minStockQty: 8,  isPopular: true),
        GroceryProduct(id: 'g15', name: 'Turmeric Powder 200g',  emoji: '🟡', category: 'spices', price: 40,  unit: 'pcs', stockQty: 25, minStockQty: 10),
        GroceryProduct(id: 'g16', name: 'Red Chilli Powder',     emoji: '🌶️', category: 'spices', price: 55,  unit: 'pcs', stockQty: 18, minStockQty: 8),
        GroceryProduct(id: 'g24', name: 'Everest Rajma Masala',  emoji: '🌶️', category: 'spices', price: 65,  unit: 'pcs', stockQty: 15, minStockQty: 8),
      ]),
      const GroceryCategory(id: 'snacks', name: 'Snacks & Beverages', emoji: '🧃', products: [
        GroceryProduct(id: 'g17', name: 'Parle-G Biscuits',      emoji: '🍪', category: 'snacks', price: 10,  unit: 'pcs', stockQty: 80, minStockQty: 30, isPopular: true),
        GroceryProduct(id: 'g18', name: 'Maggi Noodles (12pk)',   emoji: '🍜', category: 'snacks', price: 144, unit: 'pcs', stockQty: 25, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g19', name: 'Chaas (Buttermilk) 1L', emoji: '🥤', category: 'snacks', price: 45,  unit: 'pcs', stockQty: 12, minStockQty: 10),
        GroceryProduct(id: 'g25', name: 'Britannia Marie Gold',  emoji: '🍪', category: 'snacks', price: 25,  unit: 'pcs', stockQty: 45, minStockQty: 15),
      ]),
    ];
  }

  List<GroceryCategory> _kenyaCatalog() {
    return [
      const GroceryCategory(id: 'fresh', name: 'Fresh Produce', emoji: '🥦', products: [
        GroceryProduct(id: 'g01', name: 'Sukuma Wiki',             emoji: '🥬', category: 'fresh', price: 20,   unit: 'bundle', stockQty: 40, minStockQty: 15, isPopular: true),
        GroceryProduct(id: 'g02', name: 'Tomatoes',                emoji: '🍅', category: 'fresh', price: 80,   unit: 'kg',     stockQty: 30, minStockQty: 15, isPopular: true),
        GroceryProduct(id: 'g03', name: 'Avocados (3pk)',           emoji: '🥑', category: 'fresh', price: 150,  unit: 'pcs',    stockQty: 25, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g04', name: 'Sweet Bananas',            emoji: '🍌', category: 'fresh', price: 60,   unit: 'bunch',  stockQty: 15, minStockQty: 12),
        GroceryProduct(id: 'g05', name: 'Passion Fruits (6pk)',     emoji: '🟣', category: 'fresh', price: 100,  unit: 'pcs',    stockQty: 8,  minStockQty: 12),
        GroceryProduct(id: 'g16', name: 'Kale (Mnavu) bundle',      emoji: '🥬', category: 'fresh', price: 25,   unit: 'bundle', stockQty: 20, minStockQty: 10),
        GroceryProduct(id: 'g17', name: 'Mandarins 1kg',            emoji: '🍊', category: 'fresh', price: 120,  unit: 'kg',     stockQty: 12, minStockQty: 8),
      ]),
      const GroceryCategory(id: 'staples', name: 'Unga & Staples', emoji: '🌽', products: [
        GroceryProduct(id: 'g06', name: 'Unga wa Ugali 2kg',       emoji: '🌽', category: 'staples', price: 120, unit: 'pcs', stockQty: 50, minStockQty: 20, isPopular: true),
        GroceryProduct(id: 'g07', name: 'Rice 5kg (Pishori)',       emoji: '🍚', category: 'staples', price: 650, unit: 'pcs', stockQty: 20, minStockQty: 10, isPopular: true, origin: 'Mwea'),
        GroceryProduct(id: 'g08', name: 'Lentils (Dengu) 1kg',      emoji: '🫘', category: 'staples', price: 130, unit: 'pcs', stockQty: 25, minStockQty: 10),
        GroceryProduct(id: 'g09', name: 'Beans (Nyayo) 1kg',        emoji: '🫘', category: 'staples', price: 140, unit: 'pcs', stockQty: 30, minStockQty: 12),
        GroceryProduct(id: 'g18', name: 'Sembe (Maize Flour) 2kg',  emoji: '🌾', category: 'staples', price: 90,  unit: 'pcs', stockQty: 35, minStockQty: 15),
      ]),
      const GroceryCategory(id: 'dairy', name: 'Dairy & Protein', emoji: '🥛', products: [
        GroceryProduct(id: 'g10', name: 'Brookside Milk 1L',        emoji: '🥛', category: 'dairy', price: 65,  unit: 'pcs', stockQty: 3,  minStockQty: 20),
        GroceryProduct(id: 'g11', name: 'Eggs (Tray 30)',            emoji: '🥚', category: 'dairy', price: 420, unit: 'tray', stockQty: 10, minStockQty: 8,  isPopular: true),
        GroceryProduct(id: 'g12', name: 'Chicken Legs (1kg)',        emoji: '🍗', category: 'dairy', price: 350, unit: 'kg',  stockQty: 15, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g19', name: 'Mala (Sour Milk) 500ml',   emoji: '🥛', category: 'dairy', price: 55,  unit: 'pcs', stockQty: 20, minStockQty: 12),
      ]),
      const GroceryCategory(id: 'beverages', name: 'Drinks', emoji: '🧃', products: [
        GroceryProduct(id: 'g13', name: 'Dawa Plus Juice 1L',       emoji: '🍹', category: 'beverages', price: 130, unit: 'pcs', stockQty: 20, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g14', name: 'Milo 200g',                emoji: '🥤', category: 'beverages', price: 180, unit: 'pcs', stockQty: 15, minStockQty: 8),
        GroceryProduct(id: 'g15', name: 'Tusker Soda (6pk)',         emoji: '🥤', category: 'beverages', price: 280, unit: 'pcs', stockQty: 18, minStockQty: 10),
        GroceryProduct(id: 'g20', name: 'Fresh Passion Juice 1L',   emoji: '🍹', category: 'beverages', price: 150, unit: 'pcs', stockQty: 12, minStockQty: 8),
      ]),
    ];
  }

  List<GroceryCategory> _ukCatalog() {
    return [
      const GroceryCategory(id: 'fresh', name: 'Fresh Produce', emoji: '🥦', products: [
        GroceryProduct(id: 'g01', name: 'Baby Spinach 200g',       emoji: '🌿', category: 'fresh', price: 1.50, unit: 'pcs',    stockQty: 30, minStockQty: 15, isPopular: true),
        GroceryProduct(id: 'g02', name: 'British Strawberries',    emoji: '🍓', category: 'fresh', price: 2.50, unit: 'punnet', stockQty: 15, minStockQty: 8,  isPopular: true, origin: 'UK'),
        GroceryProduct(id: 'g03', name: 'Mixed Salad Leaves',      emoji: '🥗', category: 'fresh', price: 1.80, unit: 'pcs',    stockQty: 25, minStockQty: 12),
        GroceryProduct(id: 'g04', name: 'Avocados',                emoji: '🥑', category: 'fresh', price: 1.20, unit: 'pcs',    stockQty: 20, minStockQty: 10),
        GroceryProduct(id: 'g13', name: 'British Asparagus 250g',  emoji: '🌱', category: 'fresh', price: 2.00, unit: 'pcs',    stockQty: 10, minStockQty: 8,  origin: 'UK'),
        GroceryProduct(id: 'g14', name: 'Blueberries 150g',        emoji: '🫐', category: 'fresh', price: 2.20, unit: 'pcs',    stockQty: 18, minStockQty: 10, isPopular: true),
      ]),
      const GroceryCategory(id: 'dairy', name: 'Dairy & Eggs', emoji: '🥛', products: [
        GroceryProduct(id: 'g05', name: 'Organic Whole Milk 2pt',  emoji: '🥛', category: 'dairy', price: 1.25, unit: 'pcs', stockQty: 5,  minStockQty: 20),
        GroceryProduct(id: 'g06', name: 'Cheddar Cheese 400g',     emoji: '🧀', category: 'dairy', price: 3.50, unit: 'pcs', stockQty: 18, minStockQty: 10, isPopular: true, origin: 'Somerset'),
        GroceryProduct(id: 'g07', name: 'British Free Range Eggs 6',emoji: '🥚', category: 'dairy', price: 2.40, unit: 'pcs', stockQty: 25, minStockQty: 12, isPopular: true, origin: 'UK'),
        GroceryProduct(id: 'g15', name: 'Clotted Cream 150g',      emoji: '🍦', category: 'dairy', price: 1.80, unit: 'pcs', stockQty: 12, minStockQty: 8,  origin: 'Devon'),
        GroceryProduct(id: 'g16', name: 'Greek Yogurt 500g',       emoji: '🍦', category: 'dairy', price: 2.50, unit: 'pcs', stockQty: 20, minStockQty: 10),
      ]),
      const GroceryCategory(id: 'bakery', name: 'Bakery', emoji: '🍞', products: [
        GroceryProduct(id: 'g08', name: 'Hovis Wholemeal Loaf',    emoji: '🍞', category: 'bakery', price: 1.70, unit: 'pcs', stockQty: 8,  minStockQty: 20),
        GroceryProduct(id: 'g09', name: 'Croissants 4pk',          emoji: '🥐', category: 'bakery', price: 2.00, unit: 'pcs', stockQty: 12, minStockQty: 8,  isPopular: true),
        GroceryProduct(id: 'g17', name: 'Warburtons Crumpets 6pk', emoji: '🫓', category: 'bakery', price: 1.30, unit: 'pcs', stockQty: 15, minStockQty: 10, isPopular: true, origin: 'UK'),
        GroceryProduct(id: 'g18', name: 'Sourdough Loaf',          emoji: '🍞', category: 'bakery', price: 2.50, unit: 'pcs', stockQty: 6,  minStockQty: 10),
      ]),
      const GroceryCategory(id: 'pantry', name: 'Pantry', emoji: '🛒', products: [
        GroceryProduct(id: 'g10', name: 'PG Tips 80 Teabags',      emoji: '🍵', category: 'pantry', price: 2.50, unit: 'pcs', stockQty: 30, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g11', name: 'Heinz Baked Beans 415g',  emoji: '🫘', category: 'pantry', price: 1.20, unit: 'pcs', stockQty: 40, minStockQty: 15, isPopular: true),
        GroceryProduct(id: 'g12', name: 'Marmite 250g',            emoji: '🫙', category: 'pantry', price: 3.30, unit: 'pcs', stockQty: 20, minStockQty: 8,  origin: 'UK'),
        GroceryProduct(id: 'g19', name: 'Branston Pickle 520g',    emoji: '🫙', category: 'pantry', price: 2.20, unit: 'pcs', stockQty: 15, minStockQty: 8),
        GroceryProduct(id: 'g20', name: 'Tetley Decaf Teabags 80', emoji: '🍵', category: 'pantry', price: 2.10, unit: 'pcs', stockQty: 22, minStockQty: 10),
      ]),
    ];
  }

  List<GroceryCategory> _usCatalog() {
    return [
      const GroceryCategory(id: 'fresh', name: 'Fresh Produce', emoji: '🥦', products: [
        GroceryProduct(id: 'g01', name: 'Organic Broccoli',        emoji: '🥦', category: 'fresh', price: 2.99, unit: 'lb',  stockQty: 20, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g02', name: 'Baby Carrots 1lb',        emoji: '🥕', category: 'fresh', price: 1.99, unit: 'bag', stockQty: 30, minStockQty: 15),
        GroceryProduct(id: 'g03', name: 'Hass Avocados',           emoji: '🥑', category: 'fresh', price: 1.50, unit: 'pcs', stockQty: 25, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g04', name: 'Blueberries 6oz',         emoji: '🫐', category: 'fresh', price: 3.99, unit: 'pcs', stockQty: 12, minStockQty: 8,  isPopular: true),
        GroceryProduct(id: 'g13', name: 'Romaine Lettuce 3-heart', emoji: '🥗', category: 'fresh', price: 3.49, unit: 'pcs', stockQty: 15, minStockQty: 8),
        GroceryProduct(id: 'g14', name: 'Baby Spinach 5oz',        emoji: '🌿', category: 'fresh', price: 3.49, unit: 'pcs', stockQty: 20, minStockQty: 10, isPopular: true),
      ]),
      const GroceryCategory(id: 'dairy', name: 'Dairy & Eggs', emoji: '🥛', products: [
        GroceryProduct(id: 'g05', name: 'Organic Valley Whole Milk',emoji: '🥛', category: 'dairy', price: 4.99, unit: 'gal',   stockQty: 8,  minStockQty: 15),
        GroceryProduct(id: 'g06', name: 'Greek Yogurt 32oz',        emoji: '🍦', category: 'dairy', price: 5.49, unit: 'pcs',   stockQty: 15, minStockQty: 8,  isPopular: true),
        GroceryProduct(id: 'g07', name: 'Large Eggs Grade A (12)',  emoji: '🥚', category: 'dairy', price: 4.29, unit: 'dozen', stockQty: 20, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g15', name: 'Tillamook Sharp Cheddar',  emoji: '🧀', category: 'dairy', price: 6.99, unit: 'pcs',   stockQty: 12, minStockQty: 6,  origin: 'Oregon'),
        GroceryProduct(id: 'g16', name: 'Land O\'Lakes Butter 1lb', emoji: '🧈', category: 'dairy', price: 5.29, unit: 'pcs',   stockQty: 18, minStockQty: 8),
      ]),
      const GroceryCategory(id: 'pantry', name: 'Pantry', emoji: '🛒', products: [
        GroceryProduct(id: 'g08', name: 'Skippy Peanut Butter 16oz',emoji: '🥜', category: 'pantry', price: 3.99, unit: 'pcs', stockQty: 25, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g09', name: 'Campbells Tomato Soup',    emoji: '🍲', category: 'pantry', price: 1.89, unit: 'pcs', stockQty: 35, minStockQty: 15),
        GroceryProduct(id: 'g10', name: 'Quaker Oats 42oz',         emoji: '🌾', category: 'pantry', price: 5.99, unit: 'pcs', stockQty: 18, minStockQty: 8),
        GroceryProduct(id: 'g17', name: 'Heinz Ketchup 32oz',       emoji: '🍅', category: 'pantry', price: 4.49, unit: 'pcs', stockQty: 30, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g18', name: 'Kraft Macaroni & Cheese',  emoji: '🧀', category: 'pantry', price: 1.99, unit: 'pcs', stockQty: 40, minStockQty: 15),
      ]),
      const GroceryCategory(id: 'beverages', name: 'Beverages', emoji: '🧃', products: [
        GroceryProduct(id: 'g11', name: 'Tropicana OJ 52oz',        emoji: '🍊', category: 'beverages', price: 4.99, unit: 'pcs', stockQty: 12, minStockQty: 10, isPopular: true),
        GroceryProduct(id: 'g12', name: 'LaCroix Sparkling 12pk',   emoji: '💧', category: 'beverages', price: 5.99, unit: 'pcs', stockQty: 20, minStockQty: 8),
        GroceryProduct(id: 'g19', name: 'Vita Coco Coconut Water',  emoji: '🥥', category: 'beverages', price: 3.49, unit: 'pcs', stockQty: 15, minStockQty: 8),
        GroceryProduct(id: 'g20', name: 'Honest Tea Green Tea',     emoji: '🍵', category: 'beverages', price: 1.99, unit: 'pcs', stockQty: 24, minStockQty: 12),
      ]),
      const GroceryCategory(id: 'frozen', name: 'Frozen & Deli', emoji: '🧊', products: [
        GroceryProduct(id: 'g21', name: 'Birds Eye Peas 1lb',       emoji: '🟢', category: 'frozen', price: 2.49, unit: 'pcs', stockQty: 20, minStockQty: 8),
        GroceryProduct(id: 'g22', name: 'Amy\'s Burrito Bowl',      emoji: '🌯', category: 'frozen', price: 4.99, unit: 'pcs', stockQty: 14, minStockQty: 6, isPopular: true),
        GroceryProduct(id: 'g23', name: 'Sabra Classic Hummus 10oz',emoji: '🫙', category: 'frozen', price: 4.29, unit: 'pcs', stockQty: 18, minStockQty: 8),
      ]),
    ];
  }

  double _priceMultiplier(String cc) {
    switch (cc) {
      case 'AE': return 1.0;
      case 'SA': return 1.0;
      case 'BH': return 0.37;
      case 'KW': return 0.30;
      case 'OM': return 0.38;
      default:   return 1.0; // QA default
    }
  }

  String _currencyFor(String cc) {
    const map = {'QA': 'QAR', 'IN': '₹', 'AE': 'AED', 'SA': 'SAR',
                 'KE': 'KSh', 'BH': 'BHD', 'KW': 'KWD', 'OM': 'OMR', 'GB': '£', 'US': '\$'};
    return map[cc] ?? 'QAR';
  }
}
