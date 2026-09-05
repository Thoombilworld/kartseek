import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_bloc.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_event.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_state.dart';

/// Hotel Price Alerts Screen — Set and manage price drop notifications.
///
/// Features:
///   • Set price threshold for specific hotels
///   • Manage active alerts
///   • Alert history (triggered alerts)
///   • Toggle alerts on/off
class HotelPriceAlertsScreen extends StatefulWidget {
  const HotelPriceAlertsScreen({super.key});

  @override
  State<HotelPriceAlertsScreen> createState() => _HotelPriceAlertsScreenState();
}

class _HotelPriceAlertsScreenState extends State<HotelPriceAlertsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  static const _color = AppTheme.hotelColor;

  static const _fallbackAlerts = <Map<String, dynamic>>[
    {'id': 'pa-01', 'hotel': 'The Grand Palace Hotel', 'city': 'Dubai', 'emoji': '🏰', 'currentPrice': 450, 'targetPrice': 350, 'currency': 'AED', 'enabled': true, 'created': '3 days ago'},
    {'id': 'pa-02', 'hotel': 'Heritage Boutique Hotel', 'city': 'London', 'emoji': '🏛️', 'currentPrice': 320, 'targetPrice': 250, 'currency': '£', 'enabled': true, 'created': '1 week ago'},
    {'id': 'pa-03', 'hotel': 'KARTSEEK Business Suites', 'city': 'Doha', 'emoji': '🏢', 'currentPrice': 280, 'targetPrice': 200, 'currency': 'QAR', 'enabled': false, 'created': '2 weeks ago'},
  ];

  static const _triggeredAlerts = [
    {'hotel': 'Seaside Family Resort', 'city': 'Mumbai', 'emoji': '🏖️', 'originalPrice': 8500, 'droppedPrice': 6800, 'currency': '₹', 'triggeredAt': 'Yesterday', 'saving': 1700},
    {'hotel': 'Budget Inn Express', 'city': 'Riyadh', 'emoji': '🏨', 'originalPrice': 120, 'droppedPrice': 85, 'currency': 'SAR', 'triggeredAt': '3 days ago', 'saving': 35},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // Dispatch API call for price alerts (L4 fix)
    context.read<HotelBloc>().add(const LoadPriceAlerts());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)), onPressed: () => Navigator.pop(context)),
        title: const Text('🔔 Price Alerts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        bottom: TabBar(
          controller: _tabController,
          labelColor: _color,
          unselectedLabelColor: const Color(0xFF94A3B8),
          labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          indicatorColor: _color,
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'Active Alerts'),
            Tab(text: 'Price Drops'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildActiveAlerts(),
          _buildTriggeredAlerts(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddAlert,
        backgroundColor: _color,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Alert', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
      ),
    );
  }

  Widget _buildActiveAlerts() {
    return BlocBuilder<HotelBloc, HotelState>(
      builder: (context, state) {
        final alerts = state.priceAlerts.isNotEmpty ? state.priceAlerts : _fallbackAlerts;

        if (state.status == HotelStatus.loading) {
          return const Center(child: CircularProgressIndicator(color: _color));
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          physics: const BouncingScrollPhysics(),
          itemCount: alerts.length,
          itemBuilder: (_, i) {
            final alert = alerts[i];
            final currentPrice = alert['currentPrice'] is int ? alert['currentPrice'] as int : 0;
            final targetPrice = alert['targetPrice'] is int ? alert['targetPrice'] as int : 0;
            final progress = currentPrice > 0 ? (currentPrice - targetPrice) / currentPrice : 0.0;
            final alertId = (alert['id'] ?? 'pa-$i').toString();
            final enabled = alert['enabled'] == true;

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Text((alert['emoji'] ?? '🏨').toString(), style: const TextStyle(fontSize: 28)),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text((alert['hotel'] ?? '').toString(), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                      Text((alert['city'] ?? '').toString(), style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    ])),
                    Switch(
                      value: enabled,
                      onChanged: (v) => context.read<HotelBloc>().add(TogglePriceAlert(alertId: alertId, enabled: v)),
                      activeThumbColor: _color,
                    ),
                  ]),
                  const SizedBox(height: 12),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Current Price', style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontWeight: FontWeight.w600)),
                      Text('${alert['currency']} $currentPrice', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    ]),
                    const Icon(Icons.arrow_right_alt, color: Color(0xFF94A3B8)),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('Your Target', style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontWeight: FontWeight.w600)),
                      Text('${alert['currency']} $targetPrice', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: _color)),
                    ]),
                  ]),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(value: 1 - progress, backgroundColor: const Color(0xFFF1F5F9), color: _color, minHeight: 6),
                  ),
                  const SizedBox(height: 6),
                  Text('Need ${(progress * 100).toInt()}% drop • Created ${alert['created'] ?? ''}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildTriggeredAlerts() {
    return ListView(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      children: [
        // Summary
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF059669), Color(0xFF10B981)]),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Column(children: [
                const Text('💰', style: TextStyle(fontSize: 28)),
                const SizedBox(height: 4),
                Text('${_triggeredAlerts.length}', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white)),
                const Text('Alerts Triggered', style: TextStyle(fontSize: 11, color: Colors.white70)),
              ]),
              Container(width: 1, height: 50, color: Colors.white24),
              const Column(children: [
                Text('🎉', style: TextStyle(fontSize: 28)),
                SizedBox(height: 4),
                Text('You Saved', style: TextStyle(fontSize: 11, color: Colors.white70)),
                Text('Great!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
              ]),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ..._triggeredAlerts.map((a) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF059669).withValues(alpha: 0.3)),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8)],
          ),
          child: Row(
            children: [
              Text(a['emoji'] as String, style: const TextStyle(fontSize: 32)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(a['hotel'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                  Text(a['city'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                  const SizedBox(height: 4),
                  Row(children: [
                    Text('${a['currency']} ${a['originalPrice']}', style: TextStyle(fontSize: 13, color: Colors.grey.shade400, decoration: TextDecoration.lineThrough)),
                    const SizedBox(width: 6),
                    Text('${a['currency']} ${a['droppedPrice']}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                  ]),
                ]),
              ),
              Column(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFF059669).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Text('−${a['currency']} ${a['saving']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF059669))),
                ),
                const SizedBox(height: 4),
                Text(a['triggeredAt'] as String, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
              ]),
            ],
          ),
        )),
      ],
    );
  }

  void _showAddAlert() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 20),
            const Text('Set Price Alert', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text('Get notified when a hotel drops below your target price', style: TextStyle(color: Colors.grey.shade500)),
            const SizedBox(height: 24),
            TextField(
              decoration: InputDecoration(
                hintText: 'Search hotel...',
                prefixIcon: const Icon(Icons.search),
                filled: true, fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                hintText: 'Target price per night',
                prefixIcon: const Icon(Icons.attach_money),
                filled: true, fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(backgroundColor: _color, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                child: const Text('Set Alert', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
