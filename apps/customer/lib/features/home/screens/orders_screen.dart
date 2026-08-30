import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/widgets/kartseek_image.dart';

/// Orders History — shows all past and active orders across modules.
class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FB),
        appBar: AppBar(
          backgroundColor: Colors.white,
          title: const Text('My Orders', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          bottom: const TabBar(
            indicatorColor: AppTheme.primaryGreen,
            labelColor: AppTheme.primaryGreen,
            unselectedLabelColor: AppTheme.textMuted,
            labelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            tabs: [Tab(text: 'Active'), Tab(text: 'Past Orders')],
          ),
        ),
        body: TabBarView(
          children: [
            _buildActive(context),
            _buildPast(context),
          ],
        ),
      ),
    );
  }

  Widget _buildActive(BuildContext context) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _orderCard(context, 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=400&auto=format&fit=crop', 'Grocery Order', 'FreshMart Supermarket', '3 items • ${RegionService.instance.currentCountry.currencySymbol} 487', 'Out for delivery', AppTheme.groceryColor, true),
        _orderCard(context, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=400&auto=format&fit=crop', 'Food Order', 'The Grand Biryani House', 'Chicken Biryani x2', 'Preparing', AppTheme.restaurantColor, true),
      ],
    );
  }

  Widget _buildPast(BuildContext context) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _orderCard(context, 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=400&auto=format&fit=crop', 'Marketplace', 'Sony WH-1000XM5', '${RegionService.instance.currentCountry.currencySymbol} 24,990 • May 25', 'Delivered', AppTheme.marketplaceColor, false),
        _orderCard(context, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400&auto=format&fit=crop', 'Pharmacy', 'HealthPlus Pharmacy', 'Paracetamol, Celin • ${RegionService.instance.currentCountry.currencySymbol} 90', 'Delivered', AppTheme.pharmacyColor, false),
        _orderCard(context, 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=400&auto=format&fit=crop', 'Taxi Ride', 'Airport → Downtown', '${RegionService.instance.currentCountry.currencySymbol} 1,200 • May 24', 'Completed', AppTheme.taxiColor, false),
        _orderCard(context, 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=400&auto=format&fit=crop', 'Doctor', 'Dr. Sarah Kamau', 'Consultation • ${RegionService.instance.currentCountry.currencySymbol} 800', 'Completed', AppTheme.doctorColor, false),
        _orderCard(context, 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=400&auto=format&fit=crop', 'Grocery', 'Naivas Supermarket', '6 items • ${RegionService.instance.currentCountry.currencySymbol} 1,230', 'Delivered', AppTheme.groceryColor, false),
      ],
    );
  }

  Widget _orderCard(BuildContext context, String imageUrl, String module, String title, String details, String status, Color color, bool active) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, AppRouter.orderDetail, arguments: 'KS-2026-78432'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(16),
          border: Border.all(color: active ? color.withValues(alpha: 0.3) : const Color(0xFFE5E7EB)),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1), 
                    borderRadius: BorderRadius.circular(14),
                    image: KartseekImage.decoration(url: imageUrl, fit: BoxFit.cover),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(module, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text(details, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: active ? color.withValues(alpha: 0.1) : const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(status, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? color : Colors.green.shade700)),
                ),
                const Spacer(),
                if (active)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
                    child: const Text('Track', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(10)),
                    child: const Text('Reorder', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
