# KARTSEEK API Testing — Postman Collections

Complete end-to-end API testing suite for the **KARTSEEK Super App** platform.

## 📋 Overview

| Metric | Value |
|--------|-------|
| **Collections** | 31 |
| **Total Endpoints** | 350+ |
| **Test Requests** | 2000+ |
| **Environment Files** | 8 (Local, Staging, Production, India, Qatar, UAE, UK, USA) |
| **Modules Covered** | Auth, Marketplace, Grocery, Restaurant, Pharmacy, Doctor, Taxi, Hotel, Wallet, Delivery, Admin, SEO, Security |

## 🚀 Quick Start

### 1. Import into Postman Desktop

1. Open Postman Desktop
2. Click **Import** → **Folder**
3. Select `docs/api/postman/collections/`
4. Import all 31 collection files
5. Click **Import** again → select environment files from `docs/api/postman/environments/`
6. Select **KARTSEEK — Local Development** as your active environment

### 2. Initial Setup

Before running any tests, execute the **Auth collection** first to populate authentication tokens:

1. Open `01 Auth & User Management`
2. Run `Authentication → Customer Registration` or `Customer Login`
3. The test scripts automatically store tokens in environment variables:
   - `user_token` — Customer JWT
   - `admin_token` — Admin JWT
   - `seller_token` — Seller JWT

### 3. Run with Collection Runner

1. Open any collection
2. Click **Run** → **Run Collection**
3. Select your environment
4. Click **Run** to execute all requests

## 🔧 Running with Newman (CLI)

### Install Newman

```bash
npm install -g newman newman-reporter-htmlextra
```

### Run a Single Collection

```bash
newman run docs/api/postman/collections/01-auth-user-management.postman_collection.json \
  -e docs/api/postman/environments/KARTSEEK_Local.postman_environment.json \
  --reporters cli,json
```

### Run All Collections

```bash
node docs/api/postman/scripts/run-all.js
```

### Run with Options

```bash
# Against staging
node docs/api/postman/scripts/run-all.js --env staging

# Critical paths only (for CI/CD)
node docs/api/postman/scripts/run-all.js --critical-only

# Single collection
node docs/api/postman/scripts/run-all.js --collection 16

# Stop on first failure
node docs/api/postman/scripts/run-all.js --bail
```

## 📂 Directory Structure

```
docs/api/postman/
├── collections/                          # 31 Postman collection JSON files
│   ├── 01-auth-user-management.json      # Auth, registration, OTP, tokens
│   ├── 02-api-gateway.json               # Health, readiness, Swagger
│   ├── 03-customer-app.json              # Super App home, localization
│   ├── 04-website-apis.json              # SSR, SEO, public content
│   ├── 05-admin-panel.json               # Admin: sellers, products, banners
│   ├── 06-marketplace.json               # Customer marketplace
│   ├── 07-marketplace-seller.json        # Seller portal
│   ├── 08-grocery.json                   # Customer grocery
│   ├── 09-grocery-seller.json            # Grocery seller portal
│   ├── 10-restaurant.json                # Customer restaurant
│   ├── 11-restaurant-partner.json        # Restaurant partner portal
│   ├── 12-pharmacy.json                  # Customer pharmacy
│   ├── 13-pharmacy-seller.json           # Pharmacy seller portal
│   ├── 14-doctor-appointment.json        # Patient appointments
│   ├── 15-doctor-hospital-portal.json    # Doctor/hospital portal
│   ├── 16-taxi-booking.json              # Customer taxi booking
│   ├── 17-taxi-driver-delivery.json      # Driver & delivery partner
│   ├── 18-taxi-vendor.json               # Taxi vendor portal
│   ├── 19-hotel-booking.json             # Customer hotel booking
│   ├── 20-hotel-owner.json               # Hotel owner portal
│   ├── 21-franchise.json                 # Franchise management
│   ├── 22-wallet-payment-settlement.json # Wallet, payments, settlements
│   ├── 23-notifications.json             # Push, SMS, email
│   ├── 24-upload-media.json              # File uploads (KYC, images)
│   ├── 25-search.json                    # Full-text search
│   ├── 26-location-maps.json             # Location, geocoding, geo-security
│   ├── 27-analytics-reports.json         # Reports & analytics
│   ├── 28-seo-aeo-geo.json              # SEO management
│   ├── 29-support-complaints.json        # Support & SOS
│   ├── 30-security-compliance.json       # Security testing
│   └── 31-loyalty.json                   # Loyalty points
├── environments/                         # 8 environment files
│   ├── KARTSEEK_Local.json               # localhost:3001
│   ├── KARTSEEK_Staging.json             # api-staging.kartseek.com
│   ├── KARTSEEK_Production.json          # api.kartseek.com
│   ├── KARTSEEK_India.json               # IN, INR, GST
│   ├── KARTSEEK_Qatar.json               # QA, QAR, VAT
│   ├── KARTSEEK_UAE.json                 # AE, AED, VAT
│   ├── KARTSEEK_UK.json                  # GB, GBP, VAT
│   └── KARTSEEK_USA.json                 # US, USD, Sales Tax
├── data/                                 # Test data for data-driven tests
│   ├── test-users.json                   # 13 users across roles & countries
│   ├── test-products.json                # Products across all modules
│   ├── test-orders.json                  # Orders for all service types
│   └── test-countries.json               # 5 country configs
├── scripts/
│   ├── generate-collections.js           # Regenerates all collections
│   └── run-all.js                        # Newman batch runner
├── reports/                              # Newman test reports (gitignored)
├── newman.config.js                      # Newman configuration
└── README.md                             # This file
```

## 🔐 Environment Variables

All requests use Postman variables. **Never hardcode tokens, passwords, or API keys.**

### Authentication Tokens (Auto-populated)

| Variable | Description |
|----------|-------------|
| `user_token` | Customer JWT access token |
| `admin_token` | Admin JWT access token |
| `seller_token` | Seller JWT access token |
| `partner_token` | Delivery partner JWT |
| `driver_token` | Taxi driver JWT |
| `doctor_token` | Doctor portal JWT |
| `hotel_owner_token` | Hotel owner JWT |
| `vendor_token` | Taxi vendor JWT |
| `franchise_token` | Franchise owner JWT |
| `refresh_token` | Refresh token for renewal |

### Resource IDs (Auto-populated from create responses)

| Variable | Description |
|----------|-------------|
| `customer_id` | Current customer user ID |
| `seller_id` | Active seller ID |
| `order_id` | Last created order ID |
| `booking_id` | Last appointment/hotel booking ID |
| `ride_id` | Last taxi ride ID |
| `product_id` | Test product ID |

### Configuration (Per-environment)

| Variable | Local | India | Qatar | UAE | UK | USA |
|----------|-------|-------|-------|-----|----|----|
| `country_code` | IN | IN | QA | AE | GB | US |
| `currency_code` | INR | INR | QAR | AED | GBP | USD |
| `language_code` | en | en | ar | en | en | en |

## 🧪 Test Scripts

Every API request includes automated test scripts:

```javascript
// ✅ Status code validation
pm.test("Status code is successful", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});

// ⏱️ Response time assertion
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

// 📋 JSON structure validation
pm.test("Response has JSON body", function () {
    pm.response.to.be.json;
});

// ✅ Success field validation
pm.test("Response includes success status", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("success");
});
```

### Error Test Scripts

Negative test cases validate specific error codes:
- `400` Bad Request — Missing/invalid fields
- `401` Unauthorized — Missing/expired/invalid tokens
- `403` Forbidden — Role-based access violations
- `404` Not Found — Invalid resource IDs
- `409` Conflict — Duplicate records

## 🛡️ Security Testing (Collection #30)

Comprehensive security validation:

- **JWT Security**: Missing headers, invalid tokens, expired tokens, manipulated payloads
- **Role Escalation**: Customer→Admin, Seller→Other Seller, Driver→Customer data
- **Injection**: SQL injection, NoSQL injection, XSS payloads
- **File Upload**: Oversized files, invalid MIME types
- **DDoS Admin**: IP bans, whitelists, attack mode management

## 🌍 Multi-Country Testing

Each region environment provides:
- Country-specific `base_url`
- Local currency (`INR`, `QAR`, `AED`, `GBP`, `USD`)
- Tax type (`GST`, `VAT`, `SALES_TAX`)
- Phone number format
- GPS coordinates for location-based services
- Language code

## 🔄 CI/CD Integration

The API tests run automatically in GitHub Actions via the `api-contract-test` job in `.github/workflows/api-ci.yml`.

### When Tests Run
- On push to `main` or `develop` branches
- On pull requests targeting `main` or `develop`
- When any file in `apps/api/` changes

### Critical Path Collections (CI)
These must pass for deployment:
1. Auth & User Management
2. API Gateway
3. Marketplace
4. Grocery
5. Restaurant
6. Taxi Booking
7. Wallet & Payment
8. Security & Compliance

### Local CI Simulation

```bash
# Run what CI runs
node docs/api/postman/scripts/run-all.js --critical-only --bail
```

## 🔄 Regenerating Collections

If you add new API endpoints, update the generator and regenerate:

```bash
# Edit the generator
code docs/api/postman/scripts/generate-collections.js

# Regenerate all 31 collections
node docs/api/postman/scripts/generate-collections.js
```

## 📊 Reports

Newman generates reports in `docs/api/postman/reports/`:
- `summary.json` — Aggregated pass/fail summary
- `*-report.json` — Per-collection detailed results

## ⚠️ Important Notes

1. **Run Auth first** — All other collections depend on tokens from the Auth collection
2. **Never commit real tokens** — Production environment values must stay empty
3. **Test data only** — The `data/` directory contains synthetic test data only
4. **Regenerate after API changes** — Run the generator script after adding new endpoints
5. **Prescription compliance** — Pharmacy tests validate that Rx-required medicines block checkout without verified prescriptions
6. **Room double-booking** — Hotel tests verify concurrent booking prevention
7. **Geo-fencing** — Grocery tests validate delivery radius restrictions
