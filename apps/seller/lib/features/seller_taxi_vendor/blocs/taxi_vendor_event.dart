import 'package:equatable/equatable.dart';

// ── Events ───────────────────────────────────────────────────────────────────

abstract class TaxiVendorEvent extends Equatable {
  const TaxiVendorEvent();
  @override List<Object?> get props => [];
}

class LoadTaxiVendorDashboard  extends TaxiVendorEvent { const LoadTaxiVendorDashboard(); }
class LoadTaxiVendorDrivers    extends TaxiVendorEvent { const LoadTaxiVendorDrivers(); }
class LoadTaxiVendorComplaints extends TaxiVendorEvent { const LoadTaxiVendorComplaints(); }
class LoadTaxiVendorEarnings   extends TaxiVendorEvent { const LoadTaxiVendorEarnings(); }

class RespondToComplaint extends TaxiVendorEvent {
  final String complaintId;
  final String response;
  const RespondToComplaint(this.complaintId, this.response);
  @override List<Object?> get props => [complaintId, response];
}

class EscalateComplaint extends TaxiVendorEvent {
  final String complaintId;
  const EscalateComplaint(this.complaintId);
  @override List<Object?> get props => [complaintId];
}

class ResolveComplaint extends TaxiVendorEvent {
  final String complaintId;
  const ResolveComplaint(this.complaintId);
  @override List<Object?> get props => [complaintId];
}

class SuspendDriver extends TaxiVendorEvent {
  final String driverId;
  const SuspendDriver(this.driverId);
  @override List<Object?> get props => [driverId];
}

class ReinstateDriver extends TaxiVendorEvent {
  final String driverId;
  const ReinstateDriver(this.driverId);
  @override List<Object?> get props => [driverId];
}

class NewComplaintPushed extends TaxiVendorEvent {
  final Map<String, dynamic> complaint;
  const NewComplaintPushed(this.complaint);
  @override List<Object?> get props => [complaint];
}
