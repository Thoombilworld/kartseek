# KARTSEEK API — Operations Runbook

## Health Checks

All services expose `GET /health` returning `{ service, status, timestamp }`.

```bash
# Check api-gateway health
curl http://localhost:3000/health

# Check all services (production)
for svc in api-gateway auth-service order-service seller-service; do
  echo "=== $svc ==="
  kubectl exec -n kartseek-prod deploy/$svc -- wget -qO- http://localhost:3000/health
done
```

---

## Service Ports (Local Dev)

| Service | Port |
|---|---|
| api-gateway | 3000 |
| auth-service | 3001 |
| user-service | 3002 |
| order-service | 3003 |
| payment-service | 3004 |
| seller-service | 3005 |
| delivery-service | 3006 |
| grocery-service | 3007 |
| restaurant-service | 3008 |
| pharmacy-service | 3009 |
| doctor-service | 3010 |
| hotel-service | 3011 |
| taxi-service | 3012 |

---

## Incident Response

### P0 — API Gateway Down
1. Check pod status: `kubectl get pods -n kartseek-prod -l app=api-gateway`
2. Check recent logs: `kubectl logs -n kartseek-prod deploy/api-gateway --tail=100`
3. Roll back to last known good: `kubectl rollout undo deploy/api-gateway -n kartseek-prod`
4. Verify rollback: `kubectl rollout status deploy/api-gateway -n kartseek-prod`

### P1 — Orders Not Processing
1. Check Kafka consumer lag: `kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --all-groups`
2. Check order-service logs for errors
3. Verify Redis is reachable: `redis-cli -u $REDIS_URL ping`
4. Check `order:*` Redis keys for stuck orders

### P1 — WebSocket Disconnections
1. Check `ws:orders:sessions` hash size: `redis-cli hlen ws:orders:sessions`
2. Verify socket.io server is running on api-gateway
3. Check DDoS monitor metrics: `GET /api/internal/metrics` (admin only)

### P2 — High Redis Memory
1. `redis-cli info memory`
2. Check for key bloat: `redis-cli --scan --pattern "order:*" | wc -l`
3. Manually expire stale keys if needed: `redis-cli ttl order:{id}`

---

## Scaling

### Horizontal Pod Autoscaler (HPA)

Each service has an HPA configured:
- CPU target: 70%
- Min replicas: 2
- Max replicas: 10

```bash
# Check HPA status
kubectl get hpa -n kartseek-prod

# Force scale up
kubectl scale deploy/api-gateway --replicas=5 -n kartseek-prod
```

### Kafka Partition Scaling
- Each high-traffic topic has 6 partitions
- Consumer groups match partition count for full parallelism
- Add partitions: `kafka-topics.sh --bootstrap-server kafka:9092 --alter --topic order.created --partitions 12`

---

## Rollback Procedures

### Application Rollback
```bash
# Rollback api-gateway
kubectl rollout undo deployment/api-gateway -n kartseek-prod

# Rollback to a specific revision
kubectl rollout undo deployment/api-gateway -n kartseek-prod --to-revision=3

# Check rollout history
kubectl rollout history deployment/api-gateway -n kartseek-prod
```

### Database Migration Rollback
```bash
# TypeORM rollback last migration
npx typeorm migration:revert -d src/data-source.ts
```

---

## Security Procedures

### Rotate JWT Secret
1. Generate new secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Update `JWT_SECRET` in Kubernetes Secret: `kubectl edit secret kartseek-api-secrets -n kartseek-prod`
3. Rolling restart: `kubectl rollout restart deploy/api-gateway deploy/auth-service -n kartseek-prod`
4. All existing JWTs are now invalid — users will need to log in again

### Rotate Encryption Key
> ⚠️ **CAUTION**: Must migrate existing encrypted data before rotating. Never rotate without a migration script.
1. Write migration: decrypt all PII with old key, re-encrypt with new key
2. Run migration in maintenance window
3. Update `ENCRYPTION_KEY` secret and restart services

### Revoke All User Sessions
```bash
# Revoke all refresh tokens (e.g. after data breach)
redis-cli --scan --pattern "rt:*" | xargs redis-cli del
redis-cli --scan --pattern "rt_family:*" | xargs redis-cli del
```

### Account Lockout Management
```bash
# Check if user is locked out
redis-cli get session:lockout:{userId}

# Manually unlock a user
redis-cli del session:lockout:{userId}
```

---

## Monitoring Checklist

Run daily:
- [ ] Error rate < 0.1% (check Grafana dashboard)
- [ ] P95 latency < 200ms on api-gateway
- [ ] Kafka consumer lag < 1000 messages per topic
- [ ] Redis memory < 80% capacity
- [ ] All HPA min-replicas are running
- [ ] SSL certificates expiry > 30 days

---

## Environment Variables Rotation Schedule

| Variable | Rotation Frequency | Team Owner |
|---|---|---|
| `JWT_SECRET` | 90 days | Backend Team |
| `ENCRYPTION_KEY` | Never (requires migration) | Security Team |
| `INTERNAL_API_KEY` | 30 days | DevOps |
| Database passwords | 90 days | DBA |
| Kafka credentials | 180 days | DevOps |
