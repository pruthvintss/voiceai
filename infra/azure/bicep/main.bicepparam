using './main.bicep'

// ── Required: change before running bootstrap.sh ─────────────────────────────
param rootDomain = 'yourdomain.com'

// ── Common settings ───────────────────────────────────────────────────────────
param environment = 'prod'
param location = 'eastus'
param projectName = 'voiceai'

// ── PostgreSQL ────────────────────────────────────────────────────────────────
// The password is read from the environment variable POSTGRES_ADMIN_PASSWORD
// when deploying via bootstrap.sh.  Do NOT hard-code it here.
param postgresAdminUsername = 'voiceaiadmin'
// postgresAdminPassword is intentionally omitted; bootstrap.sh passes it via
// --parameters postgresAdminPassword="$POSTGRES_ADMIN_PASSWORD"
