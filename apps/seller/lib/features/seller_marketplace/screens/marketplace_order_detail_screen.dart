import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_event.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/models/seller_order_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/delivery_dispatch_button.dart';
import 'package:kartseek_seller/features/shared/widgets/order_status_chip.dart';

// Country-specific tax/VAT rates for Marketplace
const _vatRates = <String, double>{
  'QA': 0.0,  'IN': 0.18, 'AE': 0.05, 'SA': 0.15,
  'KE': 0.16, 'BH': 0.10, 'KW': 0.0,  'OM': 0.05,
  'GB': 0.20, 'US': 0.085,
};

const _vatLabels = <String, String>{
  'QA': 'No VAT', 'IN': 'GST (18%)', 'AE': 'VAT (5%)', 'SA': 'VAT (15%)',
  'KE': 'VAT (16%)', 'BH': 'VAT (10%)', 'KW': 'No Tax', 'OM': 'VAT (5%)',
  'GB': 'VAT (20%)', 'US': 'Sales Tax (8.5%)',
};

// ─────────────────────────────────────────────────────────────────────────────
// MarketplaceOrderDetailScreen
// ─────────────────────────────────────────────────────────────────────────────

class MarketplaceOrderDetailScreen extends StatefulWidget {
  final dynamic order;
  const MarketplaceOrderDetailScreen({super.key, this.order});

  @override
  State<MarketplaceOrderDetailScreen> createState() =>
      _MarketplaceOrderDetailScreenState();
}

class _MarketplaceOrderDetailScreenState
    extends State<MarketplaceOrderDetailScreen> {
  static const _mp = Color(0xFF6C3FC8);

  late SellerOrder _order;
  bool _statusLoading = false;
  final _noteCtrl = TextEditingController();
  bool _showNote = false;

  @override
  void initState() {
    super.initState();
    _order = widget.order is SellerOrder
        ? widget.order as SellerOrder
        : SellerOrder.mock(SellerOrderType.marketplace);
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _updateStatus(SellerOrderStatus newStatus) async {
    setState(() => _statusLoading = true);
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _order = _order.copyWith(status: newStatus);
      _statusLoading = false;
    });
    if (mounted) {
      context.read<MarketplaceSellerBloc>()
          .add(UpdateOrderStatus(orderId: _order.id, status: newStatus));
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('EEE, MMM d · h:mm a');
    final ss  = context.watch<SellerBloc>().state;
    final cc  = ss.countryCode;
    final cur = ss.country.currencySymbol;
    final vatRate  = _vatRates[cc] ?? 0.0;
    final vatLabel = _vatLabels[cc] ?? 'Tax';
    final subtotal = _order.total;
    final tax      = subtotal * vatRate;
    final total    = subtotal + tax;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Order ${_order.id}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          Text(fmt.format(_order.createdAt), style: const TextStyle(fontSize: 10, color: Colors.white70)),
        ]),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Center(child: OrderStatusChip(status: _order.status)),
          ),
          IconButton(
            icon: Icon(_showNote ? Icons.edit_note : Icons.sticky_note_2_outlined, color: Colors.white),
            tooltip: 'Seller Note',
            onPressed: () => setState(() => _showNote = !_showNote),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Status Stepper ────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: SellerTheme.elevatedCard(),
            child: OrderStatusStepper(currentStatus: _order.status),
          ),
          const SizedBox(height: 14),

          // ── Delivery Dispatch ─────────────────────────────────────────────
          if (_order.status == SellerOrderStatus.ready)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: DeliveryDispatchButton(
                order: _order,
                pickupAddress: _order.deliveryAddress,
                onDispatched: () => setState(() => _order = _order.copyWith(status: SellerOrderStatus.assigned)),
              ),
            ),

          // ── Seller Note ───────────────────────────────────────────────────
          if (_showNote)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: _card(
                title: '📝 Seller Note',
                child: Column(children: [
                  TextField(
                    controller: _noteCtrl,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Internal note about this order...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.all(12),
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content: Text('Note saved ✅'),
                          behavior: SnackBarBehavior.floating,
                        ));
                        setState(() => _showNote = false);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _mp, foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        elevation: 0,
                      ),
                      child: const Text('Save Note', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                ]),
              ),
            ),

          // ── Customer Info ─────────────────────────────────────────────────
          _card(
            title: '👤 Customer',
            child: Column(children: [
              _infoRow(Icons.person_outline, 'Name', _order.customerName),
              if (_order.customerPhone != null)
                _infoRow(Icons.phone_outlined, 'Phone', _order.customerPhone!),
              if (_order.deliveryAddress != null)
                _infoRow(Icons.location_on_outlined, 'Address', _order.deliveryAddress!),
              _infoRow(Icons.payment_outlined, 'Payment', _order.paymentMethod),
              _infoRow(
                _order.isPaid ? Icons.verified_outlined : Icons.pending_outlined,
                'Status',
                _order.isPaid ? 'Paid ✅' : 'Payment Pending ⚠️',
                valueColor: _order.isPaid ? SellerTheme.successGreen : SellerTheme.warningAmber,
              ),
            ]),
          ),
          const SizedBox(height: 12),

          // ── Order Items ───────────────────────────────────────────────────
          _card(
            title: '📦 Items (${_order.itemCount})',
            child: Column(children: [
              ..._order.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(children: [
                  Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(
                      color: _mp.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Center(child: Text('📦', style: TextStyle(fontSize: 20))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    Text('Unit price: $cur ${item.price.toStringAsFixed(2)}',
                        style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
                  ])),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text('×${item.quantity}', style: const TextStyle(color: SellerTheme.textMuted, fontSize: 11)),
                    Text('$cur ${(item.price * item.quantity).toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: _mp)),
                  ]),
                ]),
              )),
            ]),
          ),
          const SizedBox(height: 12),

          // ── Payment & Tax Breakdown ───────────────────────────────────────
          _card(
            title: '💳 Payment Breakdown',
            child: Column(children: [
              _amountRow('Subtotal', '$cur ${subtotal.toStringAsFixed(2)}'),
              if (vatRate > 0) ...[
                const SizedBox(height: 6),
                _amountRow(vatLabel, '$cur ${tax.toStringAsFixed(2)}',
                    color: SellerTheme.textSecondary),
              ] else
                _amountRow(vatLabel, 'Included', color: SellerTheme.successGreen),
              const Divider(height: 20),
              _amountRow('Total', '$cur ${total.toStringAsFixed(2)}',
                  bold: true, color: _mp, fontSize: 16),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                decoration: BoxDecoration(
                  color: (_order.isPaid ? SellerTheme.successGreen : SellerTheme.warningAmber).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: (_order.isPaid ? SellerTheme.successGreen : SellerTheme.warningAmber).withValues(alpha: 0.3)),
                ),
                child: Row(children: [
                  Icon(
                    _order.isPaid ? Icons.check_circle_outline : Icons.access_time,
                    color: _order.isPaid ? SellerTheme.successGreen : SellerTheme.warningAmber,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _order.isPaid
                        ? 'Payment received via ${_order.paymentMethod}'
                        : 'Payment pending — ${_order.paymentMethod}',
                    style: TextStyle(
                      fontSize: 12,
                      color: _order.isPaid ? SellerTheme.successGreen : SellerTheme.warningAmber,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 12),

          // ── Shipping / Fulfilment ─────────────────────────────────────────
          _card(
            title: '🚚 Fulfilment',
            child: Column(children: [
              _infoRow(Icons.store_outlined, 'Shipped from', 'Seller Warehouse · ${ss.country.flag} ${ss.country.name}'),
              _infoRow(Icons.location_on_outlined, 'Deliver to', _order.deliveryAddress ?? 'N/A'),
              if (_order.deliveryPartnerName != null)
                _infoRow(Icons.delivery_dining, 'Driver', _order.deliveryPartnerName!),
              const SizedBox(height: 10),
              // Tracking steps
              _trackingTimeline(_order.status),
            ]),
          ),
          const SizedBox(height: 24),

          // ── Action Buttons ────────────────────────────────────────────────
          _buildActionButtons(),
          const SizedBox(height: 50),
        ],
      ),
    );
  }

  Widget _card({required String title, required Widget child}) => Container(
    padding: const EdgeInsets.all(16),
    decoration: SellerTheme.elevatedCard(),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
      const SizedBox(height: 12),
      child,
    ]),
  );

  Widget _infoRow(IconData icon, String label, String value, {Color? valueColor}) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Icon(icon, size: 16, color: SellerTheme.textMuted),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(color: SellerTheme.textSecondary, fontSize: 12)),
          Expanded(child: Text(value, style: TextStyle(
            fontWeight: FontWeight.w600, fontSize: 12,
            color: valueColor ?? SellerTheme.textPrimary,
          ), overflow: TextOverflow.ellipsis)),
        ]),
      );

  Widget _amountRow(String label, String value, {
    bool bold = false, Color? color, double fontSize = 13,
  }) => Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
    Text(label, style: TextStyle(
      fontSize: fontSize, color: bold ? SellerTheme.textPrimary : SellerTheme.textSecondary,
      fontWeight: bold ? FontWeight.bold : FontWeight.normal,
    )),
    Text(value, style: TextStyle(
      fontSize: fontSize, fontWeight: bold ? FontWeight.bold : FontWeight.w600,
      color: color ?? SellerTheme.textPrimary,
    )),
  ]);

  Widget _trackingTimeline(SellerOrderStatus status) {
    const steps = [
      (SellerOrderStatus.pending,        '📥', 'Order Received'),
      (SellerOrderStatus.confirmed,      '✅', 'Seller Confirmed'),
      (SellerOrderStatus.preparing,      '📦', 'Packing'),
      (SellerOrderStatus.ready,          '🏭', 'Ready for Pickup'),
      (SellerOrderStatus.outForDelivery, '🚚', 'Out for Delivery'),
      (SellerOrderStatus.delivered,      '🏠', 'Delivered'),
    ];
    final idx = steps.indexWhere((s) => s.$1 == status);

    return Column(children: steps.asMap().entries.map((e) {
      final i    = e.key;
      final step = e.value;
      final done   = i < idx;
      final active = i == idx;
      final c      = done || active ? const Color(0xFF6C3FC8) : SellerTheme.textMuted;
      return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Column(children: [
          Container(
            width: 26, height: 26,
            decoration: BoxDecoration(
              color: done
                  ? const Color(0xFF6C3FC8)
                  : active
                      ? const Color(0xFF6C3FC8).withValues(alpha: 0.15)
                      : SellerTheme.surface,
              shape: BoxShape.circle,
              border: Border.all(color: done || active ? const Color(0xFF6C3FC8) : SellerTheme.border, width: 2),
            ),
            child: Center(child: done
                ? const Icon(Icons.check, size: 12, color: Colors.white)
                : Text(step.$2, style: const TextStyle(fontSize: 10))),
          ),
          if (i < steps.length - 1)
            Container(width: 2, height: 20, color: done ? const Color(0xFF6C3FC8) : SellerTheme.border),
        ]),
        const SizedBox(width: 10),
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(step.$3, style: TextStyle(
            fontSize: 12, fontWeight: active ? FontWeight.bold : FontWeight.normal,
            color: c,
          )),
        ),
      ]);
    }).toList());
  }

  Widget _buildActionButtons() {
    final actions = <(String, SellerOrderStatus, Color)>[];

    switch (_order.status) {
      case SellerOrderStatus.pending:
        actions.add(('✅  Accept Order', SellerOrderStatus.confirmed, SellerTheme.successGreen));
        actions.add(('❌  Reject Order', SellerOrderStatus.cancelled, SellerTheme.errorRed));
        break;
      case SellerOrderStatus.confirmed:
        actions.add(('📦  Start Packing', SellerOrderStatus.preparing, SellerTheme.warningAmber));
        break;
      case SellerOrderStatus.preparing:
        actions.add(('🏭  Mark Ready for Pickup', SellerOrderStatus.ready, SellerTheme.infoBlue));
        break;
      default:
        break;
    }

    if (actions.isEmpty) return const SizedBox.shrink();

    return Column(
      children: actions.map((a) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _statusLoading ? null : () => _updateStatus(a.$2),
            style: ElevatedButton.styleFrom(
              backgroundColor: a.$3,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: _statusLoading
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(a.$1, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          ),
        ),
      )).toList(),
    );
  }
}
