import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/services/map_navigation_service.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// Return Pickup Flow — Full flow for delivery partners assigned to pick up
/// returned items from customers and transport them back to the seller/warehouse.
///
/// Mirrors the forward-delivery flow but with reversed logistics:
///   1. Accept Assignment → 2. Navigate to Customer → 3. Verify Item →
///   4. Take Photos → 5. Confirm Pickup → 6. Navigate to Warehouse → 7. Hand Over
class ReturnPickupScreen extends StatefulWidget {
  const ReturnPickupScreen({super.key});
  @override
  State<ReturnPickupScreen> createState() => _ReturnPickupScreenState();
}

class _ReturnPickupScreenState extends State<ReturnPickupScreen>
    with SingleTickerProviderStateMixin {
  int _currentStep = 0;
  int _elapsed = 0;
  bool _itemVerified = false;
  bool _photosTaken = false;
  bool _customerSigned = false;
  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;

  // Mock return request data
  static const _returnId = 'RET-2026-1089';
  static const _orderId = 'ORD-44812';
  static const _customerName = 'Sneha Reddy';
  static const _customerPhone = '+91 98765 43210';
  static const _customerAddress = '42, MG Road, Indira Nagar, Bangalore 560038';
  static const _warehouseAddress = 'KARTSEEK Hub, Whitefield, Bangalore 560066';
  static const _productName = 'iPhone 15 Clear Case — Wrong color delivered';
  static const _returnReason = 'Wrong item received';
  static const _productValue = 1299;
  static const _pickupLat = 12.9716;
  static const _pickupLng = 77.5946;
  static const _warehouseLat = 12.9698;
  static const _warehouseLng = 77.7500;

  final _steps = [
    'Assignment',
    'En Route',
    'At Customer',
    'Item Check',
    'Photo Proof',
    'Pickup Done',
    'Drop at Hub',
  ];

  @override
  void initState() {
    super.initState();
    _pulseCtrl =
        AnimationController(vsync: this, duration: const Duration(seconds: 2))
          ..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.6, end: 1.0).animate(_pulseCtrl);
    // Timer
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() => _elapsed++);
      return true;
    });
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  String get _elapsedStr {
    final m = _elapsed ~/ 60;
    final s = _elapsed % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  void _advanceStep() {
    if (_currentStep == 3 && !_itemVerified) {
      _showSnack('Please verify the item condition first');
      return;
    }
    if (_currentStep == 4 && !_photosTaken) {
      _showSnack('Please take at least 2 photos of the item');
      return;
    }
    if (_currentStep >= _steps.length - 1) {
      // Complete — navigate to completed screen
      Navigator.pushReplacementNamed(
          context, PartnerRouter.partnerDeliveryDashboard);
      return;
    }
    setState(() => _currentStep++);
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
          content: Text(msg),
          behavior: SnackBarBehavior.floating,
          backgroundColor: PartnerTheme.warningAmber,
          duration: const Duration(seconds: 2)),
    );
  }

  String get _actionLabel {
    switch (_currentStep) {
      case 0:
        return 'Start Navigation';
      case 1:
        return 'Arrived at Customer';
      case 2:
        return 'Begin Item Check';
      case 3:
        return 'Proceed to Photos';
      case 4:
        return 'Confirm Pickup';
      case 5:
        return 'Navigate to Hub';
      case 6:
        return 'Complete Handover';
      default:
        return 'Continue';
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;

    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(
        backgroundColor: PartnerTheme.deliveryColor,
        foregroundColor: Colors.white,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Return Pickup',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text(_returnId,
                style: TextStyle(fontSize: 11, color: Colors.white70)),
          ],
        ),
        actions: [
          // Live timer
          AnimatedBuilder(
            animation: _pulseAnim,
            builder: (_, __) => Opacity(
              opacity: _pulseAnim.value,
              child: Container(
                margin: const EdgeInsets.only(right: 12),
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(children: [
                  const Icon(Icons.timer, size: 14, color: Colors.white),
                  const SizedBox(width: 4),
                  Text(_elapsedStr,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace')),
                ]),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Step Progress ────────────────────────────────────────────────
          Container(
            color: PartnerTheme.deliveryColor,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Row(
              children: List.generate(_steps.length, (i) {
                final done = i < _currentStep;
                final active = i == _currentStep;
                return Expanded(
                  child: Column(
                    children: [
                      Row(children: [
                        if (i > 0)
                          Expanded(
                              child: Container(
                                  height: 2,
                                  color: done
                                      ? Colors.white
                                      : Colors.white.withValues(alpha: 0.2))),
                        Container(
                          width: active ? 24 : 18,
                          height: active ? 24 : 18,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: done
                                ? Colors.white
                                : active
                                    ? Colors.white
                                    : Colors.white.withValues(alpha: 0.2),
                          ),
                          child: Center(
                            child: done
                                ? const Icon(Icons.check,
                                    size: 12, color: PartnerTheme.deliveryColor)
                                : active
                                    ? Text('${i + 1}',
                                        style: const TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: PartnerTheme.deliveryColor))
                                    : Text('${i + 1}',
                                        style: TextStyle(
                                            fontSize: 9,
                                            color: Colors.white
                                                .withValues(alpha: 0.5))),
                          ),
                        ),
                        if (i < _steps.length - 1)
                          Expanded(
                              child: Container(
                                  height: 2,
                                  color: done
                                      ? Colors.white
                                      : Colors.white.withValues(alpha: 0.2))),
                      ]),
                      const SizedBox(height: 4),
                      Text(_steps[i],
                          style: TextStyle(
                              fontSize: 7,
                              color: active || done
                                  ? Colors.white
                                  : Colors.white60,
                              fontWeight: active
                                  ? FontWeight.bold
                                  : FontWeight.normal)),
                    ],
                  ),
                );
              }),
            ),
          ),

          // ── Body ─────────────────────────────────────────────────────────
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Return Info Card
                  _infoCard(currency),
                  const SizedBox(height: 12),

                  // Step-specific content
                  if (_currentStep <= 1) _navigationSection(),
                  if (_currentStep == 2) _atCustomerSection(),
                  if (_currentStep == 3) _itemCheckSection(),
                  if (_currentStep == 4) _photoProofSection(),
                  if (_currentStep == 5) _pickupConfirmedSection(),
                  if (_currentStep == 6) _warehouseHandoverSection(),
                ],
              ),
            ),
          ),

          // ── Bottom Action ────────────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: EdgeInsets.fromLTRB(
                16, 12, 16, MediaQuery.of(context).padding.bottom + 12),
            child: Row(
              children: [
                // Navigate button (contextual)
                if (_currentStep == 1 || _currentStep == 5 || _currentStep == 6)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: SizedBox(
                      height: 52,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          final service = MapNavigationService.instance;
                          if (_currentStep <= 2) {
                            service.navigateToPickup(
                                lat: _pickupLat,
                                lng: _pickupLng,
                                label: _customerName);
                          } else {
                            service.navigateToDropoff(
                                lat: _warehouseLat,
                                lng: _warehouseLng,
                                label: 'KARTSEEK Hub');
                          }
                        },
                        icon: const Icon(Icons.navigation, size: 18),
                        label: const Text('Navigate'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: PartnerTheme.deliveryColor,
                          side: const BorderSide(
                              color: PartnerTheme.deliveryColor),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                    ),
                  ),
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _advanceStep,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PartnerTheme.deliveryColor,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      child: Text(_actionLabel,
                          style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Colors.white)),
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

  // ── Return Info Card ──────────────────────────────────────────────────────
  Widget _infoCard(String currency) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: PartnerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: PartnerTheme.warningAmber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.undo,
                    color: PartnerTheme.warningAmber, size: 18),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_productName,
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 13),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                    SizedBox(height: 2),
                    Text('Reason: $_returnReason',
                        style: TextStyle(
                            fontSize: 11, color: PartnerTheme.textMuted)),
                  ],
                ),
              ),
              Text('$currency $_productValue',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15)),
            ],
          ),
          const Divider(height: 20),
          _detailRow(Icons.receipt_long, 'Order', _orderId),
          _detailRow(Icons.person_outline, 'Customer', _customerName),
          _detailRow(Icons.phone_outlined, 'Phone', _customerPhone),
          _detailRow(Icons.location_on_outlined, 'Pickup', _customerAddress),
          _detailRow(Icons.warehouse_outlined, 'Drop Hub', _warehouseAddress),
        ],
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: PartnerTheme.textMuted),
          const SizedBox(width: 8),
          SizedBox(
              width: 55,
              child: Text(label,
                  style: const TextStyle(
                      fontSize: 11, color: PartnerTheme.textMuted))),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  // ── Step: Navigation ──────────────────────────────────────────────────────
  Widget _navigationSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: PartnerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.navigation,
                  color: PartnerTheme.deliveryColor, size: 20),
              const SizedBox(width: 8),
              Text(
                _currentStep == 0
                    ? 'Navigate to Customer'
                    : 'En Route to Customer',
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Mini map placeholder
          Container(
            height: 140,
            decoration: BoxDecoration(
              color: PartnerTheme.deliveryColor.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: PartnerTheme.deliveryColor.withValues(alpha: 0.2)),
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.map,
                      size: 36,
                      color: PartnerTheme.deliveryColor.withValues(alpha: 0.4)),
                  const SizedBox(height: 8),
                  const Text('3.2 km away • ~12 min',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: PartnerTheme.deliveryColor)),
                  const Text('Tap Navigate for turn-by-turn',
                      style: TextStyle(
                          fontSize: 10, color: PartnerTheme.textMuted)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Customer contact
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.phone, size: 16),
                  label: const Text('Call Customer'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: PartnerTheme.textPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.chat_bubble_outline, size: 16),
                  label: const Text('Message'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: PartnerTheme.textPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Step: At Customer ─────────────────────────────────────────────────────
  Widget _atCustomerSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: PartnerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.person_pin_circle,
                  color: PartnerTheme.onlineGreen, size: 20),
              SizedBox(width: 8),
              Text('Arrived at Customer',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 12),
          _checklist('Greet the customer and introduce yourself', true),
          _checklist('Ask for the return item(s)', true),
          _checklist('Verify the return item matches the order', false),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: PartnerTheme.infoBlue.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline,
                    size: 16, color: PartnerTheme.infoBlue),
                SizedBox(width: 8),
                Expanded(
                    child: Text(
                        'If the customer is unavailable, wait 10 minutes then mark as "Customer Not Available".',
                        style: TextStyle(
                            fontSize: 11, color: PartnerTheme.infoBlue))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Step: Item Check ──────────────────────────────────────────────────────
  Widget _itemCheckSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: PartnerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.fact_check,
                  color: PartnerTheme.warningAmber, size: 20),
              SizedBox(width: 8),
              Text('Item Verification',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 12),
          _checkItem('Item matches product description', _itemVerified),
          _checkItem('Original packaging intact', _itemVerified),
          _checkItem('No visible physical damage', _itemVerified),
          _checkItem('All accessories/tags present', _itemVerified),
          const SizedBox(height: 12),
          // Condition selector
          const Text('Item Condition',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: ['Excellent', 'Good', 'Fair', 'Damaged'].map((c) {
              final sel = c == 'Good';
              final color = c == 'Damaged'
                  ? PartnerTheme.offlineRed
                  : c == 'Fair'
                      ? PartnerTheme.warningAmber
                      : PartnerTheme.onlineGreen;
              return GestureDetector(
                onTap: () => setState(() => _itemVerified = true),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: sel ? color.withValues(alpha: 0.15) : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border:
                        Border.all(color: sel ? color : PartnerTheme.border),
                  ),
                  child: Text(c,
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: sel ? color : PartnerTheme.textSecondary)),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          TextField(
            maxLines: 2,
            decoration: InputDecoration(
              hintText: 'Notes about item condition (optional)',
              hintStyle:
                  const TextStyle(fontSize: 12, color: PartnerTheme.textMuted),
              filled: true,
              fillColor: PartnerTheme.surface,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none),
            ),
          ),
          if (_itemVerified) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: PartnerTheme.onlineGreen.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle,
                      size: 16, color: PartnerTheme.onlineGreen),
                  SizedBox(width: 8),
                  Text('Item verified ✓',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: PartnerTheme.onlineGreen)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── Step: Photo Proof ─────────────────────────────────────────────────────
  Widget _photoProofSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: PartnerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.camera_alt,
                  color: PartnerTheme.deliveryColor, size: 20),
              SizedBox(width: 8),
              Text('Photo Evidence',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 4),
          const Text('Take clear photos of the return item for verification',
              style: TextStyle(fontSize: 11, color: PartnerTheme.textMuted)),
          const SizedBox(height: 12),
          // Photo grid
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 3,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            children: [
              _photoSlot('Front View', _photosTaken),
              _photoSlot('Back View', _photosTaken),
              _photoSlot('Label/Tag', false),
              _photoSlot('Packaging', false),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => setState(() => _photosTaken = true),
                  icon: const Icon(Icons.camera_alt, size: 16),
                  label: const Text('Take Photo'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: PartnerTheme.deliveryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => setState(() => _photosTaken = true),
                  icon: const Icon(Icons.photo_library, size: 16),
                  label: const Text('Gallery'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: PartnerTheme.deliveryColor,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
          if (_photosTaken) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: PartnerTheme.onlineGreen.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle,
                      size: 16, color: PartnerTheme.onlineGreen),
                  SizedBox(width: 8),
                  Text('2 photos captured ✓',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: PartnerTheme.onlineGreen)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _photoSlot(String label, bool taken) {
    return Container(
      decoration: BoxDecoration(
        color: taken
            ? PartnerTheme.onlineGreen.withValues(alpha: 0.08)
            : PartnerTheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: taken
                ? PartnerTheme.onlineGreen.withValues(alpha: 0.3)
                : PartnerTheme.border,
            style: taken ? BorderStyle.solid : BorderStyle.solid),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(taken ? Icons.check_circle : Icons.add_a_photo,
              size: 24,
              color: taken ? PartnerTheme.onlineGreen : PartnerTheme.textMuted),
          const SizedBox(height: 4),
          Text(label,
              style: TextStyle(
                  fontSize: 9,
                  color:
                      taken ? PartnerTheme.onlineGreen : PartnerTheme.textMuted,
                  fontWeight: FontWeight.w600),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }

  // ── Step: Pickup Confirmed ────────────────────────────────────────────────
  Widget _pickupConfirmedSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: PartnerTheme.cardDecoration(),
      child: Column(
        children: [
          Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              color: PartnerTheme.onlineGreen.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle,
                size: 40, color: PartnerTheme.onlineGreen),
          ),
          const SizedBox(height: 12),
          const Text('Item Picked Up!',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 4),
          const Text(
              'Now navigate to the KARTSEEK Hub to drop off the return item.',
              style: TextStyle(fontSize: 12, color: PartnerTheme.textSecondary),
              textAlign: TextAlign.center),
          const SizedBox(height: 16),
          // Customer signature
          GestureDetector(
            onTap: () => setState(() => _customerSigned = true),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _customerSigned
                    ? PartnerTheme.onlineGreen.withValues(alpha: 0.06)
                    : PartnerTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: _customerSigned
                        ? PartnerTheme.onlineGreen
                        : PartnerTheme.border),
              ),
              child: Row(
                children: [
                  Icon(_customerSigned ? Icons.check_circle : Icons.draw,
                      size: 20,
                      color: _customerSigned
                          ? PartnerTheme.onlineGreen
                          : PartnerTheme.textMuted),
                  const SizedBox(width: 10),
                  Text(
                      _customerSigned
                          ? 'Customer signature collected ✓'
                          : 'Tap to collect customer signature',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _customerSigned
                              ? PartnerTheme.onlineGreen
                              : PartnerTheme.textSecondary)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Step: Warehouse Handover ──────────────────────────────────────────────
  Widget _warehouseHandoverSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: PartnerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.warehouse,
                  color: PartnerTheme.deliveryColor, size: 20),
              SizedBox(width: 8),
              Text('Hub Handover',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 12),
          _checklist('Arrived at KARTSEEK Hub', true),
          _checklist('Presented return item to hub staff', true),
          _checklist('Hub staff scanned the QR/barcode', false),
          _checklist('Received handover confirmation', false),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: PartnerTheme.earningsGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Pickup Fee',
                        style: TextStyle(color: Colors.white70, fontSize: 11)),
                    SizedBox(height: 2),
                    Text('You\'ll Earn',
                        style: TextStyle(color: Colors.white70, fontSize: 11)),
                  ],
                ),
                Text(
                    '${RegionService.instance.currentCountry.currencySymbol} 35',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Shared Widgets ────────────────────────────────────────────────────────
  Widget _checklist(String text, bool done) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(done ? Icons.check_circle : Icons.radio_button_unchecked,
              size: 18,
              color: done ? PartnerTheme.onlineGreen : PartnerTheme.textMuted),
          const SizedBox(width: 8),
          Expanded(
              child: Text(text,
                  style: TextStyle(
                      fontSize: 12,
                      color: done
                          ? PartnerTheme.textPrimary
                          : PartnerTheme.textSecondary))),
        ],
      ),
    );
  }

  Widget _checkItem(String text, bool checked) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(checked ? Icons.check_box : Icons.check_box_outline_blank,
              size: 18,
              color:
                  checked ? PartnerTheme.onlineGreen : PartnerTheme.textMuted),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 12))),
        ],
      ),
    );
  }
}
