/// KARTSEEK Partner App — Delivery Task Model
class DeliveryTask {
  final String id;
  final String customerName;
  final String? customerPhone;
  final String sellerName;
  final String pickupAddress;
  final double pickupLat;
  final double pickupLng;
  final String dropAddress;
  final double dropLat;
  final double dropLng;
  final String? productName;
  final String? orderType;
  final double orderAmount;
  final double? codAmount;
  final double distance;
  final double deliveryFee;
  final DeliveryStatus status;
  final String? otp;
  final DateTime requestedAt;
  final DateTime? acceptedAt;
  final DateTime? pickedUpAt;
  final DateTime? deliveredAt;
  final double? deliveryBoyEarnings;
  final double? commissionDeducted;
  final double? rating;
  final int countdownSeconds;

  const DeliveryTask({
    required this.id, required this.customerName, this.customerPhone,
    required this.sellerName, required this.pickupAddress,
    required this.pickupLat, required this.pickupLng,
    required this.dropAddress, required this.dropLat, required this.dropLng,
    this.productName, this.orderType, required this.orderAmount,
    this.codAmount, required this.distance, required this.deliveryFee,
    this.status = DeliveryStatus.taskRequested, this.otp,
    required this.requestedAt, this.acceptedAt, this.pickedUpAt, this.deliveredAt,
    this.deliveryBoyEarnings, this.commissionDeducted, this.rating,
    this.countdownSeconds = 30,
  });

  factory DeliveryTask.fromJson(Map<String, dynamic> j) => DeliveryTask(
    id: j['id'] ?? '', customerName: j['customer_name'] ?? '',
    customerPhone: j['customer_phone'], sellerName: j['seller_name'] ?? '',
    pickupAddress: j['pickup_address'] ?? '',
    pickupLat: (j['pickup_lat'] ?? 0).toDouble(),
    pickupLng: (j['pickup_lng'] ?? 0).toDouble(),
    dropAddress: j['drop_address'] ?? '',
    dropLat: (j['drop_lat'] ?? 0).toDouble(),
    dropLng: (j['drop_lng'] ?? 0).toDouble(),
    productName: j['product_name'], orderType: j['order_type'],
    orderAmount: (j['order_amount'] ?? 0).toDouble(),
    codAmount: j['cod_amount']?.toDouble(),
    distance: (j['distance'] ?? 0).toDouble(),
    deliveryFee: (j['delivery_fee'] ?? 0).toDouble(),
    status: DeliveryStatus.fromString(j['status'] ?? 'task_requested'),
    otp: j['otp'], requestedAt: DateTime.now(),
  );

  bool get isCod => codAmount != null && codAmount! > 0;

  static DeliveryTask mock() => DeliveryTask(
    id: 'DEL-782', customerName: 'Mary N.',
    customerPhone: '+254700444555', sellerName: 'FreshMart Supermarket',
    pickupAddress: 'FreshMart Store', pickupLat: -1.2670, pickupLng: 36.8110,
    dropAddress: '23 Riverside Drive', dropLat: -1.2720, dropLng: 36.7950,
    productName: 'Grocery Order', orderType: 'grocery',
    orderAmount: 2450, codAmount: 2450, distance: 3.2, deliveryFee: 150,
    otp: '7391', requestedAt: DateTime.now(),
  );

  static List<DeliveryTask> mockHistory() => [
    DeliveryTask(
      id: 'DEL-781', customerName: 'Alice M.',
      sellerName: 'Mama Rocks Kitchen', pickupAddress: 'Mama Rocks, Downtown',
      pickupLat: -1.2948, pickupLng: 36.7861,
      dropAddress: 'Upperhill Towers', dropLat: -1.2963, dropLng: 36.8164,
      orderAmount: 850, distance: 4.1, deliveryFee: 120,
      status: DeliveryStatus.delivered,
      requestedAt: DateTime.now().subtract(const Duration(hours: 4)),
      deliveredAt: DateTime.now().subtract(const Duration(hours: 3)),
      deliveryBoyEarnings: 96, commissionDeducted: 24, rating: 5.0,
    ),
    DeliveryTask(
      id: 'DEL-780', customerName: 'David O.',
      sellerName: 'MedPlus Pharmacy', pickupAddress: 'MedPlus, Main Road',
      pickupLat: -1.3005, pickupLng: 36.7720,
      dropAddress: 'South Shopping Centre', dropLat: -1.3122, dropLng: 36.8262,
      orderAmount: 1200, codAmount: 1200, distance: 6.8, deliveryFee: 180,
      status: DeliveryStatus.delivered,
      requestedAt: DateTime.now().subtract(const Duration(hours: 8)),
      deliveredAt: DateTime.now().subtract(const Duration(hours: 7)),
      deliveryBoyEarnings: 144, commissionDeducted: 36, rating: 4.0,
    ),
  ];
}

enum DeliveryStatus {
  deliveryBoyOffline('delivery_boy_offline'),
  deliveryBoyOnline('delivery_boy_online'),
  taskRequested('task_requested'), taskAccepted('task_accepted'),
  taskRejected('task_rejected'), goingToPickup('going_to_pickup'),
  arrivedAtPickup('arrived_at_pickup'), pickupConfirmed('pickup_confirmed'),
  outForDelivery('out_for_delivery'), arrivedAtDrop('arrived_at_drop'),
  otpVerified('otp_verified'), delivered('delivered'),
  paymentCollected('payment_collected'), failedDelivery('failed_delivery'),
  cancelled('cancelled'), returnRequested('return_requested'),
  returnPickedUp('return_picked_up'), returnedToSeller('returned_to_seller');

  final String value;
  const DeliveryStatus(this.value);
  static DeliveryStatus fromString(String s) {
    for (final st in DeliveryStatus.values) { if (st.value == s) return st; }
    return DeliveryStatus.deliveryBoyOffline;
  }
  String get displayName => value.replaceAll('_', ' ').split(' ')
    .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
    .join(' ');
}
