import 'package:equatable/equatable.dart';

/// Events for the Doctor module BLoC.
abstract class DoctorEvent extends Equatable {
  const DoctorEvent();

  @override
  List<Object?> get props => [];
}

/// Load the doctor home screen data (specialities, nearby hospitals).
class LoadDoctorHome extends DoctorEvent {
  const LoadDoctorHome();
}

/// Search for doctors, hospitals, or specialities.
class SearchDoctors extends DoctorEvent {
  final String query;
  const SearchDoctors(this.query);

  @override
  List<Object?> get props => [query];
}

/// Filter doctors by speciality.
class FilterBySpeciality extends DoctorEvent {
  final String speciality;
  const FilterBySpeciality(this.speciality);

  @override
  List<Object?> get props => [speciality];
}

/// Load a doctor's detail / booking profile.
class LoadDoctorDetail extends DoctorEvent {
  final String doctorId;
  const LoadDoctorDetail(this.doctorId);

  @override
  List<Object?> get props => [doctorId];
}

/// Book an appointment with a doctor.
class BookAppointment extends DoctorEvent {
  final String doctorId;
  final String date;
  final String timeSlot;
  final String consultationType; // 'in_person', 'video', 'audio'

  const BookAppointment({
    required this.doctorId,
    required this.date,
    required this.timeSlot,
    required this.consultationType,
  });

  @override
  List<Object?> get props => [doctorId, date, timeSlot, consultationType];
}

/// Cancel an existing appointment.
class CancelAppointment extends DoctorEvent {
  final String appointmentId;
  const CancelAppointment(this.appointmentId);

  @override
  List<Object?> get props => [appointmentId];
}

/// Load upcoming appointments.
class LoadAppointments extends DoctorEvent {
  const LoadAppointments();
}

/// Load health packages.
class LoadHealthPackages extends DoctorEvent {
  const LoadHealthPackages();
}

// ── Token Queue ────────────────────────────────────────────────────────────────

/// Subscribe to a doctor's live queue (WebSocket).
class SubscribeToQueue extends DoctorEvent {
  final String doctorId;
  final String? date;
  const SubscribeToQueue({required this.doctorId, this.date});

  @override
  List<Object?> get props => [doctorId, date];
}

/// Received when the doctor advances their token (from WebSocket).
class TokenAdvanced extends DoctorEvent {
  final int currentToken;
  final int? queuePosition;
  final int? estimatedWaitMinutes;
  const TokenAdvanced({required this.currentToken, this.queuePosition, this.estimatedWaitMinutes});

  @override
  List<Object?> get props => [currentToken, queuePosition, estimatedWaitMinutes];
}

/// Received when the full queue is updated (from WebSocket).
class QueueUpdated extends DoctorEvent {
  final Map<String, dynamic> queueData;
  const QueueUpdated(this.queueData);

  @override
  List<Object?> get props => [queueData];
}
