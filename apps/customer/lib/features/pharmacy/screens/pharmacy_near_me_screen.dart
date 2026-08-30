import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_event.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_state.dart';
import 'package:kartseek_customer/features/pharmacy/services/pharmacy_mock_data.dart';

/// Near-me — Map placeholder + nearby pharmacy list sorted by distance.
/// Wired to [LoadNearbyPharmacies] bloc event with GPS auto-detection
/// via [RegionService]. Falls back to mock data when API/GPS fails.
class PharmacyNearMeScreen extends StatefulWidget {
  const PharmacyNearMeScreen({super.key});

  @override
  State<PharmacyNearMeScreen> createState() => _PharmacyNearMeScreenState();
}

class _PharmacyNearMeScreenState extends State<PharmacyNearMeScreen> {
  @override
  void initState() {
    super.initState();
    _loadNearbyFromDevice();
  }

  /// Detect GPS location from RegionService and dispatch [LoadNearbyPharmacies].
  /// Uses the device's last-known coordinates, falling back to the region's
  /// default city coordinates if GPS is unavailable.
  void _loadNearbyFromDevice() {
    final region = RegionService.instance;
    final lat = region.lastDetection?.lat ?? region.currentCountry.defaultLat;
    final lng = region.lastDetection?.lng ?? region.currentCountry.defaultLng;
    context.read<PharmacyBloc>().add(LoadNearbyPharmacies(
      latitude: lat,
      longitude: lng,
      radius: 10,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        backgroundColor: Colors.white, elevation: 0, scrolledUnderElevation: 1,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => Navigator.pop(context)),
        title: const Text('Pharmacies Near Me', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black87)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.black54, size: 22),
            tooltip: 'Refresh',
            onPressed: _loadNearbyFromDevice,
          ),
        ],
      ),
      body: BlocBuilder<PharmacyBloc, PharmacyState>(
        buildWhen: (prev, curr) =>
            prev.nearbyStores != curr.nearbyStores || prev.status != curr.status,
        builder: (context, state) {
          // Determine which data to display:
          // - Prefer live data from the bloc
          // - Fall back to mock data only on initial load or empty API response
          final stores = state.nearbyStores.isNotEmpty
              ? state.nearbyStores
              : PharmacyMockData.stores.toList();

          final isLoading = state.status == PharmacyStatus.loading;
          final region = RegionService.instance;
          final cityName = region.lastDetection?.city ?? region.currentCountry.defaultCity;

          return Column(
            children: [
              // Map placeholder with live location info
              Container(
                height: 200, color: Colors.grey.shade200,
                child: Center(child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.map_outlined, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 8),
                    Text('Map View — $cityName', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade500)),
                    Text(
                      isLoading ? 'Finding pharmacies...' : '${stores.length} pharmacies nearby',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                    ),
                    if (region.lastDetection != null) ...[
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.gps_fixed, size: 10, color: Colors.green.shade700),
                            const SizedBox(width: 4),
                            Text(
                              'GPS Active • ${region.currentCountry.flag}',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.green.shade700),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                )),
              ),

              // Loading indicator
              if (isLoading)
                const LinearProgressIndicator(
                  color: AppTheme.pharmacyColor,
                  backgroundColor: Colors.transparent,
                  minHeight: 2,
                ),

              // Store list
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: stores.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final s = stores[i];
                    return GestureDetector(
                      onTap: () => Navigator.pushNamed(context, AppRouter.pharmacyStoreDetail, arguments: s.name),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                        child: Row(
                          children: [
                            Container(
                              width: 48, height: 48,
                              decoration: BoxDecoration(color: s.isOpen ? Colors.green.shade50 : Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
                              child: const Center(child: Text('🏪', style: TextStyle(fontSize: 24))),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(child: Text(s.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis)),
                                      if (s.verified) ...[
                                        const SizedBox(width: 4),
                                        Icon(Icons.verified, size: 14, color: Colors.blue.shade400),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text('${s.distance} • ${s.deliveryTime}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                                  Row(
                                    children: [
                                      Icon(Icons.star, size: 13, color: Colors.amber.shade400),
                                      const SizedBox(width: 2),
                                      Text('${s.rating}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: s.isOpen ? Colors.green.shade50 : Colors.red.shade50,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(s.isOpen ? 'Open' : 'Closed', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: s.isOpen ? Colors.green.shade700 : Colors.red.shade700)),
                                      ),
                                      if (s.is24hr) ...[
                                        const SizedBox(width: 4),
                                        Text('24/7', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.purple.shade700)),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.directions, color: AppTheme.pharmacyColor, size: 24),
                          ],
                        ),
                      ),
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
}
