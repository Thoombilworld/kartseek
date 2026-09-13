# KARTSEEK API — Operations Runbook

## Health Checks

The gateway answers `GET /api/v1/health`. Every other deployable's current
health route is declared per-service in
[`../../../services.yaml`](../../../services.yaml) (`health.live`) and
rendered in
[`../../../docs/architecture/services.md`](../../../docs/architecture/services.md) —
`user-service` and `franchise-service` have no HTTP health route at all
today. Do not assume `/health` works everywhere; look the path up before
scripting against it.

```bash
# Gateway
curl "http://localhost:$API_GATEWAY_PORT/api/v1/health"

# Any other service — substitute its own port env var and health.live path
curl "http://localhost:$<NAME>_SERVICE_PORT<health-path-from-services.yaml>"
```

---

## Service Ports

Every port, its environment variable, health route, database and
dependencies are declared once in
[`../../../services.yaml`](../../../services.yaml) and rendered below by
`npm run registry:generate`. Edit the registry, not this table — see
[ADR 0005](../../../docs/adr/0005-service-registry.md).

<!-- registry:start -->

_Generated from `services.yaml` by `npm run registry:generate`; edit the registry, not this block._

<!-- prettier-ignore-start -->
| Name | Kind | Path | HTTP | TCP | gRPC | Database / schema | Health or base path | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `api-gateway` | API gateway | `apps/api/apps/api-gateway` | 3001 | — | — | kartseek_db / public | `/api/v1/health` | postgres, redis, kafka, mongodb |
| `admin-service` | core service | `apps/api/apps/admin-service` | 3027 | 4017 | — | kartseek_db / admin | `/health` | postgres, redis, kafka |
| `audit-log-service` | core service | `apps/api/apps/audit-log-service` | 3028 | — | — | — | `/health` | mongodb, redis, kafka |
| `auth-service` | core service | `apps/api/apps/auth-service` | 3010 | — | 5001 | — | `/health` | redis |
| `cart-service` | core service | `apps/api/apps/cart-service` | 3013 | 4003 | — | — | `/health` | redis, kafka |
| `commission-service` | core service | `apps/api/apps/commission-service` | 3030 | 4020 | — | — | `/health` | redis, kafka |
| `delivery-service` | core service | `apps/api/apps/delivery-service` | 3022 | — | 5008 | — | `/health` | redis, kafka |
| `location-service` | core service | `apps/api/apps/location-service` | 3023 | 4013 | — | kartseek_db / location | `/health` | postgres, redis |
| `loyalty-service` | core service | `apps/api/apps/loyalty-service` | 3015 | 4005 | — | — | `/health` | redis, kafka |
| `notification-service` | core service | `apps/api/apps/notification-service` | 3026 | — | 5004 | — | `/health` | redis, kafka |
| `order-service` | core service | `apps/api/apps/order-service` | 3014 | 4004 | 5002 | kartseek_db / order | `/health` | postgres, redis, kafka |
| `payment-service` | core service | `apps/api/apps/payment-service` | 3025 | 4026 | 5003 | kartseek_db / payment | `/health` | postgres, redis, kafka |
| `payout-service` | core service | `apps/api/apps/payout-service` | 3031 | 4021 | — | kartseek_db / payout | `/health` | postgres, redis, kafka |
| `refund-service` | core service | `apps/api/apps/refund-service` | 3032 | 4022 | — | — | `/health` | redis, kafka |
| `report-service` | core service | `apps/api/apps/report-service` | 3034 | 4024 | — | — | `/health` | redis, kafka |
| `search-service` | core service | `apps/api/apps/search-service` | 3033 | 4023 | — | — | `/health` | redis, kafka, elasticsearch |
| `user-service` | core service | `apps/api/apps/user-service` | 3011 | — | 5009 | kartseek_db / user | `/health` | postgres, redis |
| `wallet-service` | core service | `apps/api/apps/wallet-service` | 3024 | 4014 | — | kartseek_db / wallet | `/health` | postgres, redis, kafka |
| `doctor-service` | module service | `modules/doctor/backend` | 3017 | 4007 | — | kartseek_doctor / doctor | `/health` | postgres, redis, kafka |
| `franchise-service` | module service | `modules/franchise/backend` | 3016 | 4006 | — | kartseek_franchise / franchise | `/health` | postgres, redis, kafka |
| `grocery-service` | module service | `modules/grocery/backend` | 3018 | 4008 | 5010 | kartseek_grocery / grocery | `/health` | postgres, redis, kafka |
| `hotel-service` | module service | `modules/hotel/backend` | 3035 | 4025 | — | kartseek_hotel / hotel | `/health` | postgres, redis, kafka |
| `marketplace-service` | module service | `modules/marketplace/backend` | 3012 | 4002 | 5006 | kartseek_marketplace / marketplace | `/health` | postgres, redis, kafka |
| `pharmacy-service` | module service | `modules/pharmacy/backend` | 3020 | 4010 | — | kartseek_pharmacy / pharmacy | `/health` | postgres, redis, kafka |
| `restaurant-service` | module service | `modules/restaurant/backend` | 3019 | 4018 | 5005 | kartseek_restaurant / restaurant | `/health` | postgres, redis, kafka |
| `taxi-service` | module service | `modules/taxi/backend` | 3021 | 4027 | 5007 | kartseek_taxi / taxi | `/health` | postgres, redis, kafka |
| `web` | web shell | `apps/web` | 3000 | — | — | — | `/` | — |
| `marketplace-frontend` | web zone | `modules/marketplace/frontend` | 3002 | — | — | — | `/marketplace` | — |
| `grocery-frontend` | web zone | `modules/grocery/frontend` | 3003 | — | — | — | `/grocery` | — |
| `restaurant-frontend` | web zone | `modules/restaurant/frontend` | 3004 | — | — | — | `/restaurant` | — |
| `pharmacy-frontend` | web zone | `modules/pharmacy/frontend` | 3005 | — | — | — | `/pharmacy` | — |
| `doctor-frontend` | web zone | `modules/doctor/frontend` | 3006 | — | — | — | `/doctor` | — |
| `hotel-frontend` | web zone | `modules/hotel/frontend` | 3007 | — | — | — | `/hotel-booking` | — |
| `taxi-frontend` | web zone | `modules/taxi/frontend` | 3008 | — | — | — | `/taxi` | — |
| `franchise-frontend` | web zone | `modules/franchise/frontend` | 3009 | — | — | — | `/franchise` | — |
<!-- prettier-ignore-end -->
<!-- registry:end -->

---

## Database Notes

`orders` is `"order".orders`, not `public.orders`, and its money column is
`currency`, not `currency_code`. Raw SQL against the main database must write
the schema — `search_path` is `public`, so a bare `orders` either errors or
builds a shadow table. The same applies to `admin.admin_roles`.

`kartseek_db` also carries two orphan, completely empty schemas: `user` and
`admin` holds only `admin_roles` (no `page_layouts`). Both predate
`user-service`/`admin-service` being repointed at `public.users` /
`public.page_layouts` (AUD2-025, AUD2-026) and neither is dropped — an empty
schema is not a correctness risk, and dropping one needs a migration with a
real `down()`, not a runbook note. `\dn` in `kartseek_db` will show them; this
is why.

---

## Incident Response

Cluster commands (`kubectl`, manifest layout, current caveats) are in
[`../../../infra/k8s/README.md`](../../../infra/k8s/README.md); the
sequences below assume that context and a `kartseek-prod` namespace.

### P0 — API Gateway Down

1. Check pod status: `kubectl get pods -n kartseek-prod -l app=api-gateway`
2. Check recent logs: `kubectl logs -n kartseek-prod deploy/api-gateway --tail=100`
3. Roll back to last known good: `kubectl rollout undo deploy/api-gateway -n kartseek-prod`
4. Verify rollback: `kubectl rollout status deploy/api-gateway -n kartseek-prod`
5. Confirm recovery against the gateway's own health path above, not a
   generic `/health`.

### P1 — Orders Not Processing

1. Check Kafka consumer lag: `kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --all-groups`
2. Check order-service logs for errors.
3. Verify Redis is reachable: `redis-cli -u $REDIS_URL ping`
4. Check `order:*` Redis keys for stuck orders.

### P1 — WebSocket Disconnections

1. Check `ws:orders:sessions` hash size: `redis-cli hlen ws:orders:sessions`
2. Verify the gateway's Socket.IO server is running (see the `/orders`
   namespace in
   [`../../../docs/architecture/security.md`](../../../docs/architecture/security.md)
   for how a client is authorized into a room).
3. Check DDoS monitor metrics: `GET /api/internal/metrics` (admin only).

### P2 — High Redis Memory

1. `redis-cli info memory`
2. Check for key bloat: `redis-cli --scan --pattern "order:*" | wc -l`
3. Manually expire stale keys if needed: `redis-cli ttl order:{id}`

---

## Scaling

### Horizontal Pod Autoscaler (HPA)

Each service has an HPA configured: CPU target 70%, min replicas 2, max
replicas 10.

```bash
kubectl get hpa -n kartseek-prod
kubectl scale deploy/api-gateway --replicas=5 -n kartseek-prod
```

### Kafka Partition Scaling

Each high-traffic topic has 6 partitions; consumer groups match partition
count for full parallelism.

```bash
kafka-topics.sh --bootstrap-server kafka:9092 --alter --topic order.created --partitions 12
```

---

## Rollback Procedures

```bash
# Application
kubectl rollout undo deployment/api-gateway -n kartseek-prod
kubectl rollout undo deployment/api-gateway -n kartseek-prod --to-revision=3
kubectl rollout history deployment/api-gateway -n kartseek-prod

# Database migration
npm run migration:revert -w kartseek-api
```

---

## Security Procedures

### Rotate JWT Secret

1. Generate a new secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Update `JWT_SECRET` in the Kubernetes Secret: `kubectl edit secret kartseek-api-secrets -n kartseek-prod`
3. Rolling restart: `kubectl rollout restart deploy/api-gateway deploy/auth-service -n kartseek-prod`
4. All existing JWTs are now invalid — users will need to log in again.

### Rotate Encryption Key

> **Caution:** migrate existing encrypted data before rotating — never
> rotate without a migration script.

1. Write a migration: decrypt all PII with the old key, re-encrypt with the
   new one.
2. Run the migration in a maintenance window.
3. Update the `ENCRYPTION_KEY` secret and restart services.

### Revoke All User Sessions

```bash
redis-cli --scan --pattern "rt:*" | xargs redis-cli del
redis-cli --scan --pattern "rt_family:*" | xargs redis-cli del
```

### Account Lockout Management

```bash
redis-cli get session:lockout:{userId}
redis-cli del session:lockout:{userId}
```

---

## Monitoring Checklist

Run daily:

- [ ] Error rate under 0.1% (Grafana dashboard).
- [ ] P95 latency under 200ms on the gateway.
- [ ] Kafka consumer lag under 1000 messages per topic.
- [ ] Redis memory under 80% capacity.
- [ ] All HPA min-replicas are running.
- [ ] SSL certificates expire more than 30 days out.

---

## Environment Variables Rotation Schedule

| Variable           | Rotation Frequency         | Team Owner    |
| ------------------ | -------------------------- | ------------- |
| `JWT_SECRET`       | 90 days                    | Backend Team  |
| `ENCRYPTION_KEY`   | Never (requires migration) | Security Team |
| `INTERNAL_API_KEY` | 30 days                    | DevOps        |
| Database passwords | 90 days                    | DBA           |
| Kafka credentials  | 180 days                   | DevOps        |
