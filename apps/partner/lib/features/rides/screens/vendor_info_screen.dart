import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';

/// Vendor Info Screen — Shows vendor affiliation details for the driver.
///
/// Displays the vendor name, contact info, commission rate, fleet size,
/// and the driver's onboarding progress within the vendor's fleet.
/// Only visible for vendor-managed drivers.
class VendorInfoScreen extends StatelessWidget {
  const VendorInfoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Region-aware vendor data — in production, from PartnerBloc/API
    final region = RegionService.instance.currentCountry;
    final vendorCity = RegionService.instance.lastDetection?.city ?? region.defaultCity;
    final vendorName = 'KARTSEEK Fleet ${region.name}';
    const vendorId = 'VND-003';
    final vendorPhone = '${region.callingCode} 000 0000';
    const vendorEmail = 'fleet@kartseek.com';
    const vendorRating = 4.5;
    const driverCount = 60;
    const vehicleCount = 25;
    const commissionRate = 5.0;
    const joinedVendorDate = '2025-01-10';

    return Scaffold(
      backgroundColor: PartnerTheme.surface,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, size: 20, color: PartnerTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('My Vendor', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          children: [
            // Vendor card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [PartnerTheme.taxiColor, PartnerTheme.taxiColor.withValues(alpha: 0.8)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: PartnerTheme.taxiColor.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        width: 56, height: 56,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Center(
                          child: Text('SR', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(vendorName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
                            const SizedBox(height: 2),
                          ],
                        ),
                      ),
                      // City/Country row below
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text('$vendorCity, ${region.name} ${region.flag}', style: const TextStyle(fontSize: 13, color: Colors.white70)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.star, size: 14, color: Colors.amber),
                            SizedBox(width: 4),
                            Text('$vendorRating', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _vendorStat('$driverCount', 'Drivers', Icons.people),
                      const SizedBox(width: 12),
                      _vendorStat('$vehicleCount', 'Vehicles', Icons.directions_car),
                      const SizedBox(width: 12),
                      _vendorStat('$commissionRate%', 'Commission', Icons.payments),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Details
            Container(
              padding: const EdgeInsets.all(16),
              decoration: PartnerTheme.cardDecoration(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Vendor Details', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
                  const SizedBox(height: 14),
                  _detailRow(Icons.badge, 'Vendor ID', vendorId),
                  _detailRow(Icons.phone, 'Phone', vendorPhone),
                  _detailRow(Icons.email, 'Email', vendorEmail),
                  _detailRow(Icons.calendar_today, 'Joined Fleet', joinedVendorDate),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: PartnerTheme.infoBlue.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: PartnerTheme.infoBlue.withValues(alpha: 0.2)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, size: 18, color: PartnerTheme.infoBlue),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your vendor manages your fleet registration. Contact them for vehicle changes or fleet-related inquiries.',
                      style: TextStyle(fontSize: 12, color: PartnerTheme.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Contact vendor button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _contactVendor(context, vendorPhone),
                icon: const Icon(Icons.phone, size: 18),
                label: const Text('Contact Vendor'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: PartnerTheme.taxiColor,
                  side: BorderSide(color: PartnerTheme.taxiColor.withValues(alpha: 0.4)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Future<void> _contactVendor(BuildContext context, String phone) async {
    final uri = Uri(scheme: 'tel', path: phone.replaceAll(' ', ''));
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Could not open phone dialer'),
            backgroundColor: PartnerTheme.offlineRed,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  Widget _vendorStat(String value, String label, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: Colors.white70),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.white60, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: PartnerTheme.textMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 13, color: PartnerTheme.textMuted)),
          ),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: PartnerTheme.textPrimary)),
        ],
      ),
    );
  }
}
