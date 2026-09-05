import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';

/// Restaurant-style pharmacy store card — large, visual, premium.
///
/// Two layout modes:
///   • **horizontal** — for horizontal scrolling lists (fixed width)
///   • **vertical** — full-width card for vertical lists
class PharmacyStoreCard extends StatelessWidget {
  final PharmacyStore store;
  final List<PharmacyCategory> allCategories;
  final VoidCallback onTap;
  final bool isVertical;

  const PharmacyStoreCard({
    super.key,
    required this.store,
    required this.allCategories,
    required this.onTap,
    this.isVertical = false,
  });

  @override
  Widget build(BuildContext context) {
    final cs = RegionService.instance.currentCountry.currencySymbol;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: isVertical ? double.infinity : 320,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Banner area ──
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  height: 140,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                    gradient: LinearGradient(
                      colors: store.verified
                          ? [const Color(0xFF0E7490), const Color(0xFF06B6D4)]
                          : [const Color(0xFF64748B), const Color(0xFF94A3B8)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: Stack(
                    children: [
                      // Background pharmacy icon
                      Positioned(
                        right: -20,
                        bottom: -20,
                        child: Icon(
                          Icons.local_pharmacy_rounded,
                          size: 120,
                          color: Colors.white.withValues(alpha: 0.12),
                        ),
                      ),
                      // Store hours
                      Positioned(
                        top: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.access_time_rounded, size: 12, color: Colors.white),
                              const SizedBox(width: 4),
                              Text(store.hours,
                                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                      ),
                      // Open/Closed badge
                      Positioned(
                        top: 12,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: store.isOpen ? const Color(0xFF059669) : const Color(0xFFDC2626),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            store.isOpen ? 'Open' : 'Closed',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                      // Offer badge
                      if (store.offerBadge != null)
                        Positioned(
                          bottom: 12,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B),
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [BoxShadow(color: const Color(0xFFF59E0B).withValues(alpha: 0.3), blurRadius: 8)],
                            ),
                            child: Text(store.offerBadge!,
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900)),
                          ),
                        ),
                    ],
                  ),
                ),

                // ── Logo circle ──
                Positioned(
                  bottom: -24,
                  left: 16,
                  child: Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                      border: Border.all(color: Colors.white, width: 3),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: Container(
                        color: AppTheme.pharmacyColor.withValues(alpha: 0.1),
                        child: const Icon(Icons.local_pharmacy_rounded,
                          color: AppTheme.pharmacyColor, size: 24),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // ── Info area ──
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 28, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name + verified + rating row
                  Row(
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Flexible(
                              child: Text(store.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                  color: Colors.black87,
                                  letterSpacing: -0.3,
                                ),
                                maxLines: 1, overflow: TextOverflow.ellipsis),
                            ),
                            if (store.verified) ...[
                              const SizedBox(width: 6),
                              Icon(Icons.verified_rounded, size: 16, color: Colors.blue.shade600),
                            ],
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF7ED),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star_rounded, color: Colors.amber, size: 14),
                            const SizedBox(width: 3),
                            Text('${store.rating}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.black87)),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Distance, delivery time, delivery fee
                  Row(
                    children: [
                      _infoChip(Icons.location_on_outlined, store.distance, Colors.black54),
                      const SizedBox(width: 12),
                      _infoChip(Icons.schedule_rounded, store.deliveryTime, AppTheme.pharmacyColor),
                      const SizedBox(width: 12),
                      _infoChip(
                        Icons.delivery_dining_rounded,
                        store.deliveryFee == 0 ? 'Free' : '$cs ${store.deliveryFee.toInt()}',
                        store.deliveryFee == 0 ? Colors.green.shade600 : Colors.black54,
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Category tags
                  SizedBox(
                    height: 26,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: store.categoryNames(allCategories).take(4).map((name) =>
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(name,
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.black54)),
                          ),
                        ),
                      ).toList(),
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Min order + View Pharmacy button
                  Row(
                    children: [
                      if (store.minOrder > 0)
                        Text('Min. $cs ${store.minOrder.toInt()}',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black38)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppTheme.pharmacyColor,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.pharmacyColor.withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: const Text('View Pharmacy',
                          style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoChip(IconData icon, String text, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 3),
        Text(text,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color)),
      ],
    );
  }
}
