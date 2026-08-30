import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';

/// Storefront Customization — Manage store branding, banner, about, policies, SEO.
class MarketplaceStorefrontScreen extends StatefulWidget {
  const MarketplaceStorefrontScreen({super.key});

  @override
  State<MarketplaceStorefrontScreen> createState() => _MarketplaceStorefrontScreenState();
}

class _MarketplaceStorefrontScreenState extends State<MarketplaceStorefrontScreen> {
  static const _mp = Color(0xFF6C3FC8);

  final _nameCtrl = TextEditingController(text: 'Gulf Tech & Fashion Emporium');
  final _taglineCtrl = TextEditingController(text: 'Premium electronics & fashion — delivered nationwide');
  final _aboutCtrl = TextEditingController(
    text: 'We are a multi-category marketplace seller offering the latest in electronics, '
         'fashion, and home essentials. Verified seller since 2024 with 4.8★ rating.',
  );
  final _returnPolicyCtrl = TextEditingController(text: '7-day easy returns on all products. No questions asked.');
  final _shippingPolicyCtrl = TextEditingController(text: 'Free shipping on orders above AED 100. Standard delivery: 2-5 business days.');
  final _websiteCtrl = TextEditingController(text: 'https://gulftechstore.com');
  final _instagramCtrl = TextEditingController(text: '@gulftechfashion');
  final _seoTitleCtrl = TextEditingController(text: 'Gulf Tech & Fashion — Best Deals on Electronics');
  final _seoDescCtrl = TextEditingController(text: 'Shop premium electronics, fashion, and home essentials at Gulf Tech & Fashion Emporium on KARTSEEK.');

  bool _isVerified = true;
  bool _acceptsReturns = true;
  bool _freeShipping = true;
  String _selectedThemeColor = 'violet';
  bool _saving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _taglineCtrl.dispose();
    _aboutCtrl.dispose();
    _returnPolicyCtrl.dispose();
    _shippingPolicyCtrl.dispose();
    _websiteCtrl.dispose();
    _instagramCtrl.dispose();
    _seoTitleCtrl.dispose();
    _seoDescCtrl.dispose();
    super.dispose();
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
        title: Text('Storefront · ${ss.country.flag}', style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          TextButton.icon(
            onPressed: _saving ? null : _handleSave,
            icon: _saving
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.save, color: Colors.white, size: 20),
            label: const Text('Save', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                _buildBannerPreview(),
                const SizedBox(height: 20),
                _buildSection('Store Identity', Icons.store, [
                  _buildTextField('Store Name', _nameCtrl, Icons.storefront),
                  const SizedBox(height: 12),
                  _buildTextField('Tagline', _taglineCtrl, Icons.short_text),
                  const SizedBox(height: 12),
                  _buildTextField('About Your Store', _aboutCtrl, Icons.info_outline, maxLines: 4),
                ]),
                const SizedBox(height: 16),
                _buildSection('Verification & Trust', Icons.verified, [
                  _buildSwitchTile('Verified Seller Badge', 'Show verification badge on storefront', _isVerified, (v) => setState(() => _isVerified = v)),
                  _buildSwitchTile('Accept Returns', 'Enable return requests from customers', _acceptsReturns, (v) => setState(() => _acceptsReturns = v)),
                  _buildSwitchTile('Free Shipping', 'Offer free shipping on qualifying orders', _freeShipping, (v) => setState(() => _freeShipping = v)),
                ]),
                const SizedBox(height: 16),
                _buildSection('Policies', Icons.policy, [
                  _buildTextField('Return Policy', _returnPolicyCtrl, Icons.assignment_return, maxLines: 2),
                  const SizedBox(height: 12),
                  _buildTextField('Shipping Policy', _shippingPolicyCtrl, Icons.local_shipping, maxLines: 2),
                ]),
                const SizedBox(height: 16),
                _buildSection('Social & Web', Icons.language, [
                  _buildTextField('Website', _websiteCtrl, Icons.link),
                  const SizedBox(height: 12),
                  _buildTextField('Instagram', _instagramCtrl, Icons.camera_alt),
                ]),
                const SizedBox(height: 16),
                _buildSection('Store Theme', Icons.palette, [
                  _buildThemeSelector(),
                ]),
                const SizedBox(height: 16),
                _buildSection('SEO Settings', Icons.search, [
                  _buildTextField('SEO Title', _seoTitleCtrl, Icons.title),
                  const SizedBox(height: 12),
                  _buildTextField('SEO Description', _seoDescCtrl, Icons.description, maxLines: 3),
                ]),
                const SizedBox(height: 32),
                _buildStorePreviewCard(ss),
                const SizedBox(height: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Banner Preview ──────────────────────────────────────────────────────────

  Widget _buildBannerPreview() {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF6C3FC8), Color(0xFF9B59F5)]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        children: [
          Positioned(right: -30, top: -30, child: Container(width: 120, height: 120,
            decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.08)))),
          Positioned(left: -20, bottom: -20, child: Container(width: 80, height: 80,
            decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.06)))),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 56, height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                      ),
                      child: const Icon(Icons.store, color: Colors.white, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_nameCtrl.text, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 4),
                          Text(_taglineCtrl.text, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Row(
                  children: [
                    if (_isVerified) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
                        child: const Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.verified, color: Colors.white, size: 14),
                          SizedBox(width: 4),
                          Text('Verified', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                        ]),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
                      child: const Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.star, color: Colors.amber, size: 14),
                        SizedBox(width: 4),
                        Text('4.8', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                      ]),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Positioned(
            right: 12, top: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(8)),
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.image, color: Colors.white70, size: 14),
                SizedBox(width: 4),
                Text('Change Banner', style: TextStyle(color: Colors.white70, fontSize: 11)),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  // ── Section Card ────────────────────────────────────────────────────────────

  Widget _buildSection(String title, IconData icon, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, color: _mp, size: 20),
            const SizedBox(width: 8),
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: SellerTheme.textPrimary)),
          ]),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController ctrl, IconData icon, {int maxLines = 1}) {
    return TextField(
      controller: ctrl,
      maxLines: maxLines,
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: SellerTheme.textSecondary, fontSize: 13),
        prefixIcon: Icon(icon, size: 20, color: SellerTheme.textMuted),
        filled: true,
        fillColor: SellerTheme.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: SellerTheme.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: SellerTheme.border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: _mp, width: 2)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
    );
  }

  Widget _buildSwitchTile(String title, String subtitle, bool value, ValueChanged<bool> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
            ]),
          ),
          // ignore: deprecated_member_use
          Switch.adaptive(value: value, onChanged: onChanged, activeColor: _mp),
        ],
      ),
    );
  }

  // ── Theme Selector ──────────────────────────────────────────────────────────

  Widget _buildThemeSelector() {
    const themes = <String, Color>{
      'violet': Color(0xFF6C3FC8),
      'blue': Color(0xFF3B82F6),
      'teal': Color(0xFF0EA5E9),
      'green': Color(0xFF22C55E),
      'orange': Color(0xFFF59E0B),
      'red': Color(0xFFEF4444),
    };

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: themes.entries.map((e) {
        final selected = _selectedThemeColor == e.key;
        return GestureDetector(
          onTap: () => setState(() => _selectedThemeColor = e.key),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: e.value,
              shape: BoxShape.circle,
              border: Border.all(color: selected ? SellerTheme.textPrimary : Colors.transparent, width: 3),
              boxShadow: selected ? [BoxShadow(color: e.value.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 2))] : [],
            ),
            child: selected ? const Icon(Icons.check, color: Colors.white, size: 20) : null,
          ),
        );
      }).toList(),
    );
  }

  // ── Store Preview Card ──────────────────────────────────────────────────────

  Widget _buildStorePreviewCard(SellerState ss) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.visibility, color: _mp, size: 20),
            SizedBox(width: 8),
            Text('Customer View Preview', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: SellerTheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: SellerTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Container(width: 40, height: 40,
                    decoration: BoxDecoration(color: _mp.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.store, color: _mp, size: 20)),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(_nameCtrl.text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(_taglineCtrl.text, style: const TextStyle(fontSize: 11, color: SellerTheme.textMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ])),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  _previewChip('★ 4.8', SellerTheme.warningAmber),
                  const SizedBox(width: 6),
                  _previewChip('1.2K reviews', SellerTheme.infoBlue),
                  const SizedBox(width: 6),
                  if (_isVerified) _previewChip('Verified', SellerTheme.successGreen),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  if (_freeShipping) ...[
                    const Icon(Icons.local_shipping, size: 14, color: SellerTheme.textMuted),
                    const SizedBox(width: 4),
                    const Text('Free Shipping', style: TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
                    const SizedBox(width: 12),
                  ],
                  if (_acceptsReturns) ...[
                    const Icon(Icons.assignment_return, size: 14, color: SellerTheme.textMuted),
                    const SizedBox(width: 4),
                    const Text('Easy Returns', style: TextStyle(fontSize: 11, color: SellerTheme.textMuted)),
                  ],
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _previewChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
    );
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  Future<void> _handleSave() async {
    setState(() => _saving = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() => _saving = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: const Text('Storefront updated successfully'),
        backgroundColor: SellerTheme.successGreen,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));
    }
  }
}
