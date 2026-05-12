#!/usr/bin/env bash
# deploy.sh — Manual deploy without re-running Bicep.
#
# Use this when infrastructure is already provisioned and you just need to
# build a new image, push it, and update the Container App.
#
# Usage:
#   ./infra/azure/scripts/deploy.sh --service api --tag latest
#   ./infra/azure/scripts/deploy.sh --service web --tag abc1234
#   ./infra/azure/scripts/deploy.sh --service landing
#   ./infra/azure/scripts/deploy.sh --service all
#
# Requires: az CLI, docker, jq

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "  ${CYAN}▸${NC} $1"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
die()  { echo -e "\n${RED}ERROR: $1${NC}" >&2; exit 1; }

# ── Defaults ──────────────────────────────────────────────────────────────────
PROJECT="voiceai"
ENVIRONMENT="prod"
SERVICE=""
TAG=""
SKIP_BUILD=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --service|-s)    SERVICE="$2"; shift 2 ;;
    --tag|-t)        TAG="$2"; shift 2 ;;
    --env|-e)        ENVIRONMENT="$2"; shift 2 ;;
    --project|-p)    PROJECT="$2"; shift 2 ;;
    --skip-build)    SKIP_BUILD=true; shift ;;
    -h|--help)
      echo "Usage: $0 --service <api|web|landing|all> [--tag <git-sha|latest>]"
      echo "       [--env prod] [--project voiceai] [--skip-build]"
      exit 0 ;;
    *) die "Unknown argument: $1. Run with --help." ;;
  esac
done

[[ -n "$SERVICE" ]] || die "--service is required (api, web, landing, all)"

# Default tag to current git SHA if not specified
if [[ -z "$TAG" ]]; then
  TAG=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "latest")
fi

RG="rg-${PROJECT}-${ENVIRONMENT}"

# ── Resolve Azure resources ───────────────────────────────────────────────────
echo -e "\n${BLUE}Resolving Azure resources for ${PROJECT}-${ENVIRONMENT}...${NC}"

az account show &>/dev/null || die "Not logged in to Azure. Run: az login"

ACR_NAME=$(az acr list --resource-group "$RG" --query "[0].name" -o tsv 2>/dev/null || echo "")
[[ -n "$ACR_NAME" ]] || die "No ACR found in resource group ${RG}. Run bootstrap.sh first."

ACR_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ok "ACR: ${ACR_SERVER}"

# ── Helper: build + push one image ───────────────────────────────────────────
build_and_push() {
  local app_name="$1"    # e.g. "api" or "web"
  local context_dir="$2" # e.g. "apps/api"
  local build_args="${3:-}"

  local image="${ACR_SERVER}/${PROJECT}-${app_name}"
  local full_tag="${image}:${TAG}"
  local latest_tag="${image}:latest"

  if [[ "$SKIP_BUILD" == "true" ]]; then
    warn "Skipping build (--skip-build). Assuming ${full_tag} already exists in ACR."
    return
  fi

  info "Logging in to ACR ${ACR_NAME}..."
  az acr login --name "$ACR_NAME"

  info "Building ${app_name} image..."
  local build_cmd="docker build -t ${full_tag} -t ${latest_tag}"
  if [[ -n "$build_args" ]]; then
    while IFS= read -r arg; do
      build_cmd+=" --build-arg ${arg}"
    done <<< "$build_args"
  fi
  build_cmd+=" ${REPO_ROOT}/${context_dir}"

  eval "$build_cmd"
  ok "Built: ${full_tag}"

  info "Pushing ${app_name} images to ACR..."
  docker push "${full_tag}"
  docker push "${latest_tag}"
  ok "Pushed: ${full_tag}"
  ok "Pushed: ${latest_tag}"
}

# ── Helper: update a Container App ───────────────────────────────────────────
update_container_app() {
  local app_name="$1"
  local image_name="$2"

  local ca_name="ca-${PROJECT}-${app_name}-${ENVIRONMENT}"
  local full_image="${ACR_SERVER}/${PROJECT}-${image_name}:${TAG}"

  info "Updating ${ca_name} → ${full_image}..."
  az containerapp update \
    --name "$ca_name" \
    --resource-group "$RG" \
    --image "$full_image" \
    --output none
  ok "${ca_name} updated"
}

# ── Deploy functions ──────────────────────────────────────────────────────────
deploy_api() {
  echo -e "\n${BLUE}Deploying API (tag: ${TAG})${NC}"
  build_and_push "api" "apps/api"
  update_container_app "api" "api"
  update_container_app "celery-worker" "api"
  update_container_app "celery-beat" "api"

  # Run migrations
  info "Triggering migration job..."
  JOB_NAME="ca-${PROJECT}-migrate-${ENVIRONMENT}"
  JOB_EXEC=$(az containerapp job start \
    --name "$JOB_NAME" \
    --resource-group "$RG" \
    --query name -o tsv 2>/dev/null || echo "")

  if [[ -n "$JOB_EXEC" ]]; then
    info "Migration job started: ${JOB_EXEC}"
    for i in $(seq 1 30); do
      STATUS=$(az containerapp job execution show \
        --name "$JOB_NAME" \
        --resource-group "$RG" \
        --job-execution-name "$JOB_EXEC" \
        --query "properties.status" -o tsv 2>/dev/null || echo "Running")
      [[ "$STATUS" == "Succeeded" ]] && { ok "Migrations complete"; break; }
      [[ "$STATUS" == "Failed" ]] && { die "Migration job failed. Check Azure portal logs."; }
      [[ $i -eq 30 ]] && warn "Migration still running — check manually: az containerapp job execution show --name ${JOB_NAME} --resource-group ${RG} --job-execution-name ${JOB_EXEC}"
      sleep 10
    done
  else
    warn "Could not start migration job (may need an image push first)"
  fi

  ok "API deployment complete"
}

deploy_web() {
  echo -e "\n${BLUE}Deploying Web dashboard (tag: ${TAG})${NC}"

  # Build args: these must be baked into the Next.js image at build time
  DOMAIN=$(az containerapp show \
    --name "ca-${PROJECT}-api-${ENVIRONMENT}" \
    --resource-group "$RG" \
    --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || echo "")

  BUILD_ARGS=""
  if [[ -n "$DOMAIN" ]]; then
    # Try to infer root domain from API fqdn pattern
    # ca-voiceai-api-prod.xxx.eastus.azurecontainerapps.io → not the custom domain
    # The user should set ROOT_DOMAIN env var for accurate NEXT_PUBLIC_* values
    ROOT_DOMAIN="${ROOT_DOMAIN:-${DOMAIN}}"
    BUILD_ARGS="NEXT_PUBLIC_API_URL=https://api.${ROOT_DOMAIN}
NEXT_PUBLIC_WS_URL=wss://api.${ROOT_DOMAIN}"
  fi

  build_and_push "web" "apps/web" "$BUILD_ARGS"
  update_container_app "web" "web"
  ok "Web deployment complete"
}

deploy_landing() {
  echo -e "\n${BLUE}Deploying landing page${NC}"

  command -v node &>/dev/null || die "Node.js not installed."
  command -v npm  &>/dev/null || die "npm not installed."

  LANDING_DIR="${REPO_ROOT}/apps/landing"
  [[ -d "$LANDING_DIR" ]] || die "Landing app not found at ${LANDING_DIR}"

  info "Installing dependencies..."
  npm ci --prefix "$LANDING_DIR"

  info "Building landing site..."
  npm run build --prefix "$LANDING_DIR"

  SWA_NAME=$(az staticwebapp list \
    --resource-group "$RG" \
    --query "[0].name" -o tsv 2>/dev/null || echo "")

  if [[ -z "$SWA_NAME" ]]; then
    warn "Static Web App not found. Deploy via GitHub Actions or run bootstrap.sh."
    return
  fi

  SWA_TOKEN=$(az staticwebapp secrets list \
    --name "$SWA_NAME" \
    --resource-group "$RG" \
    --query "properties.apiKey" -o tsv)

  info "Deploying to Azure Static Web Apps (${SWA_NAME})..."
  npx @azure/static-web-apps-cli deploy \
    "${LANDING_DIR}/out" \
    --deployment-token "$SWA_TOKEN" \
    --env production

  ok "Landing deployment complete"
}

# ── Main dispatch ─────────────────────────────────────────────────────────────
case "$SERVICE" in
  api)     deploy_api ;;
  web)     deploy_web ;;
  landing) deploy_landing ;;
  all)
    deploy_api
    deploy_web
    deploy_landing
    ;;
  *) die "Unknown service: ${SERVICE}. Choose: api, web, landing, all" ;;
esac

echo ""
echo -e "${GREEN}Deployment finished — tag: ${TAG}${NC}"
echo ""
echo -e "  To roll back to previous revision:"
echo -e "    az containerapp revision list --name ca-${PROJECT}-api-${ENVIRONMENT} --resource-group ${RG}"
echo -e "    az containerapp ingress traffic set --name ca-${PROJECT}-api-${ENVIRONMENT} --resource-group ${RG} --revision-weight <old-revision>=100"
