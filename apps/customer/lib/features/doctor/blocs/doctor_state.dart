import 'package:equatable/equatable.dart';

/// Status for the Doctor module.
enum DoctorStatus { initial, loading, loaded, searching, booking, booked, error }

/// State for the Doctor module BLoC.
class DoctorState extends Equatable {
  final DoctorStatus status;
  final List<Map<String, dynamic>> specialities;
  final List<Map<String, dynamic>> hospitals;
  final List<Map<String, dynamic>> clinics;
  final List<Map<String, dynamic>> doctors;
  final List<Map<String, dynamic>> independentDoctors;
  final List<Map<String, dynamic>> appointments;
  final List<Map<String, dynamic>> healthPackages;
  final Map<String, dynamic>? selectedDoctor;
  final String? selectedSpeciality;
  final String? searchQuery;
  final String? errorMessage;
  // Token Queue
  final int? currentServingToken;
  final int? myTokenNumber;
  final int? myQueuePosition;
  final int? estimatedWaitMinutes;

  const DoctorState({
    this.status = DoctorStatus.initial,
    this.specialities = const [],
    this.hospitals = const [],
    this.clinics = const [],
    this.doctors = const [],
    this.independentDoctors = const [],
    this.appointments = const [],
    this.healthPackages = const [],
    this.selectedDoctor,
    this.selectedSpeciality,
    this.searchQuery,
    this.errorMessage,
    this.currentServingToken,
    this.myTokenNumber,
    this.myQueuePosition,
    this.estimatedWaitMinutes,
  });

  DoctorState copyWith({
    DoctorStatus? status,
    List<Map<String, dynamic>>? specialities,
    List<Map<String, dynamic>>? hospitals,
    List<Map<String, dynamic>>? clinics,
    List<Map<String, dynamic>>? doctors,
    List<Map<String, dynamic>>? independentDoctors,
    List<Map<String, dynamic>>? appointments,
    List<Map<String, dynamic>>? healthPackages,
    Map<String, dynamic>? selectedDoctor,
    String? selectedSpeciality,
    String? searchQuery,
    String? errorMessage,
    int? currentServingToken,
    int? myTokenNumber,
    int? myQueuePosition,
    int? estimatedWaitMinutes,
  }) {
    return DoctorState(
      status: status ?? this.status,
      specialities: specialities ?? this.specialities,
      hospitals: hospitals ?? this.hospitals,
      clinics: clinics ?? this.clinics,
      doctors: doctors ?? this.doctors,
      independentDoctors: independentDoctors ?? this.independentDoctors,
      appointments: appointments ?? this.appointments,
      healthPackages: healthPackages ?? this.healthPackages,
      selectedDoctor: selectedDoctor ?? this.selectedDoctor,
      selectedSpeciality: selectedSpeciality ?? this.selectedSpeciality,
      searchQuery: searchQuery ?? this.searchQuery,
      errorMessage: errorMessage ?? this.errorMessage,
      currentServingToken: currentServingToken ?? this.currentServingToken,
      myTokenNumber: myTokenNumber ?? this.myTokenNumber,
      myQueuePosition: myQueuePosition ?? this.myQueuePosition,
      estimatedWaitMinutes: estimatedWaitMinutes ?? this.estimatedWaitMinutes,
    );
  }

  @override
  List<Object?> get props => [
        status, specialities, hospitals, clinics, doctors,
        independentDoctors, appointments, healthPackages,
        selectedDoctor, selectedSpeciality,
        searchQuery, errorMessage,
        currentServingToken, myTokenNumber, myQueuePosition, estimatedWaitMinutes,
      ];
}
