# KARTSEEK Backend — Setup & Run Guide

> **Important:** If your Windows username contains spaces (e.g., `Hp EliteBook`), always wrap paths in quotes.

---

## Prerequisites

- **Node.js** ≥ 20.x (check `.nvmrc` at monorepo root)
- **Docker Desktop** — for local PostgreSQL, Redis, Kafka, MongoDB
- **npm** ≥ 10.x

---

## Step 1 — Navigate to the API Directory

```powershell
Set-Location "c:\KARTSEEKAPP\apps\api"
```

## Step 2 — Install All Backend Dependencies

```powershell
node ../../scripts/api/install_backend_dependencies.js
```

## Step 3 — Scaffold/Write All Microservice Files

```powershell
node ../../scripts/api/write_all_service_files.js
```

## Step 4 — Start Local Infrastructure (Docker)

From the **monorepo root**:

```powershell
docker-compose up -d postgres mongodb redis zookeeper kafka
```

Or use the npm shortcut:

```powershell
npm run infra:up
```

## Step 5 — Start a Single Service to Test

```powershell
npm run start:user
```

---

## Starting All Core Services

Install `concurrently` globally, then:

```powershell
npm install -g concurrently
npm run dev:all
```

## Individual Service Starts

| Service | Command |
| --- | --- |
| API Gateway | `npm run start:gateway` |
| Auth | `npm run start:auth` |
| Marketplace | `npm run start:marketplace` |
| Grocery | `npm run start:grocery` |
| Restaurant | `npm run start:restaurant` |
| Order | `npm run start:order` |
| Payment | `npm run start:payment` |
| Wallet | `npm run start:wallet` |
| Delivery | `npm run start:delivery` |
| Taxi | `npm run start:taxi` |
| Notification | `npm run start:notification` |
| Audit Logs | `npm run start:audit` |

---

## Infrastructure Ports

| Service | Port |
| --- | --- |
| PostgreSQL | `5432` |
| Redis | `6379` |
| Kafka | `9092` |
| MongoDB | `27017` |
| Kafka UI | `8080` |
| pgAdmin (tools profile) | `5050` |
| Redis Insight (tools profile) | `5540` |
