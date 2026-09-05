import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_shared_mobile/core/theme/app_theme.dart';
import 'package:kartseek_shared_mobile/core/routing/app_router.dart';
import 'package:kartseek_shared_mobile/features/auth/blocs/auth_bloc.dart';
import 'package:kartseek_shared_mobile/features/auth/blocs/auth_event.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

/// KARTSEEK Profile Screen — User account management hub.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceWhite,
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          IconButton(icon: const Icon(Icons.settings_outlined, size: 22), onPressed: () => Navigator.pushNamed(context, AppRouter.settings)),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildProfileHeader(context),
            _buildStatsRow(),
            const SizedBox(height: 12),
            _buildSection(context, 'Account', const [
              _MenuItem(Icons.person_outline, 'Edit Profile', 'Name, email, phone', route: AppRouter.editProfile),
              _MenuItem(Icons.location_on_outlined, 'Saved Addresses', '3 addresses saved', route: AppRouter.savedAddresses),
              _MenuItem(Icons.payment_outlined, 'Payment Methods', 'Cards, UPI, Wallet', route: AppRouter.paymentMethods),
              _MenuItem(Icons.lock_outline, 'Change Password', 'Update security', route: AppRouter.changePassword),
            ]),
            _buildSection(context, 'Orders & Activity', const [
              _MenuItem(Icons.receipt_long_outlined, 'My Orders', 'Track & manage orders', route: AppRouter.orders),
              _MenuItem(Icons.favorite_outline, 'Wishlist', '12 items saved', route: AppRouter.wishlist),
              _MenuItem(Icons.star_outline, 'Reviews & Ratings', '8 reviews given', route: AppRouter.reviewsRatings),
              _MenuItem(Icons.local_offer_outlined, 'Coupons & Offers', '3 active coupons', route: AppRouter.couponsOffers),
            ]),
            _buildSection(context, 'Wallet & Rewards', [
              _MenuItem(Icons.account_balance_wallet_outlined, 'KARTSEEK Wallet', '${RegionService.instance.currentCountry.currencySymbol} 1,250.00 balance', route: AppRouter.wallet),
              const _MenuItem(Icons.emoji_events_outlined, 'Loyalty Points', '2,450 points', route: AppRouter.loyaltyPoints),
              _MenuItem(Icons.card_giftcard_outlined, 'Refer & Earn', 'Get ${RegionService.instance.currentCountry.currencySymbol} 200 per referral', route: AppRouter.referEarn),
            ]),
            _buildSection(context, 'Support', const [
              _MenuItem(Icons.help_outline, 'Help & Support', 'FAQs, chat, call', route: AppRouter.support),
              _MenuItem(Icons.description_outlined, 'Terms & Conditions', 'Legal documents', route: AppRouter.termsConditions),
              _MenuItem(Icons.privacy_tip_outlined, 'Privacy Policy', 'Data & security', route: AppRouter.privacyPolicy),
              _MenuItem(Icons.info_outline, 'About KARTSEEK', 'v1.0.0', route: AppRouter.aboutKartseek),
            ]),
            const SizedBox(height: 12),
            _buildLogoutButton(context),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      color: Colors.white,
      child: Row(
        children: [
          // Avatar
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.primaryGreen, Color(0xFF22C55E)]),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: AppTheme.primaryGreen.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
            ),
            child: const Center(
              child: Text('JD', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
            ),
          ),
          const SizedBox(width: 16),
          // Info
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('John Doe', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textPrimary)),
                SizedBox(height: 2),
                Text('john.doe@email.com', style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                SizedBox(height: 2),
                Text('+254 712 345 678', style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
              ],
            ),
          ),
          // Edit button
          GestureDetector(
            onTap: () { 
              Navigator.pushNamed(context, AppRouter.editProfile);
            },
            child: Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.primaryGreen),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Row(
        children: [
          _statItem('156', 'Orders', AppTheme.primaryGreen),
          _verticalDivider(),
          _statItem('${RegionService.instance.currentCountry.currencySymbol} 1,250', 'Wallet', AppTheme.accentBlue),
          _verticalDivider(),
          _statItem('2,450', 'Points', AppTheme.accentOrange),
          _verticalDivider(),
          _statItem('4.8', 'Rating', AppTheme.doctorColor),
        ],
      ),
    );
  }

  Widget _statItem(String value, String label, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _verticalDivider() {
    return Container(width: 1, height: 36, color: AppTheme.borderLight);
  }

  Widget _buildSection(BuildContext context, String title, List<_MenuItem> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
          child: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textMuted, letterSpacing: 0.5)),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderLight),
          ),
          child: Column(
            children: items.asMap().entries.map((entry) {
              final i = entry.key;
              final item = entry.value;
              return Column(
                children: [
                  InkWell(
                    onTap: () { 
                      if (item.route != null) {
                        Navigator.pushNamed(context, item.route!);
                      } else {
                        Navigator.pushNamed(context, AppRouter.profileFeature, arguments: {'title': item.title});
                      }
                    },
                    borderRadius: BorderRadius.vertical(
                      top: i == 0 ? const Radius.circular(16) : Radius.zero,
                      bottom: i == items.length - 1 ? const Radius.circular(16) : Radius.zero,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      child: Row(
                        children: [
                          Container(
                            width: 36, height: 36,
                            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(10)),
                            child: Icon(item.icon, size: 18, color: AppTheme.textSecondary),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                                Text(item.subtitle, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, size: 18, color: AppTheme.textMuted),
                        ],
                      ),
                    ),
                  ),
                  if (i < items.length - 1)
                    const Divider(height: 1, indent: 66, color: AppTheme.borderLight),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SizedBox(
        width: double.infinity,
        height: 50,
        child: OutlinedButton.icon(
          onPressed: () {
            context.read<AuthBloc>().add(const LogoutRequested());
            Navigator.pushNamedAndRemoveUntil(context, AppRouter.login, (route) => false);
          },
          icon: const Icon(Icons.logout, size: 18, color: AppTheme.errorRed),
          label: const Text('Log Out', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.errorRed)),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppTheme.errorRed, width: 1.5),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? route;
  const _MenuItem(this.icon, this.title, this.subtitle, {this.route});
}
