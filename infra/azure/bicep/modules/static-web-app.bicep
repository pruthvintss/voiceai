@description('Environment name: dev, staging, prod')
param environment string

@description('Project name prefix for all resources')
param projectName string

@description('Resource tags')
param tags object

// Static Web Apps has limited region availability — eastus2 is reliably supported
var swaLocation = 'eastus2'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'stapp-${projectName}-${environment}-${uniqueString(resourceGroup().id)}'
  // SWA must use one of its supported regions regardless of main location param
  location: swaLocation
  tags: tags
  sku: {
    // Standard tier: custom domains, staging environments, private endpoints
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    // GitHub integration is configured at deploy time via the deploy token;
    // the repository/branch fields are intentionally left empty here so the
    // resource can be created before the first workflow run.
    repositoryUrl: ''
    branch: ''
    buildProperties: {
      appLocation: 'apps/landing'
      outputLocation: 'out'
      skipGithubActionWorkflowGeneration: true
    }
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

@description('Static Web App default hostname (e.g. xxx.azurestaticapps.net)')
output defaultHostname string = staticWebApp.properties.defaultHostname

@description('Static Web App deployment API token for GitHub Actions')
@secure()
output deployToken string = staticWebApp.listSecrets().properties.apiKey

@description('Static Web App resource name')
output name string = staticWebApp.name

@description('Static Web App resource ID')
output resourceId string = staticWebApp.id
