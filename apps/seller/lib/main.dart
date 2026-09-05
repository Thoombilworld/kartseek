import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter/services.dart';
import 'package:kartseek_shared_mobile/core/providers/locale_provider.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:provider/provider.dart';
import 'package:kartseek_seller/features/shared/theme/seller_theme.dart';
import 'package:kartseek_seller/features/shared/blocs/seller_bloc.dart';
import 'package:kartseek_seller/features/seller_marketplace/blocs/marketplace_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_grocery/blocs/grocery_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_restaurant/blocs/restaurant_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_pharmacy/blocs/pharmacy_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/blocs/doctor_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_doctor/services/webrtc_service.dart';
import 'package:kartseek_seller/features/seller_hotel/blocs/hotel_seller_bloc.dart';
import 'package:kartseek_seller/features/seller_taxi_vendor/blocs/taxi_vendor_bloc.dart';
import 'package:kartseek_seller/routing/seller_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ── System UI ────────────────────────────────────────────────────────────
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.white,
  ));
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // kartseek_shared_mobile services initialize lazily on first use.

  runApp(const SellerApp());
}

class SellerApp extends StatelessWidget {
  const SellerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // ── WebRTC (doctor module — provided globally so it survives navigation) ──
        ChangeNotifierProvider(create: (_) => WebRtcService()),
      ],
      child: MultiBlocProvider(
        providers: [
          // ── Central seller state (auth, profile, real-time events) ───────────
          BlocProvider<SellerBloc>(create: (_) => SellerBloc()),

          // ── Module BLoCs ────────────────────────────────────────────────────
          BlocProvider<MarketplaceSellerBloc>(create: (_) => MarketplaceSellerBloc()),
          BlocProvider<GrocerySellerBloc>(create: (_) => GrocerySellerBloc()),
          BlocProvider<RestaurantSellerBloc>(create: (_) => RestaurantSellerBloc()),
          BlocProvider<PharmacySellerBloc>(create: (_) => PharmacySellerBloc()),
          BlocProvider<DoctorSellerBloc>(create: (_) => DoctorSellerBloc()),
          BlocProvider<HotelSellerBloc>(create: (_) => HotelSellerBloc()),
          BlocProvider<TaxiVendorBloc>(create: (_) => TaxiVendorBloc()),
        ],
        child: MaterialApp(
          title: 'KARTSEEK Seller',
          debugShowCheckedModeBanner: false,
          theme: SellerTheme.theme,
          // ── Locale ──────────────────────────────────────────────────────────
          // Unlike customer/partner this app does not mount LocaleProvider, so
          // no `locale` is forced — Flutter resolves the device locale against
          // the list below. The delegates are what actually give Material and
          // Cupertino widgets non-English strings and RTL behaviour.
          supportedLocales: AppLanguage.values.map((l) => l.locale).toList(),
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          // Start at login — SellerLoginScreen will navigate to the correct
          // module dashboard after authentication succeeds.
          initialRoute: SellerRouter.login,
          routes: SellerRouter.routes(),
          onGenerateRoute: SellerRouter.onGenerateRoute,
        ),
      ),
    );
  }
}
