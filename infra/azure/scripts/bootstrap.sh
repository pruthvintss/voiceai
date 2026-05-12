#!/usr/bin/env bash
# bootstrap.sh — One-command provisioning of all Azure resources for VoiceAI
#
# Usage:
#   ./infra/azure/scripts/bootstrap.sh --domain yourdomain.com [--env prod] [--location eastus]
#
# Prerequisites: az CLI, jq, docker (for first image push sanity check)
# The script is idempotent — safe to re-run after partial failures.

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

banner() { echo -e "\n${BLUE}${BOLD}$1${NC}"; }
info()   { echo -e "  ${CYAN}▸${NC} $1"; }
ok()     { echo -e "  ${GREEN}✓${NC} $1"; }
warn()   { echo -e "  ${YELLOW}⚠${NC} $1"; }
die()    { echo -e "\n${RED}ERROR: $1${NC}" >&2; exit 1; }

# ── Defaults (override via args) ──────────────────────────────────────────────
PROJECT="voiceai"
ENVIRONMENT="prod"
LOCATION="eastus"
ROOT_DOMAIN=""
POSTGRES_ADMIN_USERNAME="voiceaiadmin"
POSTGRES_ADMIN_PASSWORD="${POSTGRES_ADMIN_PASSWORD:-}"
SKIP_PROVIDER_REGISTRATION=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BICEP_DIR="${SCRIPT_DIR}/../bicep"

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --domain)    ROOT_DOMAIN="$2"; shift 2 ;;
    --env)       ENVIRONMENT="$2"; shift 2 ;;
    --location)  LOCATION="$2"; shift 2 ;;
    --project)   PROJECT="$2"; shift 2 ;;
    --pg-user)   POSTGRES_ADMIN_USERNAME="$2"; shift 2 ;;
    --skip-providers) SKIP_PROVIDER_REGISTRATION=true; shift ;;
    -h|--help)
      echo "Usage: $0 --domain yourdomain.com [--env prod] [--location eastus]"
      echo "       [--project voiceai] [--pg-user voiceaiadmin] [--skip-providers]"
      echo ""
      echo "Environment variables:"
      echo "  POSTGRES_ADMIN_PASSWORD  PostgreSQL admin password (prompted if not set)"
      exit 0 ;;
    *) die "Unknown argument: $1. Run with --help for usage." ;;
  esac
done

# ── Pre-flight checks ─────────────────────────────────────────────────────────
banner "Pre-flight checks"

command -v az  &>/dev/null || die "Azure CLI not installed. See https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
command -v jq  &>/dev/null || die "jq not installed. Install with: brew install jq  (macOS) or apt install jq (Debian)"

# Ensure logged in
az account show &>/dev/null || die "Not logged in to Azure. Run: az login"
ok "Azure CLI authenticated"

# Prompt for required inputs
if [[ -z "$ROOT_DOMAIN" ]]; then
  read -rp "  Enter your root domain (e.g. voiceai.com): " ROOT_DOMAIN
fi
[[ -n "$ROOT_DOMAIN" ]] || die "Root domain is required."

if [[ -z "$POSTGRES_ADMIN_PASSWORD" ]]; then
  echo -ne "  Enter PostgreSQL admin password (min 12 chars, mixed case + symbol): "
  read -rs POSTGRES_ADMIN_PASSWORD
  echo
fi
[[ ${#POSTGRES_ADMIN_PASSWORD} -ge 12 ]] || die "PostgreSQL password must be at least 12 characters."

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
RG="rg-${PROJECT}-${ENVIRONMENT}"

ok "Domain: ${ROOT_DOMAIN}"
ok "Environment: ${ENVIRONMENT}"
ok "Location: ${LOCATION}"
ok "Subscription: ${SUBSCRIPTION_ID}"
ok "Resource group: ${RG}"

# ── Step 1: Register Azure resource providers ─────────────────────────────────
if [[ "$SKIP_PROVIDER_REGISTRATION" == "false" ]]; then
  banner "Step 1/5: Registering Azure resource providers"
  PROVIDERS=(
    Microsoft.App
    Microsoft.ContainerRegistry
    Microsoft.DBforPostgreSQL
    Microsoft.Cache
    Microsoft.KeyVault
    Microsoft.OperationalInsights
    Microsoft.Insights
    Microsoft.Web
    Microsoft.ManagedIdentity
  )
  for provider in "${PROVIDERS[@]}"; do
    STATE=$(az provider show --namespace "$provider" --query registrationState -o tsv 2>/dev/null || echo "NotRegistered")
    if [[ "$STATE" != "Registered" ]]; then
      info "Registering ${provider}..."
      az provider register --namespace "$provider" --wait --output none
      ok "$provider registered"
    else
      ok "$provider already registered"
    fi
  done
else
  warn "Skipping provider registration (--skip-providers)"
fi

# ── Step 2: Deploy Bicep ──────────────────────────────────────────────────────
banner "Step 2/5: Deploying infrastructure via Bicep"
info "This creates all Azure resources. May take 10-20 minutes for first run..."

DEPLOYMENT_NAME="${PROJECT}-bootstrap-$(date +%Y%m%d%H%M%S)"

DEPLOYMENT_OUTPUT=$(az deployment sub create \
  --name "$DEPLOYMENT_NAME" \
  --location "$LOCATION" \
  --template-file "${BICEP_DIR}/main.bicep" \
  --parameters \
    environment="$ENVIRONMENT" \
    location="$LOCATION" \
    projectName="$PROJECT" \
    rootDomain="$ROOT_DOMAIN" \
    postgresAdminUsername="$POSTGRES_ADMIN_USERNAME" \
    postgresAdminPassword="$POSTGRES_ADMIN_PASSWORD" \
  --query properties.outputs \
  -o json)

ok "Bicep deployment succeeded: ${DEPLOYMENT_NAME}"

# Extract all outputs
ACR_SERVER=$(echo "$DEPLOYMENT_OUTPUT"   | jq -r '.acrLoginServer.value')
ACR_NAME=$(echo "$DEPLOYMENT_OUTPUT"     | jq -r '.acrName.value')
API_FQDN=$(echo "$DEPLOYMENT_OUTPUT"     | jq -r '.apiFqdn.value')
WEB_FQDN=$(echo "$DEPLOYMENT_OUTPUT"     | jq -r '.webFqdn.value')
LANDING_HOSTNAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.staticWebAppDefaultHostname.value')
LANDING_TOKEN=$(echo "$DEPLOYMENT_OUTPUT"    | jq -r '.staticWebAppDeployToken.value')
KV_NAME=$(echo "$DEPLOYMENT_OUTPUT"     | jq -r '.keyVaultName.value')
KV_URI=$(echo "$DEPLOYMENT_OUTPUT"      | jq -r '.keyVaultUri.value')
POSTGRES_HOST=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.postgresHost.value')
REDIS_HOST=$(echo "$DEPLOYMENT_OUTPUT"  | jq -r '.redisHost.value')
MIGRATE_JOB=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.migrateJobName.value')
IDENTITY_ID=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.managedIdentityId.value')

ok "ACR:       ${ACR_SERVER}"
ok "API FQDN:  ${API_FQDN}"
ok "Web FQDN:  ${WEB_FQDN}"
ok "Key Vault: ${KV_NAME}"

# ── Step 3: Create GitHub Actions service principal (OIDC) ────────────────────
banner "Step 3/5: Creating GitHub Actions service principal"

SP_NAME="sp-${PROJECT}-github-${ENVIRONMENT}"

# Check if SP already exists
EXISTING_SP=$(az ad sp list --display-name "$SP_NAME" --query "[0].appId" -o tsv 2>/dev/null || echo "")

if [[ -n "$EXISTING_SP" ]] && [[ "$EXISTING_SP" != "None" ]]; then
  CLIENT_ID="$EXISTING_SP"
  warn "Service principal already exists: ${SP_NAME} (${CLIENT_ID})"
  warn "Skipping creation. Existing credentials remain valid."
else
  info "Creating service principal: ${SP_NAME}"
  SP_OUTPUT=$(az ad sp create-for-rbac \
    --name "$SP_NAME" \
    --role Contributor \
    --scopes "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}" \
    --json-auth)
  CLIENT_ID=$(echo "$SP_OUTPUT" | jq -r '.clientId')
  ok "Service principal created: ${CLIENT_ID}"

  # Grant AcrPush so GitHub Actions can push images
  ACR_ID=$(az acr show --name "$ACR_NAME" --resource-group "$RG" --query id -o tsv)
  az role assignment create \
    --assignee "$CLIENT_ID" \
    --role AcrPush \
    --scope "$ACR_ID" \
    --output none
  ok "AcrPush role granted on ${ACR_NAME}"

  # Grant Key Vault Secrets Officer so setup-secrets.sh can write values
  KV_ID=$(az keyvault show --name "$KV_NAME" --resource-group "$RG" --query id -o tsv)
  az role assignment create \
    --assignee "$CLIENT_ID" \
    --role "Key Vault Secrets Officer" \
    --scope "$KV_ID" \
    --output none
  ok "Key Vault Secrets Officer role granted on ${KV_NAME}"
fi

# Configure OIDC federated credentials (no stored secret needed)
info "Configuring OIDC federated credentials for GitHub Actions..."
GITHUB_REPO_INFO=$(git -C "${SCRIPT_DIR}" remote get-url origin 2>/dev/null | sed 's|.*github.com[:/]||' | sed 's|\.git$||' || echo "")
if [[ -n "$GITHUB_REPO_INFO" ]]; then
  FEDERATED_CRED_NAME="github-main-${ENVIRONMENT}"
  EXISTING_CRED=$(az ad app federated-credential list \
    --id "$CLIENT_ID" \
    --query "[?name=='${FEDERATED_CRED_NAME}'].name" -o tsv 2>/dev/null || echo "")

  if [[ -z "$EXISTING_CRED" ]]; then
    az ad app federated-credential create \
      --id "$CLIENT_ID" \
      --parameters "{
        \"name\": \"${FEDERATED_CRED_NAME}\",
        \"issuer\": \"https://token.actions.githubusercontent.com\",
        \"subject\": \"repo:${GITHUB_REPO_INFO}:ref:refs/heads/main\",
        \"description\": \"GitHub Actions OIDC for ${PROJECT} ${ENVIRONMENT}\",
        \"audiences\": [\"api://AzureADTokenExchange\"]
      }" --output none
    ok "Federated credential created for repo: ${GITHUB_REPO_INFO}"
  else
    warn "Federated credential already exists: ${FEDERATED_CRED_NAME}"
  fi
else
  warn "Could not detect GitHub repo URL. Configure OIDC federated credentials manually."
  warn "See README.md for instructions."
fi

# ── Step 4: Populate Key Vault with Postgres + Redis connection strings ────────
banner "Step 4/5: Populating Key Vault connection strings"
info "Writing database-url and redis-url from deployment outputs..."

# Build connection string from deployment outputs
REDIS_KEY=$(az redis list-keys \
  --name "redis-${PROJECT}-${ENVIRONMENT}-$(az redis list --resource-group "$RG" --query "[0].name" -o tsv | sed "s/redis-${PROJECT}-${ENVIRONMENT}-//")" \
  --resource-group "$RG" \
  --query primaryKey -o tsv 2>/dev/null || echo "")

# Simpler: look up the redis resource directly
REDIS_RESOURCE=$(az redis list --resource-group "$RG" --query "[0].name" -o tsv)
REDIS_KEY=$(az redis list-keys --name "$REDIS_RESOURCE" --resource-group "$RG" --query primaryKey -o tsv)

DATABASE_URL="postgresql+asyncpg://${POSTGRES_ADMIN_USERNAME}:${POSTGRES_ADMIN_PASSWORD}@${POSTGRES_HOST}:5432/voiceai?sslmode=require"
REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:6380/0"

az keyvault secret set --vault-name "$KV_NAME" --name "database-url" --value "$DATABASE_URL" --output none
ok "database-url stored in Key Vault"

az keyvault secret set --vault-name "$KV_NAME" --name "redis-url" --value "$REDIS_URL" --output none
ok "redis-url stored in Key Vault"

warn "Run './scripts/setup-secrets.sh --keyvault ${KV_NAME}' to set API keys (OpenAI, Anthropic, etc.)"

# ── Step 5: Summary ───────────────────────────────────────────────────────────
banner "Step 5/5: Bootstrap complete!"

echo ""
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}${BOLD}  AZURE RESOURCES${NC}"
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Container Registry:   ${ACR_SERVER}"
echo -e "  API FQDN:             ${API_FQDN}"
echo -e "  Web FQDN:             ${WEB_FQDN}"
echo -e "  Landing:              ${LANDING_HOSTNAME}"
echo -e "  Key Vault:            ${KV_NAME} (${KV_URI})"
echo -e "  PostgreSQL host:      ${POSTGRES_HOST}"
echo -e "  Redis host:           ${REDIS_HOST}"
echo ""
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}${BOLD}  GITHUB SECRETS — add these to your repository${NC}"
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  AZURE_CLIENT_ID:                  ${CLIENT_ID}"
echo -e "  AZURE_TENANT_ID:                  ${TENANT_ID}"
echo -e "  AZURE_SUBSCRIPTION_ID:            ${SUBSCRIPTION_ID}"
echo -e "  ACR_NAME:                         ${ACR_NAME}"
echo -e "  ACR_LOGIN_SERVER:                 ${ACR_SERVER}"
echo -e "  AZURE_STATIC_WEB_APPS_API_TOKEN:  ${LANDING_TOKEN}"
echo -e "  ROOT_DOMAIN:                      ${ROOT_DOMAIN}"
echo ""
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}${BOLD}  CLOUDFLARE DNS RECORDS${NC}"
echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Type   Name    Target                                      Proxy"
echo -e "  CNAME  @       ${LANDING_HOSTNAME}  Proxied"
echo -e "  CNAME  www     ${LANDING_HOSTNAME}  Proxied"
echo -e "  CNAME  app     ${WEB_FQDN}  Proxied"
echo -e "  CNAME  api     ${API_FQDN}  Proxied"
echo ""
echo -e "${YELLOW}${BOLD}Next steps:${NC}"
echo -e "  1. Add the GitHub Secrets above to your repository"
echo -e "     Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo -e "  2. Set API keys in Key Vault:"
echo -e "     ./infra/azure/scripts/setup-secrets.sh --keyvault ${KV_NAME}"
echo ""
echo -e "  3. Add the Cloudflare DNS records above (see cloudflare/dns-setup.md)"
echo ""
echo -e "  4. Push to main to trigger your first deployment:"
echo -e "     git push origin main"
echo ""
echo -e "  5. After first deploy, bind custom domains:"
echo -e "     See cloudflare/dns-setup.md → 'Custom Domain on Container Apps'"
