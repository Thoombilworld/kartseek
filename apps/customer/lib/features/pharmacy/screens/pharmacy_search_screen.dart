import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/widgets/voice_search_sheet.dart';

/// Pharmacy Search — Full-text medicine search with filters.
class PharmacySearchScreen extends StatefulWidget {
  const PharmacySearchScreen({super.key});
  @override State<PharmacySearchScreen> createState() => _PharmacySearchScreenState();
}

class _PharmacySearchScreenState extends State<PharmacySearchScreen> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  String _selectedForm = 'All';
  bool _rxOnly = false;
  final _forms = ['All', 'Tablets', 'Capsules', 'Syrup', 'Cream', 'Drops', 'Injection'];
  final _recentSearches = ['Paracetamol', 'Vitamin D', 'Cough Syrup', 'Metformin', 'Cetirizine'];

  @override
  void initState() {
    super.initState();
    _focus.requestFocus();
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _search(String query) {
    if (query.isNotEmpty) {
      context.read<PharmacyBloc>().add(SearchMedicines(query));
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = RegionService.instance.currentCountry.currencySymbol;
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: Container(
          height: 44,
          decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
          child: TextField(
            controller: _controller, focusNode: _focus,
            onSubmitted: _search,
            onChanged: (v) { if (v.length > 2) _search(v); },
            decoration: InputDecoration(
              hintText: 'Search medicines, brands, generics...',
              hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 14),
              prefixIcon: Icon(Icons.search, color: Colors.grey.shade400, size: 20),
              suffixIcon: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_controller.text.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () {
                        _controller.clear();
                        context.read<PharmacyBloc>().add(const ClearSearchResults());
                        setState(() {});
                      },
                    ),
                  GestureDetector(
                    onTap: () => VoiceSearchSheet.show(
                      context: context,
                      accentColor: AppTheme.pharmacyColor,
                      hintText: 'Try "paracetamol" or "vitamin D"',
                      onResult: (text) {
                        _controller.text = text;
                        _search(text);
                        setState(() {});
                      },
                    ),
                    child: const Padding(
                      padding: EdgeInsets.only(right: 8),
                      child: Icon(Icons.mic_none_rounded,
                          color: AppTheme.pharmacyColor, size: 20),
                    ),
                  ),
                ],
              ),
              border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(vertical: 12),
            ),
            style: const TextStyle(fontSize: 14),
          ),
        ),
      ),
      body: BlocBuilder<PharmacyBloc, PharmacyState>(
        builder: (context, state) {
          if (state.searchResults.isEmpty && (state.searchQuery == null || state.searchQuery!.isEmpty)) {
            return _buildIdleState();
          }
          if (state.status == PharmacyStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.searchResults.isEmpty) {
            return _buildEmptyState();
          }
          return _buildResults(state.searchResults, cs);
        },
      ),
    );
  }

  Widget _buildIdleState() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Filters row
        SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              ..._forms.map((f) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(f, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: f == _selectedForm ? Colors.white : Colors.grey.shade700)),
                  selected: f == _selectedForm,
                  selectedColor: AppTheme.pharmacyColor,
                  backgroundColor: Colors.grey.shade100,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  side: BorderSide.none,
                  onSelected: (_) => setState(() => _selectedForm = f),
                ),
              )),
              const SizedBox(width: 4),
              FilterChip(
                label: Text('Rx Only', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _rxOnly ? Colors.white : Colors.orange.shade700)),
                selected: _rxOnly,
                selectedColor: Colors.orange,
                backgroundColor: Colors.orange.shade50,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                side: BorderSide.none,
                avatar: _rxOnly ? null : Icon(Icons.medical_services_outlined, size: 14, color: Colors.orange.shade700),
                onSelected: (v) => setState(() => _rxOnly = v),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        // Recent searches
        Text('Recent Searches', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.grey.shade800)),
        const SizedBox(height: 12),
        ..._recentSearches.map((s) => ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(Icons.history, color: Colors.grey.shade400, size: 20),
          title: Text(s, style: const TextStyle(fontSize: 14)),
          trailing: Icon(Icons.north_west, color: Colors.grey.shade400, size: 16),
          onTap: () {
            _controller.text = s;
            _search(s);
          },
        )),
        const Divider(height: 32),
        // Popular categories
        Text('Popular Categories', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.grey.shade800)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8, runSpacing: 8,
          children: PharmacyMockData.categories.take(8).map((c) => ActionChip(
            avatar: Text(c.emoji, style: const TextStyle(fontSize: 16)),
            label: Text(c.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            backgroundColor: Colors.grey.shade50,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Colors.grey.shade200)),
            onPressed: () { _controller.text = c.name; _search(c.name); },
          )).toList(),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.search_off_rounded, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text('No medicines found', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
          const SizedBox(height: 8),
          Text('Try a different search term', style: TextStyle(fontSize: 13, color: Colors.grey.shade400)),
        ],
      ),
    );
  }

  Widget _buildResults(List<PharmacyProduct> results, String cs) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: results.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (_, i) {
        final p = results[i];
        final discountPct = p.mrp > 0 ? (((p.mrp - p.price) / p.mrp) * 100).round() : 0;
        return ListTile(
          contentPadding: const EdgeInsets.symmetric(vertical: 8),
          leading: Container(
            width: 56, height: 56,
            decoration: BoxDecoration(color: Colors.cyan.shade50, borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(p.needsRx ? '💊' : '🧴', style: const TextStyle(fontSize: 24))),
          ),
          title: Row(
            children: [
              Expanded(child: Text(p.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis)),
              if (p.needsRx) Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(4)),
                child: Text('Rx', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.red.shade700)),
              ),
            ],
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${p.brand} • ${p.pack}', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              const SizedBox(height: 4),
              Row(
                children: [
                  Text('$cs ${p.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.black87)),
                  if (discountPct > 0) ...[
                    const SizedBox(width: 6),
                    Text('$cs ${p.mrp.toStringAsFixed(0)}', style: TextStyle(fontSize: 11, color: Colors.grey.shade400, decoration: TextDecoration.lineThrough)),
                    const SizedBox(width: 4),
                    Text('$discountPct% off', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.green.shade700)),
                  ],
                ],
              ),
            ],
          ),
          trailing: SizedBox(
            width: 72, height: 32,
            child: ElevatedButton(
              onPressed: p.inStock ? () {
                final storeName = PharmacyMockData.stores
                    .where((s) => s.id == p.storeId)
                    .map((s) => s.name)
                    .firstOrNull ?? p.storeId;
                context.read<PharmacyBloc>().add(AddMedicineToCart(
                  medicineId: p.id,
                  storeId: p.storeId,
                  storeName: storeName,
                  medicineData: {'name': p.name, 'price': p.price, 'needsRx': p.needsRx, 'pack': p.pack, 'brand': p.brand},
                ));
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${p.name} added to cart'), duration: const Duration(seconds: 1)));
              } : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.pharmacyColor, foregroundColor: Colors.white,
                padding: EdgeInsets.zero,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
              child: Text(p.inStock ? 'ADD' : 'N/A'),
            ),
          ),
          onTap: () => Navigator.pushNamed(context, '/pharmacy/medicine', arguments: p.name),
        );
      },
    );
  }
}
