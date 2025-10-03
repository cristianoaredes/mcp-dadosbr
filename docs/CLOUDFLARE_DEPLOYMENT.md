# Cloudflare Workers Deployment Guide

_Deploy MCP DadosBR as a serverless Cloudflare Worker for global edge performance_

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Deployment](#quick-deployment)
- [Configuration](#configuration)
- [Custom Domains](#custom-domains)
- [KV Storage Setup](#kv-storage-setup)
- [Environment Variables](#environment-variables)
- [Monitoring & Logs](#monitoring--logs)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Cloudflare Workers adapter (`lib/adapters/cloudflare.ts`) provides:

- **Global Edge Deployment**: Deploy to 300+ locations worldwide
- **Serverless Architecture**: No server management required
- **KV Storage Caching**: Distributed caching with Cloudflare KV
- **HTTP Transport**: JSON-RPC over HTTP with CORS support
- **Health Monitoring**: Built-in health checks and metrics
- **Custom APIs**: Support for private CNPJ/CEP endpoints

**Live Demo**: https://mcp-dadosbr.aredes.me

---

## Prerequisites

1. **Cloudflare Account**: Free tier is sufficient
2. **Wrangler CLI**: Cloudflare's deployment tool
3. **Node.js**: Version 18+ for local development

### Install Wrangler

```bash
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

---

## Quick Deployment

### 1. Clone and Setup

```bash
git clone https://github.com/cristianoaredes/mcp-dadosbr.git
cd mcp-dadosbr
npm install
```

### 2. Configure Wrangler

The `wrangler.toml` is already configured:

```toml
name = "mcp-dadosbr"
main = "build/lib/workers/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
MCP_TRANSPORT = "http"
MCP_HTTP_PORT = "8787"
MCP_CACHE_SIZE = "256"
MCP_CACHE_TTL = "60000"

[[kv_namespaces]]
binding = "MCP_CACHE"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

### 3. Create KV Namespace

```bash
# Create production KV namespace
wrangler kv:namespace create MCP_CACHE

# Create preview KV namespace
wrangler kv:namespace create MCP_CACHE --preview

# Update wrangler.toml with the returned IDs
```

### 4. Build and Deploy

```bash
# Build the worker
npm run build:worker

# Deploy to Cloudflare
npm run deploy

# Deploy to staging
npm run deploy:staging
```


---

## CI/CD with GitHub Actions

### Prerequisites for Automated Deployment

To enable automated deployments via GitHub Actions, you need to configure your Cloudflare API Token as a GitHub Secret.

### Step 1: Get Your Cloudflare API Token

**Option A: Create a New Token (Recommended)**

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Use the **"Edit Cloudflare Workers"** template or create custom with these permissions:
   - `Account Settings: Read`
   - `Workers Scripts: Edit`
   - `Workers KV Storage: Edit`
   - `Workers Routes: Edit` (if using custom domains)
4. Set **Account Resources** to your specific account
5. Set **Zone Resources** to your domain (if applicable)
6. Click **"Continue to summary"** → **"Create Token"**
7. **⚠️ IMPORTANT**: Copy the token immediately - it will only be shown once!

**Option B: Use Existing Token**

If you already have a token with appropriate permissions, you can use it. Verify permissions with:
```bash
# Check current token permissions
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Step 2: Configure GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Configure:
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Value**: Your Cloudflare API token (paste the full token)
5. Click **"Add secret"**

### Step 3: Verify Workflow Configuration

The repository already includes a GitHub Actions workflow at [`.github/workflows/cloudflare-deploy.yml`](.github/workflows/cloudflare-deploy.yml) that automatically:

- ✅ Builds the Worker when you push to `master` branch
- ✅ Deploys to staging or production based on configuration
- ✅ Runs health checks after deployment
- ✅ Creates deployment summaries

**Key workflow features:**
```yaml
# Automatic deployment on push to master
on:
  push:
    branches: [master]
    paths:
      - "workers/**"
      - "wrangler.toml"
      - "package.json"

# Manual deployment with environment selection
workflow_dispatch:
  inputs:
    environment:
      type: choice
      options:
        - staging
        - production
```

### Step 4: Test Your Setup

**Manual Deploy via GitHub Actions:**

1. Go to **Actions** tab in your repository
2. Select **"Deploy to Cloudflare Workers"**
3. Click **"Run workflow"**
4. Choose environment (staging or production)
5. Click **"Run workflow"**

**Automatic Deploy:**

Push changes to master branch that affect:
- `workers/**`
- `wrangler.toml`
- `package.json`
- `tsconfig.worker.json`

### Step 5: Monitor Deployment

After triggering a deployment, you can:

1. **View logs**: Go to Actions → Your workflow run
2. **Check deployment summary**: See endpoints and status at the bottom of the workflow run
3. **Test endpoints**:
   ```bash
   # Health check
   curl https://mcp-dadosbr-staging.aredes.me/health
   
   # MCP test
   curl -X POST https://mcp-dadosbr-staging.aredes.me/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

### Security Best Practices

✅ **DO:**
- Store tokens in GitHub Secrets
- Use tokens with minimal required permissions
- Rotate tokens periodically
- Use separate tokens for different environments
- Enable token expiration dates

❌ **DON'T:**
- Hard-code tokens in code or config files
- Commit tokens to version control
- Share tokens via insecure channels
- Use overly permissive tokens
- Reuse tokens across multiple projects

### Troubleshooting CI/CD

**Issue: "Error: Authentication error (10000)"**
- Your `CLOUDFLARE_API_TOKEN` secret is missing or invalid
- Verify token in GitHub Settings → Secrets
- Create a new token if expired

**Issue: "Error: KV namespace not found"**
- KV namespace IDs in `wrangler.toml` are incorrect
- Create namespaces: `wrangler kv:namespace create MCP_CACHE`
- Update IDs in `wrangler.toml`

**Issue: "Error: Account ID not found"**
- Run `wrangler whoami` to get your Account ID
- Ensure account is properly configured in Cloudflare

**Issue: Workflow not triggering**
- Check if changes affect watched paths
- Verify branch name matches `master`
- Check workflow file syntax

### Local Testing Before CI/CD

Before pushing to trigger CI/CD, test locally:

```bash
# Set token locally (don't commit .env)
echo "CLOUDFLARE_API_TOKEN=your-token-here" > .env

# Test build
npm run build:worker

# Deploy from local machine
npx wrangler deploy --env staging
```

---

## Configuration

### Environment Variables

Set via `wrangler.toml` or Wrangler CLI:

```toml
[vars]
MCP_TRANSPORT = "http"
MCP_HTTP_PORT = "8787"
MCP_CACHE_SIZE = "512"
MCP_CACHE_TTL = "300000"
CNPJ_API_BASE_URL = "https://api.opencnpj.org/"
CEP_API_BASE_URL = "https://opencep.com/v1/"
```

### Secrets (Sensitive Data)

```bash
# Set API keys via CLI
wrangler secret put API_KEY_VALUE
wrangler secret put CUSTOM_API_TOKEN
wrangler secret put CNPJ_API_KEY
wrangler secret put CEP_API_KEY
```

### Custom API Configuration

For private APIs, configure authentication:

```bash
# Set custom API URLs
wrangler secret put CNPJ_API_BASE_URL
wrangler secret put CEP_API_BASE_URL

# Set authentication headers
wrangler secret put API_KEY_HEADER
wrangler secret put API_KEY_VALUE
```

---

## Custom Domains

### 1. Add Custom Domain

```bash
# Add your domain to Cloudflare Workers
wrangler custom-domains add your-domain.com
```

### 2. Update DNS

Point your domain to the Worker:

```
Type: CNAME
Name: your-subdomain (or @)
Target: your-worker.your-subdomain.workers.dev
```

### 3. SSL Configuration

Cloudflare automatically provides SSL certificates for custom domains.

---

## KV Storage Setup

### Create Namespaces

```bash
# Production namespace
wrangler kv:namespace create MCP_CACHE
# Returns: id = "abc123..."

# Preview namespace (for testing)
wrangler kv:namespace create MCP_CACHE --preview
# Returns: preview_id = "def456..."
```

### Update wrangler.toml

```toml
[[kv_namespaces]]
binding = "MCP_CACHE"
id = "abc123..."
preview_id = "def456..."
```

### KV Operations

```bash
# List keys
wrangler kv:key list --binding MCP_CACHE

# Get value
wrangler kv:key get "cnpj:11222333000181" --binding MCP_CACHE

# Delete key
wrangler kv:key delete "cnpj:11222333000181" --binding MCP_CACHE

# Bulk delete (clear cache)
wrangler kv:key list --binding MCP_CACHE | jq -r '.[].name' | xargs -I {} wrangler kv:key delete {} --binding MCP_CACHE
```

---

## Environment Variables

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_TRANSPORT` | Transport mode | `"http"` |
| `MCP_HTTP_PORT` | HTTP port | `"8787"` |
| `MCP_CACHE_SIZE` | Cache size limit | `"256"` |
| `MCP_CACHE_TTL` | Cache TTL (ms) | `"60000"` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CNPJ_API_BASE_URL` | Custom CNPJ API | `"https://api.example.com/"` |
| `CEP_API_BASE_URL` | Custom CEP API | `"https://cep.example.com/v1/"` |
| `API_KEY_HEADER` | Auth header name | `"X-API-Key"` |
| `API_KEY_VALUE` | Auth header value | `"secret123"` |

### Setting Variables

**Via wrangler.toml:**
```toml
[vars]
CNPJ_API_BASE_URL = "https://api.example.com/"
CEP_API_BASE_URL = "https://cep.example.com/v1/"
```

**Via CLI (for secrets):**
```bash
wrangler secret put API_KEY_VALUE
```

---

## Monitoring & Logs

### Real-time Logs

```bash
# Tail logs
wrangler tail

# Tail with filtering
wrangler tail --format pretty --status error
```

### Analytics

View analytics in Cloudflare Dashboard:
- **Workers & Pages** → **Your Worker** → **Analytics**
- Request volume, error rates, response times
- Geographic distribution of requests

### Health Check

The worker includes a health endpoint:

```bash
curl https://your-worker.workers.dev/health
```

Response:
```json
{
  "status": "healthy",
  "service": "mcp-dadosbr",
  "version": "1.0.0",
  "timestamp": "2024-09-27T20:30:45.123Z",
  "runtime": "cloudflare-workers"
}
```

### Custom Metrics

The worker automatically logs requests:

```
[2024-09-27T20:30:45.123Z] [cnpj_lookup] [11222333000181] [success] [245ms] [http] [https://api.opencnpj.org/]
```

---

## API Endpoints

Once deployed, your worker provides these endpoints:

### MCP JSON-RPC
```
POST /mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "cnpj_lookup",
    "arguments": {"cnpj": "11.222.333/0001-81"}
  }
}
```

### Health Check
```
GET /health
```

### CORS Support
All endpoints include CORS headers for browser compatibility.

---

## Troubleshooting

### Common Issues

**1. KV Namespace Not Found**
```bash
# Verify namespace exists
wrangler kv:namespace list

# Recreate if missing
wrangler kv:namespace create MCP_CACHE
```

**2. Build Errors**
```bash
# Clean build
rm -rf build/
npm run build:worker

# Check TypeScript config
cat tsconfig.worker.json
```

**3. Deployment Failures**
```bash
# Check wrangler.toml syntax
wrangler validate

# Deploy with verbose logging
wrangler deploy --verbose
```

**4. Runtime Errors**
```bash
# Check logs
wrangler tail --format pretty

# Test locally
wrangler dev
```

### Performance Optimization

**1. Cache Configuration**
```toml
[vars]
MCP_CACHE_SIZE = "512"      # Increase cache size
MCP_CACHE_TTL = "300000"    # 5-minute cache TTL
```

**2. KV Optimization**
- Use consistent key naming
- Implement cache warming for popular queries
- Monitor KV usage in dashboard

**3. Request Optimization**
- Enable request deduplication (built-in)
- Use circuit breaker for API protection (built-in)
- Implement proper error handling

### Debugging

**Local Development:**
```bash
# Start local dev server
wrangler dev

# Test endpoints
curl http://localhost:8787/health
curl -X POST http://localhost:8787/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Production Debugging:**
```bash
# View recent logs
wrangler tail --format pretty

# Check worker status
wrangler status
```

---

## Advanced Configuration

### Multiple Environments

Create separate workers for different environments:

```toml
# wrangler.toml
name = "mcp-dadosbr"

[env.staging]
name = "mcp-dadosbr-staging"
vars = { CNPJ_API_BASE_URL = "https://staging-api.example.com/" }

[env.production]
name = "mcp-dadosbr-prod"
vars = { CNPJ_API_BASE_URL = "https://api.example.com/" }
```

Deploy to specific environments:
```bash
wrangler deploy --env staging
wrangler deploy --env production
```

### Custom Routes

Add custom routing in `lib/workers/worker.ts`:

```typescript
// Add custom endpoints
if (url.pathname === '/api/cnpj') {
  // Direct CNPJ API endpoint
}

if (url.pathname === '/api/cep') {
  // Direct CEP API endpoint
}
```

### Rate Limiting

Implement rate limiting with Cloudflare KV:

```typescript
// Check rate limit
const rateLimitKey = `rate_limit:${clientIP}`;
const requests = await env.MCP_CACHE.get(rateLimitKey);

if (requests && parseInt(requests) > 100) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

---

## Cost Optimization

### Free Tier Limits
- **100,000 requests/day**
- **10ms CPU time per request**
- **1GB KV storage**
- **1,000 KV operations/day**

### Optimization Strategies
1. **Efficient Caching**: Reduce API calls with longer TTL
2. **Request Deduplication**: Built-in feature reduces redundant calls
3. **Circuit Breaker**: Prevents cascading failures and costs
4. **KV Optimization**: Use efficient key structures

### Monitoring Costs
- Check Cloudflare Dashboard for usage metrics
- Set up billing alerts for overages
- Monitor KV operations and storage usage

---

## Support

- **Cloudflare Docs**: [Workers Documentation](https://developers.cloudflare.com/workers/)
- **Wrangler CLI**: [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
- **GitHub Issues**: [Report deployment issues](https://github.com/cristianoaredes/mcp-dadosbr/issues)
- **Live Demo**: [Test the deployment](https://mcp-dadosbr.aredes.me/health)
