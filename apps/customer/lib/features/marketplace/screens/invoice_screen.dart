import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';

/// Invoice Screen — Download/view order invoice with itemized breakdown.
class InvoiceScreen extends StatelessWidget {
  final String orderId;
  const InvoiceScreen({super.key, this.orderId = 'ORD-12345'});

  @override
  Widget build(BuildContext context) {
    final items = [
      const _InvoiceItem(
          name: 'iPhone 15 Pro Max',
          sku: 'IP15PM-256',
          qty: 1,
          price: 159900,
          gst: 18),
      const _InvoiceItem(
          name: 'Spigen Case', sku: 'SP-IP15-BK', qty: 1, price: 999, gst: 18),
      const _InvoiceItem(
          name: 'Tempered Glass',
          sku: 'TG-IP15-HD',
          qty: 2,
          price: 299,
          gst: 18),
    ];
    final subtotal = items.fold<int>(0, (s, i) => s + i.price * i.qty);
    const shipping = 0;
    final gstAmount = (subtotal * 0.18 / 1.18).round();
    final total = subtotal + shipping;

    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: const Text('Invoice',
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary)),
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
        actions: [
          IconButton(
              icon: const Icon(Icons.download, color: AppTheme.marketplaceColor),
              onPressed: () {}),
          IconButton(
              icon: const Icon(Icons.share, color: AppTheme.marketplaceColor),
              onPressed: () {}),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.borderLight)),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Header
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('INVOICE',
                    style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.marketplaceColor,
                        letterSpacing: 2)),
                Text(orderId,
                    style: const TextStyle(
                        color: AppTheme.textMuted, fontSize: 13)),
              ]),
              const Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('KartSeek',
                        style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: AppTheme.textPrimary)),
                    Text('marketplace',
                        style:
                            TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                  ]),
            ]),
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 12),

            // Date & Addresses
            const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('Bill To',
                        style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                            color: AppTheme.textMuted)),
                    SizedBox(height: 4),
                    Text('Amit Kumar',
                        style: TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 14)),
                    Text('42, Marine Drive Apts\nMumbai 400001',
                        style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 12,
                            height: 1.4)),
                  ])),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                    Text('Invoice Date',
                        style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                            color: AppTheme.textMuted)),
                    SizedBox(height: 4),
                    Text('Jul 2, 2026',
                        style: TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 14)),
                    SizedBox(height: 8),
                    Text('Payment',
                        style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                            color: AppTheme.textMuted)),
                    SizedBox(height: 4),
                    Text('UPI (****@ybl)',
                        style: TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 14)),
                  ])),
            ]),
            const SizedBox(height: 20),

            // Items Table
            Container(
              decoration: BoxDecoration(
                  border: Border.all(color: AppTheme.borderLight),
                  borderRadius: BorderRadius.circular(12)),
              child: Column(children: [
                // Header
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: const BoxDecoration(
                      color: AppTheme.surfaceWhite,
                      borderRadius:
                          BorderRadius.vertical(top: Radius.circular(11))),
                  child: const Row(children: [
                    Expanded(
                        flex: 3,
                        child: Text('Item',
                            style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                                color: AppTheme.textMuted))),
                    Expanded(
                        child: Text('Qty',
                            style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                                color: AppTheme.textMuted),
                            textAlign: TextAlign.center)),
                    Expanded(
                        child: Text('GST',
                            style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                                color: AppTheme.textMuted),
                            textAlign: TextAlign.center)),
                    Expanded(
                        flex: 2,
                        child: Text('Amount',
                            style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                                color: AppTheme.textMuted),
                            textAlign: TextAlign.right)),
                  ]),
                ),
                ...items.map((item) => Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      decoration: const BoxDecoration(
                          border: Border(
                              top: BorderSide(color: AppTheme.borderLight))),
                      child: Row(children: [
                        Expanded(
                            flex: 3,
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.name,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 12)),
                                  Text(item.sku,
                                      style: const TextStyle(
                                          color: AppTheme.textMuted,
                                          fontSize: 10)),
                                ])),
                        Expanded(
                            child: Text('${item.qty}',
                                style: const TextStyle(fontSize: 12),
                                textAlign: TextAlign.center)),
                        Expanded(
                            child: Text('${item.gst}%',
                                style: const TextStyle(fontSize: 12),
                                textAlign: TextAlign.center)),
                        Expanded(
                            flex: 2,
                            child: Text(
                                '₹${(item.price * item.qty).toLocaleString()}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 12),
                                textAlign: TextAlign.right)),
                      ]),
                    )),
              ]),
            ),
            const SizedBox(height: 16),

            // Totals
            _totalRow('Subtotal', '₹${subtotal.toLocaleString()}'),
            _totalRow('GST (18%)', '₹${gstAmount.toLocaleString()}',
                color: AppTheme.textMuted),
            _totalRow('Shipping', shipping == 0 ? 'FREE' : '₹$shipping',
                color: AppTheme.successGreen),
            const Divider(),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total',
                        style: TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 18)),
                    Text('₹${total.toLocaleString()}',
                        style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 20,
                            color: AppTheme.marketplaceColor)),
                  ]),
            ),
            const SizedBox(height: 16),
            const Center(
                child: Text('Thank you for shopping with KartSeek! 🎉',
                    style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 12,
                        fontStyle: FontStyle.italic))),
          ]),
        ),
      ),
    );
  }

  Widget _totalRow(String label, String value, {Color? color}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child:
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(label,
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
          Text(value,
              style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: color ?? AppTheme.textPrimary)),
        ]),
      );
}

class _InvoiceItem {
  final String name, sku;
  final int qty, price, gst;
  const _InvoiceItem(
      {required this.name,
      required this.sku,
      required this.qty,
      required this.price,
      required this.gst});
}

extension on int {
  String toLocaleString() {
    if (this >= 100000) return '${(this / 100000).toStringAsFixed(2)}L';
    final s = toString();
    if (s.length <= 3) return s;
    final last3 = s.substring(s.length - 3);
    final rest = s.substring(0, s.length - 3);
    final buf = StringBuffer();
    for (int i = rest.length - 1, c = 0; i >= 0; i--, c++) {
      if (c > 0 && c % 2 == 0) buf.write(',');
      buf.write(rest[rest.length - 1 - (rest.length - 1 - i)]);
    }
    return '${rest.split('').reversed.toList().asMap().entries.map((e) => (e.key > 0 && e.key % 2 == 0 ? ',' : '') + e.value).toList().reversed.join()},$last3';
  }
}
