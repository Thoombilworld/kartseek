import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Returns Management — View, approve, and reject customer return requests.
class MarketplaceReturnsScreen extends StatefulWidget {
  const MarketplaceReturnsScreen({super.key});

  @override
  State<MarketplaceReturnsScreen> createState() =>
      _MarketplaceReturnsScreenState();
}

class _MarketplaceReturnsScreenState extends State<MarketplaceReturnsScreen>
    with SingleTickerProviderStateMixin {
  static const _mp = Color(0xFF6C3FC8);
  late TabController _tabCtrl;

  final List<_ReturnRequest> _returns = [
    const _ReturnRequest(
        id: 'RET-4501',
        orderId: 'KS-78432',
        product: 'iPhone 15 Pro Max',
        reason: 'Defective screen — dead pixels visible',
        customer: 'Ahmed K.',
        date: '25 Jun',
        status: 'pending',
        amount: 5699),
    const _ReturnRequest(
        id: 'RET-4502',
        orderId: 'KS-78290',
        product: 'Sony WH-1000XM5',
        reason: 'Wrong color delivered — ordered Silver, received Black',
        customer: 'Sara M.',
        date: '24 Jun',
        status: 'pending',
        amount: 1299),
    const _ReturnRequest(
        id: 'RET-4503',
        orderId: 'KS-78101',
        product: 'Samsung Galaxy S24 Ultra',
        reason: 'Changed my mind',
        customer: 'Khalid R.',
        date: '23 Jun',
        status: 'approved',
        amount: 4999),
    const _ReturnRequest(
        id: 'RET-4504',
        orderId: 'KS-77988',
        product: 'Apple Watch Series 9',
        reason: 'Size too small for my wrist',
        customer: 'Fatima A.',
        date: '22 Jun',
        status: 'rejected',
        amount: 1899),
    const _ReturnRequest(
        id: 'RET-4505',
        orderId: 'KS-77850',
        product: 'MacBook Air M3',
        reason: 'Performance not as expected',
        customer: 'Omar H.',
        date: '20 Jun',
        status: 'approved',
        amount: 5499),
    const _ReturnRequest(
        id: 'RET-4506',
        orderId: 'KS-77702',
        product: 'JBL Flip 6',
        reason: 'Battery drains too fast',
        customer: 'Noura S.',
        date: '19 Jun',
        status: 'completed',
        amount: 449),
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  List<_ReturnRequest> _filtered(String status) => status == 'all'
      ? _returns
      : _returns.where((r) => r.status == status).toList();

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;
    final currency = ss.country.currencySymbol;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Returns · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle:
              const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: [
            Tab(text: 'All (${_returns.length})'),
            Tab(text: 'Pending (${_filtered('pending').length})'),
            Tab(text: 'Approved (${_filtered('approved').length})'),
            Tab(text: 'Rejected (${_filtered('rejected').length})'),
          ],
        ),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: TabBarView(
              controller: _tabCtrl,
              children: [
                _buildList(_returns, currency),
                _buildList(_filtered('pending'), currency),
                _buildList(_filtered('approved'), currency),
                _buildList(_filtered('rejected'), currency),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(List<_ReturnRequest> items, String currency) {
    if (items.isEmpty) {
      return Center(
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.assignment_return_outlined,
            size: 60, color: Colors.grey.shade300),
        const SizedBox(height: 12),
        const Text('No return requests',
            style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: SellerTheme.textMuted)),
      ]));
    }
    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (_, i) => _buildReturnCard(items[i], currency),
    );
  }

  Widget _buildReturnCard(_ReturnRequest ret, String currency) {
    final statusColor = SellerTheme.statusColor(ret.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(ret.id,
              style: const TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w700, color: _mp)),
          const SizedBox(width: 6),
          Text('· ${ret.orderId}',
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8)),
            child: Text(ret.status.toUpperCase(),
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: statusColor)),
          ),
        ]),
        const SizedBox(height: 10),
        Text(ret.product,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(ret.reason,
            style: const TextStyle(
                fontSize: 13, color: SellerTheme.textSecondary)),
        const SizedBox(height: 10),
        Row(children: [
          const Icon(Icons.person_outline,
              size: 14, color: SellerTheme.textMuted),
          const SizedBox(width: 4),
          Text(ret.customer,
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
          const SizedBox(width: 12),
          const Icon(Icons.calendar_today,
              size: 14, color: SellerTheme.textMuted),
          const SizedBox(width: 4),
          Text(ret.date,
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
          const Spacer(),
          Text('$currency ${ret.amount}',
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        ]),
        if (ret.status == 'pending') ...[
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => _handleAction(ret, 'rejected'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: SellerTheme.errorRed,
                  side: const BorderSide(color: SellerTheme.errorRed),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Reject',
                    style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                onPressed: () => _handleAction(ret, 'approved'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: SellerTheme.successGreen,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Approve',
                    style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ]),
        ],
      ]),
    );
  }

  void _handleAction(_ReturnRequest ret, String newStatus) {
    setState(() {
      final idx = _returns.indexOf(ret);
      if (idx >= 0) _returns[idx] = ret.copyWith(status: newStatus);
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(
          'Return ${ret.id} ${newStatus == 'approved' ? 'approved' : 'rejected'}'),
      backgroundColor: newStatus == 'approved'
          ? SellerTheme.successGreen
          : SellerTheme.errorRed,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }
}

class _ReturnRequest {
  final String id, orderId, product, reason, customer, date, status;
  final int amount;
  const _ReturnRequest(
      {required this.id,
      required this.orderId,
      required this.product,
      required this.reason,
      required this.customer,
      required this.date,
      required this.status,
      required this.amount});
  _ReturnRequest copyWith({String? status}) => _ReturnRequest(
      id: id,
      orderId: orderId,
      product: product,
      reason: reason,
      customer: customer,
      date: date,
      status: status ?? this.status,
      amount: amount);
}
