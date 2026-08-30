import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/widgets/offline_banner.dart';
import 'package:kartseek_seller/features/shared/services/seller_api_service.dart';

/// Add Product — Amazon/Flipkart-style step-by-step product listing flow.
///
/// 7-step wizard with per-step validation, Save as Draft, animated transitions,
/// and a Review & Confirm step before publishing.
class MarketplaceAddProductScreen extends StatefulWidget {
  const MarketplaceAddProductScreen({super.key});

  @override
  State<MarketplaceAddProductScreen> createState() =>
      _MarketplaceAddProductScreenState();
}

class _MarketplaceAddProductScreenState
    extends State<MarketplaceAddProductScreen>
    with SingleTickerProviderStateMixin {
  static const _mp = Color(0xFF6C3FC8);
  static const _totalSteps = 7;

  int _currentStep = 0;
  int _prevStep = 0;
  bool _saving = false;
  bool _draftSaving = false;

  // Per-step form keys for scoped validation
  final List<GlobalKey<FormState>> _formKeys =
      List.generate(_totalSteps, (_) => GlobalKey<FormState>());

  // Track which steps have been visited / validated
  final List<bool> _stepCompleted = List.filled(_totalSteps, false);
  final List<bool?> _stepValid = List.filled(_totalSteps, null); // null = not checked

  // ── Step 1: Product Identity ───────────────────────────────────────────────
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _brandCtrl = TextEditingController();
  final _originCtrl = TextEditingController();
  final _manufacturerCtrl = TextEditingController();
  String _selectedCategory = 'Electronics';
  String _selectedSubcategory = 'Smartphones';
  String _productCondition = 'New';
  String _listingType = 'Simple';
  final List<TextEditingController> _keyFeatureCtrls =
      List.generate(5, (_) => TextEditingController());

  // ── Step 2: Pricing & Tax ──────────────────────────────────────────────────
  final _priceCtrl = TextEditingController();
  final _mrpCtrl = TextEditingController();
  final _skuCtrl = TextEditingController();
  final _hsnCtrl = TextEditingController();
  double _taxRate = 18.0;

  // ── Step 3: Inventory & Shipping ───────────────────────────────────────────
  final _stockCtrl = TextEditingController(text: '100');
  final _minStockCtrl = TextEditingController(text: '10');
  final _weightCtrl = TextEditingController();
  final _dimensionsCtrl = TextEditingController();
  String _shippingClass = 'standard';
  bool _isReturnable = true;
  final _returnWindowCtrl = TextEditingController(text: '7');
  String _warrantyType = 'Manufacturer';
  final _warrantyDurationCtrl = TextEditingController();

  // ── Step 4: Images & Media ─────────────────────────────────────────────────
  final List<String> _imageUrls = [];

  // ── Step 5: Variants ───────────────────────────────────────────────────────
  final List<_VariantEntry> _variants = [];

  // ── Step 6: SEO & Discoverability ──────────────────────────────────────────
  final _seoTitleCtrl = TextEditingController();
  final _seoDescCtrl = TextEditingController();
  final _slugCtrl = TextEditingController();
  final _searchKeywordsCtrl = TextEditingController();

  static const _categories = <String, List<String>>{
    'Electronics': [
      'Smartphones',
      'Laptops',
      'Audio',
      'Cameras',
      'Accessories'
    ],
    'Fashion': ['Men', 'Women', 'Kids', 'Footwear', 'Accessories'],
    'Home & Living': ['Furniture', 'Kitchen', 'Décor', 'Bedding', 'Storage'],
    'Beauty': ['Skincare', 'Makeup', 'Fragrance', 'Hair Care', 'Tools'],
    'Sports': [
      'Fitness',
      'Outdoor',
      'Team Sports',
      'Gym Equipment',
      'Cycling'
    ],
  };

  static const _stepLabels = [
    'Identity',
    'Pricing',
    'Stock',
    'Images',
    'Variants',
    'SEO',
    'Review',
  ];

  static const _stepIcons = [
    Icons.info_outline,
    Icons.attach_money,
    Icons.inventory_2,
    Icons.image,
    Icons.style,
    Icons.search,
    Icons.rate_review,
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _brandCtrl.dispose();
    _originCtrl.dispose();
    _manufacturerCtrl.dispose();
    for (final c in _keyFeatureCtrls) {
      c.dispose();
    }
    _priceCtrl.dispose();
    _mrpCtrl.dispose();
    _skuCtrl.dispose();
    _hsnCtrl.dispose();
    _stockCtrl.dispose();
    _minStockCtrl.dispose();
    _weightCtrl.dispose();
    _dimensionsCtrl.dispose();
    _returnWindowCtrl.dispose();
    _warrantyDurationCtrl.dispose();
    _seoTitleCtrl.dispose();
    _seoDescCtrl.dispose();
    _slugCtrl.dispose();
    _searchKeywordsCtrl.dispose();
    super.dispose();
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────

  bool _validateCurrentStep() {
    // Review step (6) has no form to validate
    if (_currentStep == 6) return true;
    // Variants step (4) has no form — it's a list builder
    if (_currentStep == 4) return true;
    // Images step (3) — just check at least 1 image
    if (_currentStep == 3) {
      if (_imageUrls.isEmpty) {
        _showError('Please add at least one product image');
        return false;
      }
      return true;
    }
    final formKey = _formKeys[_currentStep];
    if (formKey.currentState == null) return true;
    final valid = formKey.currentState!.validate();
    setState(() => _stepValid[_currentStep] = valid);
    if (!valid) {
      _showError('Please fill in all required fields');
    }
    return valid;
  }

  void _goNext() {
    if (!_validateCurrentStep()) return;
    setState(() {
      _stepCompleted[_currentStep] = true;
      _stepValid[_currentStep] = true;
      _prevStep = _currentStep;
      _currentStep++;
    });
  }

  void _goBack() {
    setState(() {
      _prevStep = _currentStep;
      _currentStep--;
    });
  }

  void _jumpToStep(int step) {
    // Only allow jumping to completed steps or the next step
    if (step <= _currentStep || _stepCompleted[step] || step == _currentStep + 1) {
      if (step > _currentStep && !_validateCurrentStep()) return;
      setState(() {
        if (step > _currentStep) _stepCompleted[_currentStep] = true;
        _prevStep = _currentStep;
        _currentStep = step;
      });
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: SellerTheme.errorRed,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final ss = context.read<SellerBloc>().state;

    return Scaffold(
      backgroundColor: SellerTheme.surface,
      appBar: AppBar(
        backgroundColor: _mp,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text('Add Product · ${ss.country.flag}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (_currentStep == 6)
            TextButton.icon(
              onPressed: _saving ? null : _handlePublish,
              icon: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.publish, color: Colors.white, size: 20),
              label: const Text('Publish',
                  style: TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          _buildStepIndicator(),
          _buildProgressBar(),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 350),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              transitionBuilder: (child, animation) {
                final goingForward = _currentStep >= _prevStep;
                final offset = goingForward
                    ? Tween<Offset>(
                        begin: const Offset(1.0, 0.0), end: Offset.zero)
                    : Tween<Offset>(
                        begin: const Offset(-1.0, 0.0), end: Offset.zero);
                return SlideTransition(
                  position: offset.animate(animation),
                  child: FadeTransition(opacity: animation, child: child),
                );
              },
              child: KeyedSubtree(
                key: ValueKey<int>(_currentStep),
                child: ListView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_currentStep == 0) _buildProductIdentityStep(),
                    if (_currentStep == 1) _buildPricingStep(ss),
                    if (_currentStep == 2) _buildInventoryStep(),
                    if (_currentStep == 3) _buildImagesStep(),
                    if (_currentStep == 4) _buildVariantsStep(),
                    if (_currentStep == 5) _buildSeoStep(),
                    if (_currentStep == 6) _buildReviewStep(),
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  // ── Step Indicator ─────────────────────────────────────────────────────────

  Widget _buildStepIndicator() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      child: Row(
        children: List.generate(_totalSteps * 2 - 1, (index) {
          if (index.isOdd) {
            // Connector line between steps
            final stepBefore = index ~/ 2;
            final active = stepBefore < _currentStep;
            return Expanded(
              child: Container(
                height: 2.5,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                  gradient: active
                      ? const LinearGradient(
                          colors: [_mp, Color(0xFF9B59F5)])
                      : null,
                  color: active ? null : const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }

          final i = index ~/ 2;
          final isActive = i == _currentStep;
          final isCompleted = i < _currentStep || _stepCompleted[i];
          final hasError = _stepValid[i] == false;

          return GestureDetector(
            onTap: () => _jumpToStep(i),
            child: SizedBox(
              width: 44,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    width: isActive ? 32 : 26,
                    height: isActive ? 32 : 26,
                    decoration: BoxDecoration(
                      gradient: isActive || isCompleted
                          ? const LinearGradient(
                              colors: [_mp, Color(0xFF9B59F5)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight)
                          : null,
                      color: isActive || isCompleted
                          ? null
                          : hasError
                              ? SellerTheme.errorRed.withValues(alpha: 0.15)
                              : const Color(0xFFE5E7EB),
                      shape: BoxShape.circle,
                      boxShadow: isActive
                          ? [
                              BoxShadow(
                                  color: _mp.withValues(alpha: 0.35),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2))
                            ]
                          : null,
                    ),
                    child: Center(
                      child: isCompleted && !isActive
                          ? const Icon(Icons.check,
                              color: Colors.white, size: 14)
                          : hasError && !isActive
                              ? const Icon(Icons.priority_high,
                                  color: SellerTheme.errorRed, size: 14)
                              : Icon(
                                  _stepIcons[i],
                                  color: isActive || isCompleted
                                      ? Colors.white
                                      : SellerTheme.textMuted,
                                  size: isActive ? 16 : 13,
                                ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _stepLabels[i],
                    style: TextStyle(
                      fontSize: isActive ? 9 : 8,
                      fontWeight:
                          isActive ? FontWeight.w700 : FontWeight.w500,
                      color: isActive
                          ? _mp
                          : isCompleted
                              ? SellerTheme.textSecondary
                              : SellerTheme.textMuted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildProgressBar() {
    final progress = (_currentStep + 1) / _totalSteps;
    final percent = (progress * 100).toInt();
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Step ${_currentStep + 1} of $_totalSteps',
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: SellerTheme.textSecondary),
              ),
              Text(
                '$percent% complete',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: _mp.withValues(alpha: 0.8)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 4,
              backgroundColor: const Color(0xFFE5E7EB),
              valueColor:
                  const AlwaysStoppedAnimation<Color>(Color(0xFF9B59F5)),
            ),
          ),
        ],
      ),
    );
  }

  // ── Step 1: Product Identity ───────────────────────────────────────────────

  Widget _buildProductIdentityStep() {
    return Form(
      key: _formKeys[0],
      child: Column(
        children: [
          _section('Product Identity', Icons.info_outline, [
            _field('Product Name *', _nameCtrl, Icons.label,
                hint: 'iPhone 16 Pro Max 256GB',
                validator: _requiredValidator('Product name is required')),
            const SizedBox(height: 14),
            _field('Brand *', _brandCtrl, Icons.branding_watermark,
                hint: 'Apple',
                validator: _requiredValidator('Brand is required')),
            const SizedBox(height: 14),
            _dropdown(
                'Category', _selectedCategory, _categories.keys.toList(),
                (v) {
              setState(() {
                _selectedCategory = v!;
                _selectedSubcategory = _categories[v]!.first;
              });
            }),
            const SizedBox(height: 14),
            _dropdown('Subcategory', _selectedSubcategory,
                _categories[_selectedCategory] ?? [], (v) {
              setState(() => _selectedSubcategory = v!);
            }),
          ]),
          const SizedBox(height: 16),
          _section('Product Condition & Type', Icons.new_releases_outlined, [
            _segmentedField<String>(
              'Condition *',
              _productCondition,
              {'New': Icons.fiber_new, 'Refurbished': Icons.refresh, 'Used': Icons.recycling},
              (v) => setState(() => _productCondition = v),
            ),
            const SizedBox(height: 14),
            _segmentedField<String>(
              'Listing Type',
              _listingType,
              {'Simple': Icons.widgets, 'Bundle': Icons.inventory, 'Digital': Icons.cloud_download},
              (v) => setState(() => _listingType = v),
            ),
          ]),
          const SizedBox(height: 16),
          _section('Origin & Manufacturer', Icons.factory_outlined, [
            _field(
                'Country of Origin *', _originCtrl, Icons.public,
                hint: 'India',
                validator: _requiredValidator('Country of origin is required')),
            const SizedBox(height: 14),
            _field('Manufacturer / Packer / Importer', _manufacturerCtrl,
                Icons.business,
                hint: 'Apple India Pvt. Ltd.'),
          ]),
          const SizedBox(height: 16),
          _section('Description & Key Features', Icons.description, [
            _field('Description *', _descCtrl, Icons.description,
                maxLines: 5,
                hint: 'Detailed product description...',
                validator: _requiredValidator('Description is required')),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _mp.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _mp.withValues(alpha: 0.15)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.auto_awesome,
                          size: 16, color: _mp.withValues(alpha: 0.7)),
                      const SizedBox(width: 6),
                      const Text('Key Features',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: SellerTheme.textPrimary)),
                      const Spacer(),
                      const Text('Up to 5 bullet points',
                          style: TextStyle(
                              fontSize: 11,
                              color: SellerTheme.textMuted)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ...List.generate(5, (i) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: _mp.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text('${i + 1}',
                                style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: _mp)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _keyFeatureCtrls[i],
                            style: const TextStyle(fontSize: 13),
                            decoration: InputDecoration(
                              hintText: 'Feature ${i + 1}',
                              hintStyle: const TextStyle(
                                  color: SellerTheme.textMuted,
                                  fontSize: 12),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 10),
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(
                                      color: SellerTheme.border)),
                              enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(
                                      color: SellerTheme.border)),
                              focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(
                                      color: _mp, width: 1.5)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )),
                ],
              ),
            ),
          ]),
        ],
      ),
    );
  }

  // ── Step 2: Pricing & Tax ──────────────────────────────────────────────────

  Widget _buildPricingStep(dynamic ss) {
    return Form(
      key: _formKeys[1],
      child: _section('Pricing & Tax', Icons.attach_money, [
        _field('Selling Price *', _priceCtrl, Icons.sell,
            hint: '5,999',
            inputType: TextInputType.number,
            validator: _requiredValidator('Selling price is required')),
        const SizedBox(height: 14),
        _field('MRP (Original Price)', _mrpCtrl, Icons.money,
            hint: '7,999', inputType: TextInputType.number),
        if (_priceCtrl.text.isNotEmpty && _mrpCtrl.text.isNotEmpty) ...[
          const SizedBox(height: 8),
          _discountPreview(),
        ],
        const SizedBox(height: 14),
        _field('SKU *', _skuCtrl, Icons.qr_code,
            hint: 'SKU-ELEC-IP16-256',
            validator: _requiredValidator('SKU is required')),
        const SizedBox(height: 14),
        _field('HSN Code', _hsnCtrl, Icons.numbers, hint: '85171300'),
        const SizedBox(height: 18),
        Row(
          children: [
            const Text('Tax Rate (GST)',
                style:
                    TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const Spacer(),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: _mp.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('${_taxRate.toStringAsFixed(0)}%',
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: _mp)),
            ),
          ],
        ),
        Slider(
          value: _taxRate,
          min: 0,
          max: 30,
          divisions: 6,
          activeColor: _mp,
          onChanged: (v) => setState(() => _taxRate = v),
        ),
      ]),
    );
  }

  Widget _discountPreview() {
    final price = double.tryParse(_priceCtrl.text) ?? 0;
    final mrp = double.tryParse(_mrpCtrl.text) ?? 0;
    if (mrp <= 0 || price <= 0 || price >= mrp) return const SizedBox.shrink();
    final discount = ((mrp - price) / mrp * 100).toStringAsFixed(1);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: SellerTheme.successGreen.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: SellerTheme.successGreen.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.local_offer,
              size: 16, color: SellerTheme.successGreen),
          const SizedBox(width: 8),
          Text('$discount% discount',
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: SellerTheme.successGreen)),
          const Spacer(),
          Text('Save ₹${(mrp - price).toStringAsFixed(0)}',
              style: const TextStyle(
                  fontSize: 12, color: SellerTheme.successGreen)),
        ],
      ),
    );
  }

  // ── Step 3: Inventory & Shipping ───────────────────────────────────────────

  Widget _buildInventoryStep() {
    return Form(
      key: _formKeys[2],
      child: Column(
        children: [
          _section('Inventory & Shipping', Icons.inventory_2, [
            _field('Stock Quantity *', _stockCtrl, Icons.inventory,
                inputType: TextInputType.number,
                validator: _requiredValidator('Stock quantity is required')),
            const SizedBox(height: 14),
            _field(
                'Low Stock Alert Threshold',
                _minStockCtrl,
                Icons.warning_amber,
                inputType: TextInputType.number),
            const SizedBox(height: 14),
            _field('Weight (kg)', _weightCtrl, Icons.scale,
                inputType: TextInputType.number, hint: '0.5'),
            const SizedBox(height: 14),
            _field(
                'Dimensions (L × W × H cm)',
                _dimensionsCtrl,
                Icons.straighten,
                hint: '15 × 8 × 2'),
            const SizedBox(height: 14),
            _dropdown('Shipping Class', _shippingClass,
                ['standard', 'express', 'heavy', 'fragile'], (v) {
              setState(() => _shippingClass = v!);
            }),
          ]),
          const SizedBox(height: 16),
          _section('Return Policy', Icons.assignment_return, [
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
              ),
              child: SwitchListTile(
                value: _isReturnable,
                onChanged: (v) => setState(() => _isReturnable = v),
                title: const Text('Returnable',
                    style:
                        TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: Text(
                    _isReturnable
                        ? 'Customers can return this product'
                        : 'No returns accepted',
                    style: const TextStyle(
                        fontSize: 12, color: SellerTheme.textMuted)),
                activeThumbColor: _mp,
                contentPadding: EdgeInsets.zero,
                dense: true,
              ),
            ),
            if (_isReturnable) ...[
              const SizedBox(height: 12),
              _field('Return Window (days)', _returnWindowCtrl,
                  Icons.calendar_today,
                  inputType: TextInputType.number, hint: '7'),
            ],
          ]),
          const SizedBox(height: 16),
          _section('Warranty', Icons.verified_user, [
            _dropdown('Warranty Type', _warrantyType,
                ['No Warranty', 'Manufacturer', 'Seller', 'Brand'], (v) {
              setState(() => _warrantyType = v!);
            }),
            if (_warrantyType != 'No Warranty') ...[
              const SizedBox(height: 14),
              _field('Warranty Duration', _warrantyDurationCtrl,
                  Icons.timer,
                  hint: '1 Year'),
            ],
          ]),
        ],
      ),
    );
  }

  // ── Step 4: Images & Media ─────────────────────────────────────────────────

  Widget _buildImagesStep() {
    return _section('Images & Media', Icons.image, [
      // Image guidelines banner
      Container(
        padding: const EdgeInsets.all(12),
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: SellerTheme.infoBlue.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(12),
          border:
              Border.all(color: SellerTheme.infoBlue.withValues(alpha: 0.2)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.lightbulb_outline,
                size: 18,
                color: SellerTheme.infoBlue.withValues(alpha: 0.8)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Image Guidelines',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: SellerTheme.infoBlue)),
                  const SizedBox(height: 4),
                  Text(
                    '• White background recommended\n'
                    '• Min. resolution: 1000 × 1000 px\n'
                    '• First image is the main listing image\n'
                    '• No watermarks, logos, or text overlays',
                    style: TextStyle(
                        fontSize: 11,
                        height: 1.5,
                        color:
                            SellerTheme.textSecondary.withValues(alpha: 0.9)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      // Upload area
      GestureDetector(
        onTap: () => setState(
            () => _imageUrls.add('placeholder_${_imageUrls.length + 1}')),
        child: Container(
          height: 160,
          decoration: BoxDecoration(
            color: _mp.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
                color: _mp.withValues(alpha: 0.3),
                width: 2,
                strokeAlign: BorderSide.strokeAlignInside),
          ),
          child:
              Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.cloud_upload_outlined,
                size: 40, color: _mp.withValues(alpha: 0.5)),
            const SizedBox(height: 8),
            Text('Tap to upload images',
                style: TextStyle(
                    color: _mp.withValues(alpha: 0.7),
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            const Text('PNG, JPG up to 5MB · Max 8 images',
                style: TextStyle(
                    fontSize: 12, color: SellerTheme.textMuted)),
          ]),
        ),
      ),
      if (_imageUrls.isNotEmpty) ...[
        const SizedBox(height: 12),
        SizedBox(
          height: 90,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _imageUrls.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) => Stack(
              children: [
                Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                        color: _mp.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: i == 0
                            ? Border.all(color: _mp, width: 2)
                            : null),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.image,
                            color: _mp.withValues(alpha: 0.4)),
                        if (i == 0)
                          Container(
                            margin: const EdgeInsets.only(top: 4),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: _mp,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text('MAIN',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 8,
                                    fontWeight: FontWeight.w700)),
                          ),
                      ],
                    )),
                Positioned(
                    right: 2,
                    top: 2,
                    child: GestureDetector(
                      onTap: () =>
                          setState(() => _imageUrls.removeAt(i)),
                      child: Container(
                          width: 20,
                          height: 20,
                          decoration: const BoxDecoration(
                              color: SellerTheme.errorRed,
                              shape: BoxShape.circle),
                          child: const Icon(Icons.close,
                              color: Colors.white, size: 12)),
                    )),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text('${_imageUrls.length}/8 images uploaded',
            style: const TextStyle(
                fontSize: 12,
                color: SellerTheme.textMuted,
                fontWeight: FontWeight.w500)),
      ],
    ]);
  }

  // ── Step 5: Variants ───────────────────────────────────────────────────────

  Widget _buildVariantsStep() {
    return _section('Product Variants', Icons.style, [
      if (_variants.isEmpty)
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
              color: SellerTheme.surface,
              borderRadius: BorderRadius.circular(12)),
          child: const Column(children: [
            Icon(Icons.style_outlined,
                size: 40, color: SellerTheme.textMuted),
            SizedBox(height: 8),
            Text('No variants added',
                style: TextStyle(color: SellerTheme.textMuted)),
            SizedBox(height: 4),
            Text('Add sizes, colors, or models',
                style:
                    TextStyle(fontSize: 12, color: SellerTheme.textMuted)),
          ]),
        ),
      ..._variants.asMap().entries.map((e) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: SellerTheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: SellerTheme.border)),
            child: Row(children: [
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('${e.value.type}: ${e.value.value}',
                        style:
                            const TextStyle(fontWeight: FontWeight.w600)),
                    Text(
                        'Price: ${e.value.price} · Stock: ${e.value.stock}',
                        style: const TextStyle(
                            fontSize: 12, color: SellerTheme.textMuted)),
                  ])),
              IconButton(
                  icon: const Icon(Icons.delete_outline,
                      size: 20, color: SellerTheme.errorRed),
                  onPressed: () =>
                      setState(() => _variants.removeAt(e.key))),
            ]),
          )),
      const SizedBox(height: 8),
      OutlinedButton.icon(
        onPressed: _showAddVariantDialog,
        icon: const Icon(Icons.add, size: 18),
        label: const Text('Add Variant'),
        style: OutlinedButton.styleFrom(
            foregroundColor: _mp,
            side: const BorderSide(color: _mp),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12))),
      ),
    ]);
  }

  // ── Step 6: SEO & Discoverability ──────────────────────────────────────────

  Widget _buildSeoStep() {
    return Form(
      key: _formKeys[5],
      child: _section('SEO & Discoverability', Icons.search, [
        _field('SEO Title', _seoTitleCtrl, Icons.title,
            hint: 'Product title for search engines'),
        const SizedBox(height: 14),
        _field('SEO Description', _seoDescCtrl, Icons.description,
            maxLines: 3, hint: 'Meta description for search results'),
        const SizedBox(height: 14),
        _field('URL Slug', _slugCtrl, Icons.link,
            hint: 'iphone-16-pro-max-256gb'),
        const SizedBox(height: 14),
        _field('Search Keywords / Tags', _searchKeywordsCtrl, Icons.tag,
            hint: 'smartphone, iphone, apple, mobile phone',
            maxLines: 2),
        const SizedBox(height: 8),
        Text(
          'Separate keywords with commas. These help customers find your product in search.',
          style: TextStyle(
              fontSize: 11,
              color: SellerTheme.textMuted.withValues(alpha: 0.8)),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
              color: SellerTheme.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: SellerTheme.border)),
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.preview,
                        size: 14, color: SellerTheme.textMuted),
                    SizedBox(width: 6),
                    Text('Search Preview',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: SellerTheme.textMuted)),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                    _seoTitleCtrl.text.isEmpty
                        ? 'Product Title'
                        : _seoTitleCtrl.text,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1A0DAB))),
                const SizedBox(height: 2),
                Text(
                    'kartseek.com/marketplace/${_slugCtrl.text.isEmpty ? 'product-slug' : _slugCtrl.text}',
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFF006621))),
                const SizedBox(height: 4),
                Text(
                    _seoDescCtrl.text.isEmpty
                        ? 'Meta description will appear here...'
                        : _seoDescCtrl.text,
                    style: const TextStyle(
                        fontSize: 13, color: SellerTheme.textSecondary),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
              ]),
        ),
      ]),
    );
  }

  // ── Step 7: Review & Confirm ───────────────────────────────────────────────

  Widget _buildReviewStep() {
    return Column(
      children: [
        // Completion checklist
        _buildCompletionChecklist(),
        const SizedBox(height: 16),
        // Product Identity summary
        _reviewCard(
          'Product Identity',
          Icons.info_outline,
          0,
          [
            _reviewRow('Name', _nameCtrl.text),
            _reviewRow('Brand', _brandCtrl.text),
            _reviewRow('Category',
                '$_selectedCategory > $_selectedSubcategory'),
            _reviewRow('Condition', _productCondition),
            _reviewRow('Listing Type', _listingType),
            _reviewRow('Country of Origin', _originCtrl.text),
            if (_manufacturerCtrl.text.isNotEmpty)
              _reviewRow('Manufacturer', _manufacturerCtrl.text),
            ..._keyFeatureCtrls
                .where((c) => c.text.isNotEmpty)
                .map((c) => _reviewRow('• Feature', c.text)),
          ],
        ),
        const SizedBox(height: 12),
        // Pricing summary
        _reviewCard(
          'Pricing & Tax',
          Icons.attach_money,
          1,
          [
            _reviewRow('Selling Price', '₹${_priceCtrl.text}'),
            if (_mrpCtrl.text.isNotEmpty)
              _reviewRow('MRP', '₹${_mrpCtrl.text}'),
            _reviewRow('SKU', _skuCtrl.text),
            if (_hsnCtrl.text.isNotEmpty)
              _reviewRow('HSN Code', _hsnCtrl.text),
            _reviewRow('Tax Rate', '${_taxRate.toStringAsFixed(0)}%'),
          ],
        ),
        const SizedBox(height: 12),
        // Inventory summary
        _reviewCard(
          'Inventory & Shipping',
          Icons.inventory_2,
          2,
          [
            _reviewRow('Stock', _stockCtrl.text),
            _reviewRow('Low Stock Alert', _minStockCtrl.text),
            if (_weightCtrl.text.isNotEmpty)
              _reviewRow('Weight', '${_weightCtrl.text} kg'),
            if (_dimensionsCtrl.text.isNotEmpty)
              _reviewRow('Dimensions', _dimensionsCtrl.text),
            _reviewRow('Shipping', _shippingClass),
            _reviewRow('Returnable', _isReturnable ? 'Yes' : 'No'),
            if (_isReturnable)
              _reviewRow(
                  'Return Window', '${_returnWindowCtrl.text} days'),
            _reviewRow('Warranty', _warrantyType),
            if (_warrantyType != 'No Warranty' &&
                _warrantyDurationCtrl.text.isNotEmpty)
              _reviewRow('Warranty Duration', _warrantyDurationCtrl.text),
          ],
        ),
        const SizedBox(height: 12),
        // Images summary
        _reviewCard(
          'Images & Media',
          Icons.image,
          3,
          [
            _reviewRow(
                'Images Uploaded', '${_imageUrls.length} image(s)'),
          ],
        ),
        const SizedBox(height: 12),
        // Variants summary
        _reviewCard(
          'Product Variants',
          Icons.style,
          4,
          _variants.isEmpty
              ? [_reviewRow('Variants', 'None added')]
              : _variants
                  .map((v) => _reviewRow(
                      '${v.type}: ${v.value}',
                      'Price: ${v.price} · Stock: ${v.stock}'))
                  .toList(),
        ),
        const SizedBox(height: 12),
        // SEO summary
        _reviewCard(
          'SEO & Discoverability',
          Icons.search,
          5,
          [
            _reviewRow('SEO Title',
                _seoTitleCtrl.text.isEmpty ? '—' : _seoTitleCtrl.text),
            _reviewRow(
                'Slug',
                _slugCtrl.text.isEmpty ? '—' : _slugCtrl.text),
            if (_searchKeywordsCtrl.text.isNotEmpty)
              _reviewRow('Keywords', _searchKeywordsCtrl.text),
          ],
        ),
      ],
    );
  }

  Widget _buildCompletionChecklist() {
    final sections = [
      _CheckItem('Product Identity', _nameCtrl.text.isNotEmpty && _brandCtrl.text.isNotEmpty && _originCtrl.text.isNotEmpty && _descCtrl.text.isNotEmpty),
      _CheckItem('Pricing & Tax', _priceCtrl.text.isNotEmpty && _skuCtrl.text.isNotEmpty),
      _CheckItem('Inventory & Shipping', _stockCtrl.text.isNotEmpty),
      _CheckItem('Images & Media', _imageUrls.isNotEmpty),
      const _CheckItem('Variants', true), // Optional
      const _CheckItem('SEO', true), // Optional
    ];
    final complete = sections.where((s) => s.ok).length;
    final total = sections.length;
    final allGood = complete == total;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: allGood
            ? LinearGradient(
                colors: [
                  SellerTheme.successGreen.withValues(alpha: 0.08),
                  SellerTheme.successGreen.withValues(alpha: 0.03),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : LinearGradient(
                colors: [
                  SellerTheme.warningAmber.withValues(alpha: 0.08),
                  SellerTheme.warningAmber.withValues(alpha: 0.03),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: allGood
                ? SellerTheme.successGreen.withValues(alpha: 0.3)
                : SellerTheme.warningAmber.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                  allGood
                      ? Icons.check_circle
                      : Icons.warning_amber_rounded,
                  color: allGood
                      ? SellerTheme.successGreen
                      : SellerTheme.warningAmber,
                  size: 20),
              const SizedBox(width: 8),
              Text(
                allGood
                    ? 'Ready to Publish!'
                    : '$complete of $total sections complete',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: allGood
                      ? SellerTheme.successGreen
                      : SellerTheme.warningAmber,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...sections.map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Icon(
                        s.ok
                            ? Icons.check_circle_outline
                            : Icons.radio_button_unchecked,
                        size: 16,
                        color: s.ok
                            ? SellerTheme.successGreen
                            : SellerTheme.textMuted),
                    const SizedBox(width: 8),
                    Text(s.label,
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: s.ok
                                ? SellerTheme.textPrimary
                                : SellerTheme.textMuted,
                            decoration: s.ok
                                ? null
                                : TextDecoration.lineThrough)),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _reviewCard(
      String title, IconData icon, int stepIndex, List<Widget> rows) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: _mp, size: 18),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w700)),
              const Spacer(),
              GestureDetector(
                onTap: () => _jumpToStep(stepIndex),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _mp.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.edit,
                          size: 12, color: _mp.withValues(alpha: 0.8)),
                      const SizedBox(width: 4),
                      Text('Edit',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _mp.withValues(alpha: 0.8))),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: SellerTheme.border),
          const SizedBox(height: 12),
          ...rows,
        ],
      ),
    );
  }

  Widget _reviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 12,
                    color: SellerTheme.textMuted,
                    fontWeight: FontWeight.w500)),
          ),
          Expanded(
            child: Text(
                value.isEmpty ? '—' : value,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: value.isEmpty
                        ? SellerTheme.textMuted
                        : SellerTheme.textPrimary)),
          ),
        ],
      ),
    );
  }

  // ── Bottom Bar ─────────────────────────────────────────────────────────────

  Widget _buildBottomBar() {
    final isLastStep = _currentStep == _totalSteps - 1;
    final isReviewStep = _currentStep == 6;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        border:
            const Border(top: BorderSide(color: SellerTheme.border)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, -2)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              // Back button
              if (_currentStep > 0)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _goBack,
                    icon: const Icon(Icons.arrow_back_ios, size: 14),
                    label: const Text('Back',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: SellerTheme.border),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              if (_currentStep > 0) const SizedBox(width: 10),
              // Save Draft button
              if (!isReviewStep)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _draftSaving ? null : _handleSaveDraft,
                    icon: _draftSaving
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: _mp))
                        : const Icon(Icons.save_outlined,
                            size: 16, color: _mp),
                    label: Text(
                        _draftSaving ? 'Saving...' : 'Save Draft',
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, color: _mp)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: _mp),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              if (!isReviewStep) const SizedBox(width: 10),
              // Next / Publish button
              Expanded(
                flex: isReviewStep ? 3 : 2,
                child: ElevatedButton.icon(
                  onPressed: isLastStep
                      ? (_saving ? null : _handlePublish)
                      : _goNext,
                  icon: isLastStep
                      ? (_saving
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.publish,
                              color: Colors.white, size: 18))
                      : const Icon(Icons.arrow_forward_ios,
                          color: Colors.white, size: 14),
                  label: Text(
                      isLastStep
                          ? (_saving ? 'Publishing...' : 'Publish Product')
                          : 'Next',
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isLastStep
                        ? SellerTheme.successGreen
                        : _mp,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  Widget _section(String title, IconData icon, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: SellerTheme.cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: _mp, size: 20),
          const SizedBox(width: 8),
          Text(title,
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 16),
        ...children,
      ]),
    );
  }

  Widget _field(String label, TextEditingController ctrl, IconData icon,
      {int maxLines = 1,
      String? hint,
      TextInputType? inputType,
      String? Function(String?)? validator}) {
    return TextFormField(
      controller: ctrl,
      maxLines: maxLines,
      keyboardType: inputType,
      validator: validator,
      autovalidateMode: AutovalidateMode.onUserInteraction,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        labelStyle:
            const TextStyle(color: SellerTheme.textSecondary, fontSize: 13),
        hintStyle:
            const TextStyle(color: SellerTheme.textMuted, fontSize: 13),
        prefixIcon: Icon(icon, size: 20, color: SellerTheme.textMuted),
        filled: true,
        fillColor: SellerTheme.surface,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: SellerTheme.border)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: SellerTheme.border)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: _mp, width: 2)),
        errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide:
                const BorderSide(color: SellerTheme.errorRed, width: 1.5)),
        focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide:
                const BorderSide(color: SellerTheme.errorRed, width: 2)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
    );
  }

  Widget _dropdown(String label, String value, List<String> items,
      ValueChanged<String?> onChanged) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      items: items
          .map((e) => DropdownMenuItem(
              value: e,
              child: Text(e, style: const TextStyle(fontSize: 14))))
          .toList(),
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        labelStyle:
            const TextStyle(color: SellerTheme.textSecondary, fontSize: 13),
        filled: true,
        fillColor: SellerTheme.surface,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: SellerTheme.border)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: SellerTheme.border)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: _mp, width: 2)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
    );
  }

  Widget _segmentedField<T>(String label, T currentValue,
      Map<T, IconData> options, ValueChanged<T> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: SellerTheme.textSecondary)),
        const SizedBox(height: 8),
        Row(
          children: options.entries.map((entry) {
            final selected = entry.key == currentValue;
            return Expanded(
              child: GestureDetector(
                onTap: () => onChanged(entry.key),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    gradient: selected
                        ? const LinearGradient(
                            colors: [_mp, Color(0xFF9B59F5)])
                        : null,
                    color: selected ? null : SellerTheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color:
                            selected ? _mp : SellerTheme.border,
                        width: selected ? 0 : 1),
                    boxShadow: selected
                        ? [
                            BoxShadow(
                                color: _mp.withValues(alpha: 0.2),
                                blurRadius: 6,
                                offset: const Offset(0, 2))
                          ]
                        : null,
                  ),
                  child: Column(
                    children: [
                      Icon(entry.value,
                          size: 18,
                          color: selected
                              ? Colors.white
                              : SellerTheme.textMuted),
                      const SizedBox(height: 4),
                      Text(entry.key.toString(),
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: selected
                                  ? Colors.white
                                  : SellerTheme.textSecondary)),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  FormFieldValidator<String> _requiredValidator(String message) {
    return (value) =>
        (value == null || value.trim().isEmpty) ? message : null;
  }

  void _showAddVariantDialog() {
    String type = 'Color';
    String varValue = '';
    String price = '';
    String stock = '';
    showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
          builder: (ctx, setDState) => AlertDialog(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20)),
                title: const Text('Add Variant',
                    style: TextStyle(fontWeight: FontWeight.w700)),
                content: Column(mainAxisSize: MainAxisSize.min, children: [
                  DropdownButtonFormField<String>(
                      initialValue: type,
                      items: ['Color', 'Size', 'Storage', 'Model']
                          .map((e) =>
                              DropdownMenuItem(value: e, child: Text(e)))
                          .toList(),
                      onChanged: (v) => setDState(() => type = v!),
                      decoration: const InputDecoration(
                          labelText: 'Variant Type',
                          border: OutlineInputBorder())),
                  const SizedBox(height: 10),
                  TextField(
                      onChanged: (v) => varValue = v,
                      decoration: const InputDecoration(
                          labelText: 'Value (e.g. Blue)',
                          border: OutlineInputBorder())),
                  const SizedBox(height: 10),
                  TextField(
                      onChanged: (v) => price = v,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                          labelText: 'Price',
                          border: OutlineInputBorder())),
                  const SizedBox(height: 10),
                  TextField(
                      onChanged: (v) => stock = v,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                          labelText: 'Stock',
                          border: OutlineInputBorder())),
                ]),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Cancel')),
                  ElevatedButton(
                    onPressed: () {
                      setState(() => _variants.add(_VariantEntry(
                          type: type,
                          value: varValue,
                          price: price,
                          stock: stock)));
                      Navigator.pop(ctx);
                    },
                    style:
                        ElevatedButton.styleFrom(backgroundColor: _mp),
                    child: const Text('Add',
                        style: TextStyle(color: Colors.white)),
                  ),
                ],
              )),
    );
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  Map<String, dynamic> _collectProductData() {
    return {
      'name': _nameCtrl.text,
      'brand': _brandCtrl.text,
      'category': _selectedCategory,
      'subcategory': _selectedSubcategory,
      'description': _descCtrl.text,
      'condition': _productCondition,
      'listingType': _listingType,
      'countryOfOrigin': _originCtrl.text,
      'manufacturer': _manufacturerCtrl.text,
      'keyFeatures': _keyFeatureCtrls
          .map((c) => c.text)
          .where((t) => t.isNotEmpty)
          .toList(),
      'price': double.tryParse(_priceCtrl.text) ?? 0,
      'mrp': double.tryParse(_mrpCtrl.text),
      'sku': _skuCtrl.text,
      'hsn': _hsnCtrl.text,
      'taxRate': _taxRate,
      'stock': int.tryParse(_stockCtrl.text) ?? 0,
      'minStock': int.tryParse(_minStockCtrl.text) ?? 0,
      'weight': double.tryParse(_weightCtrl.text),
      'dimensions': _dimensionsCtrl.text,
      'shippingClass': _shippingClass,
      'returnable': _isReturnable,
      'returnWindow': _isReturnable
          ? int.tryParse(_returnWindowCtrl.text) ?? 7
          : null,
      'warrantyType': _warrantyType,
      'warrantyDuration': _warrantyType != 'No Warranty'
          ? _warrantyDurationCtrl.text
          : null,
      'images': _imageUrls,
      'variants': _variants
          .map((v) => {
                'type': v.type,
                'value': v.value,
                'price': double.tryParse(v.price) ?? 0,
                'stock': int.tryParse(v.stock) ?? 0,
              })
          .toList(),
      'seoTitle': _seoTitleCtrl.text,
      'seoDescription': _seoDescCtrl.text,
      'slug': _slugCtrl.text,
      'searchKeywords': _searchKeywordsCtrl.text
          .split(',')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList(),
      'sellerId': context.read<SellerBloc>().state.profile?.id ?? '',
    };
  }

  Future<void> _handleSaveDraft() async {
    setState(() => _draftSaving = true);
    final data = _collectProductData();
    data['status'] = 'draft';
    data['currentStep'] = _currentStep;

    final success = await SellerApiService.instance.saveDraft(data);

    setState(() => _draftSaving = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
            success ? 'Draft saved successfully' : 'Failed to save draft'),
        backgroundColor:
            success ? SellerTheme.successGreen : SellerTheme.errorRed,
        behavior: SnackBarBehavior.floating,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));
    }
  }

  Future<void> _handlePublish() async {
    // Validate all required fields before publishing
    if (_nameCtrl.text.isEmpty ||
        _brandCtrl.text.isEmpty ||
        _originCtrl.text.isEmpty ||
        _descCtrl.text.isEmpty) {
      _showError('Please complete the Product Identity section');
      _jumpToStep(0);
      return;
    }
    if (_priceCtrl.text.isEmpty || _skuCtrl.text.isEmpty) {
      _showError('Please complete the Pricing section');
      _jumpToStep(1);
      return;
    }
    if (_stockCtrl.text.isEmpty) {
      _showError('Please complete the Inventory section');
      _jumpToStep(2);
      return;
    }
    if (_imageUrls.isEmpty) {
      _showError('Please add at least one product image');
      _jumpToStep(3);
      return;
    }

    setState(() => _saving = true);
    final productData = _collectProductData();
    final success =
        await SellerApiService.instance.addProduct(productData);

    setState(() => _saving = false);
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('Product submitted for approval'),
          backgroundColor: SellerTheme.successGreen,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12)),
        ));
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('Failed to submit product. Try again.'),
          backgroundColor: SellerTheme.errorRed,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12)),
        ));
      }
    }
  }
}

// ── Models ───────────────────────────────────────────────────────────────────

class _VariantEntry {
  final String type;
  final String value;
  final String price;
  final String stock;
  const _VariantEntry(
      {required this.type,
      required this.value,
      required this.price,
      required this.stock});
}

class _CheckItem {
  final String label;
  final bool ok;
  const _CheckItem(this.label, this.ok);
}
