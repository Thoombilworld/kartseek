import 'package:equatable/equatable.dart';

enum DoctorBlocStatus { initial, loading, loaded, error }
enum CallStatus       { idle, ringing, inCall, ended }
enum AppointmentType  { video, inPerson }

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Model
// ─────────────────────────────────────────────────────────────────────────────

class AppointmentModel {
  final String id;
  final String patientName;
  final String? patientPhone;
  final String? patientAge;
  final String? patientGender;
  final String? chiefComplaint;
  final DateTime scheduledAt;
  final String status; // 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  final String type;  // 'video' | 'in_person'
  final String? notes;
  final String? diagnosis;
  final List<String> prescriptions;
  final bool isPaid;
  final double consultFee;
  final String currency;
  final bool isNew; // first visit vs follow-up
  final int? tokenNumber;
  final int? queuePosition;
  final int? estimatedWaitMinutes;

  const AppointmentModel({
    required this.id,
    required this.patientName,
    this.patientPhone,
    this.patientAge,
    this.patientGender,
    this.chiefComplaint,
    required this.scheduledAt,
    this.status = 'upcoming',
    this.type = 'video',
    this.notes,
    this.diagnosis,
    this.prescriptions = const [],
    this.isPaid = false,
    this.consultFee = 150,
    this.currency = 'QAR',
    this.isNew = false,
    this.tokenNumber,
    this.queuePosition,
    this.estimatedWaitMinutes,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) => AppointmentModel(
    id:           json['id']           as String? ?? '',
    patientName:  json['patient_name'] as String? ?? 'Patient',
    patientPhone: json['patient_phone'] as String?,
    scheduledAt:  DateTime.tryParse(json['scheduled_at'] as String? ?? '') ?? DateTime.now(),
    status:       json['status']       as String? ?? 'upcoming',
    type:         json['type']         as String? ?? 'video',
    notes:        json['notes']        as String?,
    isPaid:       json['is_paid']      as bool? ?? false,
    currency:     json['currency']     as String? ?? 'QAR',
  );

  AppointmentModel copyWith({
    String? status,
    String? notes,
    String? diagnosis,
    List<String>? prescriptions,
    DateTime? scheduledAt,
  }) => AppointmentModel(
    id: id, patientName: patientName, patientPhone: patientPhone,
    patientAge: patientAge, patientGender: patientGender,
    chiefComplaint: chiefComplaint,
    scheduledAt: scheduledAt ?? this.scheduledAt,
    status: status ?? this.status,
    type: type, notes: notes ?? this.notes,
    diagnosis: diagnosis ?? this.diagnosis,
    prescriptions: prescriptions ?? this.prescriptions,
    isPaid: isPaid, consultFee: consultFee, currency: currency,
    isNew: isNew,
    tokenNumber: tokenNumber, queuePosition: queuePosition,
    estimatedWaitMinutes: estimatedWaitMinutes,
  );

  static AppointmentModel mock({String status = 'upcoming'}) => AppointmentModel(
    id: 'APT-001', patientName: 'Ananya Sharma',
    patientPhone: '+91 9876543210',
    scheduledAt: DateTime.now().add(const Duration(hours: 2)),
    status: status, type: 'video', isPaid: true,
    consultFee: 500, currency: 'INR',
  );

  bool get isVideoType  => type == 'video';
  bool get isInProgress => status == 'in_progress';
  bool get isUpcoming   => status == 'upcoming' || status == 'pending';
  bool get isCompleted  => status == 'completed';
}

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Profile (country-scoped)
// ─────────────────────────────────────────────────────────────────────────────

class DoctorProfile {
  final String name;
  final String specialty;
  final String qualifications;
  final String hospital;
  final double rating;
  final int totalPatients;
  final double consultFee;
  final String currency;
  final bool isAvailable;

  const DoctorProfile({
    required this.name,
    required this.specialty,
    required this.qualifications,
    required this.hospital,
    this.rating = 4.8,
    this.totalPatients = 0,
    this.consultFee = 150,
    this.currency = 'QAR',
    this.isAvailable = true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

class DoctorSellerState extends Equatable {
  final DoctorBlocStatus status;
  final List<AppointmentModel> upcomingAppointments;
  final List<AppointmentModel> completedAppointments;
  final Map<String, List<Map<String, dynamic>>> weeklySlots;
  final String? activeCallAppointmentId;
  final CallStatus callStatus;
  final Map<String, dynamic> dashboardData;
  final DoctorProfile? doctorProfile;
  final String? actionMessage;
  final bool? actionSuccess;
  final String? error;
  final bool isAvailable;
  final double consultFee;
  final String selectedTab;
  // Token Queue
  final int? currentToken;
  final int? totalQueueTokens;
  final double? avgWaitMinutes;

  const DoctorSellerState({
    this.status = DoctorBlocStatus.initial,
    this.upcomingAppointments = const [],
    this.completedAppointments = const [],
    this.weeklySlots = const {},
    this.activeCallAppointmentId,
    this.callStatus = CallStatus.idle,
    this.dashboardData = const {},
    this.doctorProfile,
    this.actionMessage,
    this.actionSuccess,
    this.error,
    this.isAvailable = true,
    this.consultFee = 150,
    this.selectedTab = 'upcoming',
    this.currentToken,
    this.totalQueueTokens,
    this.avgWaitMinutes,
  });

  DoctorSellerState copyWith({
    DoctorBlocStatus? status,
    List<AppointmentModel>? upcomingAppointments,
    List<AppointmentModel>? completedAppointments,
    Map<String, List<Map<String, dynamic>>>? weeklySlots,
    String? activeCallAppointmentId,
    CallStatus? callStatus,
    Map<String, dynamic>? dashboardData,
    DoctorProfile? doctorProfile,
    String? actionMessage,
    bool? actionSuccess,
    String? error,
    bool? isAvailable,
    double? consultFee,
    String? selectedTab,
    int? currentToken,
    int? totalQueueTokens,
    double? avgWaitMinutes,
  }) => DoctorSellerState(
    status:                 status                 ?? this.status,
    upcomingAppointments:   upcomingAppointments   ?? this.upcomingAppointments,
    completedAppointments:  completedAppointments  ?? this.completedAppointments,
    weeklySlots:            weeklySlots            ?? this.weeklySlots,
    activeCallAppointmentId: activeCallAppointmentId ?? this.activeCallAppointmentId,
    callStatus:             callStatus             ?? this.callStatus,
    dashboardData:          dashboardData          ?? this.dashboardData,
    doctorProfile:          doctorProfile          ?? this.doctorProfile,
    actionMessage:          actionMessage,
    actionSuccess:          actionSuccess,
    error:                  error,
    isAvailable:            isAvailable            ?? this.isAvailable,
    consultFee:             consultFee             ?? this.consultFee,
    selectedTab:            selectedTab            ?? this.selectedTab,
    currentToken:           currentToken           ?? this.currentToken,
    totalQueueTokens:       totalQueueTokens       ?? this.totalQueueTokens,
    avgWaitMinutes:         avgWaitMinutes         ?? this.avgWaitMinutes,
  );

  // ── Computed ─────────────────────────────────────────────────────────────────

  List<AppointmentModel> get pendingAppointments =>
      upcomingAppointments.where((a) => a.status == 'pending').toList();

  List<AppointmentModel> get inProgressAppointments =>
      upcomingAppointments.where((a) => a.status == 'in_progress').toList();

  int get todayAppointmentCount => upcomingAppointments.length;
  int get pendingCount          => pendingAppointments.length;
  int get inProgressCount       => inProgressAppointments.length;
  double get todayEarnings      =>
      completedAppointments.fold(0, (sum, a) => sum + a.consultFee);

  @override
  List<Object?> get props => [
    status, upcomingAppointments, completedAppointments,
    weeklySlots, activeCallAppointmentId, callStatus,
    dashboardData, doctorProfile, isAvailable, consultFee, selectedTab,
    currentToken, totalQueueTokens, avgWaitMinutes,
  ];
}
