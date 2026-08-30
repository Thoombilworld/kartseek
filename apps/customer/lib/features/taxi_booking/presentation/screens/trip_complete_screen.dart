/// KARTSEEK Taxi Booking — Trip Complete & Rating Screen
///
/// Post-ride screen showing fare summary and driver rating.
/// Features: fare breakdown, star rating, comment, tip, receipt download.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../blocs/booking_bloc.dart';
import '../../domain/entities/entities.dart';
import 'package:shared_mobile/core/services/region_service.dart';

class TripCompleteScreen extends StatefulWidget {
  const TripCompleteScreen({super.key});

  @override
  State<TripCompleteScreen> createState() => _TripCompleteScreenState();
}

class _TripCompleteScreenState extends State<TripCompleteScreen>
    with SingleTickerProviderStateMixin {
  int _selectedStars = 0;
  final TextEditingController _commentController = TextEditingController();
  double _tipAmount = 0;
  late final AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..forward();
  }

  @override
  void dispose() {
    _commentController.dispose();
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return BlocBuilder<BookingBloc, BookingState>(
      builder: (context, state) {
        final trip = state.activeTrip;
        final fare = state.fareEstimate;

        return Scaffold(
          backgroundColor: isDark ? const Color(0xFF0F0F23) : Colors.white,
          body: SafeArea(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const SizedBox(height: 16),

                    // ── Success Icon ────────────────────────────────────
                    _buildSuccessIcon(isDark),
                    const SizedBox(height: 20),

                    // ── Fare Amount ─────────────────────────────────────
                    Text(
                      '${fare?.currency ?? RegionService.instance.currentCountry.currencySymbol} ${fare?.totalEstimate.toStringAsFixed(0) ?? '0'}',
                      style: TextStyle(
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : Colors.black87,
                        letterSpacing: -1,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Trip fare',
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white54 : Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ── Trip Summary Card ───────────────────────────────
                    _buildTripSummaryCard(trip, fare, isDark),
                    const SizedBox(height: 24),

                    // ── Driver Rating ───────────────────────────────────
                    if (trip?.driver != null) ...[
                      _buildDriverRating(trip!.driver!, isDark),
                      const SizedBox(height: 24),
                    ],

                    // ── Comment ──────────────────────────────────────────
                    if (_selectedStars > 0) ...[
                      _buildCommentField(isDark),
                      const SizedBox(height: 20),
                    ],

                    // ── Tip Section ─────────────────────────────────────
                    if (trip?.driver != null && _selectedStars >= 4) ...[
                      _buildTipSection(fare?.currency ?? RegionService.instance.currentCountry.currencySymbol, isDark),
                      const SizedBox(height: 24),
                    ],

                    // ── Submit Button ───────────────────────────────────
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: state.isRating ? null : () => _submitRating(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4CAF50),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor:
                              isDark ? Colors.white10 : Colors.grey[200],
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 0,
                        ),
                        child: state.isRating
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Submit',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // ── Skip + Receipt ──────────────────────────────────
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TextButton(
                          onPressed: () => _goHome(context),
                          child: Text(
                            'Skip',
                            style: TextStyle(
                              color: isDark ? Colors.white54 : Colors.grey[600],
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        TextButton.icon(
                          onPressed: () {
                            final rideId = trip?.rideId ?? '';
                            Navigator.of(context).pushNamed('/taxi/receipt',
                                arguments: rideId);
                          },
                          icon: const Icon(Icons.receipt_long_rounded, size: 18),
                          label: const Text('View receipt'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSuccessIcon(bool isDark) {
    return ScaleTransition(
      scale: CurvedAnimation(
        parent: _animController,
        curve: Curves.elasticOut,
      ),
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF4CAF50), Color(0xFF2E7D32)],
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF4CAF50).withValues(alpha: 0.3),
              blurRadius: 20,
              spreadRadius: 2,
            ),
          ],
        ),
        child: const Icon(Icons.check_rounded, color: Colors.white, size: 42),
      ),
    );
  }

  Widget _buildTripSummaryCard(
    ActiveTrip? trip,
    FareEstimate? fare,
    bool isDark,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1A35) : const Color(0xFFF8F8F8),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          // Route
          Row(
            children: [
              Column(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(
                      color: Color(0xFF4CAF50),
                      shape: BoxShape.circle,
                    ),
                  ),
                  Container(
                    width: 2,
                    height: 20,
                    color: isDark ? Colors.white12 : Colors.grey[300],
                  ),
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE53935),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      trip?.pickup.address ?? 'Pickup',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.white70 : Colors.black87,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 14),
                    Text(
                      trip?.destination.address ?? 'Destination',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? Colors.white70 : Colors.black87,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          Divider(
            color: isDark ? Colors.white10 : Colors.grey[200],
            height: 1,
          ),
          const SizedBox(height: 12),

          // Fare breakdown
          if (fare != null) ...[
            _FareRow(label: 'Base fare', value: fare.baseFare, currency: fare.currency, isDark: isDark),
            _FareRow(label: 'Distance', value: fare.distanceFare, currency: fare.currency, isDark: isDark),
            _FareRow(label: 'Time', value: fare.timeFare, currency: fare.currency, isDark: isDark),
            if (fare.surgeAdjustment > 0)
              _FareRow(label: 'Surge adjustment', value: fare.surgeAdjustment, currency: fare.currency, isDark: isDark, isHighlighted: true),
            const SizedBox(height: 8),
            Divider(color: isDark ? Colors.white10 : Colors.grey[200], height: 1),
            const SizedBox(height: 8),
            _FareRow(label: 'Total', value: fare.totalEstimate, currency: fare.currency, isDark: isDark, isBold: true),
          ],
        ],
      ),
    );
  }

  Widget _buildDriverRating(Driver driver, bool isDark) {
    return Column(
      children: [
        Text(
          'How was your ride with ${driver.name.split(' ').first}?',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(5, (index) {
            final star = index + 1;
            return GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                setState(() => _selectedStars = star);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 6),
                child: Icon(
                  star <= _selectedStars
                      ? Icons.star_rounded
                      : Icons.star_border_rounded,
                  size: 44,
                  color: star <= _selectedStars
                      ? const Color(0xFFFFB300)
                      : (isDark ? Colors.white24 : Colors.grey[300]),
                ),
              ),
            );
          }),
        ),
        if (_selectedStars > 0) ...[
          const SizedBox(height: 8),
          Text(
            _getRatingLabel(_selectedStars),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: _selectedStars >= 4
                  ? const Color(0xFF4CAF50)
                  : (isDark ? Colors.white54 : Colors.grey[600]),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildCommentField(bool isDark) {
    return TextField(
      controller: _commentController,
      maxLines: 3,
      style: TextStyle(
        fontSize: 14,
        color: isDark ? Colors.white : Colors.black87,
      ),
      decoration: InputDecoration(
        hintText: 'Add a comment (optional)',
        hintStyle: TextStyle(color: isDark ? Colors.white38 : Colors.grey[400]),
        filled: true,
        fillColor: isDark ? const Color(0xFF1A1A35) : const Color(0xFFF5F5F5),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.all(14),
      ),
    );
  }

  Widget _buildTipSection(String currency, bool isDark) {
    final tips = [50.0, 100.0, 200.0];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Add a tip for your driver?',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            ...tips.map((amount) {
              final isSelected = _tipAmount == amount;
              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    setState(() => _tipAmount = isSelected ? 0 : amount);
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFF4CAF50).withValues(alpha: 0.15)
                          : (isDark ? Colors.white.withValues(alpha: 0.04) : Colors.transparent),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? const Color(0xFF4CAF50)
                            : (isDark ? Colors.white12 : const Color(0xFFE0E0E0)),
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        '$currency ${amount.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: isSelected
                              ? const Color(0xFF4CAF50)
                              : (isDark ? Colors.white60 : Colors.grey[700]),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ],
    );
  }

  String _getRatingLabel(int stars) {
    switch (stars) {
      case 1:
        return 'Very poor';
      case 2:
        return 'Could be better';
      case 3:
        return 'Good';
      case 4:
        return 'Great ride!';
      case 5:
        return 'Excellent! ⭐';
      default:
        return '';
    }
  }

  void _submitRating(BuildContext context) {
    if (_selectedStars == 0) {
      _goHome(context);
      return;
    }

    context.read<BookingBloc>().add(RateTrip(
      stars: _selectedStars,
      comment: _commentController.text.isNotEmpty ? _commentController.text : null,
      tip: _tipAmount > 0 ? _tipAmount : null,
    ));

    _goHome(context);
  }

  void _goHome(BuildContext context) {
    context.read<BookingBloc>().add(ResetBooking());
    Navigator.of(context).popUntil((route) => route.isFirst);
  }
}

// ─── Fare Row ───────────────────────────────────────────────────────────────

class _FareRow extends StatelessWidget {
  final String label;
  final double value;
  final String currency;
  final bool isDark;
  final bool isBold;
  final bool isHighlighted;

  const _FareRow({
    required this.label,
    required this.value,
    required this.currency,
    required this.isDark,
    this.isBold = false,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isBold ? 15 : 13,
              fontWeight: isBold ? FontWeight.w700 : FontWeight.w400,
              color: isHighlighted
                  ? const Color(0xFFFF9800)
                  : (isDark ? Colors.white54 : Colors.grey[600]),
            ),
          ),
          Text(
            '$currency ${value.toStringAsFixed(0)}',
            style: TextStyle(
              fontSize: isBold ? 15 : 13,
              fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
              color: isHighlighted
                  ? const Color(0xFFFF9800)
                  : (isDark ? Colors.white : Colors.black87),
            ),
          ),
        ],
      ),
    );
  }
}
