@description('Azure region for all resources')
param location string

@description('Environment name: dev, staging, prod')
param environment string

@description('Project name prefix for all resources')
param projectName string

@description('Resource tags')
param tags object

// Single user-assigned managed identity shared by all Container Apps.
// Creating it here (before Key Vault and ACR) breaks the circular dependency:
//   Key Vault role assignments need the principal ID
//   Container Apps need Key Vault secret URIs
// By separating identity creation, both modules receive the principal ID as input.

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-${projectName}-${environment}'
  location: location
  tags: tags
}

@description('Managed identity principal ID (use for role assignments)')
output principalId string = managedIdentity.properties.principalId

@description('Managed identity client ID (use for SDK authentication)')
output clientId string = managedIdentity.properties.clientId

@description('Managed identity resource ID (use in identity blocks of Container Apps)')
output resourceId string = managedIdentity.id

@description('Managed identity resource name')
output name string = managedIdentity.name
