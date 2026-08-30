# KARTSEEK Kubernetes Deployment — Quick Start

## 📋 What's Included

Your Kubernetes manifests are now ready in the `k8s/` directory:

```
k8s/
├── namespace.yaml           # Namespace, RBAC, Network Policies, ResourceQuota
├── config.yaml              # ConfigMaps & Secrets for all services
├── api-gateway.yaml         # API Gateway Deployment, Service, HPA, PDB
├── microservices.yaml       # Auth, Order, Payment services
├── databases.yaml           # PostgreSQL, Redis, Kafka StatefulSets
├── storage.yaml             # StorageClasses for different storage tiers
├── ingress.yaml             # Ingress, TLS, Monitoring, Prometheus Rules
├── deploy.sh                # Automated deployment script
├── utils.sh                 # Utility commands for management
└── README.md                # Complete deployment guide
```

---

## 🚀 Quick Deploy (5 minutes)

### Prerequisite: Kubernetes Cluster
```bash
# For local development (Docker Desktop):
# Settings → Kubernetes → Enable Kubernetes

# For cloud:
# AWS EKS, Google GKE, Azure AKS, or DigitalOcean DOKS
```

### Deploy Everything
```bash
chmod +x k8s/deploy.sh
./k8s/deploy.sh production
```

### Verify Deployment
```bash
kubectl get pods -n kartseek
kubectl get svc -n kartseek
```

---

## 🔧 Key Features

### ✅ High Availability
- 3 replicas of API Gateway (anti-affinity rules)
- 2-3 replicas of microservices
- Pod Disruption Budgets (PDB) ensure availability during node maintenance
- StatefulSets for databases (persistent identity)

### ✅ Security
- RBAC: Each service has minimal required permissions
- Network Policies: Deny-all by default, whitelist specific pods
- Pod Security: Run as non-root user, read-only filesystem, drop capabilities
- Secrets: All sensitive data in Kubernetes Secrets (or use AWS Secrets Manager)

### ✅ Observability
- Prometheus metrics on port 9090
- Health checks: liveness, readiness, startup probes
- Structured logging with pod metadata
- ServiceMonitor for automatic metric collection

### ✅ Scalability
- Horizontal Pod Autoscaling (HPA) based on CPU/memory
- Resource limits prevent resource starvation
- Batch processing via Kafka event bus

### ✅ Production Ready
- Ingress for TLS termination
- Cert-Manager for automatic certificate renewal
- Database backups via Velero
- Cost-optimized storage classes (SSD for hot, HDD for cold)

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────┐
│       Internet / Load Balancer          │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼────────┐
         │  NGINX Ingress │ (TLS termination)
         └────────┬───────┘
                  │
    ┌─────────────┴──────────────┐
    │                            │
┌───▼──────────────────┐  ┌──────▼──────────────────┐
│  API Gateway (3x)    │  │  Monitoring (Prometheus)│
│  - Load balanced     │  │  - Grafana dashboards   │
│  - Auto-scaling      │  │  - Alert rules          │
└───┬──────────┬───────┘  └─────────────────────────┘
    │          │
    │    ┌─────┼─────┬──────────┬──────────┬───────────┐
    │    │     │     │          │          │           │
┌───▼────▼──┐ ┌┴─────▼──┐ ┌──────▼───┐ ┌──▼─────┐ ┌────▼────┐
│Auth Svc   │ │Order Svc │ │Payment   │ │Grocery │ │Doctor   │
│(gRPC)     │ │(gRPC)    │ │Svc       │ │Service │ │Service  │
└───────────┘ └──────────┘ └──────────┘ └────────┘ └─────────┘
    │              │           │            │          │
    └──────────────┼───────────┼────────────┼──────────┘
                   │           │            │
        ┌──────────▼───────────▼────────────▼──────┐
        │                                           │
  ┌─────▼────┐    ┌────────┐    ┌──────┐           │
  │PostgreSQL│    │ Redis  │    │Kafka │           │
  │ (1x RWO) │    │ (1x)   │    │ (1x) │    ┌──────▼────┐
  └──────────┘    └────────┘    └──────┘    │ EBS/GCS   │
                                             │ Storage   │
                                             └───────────┘
```

---

## 📝 Common Commands

```bash
# View status
kubectl get all -n kartseek

# View logs
kubectl logs -f -n kartseek deployment/api-gateway

# Port forward (access locally)
kubectl port-forward -n kartseek svc/api-gateway 3001:3001

# Scale service
kubectl scale deployment/api-gateway --replicas=5 -n kartseek

# Restart service
kubectl rollout restart deployment/api-gateway -n kartseek

# Check resource usage
kubectl top pods -n kartseek

# View events
kubectl get events -n kartseek --sort-by='.lastTimestamp'
```

---

## 🔐 Secrets Management

### ⚠️ Important: Never commit secrets to Git!

Option 1: **AWS Secrets Manager** (Recommended for production)
```bash
# Install External Secrets Operator
helm repo add external-secrets https://external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Secrets sync automatically into Kubernetes
```

Option 2: **HashiCorp Vault**
```bash
helm install vault hashicorp/vault -n vault --create-namespace
```

Option 3: **sealed-secrets** (encrypt secrets in git)
```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/sealed-secrets-0.18.0.yaml
```

---

## 📈 Monitoring & Observability

### Install Prometheus + Grafana
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

### Access Grafana
```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Login: admin / prom-operator
```

### View Prometheus Metrics
```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Open: http://localhost:9090/graph
```

---

## 💾 Backup & Disaster Recovery

### Database Backup
```bash
# Manual backup
kubectl exec postgres-0 -n kartseek -- \
  pg_dump -U postgres kartseek_db | gzip > backup.sql.gz

# Or use provided utility
./k8s/utils.sh backup
```

### Velero (Cluster-level backup)
```bash
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm install velero vmware-tanzu/velero -n velero --create-namespace \
  --set configuration.backupStorageLocation.bucket=kartseek-backups \
  --set configuration.backupStorageLocation.provider=aws

# Create scheduled backup (daily at 2 AM)
velero schedule create daily --schedule="0 2 * * *"
```

---

## 🎯 Production Checklist

Before deploying to production, ensure:

- [ ] Use managed Kubernetes (EKS, GKE, AKS)
- [ ] Use managed databases (RDS, Cloud SQL) instead of in-cluster StatefulSets
- [ ] Use managed Redis/Memcache instead of in-cluster
- [ ] Use managed Kafka (MSK, Confluent Cloud) instead of in-cluster
- [ ] Enable RBAC audit logging
- [ ] Enable Pod Security Standards
- [ ] Configure NetworkPolicies for all services
- [ ] Use External Secrets Manager (AWS Secrets Manager, Vault)
- [ ] Set up Prometheus + Grafana monitoring
- [ ] Set up ELK/Datadog logging
- [ ] Configure auto-scaling (HPA, Cluster Autoscaler)
- [ ] Test backup & recovery procedures
- [ ] Load test before going live
- [ ] Use GitOps for deployment (ArgoCD, Flux)
- [ ] Enable pod disruption budgets
- [ ] Configure ingress with TLS (Let's Encrypt)
- [ ] Set up incident response procedures

---

## 🐛 Troubleshooting

### Pod in CrashLoopBackOff
```bash
# Check events and logs
kubectl describe pod -n kartseek <pod-name>
kubectl logs -p -n kartseek <pod-name>

# Check if dependencies are ready
kubectl get statefulset -n kartseek
```

### Database connection errors
```bash
# Test connectivity
kubectl exec -it deployment/api-gateway -n kartseek -- \
  psql -h postgres -U postgres -d kartseek_db -c "SELECT 1"
```

### Out of memory
```bash
# Check usage
kubectl top pods -n kartseek --sort-by=memory

# Increase limits in api-gateway.yaml, then reapply
```

### Ingress not routing
```bash
# Check ingress status
kubectl describe ingress -n kartseek

# Check ingress controller logs
kubectl logs -f -n ingress-nginx deployment/nginx-ingress-controller
```

---

## 📚 Resources

- **Kubernetes Docs**: https://kubernetes.io/docs/
- **Docker Kubernetes Guide**: https://docs.docker.com/guides/kube-deploy/
- **Helm Hub**: https://artifacthub.io/
- **kubectl Cheatsheet**: https://kubernetes.io/docs/reference/kubectl/cheatsheet/

---

## ✨ Next Steps

1. **Deploy**: `./k8s/deploy.sh production`
2. **Verify**: `kubectl get all -n kartseek`
3. **Monitor**: `kubectl port-forward svc/api-gateway 3001:3001`
4. **Setup Monitoring**: Install Prometheus + Grafana
5. **Configure Secrets**: Use AWS Secrets Manager or Vault
6. **Setup Backups**: Install and configure Velero
7. **Load Testing**: Test with production traffic patterns
8. **Go Live**: Deploy to production cluster

Good luck! 🚀
