# 🚀 Deployment Instructions

## Step 1: Set up GitHub Secret (CI/CD)

The CI/CD workflow needs a Cloudflare API token to deploy.

### Get Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template
4. Select your account
5. Click "Continue to summary"
6. Click "Create Token"
7. **Copy the token** (you won't see it again)

### Add to GitHub Secrets

1. Go to: https://github.com/cristianoaredes/mcp-dadosbr/settings/secrets/actions
2. Click "New repository secret"
3. Name: `CLOUDFLARE_API_TOKEN`
4. Value: Paste your Cloudflare API token
5. Click "Add secret"

## Step 2: Set up Cloudflare Secret (Worker Runtime)

The worker needs the Tavily API key at runtime.

### Set TAVILY_API_KEY

```bash
# Set the secret
wrangler secret put TAVILY_API_KEY

# When prompted, paste: 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
```

Or set for specific environment:

```bash
# Staging
wrangler secret put TAVILY_API_KEY --env staging

# Production
wrangler secret put TAVILY_API_KEY --env production
```

### Verify Secret

```bash
# List secrets (won't show values)
wrangler secret list

# Or for specific environment
wrangler secret list --env staging
wrangler secret list --env production
```

## Step 3: Deploy via CI/CD

### Option A: Automatic Deployment (when you push to main)

The workflow will automatically deploy to staging when you push changes to:
- `lib/workers/**`
- `lib/core/**`
- `lib/adapters/**`
- `wrangler.toml`
- etc.

### Option B: Manual Deployment (via GitHub Actions)

1. Go to: https://github.com/cristianoaredes/mcp-dadosbr/actions/workflows/cloudflare-deploy.yml
2. Click "Run workflow"
3. Select environment: `staging` or `production`
4. Click "Run workflow"

The workflow will:
- ✅ Build the worker
- ✅ Deploy to Cloudflare
- ✅ Test health endpoint
- ✅ Test MCP endpoint
- ✅ Show deployment summary

## Step 4: Verify Deployment

### Staging
```bash
# Health check
curl https://mcp-dadosbr-aredes-staging.cristianocosta.workers.dev/health

# List tools
curl -X POST https://mcp-dadosbr-aredes-staging.cristianocosta.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Production
```bash
# Health check (custom domain)
curl https://mcp-dadosbr.aredes.me/health

# List tools
curl -X POST https://mcp-dadosbr.aredes.me/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Troubleshooting

### Secret not found in worker
```bash
# Re-add the secret
wrangler secret put TAVILY_API_KEY --env staging
```

### Deployment fails with 401
- Check that CLOUDFLARE_API_TOKEN is set in GitHub Secrets
- Verify the token has Workers permissions

### Health check fails
- Wait 30-60 seconds for deployment to propagate
- Check Cloudflare dashboard for errors
- View logs: `wrangler tail --env staging`

## Next Steps

After successful deployment:
1. ✅ Test all endpoints
2. ✅ Monitor logs: `wrangler tail`
3. ✅ Set up custom domain (production)
4. ✅ Configure alerts in Cloudflare Dashboard

---

**Need help?** Open an issue: https://github.com/cristianoaredes/mcp-dadosbr/issues
