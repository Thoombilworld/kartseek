import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_mobile/core/utils/responsive.dart';
import 'package:flutter/services.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:provider/provider.dart';
import 'package:shared_mobile/core/theme/app_theme.dart';
import 'package:shared_mobile/core/constants.dart';
import 'package:shared_mobile/core/blocs/region_bloc.dart';
import 'package:shared_mobile/core/providers/locale_provider.dart';
import 'package:shared_mobile/core/widgets/vpn_detection_wrapper.dart';
import 'package:shared_mobile/core/blocs/region_event.dart';
import 'package:shared_mobile/features/auth/blocs/auth_bloc.dart';
import 'package:shared_mobile/features/auth/blocs/auth_event.dart';
// Legacy taxi bloc removed — new taxi_booking module uses BookingBloc
import 'package:shared_mobile/core/services/background_refresh_service.dart';
import 'package:shared_mobile/core/services/platform_sync_service.dart';
import 'package:shared_mobile/core/services/user_behavior_service.dart';
import 'package:shared_mobile/core/services/region_service.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_bloc.dart';
import 'package:kartseek_customer/features/marketplace/blocs/marketplace_event.dart';
import 'package:kartseek_customer/features/restaurant/blocs/restaurant_bloc.dart';
import 'package:kartseek_customer/features/grocery/blocs/grocery_bloc.dart';
import 'package:kartseek_customer/features/pharmacy/blocs/pharmacy_bloc.dart';
import 'package:kartseek_customer/features/doctor/blocs/doctor_bloc.dart';
import 'package:kartseek_customer/features/cart/blocs/cart_bloc.dart';
import 'package:kartseek_customer/features/checkout/blocs/checkout_bloc.dart';
import 'package:kartseek_customer/features/orders/blocs/orders_bloc.dart';
import 'package:kartseek_customer/features/wishlist/blocs/wishlist_bloc.dart';
import 'package:kartseek_customer/features/hotel_booking/blocs/hotel_bloc.dart';
import 'package:kartseek_customer/routing/customer_router.dart';
import 'package:kartseek_customer/features/taxi_booking/presentation/widgets/car_marker_helper.dart';
import 'package:kartseek_customer/features/notifications/services/local_notification_service.dart';
import 'package:kartseek_customer/features/home/widgets/offline_banner.dart';

/// KARTSEEK Customer App — Entry Point
///
/// Launches the customer-facing Super App home with multi-regional
/// architecture. On startup:
/// 1. Detects the user's GPS location to resolve their operational region
/// 2. Falls back to IP-based detection if GPS is unavailable
/// 3. Scopes all API calls to the detected region (X-Region-Code header)
/// 4. Adjusts currency, vendors, and available services per region
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppConstants.initializeHost();

  // ── Performance: Set rendering optimizations ────────────────────────────
  debugDisableClipLayers = false;
  debugDisablePhysicalShapeLayers = false;

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

  // Load cached region for instant startup (before GPS detection)
  await RegionService.instance.loadCachedRegion();

  runApp(const _KartseekCustomerApp());
}

class _KartseekCustomerApp extends StatefulWidget {
  const _KartseekCustomerApp();

  @override
  State<_KartseekCustomerApp> createState() => _KartseekCustomerAppState();
}

class _KartseekCustomerAppState extends State<_KartseekCustomerApp>
    with WidgetsBindingObserver {

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Defer all heavy service initialization until AFTER the first frame renders.
    // This prevents "Skipped N frames" jank by letting the home screen paint first.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeServicesAsync();
    });
  }

  /// Initialize non-critical services after the first frame is rendered.
  /// These services run on timers/sockets and don't need to block the UI.
  Future<void> _initializeServicesAsync() async {
    // User behavior tracking (reads from SharedPreferences)
    try {
      await UserBehaviorService.instance.initialize();
    } catch (e) {
      debugPrint('[Init] ⚠️ UserBehavior init failed (non-fatal): $e');
    }

    // Local notifications — channels + permission request
    try {
      await LocalNotificationService.instance.initialize();
      await LocalNotificationService.instance.requestPermission();
    } catch (e) {
      debugPrint('[Init] ⚠️ LocalNotifications init failed (non-fatal): $e');
    }

    // Platform sync — starts periodic health-check timers
    try {
      PlatformSyncService.instance.initialize();
    } catch (e) {
      debugPrint('[Init] ⚠️ PlatformSync init failed (non-fatal): $e');
    }

    // Background refresh — starts FG/BG periodic timers + heartbeat
    try {
      BackgroundRefreshService.instance.start();
    } catch (e) {
      debugPrint('[Init] ⚠️ BackgroundRefresh init failed (non-fatal): $e');
    }

    // FIX 6: Pre-cache car marker icons so TaxiHomeScreen renders instantly
    try {
      CarMarkerHelper.preload();
    } catch (e) {
      debugPrint('[Init] ⚠️ CarMarkerHelper preload failed (non-fatal): $e');
    }

    // Camera discovery is LAZY — runs on first camera screen open
    // (avoids PlatformException on emulators without camera hardware)
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    BackgroundRefreshService.instance.stop();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final refreshService = BackgroundRefreshService.instance;

    switch (state) {
      case AppLifecycleState.resumed:
        refreshService.onAppResumed();
        debugPrint('[CustomerApp] 🟢 Resumed — foreground refresh active');
        break;
      case AppLifecycleState.paused:
        refreshService.onAppPaused();
        debugPrint('[CustomerApp] 🟡 Paused — background refresh active');
        break;
      case AppLifecycleState.inactive:
        debugPrint('[CustomerApp] ⚪ Inactive');
        break;
      case AppLifecycleState.detached:
        refreshService.stop();
        debugPrint('[CustomerApp] 🔴 Detached — refresh stopped');
        break;
      case AppLifecycleState.hidden:
        refreshService.onAppPaused();
        debugPrint('[CustomerApp] 🟤 Hidden — background refresh active');
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
            // ── Region (GLOBAL — must be first, scopes all downstream data) ──────
            BlocProvider<RegionBloc>(
              create: (_) => RegionBloc()..add(const DetectRegionFromGps(latitude: AppConstants.defaultLat, longitude: AppConstants.defaultLng)),
            ),
            // ── Auth (global — persists across all modules) ──────────────────────
            BlocProvider<AuthBloc>(
              create: (_) => AuthBloc()..add(const CheckAuthStatus()),
            ),
            // ── Marketplace (primary module — eager load) ────────────────────────
            BlocProvider<MarketplaceBloc>(
              create: (_) => MarketplaceBloc()..add(const LoadMarketplaceHome()),
            ),
            // ── Taxi: BookingBloc is provided at route level by taxi_booking_routes.dart
            // ── Cart (global — persists across modules) ─────────────────────────
            BlocProvider<CartBloc>(
              create: (_) => CartBloc(),
            ),

            // ── LAZY-LOADED MODULE BLOCS ─────────────────────────────────────────
            // These are only created when their module is first accessed,
            // reducing startup memory footprint and initialization time.
            BlocProvider<RestaurantBloc>(
              lazy: true,
              create: (_) => RestaurantBloc(),
            ),
            BlocProvider<GroceryBloc>(
              lazy: true,
              create: (_) => GroceryBloc(),
            ),
            BlocProvider<PharmacyBloc>(
              lazy: true,
              create: (_) => PharmacyBloc(),
            ),
            BlocProvider<DoctorBloc>(
              lazy: true,
              create: (_) => DoctorBloc(),
            ),
            BlocProvider<CheckoutBloc>(
              lazy: true,
              create: (_) => CheckoutBloc(),
            ),
            BlocProvider<OrdersBloc>(
              lazy: true,
              create: (_) => OrdersBloc(),
            ),
            BlocProvider<WishlistBloc>(
              lazy: true,
              create: (_) => WishlistBloc(),
            ),
            BlocProvider<HotelBloc>(
              lazy: true,
              create: (_) => HotelBloc(),
            ),
          ],
          child: VpnDetectionWrapper(
            child: MaterialApp(
              title: '${AppConstants.appName} - Customer',
              debugShowCheckedModeBanner: false,
              theme: AppTheme.lightTheme,
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
              initialRoute: CustomerRouter.home,
              onGenerateRoute: CustomerRouter.generateRoute,
              builder: (context, child) {
                Responsive.init(context);
                return Directionality(
                  textDirection: localeProvider.textDirection,
                  child: MediaQuery(
                    data: MediaQuery.of(context).copyWith(
                      textScaler: TextScaler.linear(MediaQuery.of(context).textScaler.scale(1.0).clamp(0.8, 1.2)),
                    ),
                    child: OfflineBanner(
                      onBackOnline: () {
                        BackgroundRefreshService.instance.forceRefresh();
                      },
                      child: child!,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
