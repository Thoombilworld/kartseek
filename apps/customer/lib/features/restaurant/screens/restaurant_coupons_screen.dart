import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Restaurant — Coupons & Promo Codes Screen.
class RestaurantCouponsScreen extends StatelessWidget {
  const RestaurantCouponsScreen({super.key});
  static const _brandColor = Color(0xFFEA580C);

  static final _coupons = [
    {'code': 'FOODIE50', 'desc': '50% off up to ${RegionService.instance.currentCountry.currencySymbol}200 on your first order', 'min': '${RegionService.instance.currentCountry.currencySymbol}300', 'expiry': 'Jul 15, 2026', 'active': true},
    {'code': 'BIRYANI30', 'desc': '30% off on Biryani orders', 'min': '${RegionService.instance.currentCountry.currencySymbol}400', 'expiry': 'Jul 20, 2026', 'active': true},
    {'code': 'FREEDELIVERY', 'desc': 'Free delivery on orders above ${RegionService.instance.currentCountry.currencySymbol}500', 'min': '${RegionService.instance.currentCountry.currencySymbol}500', 'expiry': 'Aug 1, 2026', 'active': true},
    {'code': 'PIZZA20', 'desc': '20% off on all Pizza outlets', 'min': '${RegionService.instance.currentCountry.currencySymbol}250', 'expiry': 'Jun 30, 2026', 'active': false},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: _brandColor, surfaceTintColor: Colors.transparent, elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
        title: const Text('Coupons & Offers', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Apply coupon input
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
          child: Row(children: [
            Expanded(child: TextField(decoration: InputDecoration(hintText: 'Enter coupon code', hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400), border: InputBorder.none, contentPadding: EdgeInsets.zero, isDense: true))),
            TextButton(
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Coupon applied to your order!'), backgroundColor: _brandColor, behavior: SnackBarBehavior.floating)),
              child: const Text('APPLY', style: TextStyle(color: _brandColor, fontWeight: FontWeight.w800, fontSize: 13)),
            ),
          ]),
        ),
        const SizedBox(height: 20),
        Text('AVAILABLE COUPONS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey.shade500, letterSpacing: 1)),
        const SizedBox(height: 10),
        ..._coupons.map((c) {
          final active = c['active'] as bool;
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: active ? _brandColor.withValues(alpha: 0.3) : Colors.grey.shade200)),
            child: Column(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(color: active ? _brandColor.withValues(alpha: 0.05) : Colors.grey.shade50, borderRadius: const BorderRadius.vertical(top: Radius.circular(13))),
                child: Row(children: [
                  Icon(Icons.local_offer, color: active ? _brandColor : Colors.grey, size: 18),
                  const SizedBox(width: 8),
                  Text(c['code'] as String, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: active ? _brandColor : Colors.grey, letterSpacing: 1)),
                  const Spacer(),
                  if (active) TextButton(
                    onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('✅ ${c['code']} applied! ${c['desc']}'), backgroundColor: _brandColor, behavior: SnackBarBehavior.floating)),
                    style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 0), tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                    child: const Text('APPLY', style: TextStyle(color: _brandColor, fontWeight: FontWeight.w800, fontSize: 12)),
                  ) else Text('EXPIRED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey.shade400)),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(c['desc'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Row(children: [
                    Text('Min: ${c['min']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                    const SizedBox(width: 16),
                    Text('Expires: ${c['expiry']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                  ]),
                ]),
              ),
            ]),
          );
        }),
      ]),
    );
  }
}
