// lib/core/services/services.dart

/// Barrel export for all KARTSEEK WebSocket / background / security services.
library;

export 'package:kartseek_shared_mobile/core/services/socket_service.dart';
export 'package:kartseek_shared_mobile/core/services/taxi_socket_service.dart' hide NearbyDriver;
export 'package:kartseek_shared_mobile/core/services/order_socket_service.dart';
export 'package:kartseek_shared_mobile/core/services/doctor_queue_socket_service.dart';
export 'package:kartseek_shared_mobile/core/services/background_refresh_service.dart';
export 'package:kartseek_shared_mobile/core/services/platform_sync_service.dart';
export 'package:kartseek_shared_mobile/core/services/region_service.dart';
export 'package:kartseek_shared_mobile/core/services/geo_security_service.dart';
export 'package:kartseek_shared_mobile/core/security/security.dart';
export 'package:kartseek_shared_mobile/core/services/camera_service.dart';
export 'package:kartseek_shared_mobile/core/services/microphone_service.dart';
