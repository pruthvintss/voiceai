# VoiceAI Platform

Production-grade realtime AI voice platform with persistent memory, MCP integrations, and BYOK (Bring Your Own Key) support.

## Features

- **Realtime voice conversations** — OpenAI Realtime API and Google Gemini Live
- **Long-term memory** — Semantic search powered by pgvector; memories persist across sessions
- **MCP tool integrations** — Gmail, Slack, Google Calendar, CRM, Jira
- **BYOK API key management** — Users supply their own provider keys; keys are encrypted at rest
- **Post-call summarization** — Automatic call summaries and memory extraction via Claude
- **Context injection** — Relevant memories and facts injected before each call
- **Analytics dashboard** — Usage stats, call history, memory graph

## Architecture

```
┌──────────┐     HTTPS/WSS      ┌────────────────────────────────────────────┐
│  Browser │ ─────────────────► │  Nginx (reverse proxy)                     │
└──────────┘                    │  /        → Next.js  (port 3000)           │
                                │  /api/*   → FastAPI  (port 8000)           │
                                │  /ws/*    → FastAPI  (port 8000, upgraded) │
                                └─────────────────┬──────────────────────────┘
                                                  │
                     ┌────────────────────────────┼──────────────────────┐
                     │                            │                      │
                     ▼                            ▼                      ▼
              ┌─────────────┐           ┌─────────────────┐    ┌──────────────┐
              │  Next.js    │           │  FastAPI        │    │  Celery      │
              │  (SSR/SPA)  │           │  (REST + WS)    │    │  Workers     │
              └─────────────┘           └────────┬────────┘    └──────┬───────┘
                                                 │                    │
                                    ┌────────────┼────────────────────┘
                                    │            │
                                    ▼            ▼
                              ┌──────────┐  ┌─────────┐
                              │ Postgres │  │  Redis  │
                              │ +pgvector│  │  cache/ │
                              │          │  │  queues │
                              └──────────┘  └─────────┘
```

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+ and Docker Compose v2
- [Node.js](https://nodejs.org/) 18+ (for local frontend dev without Docker)
- [Python](https://python.org/) 3.11+ (for local backend dev without Docker)
- [Make](https://www.gnu.org/software/make/) (standard on macOS/Linux)

### 1. Clone and configure

```bash
git clone https://github.com/your-org/voiceai-platform.git
cd voiceai-platform
make setup          # copies .env.example → .env and generates secure keys
```

Open `.env` and fill in at minimum:
- `ANTHROPIC_API_KEY` — required for memory extraction
- `OPENAI_DEFAULT_API_KEY` or `GOOGLE_DEFAULT_API_KEY` — for voice calls (or leave blank and use BYOK)

### 2. Start all services

```bash
make dev            # starts everything with hot-reload and dev tools
```

### 3. Run database migrations

```bash
make migrate        # applies all pending Alembic migrations
```

### 4. Open the app

| Service          | URL                            |
|------------------|--------------------------------|
| Frontend         | http://localhost:3000          |
| API              | http://localhost:8000          |
| API Docs         | http://localhost:8000/docs     |
| PgAdmin          | http://localhost:5050          |
| Redis Commander  | http://localhost:8081          |
| Mailpit (email)  | http://localhost:8025          |

### 5. Seed demo data (optional)

```bash
docker-compose exec api python scripts/seed-demo.py
# Prints demo login credentials
```

---

## Development

### Running a specific service

```bash
docker-compose logs -f api          # tail API logs
docker-compose exec api bash        # shell into the API container
docker-compose restart celery_worker
```

### Creating a database migration

```bash
make migrate-create name="add_call_tags_column"
```

### Running tests

```bash
make test-api       # pytest
make test-web       # jest
```

### Linting

```bash
make lint           # runs ruff (Python) + eslint (TypeScript)
```

---

## Production Deployment

### Option A — Docker Compose (single server)

1. Provision a server with Docker installed (≥4 vCPU, ≥8 GB RAM recommended).
2. Copy the repo and set environment variables:
   ```bash
   cp .env.example .env
   # Fill in production values; run python scripts/generate-keys.py for SECRET_KEY/ENCRYPTION_KEY
   ```
3. Build and start:
   ```bash
   make build
   make prod
   make migrate
   ```
4. Point your DNS A record to the server's public IP and configure TLS in `infra/docker/nginx.conf`.

### Option B — Kubernetes

See `infra/k8s/` for ready-to-apply manifests.

```bash
# Apply base manifests
kubectl apply -k infra/k8s/overlays/prod

# Run migrations as a one-off Job
kubectl apply -f infra/k8s/jobs.yaml
kubectl wait --for=condition=complete job/voiceai-migrate -n voiceai --timeout=120s
```

### Option C — AWS EKS via Terraform

See `infra/terraform/` for the EKS cluster definition.

```bash
cd infra/terraform
terraform init
terraform plan -var-file=prod.tfvars
terraform apply
```

---

## Environment Variables

See [`.env.example`](.env.example) for all variables with inline documentation. Key groups:

| Group        | Variables                                    | Required |
|--------------|----------------------------------------------|----------|
| Database     | `DATABASE_URL`, `DATABASE_*`                 | Yes      |
| Redis        | `REDIS_URL`, `CELERY_*`                      | Yes      |
| Security     | `SECRET_KEY`, `ENCRYPTION_KEY`               | Yes      |
| AI Providers | `ANTHROPIC_API_KEY`, `OPENAI_DEFAULT_API_KEY`| Yes*     |
| Storage      | `AWS_*`                                      | No       |
| Monitoring   | `SENTRY_DSN`                                 | No       |

\* `ANTHROPIC_API_KEY` is required for memory extraction. Voice provider keys are optional if all users use BYOK.

---

## Project Structure

```
voiceai-platform/
├── apps/
│   ├── api/                  # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/          # Route handlers
│   │   │   ├── core/         # Config, security, deps
│   │   │   ├── db/           # SQLAlchemy models & migrations
│   │   │   ├── services/     # Business logic
│   │   │   ├── worker/       # Celery tasks
│   │   │   └── main.py
│   │   └── Dockerfile
│   └── web/                  # Next.js frontend
│       ├── src/
│       │   ├── app/          # App router pages
│       │   ├── components/
│       │   └── lib/
│       └── Dockerfile
├── infra/
│   ├── docker/               # Nginx config, Postgres init
│   ├── k8s/                  # Kubernetes manifests + Kustomize
│   └── terraform/            # AWS EKS provisioning
├── packages/
│   └── shared/               # Shared TypeScript types
├── scripts/                  # Dev tooling scripts
├── .github/workflows/        # CI/CD pipelines
├── docker-compose.yml
├── docker-compose.dev.yml
└── Makefile
```

---

## Contributing

1. Fork the repo and create a feature branch.
2. Run `make dev` and verify the app starts cleanly.
3. Make your changes with tests.
4. Run `make lint` and `make test-api` before opening a PR.
5. The CI pipeline will run automatically on PR open.

## License

MIT
