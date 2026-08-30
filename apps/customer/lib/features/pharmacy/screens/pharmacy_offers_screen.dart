import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/models/pharmacy_models.dart';

/// Pharmacy Offers — active coupons with copy button, filter, expiry timer.
class PharmacyOffersScreen extends StatefulWidget {
  const PharmacyOffersScreen({super.key});
  @override State<PharmacyOffersScreen> createState() => _PharmacyOffersScreenState();
}

class _PharmacyOffersScreenState extends State<PharmacyOffersScreen> {
  @override
  void initState() { super.initState(); context.read<PharmacyBloc>().add(const LoadPharmacyOffers()); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Offers & Coupons', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
      ),
      body: BlocBuilder<PharmacyBloc, PharmacyState>(
        builder: (context, state) {
          if (state.offers.isEmpty) return const Center(child: CircularProgressIndicator());
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: state.offers.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _offerCard(state.offers[i]),
          );
        },
      ),
    );
  }

  Widget _offerCard(PharmacyOffer offer) {
    final gradients = [
      [const Color(0xFF667eea), const Color(0xFF764ba2)],
      [const Color(0xFFf093fb), const Color(0xFFf5576c)],
      [const Color(0xFF4facfe), const Color(0xFF00f2fe)],
      [const Color(0xFF43e97b), const Color(0xFF38f9d7)],
      [const Color(0xFFfa709a), const Color(0xFFfee140)],
    ];
    final g = gradients[offer.id.hashCode % gradients.length];
    final daysLeft = offer.expiresAt?.difference(DateTime.now()).inDays ?? 0;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: g),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: g[0].withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(offer.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white))),
                if (daysLeft > 0 && daysLeft <= 7) Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(20)),
                  child: Text('$daysLeft days left', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(offer.displayValue, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white)),
            if (offer.minOrderAmount > 0)
              Text('Min order: KES ${offer.minOrderAmount.toInt()}', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.8))),
            if (offer.storeName != null)
              Text('At: ${offer.storeName}', style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.8))),
            const SizedBox(height: 14),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 1.5, strokeAlign: BorderSide.strokeAlignInside)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(offer.code, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 2)),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () {
                          Clipboard.setData(ClipboardData(text: offer.code));
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Code "${offer.code}" copied!'), duration: const Duration(seconds: 1)));
                        },
                        child: const Icon(Icons.copy, color: Colors.white, size: 16),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
