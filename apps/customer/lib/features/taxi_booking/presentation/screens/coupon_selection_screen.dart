/// KARTSEEK Taxi Booking — Coupon Selection Screen
///
/// Displays available promo codes, allows entering a custom code,
/// and applies discounts to the current ride booking.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/booking_bloc.dart';

class CouponSelectionScreen extends StatefulWidget {
  const CouponSelectionScreen({super.key});

  @override
  State<CouponSelectionScreen> createState() => _CouponSelectionScreenState();
}

class _CouponSelectionScreenState extends State<CouponSelectionScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _codeController = TextEditingController();
  final FocusNode _codeFocus = FocusNode();
  late final AnimationController _entryAnim;
  String? _appliedCode;
  String? _errorMessage;
  bool _isApplying = false;

  // Mock coupons — would come from API in production
  static const _availableCoupons = [
    _Coupon(
      code: 'FIRSTRIDE',
      title: 'First Ride Free',
      description: 'Get 100% off your first ride (up to ₦3,000)',
      discountPercent: 100,
      maxDiscount: 3000,
      expiresIn: '7 days',
      color: Color(0xFF10B981),
      icon: Icons.celebration,
      isNew: true,
    ),
    _Coupon(
      code: 'SAVE20',
      title: '20% Off',
      description: 'Save 20% on your next 3 rides',
      discountPercent: 20,
      maxDiscount: 1500,
      expiresIn: '14 days',
      color: Color(0xFF3B82F6),
      icon: Icons.local_offer,
    ),
    _Coupon(
      code: 'WEEKEND50',
      title: 'Weekend Special',
      description: '50% off weekend rides (Fri-Sun)',
      discountPercent: 50,
      maxDiscount: 2000,
      expiresIn: '3 days',
      color: Color(0xFF8B5CF6),
      icon: Icons.wb_sunny,
    ),
    _Coupon(
      code: 'KARTFLASH',
      title: 'Flash Deal',
      description: '₦500 off rides above ₦2,000',
      discountPercent: 0,
      maxDiscount: 500,
      expiresIn: '24 hours',
      color: Color(0xFFF59E0B),
      icon: Icons.flash_on,
      isFlash: true,
    ),
    _Coupon(
      code: 'REFER10',
      title: 'Referral Reward',
      description: '10% off for you and your friend',
      discountPercent: 10,
      maxDiscount: 1000,
      expiresIn: '30 days',
      color: Color(0xFFEC4899),
      icon: Icons.people,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _entryAnim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )..forward();
    // Check if a code is already applied
    final state = context.read<BookingBloc>().state;
    _appliedCode = state.promotionCode;
  }

  @override
  void dispose() {
    _codeController.dispose();
    _codeFocus.dispose();
    _entryAnim.dispose();
    super.dispose();
  }

  void _applyCode(String code) {
    setState(() { _isApplying = true; _errorMessage = null; });
    HapticFeedback.lightImpact();

    // Simulate async validation
    Future.delayed(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      final valid = _availableCoupons.any((c) => c.code == code.toUpperCase());
      if (valid) {
        context.read<BookingBloc>().add(ApplyPromotionCode(code.toUpperCase()));
        setState(() {
          _appliedCode = code.toUpperCase();
          _isApplying = false;
        });
        _showSuccessSnackbar(code.toUpperCase());
      } else {
        setState(() {
          _errorMessage = 'Invalid or expired promo code';
          _isApplying = false;
        });
      }
    });
  }

  void _removeCode() {
    context.read<BookingBloc>().add(const ApplyPromotionCode(''));
    setState(() {
      _appliedCode = null;
      _codeController.clear();
    });
    HapticFeedback.lightImpact();
  }

  void _showSuccessSnackbar(String code) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Row(
        children: [
          const Icon(Icons.check_circle, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Text('$code applied successfully!'),
        ],
      ),
      backgroundColor: const Color(0xFF10B981),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF0F0F23) : Colors.white;
    final cardColor = isDark ? const Color(0xFF1A1A2E) : const Color(0xFFF8F9FA);
    final textPrimary = isDark ? Colors.white : Colors.black87;
    final textSecondary = isDark ? Colors.white60 : Colors.black54;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: bgColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new, color: textPrimary, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Promo Codes',
          style: TextStyle(color: textPrimary, fontSize: 18, fontWeight: FontWeight.w700),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // ── Code Input ──────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _codeController,
                        focusNode: _codeFocus,
                        textCapitalization: TextCapitalization.characters,
                        style: TextStyle(
                          color: textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          letterSpacing: 1.5,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Enter promo code',
                          hintStyle: TextStyle(
                            color: textSecondary,
                            fontWeight: FontWeight.w400,
                            letterSpacing: 0,
                          ),
                          prefixIcon: Icon(Icons.confirmation_number_outlined, color: textSecondary, size: 20),
                          filled: true,
                          fillColor: cardColor,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(color: Color(0xFF3B82F6), width: 2),
                          ),
                          errorText: _errorMessage,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _isApplying || _codeController.text.isEmpty
                            ? null
                            : () => _applyCode(_codeController.text),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF3B82F6),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFF3B82F6).withValues(alpha: 0.3),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                        ),
                        child: _isApplying
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Apply', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),

                // Applied code banner
                if (_appliedCode != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: RichText(
                            text: TextSpan(
                              style: TextStyle(color: textPrimary, fontSize: 13),
                              children: [
                                TextSpan(
                                  text: _appliedCode!,
                                  style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF10B981)),
                                ),
                                const TextSpan(text: ' applied'),
                              ],
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: _removeCode,
                          child: const Icon(Icons.close, color: Color(0xFF10B981), size: 18),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          // ── Available Coupons ────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Available Offers',
                style: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 12),

          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _availableCoupons.length,
              itemBuilder: (context, index) {
                final coupon = _availableCoupons[index];
                final isApplied = _appliedCode == coupon.code;

                return SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0.3, 0),
                    end: Offset.zero,
                  ).animate(CurvedAnimation(
                    parent: _entryAnim,
                    curve: Interval(
                      index * 0.1,
                      (index * 0.1 + 0.4).clamp(0.0, 1.0),
                      curve: Curves.easeOutCubic,
                    ),
                  )),
                  child: FadeTransition(
                    opacity: CurvedAnimation(
                      parent: _entryAnim,
                      curve: Interval(index * 0.1, (index * 0.1 + 0.4).clamp(0.0, 1.0)),
                    ),
                    child: _CouponCard(
                      coupon: coupon,
                      isApplied: isApplied,
                      isDark: isDark,
                      cardColor: cardColor,
                      textPrimary: textPrimary,
                      textSecondary: textSecondary,
                      onApply: () => _applyCode(coupon.code),
                      onRemove: _removeCode,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Coupon {
  final String code;
  final String title;
  final String description;
  final int discountPercent;
  final double maxDiscount;
  final String expiresIn;
  final Color color;
  final IconData icon;
  final bool isNew;
  final bool isFlash;

  const _Coupon({
    required this.code,
    required this.title,
    required this.description,
    required this.discountPercent,
    required this.maxDiscount,
    required this.expiresIn,
    required this.color,
    required this.icon,
    this.isNew = false,
    this.isFlash = false,
  });
}

class _CouponCard extends StatelessWidget {
  final _Coupon coupon;
  final bool isApplied;
  final bool isDark;
  final Color cardColor;
  final Color textPrimary;
  final Color textSecondary;
  final VoidCallback onApply;
  final VoidCallback onRemove;

  const _CouponCard({
    required this.coupon,
    required this.isApplied,
    required this.isDark,
    required this.cardColor,
    required this.textPrimary,
    required this.textSecondary,
    required this.onApply,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isApplied ? coupon.color.withValues(alpha: 0.06) : cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isApplied ? coupon.color.withValues(alpha: 0.4) : Colors.transparent,
          width: isApplied ? 2 : 0,
        ),
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            // Left accent bar
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: coupon.color,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
              ),
            ),

            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: coupon.color.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(coupon.icon, color: coupon.color, size: 18),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      coupon.title,
                                      style: TextStyle(
                                        color: textPrimary,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                  if (coupon.isNew) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text('NEW', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
                                    ),
                                  ],
                                  if (coupon.isFlash) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF59E0B),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text('FLASH', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                coupon.code,
                                style: TextStyle(
                                  color: coupon.color,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12,
                                  letterSpacing: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      coupon.description,
                      style: TextStyle(color: textSecondary, fontSize: 12),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.schedule, size: 12, color: textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              'Expires in ${coupon.expiresIn}',
                              style: TextStyle(color: textSecondary, fontSize: 11),
                            ),
                          ],
                        ),
                        SizedBox(
                          height: 32,
                          child: isApplied
                              ? OutlinedButton(
                                  onPressed: onRemove,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: coupon.color,
                                    side: BorderSide(color: coupon.color),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    padding: const EdgeInsets.symmetric(horizontal: 14),
                                    textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                                  ),
                                  child: const Text('Remove'),
                                )
                              : ElevatedButton(
                                  onPressed: onApply,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: coupon.color,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    padding: const EdgeInsets.symmetric(horizontal: 14),
                                    textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                                    elevation: 0,
                                  ),
                                  child: const Text('Apply'),
                                ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
