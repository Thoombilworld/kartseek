import 'package:flutter/material.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/profile/screens/add_address_bottom_sheet.dart';
class RestaurantCheckoutScreen extends StatefulWidget {
  const RestaurantCheckoutScreen({super.key});

  @override
  State<RestaurantCheckoutScreen> createState() => _RestaurantCheckoutScreenState();
}

class _RestaurantCheckoutScreenState extends State<RestaurantCheckoutScreen> {
  int _selectedTip = 0;
  
  @override
  Widget build(BuildContext context) {
    final currency = RegionService.instance.currentCountry.currencySymbol;
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: const Text('Checkout', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          children: [
            // Delivery Address
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.home, color: Colors.orange.shade700),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Delivering to Home', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                        const SizedBox(height: 4),
                        Text('Apt 4B, Skyline Apartments, ${RegionService.instance.lastDetection?.city ?? RegionService.instance.currentCountry.defaultCity}', style: const TextStyle(fontSize: 13, color: Colors.black54)),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () => AddAddressBottomSheet.show(context),
                    child: const Text('CHANGE', style: TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.w700, fontSize: 13)),
                  ),
                ],
              ),
            ),

            // Order Summary
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Your Order', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 16),
                  _orderItem('Chicken Dum Biryani', 2, 640),
                  _orderItem('Paneer Butter Masala', 1, 280),
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.edit_note, color: Colors.black54),
                        SizedBox(width: 12),
                        Text('Any cooking instructions?', style: TextStyle(color: Colors.black54, fontSize: 14)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Tip Section
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Tip your delivery partner', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  const Text('100% of the tip goes to the driver', style: TextStyle(fontSize: 13, color: Colors.black54)),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _tipOption(20, '$currency 20'),
                      _tipOption(30, '$currency 30'),
                      _tipOption(50, '$currency 50'),
                      _tipOption(0, 'Custom'),
                    ],
                  ),
                ],
              ),
            ),

            // Bill Details
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Bill Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 16),
                  _billRow('Item Total', '$currency 920'),
                  _billRow('Delivery Fee', '$currency 40'),
                  if (_selectedTip > 0) _billRow('Delivery Tip', '$currency $_selectedTip'),
                  _billRow('Taxes & Charges', '$currency 45'),
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('To Pay', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                      Text('$currency ${920 + 40 + 45 + _selectedTip}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                    ],
                  ),
                ],
              ),
            ),

            // Cancellation Policy
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Cancellation Policy', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  Text(
                    '100% cancellation fee will be applicable if you decide to cancel the order anytime after order placement. Avoid cancellation as it leads to food wastage.',
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.4),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomBar(context, 920 + 40 + 45 + _selectedTip),
    );
  }

  Widget _orderItem(String name, int qty, int price) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 4),
            width: 14,
            height: 14,
            decoration: BoxDecoration(border: Border.all(color: Colors.green[600]!)),
            child: Center(
              child: Container(width: 6, height: 6, decoration: BoxDecoration(color: Colors.green[600], shape: BoxShape.circle)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 4),
                Text('${RegionService.instance.currentCountry.currencySymbol} $price', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              ],
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: Colors.orange.shade200),
            ),
            child: Row(
              children: [
                const Padding(padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4), child: Icon(Icons.remove, size: 16, color: Colors.orange)),
                Text('$qty', style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.orange)),
                const Padding(padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4), child: Icon(Icons.add, size: 16, color: Colors.orange)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _tipOption(int amount, String label) {
    final bool isSelected = _selectedTip == amount && amount != 0;
    return GestureDetector(
      onTap: () => setState(() => _selectedTip = _selectedTip == amount ? 0 : amount),
      child: Container(
        width: 70,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? Colors.orange.shade600 : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? Colors.orange.shade600 : Colors.grey.shade300),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: isSelected ? Colors.white : Colors.black87,
            ),
          ),
        ),
      ),
    );
  }

  Widget _billRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.black54, fontSize: 14)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context, int total) {
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
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('PAY USING', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.black54)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    const Icon(Icons.account_balance_wallet, size: 16, color: Color(0xFFEA580C)),
                    const SizedBox(width: 6),
                    Text(RegionService.instance.getPaymentMethods().first, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                    const Icon(Icons.arrow_drop_up),
                  ],
                ),
              ],
            ),
            const SizedBox(width: 24),
            Expanded(
              child: ElevatedButton(
                onPressed: () {
                  // Navigate to Tracking
                  Navigator.pushReplacementNamed(context, AppRouter.restaurantTracking);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEA580C),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: Text(
                  'Place Order • ${RegionService.instance.currentCountry.currencySymbol} $total',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
