#!/usr/bin/env bash
# destroy.sh — Tear down all Azure resources for VoiceAI.
#
# This is DESTRUCTIVE and IRREVERSIBLE.  All resources in the resource group
# will be deleted, including PostgreSQL data, ACR images, and Key Vault secrets.
# Key Vault and PostgreSQL have soft-delete protection — see warnings below.
#
# Usage:
#   ./infra/azure/scripts/destroy.sh [--env prod] [--project voiceai]

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info() { echo -e "  ${CYAN}▸${NC} $1"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
die()  { echo -e "\n${RED}ERROR: $1${NC}" >&2; exit 1; }

# ── Defaults ──────────────────────────────────────────────────────────────────
PROJECT="voiceai"
ENVIRONMENT="prod"
PURGE_KV=false
DELETE_SP=false

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --env|-e)       ENVIRONMENT="$2"; shift 2 ;;
    --project|-p)   PROJECT="$2"; shift 2 ;;
    --purge-kv)     PURGE_KV=true; shift ;;
    --delete-sp)    DELETE_SP=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--env prod] [--project voiceai] [--purge-kv] [--delete-sp]"
      echo ""
      echo "Options:"
      echo "  --env         Environment to destroy (default: prod)"
      echo "  --project     Project name (default: voiceai)"
      echo "  --purge-kv    Also purge the soft-deleted Key Vault (permanent, loses all secrets)"
      echo "  --delete-sp   Also delete the GitHub Actions service principal"
      exit 0 ;;
    *) die "Unknown argument: $1. Run with --help." ;;
  esac
done

RG="rg-${PROJECT}-${ENVIRONMENT}"
SP_NAME="sp-${PROJECT}-github-${ENVIRONMENT}"

# ── Pre-flight ────────────────────────────────────────────────────────────────
command -v az &>/dev/null || die "Azure CLI not installed."
az account show &>/dev/null || die "Not logged in. Run: az login"

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

# ── Show what will be destroyed ───────────────────────────────────────────────
echo ""
echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}${BOLD}  WARNING: DESTRUCTIVE OPERATION${NC}"
echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Subscription:    ${SUBSCRIPTION_ID}"
echo -e "  Resource group:  ${RG}"
echo ""
echo -e "  The following will be PERMANENTLY DELETED:"
echo ""

# List all resources in the group
if az group show --name "$RG" &>/dev/null; then
  az resource list --resource-group "$RG" \
    --query "[].{Type:type, Name:name}" \
    -o table 2>/dev/null || true
else
  echo -e "  ${YELLOW}Resource group '${RG}' does not exist — nothing to destroy.${NC}"
  exit 0
fi

echo ""
echo -e "${YELLOW}${BOLD}Important warnings:${NC}"
echo -e "  ${YELLOW}•${NC} PostgreSQL data will be permanently lost"
echo -e "  ${YELLOW}•${NC} ACR images will be permanently deleted"
if [[ "$PURGE_KV" == "true" ]]; then
  echo -e "  ${RED}•${NC} Key Vault secrets will be PURGED (no recovery possible)"
else
  echo -e "  ${YELLOW}•${NC} Key Vault will enter soft-delete (recoverable for 90 days)"
  echo -e "    To purge: az keyvault purge --name <kv-name> --location <location>"
fi
if [[ "$DELETE_SP" == "true" ]]; then
  echo -e "  ${YELLOW}•${NC} GitHub Actions service principal '${SP_NAME}' will be deleted"
fi
echo ""

# ── Confirmation ──────────────────────────────────────────────────────────────
echo -e "${RED}${BOLD}Type the resource group name to confirm deletion: ${NC}"
read -r CONFIRMATION

if [[ "$CONFIRMATION" != "$RG" ]]; then
  echo -e "\n${GREEN}Aborted. Resource group '${CONFIRMATION}' does not match '${RG}'.${NC}"
  exit 0
fi

echo ""
echo -e "${RED}Are you absolutely sure? This cannot be undone. (yes/no): ${NC}"
read -r FINAL_CONFIRM

if [[ "$FINAL_CONFIRM" != "yes" ]]; then
  echo -e "\n${GREEN}Aborted.${NC}"
  exit 0
fi

# ── Collect Key Vault name before deletion ────────────────────────────────────
KV_NAME=$(az keyvault list \
  --resource-group "$RG" \
  --query "[0].name" -o tsv 2>/dev/null || echo "")
KV_LOCATION=$(az keyvault list \
  --resource-group "$RG" \
  --query "[0].location" -o tsv 2>/dev/null || echo "$ENVIRONMENT")

# ── Delete service principal (optional) ───────────────────────────────────────
if [[ "$DELETE_SP" == "true" ]]; then
  echo ""
  info "Deleting service principal: ${SP_NAME}"
  SP_ID=$(az ad sp list --display-name "$SP_NAME" --query "[0].id" -o tsv 2>/dev/null || echo "")
  if [[ -n "$SP_ID" ]] && [[ "$SP_ID" != "None" ]]; then
    az ad sp delete --id "$SP_ID"
    ok "Service principal deleted: ${SP_NAME}"
  else
    warn "Service principal not found: ${SP_NAME}"
  fi
fi

# ── Delete resource group (cascades to all resources) ─────────────────────────
echo ""
info "Deleting resource group '${RG}' and all contained resources..."
info "This may take 5-15 minutes..."

az group delete \
  --name "$RG" \
  --yes \
  --no-wait

echo ""
info "Deletion initiated (running in background). Monitor progress:"
info "  az group show --name ${RG} --query properties.provisioningState -o tsv"
echo ""

# ── Purge Key Vault (optional) ────────────────────────────────────────────────
if [[ "$PURGE_KV" == "true" ]] && [[ -n "$KV_NAME" ]]; then
  echo ""
  warn "Waiting 60s for resource group deletion to proceed before purging Key Vault..."
  sleep 60

  info "Purging soft-deleted Key Vault: ${KV_NAME}"
  az keyvault purge --name "$KV_NAME" --location "$KV_LOCATION" || \
    warn "Purge failed — Key Vault may not be soft-deleted yet. Retry in a few minutes:
    az keyvault purge --name ${KV_NAME} --location ${KV_LOCATION}"
  ok "Key Vault purged: ${KV_NAME}"
fi

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Destruction initiated for: ${RG}${NC}"
echo ""
echo -e "  Monitor deletion: az group show --name ${RG} -o table"
echo ""
if [[ "$PURGE_KV" == "false" ]] && [[ -n "$KV_NAME" ]]; then
  echo -e "${YELLOW}  Soft-deleted Key Vault can be recovered within 90 days:${NC}"
  echo -e "    az keyvault recover --name ${KV_NAME}"
  echo ""
  echo -e "${YELLOW}  To permanently purge it (releases the name for reuse):${NC}"
  echo -e "    az keyvault purge --name ${KV_NAME} --location ${KV_LOCATION}"
  echo ""
fi
echo -e "  To reprovision, run: ./infra/azure/scripts/bootstrap.sh --domain yourdomain.com"
