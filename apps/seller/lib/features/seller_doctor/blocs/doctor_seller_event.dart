import 'package:equatable/equatable.dart';

abstract class DoctorSellerEvent extends Equatable {
  const DoctorSellerEvent();
  @override List<Object?> get props => [];
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
class LoadDoctorDashboard extends DoctorSellerEvent {
  final String countryCode;
  const LoadDoctorDashboard({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

// ── Appointments ───────────────────────────────────────────────────────────────
class LoadDoctorAppointments extends DoctorSellerEvent {
  final String countryCode;
  final String tab; // 'upcoming' | 'completed' | 'all'
  const LoadDoctorAppointments({this.countryCode = 'QA', this.tab = 'upcoming'});
  @override List<Object?> get props => [countryCode, tab];
}

class SelectAppointmentTab extends DoctorSellerEvent {
  final String tab;
  const SelectAppointmentTab(this.tab);
  @override List<Object?> get props => [tab];
}

class AcceptAppointmentRequest extends DoctorSellerEvent {
  final String appointmentId;
  const AcceptAppointmentRequest(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}

class StartDoctorConsultation extends DoctorSellerEvent {
  final String appointmentId;
  const StartDoctorConsultation(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}

class StartDoctorVideoCall extends DoctorSellerEvent {
  final String appointmentId;
  const StartDoctorVideoCall(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}

class EndDoctorVideoCall extends DoctorSellerEvent {
  final String appointmentId;
  const EndDoctorVideoCall(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}

class CompleteDoctorAppointment extends DoctorSellerEvent {
  final String appointmentId;
  final String? notes;
  final String? diagnosis;
  final List<String> prescriptions;
  const CompleteDoctorAppointment(
    this.appointmentId, {
    this.notes,
    this.diagnosis,
    this.prescriptions = const [],
  });
  @override List<Object?> get props => [appointmentId, notes, diagnosis];
}

class CancelDoctorAppointment extends DoctorSellerEvent {
  final String appointmentId;
  final String reason;
  const CancelDoctorAppointment(this.appointmentId, this.reason);
  @override List<Object?> get props => [appointmentId, reason];
}

class UpdateDoctorNotes extends DoctorSellerEvent {
  final String appointmentId;
  final String notes;
  const UpdateDoctorNotes(this.appointmentId, this.notes);
  @override List<Object?> get props => [appointmentId, notes];
}

class RescheduleDoctorAppointment extends DoctorSellerEvent {
  final String appointmentId;
  final DateTime newTime;
  const RescheduleDoctorAppointment(this.appointmentId, this.newTime);
  @override List<Object?> get props => [appointmentId, newTime];
}

class MarkPatientNoShow extends DoctorSellerEvent {
  final String appointmentId;
  const MarkPatientNoShow(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}

// ── Schedule ───────────────────────────────────────────────────────────────────
class LoadDoctorSchedule extends DoctorSellerEvent {
  final String countryCode;
  const LoadDoctorSchedule({this.countryCode = 'QA'});
  @override List<Object?> get props => [countryCode];
}

class ToggleTimeSlotAvailability extends DoctorSellerEvent {
  final String date;
  final String slotId;
  final bool isAvailable;
  const ToggleTimeSlotAvailability({required this.date, required this.slotId, required this.isAvailable});
  @override List<Object?> get props => [date, slotId, isAvailable];
}

class UpdateConsultationFee extends DoctorSellerEvent {
  final double fee;
  const UpdateConsultationFee(this.fee);
  @override List<Object?> get props => [fee];
}

class UpdateDoctorAvailability extends DoctorSellerEvent {
  final bool isAvailable;
  const UpdateDoctorAvailability(this.isAvailable);
  @override List<Object?> get props => [isAvailable];
}

class BlockTimeSlot extends DoctorSellerEvent {
  final String date;
  final String slotId;
  const BlockTimeSlot(this.date, this.slotId);
  @override List<Object?> get props => [date, slotId];
}

// ── Backward-compat aliases ────────────────────────────────────────────────────
class StartAppointment extends DoctorSellerEvent {
  final String appointmentId;
  const StartAppointment(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}

class CompleteAppointment extends DoctorSellerEvent {
  final String appointmentId;
  final String? notes;
  const CompleteAppointment(this.appointmentId, {this.notes});
  @override List<Object?> get props => [appointmentId];
}

class InitiateVideoCall extends DoctorSellerEvent {
  final String appointmentId;
  const InitiateVideoCall(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}

class DoctorCallReady extends DoctorSellerEvent {
  final String appointmentId;
  const DoctorCallReady(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}

// ── Token Queue ────────────────────────────────────────────────────────────────
class AdvanceToken extends DoctorSellerEvent {
  final String doctorId;
  final String? date;
  const AdvanceToken({required this.doctorId, this.date});
  @override List<Object?> get props => [doctorId, date];
}

class CheckInPatient extends DoctorSellerEvent {
  final String appointmentId;
  const CheckInPatient(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}

class StartDoctorConsultationQueue extends DoctorSellerEvent {
  final String appointmentId;
  const StartDoctorConsultationQueue(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}

class EndDoctorConsultationQueue extends DoctorSellerEvent {
  final String appointmentId;
  const EndDoctorConsultationQueue(this.appointmentId);
  @override List<Object?> get props => [appointmentId];
}
