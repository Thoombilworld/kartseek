import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_event.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

/// [SellerModuleScaffold] — shared shell wrapping every module dashboard.
///
/// Provides:
///  - AppBar with module branding (color + emoji + name)
///  - Bottom navigation bar for quick module switching
///  - Side drawer with full navigation tree
///  - Notification badge from [SellerBloc]
///  - Consistent back behaviour — goes to hub (not OS home)
class SellerModuleScaffold extends StatelessWidget {
  final SellerRole activeRole;
  final Widget body;
  final String title;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final bool showBackToHub;

  const SellerModuleScaffold({
    super.key,
    required this.activeRole,
    required this.body,
    required this.title,
    this.actions,
    this.floatingActionButton,
    this.showBackToHub = false,
  });

  // ── Module tab definitions ────────────────────────────────────────────────

  static const _tabs = [
    _ModuleTab('Marketplace', '🛒', SellerRouter.marketplace, SellerRole.marketplaceSeller),
    _ModuleTab('Grocery',     '🥦', SellerRouter.grocery,     SellerRole.grocerySeller),
    _ModuleTab('Restaurant',  '🍽️', SellerRouter.restaurant,  SellerRole.restaurantOwner),
    _ModuleTab('Pharmacy',    '💊', SellerRouter.pharmacy,    SellerRole.pharmacySeller),
    _ModuleTab('Doctor',      '🩺', SellerRouter.doctor,      SellerRole.doctor),
    _ModuleTab('Hotel',       '🏨', SellerRouter.hotel,       SellerRole.hotelOwner),
    _ModuleTab('Taxi',        '🚖', SellerRouter.taxiVendor,  SellerRole.taxiVendor),
  ];

  Color get _moduleColor => SellerTheme.moduleColor(activeRole.value);

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SellerBloc, SellerState>(
      builder: (context, state) {
        return Scaffold(
          backgroundColor: SellerTheme.surface,
          appBar: _buildAppBar(context, state),
          drawer: _buildDrawer(context, state),
          body: body,
          floatingActionButton: floatingActionButton,
          bottomNavigationBar: _buildBottomNav(context, state),
        );
      },
    );
  }

  // ── AppBar ────────────────────────────────────────────────────────────────

  PreferredSizeWidget _buildAppBar(BuildContext context, SellerState state) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 1,
      leading: Builder(
        builder: (ctx) => IconButton(
          icon: Stack(
            children: [
              const Icon(Icons.menu, color: SellerTheme.textPrimary),
              if (state.unreadNotifications > 0)
                Positioned(
                  right: 0, top: 0,
                  child: Container(
                    width: 8, height: 8,
                    decoration: const BoxDecoration(color: SellerTheme.errorRed, shape: BoxShape.circle),
                  ),
                ),
            ],
          ),
          onPressed: () => Scaffold.of(ctx).openDrawer(),
        ),
      ),
      title: Row(
        children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              color: _moduleColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(child: Text(activeRole.emoji, style: const TextStyle(fontSize: 16))),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: SellerTheme.textPrimary),
                  overflow: TextOverflow.ellipsis,
                ),
                Row(
                  children: [
                    Text(
                      state.country.flag,
                      style: const TextStyle(fontSize: 11),
                    ),
                    const SizedBox(width: 3),
                    Text(
                      state.profile?.storeName ?? state.country.name,
                      style: const TextStyle(fontSize: 11, color: SellerTheme.textMuted),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        // Notifications
        Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined, color: SellerTheme.textPrimary),
              onPressed: () => Navigator.pushNamed(context, SellerRouter.notifications),
            ),
            if (state.unreadNotifications > 0)
              Positioned(
                top: 8, right: 8,
                child: Container(
                  width: 16, height: 16,
                  decoration: const BoxDecoration(color: SellerTheme.errorRed, shape: BoxShape.circle),
                  child: Center(
                    child: Text(
                      '${state.unreadNotifications > 9 ? '9+' : state.unreadNotifications}',
                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
          ],
        ),
        if (actions != null) ...actions!,
        const SizedBox(width: 4),
      ],
    );
  }

  // ── Bottom Navigation ─────────────────────────────────────────────────────

  Widget _buildBottomNav(BuildContext context, SellerState state) {
    final activeIndex = _tabs.indexWhere((t) => t.role == activeRole);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: SellerTheme.border, width: 1)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, -2))],
      ),
      child: SafeArea(
        child: SizedBox(
          height: 62,
          child: Row(
            children: List.generate(_tabs.length, (i) {
              final tab = _tabs[i];
              final isActive = i == activeIndex;
              final color = isActive ? SellerTheme.moduleColor(tab.role.value) : SellerTheme.textMuted;
              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    if (!isActive) {
                      Navigator.pushReplacementNamed(context, tab.route);
                    }
                  },
                  behavior: HitTestBehavior.opaque,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      border: isActive
                          ? Border(top: BorderSide(color: color, width: 2.5))
                          : null,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Show pending count badge on active tab
                        Stack(
                          clipBehavior: Clip.none,
                          alignment: Alignment.center,
                          children: [
                            Text(tab.emoji, style: TextStyle(fontSize: isActive ? 20 : 18)),
                            if (isActive && state.pendingOrderCount > 0)
                              Positioned(
                                top: -4,
                                right: -8,
                                child: Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: const BoxDecoration(
                                    color: SellerTheme.errorRed,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text(
                                    '${state.pendingOrderCount > 9 ? '9+' : state.pendingOrderCount}',
                                    style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          tab.label,
                          style: TextStyle(
                            fontSize: 9,
                            color: color,
                            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  // ── Side Drawer ───────────────────────────────────────────────────────────

  Widget _buildDrawer(BuildContext context, SellerState state) {
    return Drawer(
      backgroundColor: Colors.white,
      child: Column(
        children: [
          // Header
          Container(
            decoration: const BoxDecoration(gradient: SellerTheme.primaryGradient),
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 16,
              left: 20, right: 20, bottom: 24,
            ),
            width: double.infinity,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Center(child: Text('🛒', style: TextStyle(fontSize: 26))),
                ),
                const SizedBox(height: 12),
                Text(
                  state.profile?.name ?? 'Seller',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 17),
                ),
                Text(
                  state.profile?.storeName ?? 'KARTSEEK Seller',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    state.profile?.role.displayName ?? 'Seller',
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),

          // Module links
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                // Hub
                _drawerTile(
                  context,
                  icon: Icons.dashboard_outlined,
                  label: 'Seller Hub',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.pushNamedAndRemoveUntil(context, SellerRouter.hub, (_) => false);
                  },
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                  child: Text('MODULES', style: TextStyle(color: SellerTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                ),
                // All 7 module links
                ...SellerRole.values.map((role) {
                  final color = SellerTheme.moduleColor(role.value);
                  final isActive = role == activeRole;
                  return ListTile(
                    dense: true,
                    leading: Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: isActive ? 0.2 : 0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(child: Text(role.emoji, style: const TextStyle(fontSize: 16))),
                    ),
                    title: Text(
                      role.displayName,
                      style: TextStyle(
                        fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                        color: isActive ? color : SellerTheme.textPrimary,
                        fontSize: 14,
                      ),
                    ),
                    trailing: isActive
                        ? Container(
                            width: 6, height: 6,
                            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                          )
                        : null,
                    onTap: () {
                      Navigator.pop(context);
                      if (!isActive) {
                        Navigator.pushReplacementNamed(context, role.initialRoute);
                      }
                    },
                  );
                }),
                const Divider(indent: 20, endIndent: 20),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                  child: Text('ACCOUNT', style: TextStyle(color: SellerTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                ),
                _drawerTile(context, icon: Icons.person_outline,      label: 'Profile',       onTap: () { Navigator.pop(context); Navigator.pushNamed(context, SellerRouter.profile); }),
                _drawerTile(context, icon: Icons.account_balance_wallet_outlined, label: 'Earnings', onTap: () { Navigator.pop(context); Navigator.pushNamed(context, SellerRouter.earnings); }),
                _drawerTile(context, icon: Icons.headset_mic_outlined, label: 'Support',       onTap: () { Navigator.pop(context); Navigator.pushNamed(context, SellerRouter.support); }),
              ],
            ),
          ),

          // Logout
          Padding(
            padding: EdgeInsets.only(left: 16, right: 16, bottom: MediaQuery.of(context).padding.bottom + 16),
            child: ListTile(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              tileColor: SellerTheme.errorRed.withValues(alpha: 0.06),
              leading: const Icon(Icons.logout, color: SellerTheme.errorRed, size: 20),
              title: const Text('Sign Out', style: TextStyle(color: SellerTheme.errorRed, fontWeight: FontWeight.w600, fontSize: 14)),
              onTap: () {
                Navigator.pop(context);
                context.read<SellerBloc>().add(const SellerLogout());
                Navigator.pushNamedAndRemoveUntil(context, SellerRouter.login, (_) => false);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _drawerTile(BuildContext context, {required IconData icon, required String label, required VoidCallback onTap}) {
    return ListTile(
      dense: true,
      leading: Icon(icon, color: SellerTheme.textSecondary, size: 20),
      title: Text(label, style: const TextStyle(fontSize: 14, color: SellerTheme.textPrimary)),
      onTap: onTap,
    );
  }
}

class _ModuleTab {
  final String label;
  final String emoji;
  final String route;
  final SellerRole role;
  const _ModuleTab(this.label, this.emoji, this.route, this.role);
}
