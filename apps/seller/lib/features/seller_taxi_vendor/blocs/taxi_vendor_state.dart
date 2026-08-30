import 'package:equatable/equatable.dart';

// ─────────────────────────────────────────────────────────────────────────────
// TaxiVendorBlocStatus
// ─────────────────────────────────────────────────────────────────────────────

enum TaxiVendorBlocStatus { initial, loading, loaded, error }

// ─────────────────────────────────────────────────────────────────────────────
// VendorDriverModel
// ─────────────────────────────────────────────────────────────────────────────

enum DriverStatus { online, offline, onTrip, suspended }

class VendorDriverModel {
  final String id;
  final String name;
  final String phone;
  final String vehiclePlate;
  final String vehicleType;
  final DriverStatus status;
  final double rating;
  final int totalTrips;
  final double todayEarnings;
  final String? photoUrl;

  const VendorDriverModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.vehiclePlate,
    required this.vehicleType,
    required this.status,
    this.rating = 0.0,
    this.totalTrips = 0,
    this.todayEarnings = 0.0,
    this.photoUrl,
  });

  VendorDriverModel copyWith({DriverStatus? status}) =>
      VendorDriverModel(
        id: id, name: name, phone: phone, vehiclePlate: vehiclePlate,
        vehicleType: vehicleType, status: status ?? this.status,
        rating: rating, totalTrips: totalTrips, todayEarnings: todayEarnings,
        photoUrl: photoUrl,
      );

  static VendorDriverModel mock(int index) {
    final statuses = [DriverStatus.online, DriverStatus.onTrip, DriverStatus.offline, DriverStatus.online];
    final names = ['Ahmed Al Mansouri', 'Ravi Kumar', 'Mohamed Hassan', 'John Doe',
                   'Khalid Al Thani', 'Priya Patel', 'Ali Hassan', 'Suresh Verma',
                   'Fatima Al Zahra', 'Carlos Mendez'];
    final plates = ['QA-1234', 'QA-5678', 'QA-9012', 'QA-3456', 'QA-7890',
                    'QA-2345', 'QA-6789', 'QA-0123', 'QA-4567', 'QA-8901'];
    return VendorDriverModel(
      id: 'drv_$index',
      name: names[index % names.length],
      phone: '+974 ${5000 + index * 111}',
      vehiclePlate: plates[index % plates.length],
      vehicleType: index % 3 == 0 ? 'SUV' : index % 3 == 1 ? 'Sedan' : 'Economy',
      status: statuses[index % statuses.length],
      rating: 3.8 + (index % 12) * 0.1,
      totalTrips: 120 + index * 47,
      todayEarnings: (index + 1) * 85.0,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ComplaintModel
// ─────────────────────────────────────────────────────────────────────────────

class ComplaintModel {
  final String id;
  final String driverId;
  final String driverName;
  final String rideId;
  final String customerName;
  final String severity; // 'low' | 'medium' | 'high'
  final String description;
  final String status; // 'open' | 'responded' | 'escalated' | 'resolved'
  final String? vendorResponse;
  final DateTime createdAt;

  const ComplaintModel({
    required this.id,
    required this.driverId,
    required this.driverName,
    required this.rideId,
    required this.customerName,
    required this.severity,
    required this.description,
    required this.status,
    this.vendorResponse,
    required this.createdAt,
  });

  ComplaintModel copyWith({String? status, String? vendorResponse}) =>
      ComplaintModel(
        id: id, driverId: driverId, driverName: driverName, rideId: rideId,
        customerName: customerName, severity: severity, description: description,
        status: status ?? this.status, vendorResponse: vendorResponse ?? this.vendorResponse,
        createdAt: createdAt,
      );

  static ComplaintModel mock(int index) {
    final descriptions = [
      'Driver was rude and used inappropriate language.',
      'Took a much longer route than necessary.',
      'Car was not clean. Strong unpleasant odour.',
      'Driver cancelled the trip mid-way.',
      'Overcharged — receipt does not match app price.',
      'Driver was on the phone throughout the trip.',
    ];
    final severities = ['low', 'medium', 'high'];
    final statuses = ['open', 'responded', 'open', 'escalated', 'resolved', 'open'];
    return ComplaintModel(
      id: 'CPL-${1000 + index}',
      driverId: 'drv_$index',
      driverName: ['Ahmed Al Mansouri', 'Ravi Kumar', 'Mohamed Hassan'][index % 3],
      rideId: 'RIDE-${5000 + index * 3}',
      customerName: ['Aisha Al Qassem', 'David Kim', 'Sara Hassan'][index % 3],
      severity: severities[index % severities.length],
      description: descriptions[index % descriptions.length],
      status: statuses[index % statuses.length],
      createdAt: DateTime.now().subtract(Duration(hours: index * 6 + 1)),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TaxiVendorState
// ─────────────────────────────────────────────────────────────────────────────

class TaxiVendorState extends Equatable {
  final TaxiVendorBlocStatus status;
  final List<VendorDriverModel> drivers;
  final List<ComplaintModel> complaints;
  final Map<String, dynamic> dashboardData;
  final Map<String, dynamic> earningsData;
  final String? actionMessage;
  final String? error;

  const TaxiVendorState({
    this.status = TaxiVendorBlocStatus.initial,
    this.drivers = const [],
    this.complaints = const [],
    this.dashboardData = const {},
    this.earningsData = const {},
    this.actionMessage,
    this.error,
  });

  // Computed getters
  int get onlineDrivers  => drivers.where((d) => d.status == DriverStatus.online).length;
  int get onTripDrivers  => drivers.where((d) => d.status == DriverStatus.onTrip).length;
  int get offlineDrivers => drivers.where((d) => d.status == DriverStatus.offline).length;
  int get openComplaints => complaints.where((c) => c.status == 'open').length;

  TaxiVendorState copyWith({
    TaxiVendorBlocStatus? status,
    List<VendorDriverModel>? drivers,
    List<ComplaintModel>? complaints,
    Map<String, dynamic>? dashboardData,
    Map<String, dynamic>? earningsData,
    String? actionMessage,
    String? error,
  }) =>
      TaxiVendorState(
        status:        status ?? this.status,
        drivers:       drivers ?? this.drivers,
        complaints:    complaints ?? this.complaints,
        dashboardData: dashboardData ?? this.dashboardData,
        earningsData:  earningsData ?? this.earningsData,
        actionMessage: actionMessage,
        error:         error,
      );

  @override
  List<Object?> get props =>
      [status, drivers, complaints, dashboardData, earningsData, actionMessage, error];
}
