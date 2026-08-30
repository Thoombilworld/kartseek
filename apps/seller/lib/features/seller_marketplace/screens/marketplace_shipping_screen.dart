import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';
import 'package:kartseek_seller/features/seller_marketplace/services/marketplace_seller_api_service.dart';
import 'package:intl/intl.dart';

/// Shipping — Active shipments, pending pickups, delivery tracking, and label generation.
class MarketplaceShippingScreen extends StatefulWidget {
  const MarketplaceShippingScreen({super.key});

  @override
  State<MarketplaceShippingScreen> createState() =>
      _MarketplaceShippingScreenState();
}

class _MarketplaceShippingScreenState extends State<MarketplaceShippingScreen>
    with SingleTickerProviderStateMixin {
  static const _mp = Color(0xFF6C3FC8);
  late TabController _tabCtrl;
  final _api = MarketplaceSellerApiService.instance;
  List<_Shipment> _pendingShipments = [];
  List<_Shipment> _transitShipments = [];
  List<_Shipment> _deliveredShipments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _loadShipments();
  }

  Future<void> _loadShipments() async {
    final sellerId = context.read<SellerBloc>().state.profile?.id ?? '';
    try {
      final data = await _api.getShipmentTracking(sellerId);
      final items = (data['data'] as List? ?? []).map((s) => _Shipment(
        s['orderId'] ?? '', s['trackingId'] ?? 'N/A', s['buyer'] ?? '',
        s['city'] ?? '', s['status'] ?? 'unknown', s['trackingId'],
        DateTime.tryParse(s['date'] ?? '') ?? DateTime.now(), 1,
      )).toList();
      if (mounted) {
        setState(() {
          _pendingShipments = items.where((s) => s.status == 'picked_up' || s.status == 'awaiting_pickup' || s.status == 'label_created').toList();
          _transitShipments = items.where((s) => s.status == 'in_transit' || s.status == 'out_for_delivery').toList();
          _deliveredShipments = items.where((s) => s.status == 'delivered' || s.status == 'rto').toList();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // ignore: unused_local_variable
    final ss = context.read<SellerBloc>().state;
    // ignore: unused_local_variable
    final currency = ss.country.currencySymbol;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('Shipping',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          IconButton(
              icon: const Icon(Icons.qr_code_scanner),
              onPressed: () {},
              tooltip: 'Scan AWB'),
          IconButton(
              icon: const Icon(Icons.search),
              onPressed: () {},
              tooltip: 'Search'),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle:
              const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(text: 'Pending'),
            Tab(text: 'In Transit'),
            Tab(text: 'Delivered'),
          ],
        ),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          // KPI strip
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                _miniKpi('Pending\nPickup', '8', SellerTheme.warningAmber),
                _miniKpi('In\nTransit', '14', SellerTheme.infoBlue),
                _miniKpi('Today\'s\nDelivered', '6', SellerTheme.successGreen),
                _miniKpi('RTO\nReturns', '2', SellerTheme.errorRed),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: _mp))
                : TabBarView(
                    controller: _tabCtrl,
                    children: [
                      _buildPendingTab(),
                      _buildInTransitTab(),
                      _buildDeliveredTab(),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  // ── Pending Pickup ─────────────────────────────────────────────────────────
  Widget _buildPendingTab() {
    final items = _pendingShipments.isNotEmpty ? _pendingShipments : [
      _Shipment('ORD-44821', 'iPhone 15 Pro (256GB)', 'Rohit Sharma',
          'Bangalore', 'awaiting_pickup', null, DateTime(2026, 6, 7), 1),
      _Shipment('ORD-44819', 'Sony WH-1000XM5', 'Priya Das', 'Mumbai',
          'awaiting_pickup', null, DateTime(2026, 6, 7), 1),
      _Shipment('ORD-44815', 'MacBook Air M3', 'Amit Patel', 'Delhi',
          'label_created', 'DELHUB2026060301', DateTime(2026, 6, 7), 1),
      _Shipment('ORD-44812', 'AirPods Pro 2', 'Sneha R.', 'Chennai',
          'awaiting_pickup', null, DateTime(2026, 6, 7), 2),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length + 1,
      itemBuilder: (_, i) {
        if (i == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _actionBanner(
              icon: Icons.local_shipping,
              title: 'Schedule Pickup',
              subtitle: '${items.length} orders awaiting pickup',
              action: 'Request Pickup',
              color: SellerTheme.warningAmber,
            ),
          );
        }
        return _shipmentCard(items[i - 1], showActions: true);
      },
    );
  }

  // ── In Transit ─────────────────────────────────────────────────────────
  Widget _buildInTransitTab() {
    final items = _transitShipments.isNotEmpty ? _transitShipments : [
      _Shipment(
          'ORD-44810',
          'Samsung Galaxy S24 Ultra',
          'Kiran Kumar',
          'Hyderabad',
          'in_transit',
          'DELHUB2026060288',
          DateTime(2026, 6, 9),
          1),
      _Shipment('ORD-44808', 'OnePlus 12 (256GB)', 'Deepa Nair', 'Pune',
          'in_transit', 'DELHUB2026060285', DateTime(2026, 6, 10), 1),
      _Shipment('ORD-44805', 'iPad Air M2', 'Rahul M.', 'Jaipur',
          'out_for_delivery', 'DELHUB2026060280', DateTime(2026, 6, 7), 1),
      _Shipment('ORD-44803', 'Canon EOS R50', 'Vikram S.', 'Ahmedabad',
          'in_transit', 'DELHUB2026060278', DateTime(2026, 6, 11), 1),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (_, i) => _shipmentCard(items[i]),
    );
  }

  // ── Delivered ──────────────────────────────────────────────────────────
  Widget _buildDeliveredTab() {
    final items = _deliveredShipments.isNotEmpty ? _deliveredShipments : [
      _Shipment(
          'ORD-44790',
          'Spigen Case (iPhone 15)',
          'Anjali K.',
          'Bangalore',
          'delivered',
          'DELHUB2026060265',
          DateTime(2026, 6, 5),
          1),
      _Shipment('ORD-44788', 'USB-C Cable 2-Pack', 'Manoj R.', 'Delhi',
          'delivered', 'DELHUB2026060262', DateTime(2026, 6, 5), 3),
      _Shipment('ORD-44785', 'Screen Protector', 'Neha G.', 'Mumbai',
          'delivered', 'DELHUB2026060260', DateTime(2026, 6, 4), 2),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (_, i) => _shipmentCard(items[i]),
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  Widget _miniKpi(String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(value,
                style: TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 18, color: color)),
          ),
          const SizedBox(height: 4),
          Text(label,
              style: const TextStyle(
                  fontSize: 9, color: SellerTheme.textMuted, height: 1.2),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _actionBanner(
      {required IconData icon,
      required String title,
      required String subtitle,
      required String action,
      required Color color}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: color)),
                Text(subtitle,
                    style: const TextStyle(
                        fontSize: 11, color: SellerTheme.textSecondary)),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: color,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
              textStyle:
                  const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
            child: Text(action),
          ),
        ],
      ),
    );
  }

  Widget _shipmentCard(_Shipment s, {bool showActions = false}) {
    final statusCfg = _statusConfig(s.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: SellerTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(s.orderId,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                fontFamily: 'monospace')),
                        const SizedBox(width: 6),
                        if (s.qty > 1)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                                color: SellerTheme.textMuted
                                    .withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4)),
                            child: Text('×${s.qty}',
                                style: const TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: SellerTheme.textMuted)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(s.product,
                        style: const TextStyle(
                            fontSize: 12, color: SellerTheme.textSecondary)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusCfg.$2.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(statusCfg.$1,
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: statusCfg.$2)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.person_outline,
                  size: 14, color: SellerTheme.textMuted),
              const SizedBox(width: 4),
              Text(s.customer,
                  style: const TextStyle(
                      fontSize: 11, color: SellerTheme.textSecondary)),
              const SizedBox(width: 12),
              const Icon(Icons.location_on_outlined,
                  size: 14, color: SellerTheme.textMuted),
              const SizedBox(width: 4),
              Text(s.city,
                  style: const TextStyle(
                      fontSize: 11, color: SellerTheme.textSecondary)),
            ],
          ),
          if (s.trackingId != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.local_shipping_outlined,
                    size: 14, color: SellerTheme.infoBlue),
                const SizedBox(width: 4),
                Text(s.trackingId!,
                    style: const TextStyle(
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: SellerTheme.infoBlue)),
              ],
            ),
          ],
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.calendar_today,
                  size: 12, color: SellerTheme.textMuted),
              const SizedBox(width: 4),
              Text(
                s.status == 'delivered'
                    ? 'Delivered: ${DateFormat('dd MMM').format(s.eta)}'
                    : 'ETA: ${DateFormat('dd MMM').format(s.eta)}',
                style:
                    const TextStyle(fontSize: 10, color: SellerTheme.textMuted),
              ),
            ],
          ),
          if (showActions) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.print, size: 14),
                    label: const Text('Print Label'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _mp,
                      side: const BorderSide(color: _mp),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      textStyle: const TextStyle(
                          fontSize: 11, fontWeight: FontWeight.bold),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.check_circle_outline, size: 14),
                    label: const Text('Mark Shipped'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _mp,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      textStyle: const TextStyle(
                          fontSize: 11, fontWeight: FontWeight.bold),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  (String, Color) _statusConfig(String status) {
    switch (status) {
      case 'awaiting_pickup':
        return ('Awaiting Pickup', SellerTheme.warningAmber);
      case 'label_created':
        return ('Label Created', SellerTheme.infoBlue);
      case 'in_transit':
        return ('In Transit', const Color(0xFF8B5CF6));
      case 'out_for_delivery':
        return ('Out for Delivery', const Color(0xFF0EA5E9));
      case 'delivered':
        return ('Delivered', SellerTheme.successGreen);
      default:
        return ('Unknown', SellerTheme.textMuted);
    }
  }
}

class _Shipment {
  final String orderId, product, customer, city, status;
  final String? trackingId;
  final DateTime eta;
  final int qty;
  const _Shipment(this.orderId, this.product, this.customer, this.city,
      this.status, this.trackingId, this.eta, this.qty);
}
