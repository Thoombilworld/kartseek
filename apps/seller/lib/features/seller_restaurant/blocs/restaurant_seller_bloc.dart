import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_event.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/services/seller_api_service.dart';
import 'package:kartseek_seller/features/shared/services/seller_order_socket_service.dart';

class RestaurantSellerBloc
    extends Bloc<RestaurantSellerEvent, RestaurantSellerState> {
  final SellerApiService _api;
  final SellerOrderSocketService _socket;

  RestaurantSellerBloc(
      {SellerApiService? api, SellerOrderSocketService? socket})
      : _api = api ?? SellerApiService.instance,
        _socket = socket ?? SellerOrderSocketService(),
        super(const RestaurantSellerState()) {
    on<LoadRestaurantDashboard>(_onLoadDashboard);
    on<ToggleRestaurantOpen>(_onToggleOpen);
    on<LoadRestaurantOrders>(_onLoadOrders);
    on<SelectRestaurantOrderTab>(_onSelectTab);
    on<AcceptRestaurantOrder>(_onAccept);
    on<MarkRestaurantOrderPreparing>(_onPreparing);
    on<MarkRestaurantOrderReady>(_onReady);
    on<RejectRestaurantOrder>(_onReject);
    on<SetRestaurantOrderEta>(_onSetEta);
    on<RestaurantNewOrderPushed>(_onNewOrderPush);
    on<LoadRestaurantTables>(_onLoadTables);
    on<ToggleTableStatus>(_onToggleTable);
    on<AssignTableToOrder>(_onAssignTable);
    on<ClearRestaurantTable>(_onClearTable);
    on<LoadRestaurantMenu>(_onLoadMenu);
    on<ToggleMenuItemAvailability>(_onToggleMenu);
    on<UpdateMenuItemPrice>(_onUpdatePrice);
    on<AddMenuItem>(_onAddMenuItem);
    on<ToggleMenuCategoryAvailability>(_onToggleCategoryAvail);
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  Future<void> _onLoadDashboard(
    LoadRestaurantDashboard event,
    Emitter<RestaurantSellerState> emit,
  ) async {
    emit(state.copyWith(status: RestaurantBlocStatus.loading));
    try {
      final data = await _api.getDashboard();
      emit(state.copyWith(
          status: RestaurantBlocStatus.loaded, dashboardData: data));
    } catch (_) {
      emit(state.copyWith(
        status: RestaurantBlocStatus.loaded,
        dashboardData: _mockDashboard(event.countryCode),
      ));
    }
    add(LoadRestaurantOrders(countryCode: event.countryCode));
    add(LoadRestaurantTables(countryCode: event.countryCode));
    add(LoadRestaurantMenu(countryCode: event.countryCode));
  }

  void _onToggleOpen(
      ToggleRestaurantOpen event, Emitter<RestaurantSellerState> emit) {
    emit(state.copyWith(
      isOpen: event.isOpen,
      actionMessage: event.isOpen
          ? 'Restaurant is now Open 🟢'
          : 'Restaurant is now Closed 🔴',
    ));
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  Future<void> _onLoadOrders(
    LoadRestaurantOrders event,
    Emitter<RestaurantSellerState> emit,
  ) async {
    emit(state.copyWith(
        status: RestaurantBlocStatus.loading, selectedOrderTab: event.tab));
    try {
      final all = await _api.getOrders();
      final dineIn =
          all.where((o) => o.moduleData['order_mode'] == 'dine_in').toList();
      final takeaway =
          all.where((o) => o.moduleData['order_mode'] == 'takeaway').toList();
      final delivery =
          all.where((o) => o.moduleData['order_mode'] == 'delivery').toList();
      emit(state.copyWith(
        status: RestaurantBlocStatus.loaded,
        dineInOrders: dineIn,
        takeawayOrders: takeaway,
        deliveryOrders: delivery,
      ));
    } catch (_) {
      final cc = event.countryCode;
      emit(state.copyWith(
        status: RestaurantBlocStatus.loaded,
        dineInOrders: _mockDineInOrders(cc),
        takeawayOrders: _mockTakeawayOrders(cc),
        deliveryOrders: _mockDeliveryOrders(cc),
      ));
    }
  }

  void _onSelectTab(
      SelectRestaurantOrderTab event, Emitter<RestaurantSellerState> emit) {
    emit(state.copyWith(selectedOrderTab: event.tab));
  }

  Future<void> _onAccept(
      AcceptRestaurantOrder event, Emitter<RestaurantSellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.confirmed,
        estimatedMinutes: event.estimatedMinutes);
    await _api.updateOrderStatus(event.orderId, 'CONFIRMED');
    _updateOrderInState(event.orderId, SellerOrderStatus.confirmed, emit);
    emit(state.copyWith(
      actionMessage: 'Order accepted — ~${event.estimatedMinutes} min prep ✅',
      actionSuccess: true,
    ));
  }

  Future<void> _onPreparing(MarkRestaurantOrderPreparing event,
      Emitter<RestaurantSellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.preparing);
    await _api.updateOrderStatus(event.orderId, 'PREPARING');
    _updateOrderInState(event.orderId, SellerOrderStatus.preparing, emit);
    emit(state.copyWith(
      actionMessage: 'Kitchen is preparing the order 🍳',
      actionSuccess: true,
    ));
  }

  Future<void> _onReady(MarkRestaurantOrderReady event,
      Emitter<RestaurantSellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.ready);
    final order = state.allOrders.firstWhere(
      (o) => o.id == event.orderId,
      orElse: () => SellerOrder.mock(SellerOrderType.restaurant),
    );
    if (order.moduleData['order_mode'] == 'delivery') {
      _socket.dispatchDelivery(
        orderId: event.orderId,
        pickupLat: event.pickupLat,
        pickupLng: event.pickupLng,
        pickupAddress: event.pickupAddress,
      );
    }
    await _api.updateOrderStatus(event.orderId, 'READY');
    _updateOrderInState(event.orderId, SellerOrderStatus.ready, emit);
    final isDelivery = order.moduleData['order_mode'] == 'delivery';
    emit(state.copyWith(
      actionMessage: isDelivery
          ? 'Order ready — delivery partner dispatched 🚚'
          : 'Order ready for pickup 📦',
      actionSuccess: true,
    ));
  }

  Future<void> _onReject(
      RejectRestaurantOrder event, Emitter<RestaurantSellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.cancelled,
        message: event.reason);
    await _api.updateOrderStatus(event.orderId, 'CANCELLED');
    List<SellerOrder> filterOut(List<SellerOrder> list) =>
        list.where((o) => o.id != event.orderId).toList();
    emit(state.copyWith(
      dineInOrders: filterOut(state.dineInOrders),
      takeawayOrders: filterOut(state.takeawayOrders),
      deliveryOrders: filterOut(state.deliveryOrders),
      actionMessage: 'Order rejected ❌',
      actionSuccess: false,
    ));
  }

  void _onSetEta(
      SetRestaurantOrderEta event, Emitter<RestaurantSellerState> emit) {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.confirmed,
        estimatedMinutes: event.eta);
    emit(state.copyWith(
      actionMessage: 'ETA updated to ${event.eta} min ⏱️',
      actionSuccess: true,
    ));
  }

  void _onNewOrderPush(
      RestaurantNewOrderPushed event, Emitter<RestaurantSellerState> emit) {
    final mode = event.order.moduleData['order_mode'] ?? 'takeaway';
    if (mode == 'dine_in') {
      emit(state.copyWith(dineInOrders: [event.order, ...state.dineInOrders]));
    } else if (mode == 'delivery') {
      emit(state
          .copyWith(deliveryOrders: [event.order, ...state.deliveryOrders]));
    } else {
      emit(state
          .copyWith(takeawayOrders: [event.order, ...state.takeawayOrders]));
    }
  }

  void _updateOrderInState(String orderId, SellerOrderStatus status,
      Emitter<RestaurantSellerState> emit) {
    List<SellerOrder> update(List<SellerOrder> list) => list
        .map((o) => o.id == orderId ? o.copyWith(status: status) : o)
        .toList();
    emit(state.copyWith(
      dineInOrders: update(state.dineInOrders),
      takeawayOrders: update(state.takeawayOrders),
      deliveryOrders: update(state.deliveryOrders),
    ));
  }

  // ── Tables ─────────────────────────────────────────────────────────────────

  Future<void> _onLoadTables(
      LoadRestaurantTables event, Emitter<RestaurantSellerState> emit) async {
    final tables = _mockTables(event.countryCode);
    emit(state.copyWith(tables: tables));
  }

  void _onToggleTable(
      ToggleTableStatus event, Emitter<RestaurantSellerState> emit) {
    final status = _tableStatusFromString(event.status);
    final updated = state.tables
        .map((t) => t.id == event.tableId ? t.copyWith(status: status) : t)
        .toList();
    emit(state.copyWith(
        tables: updated,
        actionMessage: 'Table ${event.tableId} → ${event.status}',
        actionSuccess: true));
  }

  void _onAssignTable(
      AssignTableToOrder event, Emitter<RestaurantSellerState> emit) {
    final updated = state.tables.map((t) {
      if (t.id == event.tableId) {
        return t.copyWith(
          status: TableStatus.occupied,
          currentOrderId: event.orderId,
          guestName: event.guestName,
          guestCount: event.guestCount,
        );
      }
      return t;
    }).toList();
    emit(state.copyWith(
      tables: updated,
      actionMessage: 'Table ${event.tableId} assigned to ${event.guestName} ✅',
      actionSuccess: true,
    ));
  }

  void _onClearTable(
      ClearRestaurantTable event, Emitter<RestaurantSellerState> emit) {
    final updated = state.tables.map((t) {
      if (t.id == event.tableId) {
        return RestaurantTable(
          id: t.id,
          number: t.number,
          seats: t.seats,
          status: TableStatus.cleaning,
        );
      }
      return t;
    }).toList();
    emit(state.copyWith(
      tables: updated,
      actionMessage: 'Table ${event.tableId} cleared — now cleaning 🧹',
      actionSuccess: true,
    ));
  }

  TableStatus _tableStatusFromString(String s) {
    switch (s) {
      case 'occupied':
        return TableStatus.occupied;
      case 'reserved':
        return TableStatus.reserved;
      case 'cleaning':
        return TableStatus.cleaning;
      default:
        return TableStatus.available;
    }
  }

  // ── Menu ───────────────────────────────────────────────────────────────────

  Future<void> _onLoadMenu(
      LoadRestaurantMenu event, Emitter<RestaurantSellerState> emit) async {
    final categories = _mockMenuCategories(event.countryCode);
    final allItems = categories.expand((c) => c.items).toList();
    emit(state.copyWith(menuCategories: categories, menuItems: allItems));
  }

  void _onToggleMenu(
      ToggleMenuItemAvailability event, Emitter<RestaurantSellerState> emit) {
    final updatedItems = state.menuItems
        .map((i) => i.id == event.itemId
            ? i.copyWith(isAvailable: event.isAvailable)
            : i)
        .toList();
    final updatedCats = state.menuCategories.map((cat) {
      final items = cat.items
          .map((i) => i.id == event.itemId
              ? i.copyWith(isAvailable: event.isAvailable)
              : i)
          .toList();
      return MenuCategory(
          id: cat.id, name: cat.name, emoji: cat.emoji, items: items);
    }).toList();
    emit(state.copyWith(menuItems: updatedItems, menuCategories: updatedCats));
    _api.updateProduct(event.itemId, {'available': event.isAvailable});
  }

  void _onUpdatePrice(
      UpdateMenuItemPrice event, Emitter<RestaurantSellerState> emit) {
    final updatedItems = state.menuItems
        .map(
            (i) => i.id == event.itemId ? i.copyWith(price: event.newPrice) : i)
        .toList();
    final updatedCats = state.menuCategories.map((cat) {
      final items = cat.items
          .map((i) =>
              i.id == event.itemId ? i.copyWith(price: event.newPrice) : i)
          .toList();
      return MenuCategory(
          id: cat.id, name: cat.name, emoji: cat.emoji, items: items);
    }).toList();
    emit(state.copyWith(
      menuItems: updatedItems,
      menuCategories: updatedCats,
      actionMessage: 'Price updated ✅',
      actionSuccess: true,
    ));
  }

  void _onAddMenuItem(AddMenuItem event, Emitter<RestaurantSellerState> emit) {
    final newItem = MenuItem(
      id: 'menu_new_${DateTime.now().millisecondsSinceEpoch}',
      name: event.name,
      description: event.description,
      price: event.price,
      emoji: event.emoji,
      category: event.categoryId,
      prepTimeMinutes: event.prepTimeMinutes,
    );
    final updatedItems = [...state.menuItems, newItem];
    final updatedCats = state.menuCategories.map((cat) {
      if (cat.id == event.categoryId) {
        return MenuCategory(
            id: cat.id,
            name: cat.name,
            emoji: cat.emoji,
            items: [...cat.items, newItem]);
      }
      return cat;
    }).toList();
    emit(state.copyWith(
      menuItems: updatedItems,
      menuCategories: updatedCats,
      actionMessage: '${event.emoji} ${event.name} added to menu ✅',
      actionSuccess: true,
    ));
  }

  void _onToggleCategoryAvail(ToggleMenuCategoryAvailability event,
      Emitter<RestaurantSellerState> emit) {
    final updatedCats = state.menuCategories.map((cat) {
      if (cat.id == event.categoryId) {
        final items = cat.items
            .map((i) => i.copyWith(isAvailable: event.isAvailable))
            .toList();
        return MenuCategory(
            id: cat.id, name: cat.name, emoji: cat.emoji, items: items);
      }
      return cat;
    }).toList();
    final updatedItems = state.menuItems.map((i) {
      final inCat =
          updatedCats.expand((c) => c.items).any((ci) => ci.id == i.id);
      if (inCat) {
        final matchedCat = updatedCats.firstWhere(
          (c) => c.items.any((ci) => ci.id == i.id),
          orElse: () => updatedCats.first,
        );
        if (matchedCat.id == event.categoryId) {
          return i.copyWith(isAvailable: event.isAvailable);
        }
      }
      return i;
    }).toList();
    emit(state.copyWith(
      menuCategories: updatedCats,
      menuItems: updatedItems,
      actionMessage: event.isAvailable
          ? 'Category restored ✅'
          : 'Category marked 86\'d — all items unavailable ⛔',
      actionSuccess: event.isAvailable,
    ));
  }

  // ── Country-Specific Mock Data ──────────────────────────────────────────────

  Map<String, dynamic> _mockDashboard(String cc) {
    final data = <String, Map<String, dynamic>>{
      'QA': {
        'orders_today': 87,
        'revenue': 12400,
        'currency': 'QAR',
        'tables_occupied': 8,
        'avg_prep': 22,
        'rating': 4.8,
        'reviews': 312,
        'weekly': [8200.0, 9100.0, 11400.0, 12400.0, 14200.0, 16800.0, 12400.0]
      },
      'IN': {
        'orders_today': 143,
        'revenue': 48200,
        'currency': 'INR',
        'tables_occupied': 12,
        'avg_prep': 18,
        'rating': 4.6,
        'reviews': 891,
        'weekly': [
          31000.0,
          38000.0,
          42000.0,
          48200.0,
          51000.0,
          58000.0,
          48200.0
        ]
      },
      'AE': {
        'orders_today': 65,
        'revenue': 9800,
        'currency': 'AED',
        'tables_occupied': 6,
        'avg_prep': 25,
        'rating': 4.9,
        'reviews': 204,
        'weekly': [7200.0, 7800.0, 8900.0, 9800.0, 11200.0, 13100.0, 9800.0]
      },
      'SA': {
        'orders_today': 72,
        'revenue': 11200,
        'currency': 'SAR',
        'tables_occupied': 9,
        'avg_prep': 20,
        'rating': 4.7,
        'reviews': 178,
        'weekly': [8100.0, 9200.0, 10800.0, 11200.0, 12600.0, 14100.0, 11200.0]
      },
      'KE': {
        'orders_today': 94,
        'revenue': 235000,
        'currency': 'KES',
        'tables_occupied': 7,
        'avg_prep': 15,
        'rating': 4.5,
        'reviews': 430,
        'weekly': [
          180000.0,
          195000.0,
          210000.0,
          235000.0,
          248000.0,
          262000.0,
          235000.0
        ]
      },
      'BH': {
        'orders_today': 54,
        'revenue': 4100,
        'currency': 'BHD',
        'tables_occupied': 5,
        'avg_prep': 23,
        'rating': 4.6,
        'reviews': 142,
        'weekly': [3200.0, 3600.0, 3900.0, 4100.0, 4700.0, 5200.0, 4100.0]
      },
      'KW': {
        'orders_today': 61,
        'revenue': 5800,
        'currency': 'KWD',
        'tables_occupied': 7,
        'avg_prep': 21,
        'rating': 4.7,
        'reviews': 165,
        'weekly': [4100.0, 4600.0, 5200.0, 5800.0, 6400.0, 7100.0, 5800.0]
      },
      'OM': {
        'orders_today': 48,
        'revenue': 4600,
        'currency': 'OMR',
        'tables_occupied': 4,
        'avg_prep': 24,
        'rating': 4.5,
        'reviews': 120,
        'weekly': [3600.0, 3900.0, 4200.0, 4600.0, 5100.0, 5700.0, 4600.0]
      },
      'GB': {
        'orders_today': 112,
        'revenue': 4800,
        'currency': 'GBP',
        'tables_occupied': 10,
        'avg_prep': 28,
        'rating': 4.4,
        'reviews': 621,
        'weekly': [3600.0, 3900.0, 4200.0, 4800.0, 5400.0, 6100.0, 4800.0]
      },
      'US': {
        'orders_today': 98,
        'revenue': 5600,
        'currency': 'USD',
        'tables_occupied': 9,
        'avg_prep': 25,
        'rating': 4.6,
        'reviews': 504,
        'weekly': [4200.0, 4600.0, 5000.0, 5600.0, 6100.0, 6900.0, 5600.0]
      },
    };
    return data[cc] ?? data['QA']!;
  }

  // ── Country-Specific Mock Orders ───────────────────────────────────────────

  List<SellerOrder> _mockDineInOrders(String cc) {
    final d = _orderData[cc] ?? _orderData['QA']!;
    final currency = _currency(cc);
    return [
      _buildOrder('ORD-D001', d['dine'][0], 'dine_in',
          SellerOrderStatus.preparing, d['dineAmt'][0].toDouble(), cc, currency,
          tableNum: '04', guests: 4, phone: d['phones'][0]),
      _buildOrder('ORD-D002', d['dine'][1], 'dine_in',
          SellerOrderStatus.pending, d['dineAmt'][1].toDouble(), cc, currency,
          tableNum: '07', guests: 2, phone: d['phones'][1]),
      _buildOrder('ORD-D003', d['dine'][2], 'dine_in',
          SellerOrderStatus.confirmed, d['dineAmt'][2].toDouble(), cc, currency,
          tableNum: '02', guests: 6, phone: d['phones'][2]),
    ];
  }

  List<SellerOrder> _mockTakeawayOrders(String cc) {
    final d = _orderData[cc] ?? _orderData['QA']!;
    final currency = _currency(cc);
    return [
      _buildOrder('ORD-T001', d['take'][0], 'takeaway', SellerOrderStatus.ready,
          d['takeAmt'][0].toDouble(), cc, currency,
          phone: d['phones'][0]),
      _buildOrder('ORD-T002', d['take'][1], 'takeaway',
          SellerOrderStatus.preparing, d['takeAmt'][1].toDouble(), cc, currency,
          phone: d['phones'][1]),
      _buildOrder('ORD-T003', d['take'][2], 'takeaway',
          SellerOrderStatus.pending, d['takeAmt'][2].toDouble(), cc, currency,
          phone: d['phones'][2]),
    ];
  }

  List<SellerOrder> _mockDeliveryOrders(String cc) {
    final d = _orderData[cc] ?? _orderData['QA']!;
    final currency = _currency(cc);
    return [
      _buildOrder(
          'ORD-V001',
          d['deliv'][0],
          'delivery',
          SellerOrderStatus.confirmed,
          d['delivAmt'][0].toDouble(),
          cc,
          currency,
          address: d['addrs'][0],
          phone: d['phones'][0]),
      _buildOrder('ORD-V002', d['deliv'][1], 'delivery',
          SellerOrderStatus.pending, d['delivAmt'][1].toDouble(), cc, currency,
          address: d['addrs'][1], phone: d['phones'][1]),
      _buildOrder('ORD-V003', d['deliv'][2], 'delivery',
          SellerOrderStatus.assigned, d['delivAmt'][2].toDouble(), cc, currency,
          address: d['addrs'][2], phone: d['phones'][2]),
    ];
  }

  static const _orderData = <String, Map<String, dynamic>>{
    'QA': {
      'dine': ['Al Kuwari Family', 'Ahmed Al-Thani', 'Business Lunch'],
      'dineAmt': [340, 185, 520],
      'take': ['Sara Al Mahmoud', 'Khalid Ibrahim', 'Noura Hassan'],
      'takeAmt': [125, 96, 210],
      'deliv': ['Mohammed Al Sadiq', 'Fatima Al Zahra', 'Abdullah Al Marri'],
      'delivAmt': [156, 88, 245],
      'addrs': ['Al Waab St, Doha', 'Lusail Marina, Doha', 'The Pearl, Doha'],
      'phones': ['+974 5512 3456', '+974 5543 7891', '+974 5567 2345'],
    },
    'IN': {
      'dine': ['Sharma Family', 'Rahul Mehta', 'Corporate Lunch'],
      'dineAmt': [1840, 920, 3200],
      'take': ['Priya Patel', 'Vikram Singh', 'Anjali Kumar'],
      'takeAmt': [680, 420, 1120],
      'deliv': ['Ravi Shankar', 'Deepa Nair', 'Suresh Reddy'],
      'delivAmt': [850, 560, 1480],
      'addrs': ['Bandra West, Mumbai', 'Andheri East, Mumbai', 'Juhu, Mumbai'],
      'phones': ['+91 98201 34567', '+91 97692 45678', '+91 96543 12345'],
    },
    'AE': {
      'dine': ['Al Maktoum Family', 'Yousuf Al Rashid', 'Business Team'],
      'dineAmt': [680, 340, 1100],
      'take': ['Hessa Al Falasi', 'Omar Abdullah', 'Laila Hassan'],
      'takeAmt': [220, 185, 340],
      'deliv': ['Saif Al Ketbi', 'Maryam Al Suwaidi', 'Khalid Juma'],
      'delivAmt': [290, 165, 480],
      'addrs': ['Downtown Dubai', 'Dubai Marina', 'Jumeirah 1, Dubai'],
      'phones': ['+971 50 123 4567', '+971 55 987 6543', '+971 56 234 5678'],
    },
    'SA': {
      'dine': ['Al Saud Family', 'Abdulrahman Al-Ghamdi', 'Work Lunch'],
      'dineAmt': [720, 380, 1240],
      'take': ['Nora Al-Qahtani', 'Faisal Al-Otaibi', 'Reem Al-Dossary'],
      'takeAmt': [240, 195, 420],
      'deliv': ['Mansour Al-Harbi', 'Hind Al-Zahrani', 'Sultan Al-Shehri'],
      'delivAmt': [310, 175, 520],
      'addrs': [
        'Olaya District, Riyadh',
        'Al Malaz, Riyadh',
        'Diplomatic Quarter'
      ],
      'phones': ['+966 50 123 4567', '+966 55 987 6543', '+966 53 456 7890'],
    },
    'KE': {
      'dine': ['Kamau Family', 'Brian Otieno', 'Office Party'],
      'dineAmt': [4200, 2100, 7800],
      'take': ['Wanjiku Njoroge', 'Peter Mwangi', 'Grace Achieng'],
      'takeAmt': [1800, 1200, 2800],
      'deliv': ['John Kipchoge', 'Mary Wambui', 'David Ochieng'],
      'delivAmt': [2200, 1600, 3400],
      'addrs': ['Westlands, Nairobi', 'Karen, Nairobi', 'Kilimani, Nairobi'],
      'phones': ['+254 722 123 456', '+254 733 987 654', '+254 711 234 567'],
    },
    'BH': {
      'dine': ['Al Khalifa Group', 'Hamad Al Dosari', 'Business Dinner'],
      'dineAmt': [280, 140, 420],
      'take': ['Fatima Al-Jishi', 'Yusuf Buali', 'Reem Al-Mannai'],
      'takeAmt': [95, 75, 155],
      'deliv': ['Ahmed Al-Zayani', 'Hessa Al-Mousa', 'Khalid Al-Rumaihi'],
      'delivAmt': [120, 80, 200],
      'addrs': ['Adliya, Manama', 'Juffair, Manama', 'Seef District'],
      'phones': ['+973 3612 3456', '+973 3754 7890', '+973 3867 1234'],
    },
    'KW': {
      'dine': ['Al-Sabah Family', 'Jaber Al-Ahmad', 'Corporate Table'],
      'dineAmt': [320, 165, 520],
      'take': ['Mariam Al-Rashidi', 'Faisal Al-Mutairi', 'Sara Al-Azmi'],
      'takeAmt': [110, 85, 180],
      'deliv': ['Abdullah Al-Osaimi', 'Hawraa Al-Shammari', 'Nasser Al-Enezi'],
      'delivAmt': [140, 95, 240],
      'addrs': ['Salmiya, Kuwait City', 'Hawalli, Kuwait City', 'Rumaithiya'],
      'phones': ['+965 9912 3456', '+965 9856 7890', '+965 9734 5678'],
    },
    'OM': {
      'dine': ['Al Said Family', 'Said Al-Balushi', 'Business Lunch'],
      'dineAmt': [310, 160, 480],
      'take': ['Fatma Al-Rawahi', 'Yousef Al-Amri', 'Marwa Al-Hasni'],
      'takeAmt': [105, 82, 175],
      'deliv': ['Hamad Al-Jahwari', 'Khadija Al-Maqbali', 'Sultan Al-Harthi'],
      'delivAmt': [135, 90, 225],
      'addrs': ['Qurum, Muscat', 'Madinat Sultan Qaboos', 'Bowsher, Muscat'],
      'phones': ['+968 9512 3456', '+968 9634 7890', '+968 9756 2345'],
    },
    'GB': {
      'dine': ['Smith Family', 'James Harrington', 'Team Lunch'],
      'dineAmt': [145, 78, 260],
      'take': ['Emma Thompson', 'Oliver Davies', 'Charlotte Wilson'],
      'takeAmt': [52, 38, 85],
      'deliv': ['Noah Johnson', 'Amelia Brown', 'Liam Williams'],
      'delivAmt': [64, 42, 110],
      'addrs': [
        'Mayfair, London',
        'Shoreditch, London',
        'Notting Hill, London'
      ],
      'phones': ['+44 7700 123456', '+44 7911 987654', '+44 7823 456789'],
    },
    'US': {
      'dine': ['Johnson Family', 'Michael Rodriguez', 'Business Dinner'],
      'dineAmt': [165, 88, 310],
      'take': ['Jennifer Martinez', 'David Kim', 'Ashley Thompson'],
      'takeAmt': [58, 42, 95],
      'deliv': ['Chris Anderson', 'Brittany White', 'Kevin Jackson'],
      'delivAmt': [72, 48, 125],
      'addrs': ['Manhattan, NY', 'Brooklyn, NY', 'Upper East Side, NY'],
      'phones': ['+1 (917) 555-0123', '+1 (718) 555-0456', '+1 (212) 555-0789'],
    },
  };

  SellerOrder _buildOrder(
    String id,
    String customer,
    String mode,
    SellerOrderStatus status,
    double total,
    String cc,
    String currency, {
    String? tableNum,
    int? guests,
    String? address,
    String? phone,
  }) {
    final items = _menuItemsForOrder(cc);
    return SellerOrder(
      id: id,
      type: SellerOrderType.restaurant,
      status: status,
      customerId: 'cust_${id.hashCode}',
      customerName: customer,
      customerPhone: phone ?? '+974 5512 0000',
      items: items,
      total: total,
      currency: currency,
      paymentMethod: mode == 'delivery' ? 'Card' : 'Cash',
      isPaid: mode == 'delivery',
      deliveryAddress: address,
      createdAt: DateTime.now()
          .subtract(Duration(minutes: (id.hashCode.abs() % 45) + 5)),
      moduleData: {
        'order_mode': mode,
        if (tableNum != null) 'table_number': tableNum,
        if (guests != null) 'guest_count': guests,
      },
    );
  }

  List<SellerOrderItem> _menuItemsForOrder(String cc) {
    switch (cc) {
      case 'IN':
        return const [
          SellerOrderItem(
              id: 'i1', name: 'Butter Chicken', quantity: 1, price: 380),
          SellerOrderItem(
              id: 'i2', name: 'Garlic Naan', quantity: 2, price: 60),
          SellerOrderItem(
              id: 'i3', name: 'Mango Lassi', quantity: 2, price: 120),
        ];
      case 'KE':
        return const [
          SellerOrderItem(
              id: 'i1', name: 'Nyama Choma', quantity: 1, price: 1200),
          SellerOrderItem(id: 'i2', name: 'Pilau', quantity: 1, price: 600),
          SellerOrderItem(
              id: 'i3', name: 'Fresh Passion', quantity: 2, price: 200),
        ];
      case 'GB':
        return const [
          SellerOrderItem(
              id: 'i1', name: 'Fish & Chips', quantity: 1, price: 18),
          SellerOrderItem(
              id: 'i2', name: 'Sunday Roast', quantity: 1, price: 22),
          SellerOrderItem(id: 'i3', name: 'Pint of Ale', quantity: 2, price: 6),
        ];
      case 'US':
        return const [
          SellerOrderItem(id: 'i1', name: 'BBQ Burger', quantity: 2, price: 18),
          SellerOrderItem(
              id: 'i2', name: 'Loaded Fries', quantity: 1, price: 12),
          SellerOrderItem(id: 'i3', name: 'Craft Beer', quantity: 2, price: 8),
        ];
      default:
        return const [
          SellerOrderItem(
              id: 'i1', name: 'Mixed Grill Platter', quantity: 1, price: 120),
          SellerOrderItem(
              id: 'i2', name: 'Hummus & Bread', quantity: 2, price: 35),
          SellerOrderItem(
              id: 'i3', name: 'Fresh Juice', quantity: 2, price: 25),
        ];
    }
  }

  String _currency(String cc) {
    const map = {
      'QA': 'QAR',
      'IN': 'INR',
      'AE': 'AED',
      'SA': 'SAR',
      'KE': 'KES',
      'BH': 'BHD',
      'KW': 'KWD',
      'OM': 'OMR',
      'GB': 'GBP',
      'US': 'USD',
    };
    return map[cc] ?? 'QAR';
  }

  // ── Country-Specific Tables ─────────────────────────────────────────────────

  List<RestaurantTable> _mockTables(String cc) {
    final names = _tableGuestNames(cc);
    final configs = [
      (TableStatus.occupied, names[0], 4),
      (TableStatus.available, null, null),
      (TableStatus.reserved, names[1], 2),
      (TableStatus.available, null, null),
      (TableStatus.occupied, names[2], 6),
      (TableStatus.cleaning, null, null),
      (TableStatus.available, null, null),
      (TableStatus.occupied, names[3], 3),
      (TableStatus.reserved, names[4], 5),
      (TableStatus.available, null, null),
      (TableStatus.occupied, names[5], 2),
      (TableStatus.cleaning, null, null),
    ];
    return configs.asMap().entries.map((e) {
      final i = e.key;
      final (status, name, count) = e.value;
      return RestaurantTable(
        id: 'TBL-${(i + 1).toString().padLeft(2, '0')}',
        number: i + 1,
        seats: i % 4 == 0
            ? 8
            : i % 3 == 0
                ? 6
                : 4,
        status: status,
        currentOrderId:
            status == TableStatus.occupied ? 'ORD-${1000 + i}' : null,
        guestName: name,
        guestCount: count,
      );
    }).toList();
  }

  List<String?> _tableGuestNames(String cc) {
    const names = <String, List<String?>>{
      'QA': [
        'Al Kuwari Family',
        'Ahmed Al-Thani',
        'Business Lunch',
        'Sara Al Mahmoud',
        'VIP Reservation',
        'Khalid Ibrahim'
      ],
      'IN': [
        'Sharma Family',
        'Mehta Group',
        'Corporate Team',
        'Priya & Friends',
        'Office Party',
        'Rahul Mehta'
      ],
      'AE': [
        'Al Maktoum Family',
        'Dubai Corp',
        'Business Team',
        'Hessa Al Falasi',
        'VIP Table',
        'Omar Abdullah'
      ],
      'SA': [
        'Al Saud Family',
        'Riyadh Corp',
        'Business Dinner',
        'Nora Al-Qahtani',
        'VIP Reservation',
        'Faisal Group'
      ],
      'KE': [
        'Kamau Family',
        'Nairobi Ltd',
        'Team Lunch',
        'Wanjiku Group',
        'Birthday Party',
        'Brian Otieno'
      ],
      'BH': [
        'Al Khalifa Group',
        'Manama Corp',
        'Business Lunch',
        'Fatima Al-Jishi',
        'VIP Table',
        'Hamad Group'
      ],
      'KW': [
        'Al-Sabah Family',
        'Kuwait Corp',
        'Business Dinner',
        'Mariam Group',
        'VIP Reservation',
        'Jaber Table'
      ],
      'OM': [
        'Al Said Family',
        'Muscat Corp',
        'Business Lunch',
        'Fatma Al-Rawahi',
        'VIP Table',
        'Said Group'
      ],
      'GB': [
        'Smith Family',
        'London Corp',
        'Business Lunch',
        'Emma Thompson',
        'Birthday Table',
        'James Group'
      ],
      'US': [
        'Johnson Family',
        'NY Corp',
        'Business Dinner',
        'Jennifer Group',
        'Anniversary Table',
        'Michael Team'
      ],
    };
    return names[cc] ?? names['QA']!;
  }

  // ── Country-Specific Menu ──────────────────────────────────────────────────

  List<MenuCategory> _mockMenuCategories(String cc) {
    final Map<String, List<MenuCategory>> menus = {
      'QA': _menuQA(),
      'IN': _menuIN(),
      'AE': _menuAE(),
      'SA': _menuSA(),
      'KE': _menuKE(),
      'BH': _menuBH(),
      'KW': _menuKW(),
      'OM': _menuOM(),
      'GB': _menuGB(),
      'US': _menuUS(),
    };
    return menus[cc] ?? menus['QA']!;
  }

  // Qatar — Arabic Fine Dining
  List<MenuCategory> _menuQA() => [
        const MenuCategory(
            id: 'starters',
            name: 'Starters',
            emoji: '🥗',
            items: [
              MenuItem(
                  id: 'q01',
                  name: 'Hummus Platter',
                  description: 'Creamy chickpea hummus with olive oil & pita',
                  price: 25,
                  emoji: '🫘',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 8),
              MenuItem(
                  id: 'q02',
                  name: 'Fattoush Salad',
                  description: 'Fresh veggies with toasted bread & pomegranate',
                  price: 22,
                  emoji: '🥗',
                  category: 'starters',
                  prepTimeMinutes: 10),
              MenuItem(
                  id: 'q03',
                  name: 'Falafel Basket',
                  description: 'Crispy falafel with tahini sauce',
                  price: 18,
                  emoji: '🧆',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 12),
              MenuItem(
                  id: 'q04',
                  name: 'Tabbouleh',
                  description: 'Parsley, tomato & bulgur wheat salad',
                  price: 20,
                  emoji: '🌿',
                  category: 'starters',
                  prepTimeMinutes: 5),
            ]),
        const MenuCategory(
            id: 'mains',
            name: 'Main Course',
            emoji: '🍖',
            items: [
              MenuItem(
                  id: 'q05',
                  name: 'Mixed Grill Platter',
                  description: 'Shish tawook, kofta, lamb chops & rice',
                  price: 120,
                  emoji: '🍢',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 30),
              MenuItem(
                  id: 'q06',
                  name: 'Ouzi Lamb',
                  description: 'Slow-cooked whole lamb over spiced rice',
                  price: 180,
                  emoji: '🥩',
                  category: 'mains',
                  prepTimeMinutes: 45),
              MenuItem(
                  id: 'q07',
                  name: 'Machboos Chicken',
                  description: 'Qatari spiced rice with tender chicken',
                  price: 55,
                  emoji: '🍚',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 35),
              MenuItem(
                  id: 'q08',
                  name: 'Grilled Hammour',
                  description: 'Fresh Gulf fish with herbs & lemon',
                  price: 95,
                  emoji: '🐟',
                  category: 'mains',
                  prepTimeMinutes: 25),
              MenuItem(
                  id: 'q09',
                  name: 'Shawarma Plate',
                  description: 'Slow-roasted chicken or beef with garlic sauce',
                  price: 45,
                  emoji: '🌯',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 15),
            ]),
        const MenuCategory(id: 'sides', name: 'Sides', emoji: '🍟', items: [
          MenuItem(
              id: 'q10',
              name: 'Saffron Rice',
              description: 'Fragrant basmati rice with saffron',
              price: 15,
              emoji: '🍚',
              category: 'sides',
              prepTimeMinutes: 10),
          MenuItem(
              id: 'q11',
              name: 'Grilled Bread',
              description: 'Freshly baked khubz',
              price: 8,
              emoji: '🫓',
              category: 'sides',
              prepTimeMinutes: 5),
          MenuItem(
              id: 'q12',
              name: 'Mixed Pickles',
              description: 'Traditional condiments assortment',
              price: 12,
              emoji: '🫙',
              category: 'sides',
              prepTimeMinutes: 2),
          MenuItem(
              id: 'q13',
              name: 'Vine Leaves',
              description: 'Stuffed with rice & herbs',
              price: 20,
              emoji: '🍃',
              category: 'sides',
              prepTimeMinutes: 8),
        ]),
        const MenuCategory(
            id: 'drinks',
            name: 'Beverages',
            emoji: '🥤',
            items: [
              MenuItem(
                  id: 'q14',
                  name: 'Fresh Lemon Mint',
                  description: 'Refreshing house lemonade',
                  price: 18,
                  emoji: '🍋',
                  isPopular: true,
                  category: 'drinks',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'q15',
                  name: 'Jallab Juice',
                  description: 'Rose water & grape juice blend',
                  price: 20,
                  emoji: '🍇',
                  category: 'drinks',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'q16',
                  name: 'Arabic Qahwa',
                  description: 'Cardamom coffee with dates',
                  price: 12,
                  emoji: '☕',
                  isPopular: true,
                  category: 'drinks',
                  prepTimeMinutes: 3),
              MenuItem(
                  id: 'q17',
                  name: 'Still Water',
                  description: 'Al Ain 500ml',
                  price: 5,
                  emoji: '💧',
                  category: 'drinks',
                  prepTimeMinutes: 1),
            ]),
        const MenuCategory(
            id: 'desserts',
            name: 'Desserts',
            emoji: '🍮',
            items: [
              MenuItem(
                  id: 'q18',
                  name: 'Umm Ali',
                  description: 'Egyptian bread pudding with cream & nuts',
                  price: 30,
                  emoji: '🍮',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 15),
              MenuItem(
                  id: 'q19',
                  name: 'Luqaimat',
                  description: 'Sweet dumplings with date syrup & sesame',
                  price: 22,
                  emoji: '🍡',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 10),
              MenuItem(
                  id: 'q20',
                  name: 'Baklava',
                  description: 'Layered pastry with honey & pistachios',
                  price: 25,
                  emoji: '🍯',
                  category: 'desserts',
                  prepTimeMinutes: 5),
            ]),
      ];

  // India — Mughlai / North Indian
  List<MenuCategory> _menuIN() => [
        const MenuCategory(
            id: 'starters',
            name: 'Starters',
            emoji: '🥗',
            items: [
              MenuItem(
                  id: 'n01',
                  name: 'Paneer Tikka',
                  description:
                      'Grilled cottage cheese with bell peppers & mint chutney',
                  price: 280,
                  emoji: '🧀',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 15),
              MenuItem(
                  id: 'n02',
                  name: 'Chicken 65',
                  description: 'Spicy deep-fried chicken with curry leaves',
                  price: 320,
                  emoji: '🍗',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 18),
              MenuItem(
                  id: 'n03',
                  name: 'Veg Samosa',
                  description: 'Crispy pastry with spiced potato & pea filling',
                  price: 80,
                  emoji: '🥟',
                  category: 'starters',
                  prepTimeMinutes: 8),
              MenuItem(
                  id: 'n04',
                  name: 'Dahi Puri',
                  description: 'Hollow puri with yoghurt, chutney & sev',
                  price: 120,
                  emoji: '🍥',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 10),
            ]),
        const MenuCategory(
            id: 'mains',
            name: 'Main Course',
            emoji: '🍛',
            items: [
              MenuItem(
                  id: 'n05',
                  name: 'Butter Chicken',
                  description: 'Classic murgh makhani in creamy tomato gravy',
                  price: 380,
                  emoji: '🍛',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 20),
              MenuItem(
                  id: 'n06',
                  name: 'Lamb Biryani',
                  description:
                      'Aromatic saffron basmati with slow-cooked gosht',
                  price: 420,
                  emoji: '🍚',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 35),
              MenuItem(
                  id: 'n07',
                  name: 'Dal Makhani',
                  description: 'Slow-cooked black lentils in butter & cream',
                  price: 260,
                  emoji: '🫘',
                  category: 'mains',
                  prepTimeMinutes: 20),
              MenuItem(
                  id: 'n08',
                  name: 'Palak Paneer',
                  description: 'Cottage cheese in spiced spinach gravy',
                  price: 280,
                  emoji: '🌿',
                  category: 'mains',
                  prepTimeMinutes: 18),
              MenuItem(
                  id: 'n09',
                  name: 'Rogan Josh',
                  description: 'Kashmiri lamb curry with whole spices',
                  price: 440,
                  emoji: '🥩',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 40),
            ]),
        const MenuCategory(
            id: 'breads',
            name: 'Breads & Rice',
            emoji: '🫓',
            items: [
              MenuItem(
                  id: 'n10',
                  name: 'Garlic Naan',
                  description: 'Butter garlic flatbread from tandoor',
                  price: 60,
                  emoji: '🫓',
                  isPopular: true,
                  category: 'breads',
                  prepTimeMinutes: 8),
              MenuItem(
                  id: 'n11',
                  name: 'Tandoori Roti',
                  description: 'Whole wheat bread from clay oven',
                  price: 40,
                  emoji: '🥙',
                  category: 'breads',
                  prepTimeMinutes: 6),
              MenuItem(
                  id: 'n12',
                  name: 'Jeera Rice',
                  description: 'Basmati rice tempered with cumin seeds',
                  price: 120,
                  emoji: '🍚',
                  category: 'breads',
                  prepTimeMinutes: 10),
            ]),
        const MenuCategory(id: 'drinks', name: 'Drinks', emoji: '🥤', items: [
          MenuItem(
              id: 'n13',
              name: 'Mango Lassi',
              description: 'Alphonso mango blended with yoghurt',
              price: 120,
              emoji: '🥭',
              isPopular: true,
              category: 'drinks',
              prepTimeMinutes: 3),
          MenuItem(
              id: 'n14',
              name: 'Masala Chai',
              description: 'Spiced milk tea with ginger & cardamom',
              price: 60,
              emoji: '🍵',
              isPopular: true,
              category: 'drinks',
              prepTimeMinutes: 5),
          MenuItem(
              id: 'n15',
              name: 'Fresh Lime Soda',
              description: 'Sweet or salty nimbu soda',
              price: 80,
              emoji: '🍋',
              category: 'drinks',
              prepTimeMinutes: 3),
        ]),
        const MenuCategory(
            id: 'desserts',
            name: 'Desserts',
            emoji: '🍮',
            items: [
              MenuItem(
                  id: 'n16',
                  name: 'Gulab Jamun',
                  description: 'Milk solid dumplings in rose sugar syrup',
                  price: 120,
                  emoji: '🍮',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'n17',
                  name: 'Rasmalai',
                  description: 'Chenna patties in saffron-flavoured milk',
                  price: 150,
                  emoji: '🥛',
                  category: 'desserts',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'n18',
                  name: 'Kulfi',
                  description: 'Dense Indian ice cream — pista or mango',
                  price: 100,
                  emoji: '🍦',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 2),
            ]),
      ];

  // UAE — International Fine Dining
  List<MenuCategory> _menuAE() => [
        const MenuCategory(
            id: 'starters',
            name: 'Starters',
            emoji: '🥗',
            items: [
              MenuItem(
                  id: 'a01',
                  name: 'Burrata Salad',
                  description:
                      'Creamy burrata with heirloom tomatoes & basil oil',
                  price: 65,
                  emoji: '🧀',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 10),
              MenuItem(
                  id: 'a02',
                  name: 'Mezze Platter',
                  description: 'Hummus, mutabbal, fattoush & fried kibbeh',
                  price: 58,
                  emoji: '🥗',
                  category: 'starters',
                  prepTimeMinutes: 8),
              MenuItem(
                  id: 'a03',
                  name: 'Truffle Fries',
                  description: 'Crispy fries with truffle oil & parmesan',
                  price: 42,
                  emoji: '🍟',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 12),
            ]),
        const MenuCategory(
            id: 'mains',
            name: 'Main Course',
            emoji: '🥩',
            items: [
              MenuItem(
                  id: 'a04',
                  name: 'Wagyu Beef Tenderloin',
                  description: '200g A5 Wagyu with seasonal vegetables',
                  price: 320,
                  emoji: '🥩',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 35),
              MenuItem(
                  id: 'a05',
                  name: 'Grilled Sea Bass',
                  description: 'Whole seabass with lemon butter & herbs',
                  price: 145,
                  emoji: '🐟',
                  category: 'mains',
                  prepTimeMinutes: 25),
              MenuItem(
                  id: 'a06',
                  name: 'Lamb Rack',
                  description: '4-bone rack with mint jelly & roasted veg',
                  price: 210,
                  emoji: '🍖',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 40),
              MenuItem(
                  id: 'a07',
                  name: 'Lobster Thermidor',
                  description: 'Half Canadian lobster in cream & tarragon',
                  price: 280,
                  emoji: '🦞',
                  category: 'mains',
                  prepTimeMinutes: 30),
            ]),
        const MenuCategory(
            id: 'drinks',
            name: 'Beverages',
            emoji: '🥤',
            items: [
              MenuItem(
                  id: 'a08',
                  name: 'Virgin Mojito',
                  description: 'Mint, lime & soda',
                  price: 38,
                  emoji: '🍹',
                  isPopular: true,
                  category: 'drinks',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'a09',
                  name: 'Fresh Watermelon',
                  description: 'Chilled watermelon juice',
                  price: 32,
                  emoji: '🍉',
                  category: 'drinks',
                  prepTimeMinutes: 3),
              MenuItem(
                  id: 'a10',
                  name: 'Arabic Qahwa',
                  description: 'Cardamom coffee',
                  price: 22,
                  emoji: '☕',
                  isPopular: true,
                  category: 'drinks',
                  prepTimeMinutes: 3),
            ]),
        const MenuCategory(
            id: 'desserts',
            name: 'Desserts',
            emoji: '🍰',
            items: [
              MenuItem(
                  id: 'a11',
                  name: 'Sticky Date Pudding',
                  description: 'Warm toffee sauce with vanilla ice cream',
                  price: 52,
                  emoji: '🍮',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 15),
              MenuItem(
                  id: 'a12',
                  name: 'Kunafa',
                  description: 'Cheese-filled semolina pastry with syrup',
                  price: 48,
                  emoji: '🥐',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 10),
            ]),
      ];

  // Saudi Arabia — Traditional & Modern
  List<MenuCategory> _menuSA() => [
        const MenuCategory(
            id: 'starters',
            name: 'Starters',
            emoji: '🥗',
            items: [
              MenuItem(
                  id: 's01',
                  name: 'Salata Arabiya',
                  description: 'Fresh Arabic salad with olive oil & lemon',
                  price: 28,
                  emoji: '🥗',
                  category: 'starters',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 's02',
                  name: 'Kibbeh Nayeh',
                  description: 'Raw lamb mixed with bulgur & pine nuts',
                  price: 45,
                  emoji: '🥩',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 10),
              MenuItem(
                  id: 's03',
                  name: 'Mutabbal',
                  description: 'Smoked aubergine dip with tahini',
                  price: 22,
                  emoji: '🫙',
                  category: 'starters',
                  prepTimeMinutes: 5),
            ]),
        const MenuCategory(
            id: 'mains',
            name: 'Main Course',
            emoji: '🍖',
            items: [
              MenuItem(
                  id: 's04',
                  name: 'Kabsa Lamb',
                  description:
                      'Saudi national dish — fragrant rice with whole lamb',
                  price: 150,
                  emoji: '🍚',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 50),
              MenuItem(
                  id: 's05',
                  name: 'Mandi Chicken',
                  description: 'Slow-cooked smoked chicken over saffron rice',
                  price: 85,
                  emoji: '🍗',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 45),
              MenuItem(
                  id: 's06',
                  name: 'Jareesh',
                  description: 'Crushed wheat cooked with meat & butter',
                  price: 55,
                  emoji: '🌾',
                  category: 'mains',
                  prepTimeMinutes: 30),
              MenuItem(
                  id: 's07',
                  name: 'Grilled Hamour',
                  description: 'Gulf red snapper with herb rice',
                  price: 110,
                  emoji: '🐟',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 25),
            ]),
        const MenuCategory(
            id: 'drinks',
            name: 'Beverages',
            emoji: '🥤',
            items: [
              MenuItem(
                  id: 's08',
                  name: 'Tamarind Juice',
                  description: 'Chilled sweet tamarind',
                  price: 18,
                  emoji: '🍹',
                  category: 'drinks',
                  prepTimeMinutes: 3),
              MenuItem(
                  id: 's09',
                  name: 'Saudi Qahwa',
                  description: 'Saffron & cardamom coffee',
                  price: 15,
                  emoji: '☕',
                  isPopular: true,
                  category: 'drinks',
                  prepTimeMinutes: 3),
              MenuItem(
                  id: 's10',
                  name: 'Noman Juice',
                  description: 'Pomegranate & rose water',
                  price: 22,
                  emoji: '🍷',
                  category: 'drinks',
                  prepTimeMinutes: 5),
            ]),
        const MenuCategory(
            id: 'desserts',
            name: 'Desserts',
            emoji: '🍮',
            items: [
              MenuItem(
                  id: 's11',
                  name: 'Saleeg',
                  description: 'White rice cooked in broth with butter & milk',
                  price: 30,
                  emoji: '🍚',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 15),
              MenuItem(
                  id: 's12',
                  name: 'Hareeseh',
                  description: 'Semolina cake soaked in sugar syrup',
                  price: 25,
                  emoji: '🍰',
                  category: 'desserts',
                  prepTimeMinutes: 5),
            ]),
      ];

  // Kenya — East African
  List<MenuCategory> _menuKE() => [
        const MenuCategory(
            id: 'starters',
            name: 'Starters',
            emoji: '🥗',
            items: [
              MenuItem(
                  id: 'k01',
                  name: 'Kachumbari',
                  description: 'Tomato, onion & coriander salad with lime',
                  price: 150,
                  emoji: '🥗',
                  category: 'starters',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'k02',
                  name: 'Bhajia',
                  description: 'Spiced potato fritters with green chutney',
                  price: 250,
                  emoji: '🥔',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 10),
              MenuItem(
                  id: 'k03',
                  name: 'Beef Samosa',
                  description: 'Crispy pastry stuffed with spiced minced beef',
                  price: 200,
                  emoji: '🥟',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 8),
            ]),
        const MenuCategory(
            id: 'mains',
            name: 'Main Course',
            emoji: '🍖',
            items: [
              MenuItem(
                  id: 'k04',
                  name: 'Nyama Choma',
                  description: 'Charcoal-grilled goat or beef with kachumbari',
                  price: 1200,
                  emoji: '🥩',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 40),
              MenuItem(
                  id: 'k05',
                  name: 'Pilau',
                  description: 'Fragrant spiced rice with beef & cardamom',
                  price: 600,
                  emoji: '🍚',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 25),
              MenuItem(
                  id: 'k06',
                  name: 'Ugali & Sukuma',
                  description: 'Stiff maize meal with collard greens & beef',
                  price: 400,
                  emoji: '🌽',
                  category: 'mains',
                  prepTimeMinutes: 15),
              MenuItem(
                  id: 'k07',
                  name: 'Tilapia Fish',
                  description: 'Whole fried tilapia with ugali & kachumbari',
                  price: 800,
                  emoji: '🐟',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 20),
              MenuItem(
                  id: 'k08',
                  name: 'Mukimo',
                  description: 'Mashed potato with peas, maize & greens',
                  price: 350,
                  emoji: '🥗',
                  category: 'mains',
                  prepTimeMinutes: 18),
            ]),
        const MenuCategory(id: 'drinks', name: 'Drinks', emoji: '🥤', items: [
          MenuItem(
              id: 'k09',
              name: 'Fresh Passion',
              description: 'Fresh passion fruit juice',
              price: 200,
              emoji: '🍹',
              isPopular: true,
              category: 'drinks',
              prepTimeMinutes: 3),
          MenuItem(
              id: 'k10',
              name: 'Dawa Cocktail',
              description: 'Honey, lime & vodka or mocktail',
              price: 350,
              emoji: '🍸',
              category: 'drinks',
              prepTimeMinutes: 5),
          MenuItem(
              id: 'k11',
              name: 'Tusker Beer',
              description: 'Kenya\'s iconic lager',
              price: 250,
              emoji: '🍺',
              isPopular: true,
              category: 'drinks',
              prepTimeMinutes: 1),
          MenuItem(
              id: 'k12',
              name: 'Kenyan Tea',
              description: 'Chai with full-cream milk & ginger',
              price: 100,
              emoji: '🍵',
              category: 'drinks',
              prepTimeMinutes: 5),
        ]),
        const MenuCategory(
            id: 'desserts',
            name: 'Desserts',
            emoji: '🍮',
            items: [
              MenuItem(
                  id: 'k13',
                  name: 'Mandazi',
                  description: 'Coconut-flavoured fried dough pastry',
                  price: 150,
                  emoji: '🍩',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 10),
              MenuItem(
                  id: 'k14',
                  name: 'Mahindi Choma',
                  description: 'Charcoal-grilled corn with chilli butter',
                  price: 100,
                  emoji: '🌽',
                  category: 'desserts',
                  prepTimeMinutes: 8),
            ]),
      ];

  // Bahrain — Gulf Cuisine
  List<MenuCategory> _menuBH() => [
        const MenuCategory(
            id: 'starters',
            name: 'Starters',
            emoji: '🥗',
            items: [
              MenuItem(
                  id: 'b01',
                  name: 'Harees',
                  description: 'Slow-cooked wheat & lamb porridge',
                  price: 2.5,
                  emoji: '🌾',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 10),
              MenuItem(
                  id: 'b02',
                  name: 'Mezze Board',
                  description: 'Hummus, baba ghanoush & pita selection',
                  price: 3.8,
                  emoji: '🥗',
                  category: 'starters',
                  prepTimeMinutes: 5),
            ]),
        const MenuCategory(
            id: 'mains',
            name: 'Main Course',
            emoji: '🍖',
            items: [
              MenuItem(
                  id: 'b03',
                  name: 'Muhammar',
                  description: 'Sweet rice with dates & cardamom chicken',
                  price: 7.5,
                  emoji: '🍚',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 35),
              MenuItem(
                  id: 'b04',
                  name: 'Kabsa Bahraini',
                  description: 'Spiced rice with Gulf prawns & chicken',
                  price: 8.8,
                  emoji: '🦐',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 40),
              MenuItem(
                  id: 'b05',
                  name: 'Grilled Hamour',
                  description: 'Local grouper fish with lemon rice',
                  price: 11.5,
                  emoji: '🐟',
                  category: 'mains',
                  prepTimeMinutes: 25),
            ]),
        const MenuCategory(
            id: 'drinks',
            name: 'Beverages',
            emoji: '🥤',
            items: [
              MenuItem(
                  id: 'b06',
                  name: 'Laban',
                  description: 'Chilled salty buttermilk drink',
                  price: 1.2,
                  emoji: '🥛',
                  category: 'drinks',
                  prepTimeMinutes: 1),
              MenuItem(
                  id: 'b07',
                  name: 'Bahraini Qahwa',
                  description: 'Rose-water & cardamom coffee',
                  price: 1.5,
                  emoji: '☕',
                  isPopular: true,
                  category: 'drinks',
                  prepTimeMinutes: 3),
            ]),
        const MenuCategory(
            id: 'desserts',
            name: 'Desserts',
            emoji: '🍮',
            items: [
              MenuItem(
                  id: 'b08',
                  name: 'Halwa',
                  description: 'Saffron-scented Bahraini sweet gelatine',
                  price: 2.5,
                  emoji: '🟡',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'b09',
                  name: 'Luqaimat',
                  description: 'Honey dumplings with sesame seeds',
                  price: 2.2,
                  emoji: '🍡',
                  category: 'desserts',
                  prepTimeMinutes: 8),
            ]),
      ];

  // Kuwait — Kuwaiti Cuisine
  List<MenuCategory> _menuKW() => [
        const MenuCategory(
            id: 'starters',
            name: 'Starters',
            emoji: '🥗',
            items: [
              MenuItem(
                  id: 'kw1',
                  name: 'Dawson Salad',
                  description: 'Rocket, tomato & pomegranate',
                  price: 3.5,
                  emoji: '🥗',
                  category: 'starters',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'kw2',
                  name: 'Crispy Kibbeh',
                  description: 'Bulgur shells with spiced lamb filling',
                  price: 4.2,
                  emoji: '🥟',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 12),
            ]),
        const MenuCategory(
            id: 'mains',
            name: 'Main Course',
            emoji: '🍖',
            items: [
              MenuItem(
                  id: 'kw3',
                  name: 'Chicken Muhammar',
                  description: 'Sweet saffron rice with slow-roasted chicken',
                  price: 6.8,
                  emoji: '🍚',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 40),
              MenuItem(
                  id: 'kw4',
                  name: 'Gabout Stew',
                  description: 'Kuwaiti dumplings with lamb & tomato broth',
                  price: 8.5,
                  emoji: '🍲',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 45),
              MenuItem(
                  id: 'kw5',
                  name: 'Margoog',
                  description: 'Meat & vegetable stew with thin bread',
                  price: 7.2,
                  emoji: '🥘',
                  category: 'mains',
                  prepTimeMinutes: 35),
            ]),
        const MenuCategory(
            id: 'drinks',
            name: 'Beverages',
            emoji: '🥤',
            items: [
              MenuItem(
                  id: 'kw6',
                  name: 'Karak Chai',
                  description: 'Strong spiced Indian-style tea',
                  price: 1.5,
                  emoji: '🍵',
                  isPopular: true,
                  category: 'drinks',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'kw7',
                  name: 'Mango Laban',
                  description: 'Sweet mango yoghurt drink',
                  price: 2.5,
                  emoji: '🥭',
                  category: 'drinks',
                  prepTimeMinutes: 3),
            ]),
        const MenuCategory(
            id: 'desserts',
            name: 'Desserts',
            emoji: '🍮',
            items: [
              MenuItem(
                  id: 'kw8',
                  name: 'Umm Ali',
                  description: 'Bread pudding with cream & nuts',
                  price: 3.2,
                  emoji: '🍮',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 15),
              MenuItem(
                  id: 'kw9',
                  name: 'Balaleet',
                  description: 'Vermicelli with egg & cardamom',
                  price: 2.8,
                  emoji: '🍝',
                  category: 'desserts',
                  prepTimeMinutes: 10),
            ]),
      ];

  // Oman — Omani Cuisine
  List<MenuCategory> _menuOM() => [
        const MenuCategory(
            id: 'starters',
            name: 'Starters',
            emoji: '🥗',
            items: [
              MenuItem(
                  id: 'o01',
                  name: 'Omani Salad',
                  description:
                      'Cucumber, tomato & fresh herbs with dried lemon',
                  price: 1.5,
                  emoji: '🥗',
                  category: 'starters',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'o02',
                  name: 'Shuwaa Bites',
                  description: 'Slow-cooked spiced lamb bites with Omani bread',
                  price: 3.2,
                  emoji: '🥩',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 10),
            ]),
        const MenuCategory(
            id: 'mains',
            name: 'Main Course',
            emoji: '🍖',
            items: [
              MenuItem(
                  id: 'o03',
                  name: 'Shuwa Lamb',
                  description:
                      'Oman\'s national dish — marinated lamb in pit oven',
                  price: 12.5,
                  emoji: '🥩',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 60),
              MenuItem(
                  id: 'o04',
                  name: 'Omani Kabsa',
                  description: 'Spiced rice with chicken & dried lemon',
                  price: 4.8,
                  emoji: '🍚',
                  isPopular: true,
                  category: 'mains',
                  prepTimeMinutes: 35),
              MenuItem(
                  id: 'o05',
                  name: 'Grilled Kingfish',
                  description: 'King mackerel with Omani spices & rice',
                  price: 7.5,
                  emoji: '🐟',
                  category: 'mains',
                  prepTimeMinutes: 25),
            ]),
        const MenuCategory(
            id: 'drinks',
            name: 'Beverages',
            emoji: '🥤',
            items: [
              MenuItem(
                  id: 'o06',
                  name: 'Omani Qahwa',
                  description: 'Cardamom & rose water coffee',
                  price: 1.5,
                  emoji: '☕',
                  isPopular: true,
                  category: 'drinks',
                  prepTimeMinutes: 3),
              MenuItem(
                  id: 'o07',
                  name: 'Fresh Mango',
                  description: 'Chilled blended mango juice',
                  price: 2.2,
                  emoji: '🥭',
                  category: 'drinks',
                  prepTimeMinutes: 3),
            ]),
        const MenuCategory(
            id: 'desserts',
            name: 'Desserts',
            emoji: '🍮',
            items: [
              MenuItem(
                  id: 'o08',
                  name: 'Halwa Omani',
                  description: 'Saffron & rose water sweet gelatine',
                  price: 2.0,
                  emoji: '🟡',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'o09',
                  name: 'Asida',
                  description: 'Wheat porridge with date syrup & ghee',
                  price: 1.8,
                  emoji: '🍮',
                  category: 'desserts',
                  prepTimeMinutes: 10),
            ]),
      ];

  // UK — British Pub & Restaurant
  List<MenuCategory> _menuGB() => [
        const MenuCategory(
            id: 'starters',
            name: 'Starters',
            emoji: '🥗',
            items: [
              MenuItem(
                  id: 'g01',
                  name: 'Prawn Cocktail',
                  description:
                      'King prawns with Marie Rose sauce & iceberg lettuce',
                  price: 9.5,
                  emoji: '🦐',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 8),
              MenuItem(
                  id: 'g02',
                  name: 'Soup of the Day',
                  description: 'Seasonal cream soup with crusty bread & butter',
                  price: 7.0,
                  emoji: '🍲',
                  category: 'starters',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'g03',
                  name: 'Scotch Egg',
                  description:
                      'Soft-boiled egg wrapped in sausage meat & breadcrumb',
                  price: 8.5,
                  emoji: '🥚',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 10),
            ]),
        const MenuCategory(id: 'mains', name: 'Mains', emoji: '🍽️', items: [
          MenuItem(
              id: 'g04',
              name: 'Fish & Chips',
              description:
                  'Battered cod with chunky chips, mushy peas & tartare',
              price: 18.0,
              emoji: '🐟',
              isPopular: true,
              category: 'mains',
              prepTimeMinutes: 20),
          MenuItem(
              id: 'g05',
              name: 'Sunday Roast',
              description: 'Roast beef with Yorkshire pudding, roasties & veg',
              price: 22.0,
              emoji: '🥩',
              isPopular: true,
              category: 'mains',
              prepTimeMinutes: 35),
          MenuItem(
              id: 'g06',
              name: 'Shepherd\'s Pie',
              description: 'Slow-cooked lamb topped with creamy mashed potato',
              price: 17.0,
              emoji: '🥧',
              category: 'mains',
              prepTimeMinutes: 30),
          MenuItem(
              id: 'g07',
              name: 'Beef Burger',
              description: '6oz beef patty with bacon, cheese & fries',
              price: 16.0,
              emoji: '🍔',
              category: 'mains',
              prepTimeMinutes: 18),
          MenuItem(
              id: 'g08',
              name: 'Chicken Tikka Masala',
              description: 'British-Indian classic with basmati rice',
              price: 16.5,
              emoji: '🍛',
              isPopular: true,
              category: 'mains',
              prepTimeMinutes: 22),
        ]),
        const MenuCategory(id: 'drinks', name: 'Drinks', emoji: '🍺', items: [
          MenuItem(
              id: 'g09',
              name: 'Pint of Ale',
              description: 'Rotating cask real ales',
              price: 6.0,
              emoji: '🍺',
              isPopular: true,
              category: 'drinks',
              prepTimeMinutes: 1),
          MenuItem(
              id: 'g10',
              name: 'English Breakfast Tea',
              description: 'Pot of English Breakfast with milk',
              price: 3.5,
              emoji: '🍵',
              isPopular: true,
              category: 'drinks',
              prepTimeMinutes: 3),
          MenuItem(
              id: 'g11',
              name: 'Elderflower Cordial',
              description: 'Pressed elderflower & sparkling water',
              price: 4.0,
              emoji: '🌸',
              category: 'drinks',
              prepTimeMinutes: 1),
        ]),
        const MenuCategory(
            id: 'desserts',
            name: 'Puddings',
            emoji: '🍮',
            items: [
              MenuItem(
                  id: 'g12',
                  name: 'Sticky Toffee Pudding',
                  description: 'Warm sponge with toffee sauce & clotted cream',
                  price: 8.5,
                  emoji: '🍮',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 10),
              MenuItem(
                  id: 'g13',
                  name: 'Eton Mess',
                  description: 'Strawberries, meringue & whipped cream',
                  price: 7.5,
                  emoji: '🍓',
                  category: 'desserts',
                  prepTimeMinutes: 5),
              MenuItem(
                  id: 'g14',
                  name: 'Chocolate Fondant',
                  description: 'Warm chocolate cake with vanilla ice cream',
                  price: 9.0,
                  emoji: '🍫',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 15),
            ]),
      ];

  // USA — American Comfort Food
  List<MenuCategory> _menuUS() => [
        const MenuCategory(
            id: 'starters',
            name: 'Starters',
            emoji: '🥗',
            items: [
              MenuItem(
                  id: 'u01',
                  name: 'Buffalo Wings',
                  description: '12 crispy wings with blue cheese dip',
                  price: 16.0,
                  emoji: '🍗',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 18),
              MenuItem(
                  id: 'u02',
                  name: 'Caesar Salad',
                  description:
                      'Romaine, parmesan, croutons & house Caesar dressing',
                  price: 14.0,
                  emoji: '🥗',
                  category: 'starters',
                  prepTimeMinutes: 8),
              MenuItem(
                  id: 'u03',
                  name: 'Loaded Nachos',
                  description:
                      'Tortilla chips, cheese, jalapeños, sour cream & guac',
                  price: 15.0,
                  emoji: '🌮',
                  isPopular: true,
                  category: 'starters',
                  prepTimeMinutes: 12),
              MenuItem(
                  id: 'u04',
                  name: 'Clam Chowder',
                  description: 'New England style in a sourdough bread bowl',
                  price: 14.0,
                  emoji: '🍲',
                  category: 'starters',
                  prepTimeMinutes: 5),
            ]),
        const MenuCategory(id: 'mains', name: 'Mains', emoji: '🍔', items: [
          MenuItem(
              id: 'u05',
              name: 'BBQ Smash Burger',
              description: '2x smash patties, American cheese, pickles & BBQ',
              price: 18.0,
              emoji: '🍔',
              isPopular: true,
              category: 'mains',
              prepTimeMinutes: 18),
          MenuItem(
              id: 'u06',
              name: 'Baby Back Ribs',
              description: 'Full rack with house BBQ sauce & coleslaw',
              price: 32.0,
              emoji: '🥩',
              isPopular: true,
              category: 'mains',
              prepTimeMinutes: 40),
          MenuItem(
              id: 'u07',
              name: 'NY Strip Steak',
              description: '12oz dry-aged with truffle butter & potato wedges',
              price: 42.0,
              emoji: '🥩',
              category: 'mains',
              prepTimeMinutes: 30),
          MenuItem(
              id: 'u08',
              name: 'Shrimp Po\' Boy',
              description: 'Fried Gulf shrimp on French bread with remoulade',
              price: 20.0,
              emoji: '🦐',
              category: 'mains',
              prepTimeMinutes: 15),
          MenuItem(
              id: 'u09',
              name: 'Mac & Cheese',
              description: 'Creamy 4-cheese pasta with panko breadcrumbs',
              price: 14.0,
              emoji: '🧀',
              isPopular: true,
              category: 'mains',
              prepTimeMinutes: 12),
        ]),
        const MenuCategory(id: 'drinks', name: 'Drinks', emoji: '🥤', items: [
          MenuItem(
              id: 'u10',
              name: 'Craft Beer',
              description: 'Local rotating IPA, stout or lager',
              price: 8.0,
              emoji: '🍺',
              isPopular: true,
              category: 'drinks',
              prepTimeMinutes: 1),
          MenuItem(
              id: 'u11',
              name: 'Arnold Palmer',
              description: 'Half lemonade, half iced sweet tea',
              price: 5.0,
              emoji: '🍹',
              isPopular: true,
              category: 'drinks',
              prepTimeMinutes: 2),
          MenuItem(
              id: 'u12',
              name: 'Milkshake',
              description: 'Thick shake — vanilla, chocolate or strawberry',
              price: 9.0,
              emoji: '🥤',
              category: 'drinks',
              prepTimeMinutes: 5),
        ]),
        const MenuCategory(
            id: 'desserts',
            name: 'Desserts',
            emoji: '🍰',
            items: [
              MenuItem(
                  id: 'u13',
                  name: 'New York Cheesecake',
                  description: 'Classic baked cheesecake with berry coulis',
                  price: 10.0,
                  emoji: '🍰',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 3),
              MenuItem(
                  id: 'u14',
                  name: 'Skillet Cookie',
                  description:
                      'Warm chocolate chip cookie with vanilla ice cream',
                  price: 11.0,
                  emoji: '🍪',
                  isPopular: true,
                  category: 'desserts',
                  prepTimeMinutes: 12),
              MenuItem(
                  id: 'u15',
                  name: 'Banana Foster',
                  description: 'Flambéed banana with rum sauce & ice cream',
                  price: 12.0,
                  emoji: '🍌',
                  category: 'desserts',
                  prepTimeMinutes: 8),
            ]),
      ];
}
