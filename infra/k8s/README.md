# ══════════════════════════════════════════════════════════════════════════════
# KARTSEEK Kubernetes Deployment Guide
# Complete reference for deploying KARTSEEK on Kubernetes
# ══════════════════════════════════════════════════════════════════════════════

## Overview

KARTSEEK is a multi-tenant super app architecture with 26+ microservices. This guide shows how to deploy it on Kubernetes using industry best practices:

- **Microservices Architecture**: Independently deployable services (Auth, Order, Payment, etc.)
- **Stateful Components**: PostgreSQL, Redis, Kafka deployed as StatefulSets
- **High Availability**: Multi-replica deployments with pod anti-affinity and disruption budgets
- **Security**: RBAC, Network Policies, Pod Security Standards, secret management
- **Observability**: Prometheus metrics, structured logging, distributed tracing
- **Auto-scaling**: Horizontal Pod Autoscaling based on CPU/memory

---

## Prerequisites

### 1. Kubernetes Cluster
- **Version**: 1.27+ (tested with 1.28-1.30)
- **Size**: Minimum 3 worker nodes (2 vCPU, 4GB RAM each)
- **Storage**: Fast SSD storage class (`fast-ssd`) configured
- **Networking**: CNI plugin (Calico, Cilium, or Flannel)

### 2. Local Tools
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install Helm (package manager for Kubernetes)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install kustomize (optional, for advanced configuration)
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
sudo mv kustomize /usr/local/bin/

# Install kubectx (optional, for easy context switching)
git clone https://github.com/ahmetb/kubectx /opt/kubectx
sudo ln -s /opt/kubectx/kubectx /usr/local/bin/kubectx
sudo ln -s /opt/kubectx/kubens /usr/local/bin/kubens
```

### 3. Managed Kubernetes Services

**AWS EKS:**
```bash
eksctl create cluster --name kartseek-prod --version 1.29 --nodegroup-name workers --node-type t3.large --nodes 3 --region ap-south-1
aws eks update-kubeconfig --name kartseek-prod --region ap-south-1
```

**Google GKE:**
```bash
gcloud container clusters create kartseek-prod --num-nodes 3 --machine-type n2-standard-4 --region asia-south1
gcloud container clusters get-credentials kartseek-prod --region asia-south1
```

**Azure AKS:**
```bash
az aks create --resource-group kartseek-rg --name kartseek-prod --node-count 3 --vm-set-type VirtualMachineScaleSets --load-balancer-sku standard
az aks get-credentials --resource-group kartseek-rg --name kartseek-prod
```

**Local Development (Docker Desktop or kind):**
```bash
# Docker Desktop: Settings → Kubernetes → Enable Kubernetes
# or
kind create cluster --name kartseek-dev --image kindest/node:v1.29.0
```

---

## Installation

### Step 1: Configure kubectl

```bash
# Set default namespace
kubectl config set-context --current --namespace=kartseek

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### Step 2: Create Secrets and ConfigMaps

**Update sensitive values in `infra/k8s/config.yaml`:**
```bash
# Edit secrets with your actual values
kubectl edit secret kartseek-secrets -n kartseek

# Or create from files
echo -n "your-jwt-secret-min-32-chars" | kubectl create secret generic jwt-secret --from-file=secret=/dev/stdin -n kartseek
```

**Using AWS Secrets Manager (recommended for production):**
```bash
# Install External Secrets Operator
helm repo add external-secrets https://external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Create SecretStore to sync from AWS
kubectl apply -f infra/k8s/external-secrets-store.yaml
```

### Step 3: Install Prerequisites

**Storage Classes:**
```bash
# Cloud (AWS EBS CSI — the four production classes)
kubectl apply -f infra/k8s/storage.yaml

# Laptop cluster (docker-desktop / kind / minikube) — same class names, backed by
# the local dynamic provisioner instead. Apply this INSTEAD of storage.yaml;
# StorageClass fields are immutable, so remove the cloud one first.
kubectl delete storageclass fast-ssd standard high-performance archive --ignore-not-found
kubectl apply -f infra/k8s/storage-local-dev.yaml
```
> The file was `infra/k8s/storage.yaml` all along — `storage-class.yaml` has never
> existed, so anyone following this literally got "no such file", skipped it, and
> then watched every database PVC sit Pending against a missing `fast-ssd` class.

**Ingress Controller (nginx-ingress recommended):**
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace --set controller.service.type=LoadBalancer
```

**Cert-Manager (for automatic TLS certificates):**
```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set installCRDs=true
```

**Monitoring Stack (Prometheus + Grafana):**
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace
```

### Step 4: Deploy KARTSEEK

**Automated deployment (using provided script):**
```bash
chmod +x infra/k8s/deploy.sh
./infra/k8s/deploy.sh production
```

**Manual deployment (step by step):**
```bash
# 1. Namespace, RBAC, NetworkPolicies, LimitRange + ResourceQuota.
#    Must come first: the quota rejects any pod without resource requests, and
#    the LimitRange in this file is what supplies defaults for the init containers.
kubectl apply -f infra/k8s/namespace.yaml

# 2. Secrets and config
kubectl apply -f infra/k8s/config.yaml -n kartseek

# 3. StorageClasses (see "Prerequisites" above for the local-dev variant)
kubectl apply -f infra/k8s/storage.yaml

# 4. Databases — shared postgres, the dedicated marketplace postgres, redis, kafka
kubectl apply -f infra/k8s/databases.yaml -n kartseek
for sts in postgres postgres-marketplace redis kafka; do
  kubectl rollout status statefulset/$sts -n kartseek
done

# 5. Microservices — BEFORE the gateway, which opens a client to every one of
#    them at boot. Both files are needed: microservices.yaml covers auth/order/
#    payment, microservices-generated.yaml the other 22.
kubectl apply -f infra/k8s/microservices.yaml -n kartseek
kubectl apply -f infra/k8s/microservices-generated.yaml -n kartseek
kubectl apply -f infra/k8s/marketplace-hpa.yaml -n kartseek

# 6. API Gateway
kubectl apply -f infra/k8s/api-gateway.yaml -n kartseek
kubectl rollout status deployment/api-gateway -n kartseek

# 7. Ingress (needs cert-manager + an ingress controller)
kubectl apply -f infra/k8s/ingress.yaml -n kartseek
```

**Building the service images**

Nothing in this repo publishes `kartseek/*`, so a fresh cluster stops at
`ErrImagePull: pull access denied`. One image per service, all from the same
Dockerfile via the `APP` build arg:
```bash
cd apps/api
for svc in api-gateway auth-service order-service payment-service \
           admin-service audit-log-service cart-service commission-service \
           delivery-service doctor-service franchise-service grocery-service \
           hotel-service location-service loyalty-service notification-service \
           payout-service pharmacy-service refund-service report-service \
           restaurant-service search-service taxi-service user-service \
           wallet-service; do
  docker build -f Dockerfile --build-arg APP=$svc -t kartseek/$svc:2.0.0 .
done
docker build -f Dockerfile --build-arg APP=marketplace-service -t kartseek/marketplace-service:2.1.0 .
```
Push them to the registry `regcred` authenticates against, or load them straight
into a local cluster (`kind load docker-image …`; docker-desktop shares the
daemon, so `imagePullPolicy: IfNotPresent` already finds them).

---

## Verification & Testing

### Check Deployment Status
```bash
# All resources
kubectl get all -n kartseek

# Pod status
kubectl get pods -n kartseek -o wide

# Services
kubectl get svc -n kartseek

# Ingress
kubectl get ingress -n kartseek
```

### View Logs
```bash
# API Gateway logs
kubectl logs -f -n kartseek deployment/api-gateway

# Microservice logs
kubectl logs -f -n kartseek deployment/auth-service

# Previous pod logs (if crashed)
kubectl logs -p -n kartseek deployment/api-gateway
```

### Port Forwarding (for local testing)
```bash
# API Gateway (localhost:3001)
kubectl port-forward -n kartseek svc/api-gateway 3001:3001

# PostgreSQL (localhost:5432)
kubectl port-forward -n kartseek svc/postgres 5432:5432

# Redis (localhost:6379)
kubectl port-forward -n kartseek svc/redis 6379:6379

# Prometheus (localhost:9090)
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Grafana (localhost:3000)
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

### Test API Endpoint
```bash
# Port forward API Gateway
kubectl port-forward -n kartseek svc/api-gateway 3001:3001 &

# Test health endpoint
curl -s http://localhost:3001/api/v1/health | jq

# Test with auth (if no token, expect 401)
curl -s http://localhost:3001/api/v1/protected -H "Authorization: Bearer invalid" | jq
```

---

## Scaling & Performance

### Horizontal Pod Autoscaling (HPA)
```bash
# View HPA status
kubectl get hpa -n kartseek

# Manual scaling
kubectl scale deployment/api-gateway --replicas=5 -n kartseek

# Watch autoscaler in action
kubectl get hpa -n kartseek -w
```

### Pod Disruption Budgets (PDB)
```bash
# Ensure at least 2 pods of api-gateway are running during maintenance
kubectl get pdb -n kartseek

# Drain node gracefully (respects PDB)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data
```

### Resource Limits & Requests
- **API Gateway**: 500m CPU / 512Mi memory (request), 1000m / 1Gi (limit)
- **Microservices**: 250-300m CPU / 256-384Mi memory (request), 500-800m / 512Mi-1Gi (limit)
- **PostgreSQL**: 500m CPU / 1Gi memory (request), 2000m / 2Gi (limit)
- **Redis**: 250m CPU / 512Mi memory (request), 1000m / 2Gi (limit)

Adjust based on load testing and monitoring data.

---

## Security

### RBAC
```bash
# View role bindings
kubectl get rolebindings -n kartseek

# Create custom role for CI/CD
kubectl create role ci-deployer --verb=get,list,watch,create,update,patch --resource=deployments,services -n kartseek
kubectl create rolebinding ci-deployer-binding --clusterrole=ci-deployer --serviceaccount=kartseek:ci-deployer -n kartseek
```

### Network Policies
```bash
# View applied network policies
kubectl get networkpolicies -n kartseek

# Test connectivity (should be denied by default)
kubectl exec -it deployment/api-gateway -n kartseek -- curl -s http://unauthorized-service:4000
```

### Pod Security Standards
```bash
# Label namespace for restricted PSS
kubectl label namespace kartseek pod-security.kubernetes.io/enforce=restricted pod-security.kubernetes.io/audit=restricted pod-security.kubernetes.io/warn=restricted --overwrite
```

### Secret Management (Production)
```bash
# Option 1: AWS Secrets Manager + External Secrets Operator (recommended)
kubectl apply -f infra/k8s/external-secrets-store.yaml

# Option 2: HashiCorp Vault
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault -n vault --create-namespace

# Option 3: sealed-secrets (encrypt secrets in git)
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/sealed-secrets-0.18.0.yaml
```

---

## Monitoring & Observability

### Prometheus Metrics
```bash
# Port forward Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Query metrics: http://localhost:9090/graph
# Example: http_requests_total{job="api-gateway"}
```

### Grafana Dashboards
```bash
# Port forward Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Login: admin / prom-operator
# Import dashboard: ID 6417 (Kubernetes Cluster Monitoring)
```

### Logs (using ELK Stack)
```bash
# Install Elasticsearch, Logstash, Kibana
helm repo add elastic https://helm.elastic.co
helm install elastic elastic/elasticsearch -n logging --create-namespace
helm install kibana elastic/kibana -n logging
```

### Distributed Tracing (Jaeger)
```bash
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm install jaeger jaegertracing/jaeger -n tracing --create-namespace
```

---

## Backup & Disaster Recovery

### Database Backups
```bash
# Create automated backup using pg_dump
kubectl exec -it postgres-0 -n kartseek -- pg_dump -U postgres kartseek_db | gzip > backup.sql.gz

# Or use automated backup tools:
# - AWS RDS automated backups
# - Velero: https://velero.io/
```

### Cluster Backup
```bash
# Install Velero
curl https://raw.githubusercontent.com/vmware-tanzu/velero/main/hack/getting-started.sh | bash

# Create scheduled backup (daily)
velero schedule create daily-backup --schedule="0 2 * * *"

# Restore from backup
velero restore create --from-backup daily-backup-20240101
```

---

## Troubleshooting

### Pod in CrashLoopBackOff
```bash
# Check events
kubectl describe pod -n kartseek <pod-name>

# View logs
kubectl logs -p -n kartseek <pod-name>

# Check resource limits
kubectl top pod -n kartseek <pod-name>
```

### Database Connection Issues
```bash
# Test PostgreSQL connectivity
kubectl exec -it deployment/api-gateway -n kartseek -- psql -h postgres -U postgres -d kartseek_db -c "SELECT 1"

# Check port forwarding
kubectl port-forward svc/postgres 5432:5432 -n kartseek &
psql -h localhost -U postgres -d kartseek_db
```

### Ingress Not Routing Traffic
```bash
# Check Ingress status
kubectl describe ingress -n kartseek

# Check Ingress controller logs
kubectl logs -f -n ingress-nginx deployment/nginx-ingress-controller

# Test DNS resolution
kubectl run -it busybox --image=busybox --restart=Never -- nslookup api.kartseek.com
```

### High Memory Usage
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n kartseek --sort-by=memory

# Increase memory limits in api-gateway.yaml
# Then: kubectl apply -f infra/k8s/api-gateway.yaml -n kartseek
```

---

## Production Checklist

- [ ] Use managed Kubernetes (EKS, GKE, AKS)
- [ ] Use managed databases (RDS, Cloud SQL, Azure Database)
- [ ] Use managed Redis (ElastiCache, Cloud Memorystore)
- [ ] Use managed Kafka (MSK, Confluent Cloud)
- [ ] Enable RBAC and Pod Security Standards
- [ ] Apply Network Policies
- [ ] Use External Secrets Manager (AWS Secrets Manager, Vault)
- [ ] Enable audit logging
- [ ] Configure SIEM/threat detection
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Set up logging (ELK, Datadog, New Relic)
- [ ] Set up tracing (Jaeger, Datadog APM)
- [ ] Configure auto-scaling (HPA, cluster autoscaling)
- [ ] Configure backup/DR strategy
- [ ] Test failover & recovery procedures
- [ ] Load test before production deployment
- [ ] Use GitOps (ArgoCD, Flux) for deployment automation
- [ ] Enable pod disruption budgets for critical services
- [ ] Use resource quotas and limits
- [ ] Regular security audits & penetration testing

---

## Resources & References

- **Kubernetes Docs**: https://kubernetes.io/docs/
- **Docker Kubernetes Guide**: https://docs.docker.com/guides/kube-deploy/
- **Helm Charts**: https://artifacthub.io/
- **kubectl Cheat Sheet**: https://kubernetes.io/docs/reference/kubectl/cheatsheet/
- **Best Practices**: https://kubernetes.io/docs/concepts/configuration/overview/

---

## Support

For issues or questions:
1. Check logs: `kubectl logs -f deployment/api-gateway -n kartseek`
2. Describe resources: `kubectl describe pod -n kartseek <pod-name>`
3. Check events: `kubectl get events -n kartseek`
4. Consult Kubernetes docs: https://kubernetes.io/docs/

Good luck! 🚀
