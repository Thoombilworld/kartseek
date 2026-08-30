import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_state.dart';
import 'package:kartseek_seller/features/shared/models/seller_profile_model.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

/// RBAC-gated hub screen.
///
/// After login the server returns the seller's [SellerRole].
/// This screen reads it from [SellerBloc] and auto-routes the user to the
/// correct module dashboard. If no role is matched it shows module cards.
class SellerHubScreen extends StatefulWidget {
  const SellerHubScreen({super.key});

  @override
  State<SellerHubScreen> createState() => _SellerHubScreenState();
}

class _SellerHubScreenState extends State<SellerHubScreen> {
  @override
  void initState() {
    super.initState();
    // Profile is already loaded by SellerLoginScreen via SellerAuthenticated.
    // Hub is only reachable after authentication; no need to re-trigger here.
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SellerBloc, SellerState>(
      listener: (context, state) {
        // Guard: if session expires or user logs out, redirect to login
        if (state.isUnauthenticated) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.pushNamedAndRemoveUntil(context, SellerRouter.login, (_) => false);
          });
          return;
        }
        if (state.isAuthenticated && state.profile != null) {
          // Auto-route to the seller's primary module dashboard
          final route = state.profile!.role.initialRoute;
          if (route != SellerRouter.hub) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              Navigator.pushReplacementNamed(context, route);
            });
          }
        }
      },
      builder: (context, state) {
        if (state.isLoading) {
          return const Scaffold(
            backgroundColor: SellerTheme.primary,
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: Colors.white),
                  SizedBox(height: 20),
                  Text('Connecting to Seller Hub...', style: TextStyle(color: Colors.white70, fontSize: 14)),
                ],
              ),
            ),
          );
        }

        // Fallback: show all module cards if profile role can't be resolved
        return Scaffold(
          backgroundColor: SellerTheme.surface,
          appBar: AppBar(
            backgroundColor: SellerTheme.primary,
            title: const Text('KARTSEEK Seller Hub', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            elevation: 0,
            actions: [
              IconButton(
                onPressed: () => Navigator.pushNamed(context, SellerRouter.profile),
                icon: const Icon(Icons.person_outline, color: Colors.white),
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (state.profile != null) _buildProfileCard(state.profile!),
                const SizedBox(height: 24),
                const Text('Your Seller Portals', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.1,
                  children: SellerRole.values.map((role) => _moduleCard(role)).toList(),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildProfileCard(SellerProfile profile) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: SellerTheme.primaryGradient,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(child: Text(profile.role.emoji, style: const TextStyle(fontSize: 26))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(profile.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                Text(profile.storeName, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    _statusBadge(profile.status),
                    const SizedBox(width: 8),
                    Text('⭐ ${profile.rating.toStringAsFixed(1)}',
                        style: const TextStyle(color: Colors.white, fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusBadge(SellerStatus status) {
    final color = status == SellerStatus.active ? SellerTheme.successGreen : SellerTheme.warningAmber;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(status.displayName, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }

  Widget _moduleCard(SellerRole role) {
    final color = SellerTheme.moduleColor(role.value);
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, role.initialRoute),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: SellerTheme.border),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(child: Text(role.emoji, style: const TextStyle(fontSize: 22))),
            ),
            const SizedBox(height: 10),
            Text(role.displayName,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                maxLines: 2, overflow: TextOverflow.ellipsis),
            const Spacer(),
            Row(
              children: [
                Text('Open', style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(width: 4),
                Icon(Icons.arrow_forward_ios, size: 10, color: color),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
