import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';
import 'package:intl/intl.dart';

/// GST Filing — View GST returns, GSTR-1 / GSTR-3B summaries, and filing status.
class MarketplaceGstFilingScreen extends StatefulWidget {
  const MarketplaceGstFilingScreen({super.key});

  @override
  State<MarketplaceGstFilingScreen> createState() => _MarketplaceGstFilingScreenState();
}

class _MarketplaceGstFilingScreenState extends State<MarketplaceGstFilingScreen>
    with SingleTickerProviderStateMixin {
  static const _mp = Color(0xFF6C3FC8);
  late TabController _tabCtrl;
  String _selectedPeriod = 'Jun 2026';

  final _periods = ['Jun 2026', 'May 2026', 'Apr 2026', 'Mar 2026', 'Feb 2026', 'Jan 2026'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;
    final fmt = NumberFormat.currency(symbol: '$currency ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        title: const Text('GST Filing', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(text: 'Summary'),
            Tab(text: 'GSTR-1'),
            Tab(text: 'GSTR-3B'),
          ],
        ),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          // Period Selector
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                const Icon(Icons.calendar_today, size: 16, color: SellerTheme.textMuted),
                const SizedBox(width: 8),
                const Text('Period:', style: TextStyle(fontSize: 13, color: SellerTheme.textSecondary)),
                const SizedBox(width: 8),
                Expanded(
                  child: SizedBox(
                    height: 34,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _periods.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 6),
                      itemBuilder: (_, i) {
                        final p = _periods[i];
                        final sel = p == _selectedPeriod;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedPeriod = p),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: sel ? _mp : Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: sel ? _mp : SellerTheme.border),
                            ),
                            child: Text(p, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: sel ? Colors.white : SellerTheme.textSecondary)),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabCtrl,
              children: [
                _buildSummaryTab(fmt),
                _buildGstr1Tab(fmt),
                _buildGstr3bTab(fmt),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  Widget _buildSummaryTab(NumberFormat fmt) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // KPI Cards
        Row(
          children: [
            _kpiCard('Total Sales', fmt.format(68200), Icons.shopping_cart, SellerTheme.successGreen),
            const SizedBox(width: 12),
            _kpiCard('Total Tax', fmt.format(10584), Icons.account_balance, _mp),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _kpiCard('CGST', fmt.format(5292), Icons.arrow_upward, SellerTheme.infoBlue),
            const SizedBox(width: 12),
            _kpiCard('SGST', fmt.format(5292), Icons.arrow_downward, SellerTheme.warningAmber),
          ],
        ),
        const SizedBox(height: 20),
        // Filing Status
        _sectionTitle('Filing Status'),
        const SizedBox(height: 8),
        _filingStatusCard('GSTR-1', 'Filed', '15 Jul 2026', true),
        const SizedBox(height: 8),
        _filingStatusCard('GSTR-3B', 'Pending', '20 Jul 2026', false),
        const SizedBox(height: 8),
        _filingStatusCard('GSTR-9 (Annual)', 'Not Due', '31 Dec 2026', false, notDue: true),
        const SizedBox(height: 20),
        // GSTIN Info
        _sectionTitle('GSTIN Information'),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: SellerTheme.border),
          ),
          child: Column(
            children: [
              _infoRow('GSTIN', '29AABCU9603R1ZM'),
              _infoRow('Legal Name', 'KARTSEEK INDIA PVT LTD'),
              _infoRow('State', 'Karnataka (29)'),
              _infoRow('Registration', 'Regular'),
              _infoRow('Status', 'Active', valueColor: SellerTheme.successGreen),
            ],
          ),
        ),
      ],
    );
  }

  // ── GSTR-1 ───────────────────────────────────────────────────────────────
  Widget _buildGstr1Tab(NumberFormat fmt) {
    final invoices = <_GstInvoice>[
      _GstInvoice('INV-2026-0451', 'Rohit Sharma', 'B2B', 11590, 2086, DateTime(2026, 6, 4)),
      _GstInvoice('INV-2026-0448', 'Priya Das', 'B2C', 2499, 450, DateTime(2026, 6, 3)),
      _GstInvoice('INV-2026-0445', 'Amit Patel', 'B2B', 24990, 4498, DateTime(2026, 6, 2)),
      _GstInvoice('INV-2026-0440', 'Sneha Reddy', 'B2C', 1299, 234, DateTime(2026, 6, 1)),
      _GstInvoice('INV-2026-0438', 'Kiran Kumar', 'B2B', 11490, 2068, DateTime(2026, 5, 31)),
      _GstInvoice('INV-2026-0435', 'Deepa Nair', 'B2C', 3499, 630, DateTime(2026, 5, 30)),
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Summary strip
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF6C3FC8), Color(0xFF9B59F5)]),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _gradientStat('Invoices', '${invoices.length}'),
              _gradientStat('Taxable Value', fmt.format(invoices.fold<int>(0, (s, i) => s + i.taxable))),
              _gradientStat('Tax Collected', fmt.format(invoices.fold<int>(0, (s, i) => s + i.tax))),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _sectionTitle('B2B & B2C Invoices'),
        const SizedBox(height: 8),
        ...invoices.map((inv) => _invoiceCard(inv, fmt)),
      ],
    );
  }

  // ── GSTR-3B ──────────────────────────────────────────────────────────────
  Widget _buildGstr3bTab(NumberFormat fmt) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Liability
        _sectionTitle('3.1 — Outward Supplies'),
        const SizedBox(height: 8),
        _liabilityRow('Taxable outward supplies (B2B)', fmt.format(47070), fmt.format(8473)),
        _liabilityRow('Outward supplies to consumers (B2C)', fmt.format(7297), fmt.format(1314)),
        _liabilityRow('Exempt / Nil rated', fmt.format(0), fmt.format(0)),
        const SizedBox(height: 20),
        _sectionTitle('3.2 — Inter-State Supplies'),
        const SizedBox(height: 8),
        _liabilityRow('To unregistered persons', fmt.format(3200), fmt.format(576)),
        _liabilityRow('To composition dealers', fmt.format(0), fmt.format(0)),
        const SizedBox(height: 20),
        _sectionTitle('4 — Input Tax Credit'),
        const SizedBox(height: 8),
        _liabilityRow('Import of goods', fmt.format(12000), fmt.format(2160), isCredit: true),
        _liabilityRow('From registered suppliers', fmt.format(8500), fmt.format(1530), isCredit: true),
        const SizedBox(height: 20),
        // Net liability
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E293B)]),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Net Tax Liability', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              Text(fmt.format(6097), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20)),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.upload_file),
          label: const Text('Generate GSTR-3B JSON'),
          style: ElevatedButton.styleFrom(
            backgroundColor: _mp,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ],
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  Widget _kpiCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: SellerTheme.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted, fontWeight: FontWeight.bold)),
                Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: SellerTheme.textPrimary)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: SellerTheme.textPrimary));
  }

  Widget _filingStatusCard(String returnType, String status, String dueDate, bool filed, {bool notDue = false}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: filed ? SellerTheme.successGreen.withValues(alpha: 0.3) : SellerTheme.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: filed ? SellerTheme.successGreen.withValues(alpha: 0.1) : notDue ? SellerTheme.textMuted.withValues(alpha: 0.1) : SellerTheme.warningAmber.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              filed ? Icons.check_circle : notDue ? Icons.schedule : Icons.pending,
              color: filed ? SellerTheme.successGreen : notDue ? SellerTheme.textMuted : SellerTheme.warningAmber,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(returnType, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text('Due: $dueDate', style: const TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: filed ? SellerTheme.successGreen.withValues(alpha: 0.1) : notDue ? SellerTheme.textMuted.withValues(alpha: 0.1) : SellerTheme.warningAmber.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: filed ? SellerTheme.successGreen : notDue ? SellerTheme.textMuted : SellerTheme.warningAmber)),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: SellerTheme.textSecondary)),
          Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: valueColor ?? SellerTheme.textPrimary)),
        ],
      ),
    );
  }

  Widget _gradientStat(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
      ],
    );
  }

  Widget _invoiceCard(_GstInvoice inv, NumberFormat fmt) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: SellerTheme.border)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(inv.invoiceNo, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'monospace')),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: inv.type == 'B2B' ? SellerTheme.infoBlue.withValues(alpha: 0.1) : SellerTheme.successGreen.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(inv.type, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: inv.type == 'B2B' ? SellerTheme.infoBlue : SellerTheme.successGreen)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(inv.customer, style: const TextStyle(fontSize: 12, color: SellerTheme.textSecondary)),
                Text(DateFormat('dd MMM yyyy').format(inv.date), style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(fmt.format(inv.taxable), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              Text('Tax: ${fmt.format(inv.tax)}', style: const TextStyle(fontSize: 10, color: SellerTheme.textMuted)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _liabilityRow(String label, String taxable, String tax, {bool isCredit = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: SellerTheme.border)),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 12, color: SellerTheme.textSecondary))),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(taxable, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              Text('Tax: $tax', style: TextStyle(fontSize: 10, color: isCredit ? SellerTheme.successGreen : SellerTheme.textMuted)),
            ],
          ),
        ],
      ),
    );
  }
}

class _GstInvoice {
  final String invoiceNo, customer, type;
  final int taxable, tax;
  final DateTime date;
  const _GstInvoice(this.invoiceNo, this.customer, this.type, this.taxable, this.tax, this.date);
}
