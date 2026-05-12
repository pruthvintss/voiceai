@description('Azure region for all resources')
param location string

@description('Environment name: dev, staging, prod')
param environment string

@description('Project name prefix for all resources')
param projectName string

@description('Resource tags')
param tags object

@description('Container Apps Environment resource ID')
param containerAppsEnvironmentId string

@description('ACR login server URL')
param acrLoginServer string

@description('Root domain for CORS configuration (e.g. voiceai.com)')
param rootDomain string

@description('Application Insights connection string')
param appInsightsConnectionString string

// Key Vault secret URIs (versionless — always resolve to latest)
@description('Key Vault URI for database-url secret')
param kvSecretUriDatabaseUrl string

@description('Key Vault URI for redis-url secret')
param kvSecretUriRedisUrl string

@description('Key Vault URI for secret-key secret')
param kvSecretUriSecretKey string

@description('Key Vault URI for encryption-key secret')
param kvSecretUriEncryptionKey string

@description('Key Vault URI for openai-api-key secret')
param kvSecretUriOpenaiApiKey string

@description('Key Vault URI for google-api-key secret')
param kvSecretUriGoogleApiKey string

@description('Key Vault URI for anthropic-api-key secret')
param kvSecretUriAnthropicApiKey string

@description('User-assigned managed identity resource ID (created by managed-identity module)')
param managedIdentityId string

@description('User-assigned managed identity principal ID (for reference in outputs)')
param managedIdentityPrincipalId string

// ── 1. API (FastAPI) ─────────────────────────────────────────────────────────

resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${projectName}-api-${environment}'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    environmentId: containerAppsEnvironmentId
    workloadProfileName: 'Consumption'
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'http'
        allowInsecure: false
        corsPolicy: {
          allowedOrigins: [
            'https://${rootDomain}'
            'https://www.${rootDomain}'
            'https://app.${rootDomain}'
          ]
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
          allowedHeaders: ['*']
          exposeHeaders: ['*']
          allowCredentials: true
          maxAge: 3600
        }
      }
      registries: [
        {
          server: acrLoginServer
          identity: managedIdentityId
        }
      ]
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: kvSecretUriDatabaseUrl
          identity: managedIdentityId
        }
        {
          name: 'redis-url'
          keyVaultUrl: kvSecretUriRedisUrl
          identity: managedIdentityId
        }
        {
          name: 'secret-key'
          keyVaultUrl: kvSecretUriSecretKey
          identity: managedIdentityId
        }
        {
          name: 'encryption-key'
          keyVaultUrl: kvSecretUriEncryptionKey
          identity: managedIdentityId
        }
        {
          name: 'openai-api-key'
          keyVaultUrl: kvSecretUriOpenaiApiKey
          identity: managedIdentityId
        }
        {
          name: 'google-api-key'
          keyVaultUrl: kvSecretUriGoogleApiKey
          identity: managedIdentityId
        }
        {
          name: 'anthropic-api-key'
          keyVaultUrl: kvSecretUriAnthropicApiKey
          identity: managedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: '${acrLoginServer}/${projectName}-api:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'REDIS_URL', secretRef: 'redis-url' }
            { name: 'SECRET_KEY', secretRef: 'secret-key' }
            { name: 'ENCRYPTION_KEY', secretRef: 'encryption-key' }
            { name: 'OPENAI_API_KEY', secretRef: 'openai-api-key' }
            { name: 'GOOGLE_API_KEY', secretRef: 'google-api-key' }
            { name: 'ANTHROPIC_API_KEY', secretRef: 'anthropic-api-key' }
            { name: 'ENVIRONMENT', value: environment }
            { name: 'LOG_LEVEL', value: 'info' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 15
              periodSeconds: 20
              failureThreshold: 3
              timeoutSeconds: 5
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 8000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 3
              timeoutSeconds: 3
            }
            {
              type: 'Startup'
              httpGet: {
                path: '/health'
                port: 8000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 5
              failureThreshold: 12
              timeoutSeconds: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '20'
              }
            }
          }
        ]
      }
    }
  }
}

// ── 2. Web (Next.js dashboard) ───────────────────────────────────────────────

resource webApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${projectName}-web-${environment}'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    environmentId: containerAppsEnvironmentId
    workloadProfileName: 'Consumption'
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }
      registries: [
        {
          server: acrLoginServer
          identity: managedIdentityId
        }
      ]
      secrets: [
        {
          name: 'secret-key'
          keyVaultUrl: kvSecretUriSecretKey
          identity: managedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: '${acrLoginServer}/${projectName}-web:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'NEXT_PUBLIC_API_URL', value: 'https://api.${rootDomain}' }
            { name: 'NEXT_PUBLIC_WS_URL', value: 'wss://api.${rootDomain}' }
            { name: 'NEXTAUTH_SECRET', secretRef: 'secret-key' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 15
              periodSeconds: 20
              failureThreshold: 3
              timeoutSeconds: 5
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              failureThreshold: 3
              timeoutSeconds: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '25'
              }
            }
          }
        ]
      }
    }
  }
}

// ── 3. Celery Worker ─────────────────────────────────────────────────────────

resource celeryWorkerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${projectName}-celery-worker-${environment}'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    environmentId: containerAppsEnvironmentId
    workloadProfileName: 'Consumption'
    configuration: {
      // No ingress — internal worker only
      registries: [
        {
          server: acrLoginServer
          identity: managedIdentityId
        }
      ]
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: kvSecretUriDatabaseUrl
          identity: managedIdentityId
        }
        {
          name: 'redis-url'
          keyVaultUrl: kvSecretUriRedisUrl
          identity: managedIdentityId
        }
        {
          name: 'secret-key'
          keyVaultUrl: kvSecretUriSecretKey
          identity: managedIdentityId
        }
        {
          name: 'encryption-key'
          keyVaultUrl: kvSecretUriEncryptionKey
          identity: managedIdentityId
        }
        {
          name: 'openai-api-key'
          keyVaultUrl: kvSecretUriOpenaiApiKey
          identity: managedIdentityId
        }
        {
          name: 'google-api-key'
          keyVaultUrl: kvSecretUriGoogleApiKey
          identity: managedIdentityId
        }
        {
          name: 'anthropic-api-key'
          keyVaultUrl: kvSecretUriAnthropicApiKey
          identity: managedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'celery-worker'
          image: '${acrLoginServer}/${projectName}-api:latest'
          // Override entrypoint to run Celery worker instead of uvicorn
          command: ['celery']
          args: ['-A', 'app.workers.celery_app', 'worker', '--loglevel=info', '--concurrency=4']
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'REDIS_URL', secretRef: 'redis-url' }
            { name: 'SECRET_KEY', secretRef: 'secret-key' }
            { name: 'ENCRYPTION_KEY', secretRef: 'encryption-key' }
            { name: 'OPENAI_API_KEY', secretRef: 'openai-api-key' }
            { name: 'GOOGLE_API_KEY', secretRef: 'google-api-key' }
            { name: 'ANTHROPIC_API_KEY', secretRef: 'anthropic-api-key' }
            { name: 'ENVIRONMENT', value: environment }
            { name: 'LOG_LEVEL', value: 'info' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
        rules: [
          {
            // KEDA Redis list-length scaler — watches the Celery default queue
            name: 'redis-queue-scaling'
            custom: {
              type: 'redis'
              metadata: {
                address: ''  // Populated at runtime via REDIS_URL env
                listName: 'celery'
                listLength: '10'
              }
              auth: [
                {
                  secretRef: 'redis-url'
                  triggerParameter: 'address'
                }
              ]
            }
          }
        ]
      }
    }
  }
}

// ── 4. Celery Beat (scheduler) ───────────────────────────────────────────────

resource celeryBeatApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${projectName}-celery-beat-${environment}'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    environmentId: containerAppsEnvironmentId
    workloadProfileName: 'Consumption'
    configuration: {
      // No ingress — scheduler only
      registries: [
        {
          server: acrLoginServer
          identity: managedIdentityId
        }
      ]
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: kvSecretUriDatabaseUrl
          identity: managedIdentityId
        }
        {
          name: 'redis-url'
          keyVaultUrl: kvSecretUriRedisUrl
          identity: managedIdentityId
        }
        {
          name: 'secret-key'
          keyVaultUrl: kvSecretUriSecretKey
          identity: managedIdentityId
        }
        {
          name: 'encryption-key'
          keyVaultUrl: kvSecretUriEncryptionKey
          identity: managedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'celery-beat'
          image: '${acrLoginServer}/${projectName}-api:latest'
          command: ['celery']
          args: ['-A', 'app.workers.celery_app', 'beat', '--loglevel=info']
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'REDIS_URL', secretRef: 'redis-url' }
            { name: 'SECRET_KEY', secretRef: 'secret-key' }
            { name: 'ENCRYPTION_KEY', secretRef: 'encryption-key' }
            { name: 'ENVIRONMENT', value: environment }
            { name: 'LOG_LEVEL', value: 'info' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
          ]
        }
      ]
      scale: {
        // Beat must always run as exactly 1 replica — never scale it
        minReplicas: 1
        maxReplicas: 1
        rules: []
      }
    }
  }
}

// ── 5. Migration Job (runs on deploy, not a long-running app) ────────────────

resource migrateJob 'Microsoft.App/jobs@2024-03-01' = {
  name: 'ca-${projectName}-migrate-${environment}'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    environmentId: containerAppsEnvironmentId
    workloadProfileName: 'Consumption'
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: 600
      replicaRetryLimit: 1
      registries: [
        {
          server: acrLoginServer
          identity: managedIdentityId
        }
      ]
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: kvSecretUriDatabaseUrl
          identity: managedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'migrate'
          image: '${acrLoginServer}/${projectName}-api:latest'
          command: ['alembic']
          args: ['upgrade', 'head']
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'DATABASE_URL', secretRef: 'database-url' }
          ]
        }
      ]
    }
  }
}

// ── Outputs ──────────────────────────────────────────────────────────────────

@description('API Container App fully qualified domain name')
output apiFqdn string = apiApp.properties.configuration.ingress.fqdn

@description('Web Container App fully qualified domain name')
output webFqdn string = webApp.properties.configuration.ingress.fqdn

@description('API Container App resource name')
output apiAppName string = apiApp.name

@description('Web Container App resource name')
output webAppName string = webApp.name

@description('Celery Worker Container App resource name')
output celeryWorkerAppName string = celeryWorkerApp.name

@description('Celery Beat Container App resource name')
output celeryBeatAppName string = celeryBeatApp.name

@description('Migration Job resource name')
output migrateJobName string = migrateJob.name

@description('Managed Identity principal ID (passed through from managed-identity module)')
output managedIdentityPrincipalId string = managedIdentityPrincipalId

@description('Managed Identity resource ID (passed through from managed-identity module)')
output managedIdentityId string = managedIdentityId
