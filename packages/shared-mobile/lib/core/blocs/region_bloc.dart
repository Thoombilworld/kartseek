/// KARTSEEK Region BLoC — Business Logic
///
/// Global BLoC that manages the user's detected operational region.
/// Runs on app launch to detect the country via GPS/IP, then emits
/// the region state to all listening widgets so the entire UI adapts
/// (currency, vendors, language, available modules).
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/blocs/region_event.dart';
import 'package:kartseek_shared_mobile/core/blocs/region_state.dart';

class RegionBloc extends Bloc<RegionEvent, RegionState> {
  final RegionService _regionService = RegionService.instance;

  RegionBloc() : super(const RegionInitial()) {
    on<DetectRegionFromGps>(_onDetectFromGps);
    on<DetectRegionFromIp>(_onDetectFromIp);
    on<SetRegionManually>(_onSetManually);
    on<RefreshRegion>(_onRefresh);
  }

  Future<void> _onDetectFromGps(
    DetectRegionFromGps event,
    Emitter<RegionState> emit,
  ) async {
    emit(const RegionDetecting());
    try {
      final result = await _regionService.detectFromGps(event.latitude, event.longitude);
      debugPrint('[RegionBloc] ✅ GPS detection complete → $result');
      emit(RegionDetected(result: result));
    } catch (e) {
      debugPrint('[RegionBloc] ❌ GPS detection failed: $e');
      // Fallback to IP detection
      add(const DetectRegionFromIp());
    }
  }

  Future<void> _onDetectFromIp(
    DetectRegionFromIp event,
    Emitter<RegionState> emit,
  ) async {
    emit(const RegionDetecting());
    try {
      final result = await _regionService.detectFromIp();
      debugPrint('[RegionBloc] ✅ IP detection complete → $result');
      emit(RegionDetected(result: result));
    } catch (e) {
      debugPrint('[RegionBloc] ❌ IP detection failed: $e');
      emit(RegionError(message: 'Region detection failed: $e'));
    }
  }

  void _onSetManually(
    SetRegionManually event,
    Emitter<RegionState> emit,
  ) {
    _regionService.setRegion(event.country);
    emit(RegionDetected(result: RegionDetectionResult(
      country: event.country,
      detectedVia: 'manual',
      confidence: 1.0,
    )));
  }

  Future<void> _onRefresh(
    RefreshRegion event,
    Emitter<RegionState> emit,
  ) async {
    // Re-detect via IP
    add(const DetectRegionFromIp());
  }
}
