@description('Azure region for all resources')
param location string

@description('Environment name: dev, staging, prod')
param environment string

@description('Project name prefix for all resources')
param projectName string

@description('Resource tags')
param tags object

@description('PostgreSQL administrator username')
param adminUsername string

@description('PostgreSQL administrator password')
@secure()
param adminPassword string

// SKU selection: prod gets dedicated vCore, dev gets burstable (cost-optimised)
var skuName = environment == 'prod' ? 'Standard_D2ds_v4' : 'Standard_B2s'
var skuTier = environment == 'prod' ? 'GeneralPurpose' : 'Burstable'
var haMode = environment == 'prod' ? 'ZoneRedundant' : 'Disabled'

var serverName = 'psql-${projectName}-${environment}-${uniqueString(resourceGroup().id)}'

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: '16'
    administratorLogin: adminUsername
    administratorLoginPassword: adminPassword
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
      tier: 'P10'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: environment == 'prod' ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: haMode
    }
    maintenanceWindow: {
      customWindow: 'Enabled'
      dayOfWeek: 0    // Sunday
      startHour: 2    // 02:00 UTC
      startMinute: 0
    }
  }
}

// Allow Azure services (Container Apps) to connect
resource firewallAllowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Enable pgvector extension
resource configExtensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01-preview' = {
  parent: postgresServer
  name: 'azure.extensions'
  properties: {
    value: 'VECTOR'
    source: 'user-override'
  }
}

// Enable pg_stat_statements for query performance monitoring
resource configSharedPreloadLibraries 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01-preview' = {
  parent: postgresServer
  name: 'shared_preload_libraries'
  properties: {
    value: 'pg_stat_statements'
    source: 'user-override'
  }
  dependsOn: [configExtensions]
}

// Create the application database
resource voiceaiDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: 'voiceai'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
  dependsOn: [configSharedPreloadLibraries]
}

@description('PostgreSQL server fully qualified domain name')
output fqdn string = postgresServer.properties.fullyQualifiedDomainName

@description('PostgreSQL server resource name')
output serverName string = postgresServer.name

@description('PostgreSQL administrator username (for connection string assembly)')
output adminUsername string = adminUsername
