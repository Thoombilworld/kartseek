import 'package:equatable/equatable.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

enum HotelBlocStatus { initial, loading, loaded, error }

enum RoomStatus { available, occupied, cleaning, maintenance, outOfOrder }

// ─────────────────────────────────────────────────────────────────────────────
// HotelBookingModel
// ─────────────────────────────────────────────────────────────────────────────

class HotelBookingModel {
  final String id;
  final String guestName;
  final String? guestPhone;
  final String? guestEmail;
  final String? guestNationality;
  final String roomType;
  final int roomNumber;
  final DateTime checkIn;
  final DateTime checkOut;
  final double totalAmount;
  final double? paidAmount;
  final String status; // 'upcoming' | 'checked_in' | 'checked_out' | 'cancelled'
  final String paymentMethod; // 'card' | 'cash' | 'online' | 'corporate'
  final bool isPaid;
  final int adults;
  final int children;
  final String? specialRequests;
  final String? platform; // 'app' | 'web' | 'walk_in' | 'booking_com' | 'expedia'
  final String source;

  const HotelBookingModel({
    required this.id,
    required this.guestName,
    this.guestPhone,
    this.guestEmail,
    this.guestNationality,
    required this.roomType,
    required this.roomNumber,
    required this.checkIn,
    required this.checkOut,
    required this.totalAmount,
    this.paidAmount,
    this.status = 'upcoming',
    this.paymentMethod = 'card',
    this.isPaid = false,
    this.adults = 2,
    this.children = 0,
    this.specialRequests,
    this.platform,
    this.source = 'app',
  });

  factory HotelBookingModel.fromJson(Map<String, dynamic> json) => HotelBookingModel(
    id:                json['id'] as String? ?? '',
    guestName:         json['guest_name'] as String? ?? 'Guest',
    guestPhone:        json['guest_phone'] as String?,
    guestEmail:        json['guest_email'] as String?,
    guestNationality:  json['guest_nationality'] as String?,
    roomType:          json['room_type'] as String? ?? 'Standard',
    roomNumber:        json['room_number'] as int? ?? 1,
    checkIn:           DateTime.tryParse(json['check_in'] as String? ?? '') ?? DateTime.now(),
    checkOut:          DateTime.tryParse(json['check_out'] as String? ?? '') ?? DateTime.now().add(const Duration(days: 1)),
    totalAmount:       (json['total_amount'] as num?)?.toDouble() ?? 0.0,
    paidAmount:        (json['paid_amount'] as num?)?.toDouble(),
    status:            json['status'] as String? ?? 'upcoming',
    paymentMethod:     json['payment_method'] as String? ?? 'card',
    isPaid:            json['is_paid'] as bool? ?? false,
    adults:            json['adults'] as int? ?? 2,
    children:          json['children'] as int? ?? 0,
    specialRequests:   json['special_requests'] as String?,
    platform:          json['platform'] as String?,
    source:            json['source'] as String? ?? 'app',
  );

  HotelBookingModel copyWith({
    String? status,
    String? specialRequests,
    double? paidAmount,
    bool? isPaid,
  }) => HotelBookingModel(
    id: id, guestName: guestName, guestPhone: guestPhone,
    guestEmail: guestEmail, guestNationality: guestNationality,
    roomType: roomType, roomNumber: roomNumber, checkIn: checkIn,
    checkOut: checkOut, totalAmount: totalAmount,
    paidAmount: paidAmount ?? this.paidAmount,
    status: status ?? this.status, paymentMethod: paymentMethod,
    isPaid: isPaid ?? this.isPaid, adults: adults, children: children,
    specialRequests: specialRequests ?? this.specialRequests,
    platform: platform, source: source,
  );

  int get nights => checkOut.difference(checkIn).inDays.clamp(1, 999);
  double get balance => totalAmount - (paidAmount ?? (isPaid ? totalAmount : 0.0));
  double get pricePerNight => totalAmount / nights;

  // ── Country-specific mock data ──────────────────────────────────────────────

  static List<HotelBookingModel> mockForCountry(String countryCode) {
    final countryData = <String, List<Map<String, dynamic>>>{
      'IN': [
        {'guest': 'Rahul Verma',         'phone': '+91 98100 12345', 'nat': 'Indian',    'room': 'Deluxe',   'num': 201, 'nights': 2, 'rate': 8500.0,  'status': 'checked_in',  'paid': true,  'adults': 2, 'src': 'app',         'req': 'Extra pillow'},
        {'guest': 'Priya Sharma',        'phone': '+91 88005 67890', 'nat': 'Indian',    'room': 'Suite',    'num': 301, 'nights': 5, 'rate': 18000.0, 'status': 'upcoming',    'paid': true,  'adults': 2, 'src': 'booking_com', 'req': 'High floor'},
        {'guest': 'David Wilson',        'phone': '+1 415 555 0102', 'nat': 'American',  'room': 'Standard', 'num': 102, 'nights': 1, 'rate': 4500.0,  'status': 'checked_in',  'paid': true,  'adults': 1, 'src': 'expedia',     'req': null},
        {'guest': 'Ananya Krishnamurthy','phone': '+91 70000 11223', 'nat': 'Indian',    'room': 'Deluxe',   'num': 205, 'nights': 3, 'rate': 8500.0,  'status': 'upcoming',    'paid': false, 'adults': 2, 'src': 'web',         'req': 'Late checkout'},
        {'guest': 'Hiroshi Tanaka',      'phone': '+81 3-1234-5678', 'nat': 'Japanese',  'room': 'Suite',    'num': 302, 'nights': 4, 'rate': 18000.0, 'status': 'checked_out', 'paid': true,  'adults': 2, 'src': 'app',         'req': null},
        {'guest': 'Meena Pillai',        'phone': '+91 94450 33221', 'nat': 'Indian',    'room': 'Standard', 'num': 105, 'nights': 2, 'rate': 4500.0,  'status': 'upcoming',    'paid': true,  'adults': 3, 'src': 'app',         'req': 'Extra bed'},
      ],
      'AE': [
        {'guest': 'Mohammed Al Rashid',  'phone': '+971 50 123 4567','nat': 'Emirati',   'room': 'Suite',    'num': 501, 'nights': 3, 'rate': 1200.0,  'status': 'checked_in',  'paid': true,  'adults': 2, 'src': 'app',         'req': 'Sea view room'},
        {'guest': 'Sarah Johnson',       'phone': '+1 212 555 7890', 'nat': 'American',  'room': 'Deluxe',   'num': 402, 'nights': 7, 'rate': 750.0,   'status': 'upcoming',    'paid': true,  'adults': 2, 'src': 'booking_com', 'req': 'Airport shuttle'},
        {'guest': 'Aisha Al Zahra',      'phone': '+971 55 987 6543','nat': 'Emirati',   'room': 'Standard', 'num': 201, 'nights': 2, 'rate': 450.0,   'status': 'checked_out', 'paid': true,  'adults': 1, 'src': 'expedia',     'req': null},
        {'guest': 'Rajesh Nair',         'phone': '+91 99001 11234', 'nat': 'Indian',    'room': 'Deluxe',   'num': 405, 'nights': 4, 'rate': 750.0,   'status': 'upcoming',    'paid': false, 'adults': 2, 'src': 'web',         'req': 'Early checkin'},
        {'guest': 'Elena Petrov',        'phone': '+7 495 123 4567', 'nat': 'Russian',   'room': 'Suite',    'num': 502, 'nights': 5, 'rate': 1200.0,  'status': 'upcoming',    'paid': true,  'adults': 2, 'src': 'app',         'req': null},
        {'guest': 'Khalid Al Falasi',    'phone': '+971 50 456 7891','nat': 'Emirati',   'room': 'Penthouse','num': 1001,'nights': 2, 'rate': 3500.0,  'status': 'checked_in',  'paid': true,  'adults': 4, 'src': 'app',         'req': 'Birthday setup'},
      ],
      'SA': [
        {'guest': 'Prince Turki Al Saud','phone': '+966 50 111 2222','nat': 'Saudi',     'room': 'Suite',    'num': 601, 'nights': 5, 'rate': 2500.0,  'status': 'checked_in',  'paid': true,  'adults': 3, 'src': 'app',         'req': 'VIP service'},
        {'guest': 'Omar Farouk',         'phone': '+966 55 333 4444','nat': 'Egyptian',  'room': 'Deluxe',   'num': 302, 'nights': 3, 'rate': 900.0,   'status': 'upcoming',    'paid': true,  'adults': 2, 'src': 'booking_com', 'req': null},
        {'guest': 'Fatima Al Ghamdi',    'phone': '+966 59 777 8888','nat': 'Saudi',     'room': 'Standard', 'num': 105, 'nights': 2, 'rate': 500.0,   'status': 'checked_out', 'paid': true,  'adults': 2, 'src': 'app',         'req': 'Qibla direction'},
        {'guest': 'Ahmed Hassan',        'phone': '+20 100 123 4567','nat': 'Egyptian',  'room': 'Deluxe',   'num': 305, 'nights': 7, 'rate': 900.0,   'status': 'upcoming',    'paid': false, 'adults': 2, 'src': 'expedia',     'req': 'Halal breakfast'},
        {'guest': 'Noura Al Qahtani',    'phone': '+966 55 222 3333','nat': 'Saudi',     'room': 'Suite',    'num': 602, 'nights': 4, 'rate': 2500.0,  'status': 'upcoming',    'paid': true,  'adults': 2, 'src': 'app',         'req': null},
      ],
      'QA': [
        {'guest': 'Sheikh Hamad',        'phone': '+974 5555 1234',  'nat': 'Qatari',    'room': 'Suite',    'num': 801, 'nights': 3, 'rate': 2200.0,  'status': 'checked_in',  'paid': true,  'adults': 2, 'src': 'app',         'req': 'VIP welcome'},
        {'guest': 'Liam O\'Brien',       'phone': '+353 87 123 4567','nat': 'Irish',     'room': 'Deluxe',   'num': 402, 'nights': 5, 'rate': 800.0,   'status': 'upcoming',    'paid': true,  'adults': 2, 'src': 'booking_com', 'req': null},
        {'guest': 'Wei Zhang',           'phone': '+86 139 0013 8888','nat': 'Chinese',  'room': 'Standard', 'num': 203, 'nights': 2, 'rate': 450.0,   'status': 'checked_out', 'paid': true,  'adults': 1, 'src': 'expedia',     'req': null},
        {'guest': 'Yousef Al Attiya',    'phone': '+974 5566 7788',  'nat': 'Qatari',    'room': 'Suite',    'num': 802, 'nights': 7, 'rate': 2200.0,  'status': 'upcoming',    'paid': false, 'adults': 3, 'src': 'web',         'req': 'World Cup package'},
      ],
      'GB': [
        {'guest': 'James Whitfield',     'phone': '+44 7700 900123', 'nat': 'British',   'room': 'Deluxe',   'num': 204, 'nights': 2, 'rate': 280.0,   'status': 'checked_in',  'paid': true,  'adults': 2, 'src': 'app',         'req': null},
        {'guest': 'Sophie Clarke',       'phone': '+44 7911 123456', 'nat': 'British',   'room': 'Standard', 'num': 101, 'nights': 1, 'rate': 150.0,   'status': 'upcoming',    'paid': true,  'adults': 1, 'src': 'booking_com', 'req': 'Quiet room'},
        {'guest': 'Arjun Patel',         'phone': '+44 7700 234567', 'nat': 'British',   'room': 'Suite',    'num': 301, 'nights': 3, 'rate': 520.0,   'status': 'checked_in',  'paid': true,  'adults': 2, 'src': 'expedia',     'req': null},
        {'guest': 'Emma Thompson',       'phone': '+44 7800 111222', 'nat': 'British',   'room': 'Deluxe',   'num': 207, 'nights': 4, 'rate': 280.0,   'status': 'upcoming',    'paid': false, 'adults': 2, 'src': 'app',         'req': 'Anniversary setup'},
        {'guest': 'Marco Rossi',         'phone': '+39 06 1234 5678','nat': 'Italian',   'room': 'Standard', 'num': 104, 'nights': 2, 'rate': 150.0,   'status': 'checked_out', 'paid': true,  'adults': 1, 'src': 'web',         'req': null},
      ],
      'US': [
        {'guest': 'Michael Johnson',     'phone': '+1 212 555 0101', 'nat': 'American',  'room': 'Suite',    'num': 1201,'nights': 3, 'rate': 650.0,   'status': 'checked_in',  'paid': true,  'adults': 2, 'src': 'app',         'req': 'City view'},
        {'guest': 'Emily Rodriguez',     'phone': '+1 310 555 0202', 'nat': 'American',  'room': 'Deluxe',   'num': 504, 'nights': 2, 'rate': 380.0,   'status': 'upcoming',    'paid': true,  'adults': 2, 'src': 'booking_com', 'req': null},
        {'guest': 'David Kim',           'phone': '+1 415 555 0303', 'nat': 'Korean-Am', 'room': 'Standard', 'num': 203, 'nights': 1, 'rate': 220.0,   'status': 'checked_out', 'paid': true,  'adults': 1, 'src': 'expedia',     'req': null},
        {'guest': 'Jennifer Walsh',      'phone': '+1 617 555 0404', 'nat': 'American',  'room': 'Suite',    'num': 1202,'nights': 5, 'rate': 650.0,   'status': 'upcoming',    'paid': false, 'adults': 2, 'src': 'app',         'req': 'Late checkout 2pm'},
        {'guest': 'Carlos Mendez',       'phone': '+1 786 555 0505', 'nat': 'Hispanic',  'room': 'Deluxe',   'num': 506, 'nights': 4, 'rate': 380.0,   'status': 'upcoming',    'paid': true,  'adults': 2, 'src': 'web',         'req': null},
      ],
    };

    final data = countryData[countryCode] ?? countryData['AE']!;
    return data.asMap().entries.map((e) {
      final d = e.value;
      final nights = d['nights'] as int;
      final rate   = d['rate'] as double;
      return HotelBookingModel(
        id:               'BKG-${1000 + e.key}',
        guestName:        d['guest'] as String,
        guestPhone:       d['phone'] as String,
        guestNationality: d['nat'] as String,
        roomType:         d['room'] as String,
        roomNumber:       d['num'] as int,
        checkIn:          DateTime.now().subtract(Duration(days: d['status'] == 'checked_out' ? 3 : 0)),
        checkOut:         DateTime.now().add(Duration(days: nights)),
        totalAmount:      rate * nights,
        status:           d['status'] as String,
        paymentMethod:    'card',
        isPaid:           d['paid'] as bool,
        adults:           d['adults'] as int,
        children:         0,
        specialRequests:  d['req'] as String?,
        platform:         d['src'] as String,
        source:           d['src'] as String,
      );
    }).toList();
  }

  static HotelBookingModel mock() => HotelBookingModel(
    id: 'BKG-001', guestName: 'Ravi Shankar', guestPhone: '+91 98100 12345',
    guestNationality: 'Indian', roomType: 'Deluxe', roomNumber: 201,
    checkIn: DateTime.now(), checkOut: DateTime.now().add(const Duration(days: 2)),
    totalAmount: 17000, status: 'upcoming', isPaid: true, adults: 2,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HotelRoomModel
// ─────────────────────────────────────────────────────────────────────────────

class HotelRoomModel {
  final String id;
  final int number;
  final int floor;
  final String type; // 'Standard' | 'Deluxe' | 'Suite' | 'Penthouse'
  final RoomStatus status;
  final double pricePerNight;
  final List<String> amenities;
  final String? currentGuestId;
  final String? currentGuestName;
  final DateTime? cleaningScheduled;
  final String? notes;
  final double? rating;
  final int maxGuests;

  const HotelRoomModel({
    required this.id,
    required this.number,
    required this.floor,
    required this.type,
    required this.status,
    required this.pricePerNight,
    this.amenities = const [],
    this.currentGuestId,
    this.currentGuestName,
    this.cleaningScheduled,
    this.notes,
    this.rating,
    this.maxGuests = 2,
  });

  HotelRoomModel copyWith({RoomStatus? status, String? notes, double? pricePerNight}) =>
      HotelRoomModel(
        id: id, number: number, floor: floor, type: type,
        status: status ?? this.status,
        pricePerNight: pricePerNight ?? this.pricePerNight,
        amenities: amenities, currentGuestId: currentGuestId,
        currentGuestName: currentGuestName, cleaningScheduled: cleaningScheduled,
        notes: notes ?? this.notes, rating: rating, maxGuests: maxGuests,
      );

  // Country-specific room catalogs
  static List<HotelRoomModel> mockForCountry(String cc) {
    final rates = <String, Map<String, double>>{
      'IN': {'Standard': 4500,  'Deluxe': 8500,  'Suite': 18000, 'Penthouse': 45000},
      'AE': {'Standard': 450,   'Deluxe': 750,   'Suite': 1200,  'Penthouse': 3500},
      'SA': {'Standard': 500,   'Deluxe': 900,   'Suite': 2500,  'Penthouse': 5000},
      'QA': {'Standard': 450,   'Deluxe': 800,   'Suite': 2200,  'Penthouse': 4800},
      'GB': {'Standard': 150,   'Deluxe': 280,   'Suite': 520,   'Penthouse': 1200},
      'US': {'Standard': 220,   'Deluxe': 380,   'Suite': 650,   'Penthouse': 1500},
    };
    final r = rates[cc] ?? rates['AE']!;

    final roomDefs = [
      // Floor 1 - Standard
      (101, 1, 'Standard', [RoomStatus.available, RoomStatus.occupied, RoomStatus.available, RoomStatus.cleaning]),
      (102, 1, 'Standard', [RoomStatus.occupied, RoomStatus.available, RoomStatus.maintenance, RoomStatus.available]),
      (103, 1, 'Standard', [RoomStatus.available, RoomStatus.occupied, RoomStatus.available, RoomStatus.available]),
      (104, 1, 'Standard', [RoomStatus.cleaning, RoomStatus.available, RoomStatus.occupied, RoomStatus.available]),
      (105, 1, 'Standard', [RoomStatus.available, RoomStatus.occupied, RoomStatus.available, RoomStatus.available]),
      // Floor 2 - Deluxe
      (201, 2, 'Deluxe',   [RoomStatus.occupied, RoomStatus.occupied, RoomStatus.available, RoomStatus.available]),
      (202, 2, 'Deluxe',   [RoomStatus.available, RoomStatus.occupied, RoomStatus.available, RoomStatus.occupied]),
      (203, 2, 'Deluxe',   [RoomStatus.occupied, RoomStatus.available, RoomStatus.cleaning, RoomStatus.available]),
      (204, 2, 'Deluxe',   [RoomStatus.available, RoomStatus.occupied, RoomStatus.available, RoomStatus.occupied]),
      (205, 2, 'Deluxe',   [RoomStatus.occupied, RoomStatus.available, RoomStatus.occupied, RoomStatus.maintenance]),
      // Floor 3 - Suite
      (301, 3, 'Suite',    [RoomStatus.occupied, RoomStatus.available, RoomStatus.occupied, RoomStatus.available]),
      (302, 3, 'Suite',    [RoomStatus.available, RoomStatus.occupied, RoomStatus.available, RoomStatus.occupied]),
      (303, 3, 'Suite',    [RoomStatus.occupied, RoomStatus.available, RoomStatus.available, RoomStatus.occupied]),
      // Floor 10 - Penthouse
      (1001, 10, 'Penthouse', [RoomStatus.available, RoomStatus.occupied, RoomStatus.available, RoomStatus.available]),
      (1002, 10, 'Penthouse', [RoomStatus.occupied, RoomStatus.available, RoomStatus.available, RoomStatus.available]),
    ];

    final amenitySets = {
      'Standard': ['WiFi', 'AC', 'TV', 'Bathroom'],
      'Deluxe':   ['WiFi', 'AC', 'Smart TV', 'Bathtub', 'Mini Bar', 'Room Service'],
      'Suite':    ['WiFi', 'AC', 'Smart TV', 'Jacuzzi', 'Mini Bar', 'Room Service', 'Lounge', 'Kitchenette'],
      'Penthouse':['WiFi', 'AC', 'Smart TV', 'Private Pool', 'Butler', 'Full Kitchen', 'Private Terrace', 'Gym Access'],
    };

    final guests = ['Ravi Shankar', 'Sarah J.', 'Omar A.', 'Priya S.', 'David W.', 'Aisha Z.', 'James W.'];

    return roomDefs.asMap().entries.map((e) {
      final i    = e.key;
      final def  = e.value;
      final num  = def.$1;
      final flr  = def.$2;
      final type = def.$3;
      final sts  = def.$4[i % def.$4.length];
      final price = r[type] ?? 500;
      final isOccupied = sts == RoomStatus.occupied;

      return HotelRoomModel(
        id:               'ROOM-$num',
        number:           num,
        floor:            flr,
        type:             type,
        status:           sts,
        pricePerNight:    price,
        amenities:        amenitySets[type] ?? ['WiFi', 'AC'],
        currentGuestName: isOccupied ? guests[i % guests.length] : null,
        maxGuests:        type == 'Penthouse' ? 6 : type == 'Suite' ? 4 : type == 'Deluxe' ? 3 : 2,
      );
    }).toList();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HotelAnalyticsData
// ─────────────────────────────────────────────────────────────────────────────

class HotelAnalyticsData {
  final List<double> weeklyRevenue;
  final List<double> weeklyOccupancy; // 0.0–1.0
  final List<double> monthlyRevenue;
  final double adr; // Average Daily Rate
  final double revPar; // Revenue per Available Room
  final double occupancyRate;
  final int totalBookings;
  final int newBookings;
  final Map<String, double> revenueByType; // room type -> revenue
  final Map<String, int> bookingsByPlatform; // platform -> count

  const HotelAnalyticsData({
    required this.weeklyRevenue,
    required this.weeklyOccupancy,
    required this.monthlyRevenue,
    required this.adr,
    required this.revPar,
    required this.occupancyRate,
    required this.totalBookings,
    required this.newBookings,
    required this.revenueByType,
    required this.bookingsByPlatform,
  });

  static HotelAnalyticsData forCountry(String cc) {
    const data = <String, List<double>>{
      'IN': [42000, 58000, 35000, 71000, 63000, 89000, 55000],
      'AE': [18000, 24000, 14000, 32000, 27000, 41000, 22000],
      'SA': [22000, 30000, 18000, 38000, 31000, 46000, 25000],
      'QA': [19000, 26000, 15000, 34000, 28000, 43000, 23000],
      'GB': [6500,  9200,  5100,  12000, 10500, 15800, 8200],
      'US': [9800,  14000, 7800,  18500, 15500, 24000, 12500],
    };
    const occ = <String, List<double>>{
      'IN': [0.62, 0.75, 0.55, 0.85, 0.78, 0.91, 0.70],
      'AE': [0.68, 0.80, 0.52, 0.88, 0.75, 0.92, 0.71],
      'SA': [0.65, 0.77, 0.58, 0.84, 0.72, 0.89, 0.68],
      'QA': [0.70, 0.82, 0.60, 0.90, 0.80, 0.95, 0.75],
      'GB': [0.60, 0.72, 0.50, 0.80, 0.70, 0.85, 0.65],
      'US': [0.65, 0.78, 0.55, 0.85, 0.75, 0.90, 0.70],
    };
    const adrMap = {'IN': 8500.0, 'AE': 750.0, 'SA': 900.0, 'QA': 800.0, 'GB': 280.0, 'US': 380.0};
    const monthly = <String, List<double>>{
      'IN': [320000, 280000, 350000, 290000, 370000, 420000, 390000, 450000, 410000, 480000, 500000, 540000],
      'AE': [140000, 120000, 160000, 130000, 170000, 195000, 180000, 210000, 195000, 225000, 240000, 260000],
      'SA': [180000, 155000, 200000, 165000, 210000, 245000, 225000, 260000, 240000, 275000, 295000, 320000],
      'QA': [155000, 130000, 175000, 145000, 185000, 215000, 200000, 230000, 210000, 245000, 265000, 290000],
      'GB': [52000,  45000,  58000,  48000,  62000,  72000,  68000,  78000,  72000,  83000,  88000,  96000],
      'US': [78000,  68000,  87000,  72000,  93000, 108000, 101000, 116000, 107000, 124000, 132000, 144000],
    };

    final rev     = data[cc] ?? data['AE']!;
    final occList = occ[cc] ?? occ['AE']!;
    final adr     = adrMap[cc] ?? 750.0;
    final monthly_ = monthly[cc] ?? monthly['AE']!;

    return HotelAnalyticsData(
      weeklyRevenue:        rev,
      weeklyOccupancy:      occList,
      monthlyRevenue:       monthly_,
      adr:                  adr,
      revPar:               adr * (occList.reduce((a, b) => a + b) / occList.length),
      occupancyRate:        occList.reduce((a, b) => a + b) / occList.length,
      totalBookings:        cc == 'IN' ? 284 : cc == 'AE' ? 198 : cc == 'SA' ? 167 : cc == 'QA' ? 143 : cc == 'GB' ? 122 : 156,
      newBookings:          cc == 'IN' ? 14 : cc == 'AE' ? 9 : cc == 'SA' ? 7 : cc == 'QA' ? 6 : cc == 'GB' ? 5 : 8,
      revenueByType:  const {'Standard': 0.20, 'Deluxe': 0.35, 'Suite': 0.30, 'Penthouse': 0.15},
      bookingsByPlatform: const {'App': 45, 'Web': 20, 'Booking.com': 20, 'Expedia': 10, 'Walk-in': 5},
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HotelStaffModel
// ─────────────────────────────────────────────────────────────────────────────

class HotelStaffModel {
  final String id;
  final String name;
  final String role; // 'receptionist' | 'housekeeping' | 'maintenance' | 'manager' | 'chef'
  final String phone;
  final String shift; // 'morning' | 'afternoon' | 'night'
  final bool isOnDuty;
  final String status; // 'active' | 'on_leave' | 'off_duty'

  const HotelStaffModel({
    required this.id,
    required this.name,
    required this.role,
    required this.phone,
    required this.shift,
    this.isOnDuty = false,
    this.status = 'active',
  });

  static HotelStaffModel copyWith(HotelStaffModel s, {bool? isOnDuty, String? status}) =>
      HotelStaffModel(
        id: s.id, name: s.name, role: s.role, phone: s.phone, shift: s.shift,
        isOnDuty: isOnDuty ?? s.isOnDuty, status: status ?? s.status,
      );

  static List<HotelStaffModel> mockForCountry(String cc) {
    final names = <String, List<List<String>>>{
      'IN': [['Suresh Kumar', 'receptionist'], ['Meena Bai', 'housekeeping'], ['Rajan Singh', 'maintenance'], ['Priya Gupta', 'manager'], ['Rohan Chef', 'chef']],
      'AE': [['Ahmed Salem', 'receptionist'], ['Maria Joao', 'housekeeping'], ['Fahad Al Mulla', 'maintenance'], ['Hessa Al Nuaimi', 'manager'], ['Marco Polo', 'chef']],
      'SA': [['Ibrahim Al Zahrani', 'receptionist'], ['Nadia Karimi', 'housekeeping'], ['Saad Al Ghamdi', 'maintenance'], ['Noura Al Qahtani', 'manager'], ['Hassan Ali', 'chef']],
      'QA': [['Yousef Al Meer', 'receptionist'], ['Blessy Jose', 'housekeeping'], ['Tariq Al Kuwari', 'maintenance'], ['Maryam Al Kuwari', 'manager'], ['Chef Romano', 'chef']],
      'GB': [['Oliver Smith', 'receptionist'], ['Sophie Green', 'housekeeping'], ['Jake Williams', 'maintenance'], ['Emma Clarke', 'manager'], ['Chef Pierre', 'chef']],
      'US': [['Michael Brown', 'receptionist'], ['Rosa Hernandez', 'housekeeping'], ['James Davis', 'maintenance'], ['Jennifer Lee', 'manager'], ['Chef Antoine', 'chef']],
    };
    final list = names[cc] ?? names['AE']!;
    final shifts = ['morning', 'afternoon', 'morning', 'morning', 'afternoon'];
    return list.asMap().entries.map((e) => HotelStaffModel(
      id:       'STF-${e.key + 1}',
      name:     e.value[0],
      role:     e.value[1],
      phone:    '+1 555 000 000${e.key}',
      shift:    shifts[e.key % shifts.length],
      isOnDuty: e.key % 3 != 0,
      status:   e.key == 3 ? 'on_leave' : 'active',
    )).toList();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hotel country config helper
// ─────────────────────────────────────────────────────────────────────────────

class HotelCountryConfig {
  final String cc;

  const HotelCountryConfig(this.cc);

  String get hotelName => const {
    'IN': 'The Grand Maratha Hotel',
    'AE': 'Palm Harbour Suites',
    'SA': 'Al Faisaliah Tower Hotel',
    'QA': 'Al Rayyan Hotel & Suites',
    'GB': 'The Covent Garden Hotel',
    'US': 'Manhattan Skyline Hotel',
  }[cc] ?? 'KartSeek Hotel Partner';

  String get city => const {
    'IN': 'Mumbai, Maharashtra',
    'AE': 'Palm Jumeirah, Dubai',
    'SA': 'King Abdullah District, Riyadh',
    'QA': 'West Bay, Doha',
    'GB': 'Covent Garden, London',
    'US': 'Midtown, New York',
  }[cc] ?? 'City Center';

  String get starRating => const {
    'IN': '4-Star',  'AE': '5-Star', 'SA': '5-Star',
    'QA': '5-Star',  'GB': '4-Star', 'US': '4-Star',
  }[cc] ?? '4-Star';

  int get totalRooms => const {
    'IN': 85, 'AE': 124, 'SA': 98, 'QA': 112, 'GB': 64, 'US': 180,
  }[cc] ?? 60;

  int get occupiedRooms => const {
    'IN': 68, 'AE': 103, 'SA': 76, 'QA': 95, 'GB': 48, 'US': 142,
  }[cc] ?? 42;

  double get rating => const {
    'IN': 4.5, 'AE': 4.8, 'SA': 4.7, 'QA': 4.9, 'GB': 4.6, 'US': 4.4,
  }[cc] ?? 4.5;

  String get checkInTime  => '14:00';
  String get checkOutTime => '12:00';

  String get policyText => const {
    'IN': 'Early check-in subject to availability. Pets not allowed. GST 18% applicable.',
    'AE': 'Check-in from 3PM. Alcohol served in licensed premises only. VAT 5% applicable.',
    'SA': 'No alcohol policy. Halal food only. VAT 15% applicable. Prayer times observed.',
    'QA': 'Alcohol in licensed venues only. Halal options available. No VAT.',
    'GB': 'Late check-out GBP 50 fee. VAT 20% included in price.',
    'US': 'Cancellation free until 48 hours before. Resort fee USD 30/night applies.',
  }[cc] ?? 'Standard hotel policies apply.';
}

// ─────────────────────────────────────────────────────────────────────────────
// HotelSellerState
// ─────────────────────────────────────────────────────────────────────────────

class HotelSellerState extends Equatable {
  final HotelBlocStatus status;
  final List<HotelBookingModel> bookings;
  final List<HotelRoomModel> hotelRooms;
  // Legacy rooms map (for backward compat with old screens)
  final List<Map<String, dynamic>> rooms;
  final Set<DateTime> blockedDates;
  final Map<String, dynamic> dashboardData;
  final double occupancyRate;
  final HotelAnalyticsData? analytics;
  final List<HotelStaffModel> staff;
  final String? actionMessage;
  final String? error;
  final String countryCode;

  const HotelSellerState({
    this.status = HotelBlocStatus.initial,
    this.bookings = const [],
    this.hotelRooms = const [],
    this.rooms = const [],
    this.blockedDates = const {},
    this.dashboardData = const {},
    this.occupancyRate = 0.0,
    this.analytics,
    this.staff = const [],
    this.actionMessage,
    this.error,
    this.countryCode = 'AE',
  });

  HotelSellerState copyWith({
    HotelBlocStatus? status,
    List<HotelBookingModel>? bookings,
    List<HotelRoomModel>? hotelRooms,
    List<Map<String, dynamic>>? rooms,
    Set<DateTime>? blockedDates,
    Map<String, dynamic>? dashboardData,
    double? occupancyRate,
    HotelAnalyticsData? analytics,
    List<HotelStaffModel>? staff,
    String? actionMessage,
    String? error,
    String? countryCode,
  }) => HotelSellerState(
    status:        status ?? this.status,
    bookings:      bookings ?? this.bookings,
    hotelRooms:    hotelRooms ?? this.hotelRooms,
    rooms:         rooms ?? this.rooms,
    blockedDates:  blockedDates ?? this.blockedDates,
    dashboardData: dashboardData ?? this.dashboardData,
    occupancyRate: occupancyRate ?? this.occupancyRate,
    analytics:     analytics ?? this.analytics,
    staff:         staff ?? this.staff,
    actionMessage: actionMessage,
    error:         error ?? this.error,
    countryCode:   countryCode ?? this.countryCode,
  );

  int get checkedInCount    => bookings.where((b) => b.status == 'checked_in').length;
  int get upcomingCount     => bookings.where((b) => b.status == 'upcoming').length;
  int get checkedOutCount   => bookings.where((b) => b.status == 'checked_out').length;
  int get availableRooms    => hotelRooms.where((r) => r.status == RoomStatus.available).length;
  int get cleaningRooms     => hotelRooms.where((r) => r.status == RoomStatus.cleaning).length;
  int get maintenanceRooms  => hotelRooms.where((r) => r.status == RoomStatus.maintenance).length;

  @override
  List<Object?> get props => [
    status, bookings, hotelRooms, rooms, blockedDates, dashboardData,
    occupancyRate, analytics, staff, actionMessage, error, countryCode,
  ];
}
