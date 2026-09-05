import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// KARTSEEK Wallet Screen — Premium balance card, transaction history, filters.
class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> with SingleTickerProviderStateMixin {
  String _filter = 'all';
  late TabController _tabController;

  static const _transactions = [
    {'id': 'txn-01', 'title': 'Grocery Order #GR-1234', 'date': 'Today, 2:15 PM', 'amount': -480, 'type': 'debit', 'category': 'grocery', 'icon': Icons.shopping_basket},
    {'id': 'txn-02', 'title': 'Wallet Recharge', 'date': 'Today, 10:00 AM', 'amount': 5000, 'type': 'credit', 'category': 'recharge', 'icon': Icons.add_circle},
    {'id': 'txn-03', 'title': 'Refund - Cancelled Order', 'date': 'Yesterday', 'amount': 350, 'type': 'credit', 'category': 'refund', 'icon': Icons.replay},
    {'id': 'txn-04', 'title': 'Taxi Ride to Airport', 'date': 'Yesterday', 'amount': -585, 'type': 'debit', 'category': 'taxi', 'icon': Icons.local_taxi},
    {'id': 'txn-05', 'title': 'Restaurant - Grand Biryani', 'date': 'Jun 18', 'amount': -720, 'type': 'debit', 'category': 'restaurant', 'icon': Icons.restaurant},
    {'id': 'txn-06', 'title': 'Pharmacy - MedEasy', 'date': 'Jun 17', 'amount': -1250, 'type': 'debit', 'category': 'pharmacy', 'icon': Icons.local_pharmacy},
    {'id': 'txn-07', 'title': 'Cashback Reward', 'date': 'Jun 16', 'amount': 150, 'type': 'credit', 'category': 'cashback', 'icon': Icons.card_giftcard},
    {'id': 'txn-08', 'title': 'Hotel Booking', 'date': 'Jun 15', 'amount': -4200, 'type': 'debit', 'category': 'hotel', 'icon': Icons.hotel},
    {'id': 'txn-09', 'title': 'Referral Bonus', 'date': 'Jun 14', 'amount': 500, 'type': 'credit', 'category': 'referral', 'icon': Icons.people},
    {'id': 'txn-10', 'title': 'Wallet Recharge', 'date': 'Jun 12', 'amount': 10000, 'type': 'credit', 'category': 'recharge', 'icon': Icons.add_circle},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() { _tabController.dispose(); super.dispose(); }

  List<Map<String, dynamic>> get _filtered {
    if (_filter == 'all') return _transactions;
    return _transactions.where((t) => t['type'] == _filter).toList();
  }

  double get _balance {
    return _transactions.fold<double>(0, (sum, t) => sum + (t['amount'] as int));
  }

  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    final results = _filtered;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // ── Premium App Bar ──
          SliverAppBar(
            expandedHeight: 280, pinned: true, elevation: 0,
            backgroundColor: AppTheme.primaryGreen,
            surfaceTintColor: Colors.transparent,
            leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => Navigator.pop(context)),
            actions: [IconButton(icon: const Icon(Icons.history, color: Colors.white, size: 22), onPressed: () {})],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF059669), Color(0xFF10B981), Color(0xFF34D399)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 56, 24, 24),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('KARTSEEK Wallet', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white.withValues(alpha: 0.7))),
                      const SizedBox(height: 4),
                      Text('$currency ${_balance.toStringAsFixed(0)}', style: const TextStyle(fontSize: 38, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -1)),
                      Text('Available Balance', style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.6))),
                      const Spacer(),
                      // Quick actions
                      Row(children: [
                        _quickAction(Icons.add, 'Recharge'),
                        const SizedBox(width: 12),
                        _quickAction(Icons.send, 'Send'),
                        const SizedBox(width: 12),
                        _quickAction(Icons.account_balance, 'Withdraw'),
                        const SizedBox(width: 12),
                        _quickAction(Icons.qr_code, 'Pay'),
                      ]),
                    ]),
                  ),
                ),
              ),
            ),
          ),

          // ── Linked Accounts ──
          SliverToBoxAdapter(child: Container(
            margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10)]),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Text('Linked Accounts', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                const Spacer(),
                GestureDetector(
                  onTap: () {},
                  child: const Text('+ Add', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF10B981))),
                ),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                _linkedCard('💳', 'Visa •••• 4242', 'Default'),
                const SizedBox(width: 10),
                _linkedCard('🏦', 'KCB Bank', 'Linked'),
              ]),
            ]),
          )),

          // ── Auto-Pay ──
          SliverToBoxAdapter(child: Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFBBF7D0))),
            child: Row(children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.autorenew, color: Color(0xFF10B981), size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Auto-Recharge', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF166534))),
                Text('Top up when balance drops below ${RegionService.instance.currentCountry.currencySymbol} 500', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              ])),
              Switch(value: true, onChanged: (_) {}, activeTrackColor: const Color(0xFF10B981)),
            ]),
          )),

          // ── Transaction Header + Filter ──
          SliverToBoxAdapter(child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 10),
            child: Row(children: [
              const Text('Transaction History', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
              const Spacer(),
              ...['All', 'Credit', 'Debit'].map((f) {
                final key = f.toLowerCase();
                final active = _filter == (key == 'all' ? 'all' : key);
                return GestureDetector(
                  onTap: () => setState(() => _filter = key == 'all' ? 'all' : key),
                  child: Container(
                    margin: const EdgeInsets.only(left: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: active ? const Color(0xFF10B981) : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: active ? const Color(0xFF10B981) : const Color(0xFFE2E8F0)),
                    ),
                    child: Text(f, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: active ? Colors.white : const Color(0xFF64748B))),
                  ),
                );
              }),
            ]),
          )),

          // ── Transaction List ──
          SliverList(delegate: SliverChildBuilderDelegate(
            (_, i) {
              final txn = results[i];
              final amount = txn['amount'] as int;
              final isCredit = amount > 0;
              final color = isCredit ? const Color(0xFF10B981) : const Color(0xFFEF4444);

              return Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6)]),
                child: Row(children: [
                  Container(
                    width: 42, height: 42,
                    decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                    child: Icon(txn['icon'] as IconData, color: color, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(txn['title'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)), maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(txn['date'] as String, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                  ])),
                  Text('${isCredit ? '+' : ''}$currency ${amount.abs()}', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: color)),
                ]),
              );
            },
            childCount: results.length,
          )),

          const SliverToBoxAdapter(child: SizedBox(height: 30)),
        ],
      ),
    );
  }

  Widget _quickAction(IconData icon, String label) => Expanded(child: GestureDetector(
    onTap: () {},
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
      child: Column(children: [
        Icon(icon, color: Colors.white, size: 20),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white.withValues(alpha: 0.9))),
      ]),
    ),
  ));

  Widget _linkedCard(String emoji, String title, String badge) => Expanded(child: Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
    child: Row(children: [
      Text(emoji, style: const TextStyle(fontSize: 20)),
      const SizedBox(width: 8),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
        Text(badge, style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
      ])),
    ]),
  ));
}
