.PHONY: install dev test migrate migrate-create lint format docker-build docker-run worker

# ============================================================
# Development
# ============================================================

install:
	pip install --upgrade pip
	pip install -r requirements.txt
	pip install pytest pytest-asyncio httpx ruff mypy coverage

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug

worker:
	celery -A app.workers.celery_app.celery_app worker --loglevel=info -Q default,post_call,memory --concurrency=4

worker-beat:
	celery -A app.workers.celery_app.celery_app beat --loglevel=info

# ============================================================
# Database
# ============================================================

migrate:
	alembic upgrade head

migrate-down:
	alembic downgrade -1

migrate-create:
	@read -p "Migration name: " name; \
	alembic revision --autogenerate -m "$$name"

migrate-history:
	alembic history --verbose

db-reset:
	alembic downgrade base
	alembic upgrade head

# ============================================================
# Testing
# ============================================================

test:
	pytest tests/ -v

test-cov:
	coverage run -m pytest tests/ -v
	coverage report -m
	coverage html

test-fast:
	pytest tests/ -v -x --tb=short

# ============================================================
# Code Quality
# ============================================================

lint:
	ruff check app/ tests/
	mypy app/ --ignore-missing-imports

format:
	ruff format app/ tests/
	ruff check --fix app/ tests/

format-check:
	ruff format --check app/ tests/

# ============================================================
# Docker
# ============================================================

docker-build:
	docker build -t voice-ai-api:latest .

docker-run:
	docker run -p 8000:8000 \
		--env-file .env \
		voice-ai-api:latest

docker-compose-up:
	docker-compose up -d

docker-compose-down:
	docker-compose down

# ============================================================
# Utilities
# ============================================================

generate-secret-key:
	python -c "import secrets; print(secrets.token_hex(32))"

generate-encryption-key:
	python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

health-check:
	curl -s http://localhost:8000/health | python -m json.tool
