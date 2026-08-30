import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/routing/app_router.dart';
import 'package:shared_mobile/features/auth/blocs/auth_bloc.dart';
import 'package:shared_mobile/features/auth/blocs/auth_state.dart';

/// AuthGuard — Reusable authentication gate for any module.
///
/// Provides static helpers to check auth state before performing actions
/// that require a logged-in user (booking, checkout, profile, etc.).
///
/// Usage:
/// ```dart
/// AuthGuard.requireAuth(context, () {
///   Navigator.pushNamed(context, CustomerRouter.checkout);
/// });
/// ```
///
/// Or use the widget wrapper:
/// ```dart
/// AuthGuard(
///   child: BookNowButton(),
///   fallbackMessage: 'Sign in to book a hotel',
/// )
/// ```
class AuthGuard extends StatelessWidget {
  /// The child widget to show when authenticated.
  final Widget child;

  /// Optional message to show in the login prompt bottom sheet.
  final String? fallbackMessage;

  /// Optional callback when user successfully authenticates and returns.
  final VoidCallback? onAuthenticated;

  const AuthGuard({
    super.key,
    required this.child,
    this.fallbackMessage,
    this.onAuthenticated,
  });

  /// Check if the user is authenticated. If not, show a login prompt.
  /// If authenticated, execute [onAuthenticated].
  static void requireAuth(BuildContext context, VoidCallback onAuthenticated, {String? message}) {
    final authState = context.read<AuthBloc>().state;
    if (authState.isAuthenticated) {
      onAuthenticated();
    } else {
      _showLoginPrompt(context, message: message);
    }
  }

  /// Check authentication status without side effects.
  static bool isAuthenticated(BuildContext context) {
    return context.read<AuthBloc>().state.isAuthenticated;
  }

  /// Get current user or null.
  static UserProfile? currentUser(BuildContext context) {
    return context.read<AuthBloc>().state.user;
  }

  static void _showLoginPrompt(BuildContext context, {String? message}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 36),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag indicator
            Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: AppTheme.borderLight,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Lock icon
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.lock_open_outlined, size: 30, color: AppTheme.primaryGreen),
            ),
            const SizedBox(height: 16),

            // Title
            const Text(
              'Sign in required',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 8),

            // Message
            Text(
              message ?? 'Please sign in to continue. Your progress will be saved.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: AppTheme.textMuted, height: 1.5),
            ),
            const SizedBox(height: 24),

            // Sign In button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pushNamed(context, AppRouter.login);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryGreen,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                child: const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 12),

            // Create Account button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pushNamed(context, AppRouter.signUp);
                },
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.primaryGreen, width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Create Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.primaryGreen)),
              ),
            ),
            const SizedBox(height: 8),

            // Skip
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Maybe later', style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state.isAuthenticated) {
          return child;
        }

        return GestureDetector(
          onTap: () => _showLoginPrompt(context, message: fallbackMessage),
          child: child,
        );
      },
    );
  }
}
