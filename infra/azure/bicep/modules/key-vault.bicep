@description('Azure region for all resources')
param location string

@description('Environment name: dev, staging, prod')
param environment string

@description('Project name prefix for all resources')
param projectName string

@description('Resource tags')
param tags object

@description('Object ID of the Container Apps managed identity principal, for Key Vault Secrets User role')
param containerAppsPrincipalId string

@description('Object ID of the GitHub Actions service principal, for Key Vault Secrets Officer role during bootstrap')
param githubActionsPrincipalId string = ''

// Key Vault — globally unique name via uniqueString
var keyVaultName = 'kv-${projectName}-${environment}-${uniqueString(resourceGroup().id)}'

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    // RBAC authorization (not legacy access policies)
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: []
    }
  }
}

// ── Placeholder secrets (values populated by setup-secrets.sh) ──────────────

resource secretDatabaseUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'database-url'
  properties: {
    value: 'PLACEHOLDER_SET_BY_SETUP_SECRETS_SH'
    attributes: {
      enabled: true
    }
  }
}

resource secretRedisUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'redis-url'
  properties: {
    value: 'PLACEHOLDER_SET_BY_SETUP_SECRETS_SH'
    attributes: {
      enabled: true
    }
  }
}

resource secretSecretKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'secret-key'
  properties: {
    value: 'PLACEHOLDER_SET_BY_SETUP_SECRETS_SH'
    attributes: {
      enabled: true
    }
  }
}

resource secretEncryptionKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'encryption-key'
  properties: {
    value: 'PLACEHOLDER_SET_BY_SETUP_SECRETS_SH'
    attributes: {
      enabled: true
    }
  }
}

resource secretOpenaiApiKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'openai-api-key'
  properties: {
    value: 'PLACEHOLDER_SET_BY_SETUP_SECRETS_SH'
    attributes: {
      enabled: true
    }
  }
}

resource secretGoogleApiKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'google-api-key'
  properties: {
    value: 'PLACEHOLDER_SET_BY_SETUP_SECRETS_SH'
    attributes: {
      enabled: true
    }
  }
}

resource secretAnthropicApiKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'anthropic-api-key'
  properties: {
    value: 'PLACEHOLDER_SET_BY_SETUP_SECRETS_SH'
    attributes: {
      enabled: true
    }
  }
}

// ── RBAC role assignments ────────────────────────────────────────────────────

// Built-in role definition IDs
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
var keyVaultSecretsOfficerRoleId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'

// Container Apps managed identity → Secrets User (read secrets at runtime)
resource secretsUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, containerAppsPrincipalId, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalId: containerAppsPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// GitHub Actions service principal → Secrets Officer (write secrets from CI)
resource secretsOfficerRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(githubActionsPrincipalId)) {
  name: guid(keyVault.id, githubActionsPrincipalId, keyVaultSecretsOfficerRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsOfficerRoleId)
    principalId: githubActionsPrincipalId
    principalType: 'ServicePrincipal'
  }
}

@description('Key Vault resource name')
output keyVaultName string = keyVault.name

@description('Key Vault URI (https://kv-xxx.vault.azure.net/)')
output keyVaultUri string = keyVault.properties.vaultUri

@description('Key Vault resource ID')
output keyVaultId string = keyVault.id

// Individual secret URIs for Container Apps secret references
@description('URI of the database-url secret (latest version)')
output secretUriDatabaseUrl string = secretDatabaseUrl.properties.secretUri

@description('URI of the redis-url secret (latest version)')
output secretUriRedisUrl string = secretRedisUrl.properties.secretUri

@description('URI of the secret-key secret (latest version)')
output secretUriSecretKey string = secretSecretKey.properties.secretUri

@description('URI of the encryption-key secret (latest version)')
output secretUriEncryptionKey string = secretEncryptionKey.properties.secretUri

@description('URI of the openai-api-key secret (latest version)')
output secretUriOpenaiApiKey string = secretOpenaiApiKey.properties.secretUri

@description('URI of the google-api-key secret (latest version)')
output secretUriGoogleApiKey string = secretGoogleApiKey.properties.secretUri

@description('URI of the anthropic-api-key secret (latest version)')
output secretUriAnthropicApiKey string = secretAnthropicApiKey.properties.secretUri
