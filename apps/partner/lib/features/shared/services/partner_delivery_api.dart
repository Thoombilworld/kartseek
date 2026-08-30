import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:shared_mobile/core/security/secure_api_client.dart';
import 'package:kartseek_partner/features/shared/models/delivery_model.dart';

/// The partner app's delivery endpoints.
///
/// All four of these existed on the gateway and none of them were called. The
/// delivery section instead generated its own jobs on a timer, captured no
/// photographs, and reported cash collected by navigating to a success screen —
/// so a completed delivery left no record anywhere, and the commission that is
/// charged at delivery could never fire.
///
/// `SecureApiClient` is the same client `delivery_otp_screen.dart` already uses:
/// it carries the partner's auth token and goes through the pinned HTTP client.
class PartnerDeliveryApi {
  PartnerDeliveryApi({SecureApiClient? client}) : _api = client ?? SecureApiClient();

  final SecureApiClient _api;

  /// Deliveries currently offered to, or held by, this partner.
  ///
  /// `status` defaults to the states a partner can act on. The endpoint is
  /// `GET /marketplace/delivery-assignments`, guarded to the DRIVER role.
  Future<List<DeliveryTask>> getAssignments(
    String partnerId, {
    String status = 'ASSIGNED',
  }) async {
    final res = await _api.get(
      '/marketplace/delivery-assignments',
      queryParams: {'partnerId': partnerId, 'status': status},
    );
    final rows = (res['data'] ?? res['assignments'] ?? const []) as List;
    return rows
        .whereType<Map>()
        .map((e) => DeliveryTask.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// The one delivery this partner is mid-way through, if any.
  Future<DeliveryTask?> getActiveDelivery(String partnerId) async {
    final res = await _api.get('/marketplace/delivery-assignments/partner/$partnerId/active');
    final row = res['data'] ?? res['assignment'];
    if (row is! Map) return null;
    return DeliveryTask.fromJson(Map<String, dynamic>.from(row));
  }

  /// Upload one proof photograph and return its stored URL.
  ///
  /// `POST /upload/delivery-proof` is DRIVER-scoped; the pre-existing image
  /// routes were SELLER-only, which is why the partner app had nowhere to send
  /// a photograph even once it had captured one.
  Future<String> uploadProofPhoto({
    required String assignmentId,
    required String slot,
    required String filePath,
  }) async {
    final res = await _api.uploadFile(
      '/upload/delivery-proof',
      file: File(filePath),
      fields: {'assignmentId': assignmentId, 'slot': slot},
    );
    final url = res['url']?.toString();
    if (url == null || url.isEmpty) {
      throw StateError('Upload succeeded but returned no URL');
    }
    return url;
  }

  /// Record proof of delivery and close the assignment.
  ///
  /// [photoUrls] are uploaded images, not booleans. The screen this replaces
  /// tracked four `bool`s that a tap flipped to true and never captured
  /// anything, so a delivery dispute had no evidence behind it.
  Future<void> submitProof({
    required String assignmentId,
    required List<String> photoUrls,
    required String deliveryMode,
    bool damageReported = false,
    String? notes,
  }) async {
    await _api.post(
      '/marketplace/delivery-assignments/$assignmentId/proof',
      body: {
        'status': 'DELIVERED',
        'proofPhotoUrls': photoUrls,
        'deliveryMode': deliveryMode,
        'damageReported': damageReported,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );
  }

  /// Record how the order was paid for.
  ///
  /// Both buttons on the payment screen used to do the same thing — navigate —
  /// so cash collected and paid-online were indistinguishable downstream, and
  /// neither reached the ledger.
  Future<void> recordPayment({
    required String assignmentId,
    required bool cashCollected,
    required double amount,
  }) async {
    await _api.post(
      '/marketplace/delivery-assignments/$assignmentId/proof',
      body: {
        'paymentMethod': cashCollected ? 'COD' : 'PREPAID',
        'codCollected': cashCollected,
        'codAmount': cashCollected ? amount : 0,
      },
    );
  }

  /// Log and rethrow — callers decide what the partner sees.
  static Never rethrowWithLog(Object error, String what) {
    debugPrint('[PartnerDeliveryApi] $what failed: $error');
    throw error;
  }
}
