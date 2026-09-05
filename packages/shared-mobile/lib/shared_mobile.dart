/// KARTSEEK Shared Mobile — Barrel Export
///
/// This file exports all shared infrastructure used by both
/// the Customer App and Partner App.
library;

// ── Core ────────────────────────────────────────────────────────────────────
export 'package:kartseek_shared_mobile/core/constants.dart';
export 'package:kartseek_shared_mobile/core/api/api_client.dart';
export 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
export 'package:kartseek_shared_mobile/core/utils/responsive.dart';
export 'package:kartseek_shared_mobile/core/widgets/kartseek_image.dart';
export 'package:kartseek_shared_mobile/core/routing/route_helpers.dart';
export 'package:kartseek_shared_mobile/core/routing/app_router.dart';
export 'package:kartseek_shared_mobile/core/constants/marketplace_route_constants.dart';

// ── Core Blocs ──────────────────────────────────────────────────────────────
export 'package:kartseek_shared_mobile/core/blocs/region_bloc.dart';
export 'package:kartseek_shared_mobile/core/blocs/region_event.dart';
export 'package:kartseek_shared_mobile/core/blocs/region_state.dart';

// ── Core Services ───────────────────────────────────────────────────────────
export 'package:kartseek_shared_mobile/core/services/services.dart';

// ── Auth Feature ────────────────────────────────────────────────────────────
export 'package:kartseek_shared_mobile/features/auth/blocs/auth_bloc.dart';
export 'package:kartseek_shared_mobile/features/auth/blocs/auth_event.dart';
export 'package:kartseek_shared_mobile/features/auth/blocs/auth_state.dart';

// ── Taxi Blocs (shared between customer booking and partner driving) ────────
export 'package:kartseek_shared_mobile/features/taxi/blocs/taxi_bloc.dart';
export 'package:kartseek_shared_mobile/features/taxi/blocs/taxi_event.dart' hide VerifyOtp;
export 'package:kartseek_shared_mobile/features/taxi/blocs/taxi_state.dart';
