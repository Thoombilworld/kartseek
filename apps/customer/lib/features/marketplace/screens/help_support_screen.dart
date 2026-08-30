import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';

/// Help & Support Screen — FAQ, search, multi-channel contact.
class HelpSupportScreen extends StatefulWidget {
  const HelpSupportScreen({super.key});
  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  final _searchController = TextEditingController();
  int? _expandedFaq;

  final _categories = [
    const _HelpCat(
        title: 'Orders & Delivery',
        icon: Icons.local_shipping,
        color: AppTheme.marketplaceColor,
        count: 15),
    const _HelpCat(
        title: 'Returns & Refunds',
        icon: Icons.assignment_return,
        color: AppTheme.warningAmber,
        count: 12),
    const _HelpCat(
        title: 'Payments',
        icon: Icons.payment,
        color: AppTheme.successGreen,
        count: 8),
    const _HelpCat(
        title: 'Account',
        icon: Icons.person,
        color: Color(0xFF8B5CF6),
        count: 10),
    const _HelpCat(
        title: 'Products',
        icon: Icons.inventory_2,
        color: AppTheme.errorRed,
        count: 6),
    const _HelpCat(
        title: 'KartSeek Plus',
        icon: Icons.star,
        color: Color(0xFFF97316),
        count: 5),
  ];

  final _faqs = [
    const _Faq(
        q: 'How do I track my order?',
        a: 'Go to Orders → select your order → tap "Track Package". You\'ll see real-time updates with delivery partner details and estimated arrival time.'),
    const _Faq(
        q: 'What is the return policy?',
        a: 'Most items can be returned within 7-30 days of delivery. Electronics have a 10-day window, fashion items 30 days. Items must be unused and in original packaging.'),
    const _Faq(
        q: 'How long do refunds take?',
        a: 'Refunds are processed within 5-7 business days to your original payment method. UPI refunds are typically faster (1-2 days).'),
    const _Faq(
        q: 'Can I change my delivery address?',
        a: 'Yes, if the order hasn\'t been shipped yet. Go to Orders → select order → "Change Address". Once shipped, the address cannot be modified.'),
    const _Faq(
        q: 'How do I cancel an order?',
        a: 'Go to Orders → select the order → "Cancel Order". Select a reason and confirm. If already shipped, you may need to reject delivery or initiate a return.'),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      body: CustomScrollView(physics: const BouncingScrollPhysics(), slivers: [
        SliverAppBar(
          expandedHeight: 180,
          pinned: true,
          backgroundColor: AppTheme.marketplaceColor,
          iconTheme: const IconThemeData(color: Colors.white),
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: const BoxDecoration(
                  gradient: LinearGradient(
                      colors: [AppTheme.marketplaceColor, Color(0xFF8B5CF6)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight)),
              child: SafeArea(
                  child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 50, 20, 16),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('How can we help?',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 26,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 12),
                      Container(
                        decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(14)),
                        child: TextField(
                          controller: _searchController,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            hintText: 'Search for help...',
                            hintStyle: TextStyle(
                                color: Colors.white.withValues(alpha: 0.5)),
                            prefixIcon: Icon(Icons.search,
                                color: Colors.white.withValues(alpha: 0.7)),
                            border: InputBorder.none,
                            contentPadding:
                                const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ]),
              )),
            ),
          ),
        ),
        SliverToBoxAdapter(
            child: Padding(
          padding: const EdgeInsets.all(16),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Categories Grid
            const Text('Browse by Topic',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary)),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 0.9,
              children: _categories
                  .map((cat) => GestureDetector(
                        onTap: () {},
                        child: Container(
                          decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border:
                                  Border.all(color: AppTheme.borderLight)),
                          child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                        color: cat.color.withValues(alpha: 0.1),
                                        borderRadius:
                                            BorderRadius.circular(12)),
                                    child: Icon(cat.icon,
                                        color: cat.color, size: 22)),
                                const SizedBox(height: 8),
                                Text(cat.title,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 11),
                                    textAlign: TextAlign.center),
                                Text('${cat.count} articles',
                                    style: const TextStyle(
                                        color: AppTheme.textMuted,
                                        fontSize: 10)),
                              ]),
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 24),

            // FAQs
            const Text('Frequently Asked Questions',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary)),
            const SizedBox(height: 12),
            ..._faqs.asMap().entries.map((e) {
              final i = e.key;
              final faq = e.value;
              final expanded = _expandedFaq == i;
              return GestureDetector(
                onTap: () => setState(() => _expandedFaq = expanded ? null : i),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: expanded
                              ? const Color(0xFFC7D2FE)
                              : AppTheme.borderLight)),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(
                              child: Text(faq.q,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14,
                                      color: AppTheme.textPrimary))),
                          Icon(
                              expanded
                                  ? Icons.keyboard_arrow_up
                                  : Icons.keyboard_arrow_down,
                              color: AppTheme.textMuted),
                        ]),
                        if (expanded) ...[
                          const SizedBox(height: 10),
                          Text(faq.a,
                              style: const TextStyle(
                                  color: AppTheme.textSecondary,
                                  fontSize: 13,
                                  height: 1.5))
                        ],
                      ]),
                ),
              );
            }),
            const SizedBox(height: 24),

            // Contact Options
            const Text('Still need help?',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary)),
            const SizedBox(height: 12),
            ...[
              const _Contact(
                  title: 'Live Chat',
                  subtitle: 'Avg wait: 2 min',
                  icon: Icons.chat_bubble,
                  color: AppTheme.marketplaceColor),
              const _Contact(
                  title: 'Call Us',
                  subtitle: '1800-XXX-XXXX (24/7)',
                  icon: Icons.phone,
                  color: AppTheme.successGreen),
              const _Contact(
                  title: 'Email Support',
                  subtitle: 'Reply within 24h',
                  icon: Icons.email,
                  color: AppTheme.warningAmber),
            ].map((c) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.borderLight)),
                  child: ListTile(
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    leading: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                            color: c.color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12)),
                        child: Icon(c.icon, color: c.color, size: 22)),
                    title: Text(c.title,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(c.subtitle,
                        style: const TextStyle(
                            fontSize: 12, color: AppTheme.textMuted)),
                    trailing: const Icon(Icons.chevron_right,
                        color: AppTheme.textMuted),
                    onTap: () {},
                  ),
                )),
            const SizedBox(height: 24),
          ]),
        )),
      ]),
    );
  }
}

class _HelpCat {
  final String title;
  final IconData icon;
  final Color color;
  final int count;
  const _HelpCat(
      {required this.title,
      required this.icon,
      required this.color,
      required this.count});
}

class _Faq {
  final String q, a;
  const _Faq({required this.q, required this.a});
}

class _Contact {
  final String title, subtitle;
  final IconData icon;
  final Color color;
  const _Contact(
      {required this.title,
      required this.subtitle,
      required this.icon,
      required this.color});
}
