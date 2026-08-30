import 'package:flutter/material.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/models/country_config.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/seller_module_scaffold.dart';
import 'package:kartseek_seller/routing/seller_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';

class TaxiVendorDashboardScreen extends StatelessWidget {
  const TaxiVendorDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SellerModuleScaffold(
      activeRole: SellerRole.taxiVendor,
      title: 'Taxi Vendor Dashboard',
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildHeader(),
          const SizedBox(height: 20),
          _buildKpiRow(),
          const SizedBox(height: 20),
          _buildQuickActions(context),
          const SizedBox(height: 20),
          _buildSection('Live Driver Status'),
          const SizedBox(height: 12),
          _buildDriverList(context),
          const SizedBox(height: 20),
          _buildSection('Fleet Performance'),
          const SizedBox(height: 12),
          _buildFleetStats(),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEAB308), Color(0xFFCA8A04)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: SellerTheme.taxiVendor.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
      ),
      child: const Row(
        children: [
          Text('🚖', style: TextStyle(fontSize: 40)),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('SafeRide Fleet', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                Text('Taxi Vendor Portal', style: TextStyle(color: Colors.white70, fontSize: 13)),
                SizedBox(height: 8),
                Row(children: [
                  _Pill('32 Drivers', Colors.white),
                  SizedBox(width: 8),
                  _Pill('⭐ 4.6', Colors.white),
                  SizedBox(width: 8),
                  _Pill('Fleet Active', Colors.white),
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiRow() {
    return Row(
      children: [
        _kpi('24',       'Active Drivers',  Icons.person_outline,   SellerTheme.taxiVendor),
        const SizedBox(width: 12),
        _kpi('156',      'Trips Today',     Icons.route_outlined,   SellerTheme.infoBlue),
        const SizedBox(width: 12),
        _kpi('${CountryConfig.forCode(RegionService.instance.currentCountry.code).currencySymbol} 62K',  'Revenue',         Icons.attach_money,     SellerTheme.successGreen),
      ],
    );
  }

  Widget _kpi(String value, String label, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: SellerTheme.border),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: color)),
            Text(label, style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      ('🚗', 'Drivers',     SellerRouter.taxiVendorDrivers,    SellerTheme.taxiVendor),
      ('⚖️', 'Complaints',  SellerRouter.taxiVendorComplaints, SellerTheme.errorRed),
      ('💰', 'Earnings',    SellerRouter.taxiVendorEarnings,   SellerTheme.successGreen),
    ];
    return Row(
      children: actions.map((a) => Expanded(
        child: GestureDetector(
          onTap: () => Navigator.pushNamed(context, a.$3),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: a.$4.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: a.$4.withValues(alpha: 0.25)),
            ),
            child: Column(
              children: [
                Text(a.$1, style: const TextStyle(fontSize: 22)),
                const SizedBox(height: 6),
                Text(a.$2, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: a.$4)),
              ],
            ),
          ),
        ),
      )).toList(),
    );
  }

  Widget _buildDriverList(BuildContext context) {
    final drivers = [
      ('DRV-001', 'James Odhiambo', 'KCA 234X', 'On Trip',   '4 trips',  SellerTheme.successGreen),
      ('DRV-002', 'Ali Hassan',     'KBP 789Y', 'Available', '7 trips',  SellerTheme.infoBlue),
      ('DRV-003', 'Grace Adhiambo', 'KDA 112Z', 'On Trip',   '3 trips',  SellerTheme.successGreen),
      ('DRV-004', 'Peter Kamau',    'KBC 456A', 'Offline',   '0 trips',  SellerTheme.textMuted),
    ];
    return Column(
      children: drivers.map((d) => GestureDetector(
        onTap: () => Navigator.pushNamed(context, SellerRouter.taxiVendorDrivers),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: SellerTheme.elevatedCard(),
          child: Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: d.$6.withValues(alpha: 0.12),
                child: Text(d.$2.split(' ').first[0], style: TextStyle(fontWeight: FontWeight.bold, color: d.$6)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(d.$2, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    Text('${d.$3} · ${d.$5}', style: const TextStyle(color: SellerTheme.textSecondary, fontSize: 12)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: d.$6.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                child: Text(d.$4, style: TextStyle(color: d.$6, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ),
      )).toList(),
    );
  }

  Widget _buildFleetStats() {
    final stats = [
      ('Average Rating',     '4.6 ⭐', SellerTheme.taxiVendor),
      ('Trip Completion',    '94.2%',  SellerTheme.successGreen),
      ('Cancellation Rate',  '5.8%',   SellerTheme.errorRed),
      ('Peak Hour Drivers',  '28',     SellerTheme.infoBlue),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 2.0,
      children: stats.map((s) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: s.$3.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: s.$3.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(s.$2, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: s.$3)),
            Text(s.$1, style: const TextStyle(fontSize: 11, color: SellerTheme.textSecondary)),
          ],
        ),
      )).toList(),
    );
  }

  Widget _buildSection(String title) => Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold));
}

class _Pill extends StatelessWidget {
  final String label;
  final Color color;
  const _Pill(this.label, this.color);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
    );
  }
}
