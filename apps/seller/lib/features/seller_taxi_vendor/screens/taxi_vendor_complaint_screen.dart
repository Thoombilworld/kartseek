import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_bloc.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_event.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

class TaxiVendorComplaintScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const TaxiVendorComplaintScreen({super.key, this.order, this.appointment, this.booking});

  @override
  State<TaxiVendorComplaintScreen> createState() => _TaxiVendorComplaintScreenState();
}

class _TaxiVendorComplaintScreenState extends State<TaxiVendorComplaintScreen> {
  static const _taxi = Color(0xFFF59E0B);
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    context.read<TaxiVendorBloc>().add(const LoadTaxiVendorComplaints());
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return BlocListener<TaxiVendorBloc, TaxiVendorState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (ctx, s) {
        if (s.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(s.actionMessage!),
            backgroundColor: SellerTheme.successGreen,
            behavior: SnackBarBehavior.floating,
          ));
        }
      },
      child: Scaffold(
        backgroundColor: SellerTheme.surface,
        appBar: AppBar(
          backgroundColor: _taxi,
          foregroundColor: Colors.white,
          elevation: 0,
          title: Text('Driver Complaints · ${ss.country.flag}',
              style: const TextStyle(fontWeight: FontWeight.bold)),
        ),
        body: BlocBuilder<TaxiVendorBloc, TaxiVendorState>(
          builder: (ctx, ts) {
            final all        = ts.complaints;
            final filtered   = _filter == 'all' ? all : all.where((c) => c.status == _filter).toList();
            final openCount  = ts.openComplaints;

            return Column(children: [
              // Summary banner
              if (openCount > 0) Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                color: SellerTheme.errorRed.withValues(alpha: 0.08),
                child: Row(children: [
                  const Icon(Icons.warning_amber_rounded, color: SellerTheme.errorRed, size: 20),
                  const SizedBox(width: 10),
                  Text('$openCount open complaint${openCount > 1 ? 's' : ''} require your response',
                      style: const TextStyle(color: SellerTheme.errorRed, fontWeight: FontWeight.w600, fontSize: 13)),
                ]),
              ),
              // Filter bar
              _buildFilterBar(all),
              // List
              Expanded(
                child: ts.status == TaxiVendorBlocStatus.loading
                    ? const Center(child: CircularProgressIndicator(color: _taxi))
                    : filtered.isEmpty
                        ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Text('🎉', style: TextStyle(fontSize: 48)),
                            SizedBox(height: 12),
                            Text('No complaints found', style: TextStyle(color: SellerTheme.textMuted)),
                          ]))
                        : ListView.builder(
                            padding: const EdgeInsets.all(14),
                            itemCount: filtered.length,
                            itemBuilder: (ctx, i) => _ComplaintCard(complaint: filtered[i]),
                          ),
              ),
            ]);
          },
        ),
      ),
    );
  }

  Widget _buildFilterBar(List<ComplaintModel> all) {
    final filters = [
      ('all', 'All', all.length),
      ('open', 'Open', all.where((c) => c.status == 'open').length),
      ('responded', 'Responded', all.where((c) => c.status == 'responded').length),
      ('escalated', 'Escalated', all.where((c) => c.status == 'escalated').length),
      ('resolved', 'Resolved', all.where((c) => c.status == 'resolved').length),
    ];

    return Container(
      color: Colors.white,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(children: filters.map((f) {
          final active = _filter == f.$1;
          return GestureDetector(
            onTap: () => setState(() => _filter = f.$1),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: active ? _taxi : _taxi.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: active ? _taxi : _taxi.withValues(alpha: 0.2)),
              ),
              child: Text('${f.$2} (${f.$3})', style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w600,
                color: active ? Colors.white : _taxi,
              )),
            ),
          );
        }).toList()),
      ),
    );
  }
}

// ─── Complaint card ───────────────────────────────────────────────────────────

class _ComplaintCard extends StatefulWidget {
  final ComplaintModel complaint;
  const _ComplaintCard({required this.complaint});

  @override
  State<_ComplaintCard> createState() => _ComplaintCardState();
}

class _ComplaintCardState extends State<_ComplaintCard> {
  bool _expanded = false;
  bool _responding = false;
  final _responseCtrl = TextEditingController();

  @override
  void dispose() { _responseCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final c = widget.complaint;
    final bloc = context.read<TaxiVendorBloc>();

    final severityColor = switch (c.severity) {
      'high'   => SellerTheme.errorRed,
      'medium' => SellerTheme.warningAmber,
      _        => SellerTheme.infoBlue,
    };
    final statusColor = switch (c.status) {
      'open'       => SellerTheme.errorRed,
      'responded'  => SellerTheme.infoBlue,
      'escalated'  => SellerTheme.warningAmber,
      'resolved'   => SellerTheme.successGreen,
      _            => SellerTheme.textMuted,
    };
    final statusLabel = switch (c.status) {
      'open'       => '⚠️ Open',
      'responded'  => '💬 Responded',
      'escalated'  => '🔺 Escalated',
      'resolved'   => '✅ Resolved',
      _            => c.status,
    };
    final ageMin = DateTime.now().difference(c.createdAt).inMinutes;
    final ageLabel = ageMin < 60 ? '${ageMin}m ago' : '${ageMin ~/ 60}h ago';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: SellerTheme.elevatedCard(),
      child: Column(children: [
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              // Severity indicator
              Container(
                width: 8, height: 60,
                margin: const EdgeInsets.only(right: 12),
                decoration: BoxDecoration(color: severityColor, borderRadius: BorderRadius.circular(4)),
              ),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text('#${c.id}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(statusLabel, style: TextStyle(fontSize: 9, color: statusColor, fontWeight: FontWeight.w700)),
                  ),
                ]),
                const SizedBox(height: 4),
                Text('Driver: ${c.driverName} · Ride: ${c.rideId}',
                    style: const TextStyle(color: SellerTheme.textSecondary, fontSize: 12)),
                Text('Customer: ${c.customerName} · $ageLabel',
                    style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
              ])),
              Icon(_expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                  color: SellerTheme.textMuted, size: 18),
            ]),
          ),
        ),

        if (_expanded) ...[
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Severity pill
              Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: severityColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                  child: Text('${c.severity.toUpperCase()} SEVERITY',
                      style: TextStyle(fontSize: 9, color: severityColor, fontWeight: FontWeight.bold)),
                ),
              ]),
              const SizedBox(height: 10),
              // Description
              Text(c.description, style: const TextStyle(fontSize: 13, color: SellerTheme.textPrimary)),
              // Vendor response (if any)
              if (c.vendorResponse != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: SellerTheme.infoBlue.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: SellerTheme.infoBlue.withValues(alpha: 0.2)),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Your Response:', style: TextStyle(fontSize: 11, color: SellerTheme.infoBlue, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(c.vendorResponse!, style: const TextStyle(fontSize: 12, color: SellerTheme.textSecondary)),
                  ]),
                ),
              ],
              const SizedBox(height: 14),
              // Action buttons
              if (c.status == 'open' || c.status == 'escalated') ...[
                if (_responding) ...[
                  TextField(
                    controller: _responseCtrl,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Write your response...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.all(10),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(children: [
                    Expanded(child: _btn('Cancel', SellerTheme.textMuted, () => setState(() => _responding = false))),
                    const SizedBox(width: 8),
                    Expanded(child: _btn('Send Response', SellerTheme.infoBlue, () {
                      bloc.add(RespondToComplaint(c.id, _responseCtrl.text.isEmpty ? 'We are looking into this.' : _responseCtrl.text));
                      setState(() => _responding = false);
                    })),
                  ]),
                ] else
                  Row(children: [
                    Expanded(child: _btn('💬 Respond', SellerTheme.infoBlue, () => setState(() => _responding = true))),
                    const SizedBox(width: 8),
                    Expanded(child: _btn('🔺 Escalate', SellerTheme.warningAmber, () => bloc.add(EscalateComplaint(c.id)))),
                    const SizedBox(width: 8),
                    Expanded(child: _btn('✅ Resolve', SellerTheme.successGreen, () => bloc.add(ResolveComplaint(c.id)))),
                  ]),
              ] else
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.07), borderRadius: BorderRadius.circular(8)),
                  child: Text('Status: ${c.status}', style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
            ]),
          ),
        ],
      ]),
    );
  }

  Widget _btn(String label, Color c, VoidCallback onTap) => SizedBox(
    height: 36,
    child: ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(backgroundColor: c, foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)), elevation: 0,
          padding: EdgeInsets.zero),
      child: Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
    ),
  );
}
