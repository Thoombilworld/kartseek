import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Partner Notifications Screen
class PartnerNotificationScreen extends StatelessWidget {
  const PartnerNotificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Notifications'), leading: const BackButton(color: PartnerTheme.textPrimary),
        actions: [TextButton(onPressed: () { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Action invoked'))); }, child: const Text('Clear All', style: TextStyle(color: PartnerTheme.primary, fontSize: 13)))]),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          _notif('New Ride Request', 'Customer Sarah W. is requesting a ride nearby', '2 min ago', Icons.directions_car, PartnerTheme.taxiColor, true),
          _notif('Payment Received', '${RegionService.instance.currentCountry.currencySymbol} 650 credited for Trip #RIDE-4520', '1 hr ago', Icons.payments, PartnerTheme.onlineGreen, true),
          _notif('Payout Processed', 'Weekly payout of ${RegionService.instance.currentCountry.currencySymbol} 5,000 sent to your bank', '5 hrs ago', Icons.account_balance, PartnerTheme.infoBlue, false),
          _notif('Rating Received', 'You received a 5-star rating from a customer', '6 hrs ago', Icons.star, Colors.amber, false),
          _notif('Document Expiry', 'Your driving license expires in 30 days. Please renew.', '1 day ago', Icons.warning_amber, PartnerTheme.warningAmber, false),
          _notif('Admin Notice', 'New incentive program: Complete 15 rides to earn ${RegionService.instance.currentCountry.currencySymbol} 500 bonus', '2 days ago', Icons.campaign, PartnerTheme.deliveryColor, false),
          _notif('Delivery Request', 'New delivery from FreshMart - 3.2 km away', '2 days ago', Icons.local_shipping, PartnerTheme.deliveryColor, false),
        ],
      ),
    );
  }

  Widget _notif(String title, String desc, String time, IconData icon, Color color, bool isNew) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: isNew ? color.withValues(alpha: 0.04) : Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: isNew ? color.withValues(alpha: 0.2) : PartnerTheme.border),
    ),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(width: 40, height: 40, decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, size: 20, color: color)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(title, style: TextStyle(fontSize: 14, fontWeight: isNew ? FontWeight.w700 : FontWeight.w600))),
          if (isNew) Container(width: 8, height: 8, decoration: const BoxDecoration(color: PartnerTheme.primary, shape: BoxShape.circle)),
        ]),
        const SizedBox(height: 4),
        Text(desc, style: const TextStyle(fontSize: 13, color: PartnerTheme.textSecondary)),
        const SizedBox(height: 4),
        Text(time, style: const TextStyle(fontSize: 11, color: PartnerTheme.textMuted)),
      ])),
    ]),
  );
}
