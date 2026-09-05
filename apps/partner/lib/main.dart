import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:provider/provider.dart';
import 'package:kartseek_shared_mobile/core/blocs/region_bloc.dart';
import 'package:kartseek_shared_mobile/core/providers/locale_provider.dart';
import 'package:kartseek_shared_mobile/core/widgets/vpn_detection_wrapper.dart';
import 'package:kartseek_shared_mobile/core/blocs/region_event.dart';
import 'package:kartseek_shared_mobile/features/auth/blocs/auth_bloc.dart';
import 'package:kartseek_shared_mobile/features/auth/blocs/auth_event.dart';
import 'package:kartseek_shared_mobile/features/taxi/blocs/taxi_bloc.dart';
import 'package:kartseek_shared_mobile/core/services/background_refresh_service.dart';
import 'package:kartseek_shared_mobile/core/services/platform_sync_service.dart';
import 'package:kartseek_shared_mobile/core/services/user_behavior_service.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';
import 'package:kartseek_shared_mobile/core/constants.dart';
import 'package:kartseek_partner/features/shared/blocs/partner_bloc.dart';
import 'package:kartseek_partner/features/shared/theme/partner_theme.dart';
import 'package:kartseek_partner/features/notifications/services/local_notification_service.dart';
import 'package:kartseek_partner/features/shared/widgets/offline_banner.dart';
import 'package:kartseek_partner/routing/partner_router.dart';

/// KARTSEEK Partner App — Entry Point
///
/// Launches the unified partner/driver application with multi-regional awareness.
/// On startup:
/// 1. Loads cached region for instant startup
/// 2. Detects the partner's region via IP (GPS detection happens after login)
/// 3. Scopes delivery requests and ride assignments to the partner's region
/// 4. Manages background refresh and cross-platform sync
///
/// Performance: Heavy services (PlatformSync, BackgroundRefresh, UserBehavior)
/// are deferred to after the first frame renders, preventing startup jank.
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConstants.initializeHost();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.white,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));

  // Load cached region synchronously for instant region-aware startup.
  // This reads from SharedPreferences and is very fast (<10ms).
  await RegionService.instance.loadCachedRegion();

  runApp(const _KartseekPartnerApp());
}

class _KartseekPartnerApp extends StatefulWidget {
  const _KartseekPartnerApp();

  @override
  State<_KartseekPartnerApp> createState() => _KartseekPartnerAppState();
}

class _KartseekPartnerAppState extends State<_KartseekPartnerApp>
    with WidgetsBindingObserver {

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Defer all heavy service initialization until AFTER the first frame renders.
    // This prevents "Skipped N frames" jank by letting the login screen paint first.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeServicesAsync();
    });
  }

  /// Initialize non-critical services after the first frame is rendered.
  /// These services run on timers/sockets and don't need to block the UI.
  Future<void> _initializeServicesAsync() async {
    // User behavior tracking (reads from SharedPreferences)
    await UserBehaviorService.instance.initialize();

    // Local notifications — channels + permission request
    await LocalNotificationService.instance.initialize();
    await LocalNotificationService.instance.requestPermission();

    // Platform sync — starts periodic health-check timers
    PlatformSyncService.instance.initialize();

    // Background refresh — starts FG/BG periodic timers + heartbeat
    BackgroundRefreshService.instance.start();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    BackgroundRefreshService.instance.stop();
    super.dispose();
  }

  /// React to app lifecycle changes for background refresh management.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final refreshService = BackgroundRefreshService.instance;

    switch (state) {
      case AppLifecycleState.resumed:
        // App came to foreground — trigger immediate refresh
        refreshService.onAppResumed();
        debugPrint('[PartnerApp] 🟢 Resumed — foreground refresh active');
        break;
      case AppLifecycleState.paused:
        // App went to background — switch to lower-frequency polling
        refreshService.onAppPaused();
        debugPrint('[PartnerApp] 🟡 Paused — background refresh active');
        break;
      case AppLifecycleState.inactive:
        // App is transitioning (e.g., multitask view)
        debugPrint('[PartnerApp] ⚪ Inactive');
        break;
      case AppLifecycleState.detached:
        // App is being terminated
        refreshService.stop();
        debugPrint('[PartnerApp] 🔴 Detached — refresh stopped');
        break;
      case AppLifecycleState.hidden:
        refreshService.onAppPaused();
        debugPrint('[PartnerApp] 🟤 Hidden — background refresh active');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => LocaleProvider()..initialize(),
      child: Consumer<LocaleProvider>(
        builder: (context, localeProvider, _) => MultiBlocProvider(
          providers: [
            // ── Region (GLOBAL — must be first, scopes all partner data) ─────────
            BlocProvider<RegionBloc>(
              create: (_) => RegionBloc()..add(const DetectRegionFromIp()),
            ),
            BlocProvider<AuthBloc>(
              create: (_) => AuthBloc()..add(const CheckAuthStatus()),
            ),
            BlocProvider<PartnerBloc>(
              create: (_) => PartnerBloc(),
            ),
            BlocProvider<TaxiBloc>(
              create: (_) => TaxiBloc(),
            ),
          ],
          child: VpnDetectionWrapper(
            child: MaterialApp(
              title: 'KARTSEEK Partner',
              debugShowCheckedModeBanner: false,
              // ── Locale Auto-Adaptation ──────────────────────────────────────────
              locale: localeProvider.appLocale,
              supportedLocales: localeProvider.supportedLocales,
              // Without these, Material/Cupertino widgets ship English strings
              // only and RTL system UI never flips, however `locale` is set.
              localizationsDelegates: const [
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              theme: ThemeData(
                useMaterial3: true,
                primaryColor: PartnerTheme.primary,
                scaffoldBackgroundColor: PartnerTheme.surface,
                fontFamily: 'Inter',
                colorScheme: const ColorScheme.light(
                  primary: PartnerTheme.primary,
                  secondary: PartnerTheme.accent,
                  surface: PartnerTheme.card,
                  error: PartnerTheme.offlineRed,
                ),
                appBarTheme: const AppBarTheme(
                  elevation: 0,
                  backgroundColor: Colors.white,
                  foregroundColor: PartnerTheme.textPrimary,
                ),
              ),
              initialRoute: PartnerRouter.partnerLogin,
              onGenerateRoute: PartnerRouter.generateRoute,
              builder: (context, child) {
                return Directionality(
                  textDirection: localeProvider.textDirection,
                  child: OfflineBanner(child: child!),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
