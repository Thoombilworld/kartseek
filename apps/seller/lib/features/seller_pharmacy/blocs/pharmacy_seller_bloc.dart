import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_event.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/services/seller_api_service.dart';
import 'package:kartseek_seller/features/shared/services/seller_order_socket_service.dart';

class PharmacySellerBloc
    extends Bloc<PharmacySellerEvent, PharmacySellerState> {
  final SellerApiService _api;
  final SellerOrderSocketService _socket;

  PharmacySellerBloc({SellerApiService? api, SellerOrderSocketService? socket})
      : _api    = api    ?? SellerApiService.instance,
        _socket = socket ?? SellerOrderSocketService(),
        super(const PharmacySellerState()) {
    on<LoadPharmacyDashboard>(_onLoadDashboard);
    on<TogglePharmacyOpen>(_onToggleOpen);
    on<LoadPharmacyOrders>(_onLoadOrders);
    on<SelectPharmacyOrderTab>(_onSelectTab);
    on<AcceptPharmacyOrder>(_onAccept);
    on<MarkPharmacyOrderDispensing>(_onDispensing);
    on<MarkPharmacyOrderReady>(_onReady);
    on<RejectPharmacyOrder>(_onRejectOrder);
    on<DispatchPharmacyOrder>(_onDispatch);
    on<LoadPharmacyPrescriptions>(_onLoadPrescriptions);
    on<VerifyPrescription>(_onVerify);
    on<RejectPrescription>(_onRejectRx);
    on<RequestMoreInfoForPrescription>(_onRequestInfo);
    on<LoadPharmacyInventory>(_onLoadInventory);
    on<ToggleInventoryItemAvailability>(_onToggleItem);
    on<UpdateInventoryItemStock>(_onUpdateStock);
    on<UpdateInventoryItemPrice>(_onUpdatePrice);
    on<BulkRestockLowItems>(_onBulkRestock);
    on<AddInventoryItem>(_onAddItem);
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  Future<void> _onLoadDashboard(
      LoadPharmacyDashboard event, Emitter<PharmacySellerState> emit) async {
    emit(state.copyWith(status: PharmacyBlocStatus.loading));
    try {
      final data = await _api.getDashboard();
      emit(state.copyWith(status: PharmacyBlocStatus.loaded, dashboardData: data));
    } catch (_) {
      emit(state.copyWith(
        status: PharmacyBlocStatus.loaded,
        dashboardData: _mockDashboard(event.countryCode),
      ));
    }
    add(LoadPharmacyOrders(countryCode: event.countryCode));
    add(LoadPharmacyPrescriptions(countryCode: event.countryCode));
    add(LoadPharmacyInventory(countryCode: event.countryCode));
  }

  void _onToggleOpen(TogglePharmacyOpen event, Emitter<PharmacySellerState> emit) {
    emit(state.copyWith(
      isOpen: event.isOpen,
      actionMessage: event.isOpen
          ? 'Pharmacy is now Open 🟢'
          : 'Pharmacy is now Closed 🔴',
      actionSuccess: true,
    ));
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  Future<void> _onLoadOrders(
      LoadPharmacyOrders event, Emitter<PharmacySellerState> emit) async {
    emit(state.copyWith(
        status: PharmacyBlocStatus.loading, selectedOrderTab: event.tab));
    try {
      final orders = await _api.getOrders();
      emit(state.copyWith(status: PharmacyBlocStatus.loaded, orders: orders));
    } catch (_) {
      emit(state.copyWith(
        status: PharmacyBlocStatus.loaded,
        orders: _mockOrders(event.countryCode),
      ));
    }
  }

  void _onSelectTab(SelectPharmacyOrderTab event, Emitter<PharmacySellerState> emit) {
    emit(state.copyWith(selectedOrderTab: event.tab));
  }

  Future<void> _onAccept(AcceptPharmacyOrder event, Emitter<PharmacySellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.confirmed,
        estimatedMinutes: event.estimatedMinutes);
    await _api.updateOrderStatus(event.orderId, 'CONFIRMED');
    _updateOrderStatus(event.orderId, SellerOrderStatus.confirmed, emit);
    emit(state.copyWith(
      actionMessage: 'Order accepted — dispensing in ~${event.estimatedMinutes} min ✅',
      actionSuccess: true,
    ));
  }

  Future<void> _onDispensing(
      MarkPharmacyOrderDispensing event, Emitter<PharmacySellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.preparing);
    await _api.updateOrderStatus(event.orderId, 'PREPARING');
    _updateOrderStatus(event.orderId, SellerOrderStatus.preparing, emit);
    emit(state.copyWith(
      actionMessage: '💊 Dispensing medicines...',
      actionSuccess: true,
    ));
  }

  Future<void> _onReady(
      MarkPharmacyOrderReady event, Emitter<PharmacySellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.ready);
    await _api.updateOrderStatus(event.orderId, 'READY');
    _updateOrderStatus(event.orderId, SellerOrderStatus.ready, emit);
    emit(state.copyWith(
      actionMessage: '📦 Order packed — ready for pickup/delivery',
      actionSuccess: true,
    ));
  }

  Future<void> _onRejectOrder(
      RejectPharmacyOrder event, Emitter<PharmacySellerState> emit) async {
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.cancelled,
        message: event.reason);
    await _api.updateOrderStatus(event.orderId, 'CANCELLED');
    final updated = state.orders
        .where((o) => o.id != event.orderId)
        .toList();
    emit(state.copyWith(
      orders: updated,
      actionMessage: 'Order rejected ❌',
      actionSuccess: false,
    ));
  }

  Future<void> _onDispatch(
      DispatchPharmacyOrder event, Emitter<PharmacySellerState> emit) async {
    final order = state.orders.firstWhere(
      (o) => o.id == event.orderId,
      orElse: () => SellerOrder.mock(SellerOrderType.pharmacy),
    );
    _socket.updateOrderStatus(event.orderId, SellerOrderStatus.ready);
    _socket.dispatchDelivery(
      orderId:       event.orderId,
      pickupLat:     order.moduleData['pickup_lat'] as double? ?? 25.2854,
      pickupLng:     order.moduleData['pickup_lng'] as double? ?? 51.5310,
      pickupAddress: order.moduleData['pickup_address'] as String? ?? 'Pharmacy Store',
    );
    await _api.updateOrderStatus(event.orderId, 'READY');
    _updateOrderStatus(event.orderId, SellerOrderStatus.assigned, emit);
    emit(state.copyWith(
      actionMessage: '🚚 Delivery partner dispatched!',
      actionSuccess: true,
    ));
  }

  void _updateOrderStatus(
      String orderId, SellerOrderStatus status, Emitter<PharmacySellerState> emit) {
    final updated = state.orders
        .map((o) => o.id == orderId ? o.copyWith(status: status) : o)
        .toList();
    emit(state.copyWith(orders: updated));
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────

  Future<void> _onLoadPrescriptions(
      LoadPharmacyPrescriptions event, Emitter<PharmacySellerState> emit) async {
    final rxs = _mockPrescriptions(event.countryCode);
    emit(state.copyWith(prescriptions: rxs));
  }

  void _onVerify(VerifyPrescription event, Emitter<PharmacySellerState> emit) {
    final updated = state.prescriptions
        .map((p) => p.id == event.prescriptionId ? p.copyWith(status: 'verified') : p)
        .toList();
    emit(state.copyWith(
      prescriptions: updated,
      actionMessage: '✅ Prescription verified — medicines can be dispensed',
      actionSuccess: true,
    ));
    _api.updateProduct(event.prescriptionId, {'status': 'verified'});
  }

  void _onRejectRx(RejectPrescription event, Emitter<PharmacySellerState> emit) {
    final updated = state.prescriptions
        .map((p) => p.id == event.prescriptionId
            ? p.copyWith(status: 'rejected', rejectionReason: event.reason)
            : p)
        .toList();
    emit(state.copyWith(
      prescriptions: updated,
      actionMessage: 'Prescription rejected — customer notified',
      actionSuccess: false,
    ));
  }

  void _onRequestInfo(
      RequestMoreInfoForPrescription event, Emitter<PharmacySellerState> emit) {
    final updated = state.prescriptions
        .map((p) => p.id == event.prescriptionId
            ? p.copyWith(status: 'info_needed', additionalInfo: event.question)
            : p)
        .toList();
    emit(state.copyWith(
      prescriptions: updated,
      actionMessage: '💬 Information request sent to customer',
      actionSuccess: true,
    ));
  }

  // ── Inventory ──────────────────────────────────────────────────────────────

  Future<void> _onLoadInventory(
      LoadPharmacyInventory event, Emitter<PharmacySellerState> emit) async {
    final items = _mockInventory(event.countryCode);
    emit(state.copyWith(items: items));
  }

  void _onToggleItem(
      ToggleInventoryItemAvailability event, Emitter<PharmacySellerState> emit) {
    final updated = state.items
        .map((i) => i.id == event.itemId ? i.copyWith(isAvailable: event.isAvailable) : i)
        .toList();
    emit(state.copyWith(
      items: updated,
      actionMessage: event.isAvailable ? 'Item restored ✅' : 'Item marked out of stock',
      actionSuccess: event.isAvailable,
    ));
    _api.updateProduct(event.itemId, {'available': event.isAvailable});
  }

  void _onUpdateStock(
      UpdateInventoryItemStock event, Emitter<PharmacySellerState> emit) {
    final updated = state.items
        .map((i) => i.id == event.itemId ? i.copyWith(stock: event.newStock) : i)
        .toList();
    emit(state.copyWith(
      items: updated,
      actionMessage: 'Stock updated to ${event.newStock} units ✅',
      actionSuccess: true,
    ));
  }

  void _onUpdatePrice(
      UpdateInventoryItemPrice event, Emitter<PharmacySellerState> emit) {
    final updated = state.items
        .map((i) => i.id == event.itemId ? i.copyWith(price: event.newPrice) : i)
        .toList();
    emit(state.copyWith(
      items: updated,
      actionMessage: 'Price updated ✅',
      actionSuccess: true,
    ));
  }

  void _onBulkRestock(BulkRestockLowItems event, Emitter<PharmacySellerState> emit) {
    final updated = state.items.map((i) {
      if (i.isLowStock || i.isOutOfStock) {
        return i.copyWith(stock: i.minStock * 5, isAvailable: true);
      }
      return i;
    }).toList();
    emit(state.copyWith(
      items: updated,
      actionMessage: '🔄 All low-stock items restocked to safe levels',
      actionSuccess: true,
    ));
  }

  void _onAddItem(AddInventoryItem event, Emitter<PharmacySellerState> emit) {
    final newItem = PharmacyItem(
      id:                   'ITEM_${DateTime.now().millisecondsSinceEpoch}',
      name:                 event.name,
      category:             event.category,
      emoji:                event.emoji,
      price:                event.price,
      stock:                event.stock,
      requiresPrescription: event.requiresPrescription,
    );
    emit(state.copyWith(
      items: [...state.items, newItem],
      actionMessage: '${event.emoji} ${event.name} added to inventory ✅',
      actionSuccess: true,
    ));
  }

  // ── Country Mock Data ──────────────────────────────────────────────────────

  Map<String, dynamic> _mockDashboard(String cc) {
    final data = <String, Map<String, dynamic>>{
      'QA': {'orders': 34, 'revenue': 8400,   'currency': 'QAR', 'pending_rx': 4, 'low_stock': 3,  'rating': 4.9, 'weekly': [5200.0, 6100.0, 7200.0, 8400.0, 9100.0, 10800.0, 8400.0]},
      'IN': {'orders': 89, 'revenue': 42000,  'currency': 'INR', 'pending_rx': 7, 'low_stock': 5,  'rating': 4.7, 'weekly': [28000.0, 33000.0, 38000.0, 42000.0, 47000.0, 54000.0, 42000.0]},
      'AE': {'orders': 27, 'revenue': 6200,   'currency': 'AED', 'pending_rx': 3, 'low_stock': 2,  'rating': 4.8, 'weekly': [4100.0, 4800.0, 5500.0, 6200.0, 7100.0, 8200.0, 6200.0]},
      'SA': {'orders': 41, 'revenue': 9800,   'currency': 'SAR', 'pending_rx': 5, 'low_stock': 4,  'rating': 4.7, 'weekly': [6800.0, 7600.0, 8700.0, 9800.0, 11200.0, 12400.0, 9800.0]},
      'KE': {'orders': 56, 'revenue': 128000, 'currency': 'KES', 'pending_rx': 6, 'low_stock': 8,  'rating': 4.5, 'weekly': [88000.0, 98000.0, 112000.0, 128000.0, 140000.0, 158000.0, 128000.0]},
      'BH': {'orders': 22, 'revenue': 2100,   'currency': 'BHD', 'pending_rx': 2, 'low_stock': 2,  'rating': 4.8, 'weekly': [1500.0, 1700.0, 1900.0, 2100.0, 2400.0, 2700.0, 2100.0]},
      'KW': {'orders': 29, 'revenue': 3400,   'currency': 'KWD', 'pending_rx': 3, 'low_stock': 3,  'rating': 4.6, 'weekly': [2200.0, 2600.0, 3000.0, 3400.0, 3900.0, 4400.0, 3400.0]},
      'OM': {'orders': 18, 'revenue': 2200,   'currency': 'OMR', 'pending_rx': 2, 'low_stock': 1,  'rating': 4.7, 'weekly': [1600.0, 1800.0, 2000.0, 2200.0, 2500.0, 2900.0, 2200.0]},
      'GB': {'orders': 48, 'revenue': 2800,   'currency': 'GBP', 'pending_rx': 4, 'low_stock': 3,  'rating': 4.5, 'weekly': [1900.0, 2200.0, 2500.0, 2800.0, 3200.0, 3700.0, 2800.0]},
      'US': {'orders': 62, 'revenue': 4200,   'currency': 'USD', 'pending_rx': 5, 'low_stock': 4,  'rating': 4.6, 'weekly': [2900.0, 3300.0, 3700.0, 4200.0, 4800.0, 5500.0, 4200.0]},
    };
    return data[cc] ?? data['QA']!;
  }

  // ── Country-Specific Orders ────────────────────────────────────────────────

  List<SellerOrder> _mockOrders(String cc) {
    final d = _orderData[cc] ?? _orderData['QA']!;
    final currency = _currency(cc);
    return [
      _order('PHM-001', d['names'][0] as String, d['phones'][0] as String, d['addrs'][0] as String, (d['amounts'] as List)[0].toDouble(), currency, SellerOrderStatus.pending,   true,  d['meds'] as List<String>),
      _order('PHM-002', d['names'][1] as String, d['phones'][1] as String, d['addrs'][1] as String, (d['amounts'] as List)[1].toDouble(), currency, SellerOrderStatus.preparing, false, d['meds'] as List<String>),
      _order('PHM-003', d['names'][2] as String, d['phones'][2] as String, d['addrs'][2] as String, (d['amounts'] as List)[2].toDouble(), currency, SellerOrderStatus.pending,   true,  d['meds'] as List<String>),
      _order('PHM-004', d['names'][3] as String, d['phones'][3] as String, d['addrs'][3] as String, (d['amounts'] as List)[3].toDouble(), currency, SellerOrderStatus.ready,     false, d['meds'] as List<String>),
      _order('PHM-005', d['names'][4] as String, d['phones'][4] as String, d['addrs'][4] as String, (d['amounts'] as List)[4].toDouble(), currency, SellerOrderStatus.delivered, false, d['meds'] as List<String>),
    ];
  }

  static const _orderData = <String, Map<String, dynamic>>{
    'QA': {
      'names':   ['Mohammed Al Kuwari', 'Fatima Al Thani', 'Ahmed Al Rashid', 'Sara Hassan', 'Khalid Al Marri'],
      'phones':  ['+974 5512 3456', '+974 5543 7891', '+974 5567 2345', '+974 5589 1234', '+974 5512 9876'],
      'addrs':   ['Al Waab St, Doha', 'Lusail City, Doha', 'The Pearl, Doha', 'West Bay, Doha', 'Al Rayyan, Doha'],
      'amounts': [186, 94, 312, 55, 228],
      'meds':    ['Amoxicillin 500mg', 'Vitamin D3', 'Metformin 500mg', 'Panadol Extra', 'Amlodipine 5mg'],
    },
    'IN': {
      'names':   ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Gupta', 'Vijay Reddy'],
      'phones':  ['+91 98201 34567', '+91 97692 45678', '+91 96543 12345', '+91 95432 67890', '+91 94321 56789'],
      'addrs':   ['Bandra West, Mumbai', 'Andheri East, Mumbai', 'Powai, Mumbai', 'Malad West, Mumbai', 'Goregaon, Mumbai'],
      'amounts': [850, 420, 1680, 240, 1120],
      'meds':    ['Crocin 500mg', 'Metformin 850mg', 'Atorvastatin 10mg', 'Omeprazole 20mg', 'Telmisartan 40mg'],
    },
    'AE': {
      'names':   ['Omar Al Maktoum', 'Hessa Al Falasi', 'Yousuf Juma', 'Laila Rashid', 'Saif Al Ketbi'],
      'phones':  ['+971 50 123 4567', '+971 55 987 6543', '+971 56 234 5678', '+971 52 345 6789', '+971 58 456 7890'],
      'addrs':   ['Downtown Dubai', 'Dubai Marina', 'JBR, Dubai', 'Jumeirah 1', 'Mirdif, Dubai'],
      'amounts': [320, 185, 540, 95, 420],
      'meds':    ['Augmentin 625mg', 'Zyrtec 10mg', 'Nexium 40mg', 'Panadol Advance', 'Crestor 10mg'],
    },
    'SA': {
      'names':   ['Abdulrahman Al Ghamdi', 'Nora Al Qahtani', 'Faisal Al Otaibi', 'Reem Saleh', 'Sultan Al Harbi'],
      'phones':  ['+966 50 123 4567', '+966 55 987 6543', '+966 53 456 7890', '+966 59 876 5432', '+966 56 654 3210'],
      'addrs':   ['Olaya District, Riyadh', 'Al Malaz, Riyadh', 'Diplomatic Quarter', 'Al Nakheel, Riyadh', 'Al Wurud, Riyadh'],
      'amounts': [420, 210, 780, 115, 560],
      'meds':    ['Glucophage 500mg', 'Coveram 10mg', 'Nexium 40mg', 'Brufen 400mg', 'Vitamin C 1000mg'],
    },
    'KE': {
      'names':   ['John Kamau', 'Mary Wanjiku', 'Peter Otieno', 'Grace Achieng', 'David Mwangi'],
      'phones':  ['+254 722 123 456', '+254 733 987 654', '+254 711 234 567', '+254 700 345 678', '+254 724 456 789'],
      'addrs':   ['Westlands, Nairobi', 'Karen, Nairobi', 'Kilimani, Nairobi', 'Lavington, Nairobi', 'Upperhill, Nairobi'],
      'amounts': [2400, 1200, 5600, 800, 3200],
      'meds':    ['Panadol 500mg', 'Metformin 500mg', 'Amoxil 500mg', 'Flagyl 400mg', 'Brufen 400mg'],
    },
    'BH': {
      'names':   ['Hamad Al Khalifa', 'Fatima Al Dosari', 'Yusuf Buali', 'Reem Al Mannai', 'Ahmed Al Zayani'],
      'phones':  ['+973 3612 3456', '+973 3754 7890', '+973 3867 1234', '+973 3921 5678', '+973 3643 9012'],
      'addrs':   ['Adliya, Manama', 'Juffair, Manama', 'Seef District', 'Hidd, Manama', 'Riffa'],
      'amounts': [88, 44, 165, 32, 122],
      'meds':    ['Augmentin 625mg', 'Lipitor 20mg', 'Seretide Inhaler', 'Vitamin D3', 'Metformin 850mg'],
    },
    'KW': {
      'names':   ['Jaber Al Ahmad', 'Mariam Al Rashidi', 'Faisal Al Mutairi', 'Sara Al Azmi', 'Abdullah Al Osaimi'],
      'phones':  ['+965 9912 3456', '+965 9856 7890', '+965 9734 5678', '+965 9801 2345', '+965 9923 4567'],
      'addrs':   ['Salmiya, Kuwait City', 'Hawalli, Kuwait City', 'Rumaithiya', 'Mishref', 'Salwa'],
      'amounts': [112, 58, 210, 42, 165],
      'meds':    ['Crestor 20mg', 'Concor 5mg', 'Nexium 40mg', 'Panadol Extra', 'Glucovance 500mg'],
    },
    'OM': {
      'names':   ['Said Al Balushi', 'Fatma Al Rawahi', 'Yousef Al Amri', 'Marwa Al Hasni', 'Hamad Al Jahwari'],
      'phones':  ['+968 9512 3456', '+968 9634 7890', '+968 9756 2345', '+968 9812 3456', '+968 9534 6789'],
      'addrs':   ['Qurum, Muscat', 'Madinat Sultan Qaboos', 'Bowsher, Muscat', 'Al Khuwair', 'Muttrah'],
      'amounts': [98, 52, 185, 38, 142],
      'meds':    ['Augmentin 1g', 'Metformin 500mg', 'Zocor 20mg', 'Nurofen 400mg', 'Vitamin B12'],
    },
    'GB': {
      'names':   ['James Smith', 'Emma Thompson', 'Oliver Davies', 'Charlotte Wilson', 'Noah Johnson'],
      'phones':  ['+44 7700 123456', '+44 7911 987654', '+44 7823 456789', '+44 7712 345678', '+44 7634 567890'],
      'addrs':   ['Mayfair, London', 'Shoreditch, London', 'Notting Hill, London', 'Chelsea, London', 'Islington, London'],
      'amounts': [42, 18, 86, 24, 65],
      'meds':    ['Amoxicillin 500mg', 'Metformin 500mg', 'Atorvastatin 20mg', 'Ibuprofen 400mg', 'Ramipril 5mg'],
    },
    'US': {
      'names':   ['Michael Johnson', 'Jennifer Martinez', 'David Kim', 'Ashley Thompson', 'Chris Anderson'],
      'phones':  ['+1 (917) 555-0123', '+1 (718) 555-0456', '+1 (212) 555-0789', '+1 (646) 555-0234', '+1 (347) 555-0567'],
      'addrs':   ['Manhattan, NY', 'Brooklyn, NY', 'Upper East Side, NY', 'Harlem, NY', 'Queens, NY'],
      'amounts': [58, 24, 112, 38, 88],
      'meds':    ['Lisinopril 10mg', 'Metformin 500mg', 'Atorvastatin 40mg', 'Omeprazole 20mg', 'Amlodipine 5mg'],
    },
  };

  SellerOrder _order(
    String id, String name, String phone, String address,
    double total, String currency, SellerOrderStatus status,
    bool hasPrescription, List<String> meds,
  ) {
    final items = meds.map((m) {
      final price = total / meds.length;
      return SellerOrderItem(id: m, name: m, quantity: 1, price: price);
    }).toList();
    return SellerOrder(
      id: id,
      type: SellerOrderType.pharmacy,
      status: status,
      customerId: 'cust_${id.hashCode}',
      customerName: name,
      customerPhone: phone,
      items: items,
      total: total,
      currency: currency,
      paymentMethod: 'Card',
      isPaid: status != SellerOrderStatus.pending,
      deliveryAddress: address,
      createdAt: DateTime.now()
          .subtract(Duration(minutes: (id.hashCode.abs() % 60) + 3)),
      moduleData: {
        'hasPrescription': hasPrescription,
        'pickup_lat': _pickupCoords[currency]?[0] ?? 25.2854,
        'pickup_lng': _pickupCoords[currency]?[1] ?? 51.5310,
        'pickup_address': 'KartSeek Pharmacy',
      },
    );
  }

  static const _pickupCoords = <String, List<double>>{
    'QAR': [25.2854, 51.5310],
    'INR': [19.0760, 72.8777],
    'AED': [25.2048, 55.2708],
    'SAR': [24.7136, 46.6753],
    'KES': [-1.2921, 36.8219],
    'BHD': [26.2154, 50.5832],
    'KWD': [29.3759, 47.9774],
    'OMR': [23.5880, 58.3829],
    'GBP': [51.5074, -0.1278],
    'USD': [40.7128, -74.0060],
  };

  String _currency(String cc) {
    const map = {
      'QA': 'QAR', 'IN': 'INR', 'AE': 'AED', 'SA': 'SAR',
      'KE': 'KES', 'BH': 'BHD', 'KW': 'KWD', 'OM': 'OMR',
      'GB': 'GBP', 'US': 'USD',
    };
    return map[cc] ?? 'QAR';
  }

  // ── Country-Specific Prescriptions ────────────────────────────────────────

  List<PrescriptionModel> _mockPrescriptions(String cc) {
    final d = _rxData[cc] ?? _rxData['QA']!;
    return [
      PrescriptionModel(
        id: 'RX-001', orderId: 'PHM-001',
        customerName: (d['names'] as List)[0] as String,
        customerPhone: (d['phones'] as List)[0] as String,
        doctorName: (d['doctors'] as List)[0] as String,
        imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800',
        status: 'pending',
        uploadedAt: DateTime.now().subtract(const Duration(minutes: 12)),
        medicines: const ['Amoxicillin 500mg × 21 tabs', 'Paracetamol 500mg × 10 tabs'],
      ),
      PrescriptionModel(
        id: 'RX-002', orderId: 'PHM-002',
        customerName: (d['names'] as List)[1] as String,
        customerPhone: (d['phones'] as List)[1] as String,
        doctorName: (d['doctors'] as List)[1] as String,
        imageUrl: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800',
        status: 'verified',
        uploadedAt: DateTime.now().subtract(const Duration(hours: 1, minutes: 20)),
        medicines: const ['Metformin 500mg × 60 tabs', 'Vitamin D3 1000IU × 30 caps'],
      ),
      PrescriptionModel(
        id: 'RX-003', orderId: 'PHM-003',
        customerName: (d['names'] as List)[2] as String,
        customerPhone: (d['phones'] as List)[2] as String,
        doctorName: (d['doctors'] as List)[2] as String,
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
        status: 'pending',
        uploadedAt: DateTime.now().subtract(const Duration(minutes: 34)),
        medicines: const ['Amlodipine 5mg × 30 tabs', 'Atorvastatin 20mg × 30 tabs'],
      ),
      PrescriptionModel(
        id: 'RX-004', orderId: 'PHM-004',
        customerName: (d['names'] as List)[3] as String,
        customerPhone: (d['phones'] as List)[3] as String,
        doctorName: (d['doctors'] as List)[3] as String,
        imageUrl: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800',
        status: 'rejected',
        rejectionReason: 'Prescription is expired (more than 6 months old)',
        uploadedAt: DateTime.now().subtract(const Duration(hours: 3)),
        medicines: const ['Insulin Glargine 100IU/ml'],
      ),
    ];
  }

  static const _rxData = <String, Map<String, dynamic>>{
    'QA': {
      'names':   ['Mohammed Al Kuwari', 'Fatima Al Thani', 'Ahmed Al Rashid', 'Sara Hassan'],
      'phones':  ['+974 5512 3456', '+974 5543 7891', '+974 5567 2345', '+974 5589 1234'],
      'doctors': ['Dr. Khalid Al Marri (Hamad MC)', 'Dr. Sara Ahmed (Al Ahli Hospital)', 'Dr. Yusuf Ibrahim (Sidra MC)', 'Dr. Noura Al Thani (Al Emadi)'],
    },
    'IN': {
      'names':   ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Gupta'],
      'phones':  ['+91 98201 34567', '+91 97692 45678', '+91 96543 12345', '+91 95432 67890'],
      'doctors': ['Dr. Mehta (Lilavati Hospital)', 'Dr. Patel (Kokilaben Hospital)', 'Dr. Sharma (Breach Candy)', 'Dr. Verma (Nanavati Hospital)'],
    },
    'AE': {
      'names':   ['Omar Al Maktoum', 'Hessa Al Falasi', 'Yousuf Juma', 'Laila Rashid'],
      'phones':  ['+971 50 123 4567', '+971 55 987 6543', '+971 56 234 5678', '+971 52 345 6789'],
      'doctors': ['Dr. Al Rashid (Cleveland Clinic UAE)', 'Dr. Hassan (Mediclinic City)', 'Dr. Ibrahim (Aster DM)', 'Dr. Omar (Emirates Hospital)'],
    },
    'SA': {
      'names':   ['Abdulrahman Al Ghamdi', 'Nora Al Qahtani', 'Faisal Al Otaibi', 'Reem Saleh'],
      'phones':  ['+966 50 123 4567', '+966 55 987 6543', '+966 53 456 7890', '+966 59 876 5432'],
      'doctors': ['Dr. Al Shehri (King Faisal Hospital)', 'Dr. Al Zahrani (KFSH&RC)', 'Dr. Al Ghamdi (Dallah Hospital)', 'Dr. Al Otaibi (Kingdom Hospital)'],
    },
    'KE': {
      'names':   ['John Kamau', 'Mary Wanjiku', 'Peter Otieno', 'Grace Achieng'],
      'phones':  ['+254 722 123 456', '+254 733 987 654', '+254 711 234 567', '+254 700 345 678'],
      'doctors': ['Dr. Kamau (Aga Khan Hospital)', 'Dr. Odhiambo (Nairobi Hospital)', 'Dr. Mutua (MP Shah Hospital)', 'Dr. Waweru (Karen Hospital)'],
    },
    'BH': {
      'names':   ['Hamad Al Khalifa', 'Fatima Al Dosari', 'Yusuf Buali', 'Reem Al Mannai'],
      'phones':  ['+973 3612 3456', '+973 3754 7890', '+973 3867 1234', '+973 3921 5678'],
      'doctors': ['Dr. Al Khalifa (Salmaniya MC)', 'Dr. Al Dosari (BDF Hospital)', 'Dr. Buali (American Mission)', 'Dr. Al Mannai (Bahrain Specialist)'],
    },
    'KW': {
      'names':   ['Jaber Al Ahmad', 'Mariam Al Rashidi', 'Faisal Al Mutairi', 'Sara Al Azmi'],
      'phones':  ['+965 9912 3456', '+965 9856 7890', '+965 9734 5678', '+965 9801 2345'],
      'doctors': ['Dr. Al Ahmad (Al Adan Hospital)', 'Dr. Al Rashidi (Mubarak Hospital)', 'Dr. Al Mutairi (Al Sabah Hospital)', 'Dr. Al Azmi (American Hospital)'],
    },
    'OM': {
      'names':   ['Said Al Balushi', 'Fatma Al Rawahi', 'Yousef Al Amri', 'Marwa Al Hasni'],
      'phones':  ['+968 9512 3456', '+968 9634 7890', '+968 9756 2345', '+968 9812 3456'],
      'doctors': ['Dr. Al Balushi (Royal Hospital)', 'Dr. Al Rawahi (Sultan Qaboos Univ)', 'Dr. Al Amri (Khoula Hospital)', 'Dr. Al Hasni (Al Raffah Hospital)'],
    },
    'GB': {
      'names':   ['James Smith', 'Emma Thompson', 'Oliver Davies', 'Charlotte Wilson'],
      'phones':  ['+44 7700 123456', '+44 7911 987654', '+44 7823 456789', '+44 7712 345678'],
      'doctors': ['Dr. Smith (Royal London Hospital)', 'Dr. Patel (St. Thomas\' Hospital)', 'Dr. Davies (King\'s College Hospital)', 'Dr. Williams (Guy\'s Hospital)'],
    },
    'US': {
      'names':   ['Michael Johnson', 'Jennifer Martinez', 'David Kim', 'Ashley Thompson'],
      'phones':  ['+1 (917) 555-0123', '+1 (718) 555-0456', '+1 (212) 555-0789', '+1 (646) 555-0234'],
      'doctors': ['Dr. Johnson (NewYork-Presbyterian)', 'Dr. Martinez (NYU Langone)', 'Dr. Kim (Mount Sinai)', 'Dr. Thompson (Weill Cornell)'],
    },
  };

  // ── Country-Specific Inventory ─────────────────────────────────────────────

  List<PharmacyItem> _mockInventory(String cc) {
    final mul = _priceMul(cc);
    return [
      // ── Pain & Fever ──────────────────────────────────────────────────────
      PharmacyItem(id: 'p001', name: _paracetamolName(cc), category: 'Pain & Fever', emoji: '🌡️',
          price: 8 * mul, stock: 245, minStock: 50, unit: 'strip'),
      PharmacyItem(id: 'p002', name: 'Ibuprofen 400mg', category: 'Pain & Fever', emoji: '💊',
          price: 12 * mul, stock: 180, minStock: 40, unit: 'strip'),
      PharmacyItem(id: 'p003', name: 'Diclofenac Sodium 50mg', category: 'Pain & Fever', emoji: '💊',
          price: 15 * mul, stock: 8, minStock: 30, unit: 'strip'),  // LOW STOCK

      // ── Antibiotics (Rx) ──────────────────────────────────────────────────
      PharmacyItem(id: 'p004', name: 'Amoxicillin 500mg', category: 'Antibiotics', emoji: '🔵',
          price: 28 * mul, stock: 92, minStock: 30, requiresPrescription: true, unit: 'strip'),
      PharmacyItem(id: 'p005', name: 'Azithromycin 500mg', category: 'Antibiotics', emoji: '🔵',
          price: 45 * mul, stock: 4, minStock: 20, requiresPrescription: true, unit: 'strip'),   // LOW STOCK
      PharmacyItem(id: 'p006', name: 'Amoxicillin/Clavulanate 625mg', category: 'Antibiotics', emoji: '🔵',
          price: 62 * mul, stock: 55, minStock: 20, requiresPrescription: true, unit: 'strip'),

      // ── Chronic Disease (Rx) ──────────────────────────────────────────────
      PharmacyItem(id: 'p007', name: 'Metformin 500mg', category: 'Diabetes', emoji: '🩺',
          price: 18 * mul, stock: 310, minStock: 60, requiresPrescription: true, unit: 'strip'),
      PharmacyItem(id: 'p008', name: 'Metformin 850mg', category: 'Diabetes', emoji: '🩺',
          price: 22 * mul, stock: 0, minStock: 60, requiresPrescription: true, unit: 'strip',   isAvailable: false), // OUT
      PharmacyItem(id: 'p009', name: 'Insulin Glargine 100IU/ml', category: 'Diabetes', emoji: '💉',
          price: 125 * mul, stock: 28, minStock: 10, requiresPrescription: true, unit: 'pen'),
      PharmacyItem(id: 'p010', name: 'Atorvastatin 20mg', category: 'Cardiovascular', emoji: '❤️',
          price: 35 * mul, stock: 148, minStock: 40, requiresPrescription: true, unit: 'strip'),
      PharmacyItem(id: 'p011', name: 'Amlodipine 5mg', category: 'Cardiovascular', emoji: '❤️',
          price: 20 * mul, stock: 7, minStock: 30, requiresPrescription: true, unit: 'strip'),   // LOW STOCK
      PharmacyItem(id: 'p012', name: 'Ramipril 5mg', category: 'Cardiovascular', emoji: '❤️',
          price: 25 * mul, stock: 62, minStock: 20, requiresPrescription: true, unit: 'strip'),

      // ── GI & Stomach ──────────────────────────────────────────────────────
      PharmacyItem(id: 'p013', name: 'Omeprazole 20mg', category: 'Gastro', emoji: '🫃',
          price: 22 * mul, stock: 185, minStock: 40, unit: 'cap'),
      PharmacyItem(id: 'p014', name: 'Domperidone 10mg', category: 'Gastro', emoji: '🫃',
          price: 14 * mul, stock: 95, minStock: 30, unit: 'strip'),
      PharmacyItem(id: 'p015', name: 'ORS Sachet', category: 'Gastro', emoji: '💧',
          price: 4 * mul, stock: 320, minStock: 50, unit: 'sachet'),

      // ── Vitamins & Supplements ────────────────────────────────────────────
      PharmacyItem(id: 'p016', name: 'Vitamin D3 2000IU', category: 'Vitamins', emoji: '☀️',
          price: 38 * mul, stock: 210, minStock: 40, unit: 'cap'),
      PharmacyItem(id: 'p017', name: 'Vitamin C 1000mg', category: 'Vitamins', emoji: '🍊',
          price: 25 * mul, stock: 155, minStock: 30, unit: 'tab'),
      PharmacyItem(id: 'p018', name: 'Omega-3 Fish Oil 1000mg', category: 'Vitamins', emoji: '🐟',
          price: 55 * mul, stock: 88, minStock: 20, unit: 'cap'),
      PharmacyItem(id: 'p019', name: 'Zinc 50mg', category: 'Vitamins', emoji: '💊',
          price: 18 * mul, stock: 0, minStock: 30, isAvailable: false, unit: 'tab'),             // OUT

      // ── Allergy & Respiratory ─────────────────────────────────────────────
      PharmacyItem(id: 'p020', name: 'Cetirizine 10mg', category: 'Allergy', emoji: '🤧',
          price: 16 * mul, stock: 175, minStock: 40, unit: 'strip'),
      PharmacyItem(id: 'p021', name: 'Loratadine 10mg', category: 'Allergy', emoji: '🤧',
          price: 18 * mul, stock: 130, minStock: 30, unit: 'strip'),
      PharmacyItem(id: 'p022', name: 'Salbutamol Inhaler 100mcg', category: 'Respiratory', emoji: '💨',
          price: 85 * mul, stock: 14, minStock: 10, requiresPrescription: true, unit: 'inhaler'),

      // ── First Aid ─────────────────────────────────────────────────────────
      PharmacyItem(id: 'p023', name: 'Povidone-Iodine Solution', category: 'First Aid', emoji: '🩹',
          price: 22 * mul, stock: 65, minStock: 20, unit: 'bottle'),
      PharmacyItem(id: 'p024', name: 'Sterile Gauze Roll', category: 'First Aid', emoji: '🩹',
          price: 12 * mul, stock: 88, minStock: 20, unit: 'roll'),
      PharmacyItem(id: 'p025', name: 'Blood Glucose Test Strip', category: 'Devices', emoji: '🩸',
          price: 75 * mul, stock: 22, minStock: 10, unit: 'box'),
    ];
  }

  String _paracetamolName(String cc) {
    const names = {
      'QA': 'Panadol Extra 500mg',  'IN': 'Crocin 500mg',
      'AE': 'Panadol Advance 500mg', 'SA': 'Panadol 500mg',
      'KE': 'Panadol 500mg',        'BH': 'Panadol Extra 500mg',
      'KW': 'Panadol Extra 500mg',  'OM': 'Panadol 500mg',
      'GB': 'Paracetamol 500mg',    'US': 'Acetaminophen 500mg (Tylenol)',
    };
    return names[cc] ?? 'Paracetamol 500mg';
  }

  double _priceMul(String cc) {
    const muls = {
      'QA': 1.0, 'IN': 4.5, 'AE': 1.0, 'SA': 1.0,
      'KE': 16.0, 'BH': 0.1, 'KW': 0.08, 'OM': 0.1,
      'GB': 0.22, 'US': 0.27,
    };
    return muls[cc] ?? 1.0;
  }
}
