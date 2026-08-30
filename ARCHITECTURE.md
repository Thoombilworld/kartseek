# KARTSEEK Architecture Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Frontend-Backend Interaction](#frontend-backend-interaction)
4. [File & Directory Structure](#file--directory-structure)
5. [Backend Technologies & Systems](#backend-technologies--systems)
6. [Core Features & Functionality](#core-features--functionality)
7. [Middleware Architecture](#middleware-architecture)
8. [Microservices Overview](#microservices-overview)

---

## Project Overview

**KARTSEEK** is a scalable multi-country super app combining:
- **Marketplace** (Electronics, Fashion, Home)
- **Grocery** (Hyperlocal delivery, 10km radius)
- **Restaurant** (Food delivery, takeaway, table booking)
- **Pharmacy** (OTC & prescription medicines)
- **Doctor Appointments** (Clinic visits & video consultations)
- **Taxi Booking** (Uber/Ola style ride-hailing)
- **Delivery Logistics** (Cross-module courier system)
- **Wallet & Payments** (Unified financial layer)
- **Loyalty Program** (Points per purchase)
- **Admin Panel** (Super admin, franchisees, sellers, drivers)

**Target Platforms:**
- Flutter (Android & iOS) — Native mobile apps for customers, drivers, and partners
- Next.js + React (Web) — Progressive Web App (PWA) for web customers and admin portals
- Admin Portal, Seller Portal, Franchise Dashboard — Role-based web access

---

## High-Level Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (Presentation)                     │
├──────────────────┬──────────────────┬──────────────────────────────┤
│  Flutter Mobile  │  Next.js Web     │  Admin Portals              │
│  (iOS/Android)   │  (PWA + SPA)     │  (Seller, Franchise, Driver)│
└─────────┬────────┴─────────┬────────┴──────────┬───────────────────┘
          │                  │                    │
          └──────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  API Gateway    │
                    │ (Load Balancer) │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼──────┐    ┌──────▼───────┐   ┌─────▼──────┐
    │ Auth Service│   │ Order Service │   │Marketplace │
    │ User Service│   │Payment Service│   │ Service    │
    │   (gRPC)   │   │ (Kafka)       │   │ (TCP)      │
    └────────────┘   └───────────────┘   └────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼──────┐    ┌──────▼───────┐   ┌─────▼──────┐
    │ PostgreSQL │    │  Redis Cache │   │   Kafka    │
    │  (Primary) │    │  (Sessions)  │   │(Event Bus) │
    └────────────┘   └───────────────┘   └────────────┘

    WebSocket Gateways:
    ├── Taxi Tracking (GPS streaming)
    ├── Delivery Tracking (Real-time)
    ├── Notifications (Push alerts)
    ├── Chat (In-app messaging)
    └── Order Updates (Lifecycle events)
```

### System Interaction Flow

1. **Client requests** originate from Flutter, Next.js, or admin portals
2. **API Gateway** (port 3000) routes requests via Express + NestJS
3. **Security middleware** validates JWT, checks rate limits, sanitizes input, detects DDoS
4. **Microservices** handle business logic (auth, orders, payments, etc.)
5. **Data persistence** via PostgreSQL (transactional) and Redis (cache/sessions)
6. **Event streaming** via Kafka for async operations (notifications, reporting)
7. **Real-time communication** via WebSocket gateways for taxi, delivery, chat, notifications

---

## Frontend-Backend Interaction

### REST API Flow

```
Client Request
    ↓
HTTP/HTTPS (port 3000)
    ↓
[CORS] → Check origin whitelist (localhost, *.kartseek.com)
    ↓
[Headers Timeout] → Max 15 seconds to receive headers
    ↓
[Security Headers] → Helmet: CSP, HSTS, X-Frame-Options, etc.
    ↓
[Request ID Middleware] → Assign X-Request-ID for distributed tracing
    ↓
[Input Sanitizer] → XSS, SQL injection, NoSQL injection, command injection prevention
    ↓
[DDoS Protection] → Rate limiting (100 requests/60s per IP)
    ↓
[JWT Validation Guard] → Verify access token (if protected route)
    ↓
[CSRF Guard] → Double-submit cookie pattern check
    ↓
[Route Handler] → Execute controller logic
    ↓
[PCI Compliance Interceptor] → Mask card numbers in responses
    ↓
[Transform Interceptor] → Standardize response format
    ↓
[Audit Interceptor] → Log sensitive operations
    ↓
HTTP Response (200, 400, 401, 429, 500, etc.)
    ↓
Client receives JSON response
```

### WebSocket Flow (Real-time tracking)

```
Client initiates WebSocket connection
    ↓
ws://localhost:3000/taxi (or /delivery, /notifications, /chat, /orders)
    ↓
[WS DDoS Guard] → Limit message rate per user (10 messages/second)
    ↓
[JWT Validation] → Verify user identity
    ↓
[Socket Events] → Client can emit/listen to namespace-specific events
    ↓
[Kafka Bridge] → If event originates from another service, Kafka → WebSocket
    ↓
Real-time data streamed to client
    ↓
Client receives: location updates, order status, chat messages, notifications
```

### Service-to-Service Communication

- **gRPC** (synchronous, low-latency): Auth Service, Order Service
- **TCP Microservices** (legacy, pending gRPC migration): Marketplace, Cart, Loyalty, Franchise, Doctor
- **Kafka** (asynchronous, event-driven): Order processing, notifications, loyalty points, audit logs

---

## File & Directory Structure

### Monorepo Layout

```
KARTSEEKAPP/
├── apps/
│   ├── api/                    ← NestJS Backend (26 microservices + shared libs)
│   │   ├── apps/               ← Individual microservices
│   │   │   ├── api-gateway/    ← Central routing & orchestration
│   │   │   ├── auth-service/   ← JWT, OAuth, session management
│   │   │   ├── user-service/   ← User profiles, KYC verification
│   │   │   ├── order-service/  ← Order lifecycle management
│   │   │   ├── payment-service/← Payment gateway integration
│   │   │   ├── delivery-service/← Partner assignment & tracking
│   │   │   ├── marketplace-service/ ← E-commerce catalog
│   │   │   ├── grocery-service/← Hyperlocal grocery inventory
│   │   │   ├── restaurant-service/ ← Restaurant menus & orders
│   │   │   ├── pharmacy-service/← Medicine inventory & RX verification
│   │   │   ├── doctor-service/ ← Doctor schedules & consultations
│   │   │   ├── taxi-service/   ← Ride-hailing, fare calculation, GPS
│   │   │   ├── location-service/← Geolocation & address mapping
│   │   │   ├── loyalty-service/← Points accumulation & redemption
│   │   │   ├── wallet-service/ ← Digital wallet, balance management
│   │   │   ├── notification-service/ ← FCM, email, SMS, WhatsApp
│   │   │   ├── admin-service/  ← Super admin controls
│   │   │   ├── franchise-service/ ← Regional franchisee management
│   │   │   ├── seller-service/ ← Seller portal & inventory management
│   │   │   ├── audit-log-service/ ← Compliance & audit logging
│   │   │   ├── search-service/ ← Global search with Elasticsearch
│   │   │   ├── commission-service/ ← Commission calculation
│   │   │   ├── payout-service/ ← Seller/driver payouts
│   │   │   ├── refund-service/ ← Refund processing
│   │   │   ├── report-service/ ← Analytics & reporting
│   │   │   ├── cart-service/   ← Shopping cart management
│   │   │   └── hotel-service/  ← Hotel booking (future vertical)
│   │   ├── libs/               ← Shared NestJS libraries
│   │   │   ├── common/         ← Common utilities, filters, interceptors
│   │   │   ├── database/       ← PostgreSQL setup & migrations
│   │   │   ├── security/       ← JWT, DDoS, encryption, PCI compliance
│   │   │   ├── guards/         ← Auth & authorization guards
│   │   │   ├── redis/          ← Redis client setup & caching
│   │   │   ├── kafka/          ← Kafka producer/consumer setup
│   │   │   ├── grpc/           ← gRPC client configuration
│   │   │   ├── region/         ← Multi-regional data architecture
│   │   │   └── gdpr/           ← Data privacy compliance utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── web/                    ← Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/            ← App Router (pages & layouts)
│   │   │   │   ├── (account)/  ← Wallet, Loyalty, Profile
│   │   │   │   ├── admin/      ← Super Admin Dashboard
│   │   │   │   ├── seller/     ← Seller Portal
│   │   │   │   ├── franchise/  ← Franchise Dashboard
│   │   │   │   ├── marketplace/← E-commerce storefront
│   │   │   │   ├── grocery/    ← Grocery module
│   │   │   │   ├── restaurant/ ← Food delivery
│   │   │   │   ├── pharmacy/   ← Pharmacy storefront
│   │   │   │   ├── doctor/     ← Doctor appointments
│   │   │   │   ├── taxi/       ← Taxi booking interface
│   │   │   │   ├── search/     ← Global search
│   │   │   │   └── api/        ← Route handlers & API utilities
│   │   │   ├── components/     ← Reusable UI components
│   │   │   ├── features/       ← Feature-specific logic (feature folders)
│   │   │   ├── lib/            ← Utils, API clients, auth context
│   │   │   ├── hooks/          ← Custom React hooks
│   │   │   └── styles/         ← Global CSS, Tailwind config
│   │   └── package.json
│   └── mobile/                 ← Flutter Application
│       ├── lib/
│       │   ├── core/           ← Theme, Network, Routing, Constants
│       │   ├── features/       ← Feature-driven screens & logic
│       │   │   ├── auth/
│       │   │   ├── home/
│       │   │   ├── marketplace/
│       │   │   ├── taxi/
│       │   │   ├── profile/
│       │   │   └── [other features]
│       │   ├── shared/         ← Reusable widgets & utilities
│       │   └── main.dart
│       └── pubspec.yaml
├── libs/                       ← Shared code (design tokens, utilities)
│   └── design-system/          ← Colors, typography, spacing tokens
├── docs/                       ← Project specification & guides
├── scripts/                    ← Automation & utility scripts
├── docker-compose.yml          ← Local infrastructure
├── nginx/                      ← Nginx reverse proxy config
├── package.json                ← Monorepo root (npm workspaces)
├── turbo.json                  ← Turborepo pipeline config
└── README.md                   ← Project handover document
```

### Backend Microservice Structure (Each service follows this pattern)

```
auth-service/
├── src/
│   ├── main.ts                 ← NestJS bootstrap
│   ├── auth.module.ts          ← Module definition
│   ├── auth.controller.ts      ← HTTP endpoints
│   ├── auth.service.ts         ← Business logic
│   ├── dto/                    ← Request/response DTOs
│   │   ├── login.dto.ts
│   │   ├── register.dto.ts
│   │   └── refresh-token.dto.ts
│   ├── entities/               ← TypeORM database entities
│   │   └── user.entity.ts
│   ├── guards/                 ← Authorization guards
│   │   └── jwt-auth.guard.ts
│   ├── interceptors/           ← Request/response interceptors
│   └── strategies/             ← Passport strategies
│       └── jwt.strategy.ts
├── test/
│   ├── auth.controller.spec.ts
│   └── auth.service.spec.ts
├── package.json
└── tsconfig.json
```

---

## Backend Technologies & Systems

### Core Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | NestJS 10+ | Server-side TypeScript framework with dependency injection |
| **Runtime** | Node.js 24+ | JavaScript runtime |
| **Language** | TypeScript | Type-safe development |
| **HTTP** | Express.js 5+ | Web server (integrated into NestJS) |

### Data Layer

| Technology | Purpose | Port | Notes |
|-----------|---------|------|-------|
| **PostgreSQL 16** | Primary transactional database | 5432 | With PostGIS for geospatial queries |
| **Redis 8.8** | Cache & session store | 6379 | 256MB max memory, LRU eviction |
| **TypeORM** | Object-relational mapping | — | Database migrations, entity definitions |

### Messaging & Events

| Technology | Purpose | Port | Notes |
|-----------|---------|------|-------|
| **Apache Kafka 4.3** | Event streaming & async tasks | 9092 | KRaft mode (no Zookeeper) |
| **Socket.IO** | WebSocket real-time communication | — | Integrated into API Gateway |

### API Communication

| Method | Protocol | Use Case | Example Services |
|--------|----------|----------|-------------------|
| **REST/HTTP** | HTTP 1.1 | Standard CRUD operations | All controllers expose REST |
| **gRPC** | HTTP/2 | Low-latency synchronous calls | Auth Service, Order Service |
| **TCP Microservices** | Custom binary | Legacy services (migration pending) | Marketplace, Cart, Loyalty, Doctor |
| **WebSocket** | ws/wss | Real-time streaming | Taxi tracking, delivery, notifications |

### Caching & Performance

- **Redis Cache**: Session tokens, rate-limit buckets, geolocation cache
- **Query Caching**: Automatic via Redis for frequently accessed data
- **Response Compression**: gzip compression via helmet middleware

### Security & Compliance

| System | Purpose |
|--------|---------|
| **Helmet.js** | HTTP security headers (HSTS, CSP, X-Frame-Options, etc.) |
| **JWT (Passport.js)** | Authentication via access & refresh tokens |
| **Bcryptjs** | Password hashing (10 salt rounds) |
| **CORS** | Cross-origin resource sharing control |
| **DDoS Protection** | Rate limiting, connection limiting, IP fingerprinting |
| **Input Sanitization** | XSS, SQL/NoSQL injection, command injection prevention |
| **PCI-DSS Compliance** | Credit card masking, secure payment token handling |
| **GDPR Compliance** | Data privacy, right to erasure, audit logs |
| **CSRF Protection** | Double-submit cookie pattern |
| **Account Lockout** | Progressive lockout after failed login attempts |

### Monitoring & Logging

- **NestJS Logger**: Error, warn, log, debug levels
- **Audit Logs**: All admin actions, payment transactions, compliance events
- **Request ID Tracking**: Distributed tracing via X-Request-ID header
- **Health Checks**: Liveness & readiness probes at `/health` endpoint

---

## Core Features & Functionality

### 1. Marketplace Module
**Purpose**: Nationwide e-commerce platform  
**Key Features**:
- Brand-verified product catalog (Electronics, Fashion, Home)
- Multi-variant products (sizes, colors, models)
- Nationwide shipping with tracking
- Admin brand registry & approval system
- Seller bulk product CSV upload
- Inventory management with real-time sync

**API Endpoints**:
- `GET /api/v1/marketplace/products` — Search & filter
- `POST /api/v1/marketplace/cart` — Add to cart
- `POST /api/v1/marketplace/orders` — Place order

---

### 2. Grocery Module
**Purpose**: Hyperlocal delivery (10km GPS radius)  
**Key Features**:
- GPS-based location detection
- Store proximity filtering
- Category-based browsing (Fresh, Snacks, Dairy)
- Weight-based variants (fresh produce)
- Delivery slot selection
- Live GPS tracking

**API Endpoints**:
- `GET /api/v1/grocery/stores` — List nearby stores (filtered by GPS radius)
- `GET /api/v1/grocery/products` — Browse store inventory
- `POST /api/v1/grocery/orders` — Place order with delivery slot

---

### 3. Restaurant Module
**Purpose**: Food delivery, takeaway, table booking  
**Key Features**:
- Location-based restaurant discovery
- Veg/Non-veg toggle
- Menu with modifiers (add-ons, extra sauce, etc.)
- Real-time order prep status
- Table reservation with queue management
- Takeaway option

**API Endpoints**:
- `GET /api/v1/restaurants` — List nearby restaurants
- `GET /api/v1/restaurants/:id/menu` — Fetch menu with modifiers
- `POST /api/v1/restaurants/orders` — Place food order

---

### 4. Pharmacy Module
**Purpose**: OTC & prescription medicine delivery  
**Key Features**:
- Prescription document upload & AI verification
- Pharmacist manual approval for RX drugs
- OTC inventory management
- Prescription history storage
- Compliance with regulations (doctor verification)

**API Endpoints**:
- `POST /api/v1/pharmacy/prescriptions/upload` — Upload prescription document
- `GET /api/v1/pharmacy/products` — OTC products
- `POST /api/v1/pharmacy/orders` — Order with prescription validation

---

### 5. Doctor Appointments
**Purpose**: Clinic visits & video consultations  
**Key Features**:
- Doctor specialty/symptom search
- Doctor profile with qualifications
- Time slot availability
- Video consultation infrastructure
- Medical report/past record upload
- Consultation fee payment

**API Endpoints**:
- `GET /api/v1/doctors?specialty=cardiology` — Search doctors
- `GET /api/v1/doctors/:id/slots` — Available time slots
- `POST /api/v1/doctors/appointments` — Book appointment

---

### 6. Taxi Module
**Purpose**: Ride-hailing (Uber/Ola style)  
**Key Features**:
- Pickup & drop location pinning
- Dynamic fare calculation (distance, surge)
- Real-time driver matching & GPS streaming
- OTP-based verification (driver pickup confirmation)
- SOS alerts for safety
- Commission deductions per ride
- Fleet vendor dashboard

**API Endpoints**:
- `POST /api/v1/taxi/estimate` — Get fare estimate
- `POST /api/v1/taxi/rides` — Request ride
- `WS /taxi` — WebSocket for GPS tracking

---

### 7. Delivery Logistics
**Purpose**: Unified courier system across all modules  
**Key Features**:
- Cross-service delivery partner assignment (Marketplace, Grocery, Restaurant, Pharmacy)
- Geolocation-based nearest rider matching
- Seller QR handover confirmation
- Live customer tracking
- OTP delivery confirmation
- Return order handling
- COD collection & reconciliation

**API Endpoints**:
- `POST /api/v1/delivery/tasks` — Create delivery task
- `PATCH /api/v1/delivery/tasks/:id/status` — Update task status
- `WS /delivery` — Real-time tracking updates

---

### 8. Wallet & Payment
**Purpose**: Unified financial movement  
**Key Features**:
- Digital wallet balance management
- Payment gateway integration
- Escrow holds during order fulfillment
- Instant settlement to seller/driver wallets
- Transaction history
- Refund processing

**API Endpoints**:
- `GET /api/v1/wallet/balance` — Current balance
- `POST /api/v1/payments/process` — Process payment
- `GET /api/v1/transactions` — History

---

### 9. Loyalty Program
**Purpose**: Points-based rewards  
**Key Features**:
- Points accumulation per purchase
- Points redemption for discounts
- Tiered loyalty levels (Silver, Gold, Platinum)
- Referral bonuses
- Expiry management

**API Endpoints**:
- `GET /api/v1/loyalty/points` — Current balance
- `GET /api/v1/loyalty/history` — Transaction history
- `POST /api/v1/loyalty/redeem` — Redeem points

---

### 10. Global Search
**Purpose**: Unified search across all modules  
**Key Features**:
- "Apple" returns: iPhone (Marketplace), Fresh Apples (Grocery), Apple Pie (Restaurant)
- GPS-filtered results (relevant to user location)
- Elasticsearch-backed full-text search
- Autocomplete suggestions
- Search analytics

**API Endpoints**:
- `GET /api/v1/search?q=apple` — Global search

---

### 11. Admin Panel
**Purpose**: Super admin controls  
**Key Features**:
- Global commission configuration
- Country & city taxonomy management
- Layout theme customization (colors, fonts)
- Top-level payout approvals
- KYC document verification queue
- Compliance reporting

**API Endpoints**:
- `GET /api/v1/admin/commissions` — View commission settings
- `PATCH /api/v1/admin/commissions` — Update commission rates
- `GET /api/v1/admin/kyc/pending` — KYC verification queue

---

### 12. Notifications
**Purpose**: Multi-channel real-time alerts  
**Key Features**:
- Push notifications (FCM)
- Email notifications
- SMS notifications
- WhatsApp notifications
- In-app notification center
- Notification preferences per user

**API Endpoints**:
- `POST /api/v1/notifications/send` — Send notification (admin only)
- `WS /notifications` — Real-time push alerts

---

## Middleware Architecture

### Request Processing Pipeline

The API Gateway applies middleware in strict order:

#### 1. **Helmet Security Headers Middleware**
- Sets CSP, HSTS, X-Frame-Options, nosniff, etc.
- Prevents clickjacking, MIME-sniffing, and other browser-level attacks
- Location: `main.ts` (Express global middleware)

#### 2. **Response Compression Middleware**
- Compresses responses using gzip
- Reduces bandwidth usage
- Location: `main.ts`

#### 3. **CORS Middleware**
- Validates origin against whitelist:
  - `localhost:3000` (Next.js dev)
  - `localhost:3001` (API Gateway Swagger)
  - `localhost:5173` (Vite dev tools)
  - `*.kartseek.com` (Production subdomains)
- Allowed headers: `Content-Type`, `Authorization`, `X-Request-ID`, `X-Client-Version`, `X-Region-Code`
- Location: `main.ts`

#### 4. **Request ID Middleware** (from `security/src/request-id.middleware.ts`)
**Purpose**: Distributed tracing correlation  
**Flow**:
- Checks if `X-Request-ID` header exists
- If not, generates UUID v4
- Adds to `request.id` and response header `X-Request-ID`
- All logs include this ID for traceability

#### 5. **Input Sanitizer Middleware** (from `security/src/input-sanitizer.middleware.ts`)
**Purpose**: Prevent injection attacks  
**Threats Prevented**:
- **SQL Injection**: Detects SQL metacharacters and keywords (DROP, DELETE, UNION, etc.)
- **NoSQL Injection**: Prevents MongoDB operators like `$ne`, `$gt`, `$regex`
- **XSS (Cross-Site Scripting)**: Escapes HTML entities and dangerous scripts
- **Command Injection**: Blocks shell metacharacters (`;`, `|`, `&`, `$()`, backticks)
**Implementation**:
- Scans request body, query params, and headers
- Uses regex patterns for each threat type
- Returns `400 Bad Request` if threat detected
- Logs attempt for audit trail

#### 6. **DDoS Protection Middleware** (from `security/src/ddos-protection.middleware.ts`)
**Purpose**: Prevent distributed denial of service attacks  
**Mechanisms**:
- **Rate Limiting**: 100 requests per 60 seconds per IP
- **Burst Detection**: Flags IPs exceeding rate limit; blocks for 5 minutes
- **Connection Limiting**: Max 10 concurrent requests per IP
- **Slowloris Detection**: Monitors header reception time; disconnects if > 15 seconds
- **IP Fingerprinting**: Tracks repeated offenders
**Thresholds**:
- Rate limit: `100 requests / 60s per IP`
- Burst threshold: `110% of rate limit`
- Burst cooldown: `5 minutes`
- Max concurrent connections: `10 per IP`
**Headers Used**:
- `X-Forwarded-For` (if behind proxy)
- `CF-Connecting-IP` (if behind Cloudflare)
- `X-Real-IP` (if behind reverse proxy)
**Response**:
- Returns `429 Too Many Requests` when rate limit exceeded
- Includes `Retry-After` header with cooldown seconds

#### 7. **JWT Validation Guard** (from `security/src/jwt-auth.guard.ts` & `jwt.strategy.ts`)
**Purpose**: Authenticate requests using JWT tokens  
**Flow**:
- Extracts token from `Authorization: Bearer <token>` header
- Verifies signature using JWT_SECRET
- Validates expiration (default 24 hours)
- Decodes payload to extract `userId`, `email`, `roles`
- Attaches user context to request object
- Returns `401 Unauthorized` if token invalid or expired
**Usage**:
- Applied to protected routes via `@UseGuards(JwtAuthGuard)` decorator

#### 8. **CSRF Protection Guard** (from `security/src/csrf-protection.guard.ts`)
**Purpose**: Prevent Cross-Site Request Forgery  
**Pattern**: Double-submit cookie
**Flow**:
- Client receives CSRF token via `Set-Cookie: X-CSRF-Token`
- Client must include token in request header or body for state-changing requests
- Server validates token matches cookie
- Returns `403 Forbidden` if mismatch
**Protected Methods**: POST, PUT, PATCH, DELETE

#### 9. **Roles Guard** (from `libs/guards/src/roles.guard.ts`)
**Purpose**: Enforce role-based access control (RBAC)  
**Roles**:
- `SUPER_ADMIN` — Full platform control
- `FRANCHISE_ADMIN` — Regional control
- `SELLER` — Seller portal access
- `DRIVER` — Delivery/taxi driver
- `CUSTOMER` — End user
**Usage**:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'SUPER_ADMIN')
@Post('inventory')
createInventory() { ... }
```

#### 10. **Region Guard** (from `libs/region/src/region.guard.ts`)
**Purpose**: Enforce region-based data isolation  
**Flow**:
- Reads `X-Region-Code` header (e.g., `IN`, `AE`, `BD`)
- Validates against allowed regions for user
- Filters database queries by region
- Prevents cross-region data access

#### 11. **Account Lockout Service** (from `security/src/account-lockout.service.ts`)
**Purpose**: Prevent brute-force login attacks  
**Mechanism**:
- Tracks failed login attempts per email
- Progressive lockout:
  - After 3 failures: `5 minute cooldown`
  - After 5 failures: `30 minute cooldown`
  - After 10 failures: `24 hour permanent lock` (requires admin unlock)
- Resets counter on successful login
- Logs all attempts for audit
**API**:
```typescript
// In auth.controller.ts
const canLogin = await accountLockoutService.checkLoginAttempt(email);
if (!canLogin) return 429 Too Many Requests;
```

#### 12. **PCI Compliance Interceptor** (from `security/src/pci-compliance.interceptor.ts`)
**Purpose**: Mask sensitive payment data in responses  
**Masked Fields**:
- Credit card numbers: `4111 **** **** 1111`
- CVV: `***`
- Bank account numbers: `****12345`
**Implementation**:
- Intercepts all responses
- Scans for card/bank data
- Replaces with masked versions before sending to client
- Prevents accidental exposure of sensitive data

#### 13. **Logging Interceptor** (from `libs/common/src/interceptors/logging.interceptor.ts`)
**Purpose**: Structured request/response logging  
**Logs**:
- Request method, path, headers
- Response status, duration
- User ID (if authenticated)
- Request ID for tracing
**Format**: JSON structured logs for ELK/Datadog integration

#### 14. **Transform Interceptor** (from `libs/common/src/interceptors/transform.interceptor.ts`)
**Purpose**: Standardize API response format  
**Standard Format**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-06-24T10:30:00Z",
  "requestId": "uuid-here"
}
```

#### 15. **Audit Interceptor** (from `apps/api-gateway/src/interceptors/audit.interceptor.ts`)
**Purpose**: Log sensitive operations for compliance  
**Logged Operations**:
- Admin actions (commission changes, user approvals)
- Financial transactions (payments, payouts, refunds)
- Permission changes
- Data deletions
**Log Entry**:
```json
{
  "action": "UPDATE_COMMISSION",
  "userId": "admin-123",
  "timestamp": "2026-06-24T10:30:00Z",
  "oldValue": { "rate": 15 },
  "newValue": { "rate": 18 },
  "ipAddress": "192.168.1.1",
  "requestId": "uuid"
}
```

#### 16. **WebSocket DDoS Guard** (from `security/src/ws-ddos.guard.ts`)
**Purpose**: Prevent WebSocket connection/message floods  
**Protections**:
- Max `10 messages per second` per user
- Max `100 concurrent connections` per user
- Disconnects exceeding limits
- IP-based fingerprinting for non-authenticated connections
**Gateways Protected**:
- `/taxi` — Driver GPS streaming
- `/delivery` — Delivery tracking
- `/notifications` — Push alerts
- `/chat` — Messaging
- `/orders` — Order updates

---

## Microservices Overview

### 26 Microservices Architecture

| # | Service | Port | Protocol | Purpose |
|---|---------|------|----------|---------|
| 1 | **api-gateway** | 3000 | HTTP/WS | Central routing & orchestration |
| 2 | **auth-service** | 4000 | gRPC | JWT, OAuth, sessions |
| 3 | **user-service** | 4001 | TCP | User profiles, KYC |
| 4 | **marketplace-service** | 4002 | TCP | E-commerce catalog |
| 5 | **cart-service** | 4003 | TCP | Shopping cart |
| 6 | **order-service** | 4004 | gRPC | Order lifecycle |
| 7 | **loyalty-service** | 4005 | TCP | Loyalty points |
| 8 | **franchise-service** | 4006 | TCP | Regional management |
| 9 | **doctor-service** | 4007 | TCP | Appointments & consultations |
| 10 | **grocery-service** | 4008 | TCP | Hyperlocal delivery |
| 11 | **restaurant-service** | 4009 | TCP | Food delivery |
| 12 | **pharmacy-service** | 4010 | TCP | Medicine inventory |
| 13 | **taxi-service** | 4011 | TCP | Ride-hailing |
| 14 | **delivery-service** | 4012 | TCP | Unified logistics |
| 15 | **location-service** | 4013 | TCP | Geolocation & maps |
| 16 | **wallet-service** | 4014 | TCP | Digital wallet |
| 17 | **payment-service** | 4015 | TCP | Payment gateway |
| 18 | **notification-service** | 4016 | TCP | FCM, email, SMS, WhatsApp |
| 19 | **admin-service** | 4017 | TCP | Super admin controls |
| 20 | **audit-log-service** | 4018 | TCP | Compliance logging |
| 21 | **seller-service** | 4019 | TCP | Seller portal |
| 22 | **commission-service** | 4020 | TCP | Commission calculation |
| 23 | **payout-service** | 4021 | TCP | Seller/driver payouts |
| 24 | **refund-service** | 4022 | TCP | Refund processing |
| 25 | **search-service** | 4023 | TCP | Elasticsearch integration |
| 26 | **report-service** | 4024 | TCP | Analytics & reporting |

### Service Communication Pattern

```
[Client Request to API Gateway]
         ↓
[Route to handler based on path]
         ↓
[Check if needs external service]
         ↓
┌────────┴─────────────────────────┐
│  Synchronous? or Async?          │
├──────────────┬────────────────────┤
│              │                    │
│ Sync (gRPC)  │ Async (Kafka)      │
│ OR HTTP REST │                    │
│              │                    │
↓              ↓                    ↓
[Auth Service] [Order Service]   [Kafka Topic]
   (JWT)       (Order Logic)    [Notification]
               [Payment Logic]  [Audit Log]
                                [Loyalty Pts]
```

---

## Summary

**KARTSEEK** is a production-grade, multi-tenant super app with:

- **27 independently deployable services** (API Gateway + 26 microservices)
- **Comprehensive security** (JWT, DDoS, rate limiting, PCI-DSS, GDPR)
- **Real-time capabilities** (WebSocket for tracking, notifications, chat)
- **Event-driven architecture** (Kafka for async operations)
- **Multi-region support** (country/city isolation, localization)
- **Scalable data layer** (PostgreSQL, Redis cache, Elasticsearch)
- **Role-based access control** (Super Admin, Franchise, Seller, Driver, Customer)
- **Compliance & audit** (Audit logs, PCI-DSS masking, GDPR utilities)

For detailed feature implementation, refer to individual service documentation and the `README.md`.
