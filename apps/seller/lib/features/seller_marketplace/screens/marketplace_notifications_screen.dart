import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Notifications — Real-time order updates, return requests, payout alerts,
/// admin messages, review alerts, and low-stock warnings.
class MarketplaceNotificationsScreen extends StatefulWidget {
  const MarketplaceNotificationsScreen({super.key});
  @override
  State<MarketplaceNotificationsScreen> createState() => _State();
}

class _State extends State<MarketplaceNotificationsScreen> {
  static const _mp = Color(0xFF6C3FC8);
  String _filter = 'all';

  final List<_Notif> _notifs = [
    _Notif(
        id: 'n1',
        type: 'order',
        title: 'New Order Received',
        desc: 'Order ORD-8891 — iPhone 15 Pro (256GB) from Ahmed K.',
        time: '12 min ago',
        read: false),
    _Notif(
        id: 'n2',
        type: 'return',
        title: 'Return Request',
        desc:
            'RET-201 — Customer reported "Product defective" for Sony WH-1000XM5',
        time: '25 min ago',
        read: false),
    _Notif(
        id: 'n3',
        type: 'admin',
        title: 'Product Approved',
        desc: 'Samsung Galaxy S24 Ultra (PRD-44012) has been approved by admin',
        time: '1h ago',
        read: false),
    _Notif(
        id: 'n4',
        type: 'payout',
        title: 'Payout Processed',
        desc: 'Payout PAY-0042 of QAR 18,500 credited to QNB ••4532',
        time: '2h ago',
        read: true),
    _Notif(
        id: 'n5',
        type: 'review',
        title: 'New 5-Star Review',
        desc: '⭐⭐⭐⭐⭐ Review on "MacBook Air M3" from Sara M.',
        time: '3h ago',
        read: true),
    _Notif(
        id: 'n6',
        type: 'stock',
        title: 'Low Stock Alert',
        desc:
            'Apple Watch Ultra 2 — only 3 units remaining. Restock recommended.',
        time: '5h ago',
        read: false),
    _Notif(
        id: 'n7',
        type: 'campaign',
        title: 'Campaign Performance',
        desc: '"Summer Electronics Sale" generated 89 orders this week (+24%)',
        time: '8h ago',
        read: true),
    _Notif(
        id: 'n8',
        type: 'admin',
        title: 'Flash Deal Approval Required',
        desc: 'Your flash deal needs admin approval before going live',
        time: '12h ago',
        read: true),
    _Notif(
        id: 'n9',
        type: 'order',
        title: 'Order Delivered',
        desc: 'ORD-8888 — AirPods Pro 2 delivered to Fatima A.',
        time: '1d ago',
        read: true),
    _Notif(
        id: 'n10',
        type: 'system',
        title: 'Scheduled Maintenance',
        desc:
            'Platform maintenance on 28 Jun, 2–4 AM. Brief downtime expected.',
        time: '2d ago',
        read: true),
    _Notif(
        id: 'n11',
        type: 'payout',
        title: 'Commission Deducted',
        desc: 'Commission of QAR 740 deducted for ORD-8891 (8% Electronics)',
        time: '2d ago',
        read: true),
    _Notif(
        id: 'n12',
        type: 'admin',
        title: 'Policy Update',
        desc: 'New return policy: Electronics now accept 10-day returns',
        time: '3d ago',
        read: true),
  ];

  List<_Notif> get _filtered {
    if (_filter == 'all') return _notifs;
    if (_filter == 'unread') return _notifs.where((n) => !n.read).toList();
    return _notifs.where((n) => n.type == _filter).toList();
  }

  int get _unreadCount => _notifs.where((n) => !n.read).length;

  void _markAllRead() => setState(() {
        for (final n in _notifs) {
          n.read = true;
        }
      });

  void _markRead(String id) => setState(() {
        _notifs.firstWhere((n) => n.id == id).read = true;
      });

  void _delete(String id) => setState(() {
        _notifs.removeWhere((n) => n.id == id);
      });

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Notifications · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (_unreadCount > 0)
            TextButton.icon(
              onPressed: _markAllRead,
              icon: const Icon(Icons.done_all, color: Colors.white, size: 18),
              label: const Text('Mark all read',
                  style: TextStyle(color: Colors.white, fontSize: 12)),
            ),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          // Filter chips
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _chipBtn('all', 'All ($_unreadCount new)'),
                  _chipBtn('unread', 'Unread'),
                  _chipBtn('order', '📦 Orders'),
                  _chipBtn('return', '↩️ Returns'),
                  _chipBtn('payout', '💰 Payouts'),
                  _chipBtn('review', '⭐ Reviews'),
                  _chipBtn('stock', '⚠️ Stock'),
                  _chipBtn('admin', '🛡️ Admin'),
                  _chipBtn('campaign', '⚡ Campaigns'),
                  _chipBtn('system', '⚙️ System'),
                ],
              ),
            ),
          ),
          Expanded(
            child: _filtered.isEmpty
                ? Center(
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.notifications_off_outlined,
                              size: 64, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text('No notifications',
                              style: TextStyle(
                                  fontSize: 16, color: Colors.grey.shade500)),
                        ]),
                  )
                : ListView.separated(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.all(12),
                    itemCount: _filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _buildNotifCard(_filtered[i]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _chipBtn(String value, String label) {
    final sel = _filter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        selected: sel,
        label: Text(label,
            style: TextStyle(
                fontSize: 12,
                color: sel ? Colors.white : Colors.grey.shade700)),
        backgroundColor: Colors.grey.shade100,
        selectedColor: _mp,
        checkmarkColor: Colors.white,
        onSelected: (_) => setState(() => _filter = value),
      ),
    );
  }

  Widget _buildNotifCard(_Notif n) {
    final iconData = _iconForType(n.type);
    final iconColor = _colorForType(n.type);

    return Dismissible(
      key: Key(n.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
            color: Colors.red.shade400,
            borderRadius: BorderRadius.circular(12)),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      onDismissed: (_) => _delete(n.id),
      child: GestureDetector(
        onTap: () => _markRead(n.id),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: n.read ? Colors.white : const Color(0xFFFAF5FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
                color:
                    n.read ? Colors.grey.shade200 : _mp.withValues(alpha: 0.3)),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 4,
                  offset: const Offset(0, 2))
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                    color: iconColor.withValues(alpha: 0.1),
                    shape: BoxShape.circle),
                child: Icon(iconData, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (!n.read)
                          Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(right: 6),
                            decoration: const BoxDecoration(
                                color: _mp, shape: BoxShape.circle),
                          ),
                        Expanded(
                          child: Text(n.title,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight:
                                    n.read ? FontWeight.w500 : FontWeight.w700,
                                color: Colors.grey.shade800,
                              )),
                        ),
                        Text(n.time,
                            style: TextStyle(
                                fontSize: 11, color: Colors.grey.shade400)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(n.desc,
                        style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade600,
                            height: 1.3),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'order':
        return Icons.inventory_2_outlined;
      case 'return':
        return Icons.assignment_return_outlined;
      case 'payout':
        return Icons.account_balance_wallet_outlined;
      case 'admin':
        return Icons.shield_outlined;
      case 'review':
        return Icons.star_outline;
      case 'stock':
        return Icons.warning_amber_outlined;
      case 'campaign':
        return Icons.campaign_outlined;
      case 'system':
        return Icons.settings_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  Color _colorForType(String type) {
    switch (type) {
      case 'order':
        return Colors.blue;
      case 'return':
        return Colors.red;
      case 'payout':
        return Colors.green;
      case 'admin':
        return _mp;
      case 'review':
        return Colors.amber;
      case 'stock':
        return Colors.orange;
      case 'campaign':
        return Colors.cyan;
      case 'system':
        return Colors.blueGrey;
      default:
        return Colors.grey;
    }
  }
}

class _Notif {
  final String id;
  final String type;
  final String title;
  final String desc;
  final String time;
  bool read;
  _Notif(
      {required this.id,
      required this.type,
      required this.title,
      required this.desc,
      required this.time,
      required this.read});
}
