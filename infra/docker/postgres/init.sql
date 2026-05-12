-- PostgreSQL initialization script
-- Runs once when the container is first created (docker-entrypoint-initdb.d)

-- ─── Extensions ───────────────────────────────────────────────────────────────

-- pgvector: enables vector similarity search for memory embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- uuid-ossp: provides uuid_generate_v4() for legacy compat; prefer gen_random_uuid() in new code
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm: trigram index support for fast ILIKE / full-text search on names/content
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- btree_gin: GIN indexes for composite queries on scalar columns
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ─── Role Hardening ───────────────────────────────────────────────────────────
-- The DATABASE_USER (voiceai) is created by Docker from POSTGRES_USER.
-- Revoke superuser write access to public schema from all other roles.

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT  CREATE ON SCHEMA public TO voiceai;

-- ─── Performance Defaults ────────────────────────────────────────────────────
-- These can also be set via postgresql.conf / command args in docker-compose;
-- placed here so they're visible alongside the schema init.

ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- ivfflat index performance for pgvector
ALTER SYSTEM SET max_parallel_workers_per_gather = '2';

SELECT pg_reload_conf();

-- ─── Application Schema Bootstrap ────────────────────────────────────────────
-- Alembic manages the actual table DDL; this just ensures the schema exists
-- so Alembic can run without needing superuser CREATE DATABASE rights.

-- (Alembic will create all tables on first `alembic upgrade head`)
