targetScope = 'subscription'

// ── Parameters ───────────────────────────────────────────────────────────────

@description('Environment name (controls SKU selection and HA settings)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Primary Azure region for all resources (Static Web Apps always deploys to eastus2 regardless)')
param location string = 'eastus'

@description('Short project name prefix applied to every resource name')
@maxLength(12)
param projectName string = 'voiceai'

@description('Root domain served by this deployment (e.g. voiceai.com). Used for CORS and output display.')
param rootDomain string

@description('PostgreSQL administrator username')
param postgresAdminUsername string = 'voiceaiadmin'

@description('PostgreSQL administrator password — must be 8–128 chars with mixed case, digits and symbols')
@secure()
param postgresAdminPassword string

// ── Common tags applied to every resource ────────────────────────────────────

var commonTags = {
  environment: environment
  project: projectName
  managedBy: 'bicep'
  rootDomain: rootDomain
}

// ── Resource group ────────────────────────────────────────────────────────────

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${projectName}-${environment}'
  location: location
  tags: commonTags
}

// ── Module: Log Analytics + App Insights ─────────────────────────────────────

module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'deploy-log-analytics'
  scope: rg
  params: {
    location: location
    environment: environment
    projectName: projectName
    tags: commonTags
  }
}

// ── Module: Container Apps (creates managed identity first) ──────────────────
// We need the managed identity principal ID before we can grant it roles in
// Key Vault and ACR.  Container Apps module creates the identity as its first
// resource and exports the principal ID.
//
// To avoid a circular dependency (Key Vault needs the principal ID from
// Container Apps; Container Apps needs secret URIs from Key Vault) we use a
// two-pass pattern:
//   Pass 1 — create managed identity via a standalone identity module
//   Pass 2 — create Key Vault + ACR with the known principal ID
//   Pass 3 — create Container Apps with Key Vault secret URIs
//
// We implement this by extracting the managed identity into its own module.

module managedIdentity 'modules/managed-identity.bicep' = {
  name: 'deploy-managed-identity'
  scope: rg
  params: {
    location: location
    environment: environment
    projectName: projectName
    tags: commonTags
  }
}

// ── Module: Key Vault ─────────────────────────────────────────────────────────

module keyVault 'modules/key-vault.bicep' = {
  name: 'deploy-key-vault'
  scope: rg
  params: {
    location: location
    environment: environment
    projectName: projectName
    tags: commonTags
    containerAppsPrincipalId: managedIdentity.outputs.principalId
  }
}

// ── Module: Container Registry ────────────────────────────────────────────────

module acr 'modules/container-registry.bicep' = {
  name: 'deploy-acr'
  scope: rg
  params: {
    location: location
    environment: environment
    projectName: projectName
    tags: commonTags
    acrPullPrincipalId: managedIdentity.outputs.principalId
  }
}

// ── Module: PostgreSQL ────────────────────────────────────────────────────────

module postgres 'modules/postgres.bicep' = {
  name: 'deploy-postgres'
  scope: rg
  params: {
    location: location
    environment: environment
    projectName: projectName
    tags: commonTags
    adminUsername: postgresAdminUsername
    adminPassword: postgresAdminPassword
  }
}

// ── Module: Redis ─────────────────────────────────────────────────────────────

module redis 'modules/redis.bicep' = {
  name: 'deploy-redis'
  scope: rg
  params: {
    location: location
    environment: environment
    projectName: projectName
    tags: commonTags
  }
}

// ── Module: Container Apps Environment ───────────────────────────────────────

module containerAppsEnv 'modules/container-apps-env.bicep' = {
  name: 'deploy-container-apps-env'
  scope: rg
  params: {
    location: location
    environment: environment
    projectName: projectName
    tags: commonTags
    logAnalyticsWorkspaceCustomerId: logAnalytics.outputs.workspaceCustomerId
    logAnalyticsWorkspaceSharedKey: logAnalytics.outputs.workspaceSharedKey
  }
}

// ── Module: Container Apps (all 4 apps + migration job) ──────────────────────

module containerApps 'modules/container-apps.bicep' = {
  name: 'deploy-container-apps'
  scope: rg
  params: {
    location: location
    environment: environment
    projectName: projectName
    tags: commonTags
    containerAppsEnvironmentId: containerAppsEnv.outputs.environmentId
    acrLoginServer: acr.outputs.loginServer
    rootDomain: rootDomain
    appInsightsConnectionString: logAnalytics.outputs.connectionString
    managedIdentityId: managedIdentity.outputs.resourceId
    managedIdentityPrincipalId: managedIdentity.outputs.principalId
    kvSecretUriDatabaseUrl: keyVault.outputs.secretUriDatabaseUrl
    kvSecretUriRedisUrl: keyVault.outputs.secretUriRedisUrl
    kvSecretUriSecretKey: keyVault.outputs.secretUriSecretKey
    kvSecretUriEncryptionKey: keyVault.outputs.secretUriEncryptionKey
    kvSecretUriOpenaiApiKey: keyVault.outputs.secretUriOpenaiApiKey
    kvSecretUriGoogleApiKey: keyVault.outputs.secretUriGoogleApiKey
    kvSecretUriAnthropicApiKey: keyVault.outputs.secretUriAnthropicApiKey
  }
}

// ── Module: Static Web App ────────────────────────────────────────────────────

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'deploy-static-web-app'
  scope: rg
  params: {
    environment: environment
    projectName: projectName
    tags: commonTags
  }
}

// ── Outputs (consumed by bootstrap.sh + GitHub Actions) ──────────────────────

@description('ACR login server URL')
output acrLoginServer string = acr.outputs.loginServer

@description('ACR resource name')
output acrName string = acr.outputs.name

@description('API Container App FQDN')
output apiFqdn string = containerApps.outputs.apiFqdn

@description('Web Container App FQDN')
output webFqdn string = containerApps.outputs.webFqdn

@description('Static Web App default hostname')
output staticWebAppDefaultHostname string = staticWebApp.outputs.defaultHostname

@description('Static Web App deploy token (for GitHub Actions)')
@secure()
output staticWebAppDeployToken string = staticWebApp.outputs.deployToken

@description('Static Web App resource name')
output staticWebAppName string = staticWebApp.outputs.name

@description('Resource group name')
output resourceGroupName string = rg.name

@description('PostgreSQL server FQDN')
output postgresHost string = postgres.outputs.fqdn

@description('Redis hostname')
output redisHost string = redis.outputs.hostName

@description('Key Vault resource name')
output keyVaultName string = keyVault.outputs.keyVaultName

@description('Key Vault URI')
output keyVaultUri string = keyVault.outputs.keyVaultUri

@description('Application Insights connection string')
output appInsightsConnectionString string = logAnalytics.outputs.connectionString

@description('Managed identity resource ID')
output managedIdentityId string = managedIdentity.outputs.resourceId

@description('Migration job name (trigger after image push)')
output migrateJobName string = containerApps.outputs.migrateJobName
