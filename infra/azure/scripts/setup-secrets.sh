#!/usr/bin/env bash
# setup-secrets.sh — Interactively populate Key Vault with API keys and secrets.
#
# Usage:
#   ./infra/azure/scripts/setup-secrets.sh --keyvault kv-voiceai-prod-xxxxx
#   ./infra/azure/scripts/setup-secrets.sh --keyvault kv-voiceai-prod-xxxxx --env-file .env
#
# The script is idempotent: it checks whether each secret already has a real
# value before prompting, and skips secrets that are already set.

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

# ── Argument parsing ──────────────────────────────────────────────────────────
KEYVAULT_NAME=""
ENV_FILE=""
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --keyvault|-k) KEYVAULT_NAME="$2"; shift 2 ;;
    --env-file|-e) ENV_FILE="$2"; shift 2 ;;
    --force|-f)    FORCE=true; shift ;;
    -h|--help)
      echo "Usage: $0 --keyvault <kv-name> [--env-file <path-to-.env>] [--force]"
      echo ""
      echo "Options:"
      echo "  --keyvault, -k    Key Vault name (required)"
      echo "  --env-file, -e    Path to .env file to source values from"
      echo "  --force, -f       Overwrite secrets that are already set"
      exit 0 ;;
    *) die "Unknown argument: $1. Run with --help for usage." ;;
  esac
done

[[ -n "$KEYVAULT_NAME" ]] || die "--keyvault is required."

# Pre-flight
command -v az &>/dev/null || die "Azure CLI not installed."
az account show &>/dev/null || die "Not logged in. Run: az login"
az keyvault show --name "$KEYVAULT_NAME" &>/dev/null || \
  die "Key Vault '${KEYVAULT_NAME}' not found or not accessible."

echo -e "\n${BLUE}Setting secrets in Key Vault: ${KEYVAULT_NAME}${NC}"
echo -e "Secrets with real values will be skipped (use --force to overwrite).\n"

# ── Load from .env file if provided ──────────────────────────────────────────
declare -A ENV_VALUES

if [[ -n "$ENV_FILE" ]]; then
  [[ -f "$ENV_FILE" ]] || die "env-file not found: ${ENV_FILE}"
  info "Loading values from ${ENV_FILE}"
  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    # Strip surrounding quotes from value
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    ENV_VALUES["$key"]="$value"
  done < "$ENV_FILE"
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

# Returns true if the secret already has a real (non-placeholder) value
secret_is_set() {
  local secret_name="$1"
  local current_value
  current_value=$(az keyvault secret show \
    --vault-name "$KEYVAULT_NAME" \
    --name "$secret_name" \
    --query value -o tsv 2>/dev/null || echo "")

  if [[ -z "$current_value" ]] || \
     [[ "$current_value" == "PLACEHOLDER_SET_BY_SETUP_SECRETS_SH" ]]; then
    return 1  # Not set
  fi
  return 0  # Already set
}

# Store a secret; skip if already set and --force not passed
store_secret() {
  local secret_name="$1"
  local env_key="${2:-}"
  local prompt_text="$3"
  local validator="${4:-}"   # Optional: function name to validate value
  local is_password="${5:-false}"

  # Try to get value from env file first
  local value=""
  if [[ -n "$env_key" ]] && [[ -n "${ENV_VALUES[$env_key]+x}" ]]; then
    value="${ENV_VALUES[$env_key]}"
  fi

  # Skip if already set (unless --force)
  if secret_is_set "$secret_name"; then
    if [[ "$FORCE" == "false" ]]; then
      ok "${secret_name}: already set (use --force to overwrite)"
      return
    else
      warn "${secret_name}: overwriting existing value"
    fi
  fi

  # Prompt if not loaded from env file
  if [[ -z "$value" ]]; then
    if [[ "$is_password" == "true" ]]; then
      echo -ne "  ${prompt_text}: "
      read -rs value
      echo
    else
      read -rp "  ${prompt_text}: " value
    fi
  fi

  # Validate if validator provided
  if [[ -n "$validator" ]] && [[ -n "$value" ]]; then
    if ! $validator "$value"; then
      die "Validation failed for ${secret_name}. See error above."
    fi
  fi

  if [[ -z "$value" ]]; then
    warn "Skipping ${secret_name} (no value provided)"
    return
  fi

  az keyvault secret set \
    --vault-name "$KEYVAULT_NAME" \
    --name "$secret_name" \
    --value "$value" \
    --output none

  ok "${secret_name}: stored"
}

# ── Validators ────────────────────────────────────────────────────────────────

validate_jwt_secret() {
  local val="$1"
  if [[ ${#val} -lt 32 ]]; then
    echo -e "${RED}  Error: SECRET_KEY must be at least 32 characters (got ${#val})${NC}" >&2
    return 1
  fi
}

validate_fernet_key() {
  local val="$1"
  # Fernet keys are 32 bytes base64url-encoded = 44 chars ending in '='
  if ! echo "$val" | python3 -c "
import sys, base64
key = sys.stdin.read().strip()
try:
    decoded = base64.urlsafe_b64decode(key + '==')
    assert len(decoded) == 32, f'Expected 32 bytes, got {len(decoded)}'
except Exception as e:
    sys.exit(f'Invalid Fernet key: {e}')
" 2>/dev/null; then
    # Fallback: just check length (44 chars) if python3 not available
    if [[ ${#val} -ne 44 ]]; then
      echo -e "${RED}  Error: ENCRYPTION_KEY must be a valid Fernet key (44 base64url chars).${NC}" >&2
      echo -e "${RED}  Generate one with: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"${NC}" >&2
      return 1
    fi
  fi
}

# ── Store all secrets ─────────────────────────────────────────────────────────
echo -e "  ${YELLOW}Note: database-url and redis-url are set automatically by bootstrap.sh.${NC}"
echo -e "  ${YELLOW}Prompting only for API keys and application secrets below.${NC}\n"

store_secret "secret-key" \
  "SECRET_KEY" \
  "JWT / app secret key (min 32 chars, random string)" \
  "validate_jwt_secret" \
  "true"

store_secret "encryption-key" \
  "ENCRYPTION_KEY" \
  "Fernet encryption key (44 chars, generate with Fernet.generate_key())" \
  "validate_fernet_key" \
  "true"

store_secret "openai-api-key" \
  "OPENAI_API_KEY" \
  "OpenAI API key (sk-...)" \
  "" \
  "true"

store_secret "google-api-key" \
  "GOOGLE_API_KEY" \
  "Google API key (leave blank to skip)" \
  "" \
  "true"

store_secret "anthropic-api-key" \
  "ANTHROPIC_API_KEY" \
  "Anthropic API key (sk-ant-...)" \
  "" \
  "true"

echo ""
echo -e "${GREEN}Done!${NC} All secrets processed for Key Vault: ${KEYVAULT_NAME}"
echo ""
echo -e "  Verify with: az keyvault secret list --vault-name ${KEYVAULT_NAME} --query \"[].name\" -o table"
echo ""
echo -e "${YELLOW}Remember to restart Container Apps to pick up new secret values:${NC}"
echo -e "  az containerapp revision restart --name ca-voiceai-api-prod --resource-group rg-voiceai-prod --all"
