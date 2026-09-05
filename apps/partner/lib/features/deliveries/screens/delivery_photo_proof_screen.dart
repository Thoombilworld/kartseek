import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/widgets/camera_capture_screen.dart';
import 'package:kartseek_partner/features/shared/services/partner_delivery_api.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Photo Proof of Delivery — Required step before marking a delivery complete.
///
/// The delivery partner must capture photographic evidence of:
///   1. Package at doorstep (mandatory)
///   2. Customer receiving package (if present)
///   3. Delivery location / address sign (optional)
///   4. Any damage observed (conditional)
///
/// This screen is injected into the delivery flow between OTP verification
/// and the payment/completion screen.
class DeliveryPhotoProofScreen extends StatefulWidget {
  const DeliveryPhotoProofScreen({super.key});
  @override
  State<DeliveryPhotoProofScreen> createState() =>
      _DeliveryPhotoProofScreenState();
}

class _DeliveryPhotoProofScreenState extends State<DeliveryPhotoProofScreen> {
  final _api = PartnerDeliveryApi();

  /// Captured file paths, keyed by slot. Each used to be a `bool` that a tap
  /// flipped to `true` — the screen enforced which photos were "required" and
  /// then stored none of them, so a delivery dispute had no evidence behind it.
  final Map<String, String> _photos = {};

  bool _hasDamage = false;
  bool _submitting = false;
  String? _submitError;
  String _deliveryMode = 'handed'; // 'handed' | 'doorstep' | 'neighbor' | 'guard'
  String _notes = '';

  bool get _doorstepPhoto => _photos.containsKey('doorstep');
  bool get _customerPhoto => _photos.containsKey('customer');
  bool get _locationPhoto => _photos.containsKey('location');
  bool get _damagePhoto => _photos.containsKey('damage');

  int get _photosCount => _photos.length;

  /// Open the camera and record the resulting file against [slot].
  Future<void> _capture(String slot, String title) async {
    final path = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (_) => CameraCaptureScreen(
          title: title,
          accentColor: PartnerTheme.deliveryColor,
          filePrefix: 'proof_$slot',
        ),
      ),
    );
    if (path == null || !mounted) return;
    setState(() => _photos[slot] = path);
  }
  bool get _canSubmit =>
      _doorstepPhoto &&
      (_deliveryMode == 'handed' ? _customerPhoto : true) &&
      (!_hasDamage || _damagePhoto);

  /// Record the proof against the assignment, then move to payment.
  ///
  /// Was: `setState(_submitting = true)` followed by `Future.delayed(1s)` and a
  /// navigation — a fake latency and nothing else. Nothing left the device, so a
  /// delivery marked complete here left no record anywhere.
  Future<void> _submit() async {
    if (!_canSubmit) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please capture all required photos'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: PartnerTheme.warningAmber),
      );
      return;
    }

    final args = ModalRoute.of(context)?.settings.arguments;
    final assignmentId = args is Map ? args['assignmentId']?.toString() : null;
    if (assignmentId == null || assignmentId.isEmpty) {
      setState(() => _submitError =
          'This delivery is missing its assignment reference. Go back and reopen it from your task list.');
      return;
    }

    setState(() {
      _submitting = true;
      _submitError = null;
    });

    try {
      // Upload first, then record. Submitting local device paths would have
      // stored strings that resolve to nothing outside this handset — the proof
      // has to exist on the server before the delivery is closed against it.
      final urls = <String>[];
      for (final entry in _photos.entries) {
        urls.add(await _api.uploadProofPhoto(
          assignmentId: assignmentId,
          slot: entry.key,
          filePath: entry.value,
        ));
      }

      await _api.submitProof(
        assignmentId: assignmentId,
        photoUrls: urls,
        deliveryMode: _deliveryMode,
        damageReported: _hasDamage,
        notes: _notes,
      );
      if (!mounted) return;
      Navigator.pushReplacementNamed(
        context,
        PartnerRouter.partnerDeliveryPayment,
        arguments: args,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _submitError =
            "We couldn't record this delivery. Check your connection and try again — your photos are still here.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(
        backgroundColor: PartnerTheme.deliveryColor,
        foregroundColor: Colors.white,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Photo Proof of Delivery',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text('DEL-782 • ORD-44812',
                style: TextStyle(fontSize: 11, color: Colors.white70)),
          ],
        ),
      ),
      body: Column(
        children: [
          // Progress indicator
          Container(
            color: PartnerTheme.deliveryColor,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Row(
              children: [
                _flowStep('OTP', true),
                _flowConnector(true),
                _flowStep('Photos', true, active: true),
                _flowConnector(false),
                _flowStep('Payment', false),
                _flowConnector(false),
                _flowStep('Done', false),
              ],
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Delivery Mode ────────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: PartnerTheme.cardDecoration(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('How was the package delivered?',
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _modeChip('handed', 'Handed to Customer',
                                Icons.handshake),
                            _modeChip('doorstep', 'Left at Doorstep',
                                Icons.door_front_door),
                            _modeChip(
                                'neighbor', 'Given to Neighbor', Icons.people),
                            _modeChip(
                                'guard', 'Security / Guard', Icons.security),
                          ],
                        ),
                        if (_deliveryMode == 'doorstep') ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: PartnerTheme.warningAmber
                                  .withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.warning_amber,
                                    size: 16, color: PartnerTheme.warningAmber),
                                SizedBox(width: 8),
                                Expanded(
                                    child: Text(
                                        'Doorstep deliveries require a clear photo of the package at the door with visible address.',
                                        style: TextStyle(
                                            fontSize: 10,
                                            color: PartnerTheme.warningAmber))),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── Photo Capture Grid ───────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: PartnerTheme.cardDecoration(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Delivery Photos',
                                style: TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 14)),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: _photosCount >= 2
                                    ? PartnerTheme.onlineGreen
                                        .withValues(alpha: 0.1)
                                    : PartnerTheme.warningAmber
                                        .withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text('$_photosCount photos',
                                  style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: _photosCount >= 2
                                          ? PartnerTheme.onlineGreen
                                          : PartnerTheme.warningAmber)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // Photo grid
                        GridView.count(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisCount: 2,
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                          childAspectRatio: 1.3,
                          children: [
                            _photoCard(
                              'Package at Doorstep',
                              Icons.inventory_2,
                              _doorstepPhoto,
                              true,
                              () => _capture('doorstep', 'Package at doorstep'),
                            ),
                            _photoCard(
                              _deliveryMode == 'handed'
                                  ? 'Customer Receiving'
                                  : 'Location/Door Number',
                              _deliveryMode == 'handed'
                                  ? Icons.person
                                  : Icons.door_front_door,
                              _customerPhoto,
                              _deliveryMode == 'handed',
                              () => _capture('customer', 'Customer receiving'),
                            ),
                            _photoCard(
                              'Address / Building',
                              Icons.location_on,
                              _locationPhoto,
                              false,
                              () => _capture('location', 'Address or building'),
                            ),
                            _photoCard(
                              'Damage Evidence',
                              Icons.broken_image,
                              _damagePhoto,
                              _hasDamage,
                              () => _capture('damage', 'Damage observed'),
                              isDamage: true,
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // Camera actions
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            // Opens the camera for the next slot still missing a
                            // photo. It used to "simulate camera capture" by
                            // flipping whichever boolean was still false.
                            onPressed: () {
                              if (!_doorstepPhoto) {
                                _capture('doorstep', 'Package at doorstep');
                              } else if (!_customerPhoto) {
                                _capture('customer', 'Customer receiving');
                              } else if (!_locationPhoto) {
                                _capture('location', 'Address or building');
                              } else if (_hasDamage && !_damagePhoto) {
                                _capture('damage', 'Damage observed');
                              }
                            },
                            icon: const Icon(Icons.camera_alt, size: 18),
                            label: const Text('Open Camera'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: PartnerTheme.deliveryColor,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── Damage Toggle ────────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: PartnerTheme.cardDecoration(),
                    child: Row(
                      children: [
                        Icon(Icons.report_problem,
                            size: 20,
                            color: _hasDamage
                                ? PartnerTheme.offlineRed
                                : PartnerTheme.textMuted),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Package Damage Observed?',
                                  style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13)),
                              Text(
                                  _hasDamage
                                      ? 'Please capture damage photos'
                                      : 'Toggle if package appears damaged',
                                  style: const TextStyle(
                                      fontSize: 10,
                                      color: PartnerTheme.textMuted)),
                            ],
                          ),
                        ),
                        Switch(
                          value: _hasDamage,
                          onChanged: (v) => setState(() => _hasDamage = v),
                          activeThumbColor: PartnerTheme.offlineRed,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── Delivery Notes ───────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: PartnerTheme.cardDecoration(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Delivery Notes (Optional)',
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 8),
                        TextField(
                          maxLines: 3,
                          onChanged: (v) => _notes = v,
                          decoration: InputDecoration(
                            hintText:
                                'E.g., Left with security guard at ground floor gate. Customer confirmed via call.',
                            hintStyle: const TextStyle(
                                fontSize: 12, color: PartnerTheme.textMuted),
                            filled: true,
                            fillColor: PartnerTheme.surface,
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: BorderSide.none),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── Geo Stamp ────────────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: PartnerTheme.infoBlue.withValues(alpha: 0.06),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: PartnerTheme.infoBlue.withValues(alpha: 0.2)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.gps_fixed,
                            size: 16, color: PartnerTheme.infoBlue),
                        SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('GPS Location Captured',
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: PartnerTheme.infoBlue)),
                              Text('12.9716° N, 77.5946° E • Accuracy: 4m',
                                  style: TextStyle(
                                      fontSize: 9,
                                      color: PartnerTheme.textMuted)),
                              Text('Timestamp: 27 Jun 2026, 11:02:34 AM IST',
                                  style: TextStyle(
                                      fontSize: 9,
                                      color: PartnerTheme.textMuted)),
                            ],
                          ),
                        ),
                        Icon(Icons.check_circle,
                            size: 16, color: PartnerTheme.onlineGreen),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),

          // ── Submit Button ────────────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: EdgeInsets.fromLTRB(
                16, 12, 16, MediaQuery.of(context).padding.bottom + 12),
            child: Column(
              children: [
                // Validation summary
                if (!_canSubmit)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline,
                            size: 14, color: PartnerTheme.warningAmber),
                        const SizedBox(width: 6),
                        Text(
                          !_doorstepPhoto
                              ? 'Package photo is required'
                              : !_customerPhoto && _deliveryMode == 'handed'
                                  ? 'Customer receiving photo is required'
                                  : _hasDamage && !_damagePhoto
                                      ? 'Damage photo is required'
                                      : '',
                          style: const TextStyle(
                              fontSize: 11, color: PartnerTheme.warningAmber),
                        ),
                      ],
                    ),
                  ),
                if (_submitError != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: Row(children: [
                      const Icon(Icons.error_outline, size: 18, color: Color(0xFFB4241C)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_submitError!,
                            style: const TextStyle(fontSize: 12, color: Color(0xFFB4241C))),
                      ),
                    ]),
                  ),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _canSubmit
                          ? PartnerTheme.onlineGreen
                          : PartnerTheme.textMuted,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _submitting
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2.5))
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.check_circle,
                                  color: Colors.white, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                  'Submit Proof ($_photosCount photo${_photosCount != 1 ? 's' : ''})',
                                  style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white)),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  Widget _flowStep(String label, bool done, {bool active = false}) {
    return Column(
      children: [
        Container(
          width: active ? 26 : 20,
          height: active ? 26 : 20,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: done ? Colors.white : Colors.white.withValues(alpha: 0.2),
            border: active ? Border.all(color: Colors.white, width: 2) : null,
          ),
          child: Center(
            child: done && !active
                ? const Icon(Icons.check,
                    size: 12, color: PartnerTheme.deliveryColor)
                : active
                    ? const Icon(Icons.camera_alt,
                        size: 12, color: PartnerTheme.deliveryColor)
                    : null,
          ),
        ),
        const SizedBox(height: 4),
        Text(label,
            style: TextStyle(
                fontSize: 9,
                color: done || active ? Colors.white : Colors.white60,
                fontWeight: active ? FontWeight.bold : FontWeight.normal)),
      ],
    );
  }

  Widget _flowConnector(bool done) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 16),
        color: done ? Colors.white : Colors.white.withValues(alpha: 0.2),
      ),
    );
  }

  Widget _modeChip(String value, String label, IconData icon) {
    final sel = _deliveryMode == value;
    return GestureDetector(
      onTap: () => setState(() => _deliveryMode = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: sel
              ? PartnerTheme.deliveryColor.withValues(alpha: 0.1)
              : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
              color: sel ? PartnerTheme.deliveryColor : PartnerTheme.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: 14,
                color:
                    sel ? PartnerTheme.deliveryColor : PartnerTheme.textMuted),
            const SizedBox(width: 6),
            Text(label,
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: sel
                        ? PartnerTheme.deliveryColor
                        : PartnerTheme.textSecondary)),
          ],
        ),
      ),
    );
  }

  Widget _photoCard(String label, IconData icon, bool captured, bool required,
      VoidCallback onTap,
      {bool isDamage = false}) {
    return GestureDetector(
      onTap: captured ? null : onTap,
      child: Container(
        decoration: BoxDecoration(
          color: captured
              ? (isDamage
                  ? PartnerTheme.offlineRed.withValues(alpha: 0.06)
                  : PartnerTheme.onlineGreen.withValues(alpha: 0.06))
              : PartnerTheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: captured
                ? (isDamage
                    ? PartnerTheme.offlineRed.withValues(alpha: 0.3)
                    : PartnerTheme.onlineGreen.withValues(alpha: 0.3))
                : PartnerTheme.border,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              captured ? Icons.check_circle : icon,
              size: 28,
              color: captured
                  ? (isDamage
                      ? PartnerTheme.offlineRed
                      : PartnerTheme.onlineGreen)
                  : PartnerTheme.textMuted,
            ),
            const SizedBox(height: 6),
            Text(label,
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: captured
                        ? PartnerTheme.textPrimary
                        : PartnerTheme.textMuted),
                textAlign: TextAlign.center),
            if (required && !captured) ...[
              const SizedBox(height: 2),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                    color: PartnerTheme.offlineRed.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4)),
                child: const Text('Required',
                    style: TextStyle(
                        fontSize: 7,
                        fontWeight: FontWeight.bold,
                        color: PartnerTheme.offlineRed)),
              ),
            ],
            if (captured) ...[
              const SizedBox(height: 2),
              Text('✓ Captured',
                  style: TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      color: isDamage
                          ? PartnerTheme.offlineRed
                          : PartnerTheme.onlineGreen)),
            ],
          ],
        ),
      ),
    );
  }
}
