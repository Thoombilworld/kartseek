import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Notifications Screen — Inbox with categorized notifications, read/unread status.
class MarketplaceNotificationsScreen extends StatefulWidget {
  const MarketplaceNotificationsScreen({super.key});
  @override
  State<MarketplaceNotificationsScreen> createState() =>
      _MarketplaceNotificationsScreenState();
}

class _MarketplaceNotificationsScreenState
    extends State<MarketplaceNotificationsScreen> {
  String _filter = 'All';
  final _notifications = <_Notif>[
    _Notif(
        title: 'Order Shipped! 🚚',
        body:
            'Your order #ORD-12345 has been shipped and will arrive by Jul 5.',
        category: 'Orders',
        time: '2h ago',
        read: false,
        icon: Icons.local_shipping),
    _Notif(
        title: 'Flash Deal Alert ⚡',
        body: 'Up to 70% off on Electronics! Ends in 3 hours.',
        category: 'Deals',
        time: '4h ago',
        read: false,
        icon: Icons.flash_on),
    _Notif(
        title: 'Review Published ✅',
        body: 'Your review for "Wireless Headphones" has been published.',
        category: 'Reviews',
        time: '1d ago',
        read: true,
        icon: Icons.star),
    _Notif(
        title: 'Price Drop! 📉',
        body: 'An item in your wishlist dropped from ₹4,999 to ₹3,499.',
        category: 'Deals',
        time: '1d ago',
        read: false,
        icon: Icons.trending_down),
    _Notif(
        title: 'Refund Processed 💰',
        body: '₹2,499 refunded to your UPI account for order #ORD-12300.',
        category: 'Orders',
        time: '2d ago',
        read: true,
        icon: Icons.account_balance_wallet),
    _Notif(
        title: 'Delivery Attempted 📦',
        body: 'Delivery attempted for #ORD-12340. Rescheduled for tomorrow.',
        category: 'Orders',
        time: '3d ago',
        read: true,
        icon: Icons.warning_amber),
  ];

  @override
  Widget build(BuildContext context) {
    final filters = ['All', 'Orders', 'Deals', 'Reviews'];
    final filtered = _filter == 'All'
        ? _notifications
        : _notifications.where((n) => n.category == _filter).toList();
    final unreadCount = _notifications.where((n) => !n.read).length;

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Text('Notifications ($unreadCount)',
            style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
        actions: [
          TextButton(
            onPressed: () => setState(() {
              for (var n in _notifications) {
                n.read = true;
              }
            }),
            child: const Text('Mark all read',
                style: TextStyle(
                    color: AppTheme.marketplaceColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 13)),
          ),
        ],
      ),
      body: Column(children: [
        // Filter chips
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
                children: filters
                    .map((f) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(f,
                                style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: _filter == f
                                        ? Colors.white
                                        : AppTheme.textSecondary,
                                    fontSize: 13)),
                            selected: _filter == f,
                            onSelected: (_) => setState(() => _filter = f),
                            backgroundColor: AppTheme.surfaceMuted,
                            selectedColor: AppTheme.marketplaceColor,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                            checkmarkColor: Colors.white,
                            side: BorderSide.none,
                          ),
                        ))
                    .toList()),
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.notifications_none,
                      size: 64, color: Color(0xFFD1D5DB)),
                  SizedBox(height: 12),
                  Text('No notifications',
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 16))
                ]))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final n = filtered[i];
                    return Dismissible(
                      key: Key(n.title + n.time),
                      background: Container(
                          decoration: BoxDecoration(
                              color: Colors.red.shade400,
                              borderRadius: BorderRadius.circular(14)),
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          child: const Icon(Icons.delete, color: Colors.white)),
                      direction: DismissDirection.endToStart,
                      onDismissed: (_) =>
                          setState(() => _notifications.remove(n)),
                      child: GestureDetector(
                        onTap: () => setState(() => n.read = true),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color:
                                n.read ? Colors.white : const Color(0xFFF0F0FF),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color: n.read
                                    ? AppTheme.borderLight
                                    : const Color(0xFFC7D2FE)),
                          ),
                          child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                      color: n.read
                                          ? AppTheme.surfaceMuted
                                          : const Color(0xFFEEF2FF),
                                      borderRadius: BorderRadius.circular(12)),
                                  child: Icon(n.icon,
                                      color: n.read
                                          ? AppTheme.textMuted
                                          : AppTheme.marketplaceColor,
                                      size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                    child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                      Row(children: [
                                        Expanded(
                                            child: Text(n.title,
                                                style: TextStyle(
                                                    fontWeight: n.read
                                                        ? FontWeight.w500
                                                        : FontWeight.w700,
                                                    fontSize: 14,
                                                    color: const Color(
                                                        0xFF1F2937)))),
                                        if (!n.read)
                                          Container(
                                              width: 8,
                                              height: 8,
                                              decoration: const BoxDecoration(
                                                  color: AppTheme.marketplaceColor,
                                                  shape: BoxShape.circle)),
                                      ]),
                                      const SizedBox(height: 4),
                                      Text(n.body,
                                          style: const TextStyle(
                                              color: AppTheme.textSecondary,
                                              fontSize: 13,
                                              height: 1.3)),
                                      const SizedBox(height: 6),
                                      Text(n.time,
                                          style: const TextStyle(
                                              color: AppTheme.textMuted,
                                              fontSize: 11)),
                                    ])),
                              ]),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ]),
    );
  }
}

class _Notif {
  final String title, body, category, time;
  bool read;
  final IconData icon;
  _Notif(
      {required this.title,
      required this.body,
      required this.category,
      required this.time,
      required this.read,
      required this.icon});
}
