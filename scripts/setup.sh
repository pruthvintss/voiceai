#!/usr/bin/env bash
# First-time project setup script.
# Usage: ./scripts/setup.sh  (or: make setup)

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}[setup]${NC} $*"; }
success() { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $*"; }
error()   { echo -e "${RED}[setup]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ─── Prerequisite Checks ──────────────────────────────────────────────────────
check_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required tool not found: $1. Please install it and retry."
}

info "Checking prerequisites..."
check_command docker
check_command python3

# Docker Compose v2 can be either a standalone binary or a Docker plugin
if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  die "Docker Compose not found. Install Docker Desktop or the docker-compose-plugin."
fi

# Verify docker daemon is running
docker info >/dev/null 2>&1 || die "Docker daemon is not running. Start Docker and retry."

success "All prerequisites found."

# ─── .env Setup ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

if [ -f ".env" ]; then
  warn ".env already exists — skipping copy (delete it to regenerate)"
else
  info "Copying .env.example → .env ..."
  cp .env.example .env
  success "Created .env"

  info "Generating secure SECRET_KEY and ENCRYPTION_KEY ..."
  # Append generated keys, overwriting the placeholder lines
  python3 scripts/generate-keys.py >> /tmp/voiceai_keys.txt
  while IFS='=' read -r key value; do
    # Escape special chars in value for sed
    escaped_value=$(printf '%s\n' "$value" | sed 's/[[\.*^$()+?{|]/\\&/g')
    if grep -q "^${key}=" .env; then
      sed -i.bak "s|^${key}=.*|${key}=${escaped_value}|" .env && rm -f .env.bak
    fi
  done < /tmp/voiceai_keys.txt
  rm -f /tmp/voiceai_keys.txt
  success "Keys generated and written to .env"
fi

# ─── Build Images ─────────────────────────────────────────────────────────────
info "Building Docker images (this may take a few minutes on first run)..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml build

# ─── Start Services ───────────────────────────────────────────────────────────
info "Starting services in background..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# ─── Wait for Health ──────────────────────────────────────────────────────────
wait_for_service() {
  local name="$1"
  local max_wait="${2:-60}"
  local elapsed=0

  info "Waiting for $name to be healthy..."
  while ! docker compose ps "$name" 2>/dev/null | grep -q "healthy"; do
    if [ "$elapsed" -ge "$max_wait" ]; then
      error "$name did not become healthy within ${max_wait}s"
      docker compose logs "$name" --tail=20
      return 1
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done
  success "$name is healthy"
}

wait_for_service postgres 90
wait_for_service redis 30
wait_for_service api 120

# ─── Database Migrations ──────────────────────────────────────────────────────
info "Running database migrations..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml \
  exec -T api alembic upgrade head
success "Migrations applied"

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        VoiceAI Platform is ready!            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Frontend       ${CYAN}http://localhost:3000${NC}"
echo -e "  API            ${CYAN}http://localhost:8000${NC}"
echo -e "  API Docs       ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  PgAdmin        ${CYAN}http://localhost:5050${NC}"
echo -e "  Redis Cmdr     ${CYAN}http://localhost:8081${NC}"
echo -e "  Email (dev)    ${CYAN}http://localhost:8025${NC}"
echo ""
echo -e "  Next steps:"
echo -e "    • Edit ${YELLOW}.env${NC} with your API keys (ANTHROPIC_API_KEY, etc.)"
echo -e "    • Restart with: ${YELLOW}make dev${NC}"
echo -e "    • Seed demo data: ${YELLOW}make seed-demo${NC}"
echo ""
