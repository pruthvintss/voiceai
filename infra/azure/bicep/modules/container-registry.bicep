@description('Azure region for all resources')
param location string

@description('Environment name: dev, staging, prod')
param environment string

@description('Project name prefix for all resources')
param projectName string

@description('Resource tags')
param tags object

@description('Principal ID that needs AcrPull rights (Container Apps managed identity)')
param acrPullPrincipalId string

// ACR name must be globally unique, alphanumeric only, 5–50 chars
var acrName = 'acr${projectName}${environment}${uniqueString(resourceGroup().id)}'

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  tags: tags
  sku: {
    // Standard SKU: geo-replication capability, webhooks, content trust
    name: 'Standard'
  }
  properties: {
    adminUserEnabled: false  // Use managed identity, not admin credentials
    anonymousPullEnabled: false
    dataEndpointEnabled: false
    networkRuleBypassOptions: 'AzureServices'
    publicNetworkAccess: 'Enabled'
    zoneRedundancy: 'Disabled'
    policies: {
      retentionPolicy: {
        // Auto-purge untagged manifests after 30 days
        days: 30
        status: 'enabled'
      }
      softDeletePolicy: {
        retentionDays: 7
        status: 'enabled'
      }
      trustPolicy: {
        type: 'Notary'
        status: 'disabled'
      }
    }
  }
}

// Built-in AcrPull role ID
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

// Grant the Container Apps managed identity the ability to pull images
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, acrPullPrincipalId, acrPullRoleId)
  scope: containerRegistry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: acrPullPrincipalId
    principalType: 'ServicePrincipal'
  }
}

@description('ACR login server URL (e.g. acrvoiceaiprod.azurecr.io)')
output loginServer string = containerRegistry.properties.loginServer

@description('ACR resource ID')
output resourceId string = containerRegistry.id

@description('ACR resource name')
output name string = containerRegistry.name
