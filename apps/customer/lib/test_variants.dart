import 'package:kartseek_customer/features/marketplace/services/marketplace_mock_data.dart';

void main() {
  for (var p in MarketplaceMockData.allProducts) {
    if (p.variants.isNotEmpty) {
      print('Product ${p.name} has ${p.variants.length} variants.');
    }
  }
  print('Done checking variants.');
}
