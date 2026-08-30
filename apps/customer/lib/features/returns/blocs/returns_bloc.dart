import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/returns/blocs/returns_event.dart';
import 'package:kartseek_customer/features/returns/blocs/returns_state.dart';

/// BLoC for the Returns module.
///
/// Manages return request submission, cancellation, and tracking.
class ReturnsBloc extends Bloc<ReturnsEvent, ReturnsState> {
  ReturnsBloc() : super(const ReturnsState()) {
    on<LoadReturns>(_onLoadReturns);
    on<RequestReturn>(_onRequestReturn);
    on<CancelReturn>(_onCancelReturn);
    on<TrackReturn>(_onTrackReturn);
  }

  Future<void> _onLoadReturns(LoadReturns event, Emitter<ReturnsState> emit) async {
    emit(state.copyWith(status: ReturnsStatus.loading));
    await Future.delayed(const Duration(milliseconds: 500));
    emit(state.copyWith(status: ReturnsStatus.loaded, returns: _mockReturns));
  }

  Future<void> _onRequestReturn(RequestReturn event, Emitter<ReturnsState> emit) async {
    emit(state.copyWith(status: ReturnsStatus.submitting));
    await Future.delayed(const Duration(seconds: 1));

    final newReturn = {
      'id': 'RET-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      'orderId': event.orderId,
      'reason': event.reason,
      'type': event.returnType,
      'itemCount': event.itemIds.length,
      'status': 'initiated',
      'date': DateTime.now().toIso8601String(),
      'pickupDate': 'Scheduled within 48 hours',
    };

    emit(state.copyWith(
      status: ReturnsStatus.submitted,
      returns: [...state.returns, newReturn],
    ));
    debugPrint('[ReturnsBloc] ✅ Return requested: ${newReturn['id']}');
  }

  Future<void> _onCancelReturn(CancelReturn event, Emitter<ReturnsState> emit) async {
    emit(state.copyWith(status: ReturnsStatus.loading));
    await Future.delayed(const Duration(milliseconds: 500));

    final updated = state.returns.where((r) => r['id'] != event.returnId).toList();
    emit(state.copyWith(status: ReturnsStatus.loaded, returns: updated));
    debugPrint('[ReturnsBloc] 🗑️ Return cancelled: ${event.returnId}');
  }

  Future<void> _onTrackReturn(TrackReturn event, Emitter<ReturnsState> emit) async {
    emit(state.copyWith(status: ReturnsStatus.loading));
    await Future.delayed(const Duration(milliseconds: 300));

    final returnItem = state.returns.firstWhere(
      (r) => r['id'] == event.returnId,
      orElse: () => _mockReturns.first,
    );

    emit(state.copyWith(status: ReturnsStatus.loaded, selectedReturn: returnItem));
  }

  // ── Mock Data ─────────────────────────────────────────────────────────────

  static const List<Map<String, dynamic>> _mockReturns = [
    {
      'id': 'RET-001',
      'orderId': 'KS-2026-78432',
      'reason': 'Wrong size received',
      'type': 'exchange',
      'itemCount': 1,
      'status': 'pickup_scheduled',
      'date': '2026-06-01',
      'pickupDate': '2026-06-04, 10:00 AM - 2:00 PM',
    },
  ];
}
