# GitHub Actions Setup for Azure Deployment

## Required Secrets

You need to add 3 secrets to your GitHub repository for the deployment workflow to work.

### 1. AZURE_CREDENTIALS

This is a service principal JSON that allows GitHub to authenticate with Azure.

**How to create:**

```bash
az ad sp create-for-rbac \
  --name "github-actions-greenchainz" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/greenchainz-rg \
  --sdk-auth
```

**Output format:**
```json
{
  "clientId": "xxx",
  "clientSecret": "xxx",
  "subscriptionId": "xxx",
  "tenantId": "xxx"
}
```

Copy the entire JSON output and add it as a GitHub secret named `AZURE_CREDENTIALS`.

### 2. ACR_USERNAME

Your Azure Container Registry username.

**How to get:**
```bash
az acr credential show --name greenchainzacr --query username -o tsv
```

Add the output as a GitHub secret named `ACR_USERNAME`.

### 3. ACR_PASSWORD

Your Azure Container Registry password.

**How to get:**
```bash
az acr credential show --name greenchainzacr --query "passwords[0].value" -o tsv
```

Add the output as a GitHub secret named `ACR_PASSWORD`.

## Adding Secrets to GitHub

1. Go to https://github.com/jnorvi5/green-sourcing-b2b-app/settings/secrets/actions
2. Click "New repository secret"
3. Add each of the 3 secrets above

## Testing the Workflow

Once secrets are added:

1. Push any commit to `main` branch
2. Go to https://github.com/jnorvi5/green-sourcing-b2b-app/actions
3. Watch the "Deploy to Azure Container Apps" workflow run
4. Deployment takes ~5-10 minutes
5. Check greenchainz.com to see the updated app

## Manual Trigger

You can also trigger the workflow manually:

1. Go to https://github.com/jnorvi5/green-sourcing-b2b-app/actions
2. Select "Deploy to Azure Container Apps" workflow
3. Click "Run workflow" → "Run workflow"

## Troubleshooting

**Error: "Azure login failed"**
- Check that `AZURE_CREDENTIALS` is valid JSON
- Verify the service principal has Contributor role on the resource group

**Error: "ACR login failed"**
- Check that `ACR_USERNAME` and `ACR_PASSWORD` are correct
- Verify ACR admin user is enabled: `az acr update -n greenchainzacr --admin-enabled true`

**Error: "Container app not found"**
- Verify container app name is `greenchainz-frontend`
- Verify resource group is `greenchainz-rg`
