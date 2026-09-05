# KARTSEEK Mobile Apps

## Architecture

The KARTSEEK mobile platform consists of **three distinct Flutter applications** sharing a common code layer:

```text
apps/
├── customer/               ← Customer App (Android + iOS)
├── partner/                ← Partner App — Taxi Driver + Delivery (Android + iOS)
├── seller/                 ← Seller App — Vendor Portal (Android + iOS)
├── api/                    ← NestJS Backend API
└── web/                    ← Next.js Web Portal

packages/
├── shared-mobile/          ← Shared Dart package (core infrastructure)
└── native-bindings/        ← FFI native bindings
```

### Customer App (`apps/customer`)

- **Package**: `kartseek_customer`
- **App ID**: `com.kartseek.customer`
- **Version**: `1.1.0+3`
- **Target**: End consumers
- **Modules**: Marketplace, Grocery, Restaurant, Pharmacy, Doctor, Taxi Booking
- **Entry**: `lib/main.dart`

### Partner App (`apps/partner`)

- **Package**: `kartseek_partner`
- **App ID**: `com.kartseek.partner`
- **Version**: `1.1.0+3`
- **Target**: Taxi Drivers + Delivery Partners (unified)
- **Modules**: Dashboard, Rides, Deliveries, Earnings, Profile, KYC, Notifications, Support
- **Entry**: `lib/main.dart`

### Seller App (`apps/seller`)

- **Package**: `kartseek_seller`
- **App ID**: `com.kartseek.seller`
- **Version**: `1.0.0+1`
- **Target**: Vendors (Restaurants, Groceries, Pharmacies, Doctors)
- **Entry**: `lib/main.dart`

### Shared Mobile (`packages/shared-mobile`)

- **Package**: `shared-mobile`
- **Contains**: Core infrastructure shared by all three apps
  - API Client, Theme, Constants, Utils, Widgets
  - Region detection (GPS/IP)
  - Auth blocs and screens
  - Taxi blocs (used by both booking and driving sides)
  - Security layer (SSL pinning, device security)
  - WebSocket services

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Flutter | 3.44.0+ | Stable channel |
| Dart | 3.12.0+ | Bundled with Flutter |
| Android SDK | API 36 (compileSdk) | Android Studio or CLI tools |
| Kotlin | 2.4.0 | Set in `settings.gradle` |
| AGP | 8.11.1 | Set in `settings.gradle` |
| Xcode | 16.0+ | For iOS builds (macOS only) |
| iOS Target | 15.0+ | Set in Podfile |

## Environment Setup

1. Copy the environment templates:

   ```bash
   cp apps/customer/.env.example apps/customer/.env
   cp apps/partner/.env.example apps/partner/.env
   ```

2. Fill in your **Google Maps API Key** (required for Taxi, Grocery maps)
3. Configure API base URL if not running locally on port 3001

## Getting Started

```bash
# 1. Install shared dependencies
cd packages/shared-mobile && flutter pub get

# 2. Customer App
cd apps/customer && flutter pub get
flutter run  # Launches customer app

# 3. Partner App
cd apps/partner && flutter pub get
flutter run  # Launches partner app

# 4. Seller App
cd apps/seller && flutter pub get
flutter run  # Launches seller app
```

## Building for Release

### Android APK

```bash
cd apps/customer

# Debug APK (for testing)
flutter build apk --debug

# Release APK (minified, signed)
flutter build apk --release --no-tree-shake-icons

# App Bundle for Play Store
flutter build appbundle --release
```

> **Note**: Release builds require signing configuration. See `android/app/build.gradle` → `signingConfigs.release` and your `.env` file for keystore setup.

### iOS IPA (macOS only)

```bash
cd apps/customer

# Install CocoaPods
cd ios && pod install && cd ..

# Build for release (no code signing for CI)
flutter build ios --release --no-codesign

# Build for App Store
flutter build ipa --release
```

> **Note**: iOS builds require macOS, Xcode 16+, and valid Apple Developer signing certificates.

## Project Structure (Customer App)

```text
lib/
├── main.dart                           ← App entry point
├── routing/
│   └── customer_router.dart            ← All 80+ routes
└── features/
    ├── home/                           ← Super App dashboard
    │   ├── screens/                    ← Home, search, notifications, settings, orders
    │   └── widgets/                    ← Offline banner
    ├── marketplace/                    ← E-commerce (30 screens)
    │   ├── blocs/
    │   ├── models/
    │   ├── providers/
    │   ├── repositories/
    │   ├── screens/
    │   ├── services/
    │   ├── states/
    │   └── widgets/
    ├── grocery/                        ← Grocery delivery (5 screens)
    ├── restaurant/                     ← Food ordering (17 screens)
    ├── pharmacy/                       ← Medicine delivery (8 screens)
    ├── doctor/                         ← Telemedicine (2 screens)
    ├── taxi/                           ← Ride booking (4 screens)
    ├── cart/                           ← Universal cart
    ├── checkout/                       ← Checkout flow
    ├── orders/                         ← Order management
    ├── wishlist/                       ← Saved items
    ├── profile/                        ← User profile (13 screens)
    ├── returns/                        ← Return/refund flow
    ├── support/                        ← Help & support
    └── notifications/                  ← Local notification service
```

## Project Structure (Partner App)

```text
lib/
├── main.dart                           ← App entry point
├── routing/
│   └── partner_router.dart             ← All 30+ partner routes
└── features/
    ├── auth/                           ← Partner login, OTP, registration
    ├── dashboard/                      ← Role selection, driver/delivery dashboards
    ├── rides/                          ← Taxi driver flows (7 screens)
    │   └── screens/                    ← Incoming requests, active trip, OTP, payment, history
    ├── deliveries/                     ← Delivery partner flows (6 screens)
    │   └── screens/                    ← Incoming orders, active delivery, OTP, payment, history
    ├── earnings/                       ← Earnings, wallet, ledger
    ├── profile/                        ← Profile, documents, KYC, bank, vehicle
    ├── notifications/                  ← Local notification service (ride/delivery channels)
    ├── settings/                       ← App settings, ratings
    ├── support/                        ← Help & support
    └── shared/                         ← Partner-specific shared code
        ├── blocs/                      ← PartnerBloc
        ├── models/                     ← Partner data models
        ├── providers/                  ← Partner providers
        ├── services/                   ← Partner API services
        ├── theme/                      ← PartnerTheme (indigo branding)
        └── widgets/                    ← Offline banner, shared widgets
```

## Building Partner App for Release

### Android APK

```bash
cd apps/partner

# Debug APK
flutter build apk --debug

# Release APK
flutter build apk --release --no-tree-shake-icons

# App Bundle for Play Store
flutter build appbundle --release
```

### iOS IPA (macOS only)

```bash
cd apps/partner
cd ios && pod install && cd ..
flutter build ipa --release
```

## Migration from Legacy

The original monolithic `apps/mobile/` has been split. Run the migration script to copy feature files:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/migrate_two_apps.ps1
```
