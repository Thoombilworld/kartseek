import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';
import 'package:kartseek_seller/features/seller_marketplace/services/marketplace_seller_api_service.dart';

/// Brand Center — Manage brand assets, identity, and brand-store page.
class MarketplaceBrandCenterScreen extends StatefulWidget {
  const MarketplaceBrandCenterScreen({super.key});

  @override
  State<MarketplaceBrandCenterScreen> createState() =>
      _MarketplaceBrandCenterScreenState();
}

class _MarketplaceBrandCenterScreenState
    extends State<MarketplaceBrandCenterScreen> {
  static const _mp = Color(0xFF6C3FC8);

  bool _isLoading = true;
  List<_Brand> _brands = [];

  @override
  void initState() {
    super.initState();
    _loadBrands();
  }

  Future<void> _loadBrands() async {
    setState(() => _isLoading = true);
    final sellerId = context.read<SellerBloc>().state.profile?.id ?? '';
    final brandsData = await MarketplaceSellerApiService.instance.getBrands(sellerId);
    if (mounted) {
      setState(() {
        _brands = brandsData.map((b) => _Brand(
          id: b['id'] ?? '',
          name: b['name'] ?? '',
          tagline: b['tagline'] ?? '',
          productCount: b['productCount'] ?? 0,
          status: b['status']?.toString().toLowerCase() ?? 'pending',
          logo: b['logo'] ?? '🔷',
          category: b['category'] ?? '',
          trademark: b['trademark'] ?? '',
        )).toList();
        _isLoading = false;
      });
    }
  }

  void _submitRegistration(String name, String url) async {
    final sellerId = context.read<SellerBloc>().state.profile?.id ?? '';
    final success = await MarketplaceSellerApiService.instance.registerBrand(sellerId, {
      'name': name,
      'docUrl': url,
    });
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Brand registration submitted for approval')));
      _loadBrands();
    }
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
        title: Text('Brand Center · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          final nameCtrl = TextEditingController();
          final urlCtrl = TextEditingController();
          showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              shape: const RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.vertical(top: Radius.circular(20))),
              builder: (_) => Padding(
                  padding: EdgeInsets.only(
                    bottom: MediaQuery.of(context).viewInsets.bottom,
                    left: 24, right: 24, top: 24,
                  ),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Text('Register New Brand',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 16),
                    TextFormField(
                        controller: nameCtrl,
                        decoration: const InputDecoration(
                            labelText: 'Brand Name',
                            border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                    TextFormField(
                        controller: urlCtrl,
                        decoration: const InputDecoration(
                            labelText: 'Authorization Document URL',
                            border: OutlineInputBorder())),
                    const SizedBox(height: 16),
                    SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            _submitRegistration(nameCtrl.text, urlCtrl.text);
                          },
                          style: ElevatedButton.styleFrom(
                              backgroundColor: _mp,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12))),
                          child: const Text('Submit Registration',
                              style: TextStyle(fontWeight: FontWeight.w700)),
                        )),
                    const SizedBox(height: 24),
                  ])));
        },
        backgroundColor: _mp,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Register Brand',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                // Info card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: SellerTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(children: [
                    const Icon(Icons.workspace_premium,
                        color: Colors.white, size: 32),
                    const SizedBox(width: 14),
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          const Text('Brand Registry',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800)),
                          Text(
                              'Register your brand for enhanced protection, a dedicated brand store page, and premium placement.',
                              style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.8),
                                  fontSize: 12)),
                        ])),
                  ]),
                ),
                const SizedBox(height: 16),

                // Brand guidelines
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: SellerTheme.cardDecoration(),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(children: [
                          Icon(Icons.checklist, color: _mp, size: 20),
                          SizedBox(width: 8),
                          Text('Brand Requirements',
                              style: TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.w700)),
                        ]),
                        const SizedBox(height: 14),
                        _requirement(
                            'Brand trademark or registration certificate'),
                        _requirement(
                            'High-resolution logo (SVG or PNG, min 512×512)'),
                        _requirement('Brand description (min 100 characters)'),
                        _requirement(
                            'At least 5 products listed under the brand'),
                        _requirement('Brand banner image (1200×400 minimum)'),
                      ]),
                ),
                const SizedBox(height: 16),

                // Brands list
                const Text('Your Brands',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                if (_isLoading)
                  const Center(child: CircularProgressIndicator(color: _mp))
                else if (_brands.isEmpty)
                  const Text('No brands registered yet.', style: TextStyle(color: SellerTheme.textMuted))
                else
                  ..._brands.map((b) => _buildBrandCard(b)),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _requirement(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(children: [
        Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
                color: SellerTheme.successGreen.withValues(alpha: 0.1),
                shape: BoxShape.circle),
            child: const Icon(Icons.check,
                color: SellerTheme.successGreen, size: 14)),
        const SizedBox(width: 10),
        Expanded(
            child: Text(text,
                style: const TextStyle(
                    fontSize: 13, color: SellerTheme.textSecondary))),
      ]),
    );
  }

  Widget _buildBrandCard(_Brand b) {
    final statusColor = b.status == 'approved' || b.status == 'registered'
        ? SellerTheme.successGreen
        : SellerTheme.warningAmber;
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, '/seller/marketplace/brand-center/detail', arguments: {
          'id': b.id,
          'name': b.name,
          'status': b.status,
          'trademark': b.trademark,
          'products': b.productCount,
          'logo': b.logo,
        });
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: SellerTheme.cardDecoration(),
      child: Row(children: [
        Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
                color: _mp.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14)),
            child: Center(
                child: Text(b.logo, style: const TextStyle(fontSize: 26)))),
        const SizedBox(width: 14),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(b.name,
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6)),
              child: Text(b.status.toUpperCase(),
                  style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      color: statusColor)),
            ),
          ]),
          const SizedBox(height: 2),
          Text(b.tagline,
              style:
                  const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
          const SizedBox(height: 6),
          Row(children: [
            _chip(b.category, SellerTheme.infoBlue),
            const SizedBox(width: 6),
            _chip('${b.productCount} products', SellerTheme.textMuted),
          ]),
        ])),
        const Icon(Icons.chevron_right, color: SellerTheme.textMuted),
      ]),
    ));
  }

  Widget _chip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(6)),
      child: Text(text, style: TextStyle(fontSize: 11, color: color)),
    );
  }
}

class _Brand {
  final String id, name, tagline, logo, category, status, trademark;
  final int productCount;
  const _Brand(
      {required this.id,
      required this.name,
      required this.tagline,
      required this.productCount,
      required this.status,
      required this.logo,
      required this.category,
      required this.trademark});
}
