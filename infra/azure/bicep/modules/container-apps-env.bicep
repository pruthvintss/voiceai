@description('Azure region for all resources')
param location string

@description('Environment name: dev, staging, prod')
param environment string

@description('Project name prefix for all resources')
param projectName string

@description('Resource tags')
param tags object

@description('Log Analytics workspace customer ID')
param logAnalyticsWorkspaceCustomerId string

@description('Log Analytics workspace primary shared key')
@secure()
param logAnalyticsWorkspaceSharedKey string

// Zone redundancy: enabled for prod (requires at least Standard workload profile)
var zoneRedundant = environment == 'prod'

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${projectName}-${environment}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspaceCustomerId
        sharedKey: logAnalyticsWorkspaceSharedKey
      }
    }
    zoneRedundant: zoneRedundant
    // Consumption-only environment — no dedicated workload profiles
    // This keeps costs low while still supporting HTTP scaling via KEDA
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

@description('Container Apps Environment resource ID')
output environmentId string = containerAppsEnvironment.id

@description('Container Apps Environment default domain (suffix for all app FQDNs)')
output defaultDomain string = containerAppsEnvironment.properties.defaultDomain

@description('Container Apps Environment resource name')
output name string = containerAppsEnvironment.name
