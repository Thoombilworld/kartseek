import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_event.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_state.dart';
import 'package:kartseek_seller/features/shared/services/seller_api_service.dart';

class TaxiVendorBloc extends Bloc<TaxiVendorEvent, TaxiVendorState> {
  final SellerApiService _api;

  TaxiVendorBloc({SellerApiService? api})
      : _api = api ?? SellerApiService.instance,
        super(const TaxiVendorState()) {
    on<LoadTaxiVendorDashboard>(_onLoadDashboard);
    on<LoadTaxiVendorDrivers>(_onLoadDrivers);
    on<LoadTaxiVendorComplaints>(_onLoadComplaints);
    on<RespondToComplaint>(_onRespond);
    on<EscalateComplaint>(_onEscalate);
    on<ResolveComplaint>(_onResolve);
    on<LoadTaxiVendorEarnings>(_onLoadEarnings);
    on<SuspendDriver>(_onSuspend);
    on<ReinstateDriver>(_onReinstate);
    on<NewComplaintPushed>(_onNewComplaint);
  }

  Future<void> _onLoadDashboard(LoadTaxiVendorDashboard event, Emitter<TaxiVendorState> emit) async {
    emit(state.copyWith(status: TaxiVendorBlocStatus.loading));
    final data = await _api.getDashboard();
    emit(state.copyWith(status: TaxiVendorBlocStatus.loaded, dashboardData: data));
  }

  Future<void> _onLoadDrivers(LoadTaxiVendorDrivers event, Emitter<TaxiVendorState> emit) async {
    emit(state.copyWith(status: TaxiVendorBlocStatus.loading));
    final drivers = List.generate(10, (i) => VendorDriverModel.mock(i));
    emit(state.copyWith(status: TaxiVendorBlocStatus.loaded, drivers: drivers));
  }

  Future<void> _onLoadComplaints(LoadTaxiVendorComplaints event, Emitter<TaxiVendorState> emit) async {
    emit(state.copyWith(status: TaxiVendorBlocStatus.loading));
    final complaints = List.generate(6, (i) => ComplaintModel.mock(i));
    emit(state.copyWith(status: TaxiVendorBlocStatus.loaded, complaints: complaints));
  }

  void _onRespond(RespondToComplaint event, Emitter<TaxiVendorState> emit) {
    final updated = state.complaints.map((c) =>
      c.id == event.complaintId ? c.copyWith(status: 'responded', vendorResponse: event.response) : c
    ).toList();
    emit(state.copyWith(complaints: updated, actionMessage: 'Response submitted'));
  }

  void _onEscalate(EscalateComplaint event, Emitter<TaxiVendorState> emit) {
    final updated = state.complaints.map((c) =>
      c.id == event.complaintId ? c.copyWith(status: 'escalated') : c
    ).toList();
    emit(state.copyWith(complaints: updated, actionMessage: 'Escalated to Super Admin'));
  }

  void _onResolve(ResolveComplaint event, Emitter<TaxiVendorState> emit) {
    final updated = state.complaints.map((c) =>
      c.id == event.complaintId ? c.copyWith(status: 'resolved') : c
    ).toList();
    emit(state.copyWith(complaints: updated, actionMessage: 'Complaint resolved ✅'));
  }

  Future<void> _onLoadEarnings(LoadTaxiVendorEarnings event, Emitter<TaxiVendorState> emit) async {
    final data = await _api.getAnalytics();
    emit(state.copyWith(earningsData: data));
  }

  void _onSuspend(SuspendDriver event, Emitter<TaxiVendorState> emit) {
    final updated = state.drivers.map((d) =>
      d.id == event.driverId ? d.copyWith(status: DriverStatus.suspended) : d
    ).toList();
    emit(state.copyWith(drivers: updated, actionMessage: 'Driver suspended'));
  }

  void _onReinstate(ReinstateDriver event, Emitter<TaxiVendorState> emit) {
    final updated = state.drivers.map((d) =>
      d.id == event.driverId ? d.copyWith(status: DriverStatus.offline) : d
    ).toList();
    emit(state.copyWith(drivers: updated, actionMessage: 'Driver reinstated ✅'));
  }

  void _onNewComplaint(NewComplaintPushed event, Emitter<TaxiVendorState> emit) {
    final c = event.complaint;
    final model = ComplaintModel(
      id:           c['complaintId'] as String? ?? '',
      driverId:     c['driverId'] as String? ?? '',
      driverName:   c['driverName'] as String? ?? 'Driver',
      rideId:       c['rideId'] as String? ?? '',
      customerName: c['customerName'] as String? ?? 'Customer',
      severity:     c['severity'] as String? ?? 'medium',
      description:  c['description'] as String? ?? '',
      status:       'open',
      createdAt:    DateTime.now(),
    );
    emit(state.copyWith(complaints: [model, ...state.complaints]));
  }
}
