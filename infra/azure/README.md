# VoiceAI — Azure Deployment Guide

This directory contains everything needed to deploy the VoiceAI platform on
Azure using Bicep infrastructure-as-code, GitHub Actions CI/CD, and Cloudflare
for DNS.

---

## Architecture

```
Cloudflare (DNS + proxy)
├── yourdomain.com  →  Azure Static Web Apps  (Next.js landing, pre-rendered)
├── app.*           →  Container Apps: web    (Next.js dashboard, SSR)
├── api.*           →  Container Apps: api    (FastAPI, WebSockets)
│                      Container Apps: celery-worker  (async task processing)
│                      Container Apps: celery-beat    (periodic scheduler)
└── (internal)         Container Apps Job: migrate    (Alembic, on deploy)

Azure services
├── Container Registry (ACR)  — Docker images
├── Key Vault                 — All secrets, managed identity access
├── PostgreSQL Flexible       — Primary database + pgvector extension
├── Azure Cache for Redis     — Celery broker + API caching
├── Container Apps Env        — Shared environment (Log Analytics connected)
└── Log Analytics + App Insights — Observability
```

---

## Prerequisites

| Tool | Minimum version | Install |
|------|----------------|---------|
| Azure CLI | 2.55+ | `brew install azure-cli` |
| Docker | 24+ | [docker.com/get-started](https://www.docker.com/get-started) |
| jq | 1.6+ | `brew install jq` |
| Node.js | 20+ | `brew install node` |
| Git | any | pre-installed on most systems |

You also need:
- An **Azure subscription** (Contributor access)
- A **GitHub repository** with this monorepo
- A **domain** managed by Cloudflare

---

## Quick Start (one command)

```bash
# 1. Log in to Azure
az login

# 2. Edit the parameter file with your domain
#    infra/azure/bicep/main.bicepparam  →  change rootDomain

# 3. Run bootstrap (provisions everything + prints GitHub secrets)
./infra/azure/scripts/bootstrap.sh --domain yourdomain.com

# 4. Set API keys in Key Vault
./infra/azure/scripts/setup-secrets.sh --keyvault <kv-name-from-step-3>

# 5. Add the GitHub Secrets printed by step 3 to your repo
#    github.com/<you>/<repo> → Settings → Secrets → Actions

# 6. Add DNS records to Cloudflare (printed by step 3, details in cloudflare/dns-setup.md)

# 7. Push to main — GitHub Actions deploys everything
git push origin main
```

---

## Step-by-Step Manual Deployment

### Step 1 — Configure parameters

Edit `infra/azure/bicep/main.bicepparam`:
```
param rootDomain = 'yourdomain.com'   # your actual domain
param environment = 'prod'            # dev | staging | prod
param location = 'eastus'            # Azure region
param projectName = 'voiceai'        # resource name prefix (max 12 chars)
```

### Step 2 — Set PostgreSQL password

The password is passed at deploy time and never stored in source control:
```bash
export POSTGRES_ADMIN_PASSWORD="YourStr0ngP@ssword!"
```

### Step 3 — Register Azure providers (first time only)

```bash
for provider in Microsoft.App Microsoft.ContainerRegistry \
  Microsoft.DBforPostgreSQL Microsoft.Cache Microsoft.KeyVault \
  Microsoft.OperationalInsights Microsoft.Insights Microsoft.Web \
  Microsoft.ManagedIdentity; do
  az provider register --namespace $provider --wait
done
```

### Step 4 — Deploy Bicep

```bash
az deployment sub create \
  --name voiceai-deploy \
  --location eastus \
  --template-file infra/azure/bicep/main.bicep \
  --parameters infra/azure/bicep/main.bicepparam \
  --parameters postgresAdminPassword="$POSTGRES_ADMIN_PASSWORD"
```

### Step 5 — Create GitHub Actions service principal

```bash
# Create SP with Contributor on the resource group
az ad sp create-for-rbac \
  --name sp-voiceai-github-prod \
  --role Contributor \
  --scopes /subscriptions/<sub-id>/resourceGroups/rg-voiceai-prod \
  --json-auth

# Grant AcrPush
az role assignment create \
  --assignee <client-id> \
  --role AcrPush \
  --scope $(az acr show --name <acr-name> --resource-group rg-voiceai-prod --query id -o tsv)
```

#### Configure OIDC (passwordless auth for GitHub Actions)

OIDC lets GitHub Actions authenticate to Azure without storing a secret.
The bootstrap script does this automatically, but if you need to do it manually:

```bash
# In Azure AD, add a federated credential to the app registration
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-main-prod",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<github-owner>/<repo-name>:ref:refs/heads/main",
    "description": "GitHub Actions OIDC for main branch",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

For pull requests and other branches, add additional federated credentials
with subjects like `repo:<owner>/<repo>:pull_request` or
`repo:<owner>/<repo>:environment:staging`.

### Step 6 — Add GitHub Secrets

Go to: **github.com/your-org/your-repo → Settings → Secrets and variables →
Actions → New repository secret**

| Secret name | Value | Where to find it |
|-------------|-------|-----------------|
| `AZURE_CLIENT_ID` | Service principal client ID | Output of step 5 / bootstrap.sh |
| `AZURE_TENANT_ID` | Azure tenant ID | `az account show --query tenantId` |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | `az account show --query id` |
| `ACR_NAME` | ACR resource name | Output of bootstrap.sh |
| `ACR_LOGIN_SERVER` | ACR login server URL | Output of bootstrap.sh |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web Apps deploy token | Output of bootstrap.sh |
| `ROOT_DOMAIN` | your domain | e.g. `voiceai.com` |

### Step 7 — Set API keys in Key Vault

```bash
./infra/azure/scripts/setup-secrets.sh --keyvault kv-voiceai-prod-<suffix>

# Or load from .env file
./infra/azure/scripts/setup-secrets.sh \
  --keyvault kv-voiceai-prod-<suffix> \
  --env-file .env.prod
```

Secrets managed:
- `secret-key` — JWT/session signing key (min 32 chars)
- `encryption-key` — Fernet key for data encryption
- `openai-api-key` — OpenAI API key
- `google-api-key` — Google API key
- `anthropic-api-key` — Anthropic API key
- `database-url` — set automatically by bootstrap.sh
- `redis-url` — set automatically by bootstrap.sh

### Step 8 — Configure Cloudflare DNS

See `cloudflare/dns-setup.md` for the complete guide. Summary:

1. Set SSL mode to **Full (strict)**
2. Add the 4 CNAME records printed by bootstrap.sh
3. After records propagate, bind custom domains on Azure (instructions in dns-setup.md)

### Step 9 — First deployment

```bash
git push origin main
```

The GitHub Actions workflow detects which apps changed and builds/deploys only
those. On first push all three apps deploy.

---

## Cost Estimate

All prices are approximate USD/month in East US.

### Production environment

| Resource | SKU | Estimated cost/mo |
|----------|-----|-------------------|
| Container Apps — api, web (active) | Consumption (0.5 vCPU, 1 GB) | $20–50 |
| Container Apps — celery worker | Consumption (1 vCPU, 2 GB) | $15–40 |
| Container Apps — celery beat | Consumption (0.25 vCPU, 0.5 GB) | $3–5 |
| PostgreSQL Flexible Server | Standard_D2ds_v4 (2 vCores) | ~$120 |
| Azure Cache for Redis | Standard C1 (1 GB, replicated) | ~$55 |
| Container Registry | Standard SKU | ~$20 |
| Static Web Apps | Standard tier | ~$9 |
| Key Vault | Standard (per operation) | ~$1 |
| Log Analytics | Pay-per-GB (varies) | $5–20 |
| **Total production estimate** | | **$250–320/mo** |

### Development / staging environment

| Resource | SKU | Estimated cost/mo |
|----------|-----|-------------------|
| Container Apps (all, min replicas) | Consumption | $10–20 |
| PostgreSQL Flexible Server | Standard_B2s (burstable) | ~$35 |
| Azure Cache for Redis | Basic C1 (1 GB, no SLA) | ~$16 |
| Container Registry | Standard SKU (shared) | ~$0 extra |
| Static Web Apps | Standard tier | ~$9 |
| Key Vault | Standard | ~$1 |
| Log Analytics | Pay-per-GB | $2–5 |
| **Total dev/staging estimate** | | **$75–90/mo** |

**Cost optimisation tips:**
- Scale Container Apps to 0 replicas in dev when not in use
- Use `az containerapp update --min-replicas 0 --name ... --resource-group ...`
- PostgreSQL Burstable is 3x cheaper than GeneralPurpose for light workloads
- Log Analytics costs scale with ingestion volume — set daily caps in dev

---

## Environment Promotion (dev → staging → prod)

Each environment is a separate resource group with its own resources.

```bash
# Deploy to dev
./infra/azure/scripts/bootstrap.sh --domain yourdomain.com --env dev

# Promote to staging
./infra/azure/scripts/bootstrap.sh --domain yourdomain.com --env staging

# Promote to prod (default)
./infra/azure/scripts/bootstrap.sh --domain yourdomain.com --env prod
```

The GitHub Actions workflow accepts an environment input for
`workflow_dispatch`. For automated promotion, add environment protection rules
in GitHub:
```
Settings → Environments → prod → Required reviewers
```

For staging/prod, consider using immutable tags (the git SHA) rather than
`latest` to guarantee exactly what is running in each environment.

---

## Rollback Procedure

### Roll back a Container App

```bash
# List revisions
az containerapp revision list \
  --name ca-voiceai-api-prod \
  --resource-group rg-voiceai-prod \
  --query "[].{Name:name, Active:properties.active, Created:properties.createdTime, Image:properties.template.containers[0].image}" \
  -o table

# Activate a previous revision and send 100% traffic to it
az containerapp ingress traffic set \
  --name ca-voiceai-api-prod \
  --resource-group rg-voiceai-prod \
  --revision-weight <previous-revision-name>=100
```

### Roll back via image tag

```bash
# Find the previous commit SHA
git log --oneline -10

# Deploy the previous SHA without rebuilding
./infra/azure/scripts/deploy.sh \
  --service api \
  --tag <previous-sha> \
  --skip-build
```

---

## Monitoring

### Azure Monitor and App Insights

Application Insights is wired to all Container Apps via the
`APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable.

Access dashboards:
```
Azure Portal → Application Insights → appi-voiceai-prod
```

Key metrics to watch:
- **Failed requests** — API 5xx errors
- **Server response time** — p95 latency
- **Live metrics** — real-time request stream
- **Dependency failures** — PostgreSQL or Redis connection issues

### Alert rules

Create these in Application Insights → Alerts → Create:

| Alert | Condition | Severity |
|-------|-----------|----------|
| High error rate | Failed requests > 10/min | Sev 1 |
| Slow API | Server response time p95 > 5s | Sev 2 |
| Container App restarts | Container restart count > 3/hour | Sev 2 |
| PostgreSQL CPU high | CPU > 80% for 5 min | Sev 3 |

### Container App logs

```bash
# Stream logs from API
az containerapp logs show \
  --name ca-voiceai-api-prod \
  --resource-group rg-voiceai-prod \
  --follow

# Query logs in Log Analytics
az monitor log-analytics query \
  --workspace $(az monitor log-analytics workspace show \
    --resource-group rg-voiceai-prod \
    --workspace-name log-voiceai-prod \
    --query customerId -o tsv) \
  --analytics-query "ContainerAppConsoleLogs_CL | where ContainerName_s == 'api' | order by TimeGenerated desc | take 50"
```

---

## Troubleshooting

### ACR authentication errors in Container Apps

**Symptom:** Container Apps fail to pull images with "unauthorized" error.

**Fix:** Verify the managed identity has AcrPull on the ACR:
```bash
az role assignment list \
  --scope $(az acr show --name <acr-name> --resource-group rg-voiceai-prod --query id -o tsv) \
  --query "[?roleDefinitionName=='AcrPull']"
```
If missing, bootstrap.sh handles this. Re-run it or assign manually:
```bash
az role assignment create \
  --assignee <managed-identity-principal-id> \
  --role AcrPull \
  --scope <acr-resource-id>
```

### pgvector extension not found

**Symptom:** `psycopg2.errors.UndefinedObject: extension "vector" does not exist`

**Fix:** The `azure.extensions = VECTOR` PostgreSQL configuration enables the
extension at the server level, but the extension must also be created in the
database:
```sql
-- Connect to the voiceai database and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

Add this to your Alembic migration (in `env.py` or a dedicated migration).

### WebSocket connections drop after ~100 seconds

**Symptom:** Voice calls disconnect unexpectedly after 1–2 minutes.

**Cause:** Cloudflare's proxy has a 100-second idle WebSocket timeout.

**Fix:** Implement heartbeat pings from the client every 30 seconds:
```javascript
// Client-side (browser)
const ws = new WebSocket('wss://api.yourdomain.com/ws/voice');
const heartbeat = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
ws.onclose = () => clearInterval(heartbeat);
```

FastAPI/Starlette automatically responds to WebSocket ping frames — no server
changes needed.

### Key Vault secrets not updating in Container Apps

**Symptom:** Updated a secret in Key Vault but Container App still uses old value.

**Cause:** Container Apps cache secret values at startup. The secret reference
uses a versionless URI which always resolves to latest, but the running
container has already loaded the old value.

**Fix:** Restart the Container App revision:
```bash
az containerapp revision restart \
  --name ca-voiceai-api-prod \
  --resource-group rg-voiceai-prod \
  --revision $(az containerapp revision list \
    --name ca-voiceai-api-prod \
    --resource-group rg-voiceai-prod \
    --query "[?properties.active].name" -o tsv | head -1)
```

### Celery tasks not processing

**Symptom:** Tasks queued but not executing; Celery Worker shows 0 active workers.

**Checks:**
```bash
# Check worker logs
az containerapp logs show \
  --name ca-voiceai-celery-worker-prod \
  --resource-group rg-voiceai-prod

# Check worker is scaled up (min 1 replica)
az containerapp show \
  --name ca-voiceai-celery-worker-prod \
  --resource-group rg-voiceai-prod \
  --query "properties.template.scale"

# Verify redis-url secret resolves correctly
az containerapp exec \
  --name ca-voiceai-celery-worker-prod \
  --resource-group rg-voiceai-prod \
  --command "printenv REDIS_URL"
```

### "Too many redirects" on the web app

**Cause:** Cloudflare SSL mode is set to Flexible while the Container App also
redirects HTTP to HTTPS.

**Fix:** Set Cloudflare SSL to **Full (strict)**.

---

## Tear Down

```bash
# Remove everything (with confirmation prompt)
./infra/azure/scripts/destroy.sh --env prod

# Also remove the GitHub Actions service principal
./infra/azure/scripts/destroy.sh --env prod --delete-sp

# Also permanently purge the Key Vault (no recovery)
./infra/azure/scripts/destroy.sh --env prod --purge-kv
```

The Key Vault enters soft-delete for 90 days even without `--purge-kv`.
This allows recovery if the deletion was accidental.
