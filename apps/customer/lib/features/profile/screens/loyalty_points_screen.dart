import 'package:flutter/material.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/profile/services/loyalty_api_service.dart';

class LoyaltyPointsScreen extends StatefulWidget {
  const LoyaltyPointsScreen({super.key});

  @override
  State<LoyaltyPointsScreen> createState() => _LoyaltyPointsScreenState();
}

class _LoyaltyPointsScreenState extends State<LoyaltyPointsScreen> {
  final LoyaltyApiService _apiService = LoyaltyApiService();
  late Future<Map<String, dynamic>> _pointsFuture;

  @override
  void initState() {
    super.initState();
    _pointsFuture = _apiService.getPoints();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Loyalty Points')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _pointsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Failed to load points: ${snapshot.error}'));
          }

          final data = snapshot.data ?? {};
          final points = data['points'] ?? 0;
          final history = data['history'] as List<dynamic>? ?? [];

          return Column(
            children: [
              Container(
                width: double.infinity,
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppTheme.accentOrange,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Icon(Icons.stars, color: Colors.white, size: 48),
                    const SizedBox(height: 12),
                    Text('$points', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                    const Text('Available Points', style: TextStyle(color: Colors.white70, fontSize: 14)),
                    const SizedBox(height: 24),
                    Text('100 Points = ${RegionService.instance.currentCountry.currencySymbol} 1.00', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Align(alignment: Alignment.centerLeft, child: Text('Reward History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18))),
              ),
              Expanded(
                child: history.isEmpty 
                  ? const Center(child: Text('No history found'))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: history.length,
                      itemBuilder: (context, index) {
                        final item = history[index];
                        return _buildPointTxn(
                          item['title'] ?? 'Transaction',
                          item['date'] ?? '',
                          item['amount'] ?? '',
                          item['isEarned'] ?? true,
                        );
                      },
                    ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildPointTxn(String title, String date, String amount, bool isEarned) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: isEarned ? Colors.green.withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.1),
        child: Icon(Icons.star, color: isEarned ? Colors.green : Colors.red),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(date, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
      trailing: Text(amount, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: isEarned ? Colors.green : Colors.red)),
    );
  }
}
