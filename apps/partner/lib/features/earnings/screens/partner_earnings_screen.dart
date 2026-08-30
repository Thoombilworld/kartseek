import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';
import 'package:shared_mobile/core/services/region_service.dart';

/// Partner Earnings Screen — Reads all values from PartnerBloc state.
///
/// Displays today/weekly/monthly earnings with a full breakdown of
/// trips, deliveries, cash, incentives, deductions, and commission.
class PartnerEarningsScreen extends StatefulWidget {
  const PartnerEarningsScreen({super.key});
  @override
  State<PartnerEarningsScreen> createState() => _PartnerEarningsScreenState();
}

class _PartnerEarningsScreenState extends State<PartnerEarningsScreen> {
  int _selectedPeriod = 0;
  final _periods = ['Today', 'This Week', 'This Month'];

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<PartnerBloc, PartnerState>(
      builder: (context, state) {
        final e = state.earnings;
        final amounts = [e.todayEarnings, e.weeklyEarnings, e.monthlyEarnings];
        final fmt = NumberFormat('#,###');
        final currency = RegionService.instance.currentCountry.currencySymbol;

        return Scaffold(
          backgroundColor: PartnerTheme.surface,
          appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Earnings'), leading: const BackButton(color: PartnerTheme.textPrimary)),
          body: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Period Selector
                DecoratedBox(
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: PartnerTheme.border)),
                  child: Row(children: List.generate(3, (i) => Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedPeriod = i),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: _selectedPeriod == i ? PartnerTheme.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: Center(child: Text(_periods[i], style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: _selectedPeriod == i ? Colors.white : PartnerTheme.textSecondary))),
                      ),
                    ),
                  ))),
                ),
                const SizedBox(height: 20),
                // Total Earnings
                Container(
                  width: double.infinity, padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(gradient: PartnerTheme.earningsGradient, borderRadius: BorderRadius.circular(20)),
                  child: Column(children: [
                    Text('${_periods[_selectedPeriod]} Earnings', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text('$currency ${fmt.format(amounts[_selectedPeriod])}', style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900)),
                  ]),
                ),
                const SizedBox(height: 20),
                // Breakdown
                Container(
                  padding: const EdgeInsets.all(16), decoration: PartnerTheme.cardDecoration(),
                  child: Column(children: [
                    _row('Completed Trips', '${e.completedTrips}'),
                    _row('Completed Deliveries', '${e.completedDeliveries}'),
                    const Divider(height: 20),
                    _row('Cash Collected', '$currency ${fmt.format(e.cashCollected)}'),
                    _row('Online Hours', '${e.onlineHours.toStringAsFixed(1)} hrs'),
                    const Divider(height: 20),
                    _row('Incentives', '+ $currency ${fmt.format(e.incentives)}'),
                    _row('Bonus', '+ $currency ${fmt.format(e.bonus)}'),
                    _row('Deductions', '- $currency ${fmt.format(e.deductions)}'),
                    _row('Commission', '- $currency ${fmt.format(e.commissionDeducted)}'),
                    const Divider(height: 20),
                    _row('Pending Payout', '$currency ${fmt.format(e.pendingPayout)}', isBold: true),
                    _row('Total Paid', '$currency ${fmt.format(e.paidPayout)}', isBold: true),
                  ]),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _row(String label, String value, {bool isBold = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: TextStyle(fontSize: 14, fontWeight: isBold ? FontWeight.w700 : FontWeight.w500, color: PartnerTheme.textSecondary)),
      Text(value, style: TextStyle(fontSize: 14, fontWeight: isBold ? FontWeight.w800 : FontWeight.w600, color: value.startsWith('-') ? PartnerTheme.offlineRed : value.startsWith('+') ? PartnerTheme.onlineGreen : PartnerTheme.textPrimary)),
    ]),
  );
}
