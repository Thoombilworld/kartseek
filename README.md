# KARTSEEK Super App — Final Production README

**Project type:** Multi-service super app + responsive website + management ecosystem  
**Target platforms:** Flutter Android, Flutter iOS, Next.js/React web, PWA, Admin Panel, Seller Portal, Franchise Dashboard, Driver/Delivery apps  
**Purpose:** This is the official developer handover document. It defines the complete architecture, modules, file structures, and production rules for building the KARTSEEK platform.

> **CRITICAL WARNING:** This project is **not a demo**. Every screen, API, module, category, form, workflow, admin control, and mobile layout must be designed and developed for real-world use, extreme scalability, and strict security compliance.

---

## 1. Project Overview
KARTSEEK is a scalable, multi-country Super App that combines Marketplace, Grocery, Restaurant, Pharmacy, Doctor Appointments, Taxi Booking, Wallet, Loyalty, Seller Management, Franchise Management, and global Admin Control into a single, unified ecosystem.

The system intelligently uses GPS and IP geolocation to detect the user's country and city, presenting localized storefronts, currencies, tax rules, and nearby vendors. The platform handles end-to-end commerce—from user discovery and secure payment to physical logistics delivery and partner payouts.

---

## 2. Monorepo Structure

```
KARTSEEKAPP/
├── apps/
│   ├── api/                ← NestJS Backend (26 microservices + 14 shared libraries)
│   ├── mobile/             ← Flutter Mobile (Customer + Partner/Driver apps)
│   └── web/                ← Next.js Web (Customer, Admin, Seller, Franchise portals)
├── design-system/
│   └── tokens/             ← Design tokens (colors, typography, spacing, etc.)
├── docs/                   ← Project specification & setup guides
├── scripts/                ← Utility & automation scripts (api, mobile, web)
├── docker-compose.yml      ← Local infrastructure (PostgreSQL, Redis, Kafka, MongoDB)
├── package.json            ← Monorepo root (npm workspaces + Turborepo)
└── turbo.json              ← Turborepo pipeline configuration
```

---

## 3. Technology Stack

- **Mobile Apps:** Flutter (Android & iOS)
- **Web Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, PWA support
- **Backend Microservices:** NestJS
- **Databases:** PostgreSQL (Transactional), Redis (Cache & Session)
- **Search Engine:** Elasticsearch / OpenSearch
- **File Storage:** S3-compatible Object Storage (AWS/Cloudflare)
- **Infrastructure:** Docker, Kubernetes, API Gateway
- **Real-time Engine:** WebSocket / Socket.IO (for Taxi & Delivery tracking)

---

## 4. Architecture

- **Microservices Architecture:** Independent NestJS services for Auth, Users, Location, Marketplace, Grocery, Restaurant, Taxi, Wallet, etc.
- **Subdomain Routing & Storefronts:** Dynamic routing maps (e.g., `in.kartseek.com`, `ae.kartseek.com`, `seller.kartseek.com`) to localized configs.
- **Dynamic Design Tokens:** The backend controls fonts, primary colors, and UI radii, feeding tokens to Flutter and React clients.
- **Secure API Gateway:** Centralized routing, rate limiting, and JWT validation.
- **Role-Based Access Control (RBAC):** Strict boundaries between Customers, Sellers, Drivers, Franchisees, and Super Admins.

---

## 5. UI/UX Design System

- **Mobile-First Flutter:** Dedicated native screens with touch-friendly targets, bottom navigation, and smooth center-anchored scrolling.
- **Responsive Web:** Next.js layouts gracefully scale from mobile browsers up to 1440px+ desktop grids.
- **Typography:** Modern Sans-Serif (Inter/Roboto). Highly readable hierarchy (H1 down to Caption). Minimum mobile size 14px.
- **Semantic Colors:** Primary accent for actions, Emerald for success, Amber for pending/warnings, Red for errors. No random hardcoded hex values.
- **Soft UI Cards:** Subtle shadows, rounded corners, clean padding.
- **State Handling:** Skeleton loaders for fetching, clear empty states ("No nearby stores"), and descriptive error states.

---

## 6. Module-by-Module Plan

### 6.1 Marketplace
- **Scope:** Nationwide e-commerce (Electronics, Fashion, Home). Brand verification required.
- **Flow:** Search → Filter variants → Add to Cart → Payment → Nationwide Shipping Tracking.
- **Admin/Seller:** Inventory management, brand registry, bulk product upload, variant control.

### 6.2 Grocery
- **Scope:** Hyperlocal delivery (Default 10km GPS radius).
- **Flow:** Detect Location → List Nearby Stores → Category Browse → Cart → Delivery Slot → Live Tracking.
- **Admin/Seller:** Local inventory sync, fast-moving consumer goods tracking, fresh produce weight variants.

### 6.3 Restaurant
- **Scope:** Food delivery, takeaway, and table booking.
- **Flow:** Location → Nearby Restaurants → Veg/Non-Veg toggle → Add-ons/Modifiers → Cart → Live Prep & Delivery ETA.
- **Admin/Seller:** Menu management, order acceptance toggle, table reservation queue.

### 6.4 Pharmacy
- **Scope:** OTC medicines and Prescription drugs.
- **Flow:** Location → Find Pharmacy → Upload Prescription Document → Wait for Admin/Pharmacist Verification → Checkout.
- **Admin/Seller:** Secure prescription queue, medical license verification, OTC inventory.

### 6.5 Doctor Appointment
- **Scope:** Clinic/Hospital physical visits and Video consultations.
- **Flow:** Search Specialty/Symptom → Select Doctor → Pick Time Slot → Upload Past Reports (Optional) → Pay Consultation Fee.
- **Admin/Seller:** Schedule management, working hours configuration, medical board verification.

### 6.6 Taxi Booking
- **Scope:** Uber/Ola style ride-hailing.
- **Flow:** Pickup & Drop Pin → Fare Estimate → Request Ride → Driver Matching → OTP Handshake → Live Trip Tracking.
- **Admin/Fleet Vendor:** Live fleet map, SOS alerts, commission deductions per ride.

### 6.7 Delivery Logistics
- **Scope:** Centralized order distribution for Marketplace, Grocery, Restaurant, and Pharmacy.
- **Flow:** Order Ready → Assign Nearest Rider → Seller QR Handover → Live Customer Tracking → Delivery Confirmation (OTP).

### 6.8 Financials: Wallet, Loyalty, Payments & Payouts
- **Scope:** Unified money movement.
- **Flow:** Gateway processes Customer payment → Deduct Platform Commission → Escrow until Delivery → Settle to Seller/Driver Wallet. Users earn Loyalty Points per purchase.

### 6.9 Global Search & Location
- **Scope:** One search bar mapping to all modules.
- **Flow:** "Apple" returns iPhone (Marketplace), Fresh Apples (Grocery), and Apple Pie (Restaurant). GPS rigorously controls service visibility.

### 6.10 Notifications & Support
- **Scope:** Real-time updates via Push (FCM), Email, SMS, WhatsApp, and In-App alerts.
- **Flow:** Segmented notification center. Integrated support ticketing system (Open, Waiting for Customer, Resolved).

---

## 7. File Directory Structure

**Next.js Web (`/apps/web`)**
```text
/apps/web/src/
  ├── app/                  # App Router (Pages & Layouts)
  │   ├── (account)/        # Wallet, Loyalty, Profile
  │   ├── admin/            # Super Admin Dashboards
  │   ├── seller/           # Partner Portals
  │   ├── franchise/        # Regional Franchise
  │   ├── marketplace/      # E-Commerce Module
  │   ├── grocery/          # Hyperlocal Grocery
  │   ├── restaurant/       # Food Delivery
  │   ├── pharmacy/         # Medicine
  │   ├── doctor/           # Appointments
  │   ├── taxi/             # Ride Hailing
  │   └── search/           # Global Search
  ├── components/           # Reusable UI (Buttons, Cards, Inputs)
  ├── features/             # Module-specific logic
  └── lib/                  # Utils, API clients, Auth
```

**Flutter Mobile (`/apps/mobile`)**
```text
/lib/
  ├── core/                 # Theme, Network, Routing
  ├── features/             # Feature-driven structure
  │   ├── auth/
  │   ├── home/
  │   ├── marketplace/
  │   ├── taxi/
  │   └── profile/
  └── shared/               # Reusable widgets
```

**NestJS Backend (`/apps/api`)**
```text
/apps/
  ├── api-gateway/
  ├── auth-service/
  ├── order-service/
  ├── delivery-service/
  └── payment-service/
```

---

## 8. Admin, Seller, and Franchise System

- **Super Admin:** Global control. Configures country taxonomies, global commissions (e.g., 15% for Pharmacy, 20% for Food), layout themes, and approves top-level payouts.
- **Franchise Dashboard:** Regional control. A Franchisee in "Dubai" sees only Dubai's sellers, drivers, and orders, earning a fractional commission on regional volume.
- **Seller Portals:** Segmented by business type. A Doctor sees a schedule calendar; a Restaurant sees a live kitchen queue; a Marketplace vendor sees a bulk product CSV uploader.

---

## 9. Security and Compliance

- **Auth:** JWT access tokens with secure refresh token rotation.
- **KYC Verification:** Vendors and Drivers CANNOT go live until business licenses, tax IDs, and vehicle insurance documents are uploaded and approved by an Admin.
- **Data Privacy:** Prescription files and Medical reports are heavily restricted. They cannot be placed in public S3 buckets.
- **Audit Logs:** Every Admin action (changing a commission rate, approving a payout, updating user roles) is permanently logged with IP, Timestamp, and old/new values.
- **Financial Integrity:** No payment gateway secrets in the frontend. All payout math is strictly handled server-side.

---

## 10. Production Rules

1. **No Dummy Code:** Placeholder text, broken links, or "Coming Soon" demo pages are strictly prohibited in the `main` branch.
2. **Dynamic UI:** Do not hardcode specific hex colors into random components. Always use the design system tokens.
3. **Responsive Everywhere:** The Next.js platform must be perfectly usable on a 320px phone screen and a 1440px desktop monitor.
4. **Zero Exposed Secrets:** API keys, database passwords, and JWT secrets must remain strictly in environment variables.
5. **Log Everything:** Failed logins, successful payouts, and permission escalations must be securely audited.

---

## 11. Final QA Checklist

Prior to any deployment, QA must verify:
- [ ] Android & iOS Apps compile and run cleanly.
- [ ] Next.js PWA installs successfully.
- [ ] GPS detection accurately triggers the 10km Grocery/Food filters.
- [ ] Global Search correctly groups cross-module results.
- [ ] Payment gateway handshakes succeed without exposing keys.
- [ ] Admin RBAC prevents a "Support Agent" from triggering a financial Payout.
- [ ] Seller KYC rejection properly pauses a store's visibility.
- [ ] Taxi/Logistics live map correctly updates coordinates via WebSocket.
- [ ] SEO Meta Tags and dynamic Sitemaps render correctly on Web.

---

## 12. Developer Handover Instructions

**Pre-Development:**
- Read this `README.md` completely.
- Map your Jira/Linear tasks directly to the 10 modules defined above.
- Synchronize your mental model of the Monorepo (Web, Mobile, Backend).

**During Development:**
- Build one module at a time. Ensure the NestJS API, Flutter UI, and Next.js Web UI for that module are fully aligned before moving on.
- Construct Reusable UI Components early. Do not rewrite a "Product Card" 5 times.
- Document all Database Schema migrations thoroughly.

**Post-Development:**
- Execute the Full QA Checklist.
- Perform load testing on the Socket.IO delivery tracking infrastructure.
- Prepare staging environments and finalize CI/CD deployment pipelines.

> **Final Note to Developers:** KARTSEEK is a highly complex, multi-tenant ecosystem. Scalability, security, and clean separation of concerns are your top priorities. Build it right.
