import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_state.dart';

/// Partner Ledger Screen — Renders full transaction ledger from PartnerBloc state.
class PartnerLedgerScreen extends StatelessWidget {
  const PartnerLedgerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('dd MMM');
    final numFmt = NumberFormat('#,###');

    return BlocBuilder<PartnerBloc, PartnerState>(
      builder: (context, state) {
        final ledger = state.ledger;

        return Scaffold(
          backgroundColor: PartnerTheme.surface,
          appBar: AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Ledger'), leading: const BackButton(color: PartnerTheme.textPrimary)),
          body: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            scrollDirection: Axis.vertical,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Transaction Ledger', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('${ledger.length} entries', style: const TextStyle(fontSize: 13, color: PartnerTheme.textMuted)),
                const SizedBox(height: 20),
                if (ledger.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(24), decoration: PartnerTheme.cardDecoration(),
                    child: const Center(child: Text('No ledger entries yet', style: TextStyle(color: PartnerTheme.textMuted))),
                  )
                else
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: DataTable(
                      headingRowColor: WidgetStateProperty.all(PartnerTheme.primaryLight),
                      columnSpacing: 16,
                      columns: const [
                        DataColumn(label: Text('Date', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12))),
                        DataColumn(label: Text('Trip/Order', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12))),
                        DataColumn(label: Text('Credit', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)), numeric: true),
                        DataColumn(label: Text('Debit', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)), numeric: true),
                        DataColumn(label: Text('Commission', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)), numeric: true),
                        DataColumn(label: Text('Cash', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)), numeric: true),
                        DataColumn(label: Text('Balance', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)), numeric: true),
                      ],
                      rows: ledger.map((entry) => _ledgerRow(
                        dateFmt.format(entry.date),
                        entry.tripOrOrderId,
                        entry.credit,
                        entry.debit,
                        entry.commission,
                        entry.cashCollected,
                        entry.balance,
                        numFmt,
                      )).toList(),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  DataRow _ledgerRow(String date, String id, double credit, double debit, double commission, double cash, double balance, NumberFormat fmt) {
    String fmtVal(double v) => v > 0 ? fmt.format(v) : '-';
    return DataRow(cells: [
      DataCell(Text(date, style: const TextStyle(fontSize: 12))),
      DataCell(Text(id, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
      DataCell(Text(fmtVal(credit), style: TextStyle(fontSize: 12, color: credit > 0 ? PartnerTheme.onlineGreen : PartnerTheme.textMuted))),
      DataCell(Text(fmtVal(debit), style: TextStyle(fontSize: 12, color: debit > 0 ? PartnerTheme.offlineRed : PartnerTheme.textMuted))),
      DataCell(Text(fmtVal(commission), style: const TextStyle(fontSize: 12))),
      DataCell(Text(fmtVal(cash), style: const TextStyle(fontSize: 12))),
      DataCell(Text(fmt.format(balance), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
    ]);
  }
}
