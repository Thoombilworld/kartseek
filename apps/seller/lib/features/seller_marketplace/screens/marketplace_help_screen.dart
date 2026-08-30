import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';
import 'package:url_launcher/url_launcher.dart';

/// Help Center — FAQs, guides, contact support, and policy links for sellers.
class MarketplaceHelpScreen extends StatefulWidget {
  const MarketplaceHelpScreen({super.key});
  @override
  State<MarketplaceHelpScreen> createState() => _State();
}

class _State extends State<MarketplaceHelpScreen> {
  static const _mp = Color(0xFF6C3FC8);
  String _search = '';
  int _expandedFaq = -1;
  String _selectedCategory = 'all';

  static const _categories = [
    'all',
    'getting-started',
    'products',
    'orders',
    'payments',
    'returns',
    'policies'
  ];

  final List<_FaqItem> _faqs = [
    _FaqItem(
        cat: 'getting-started',
        q: 'How do I set up my seller profile?',
        a: 'Go to Settings → Storefront and fill in your store name, description, logo, return policy, and shipping policy. Your profile must be at least 80% complete before products go live.'),
    _FaqItem(
        cat: 'getting-started',
        q: 'How long does seller verification take?',
        a: 'Verification typically takes 1–3 business days. Submit your business license, tax certificate, and bank details via Settings → Verification.'),
    _FaqItem(
        cat: 'products',
        q: 'How do I add a new product?',
        a: 'Navigate to Products → Add Product. Fill in the title, description, pricing, images, category, and stock. Submit for admin approval. Most products are reviewed within 24 hours.'),
    _FaqItem(
        cat: 'products',
        q: 'Can I bulk upload products?',
        a: 'Yes! Go to Products → Bulk Upload. Download our CSV template, fill in your product data, and upload. The system validates all rows and shows errors before import.'),
    _FaqItem(
        cat: 'products',
        q: 'Why was my product rejected?',
        a: 'Products are rejected for quality issues, missing images, policy violations, or incorrect categorization. Check the rejection reason on the Products page and resubmit after corrections.'),
    _FaqItem(
        cat: 'orders',
        q: 'How do I process an order?',
        a: 'When a new order arrives, tap Accept → Prepare → Mark Ready → Ship. You can track all order statuses from the Orders screen.'),
    _FaqItem(
        cat: 'orders',
        q: 'What happens if I reject an order?',
        a: 'The customer receives a full refund and a notification. Frequent rejections may affect your seller health score.'),
    _FaqItem(
        cat: 'payments',
        q: 'When do I receive payouts?',
        a: 'Payouts are processed weekly (every Monday). The minimum payout threshold is QAR 100. You can request early payouts from the Wallet screen.'),
    _FaqItem(
        cat: 'payments',
        q: 'How are commissions calculated?',
        a: 'Commission rates vary by category (8–15%). The rate is applied to the selling price excluding delivery fees. View your rates on the Commissions page.'),
    _FaqItem(
        cat: 'returns',
        q: 'How do I handle a return request?',
        a: 'Review the return reason on the Returns page. You can Approve (customer ships back and gets refund) or Reject (with a reason). Respond within 48 hours.'),
    _FaqItem(
        cat: 'returns',
        q: 'Who pays for return shipping?',
        a: 'If the return is due to a product defect or wrong item, the platform covers shipping. For change-of-mind returns, the customer pays.'),
    _FaqItem(
        cat: 'policies',
        q: 'What is the seller health score?',
        a: 'Your health score is based on order acceptance rate, shipping SLA, customer reviews, and return rate. A score above 80% keeps you in good standing. Below 60% triggers review.'),
    _FaqItem(
        cat: 'policies',
        q: 'Can my store be suspended?',
        a: 'Stores may be suspended for policy violations, consistently low health scores, or fraudulent activity. You can appeal via the support channel.'),
  ];

  List<_FaqItem> get _filteredFaqs {
    var list = _selectedCategory == 'all'
        ? _faqs
        : _faqs.where((f) => f.cat == _selectedCategory).toList();
    if (_search.isNotEmpty) {
      list = list
          .where((f) =>
              f.q.toLowerCase().contains(_search.toLowerCase()) ||
              f.a.toLowerCase().contains(_search.toLowerCase()))
          .toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Help Center · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          // Search bar
          Container(
            color: _mp,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search FAQs, guides, policies…',
                hintStyle: TextStyle(
                    color: Colors.white.withValues(alpha: 0.6), fontSize: 14),
                prefixIcon: Icon(Icons.search,
                    color: Colors.white.withValues(alpha: 0.7)),
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.15),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ),
          // Category chips
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _categories
                    .map((c) => _chipBtn(c, _categoryLabel(c)))
                    .toList(),
              ),
            ),
          ),
          // Content
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                // Quick Actions
                _sectionTitle('Quick Actions'),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _quickAction(Icons.chat_bubble_outline, 'Live Chat',
                        Colors.blue, () {}),
                    const SizedBox(width: 10),
                    _quickAction(
                        Icons.email_outlined,
                        'Email Support',
                        Colors.green,
                        () => _launchUrl('mailto:seller-support@kartseek.com')),
                    const SizedBox(width: 10),
                    _quickAction(Icons.phone_outlined, 'Call Us', Colors.orange,
                        () => _launchUrl('tel:+97440001234')),
                  ],
                ),
                const SizedBox(height: 24),

                // Seller Guides
                _sectionTitle('Seller Guides'),
                const SizedBox(height: 10),
                _guideCard('📦', 'Getting Started Guide',
                    'Set up your store in 5 simple steps', '5 min read'),
                _guideCard(
                    '📊',
                    'Maximize Your Sales',
                    'Tips for product listings, pricing, and promotions',
                    '8 min read'),
                _guideCard(
                    '🚀',
                    'Advertising & Campaigns',
                    'How to run sponsored products and flash deals',
                    '6 min read'),
                _guideCard(
                    '📋',
                    'Seller Policies',
                    'Return, refund, commission, and shipping policies',
                    '4 min read'),
                const SizedBox(height: 24),

                // FAQs
                _sectionTitle(
                    'Frequently Asked Questions (${_filteredFaqs.length})'),
                const SizedBox(height: 10),
                ..._filteredFaqs
                    .asMap()
                    .entries
                    .map((e) => _buildFaqTile(e.key, e.value)),

                if (_filteredFaqs.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(24),
                    child: Column(children: [
                      Icon(Icons.search_off,
                          size: 48, color: Colors.grey.shade300),
                      const SizedBox(height: 8),
                      Text('No FAQs found',
                          style: TextStyle(color: Colors.grey.shade500)),
                    ]),
                  ),

                const SizedBox(height: 24),

                // Contact Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                        colors: [_mp, _mp.withValues(alpha: 0.8)]),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.headset_mic,
                          color: Colors.white, size: 36),
                      const SizedBox(height: 12),
                      const Text('Still need help?',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Text('Our seller support team is available 24/7',
                          style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 13)),
                      const SizedBox(height: 14),
                      ElevatedButton(
                        onPressed: () =>
                            _launchUrl('mailto:seller-support@kartseek.com'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: _mp,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 24, vertical: 12),
                        ),
                        child: const Text('Contact Support',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _chipBtn(String value, String label) {
    final sel = _selectedCategory == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        selected: sel,
        label: Text(label,
            style: TextStyle(
                fontSize: 12,
                color: sel ? Colors.white : Colors.grey.shade700)),
        backgroundColor: Colors.grey.shade100,
        selectedColor: _mp,
        checkmarkColor: Colors.white,
        onSelected: (_) => setState(() => _selectedCategory = value),
      ),
    );
  }

  Widget _quickAction(
      IconData icon, String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withValues(alpha: 0.2)),
          ),
          child: Column(children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 6),
            Text(label,
                style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w600, color: color),
                textAlign: TextAlign.center),
          ]),
        ),
      ),
    );
  }

  Widget _guideCard(String emoji, String title, String subtitle, String badge) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 28)),
          const SizedBox(width: 14),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(subtitle,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
                color: _mp.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6)),
            child: Text(badge,
                style: const TextStyle(
                    fontSize: 10, fontWeight: FontWeight.w600, color: _mp)),
          ),
        ],
      ),
    );
  }

  Widget _buildFaqTile(int index, _FaqItem faq) {
    final expanded = _expandedFaq == index;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color:
                expanded ? _mp.withValues(alpha: 0.4) : Colors.grey.shade200),
      ),
      child: Column(
        children: [
          ListTile(
            onTap: () => setState(() => _expandedFaq = expanded ? -1 : index),
            title: Text(faq.q,
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: expanded ? _mp : Colors.grey.shade800)),
            trailing: Icon(expanded ? Icons.expand_less : Icons.expand_more,
                color: expanded ? _mp : Colors.grey.shade400),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          ),
          if (expanded)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: Text(faq.a,
                  style: TextStyle(
                      fontSize: 13, color: Colors.grey.shade600, height: 1.5)),
            ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) => Text(title,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800));

  String _categoryLabel(String cat) {
    switch (cat) {
      case 'all':
        return 'All';
      case 'getting-started':
        return '🚀 Getting Started';
      case 'products':
        return '📦 Products';
      case 'orders':
        return '📋 Orders';
      case 'payments':
        return '💰 Payments';
      case 'returns':
        return '↩️ Returns';
      case 'policies':
        return '📜 Policies';
      default:
        return cat;
    }
  }

  void _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}

class _FaqItem {
  final String cat;
  final String q;
  final String a;
  _FaqItem({required this.cat, required this.q, required this.a});
}
