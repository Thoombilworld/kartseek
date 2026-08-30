import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_event.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_state.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';

class MarketplaceProductEditScreen extends StatefulWidget {
  final dynamic order;
  final dynamic appointment;
  final dynamic booking;
  const MarketplaceProductEditScreen({super.key, this.order, this.appointment, this.booking});

  @override
  State<MarketplaceProductEditScreen> createState() => _MarketplaceProductEditScreenState();
}

class _MarketplaceProductEditScreenState extends State<MarketplaceProductEditScreen> {
  static const _mp = Color(0xFF6C3FC8);

  final _formKey = GlobalKey<FormState>();
  final _nameCtrl  = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();
  final _minStockCtrl = TextEditingController(text: '5');
  final _skuCtrl   = TextEditingController();
  final _originCtrl = TextEditingController();

  String _selectedCategory = 'Electronics';
  String _selectedEmoji    = '📦';
  bool _isActive    = true;
  bool _isFeatured  = false;
  bool _saving      = false;

  static const _categories = [
    'Electronics', 'Fashion', 'Home & Living', 'Sports', 'Books',
    'Home & Kitchen', 'Beauty', 'Outdoor', 'Crafts & Fashion', 'Food & Gifts',
  ];

  static const _emojis = [
    '📦','📱','💻','⌚','🎧','📷','🖨️','🎮','📺','🔌',
    '👗','👟','👖','🧥','🕶️','👒','💍','🎒','👡','🧣',
    '🏠','🛋️','🖼️','🏺','🪔','☕','🍳','🥤','🧹','🛁',
    '⚽','🏀','🏈','🎾','🏏','🎳','🎿','🚴','🤿','🏋️',
    '📚','📖','✏️','🎨','🎼','🧸','🪆','🧩',
  ];

  @override
  void dispose() {
    _nameCtrl.dispose(); _priceCtrl.dispose(); _stockCtrl.dispose();
    _minStockCtrl.dispose(); _skuCtrl.dispose(); _originCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return BlocListener<MarketplaceSellerBloc, MarketplaceSellerState>(
      listenWhen: (p, c) => c.actionMessage != p.actionMessage,
      listener: (ctx, state) {
        if (state.actionMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.actionMessage!),
            backgroundColor: state.actionSuccess ? SellerTheme.successGreen : SellerTheme.errorRed,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ));
          if (state.actionSuccess) Navigator.pop(context);
        }
      },
      child: Scaffold(
        backgroundColor: SellerTheme.surface,
        appBar: AppBar(
          backgroundColor: _mp,
          foregroundColor: Colors.white,
          elevation: 0,
          title: Text('Add Product · ${ss.country.flag}', style: const TextStyle(fontWeight: FontWeight.bold)),
          actions: [
            if (_saving)
              const Padding(
                padding: EdgeInsets.only(right: 16),
                child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
              )
            else
              TextButton(
                onPressed: _save,
                child: const Text('Save', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              ),
          ],
        ),
        body: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Preview card
              _buildPreviewCard(ss.country.currencySymbol),
              const SizedBox(height: 20),
              // Basic info
              _section('Basic Information', [
                _field(_nameCtrl, 'Product Name', required: true, hint: 'e.g. Samsung Galaxy S24'),
                const SizedBox(height: 12),
                _field(_skuCtrl, 'SKU (optional)', hint: 'e.g. SGS24-256-BLK'),
                const SizedBox(height: 12),
                _field(_originCtrl, 'Origin / Brand', hint: 'e.g. South Korea · Samsung'),
              ]),
              const SizedBox(height: 16),
              // Category + emoji
              _section('Category & Icon', [
                // Emoji picker
                const Text('Icon Emoji', style: TextStyle(fontWeight: FontWeight.w600, color: SellerTheme.textSecondary, fontSize: 12)),
                const SizedBox(height: 8),
                SizedBox(
                  height: 56,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _emojis.length,
                    itemBuilder: (ctx, i) {
                      final e = _emojis[i];
                      final active = _selectedEmoji == e;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedEmoji = e),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          margin: const EdgeInsets.only(right: 6),
                          width: 48, height: 48,
                          decoration: BoxDecoration(
                            color: active ? _mp.withValues(alpha: 0.12) : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: active ? _mp : SellerTheme.border, width: active ? 2 : 1),
                          ),
                          child: Center(child: Text(e, style: const TextStyle(fontSize: 22))),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 14),
                // Category
                const Text('Category', style: TextStyle(fontWeight: FontWeight.w600, color: SellerTheme.textSecondary, fontSize: 12)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8, runSpacing: 8,
                  children: _categories.map((cat) {
                    final active = _selectedCategory == cat;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedCategory = cat),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                        decoration: BoxDecoration(
                          color: active ? _mp : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: active ? _mp : SellerTheme.border),
                        ),
                        child: Text(cat, style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600,
                          color: active ? Colors.white : SellerTheme.textMuted,
                        )),
                      ),
                    );
                  }).toList(),
                ),
              ]),
              const SizedBox(height: 16),
              // Pricing & Stock
              _section('Pricing & Stock', [
                Row(children: [
                  Expanded(child: _field(_priceCtrl, 'Price (${ss.country.currencySymbol})',
                      required: true, keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      hint: '0.00')),
                  const SizedBox(width: 12),
                  Expanded(child: _field(_stockCtrl, 'Stock Qty',
                      required: true, keyboardType: TextInputType.number, hint: '0')),
                ]),
                const SizedBox(height: 12),
                _field(_minStockCtrl, 'Min Stock Alert', keyboardType: TextInputType.number, hint: '5'),
              ]),
              const SizedBox(height: 16),
              // Visibility
              _section('Visibility', [
                _switchRow('Active — visible to customers', _isActive, (v) => setState(() => _isActive = v)),
                const Divider(height: 24),
                _switchRow('Featured — shown in promotions ⭐', _isFeatured, (v) => setState(() => _isFeatured = v)),
              ]),
              const SizedBox(height: 24),
              // Save button
              SizedBox(
                height: 52,
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _mp, foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 2,
                  ),
                  child: _saving
                      ? const SizedBox(width: 20, height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Add Product', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPreviewCard(String currency) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      gradient: const LinearGradient(colors: [Color(0xFF6C3FC8), Color(0xFF9B59F5)], begin: Alignment.topLeft, end: Alignment.bottomRight),
      borderRadius: BorderRadius.circular(16),
    ),
    child: Row(children: [
      Container(
        width: 56, height: 56,
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(14)),
        child: Center(child: Text(_selectedEmoji, style: const TextStyle(fontSize: 28))),
      ),
      const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(
          _nameCtrl.text.isEmpty ? 'Product Name Preview' : _nameCtrl.text,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
          maxLines: 1, overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 4),
        Text(_selectedCategory, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        Text(
          _priceCtrl.text.isEmpty ? '$currency 0.00' : '$currency ${_priceCtrl.text}',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18),
        ),
      ])),
      Column(children: [
        if (_isFeatured) const Text('⭐', style: TextStyle(fontSize: 18)),
        if (_isActive)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: const Color(0xFF4ADE80), borderRadius: BorderRadius.circular(8)),
            child: const Text('Active', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
          )
        else
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(8)),
            child: const Text('Inactive', style: TextStyle(color: Colors.white, fontSize: 10)),
          ),
      ]),
    ]),
  );

  Widget _section(String title, List<Widget> children) => Container(
    padding: const EdgeInsets.all(16),
    decoration: SellerTheme.elevatedCard(),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
      const SizedBox(height: 14),
      ...children,
    ]),
  );

  Widget _field(TextEditingController ctrl, String label, {
    bool required = false,
    String? hint,
    TextInputType keyboardType = TextInputType.text,
  }) => TextFormField(
    controller: ctrl,
    keyboardType: keyboardType,
    onChanged: (_) => setState(() {}), // update preview
    decoration: InputDecoration(
      labelText: label,
      hintText: hint,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      isDense: true,
    ),
    validator: required
        ? (v) => (v == null || v.trim().isEmpty) ? 'Required' : null
        : null,
  );

  Widget _switchRow(String label, bool value, ValueChanged<bool> onChanged) => Row(children: [
    Expanded(child: Text(label, style: const TextStyle(fontSize: 13, color: SellerTheme.textSecondary))),
    Switch(value: value, onChanged: onChanged, activeTrackColor: _mp),
  ]);

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final price = double.tryParse(_priceCtrl.text) ?? 0;
    final stock = int.tryParse(_stockCtrl.text)    ?? 0;
    final minStock = int.tryParse(_minStockCtrl.text) ?? 5;

    final product = MarketplaceProduct(
      id:       'p_${DateTime.now().millisecondsSinceEpoch}',
      name:     _nameCtrl.text.trim(),
      emoji:    _selectedEmoji,
      category: _selectedCategory,
      price:    price,
      stock:    stock,
      minStock: minStock,
      isActive:   _isActive,
      isFeatured: _isFeatured,
      sku:     _skuCtrl.text.trim().isEmpty ? null : _skuCtrl.text.trim(),
      origin:  _originCtrl.text.trim().isEmpty ? null : _originCtrl.text.trim(),
    );

    context.read<MarketplaceSellerBloc>().add(AddMarketplaceProduct(product));
    setState(() => _saving = false);
  }
}
