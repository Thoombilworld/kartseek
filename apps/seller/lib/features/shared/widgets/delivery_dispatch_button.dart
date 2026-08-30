import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/services/seller_order_socket_service.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

/// A prominent button that triggers automatic delivery partner assignment.
///
/// Shown when an order's status is [SellerOrderStatus.readyForPickup].
/// Calls [SellerOrderSocketService.dispatchDelivery] and shows a confirmation
/// banner so the seller knows the request was routed to the delivery app.
///
/// Usage:
/// ```dart
/// DeliveryDispatchButton(
///   order: order,
///   onDispatched: () => setState(() => order = order.copyWith(status: 'dispatched')),
/// )
/// ```
class DeliveryDispatchButton extends StatefulWidget {
  final SellerOrder order;
  final VoidCallback? onDispatched;
  final double? pickupLat;
  final double? pickupLng;
  final String? pickupAddress;

  const DeliveryDispatchButton({
    super.key,
    required this.order,
    this.onDispatched,
    this.pickupLat,
    this.pickupLng,
    this.pickupAddress,
  });

  @override
  State<DeliveryDispatchButton> createState() => _DeliveryDispatchButtonState();
}

class _DeliveryDispatchButtonState extends State<DeliveryDispatchButton>
    with SingleTickerProviderStateMixin {
  bool _dispatching = false;
  bool _dispatched = false;
  late final AnimationController _pulse;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _scale = Tween<double>(begin: 1.0, end: 1.04).animate(
      CurvedAnimation(parent: _pulse, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  Future<void> _dispatch() async {
    setState(() => _dispatching = true);

    // Emit the WebSocket event to assign a delivery partner
    SellerOrderSocketService().dispatchDelivery(
      orderId:       widget.order.id,
      pickupLat:     widget.pickupLat  ?? 25.2854,  // default: Doha, Qatar
      pickupLng:     widget.pickupLng  ?? 51.5310,
      pickupAddress: widget.pickupAddress ?? widget.order.deliveryAddress,
    );

    // Simulate API confirmation (replace with real response stream)
    await Future.delayed(const Duration(milliseconds: 1400));

    if (mounted) {
      setState(() {
        _dispatching = false;
        _dispatched = true;
      });
      _pulse.stop();
      widget.onDispatched?.call();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Delivery request sent! A partner will be assigned shortly.',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          backgroundColor: SellerTheme.successGreen,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Only render when the order is ready for pickup
    if (widget.order.status != SellerOrderStatus.ready && !_dispatched) {
      return const SizedBox.shrink();
    }

    if (_dispatched) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: SellerTheme.successGreen.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: SellerTheme.successGreen.withValues(alpha: 0.3)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_shipping, color: SellerTheme.successGreen, size: 20),
            SizedBox(width: 8),
            Text('Delivery Partner Assigned ✓',
                style: TextStyle(
                    color: SellerTheme.successGreen,
                    fontWeight: FontWeight.bold,
                    fontSize: 14)),
          ],
        ),
      );
    }

    return ScaleTransition(
      scale: _scale,
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton.icon(
          onPressed: _dispatching ? null : _dispatch,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF00C896),
            foregroundColor: Colors.white,
            disabledBackgroundColor: const Color(0xFF00C896).withValues(alpha: 0.6),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          icon: _dispatching
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                )
              : const Icon(Icons.local_shipping_outlined, size: 20),
          label: Text(
            _dispatching ? 'Assigning Partner...' : '🚚  Dispatch Delivery Partner',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Status Stepper
// ─────────────────────────────────────────────────────────────────────────────

/// Visual timeline showing the lifecycle of a seller order.
/// Highlights the current [SellerOrderStatus] step.
class OrderStatusStepper extends StatelessWidget {
  final SellerOrderStatus currentStatus;

  const OrderStatusStepper({super.key, required this.currentStatus});

  static const _steps = [
    (SellerOrderStatus.pending,         '📋', 'Received'),
    (SellerOrderStatus.confirmed,       '✅', 'Confirmed'),
    (SellerOrderStatus.preparing,       '🍳', 'Preparing'),
    (SellerOrderStatus.ready,           '📦', 'Ready'),
    (SellerOrderStatus.assigned,        '🚚', 'Assigned'),
    (SellerOrderStatus.outForDelivery,  '🏃', 'On Way'),
    (SellerOrderStatus.delivered,       '🏠', 'Delivered'),
  ];

  @override
  Widget build(BuildContext context) {
    final currentIdx = _steps.indexWhere((s) => s.$1 == currentStatus);

    return SizedBox(
      height: 72,
      child: Row(
        children: List.generate(_steps.length * 2 - 1, (i) {
          if (i.isOdd) {
            // Connector line
            final lineIdx = i ~/ 2;
            final completed = lineIdx < currentIdx;
            return Expanded(
              child: Container(
                height: 2,
                color: completed ? SellerTheme.successGreen : SellerTheme.border,
              ),
            );
          }
          final stepIdx = i ~/ 2;
          final (status, emoji, label) = _steps[stepIdx];
          final isActive   = stepIdx == currentIdx;
          final isComplete = stepIdx < currentIdx;
          final color = isActive
              ? SellerTheme.primary
              : isComplete
                  ? SellerTheme.successGreen
                  : SellerTheme.border;

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                width: isActive ? 36 : 30,
                height: isActive ? 36 : 30,
                decoration: BoxDecoration(
                  color: isActive
                      ? SellerTheme.primary.withValues(alpha: 0.12)
                      : isComplete
                          ? SellerTheme.successGreen.withValues(alpha: 0.1)
                          : Colors.grey.shade100,
                  shape: BoxShape.circle,
                  border: Border.all(color: color, width: isActive ? 2 : 1.5),
                ),
                child: Center(
                  child: Text(emoji, style: TextStyle(fontSize: isActive ? 16 : 13)),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 9,
                  color: isActive ? SellerTheme.primary : isComplete ? SellerTheme.successGreen : SellerTheme.textMuted,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          );
        }),
      ),
    );
  }
}
