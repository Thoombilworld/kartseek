import 'package:flutter/material.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';

class FoodCustomizationScreen extends StatefulWidget {
  const FoodCustomizationScreen({super.key});

  @override
  State<FoodCustomizationScreen> createState() => _FoodCustomizationScreenState();
}

class _FoodCustomizationScreenState extends State<FoodCustomizationScreen> {
  int quantity = 1;
  String selectedPortion = 'Regular (Serves 1)';
  List<String> selectedAddons = [];

  void toggleAddon(String addon) {
    setState(() {
      if (selectedAddons.contains(addon)) {
        selectedAddons.remove(addon);
      } else {
        if (selectedAddons.length < 3) {
          selectedAddons.add(addon);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  KartseekImage(
                    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop',
                    width: double.infinity,
                    height: 220,
                    fit: BoxFit.cover,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  const SizedBox(height: 16),
                  // Food Header
                  Row(
                    children: [
                      Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(border: Border.all(color: Colors.red[600]!)),
                        child: Center(
                          child: Container(width: 8, height: 8, decoration: BoxDecoration(color: Colors.red[600], shape: BoxShape.circle)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: Colors.amber[100], borderRadius: BorderRadius.circular(4)),
                        child: Text('Bestseller', style: TextStyle(color: Colors.amber[900], fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text('Chicken Dum Biryani', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text('${RegionService.instance.currentCountry.currencySymbol} 320', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
                  const SizedBox(height: 12),
                  Text(
                    'Signature chicken biryani cooked with fragrant basmati rice, tender chicken pieces, and secret Mughlai spices. Slow cooked in dum style.',
                    style: TextStyle(fontSize: 14, color: Colors.grey[600], height: 1.4),
                  ),
                  const SizedBox(height: 24),
                  const Divider(height: 1, color: Colors.black12),
                  
                  // Required Customization
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Portion Size', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          Text('Choose 1 option', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(4)),
                        child: const Text('Required', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildRadioOption('Regular (Serves 1)', 'Free'),
                  _buildRadioOption('Large (Serves 2)', '+${RegionService.instance.currentCountry.currencySymbol} 150'),
                  
                  const SizedBox(height: 24),
                  const Divider(height: 1, color: Colors.black12),
                  
                  // Optional Customization
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Add-ons', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          Text('Choose up to 3 options', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(4)),
                        child: const Text('Optional', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildCheckboxOption('Extra Raita', '+${RegionService.instance.currentCountry.currencySymbol} 30'),
                  _buildCheckboxOption('Extra Salan', '+${RegionService.instance.currentCountry.currencySymbol} 40'),
                  _buildCheckboxOption('Boiled Egg', '+${RegionService.instance.currentCountry.currencySymbol} 25'),
                  
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
          _buildBottomBar(),
        ],
      ),
    );
  }

  Widget _buildRadioOption(String title, String price) {
    final bool isSelected = selectedPortion == title;
    return InkWell(
      onTap: () {
        setState(() {
          selectedPortion = title;
        });
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              color: isSelected ? Colors.orange[600] : Colors.grey[400],
              size: 24,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
            ),
            Text(price, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey[700])),
          ],
        ),
      ),
    );
  }

  Widget _buildCheckboxOption(String title, String price) {
    final bool isSelected = selectedAddons.contains(title);
    return InkWell(
      onTap: () => toggleAddon(title),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.check_box : Icons.check_box_outline_blank,
              color: isSelected ? Colors.orange[600] : Colors.grey[400],
              size: 24,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
            ),
            Text(price, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey[700])),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -5)),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove, size: 20),
                    onPressed: () {
                      if (quantity > 1) setState(() => quantity--);
                    },
                    color: Colors.black87,
                  ),
                  Text(
                    '$quantity',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.add, size: 20),
                    onPressed: () => setState(() => quantity++),
                    color: Colors.orange[600],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('✅ Item added to cart!'), backgroundColor: Color(0xFFEA580C)),
                  );
                  Future.delayed(const Duration(milliseconds: 800), () { 
                    if (mounted) Navigator.pop(context); 
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange[600],
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: Text(
                  'Add item - ${RegionService.instance.currentCountry.currencySymbol} 360',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
