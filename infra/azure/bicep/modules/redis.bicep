@description('Azure region for all resources')
param location string

@description('Environment name: dev, staging, prod')
param environment string

@description('Project name prefix for all resources')
param projectName string

@description('Resource tags')
param tags object

// SKU: Basic C1 for dev (single node, no SLA), Standard C1 for prod (replicated, SLA)
var redisSku = environment == 'prod' ? 'Standard' : 'Basic'
var redisFamily = 'C'
var redisCapacity = 1  // C1 = 1 GB

var redisName = 'redis-${projectName}-${environment}-${uniqueString(resourceGroup().id)}'

resource redisCache 'Microsoft.Cache/redis@2024-03-01' = {
  name: redisName
  location: location
  tags: tags
  properties: {
    sku: {
      name: redisSku
      family: redisFamily
      capacity: redisCapacity
    }
    redisVersion: '7'
    enableNonSslPort: false      // Force TLS — never allow plaintext
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
      'notify-keyspace-events': ''
    }
  }
}

@description('Redis hostname (e.g. redis-voiceai-prod-xxx.redis.cache.windows.net)')
output hostName string = redisCache.properties.hostName

@description('Redis SSL port (always 6380)')
output port int = redisCache.properties.sslPort

@description('Redis primary access key')
@secure()
output primaryKey string = redisCache.listKeys().primaryKey

@description('Redis resource name')
output name string = redisCache.name
