import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../taxi_booking_routes.dart';

/// Ride Cancellation Screen — Cancel with reason + fee warning.
///
/// Features:
///  - Animated reason chips (not radio buttons)
///  - Cancellation fee estimate
///  - "Other" free-text option
///  - Confirms via BLoC CancelRide event
///  - Warning banner with fee breakdown
class RideCancellationScreen extends StatefulWidget {
  const RideCancellationScreen({super.key});

  @override
  State<RideCancellationScreen> createState() => _RideCancellationScreenState();
}

class _RideCancellationScreenState extends State<RideCancellationScreen>
    with SingleTickerProviderStateMixin {
  String? _selectedReason;
  final _otherController = TextEditingController();
  bool _isSubmitting = false;
  late AnimationController _entryCtrl;

  static const _reasons = [
    _CancelReason(
        icon: Icons.schedule_rounded, label: 'Driver is too far', fee: 0),
    _CancelReason(
        icon: Icons.swap_horiz_rounded, label: 'Changed my plans', fee: 50),
    _CancelReason(
        icon: Icons.local_taxi_rounded, label: 'Found another ride', fee: 50),
    _CancelReason(
        icon: Icons.wrong_location_rounded,
        label: 'Wrong pickup location',
        fee: 0),
    _CancelReason(
        icon: Icons.attach_money_rounded, label: 'Price too high', fee: 0),
    _CancelReason(
        icon: Icons.person_off_rounded,
        label: 'Driver asked to cancel',
        fee: 0),
    _CancelReason(icon: Icons.edit_note_rounded, label: 'Other reason', fee: 0),
  ];

  bool get _isDark => Theme.of(context).brightness == Brightness.dark;
  Color get _bg => _isDark ? const Color(0xFF0F0F23) : Colors.grey.shade50;
  Color get _card => _isDark ? const Color(0xFF1A1A2E) : Colors.white;

  @override
  void initState() {
    super.initState();
    _entryCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600))
      ..forward();
  }

  @override
  void dispose() {
    _otherController.dispose();
    _entryCtrl.dispose();
    super.dispose();
  }

  int get _cancellationFee {
    if (_selectedReason == null) return 0;
    return _reasons
        .firstWhere((r) => r.label == _selectedReason,
            orElse: () => _reasons.first)
        .fee;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        title: const Text('Cancel Ride',
            style: TextStyle(fontWeight: FontWeight.w700)),
        elevation: 0,
      ),
      body: FadeTransition(
        opacity: _entryCtrl,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Why are you cancelling?',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: _isDark ? Colors.white : Colors.black87)),
              const SizedBox(height: 4),
              Text('Select a reason to help us improve',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
              const SizedBox(height: 20),
              // ── Reason Chips ─────────────────────────────────
              Expanded(
                child: ListView.builder(
                  itemCount: _reasons.length +
                      (_selectedReason == 'Other reason' ? 1 : 0),
                  itemBuilder: (ctx, i) {
                    if (i >= _reasons.length) {
                      return Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: TextField(
                          controller: _otherController,
                          maxLines: 3,
                          decoration: InputDecoration(
                            hintText: 'Tell us what happened...',
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12)),
                            filled: true,
                            fillColor: _card,
                          ),
                        ),
                      );
                    }
                    final reason = _reasons[i];
                    final isSelected = _selectedReason == reason.label;
                    return GestureDetector(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        setState(() => _selectedReason = reason.label);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? Colors.red.withValues(alpha: 0.08)
                              : _card,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected
                                ? Colors.red.shade400
                                : Colors.transparent,
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withValues(alpha: 0.03),
                                blurRadius: 6,
                                offset: const Offset(0, 2))
                          ],
                        ),
                        child: Row(
                          children: [
                            Icon(reason.icon,
                                color: isSelected
                                    ? Colors.red.shade400
                                    : Colors.grey,
                                size: 22),
                            const SizedBox(width: 12),
                            Expanded(
                                child: Text(reason.label,
                                    style: TextStyle(
                                        fontWeight: isSelected
                                            ? FontWeight.w600
                                            : FontWeight.w500,
                                        fontSize: 14))),
                            if (reason.fee > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                    color:
                                        Colors.orange.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6)),
                                child: Text('Fee: ${reason.fee}',
                                    style: TextStyle(
                                        color: Colors.orange.shade700,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600)),
                              ),
                            const SizedBox(width: 8),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: 22,
                              height: 22,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isSelected
                                    ? Colors.red.shade400
                                    : Colors.transparent,
                                border: Border.all(
                                    color: isSelected
                                        ? Colors.red.shade400
                                        : Colors.grey.shade300,
                                    width: 2),
                              ),
                              child: isSelected
                                  ? const Icon(Icons.check,
                                      size: 14, color: Colors.white)
                                  : null,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              // ── Fee Warning Banner ──────────────────────────
              if (_cancellationFee > 0)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border:
                        Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded,
                          color: Colors.orange, size: 24),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'A cancellation fee of $_cancellationFee will be charged as the driver is already on the way.',
                          style: TextStyle(
                              fontSize: 13, color: Colors.orange.shade800),
                        ),
                      ),
                    ],
                  ),
                ),
              // ── Cancel Button ───────────────────────────────
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _selectedReason == null || _isSubmitting
                      ? null
                      : _submitCancellation,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red.shade500,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Confirm Cancellation',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _submitCancellation() async {
    HapticFeedback.heavyImpact();
    setState(() => _isSubmitting = true);
    final reason = _selectedReason == 'Other reason'
        ? _otherController.text
        : _selectedReason;
    // Wire to BLoC: context.read<BookingBloc>().add(CancelRide(reason: reason));
    debugPrint('Cancellation reason: $reason');
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    Navigator.of(context).popUntil((route) =>
        route.settings.name == TaxiBookingRoutes.home || route.isFirst);
  }
}

class _CancelReason {
  final IconData icon;
  final String label;
  final int fee;
  const _CancelReason(
      {required this.icon, required this.label, required this.fee});
}
