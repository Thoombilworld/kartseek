import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_exception.dart';
import 'package:kartseek_customer/features/marketplace/services/marketplace_api_service.dart';
import 'package:kartseek_customer/features/marketplace/widgets/marketplace_error_state.dart';

/// Order tracking timeline.
///
/// Every value on this screen used to be a literal: the order id defaulted to
/// 'KS-2026-78432', the courier was always "KARTSEEK Logistics", the tracking
/// number was always DELHUB2026060478, and the six timeline steps carried fixed
/// June 2026 timestamps with the fourth marked complete. Two customers tracking
/// two different orders saw the same delivery. `getTrackingEvents` already
/// existed on the client and nothing called it.
class OrderTrackingScreen extends StatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  final _api = MarketplaceApiService();

  Map<String, dynamic>? _tracking;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.getTrackingEvents(widget.orderId);
      if (!mounted) return;
      setState(() {
        _tracking = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is MarketplaceApiException
            ? e.message
            : "We couldn't load tracking for this order. Please try again.";
      });
    }
  }

  /// Timeline rows, normalised out of whatever the tracking payload carries.
  ///
  /// The service returns shipment events; the screen shows a progress ladder.
  /// A step is complete when an event exists for it — nothing is marked done on
  /// a guess, which is what the hardcoded list did.
  List<_Step> get _steps {
    final events = (_tracking?['events'] ?? _tracking?['data'] ?? const []) as List;
    return events
        .whereType<Map>()
        .map((e) => _Step(
              title: (e['status'] ?? e['title'] ?? 'Update').toString(),
              detail: (e['description'] ?? e['location'] ?? '').toString(),
              at: e['occurredAt'] ?? e['createdAt'] ?? e['timestamp'],
              done: true,
            ))
        .toList();
  }

  String _formatWhen(Object? raw) {
    if (raw == null) return '';
    final parsed = DateTime.tryParse(raw.toString());
    if (parsed == null) return raw.toString();
    final local = parsed.toLocal();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    final meridiem = local.hour < 12 ? 'AM' : 'PM';
    return '${months[local.month - 1]} ${local.day}, ${local.year} $hour:$minute $meridiem';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(title: Text('Track Order ${widget.orderId}')),
      body: RefreshIndicator(onRefresh: _load, child: _body()),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(strokeWidth: 2));
    }
    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 100),
          MarketplaceErrorState(message: _error!, onRetry: _load),
        ],
      );
    }

    final steps = _steps;
    final status = (_tracking?['status'] ?? 'Order placed').toString();
    final trackingId = _tracking?['trackingNumber'] ?? _tracking?['trackingId'];
    final courier = _tracking?['courier'] ?? _tracking?['carrier'];

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const Icon(Icons.local_shipping, color: Colors.white, size: 28),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(status,
                      style: const TextStyle(
                          color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                ),
              ]),
              const SizedBox(height: 8),
              // Shown only when the shipment actually carries them — an
              // invented tracking number is worse than none, because a customer
              // will take it to the courier's own site.
              if (trackingId != null)
                Text('Tracking ID: $trackingId',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.78), fontSize: 12)),
              if (courier != null)
                Text('Courier: $courier',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.78), fontSize: 12)),
            ],
          ),
        ),
        const SizedBox(height: 28),
        if (steps.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Column(children: [
              Icon(Icons.schedule, size: 40, color: AppTheme.textMuted),
              SizedBox(height: 12),
              Text('No tracking updates yet',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              SizedBox(height: 4),
              Text('Updates appear here as your order moves.',
                  style: AppTheme.caption, textAlign: TextAlign.center),
            ]),
          )
        else
          ...List.generate(steps.length, (i) => _timelineRow(steps[i], isLast: i == steps.length - 1)),
      ],
    );
  }

  Widget _timelineRow(_Step step, {required bool isLast}) {
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Column(children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: step.done ? AppTheme.successGreen : AppTheme.borderLight,
            ),
            child: step.done
                ? const Icon(Icons.check, color: Colors.white, size: 16)
                : Center(
                    child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                            shape: BoxShape.circle, color: AppTheme.textMuted))),
          ),
          if (!isLast)
            Expanded(
              child: Container(
                width: 2,
                color: step.done
                    ? AppTheme.successGreen.withValues(alpha: 0.4)
                    : AppTheme.borderLight,
              ),
            ),
        ]),
        const SizedBox(width: 16),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 28),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(step.title,
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: step.done ? AppTheme.textPrimary : AppTheme.textMuted)),
              if (step.detail.isNotEmpty)
                Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(step.detail, style: AppTheme.caption)),
              if (_formatWhen(step.at).isNotEmpty)
                Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(_formatWhen(step.at), style: AppTheme.caption)),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _Step {
  const _Step({required this.title, required this.detail, required this.at, required this.done});

  final String title;
  final String detail;
  final Object? at;
  final bool done;
}
