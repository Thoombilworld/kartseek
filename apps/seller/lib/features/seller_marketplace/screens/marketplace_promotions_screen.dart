import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Promotions — Create, manage, and track promotional offers and discount codes.
class MarketplacePromotionsScreen extends StatefulWidget {
  const MarketplacePromotionsScreen({super.key});

  @override
  State<MarketplacePromotionsScreen> createState() =>
      _MarketplacePromotionsScreenState();
}

class _MarketplacePromotionsScreenState
    extends State<MarketplacePromotionsScreen> {
  static const _mp = Color(0xFF6C3FC8);

  final List<_Promo> _promos = [
    const _Promo(
        id: 'PR-001',
        name: 'Summer Sale 2026',
        code: 'SUMMER26',
        discount: '25% off',
        type: 'percentage',
        minOrder: 200,
        usageCount: 342,
        maxUses: 1000,
        startDate: '20 Jun',
        endDate: '31 Jul',
        status: 'active'),
    const _Promo(
        id: 'PR-002',
        name: 'New User Welcome',
        code: 'WELCOME50',
        discount: 'AED 50 off',
        type: 'fixed',
        minOrder: 300,
        usageCount: 128,
        maxUses: 500,
        startDate: '1 Jun',
        endDate: '31 Dec',
        status: 'active'),
    const _Promo(
        id: 'PR-003',
        name: 'Electronics Bundle',
        code: 'TECHBUNDLE',
        discount: '15% off',
        type: 'percentage',
        minOrder: 500,
        usageCount: 89,
        maxUses: 200,
        startDate: '10 Jun',
        endDate: '10 Jul',
        status: 'active'),
    const _Promo(
        id: 'PR-004',
        name: 'Eid Special',
        code: 'EID2026',
        discount: '30% off',
        type: 'percentage',
        minOrder: 150,
        usageCount: 500,
        maxUses: 500,
        startDate: '1 Mar',
        endDate: '15 Mar',
        status: 'expired'),
    const _Promo(
        id: 'PR-005',
        name: 'Flash Friday',
        code: 'FLASH20',
        discount: '20% off',
        type: 'percentage',
        minOrder: 100,
        usageCount: 0,
        maxUses: 300,
        startDate: '28 Jun',
        endDate: '28 Jun',
        status: 'scheduled'),
  ];

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final active = _promos.where((p) => p.status == 'active').length;
    final totalUsage = _promos.fold<int>(0, (s, p) => s + p.usageCount);

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Promotions · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreatePromoDialog,
        backgroundColor: _mp,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Promo',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                Row(children: [
                  Expanded(
                      child: _kpiCard('Active', '$active',
                          SellerTheme.successGreen, Icons.campaign)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _kpiCard('Total Uses', '$totalUsage',
                          SellerTheme.infoBlue, Icons.people)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _kpiCard('Total', '${_promos.length}', _mp,
                          Icons.local_offer)),
                ]),
                const SizedBox(height: 16),
                ..._promos.map((p) => _buildPromoCard(p)),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _kpiCard(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 6),
        Text(value,
            style: TextStyle(
                fontSize: 20, fontWeight: FontWeight.w800, color: color)),
        Text(label,
            style:
                TextStyle(fontSize: 11, color: color.withValues(alpha: 0.8))),
      ]),
    );
  }

  Widget _buildPromoCard(_Promo p) {
    final statusColor = p.status == 'active'
        ? SellerTheme.successGreen
        : p.status == 'expired'
            ? SellerTheme.textMuted
            : SellerTheme.infoBlue;
    final usagePct = p.maxUses > 0 ? p.usageCount / p.maxUses : 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                  color: _mp.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.local_offer, color: _mp, size: 20)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(p.name,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Row(children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: _mp.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(4)),
                    child: Text(p.code,
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _mp,
                            fontFamily: 'monospace')),
                  ),
                  const SizedBox(width: 6),
                  Text(p.discount,
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: SellerTheme.successGreen)),
                ]),
              ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8)),
            child: Text(p.status.toUpperCase(),
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: statusColor)),
          ),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.calendar_today,
              size: 13, color: SellerTheme.textMuted),
          const SizedBox(width: 4),
          Text('${p.startDate} — ${p.endDate}',
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
          const Spacer(),
          Text('Min: AED ${p.minOrder}',
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text('${p.usageCount} / ${p.maxUses} uses',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                      value: usagePct,
                      backgroundColor: SellerTheme.border,
                      color: _mp,
                      minHeight: 5),
                ),
              ])),
          if (p.status == 'active') ...[
            const SizedBox(width: 12),
            IconButton(
              icon: const Icon(Icons.pause_circle_outline,
                  color: SellerTheme.warningAmber, size: 22),
              tooltip: 'Pause',
              onPressed: () => setState(() {
                final idx = _promos.indexOf(p);
                if (idx >= 0) _promos[idx] = p.copyWith(status: 'expired');
              }),
            ),
          ],
        ]),
      ]),
    );
  }

  void _showCreatePromoDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => Padding(
        padding:
            EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.all(20),
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Center(
                    child: SizedBox(
                        width: 40,
                        height: 4,
                        child: DecoratedBox(
                            decoration: BoxDecoration(
                                color: SellerTheme.border,
                                borderRadius:
                                    BorderRadius.all(Radius.circular(2)))))),
                const SizedBox(height: 16),
                const Text('Create Promotion',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 16),
                TextField(
                    decoration: InputDecoration(
                        labelText: 'Promotion Name',
                        prefixIcon: const Icon(Icons.campaign, size: 20),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 12),
                TextField(
                    decoration: InputDecoration(
                        labelText: 'Coupon Code',
                        prefixIcon: const Icon(Icons.code, size: 20),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                      child: TextField(
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                              labelText: 'Discount %',
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12))))),
                  const SizedBox(width: 10),
                  Expanded(
                      child: TextField(
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                              labelText: 'Max Uses',
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12))))),
                ]),
                const SizedBox(height: 16),
                SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: _mp,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                          elevation: 0),
                      child: const Text('Create Promotion',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700)),
                    )),
                const SizedBox(height: 8),
              ]),
        ),
      ),
    );
  }
}

class _Promo {
  final String id, name, code, discount, type, startDate, endDate, status;
  final int minOrder, usageCount, maxUses;
  const _Promo(
      {required this.id,
      required this.name,
      required this.code,
      required this.discount,
      required this.type,
      required this.minOrder,
      required this.usageCount,
      required this.maxUses,
      required this.startDate,
      required this.endDate,
      required this.status});
  _Promo copyWith({String? status}) => _Promo(
      id: id,
      name: name,
      code: code,
      discount: discount,
      type: type,
      minOrder: minOrder,
      usageCount: usageCount,
      maxUses: maxUses,
      startDate: startDate,
      endDate: endDate,
      status: status ?? this.status);
}
